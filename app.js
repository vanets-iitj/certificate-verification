// CertChain — Blockchain Certificate Generator & Verification System
// Copyright © 2026 Koustav Kumar Mondal. All rights reserved.

const CONFIG = {
  contractAddress: "0xac77dda668A3fB9C11D3F5951f9b6844d4767fd6",
  sepoliaChainId: "0xaa36a7",
  sepoliaRpc: "https://eth-sepolia.g.alchemy.com/v2/EclGay3yCxV5DbUtkAu09",
  abi: [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {"internalType": "string", "name": "certificateNumber", "type": "string"},
        {"internalType": "string", "name": "studentName", "type": "string"},
        {"internalType": "string", "name": "issueDate", "type": "string"},
        {"internalType": "string", "name": "startDate", "type": "string"},
        {"internalType": "string", "name": "endDate", "type": "string"},
        {"internalType": "string", "name": "projectName", "type": "string"}
      ],
      "name": "issueCertificate",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "string", "name": "certificateNumber", "type": "string"}
      ],
      "name": "revokeCertificate",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "string", "name": "certificateNumber", "type": "string"},
        {"indexed": false, "internalType": "string", "name": "studentName", "type": "string"},
        {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
      ],
      "name": "CertificateIssued",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "string", "name": "certificateNumber", "type": "string"}
      ],
      "name": "CertificateRevoked",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "getCertificateCount",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "string", "name": "certificateNumber", "type": "string"}
      ],
      "name": "isCertificateValid",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "string", "name": "certificateNumber", "type": "string"}
      ],
      "name": "verifyCertificate",
      "outputs": [
        {"internalType": "string", "name": "studentName", "type": "string"},
        {"internalType": "string", "name": "issueDate", "type": "string"},
        {"internalType": "string", "name": "startDate", "type": "string"},
        {"internalType": "string", "name": "endDate", "type": "string"},
        {"internalType": "string", "name": "projectName", "type": "string"},
        {"internalType": "bool", "name": "valid", "type": "bool"},
        {"internalType": "uint256", "name": "issuedAt", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]
};

let contract;
let providerType = "none";

const modeBadge = document.getElementById("modeBadge");

const certInput = document.getElementById("certInput");
const verifyBtn = document.getElementById("verifyBtn");
const statusMsg = document.getElementById("statusMsg");
const resultCard = document.getElementById("resultCard");
const validityBadge = document.getElementById("validityBadge");
const studentNameEl = document.getElementById("studentName");
const issueDateEl = document.getElementById("issueDate");
const periodEl = document.getElementById("period");
const projectNameEl = document.getElementById("projectName");
const issuedAtEl = document.getElementById("issuedAt");
const txHashEl = document.getElementById("txHash");
const etherscanLink = document.getElementById("etherscanLink");
const etherscanAnchor = document.getElementById("etherscanAnchor");

function setStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = "status-msg " + (type || "");
}

function formatTimestamp(ts) {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC"
  }) + " UTC";
}

async function initReadOnly() {
  const provider = new ethers.JsonRpcProvider(CONFIG.sepoliaRpc);
  contract = new ethers.Contract(CONFIG.contractAddress, CONFIG.abi, provider);
  providerType = "rpc";

  modeBadge.textContent = "Read-only";
  modeBadge.className = "mode-badge rpc";

  try {
    await contract.getCertificateCount();
    setStatus("No Blockchain Wallet Needed", "info");
  } catch {
    setStatus("Unable to reach Sepolia. Check your connection.", "error");
  }
}

async function initMetaMask() {
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    if (network.chainId !== BigInt(CONFIG.sepoliaChainId)) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CONFIG.sepoliaChainId }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: CONFIG.sepoliaChainId,
              chainName: "Sepolia Testnet",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            }],
          });
        }
      }
    }

    const signer = await provider.getSigner();
    contract = new ethers.Contract(CONFIG.contractAddress, CONFIG.abi, signer);
    providerType = "wallet";
    modeBadge.textContent = "Wallet";
    modeBadge.className = "mode-badge wallet";
    setStatus("Wallet connected — Sepolia. Ready to verify.", "info");
  } catch (err) {
    throw err;
  }
}

async function init() {
  if (window.ethereum) {
    try {
      await initMetaMask();
      return;
    } catch (err) {
      setStatus("MetaMask connection failed, falling back to read-only...", "info");
    }
  }

  await initReadOnly();
}

async function handleVerify() {
  const certNumber = certInput.value.trim();
  if (!certNumber) {
    setStatus("Please enter a certificate number.", "error");
    return;
  }

  setStatus("Verifying...", "info");
  verifyBtn.disabled = true;

  try {
    const result = await contract.verifyCertificate(certNumber);

    studentNameEl.textContent = result[0];
    issueDateEl.textContent = result[1];
    periodEl.textContent = result[2] + " – " + result[3];
    projectNameEl.textContent = result[4];

    if (result[5]) {
      validityBadge.textContent = "VALID";
      validityBadge.className = "badge valid";
    } else {
      validityBadge.textContent = "REVOKED";
      validityBadge.className = "badge invalid";
    }

    issuedAtEl.textContent = formatTimestamp(result[6]);

    const txHash = CERT_TX_MAP[certNumber];
    if (txHash) {
      txHashEl.textContent = txHash;
      etherscanAnchor.href = `https://sepolia.etherscan.io/tx/${txHash}#eventlog`;
      etherscanLink.classList.remove("hidden");
    } else {
      txHashEl.textContent = "Not available";
      etherscanLink.classList.add("hidden");
    }

    resultCard.classList.remove("hidden");
    setStatus("Certificate found on blockchain.", "info");
  } catch (err) {
    if (err.message.includes("Certificate not found")) {
      setStatus("Certificate not found on the blockchain.", "error");
    } else {
      setStatus("Error: " + err.message, "error");
    }
    resultCard.classList.add("hidden");
    etherscanLink.classList.add("hidden");
  } finally {
    verifyBtn.disabled = false;
  }
}

verifyBtn.addEventListener("click", handleVerify);

certInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleVerify();
});

window.addEventListener("load", () => {
  setStatus("Initializing...", "info");
  init();
});
