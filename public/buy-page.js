/**
 * @file buy-page.js
 * @description Workaround version: Calculates required BNB on the front-end
 * based on the contract's fixed tradingRate.
 */
const TokenSale = {
    // --- CONFIGURATION ---
    CONTRACT_ADDRESS: "0xb80b92Be7402E1e2D3189fff261D672D8104b322",
    CONTRACT_ABI: [
        "function buyTokens() payable",
        "function tradingRate() view returns (uint256)"
    ],
    REQUIRED_NETWORK: {
        chainId: '0x38' // Binance Smart Chain
    },

    // --- STATE ---
    state: {
        signer: null,
        contract: null,
        tradingRate: 0,
        isReady: false
    },
    
    dom: {},

    init() {
        if (typeof ethers === "undefined") return alert("Ethers.js failed to load.");
        this.cacheDOMElements();
        this.attachEventListeners();
    },

    cacheDOMElements() {
        this.dom = {
            connectBtn: document.getElementById('connectWalletBtn'),
            walletStatus: document.getElementById('walletStatus'),
            purchaseSection: document.getElementById('purchaseSection'),
            metInput: document.getElementById('metAmountInput'),
            bnbCostDisplay: document.getElementById('bnbCostDisplay'),
            apiStatus: document.getElementById('apiStatus'),
            buyBtn: document.getElementById('buyBtn'),
            txStatus: document.getElementById('txStatus'),
        };
    },

    attachEventListeners() {
        this.dom.connectBtn.addEventListener('click', () => this.connectWallet());
        this.dom.metInput.addEventListener('input', () => this.updateCalculations());
        this.dom.buyBtn.addEventListener('click', () => this.executePurchase());
    },

    async fetchContractData() {
        try {
            // Use the signer's provider to create a contract instance
            const readOnlyContract = new ethers.Contract(this.CONTRACT_ADDRESS, this.CONTRACT_ABI, this.state.signer.provider);
            this.state.tradingRate = await readOnlyContract.tradingRate();
            this.dom.apiStatus.textContent = `Contract Rate: 1 BNB = ${this.state.tradingRate.toString()} MET`;
            this.state.isReady = true;
            this.dom.buyBtn.disabled = false;
        } catch (error) {
            console.error("Could not fetch trading rate from contract:", error);
            this.dom.apiStatus.textContent = "Error fetching contract data.";
        }
    },

    updateCalculations() {
        if (!this.state.isReady || this.state.tradingRate === 0) return;
        
        const metAmount = parseFloat(this.dom.metInput.value) || 0;
        const bnbCost = metAmount / parseFloat(this.state.tradingRate.toString());

        this.dom.bnbCostDisplay.innerHTML = `<strong>BNB:</strong> ${bnbCost.toFixed(6)}`;
    },

    async connectWallet() {
        if (!window.ethereum) return alert("Please install MetaMask.");

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            
            // Network switching logic
            const network = await provider.getNetwork();
            if (network.chainId !== parseInt(this.REQUIRED_NETWORK.chainId, 16)) {
                await provider.send('wallet_switchEthereumChain', [{ chainId: this.REQUIRED_NETWORK.chainId }]);
            }
            
            await provider.send("eth_requestAccounts", []);
            this.state.signer = provider.getSigner();
            const walletAddress = await this.state.signer.getAddress();
            
            this.state.contract = new ethers.Contract(this.CONTRACT_ADDRESS, this.CONTRACT_ABI, this.state.signer);

            this.dom.walletStatus.textContent = `Connected: ${walletAddress.substring(0, 6)}...`;
            this.dom.connectBtn.style.display = 'none';
            this.dom.purchaseSection.style.display = 'block';

            await this.fetchContractData();

        } catch (error) {
            console.error("Wallet connection failed:", error);
            this.dom.walletStatus.textContent = "Connection failed.";
        }
    },

    async executePurchase() {
        if (!this.state.contract || !this.state.isReady) return alert("Please connect wallet and wait for data to load.");
        
        const metAmount = parseFloat(this.dom.metInput.value);
        if (!metAmount || metAmount <= 0) return alert("Please enter a valid MET amount.");

        this.dom.txStatus.textContent = "Calculating required BNB...";
        this.dom.buyBtn.disabled = true;

        try {
            // Calculate the exact BNB required based on the contract's rate
            const bnbCost = metAmount / parseFloat(this.state.tradingRate.toString());
            const bnbInWei = ethers.utils.parseEther(bnbCost.toFixed(18)); // Use high precision for conversion

            this.dom.txStatus.textContent = "Preparing transaction...";
            
            const tx = await this.state.contract.buyTokens({ value: bnbInWei });
            
            this.dom.txStatus.textContent = "Transaction sent, awaiting confirmation...";
            await tx.wait();

            this.dom.txStatus.innerHTML = `✅ Success! <a href="https://bscscan.com/tx/${tx.hash}" target="_blank">View on BscScan</a>`;
        } catch (error) {
            console.error("Purchase failed:", error);
            this.dom.txStatus.textContent = `❌ Error: ${error.reason || "Transaction rejected."}`;
        } finally {
            this.dom.buyBtn.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    TokenSale.init();
});
