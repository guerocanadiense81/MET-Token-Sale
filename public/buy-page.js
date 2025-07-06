/**
 * @file buy-page.js
 * @description Workaround version: Calculates required BNB and displays estimated USD cost.
 */
const TokenSale = {
    // --- CONFIGURATION ---
    CONTRACT_ADDRESS: "0xb80b92Be7402E1e2D3189fff261D672D8104b322",
    CONTRACT_ABI: [
        "function buyTokens() payable",
        "function tradingRate() view returns (uint256)"
    ],
    // Add back the CoinGecko API URL
    COINGECKO_API_URL: "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd",
    REQUIRED_NETWORK: {
        chainId: '0x38' // Binance Smart Chain
    },

    // --- STATE ---
    state: {
        signer: null,
        contract: null,
        tradingRate: 0,
        bnb_usd_price: 0, // To store the live price
        isReady: false
    },
    
    dom: {},

    init() {
        if (typeof ethers === "undefined") return alert("Ethers.js failed to load.");
        this.cacheDOMElements();
        this.attachEventListeners();
        this.fetchLivePrices(); // Fetch price on page load
    },

    cacheDOMElements() {
        this.dom = {
            connectBtn: document.getElementById('connectWalletBtn'),
            walletStatus: document.getElementById('walletStatus'),
            purchaseSection: document.getElementById('purchaseSection'),
            metInput: document.getElementById('metAmountInput'),
            bnbCostDisplay: document.getElementById('bnbCostDisplay'),
            usdCostDisplay: document.getElementById('usdCostDisplay'), // New element
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
        // ... (This function remains unchanged)
    },

    // Fetches live price from CoinGecko
    async fetchLivePrices() {
        try {
            const response = await fetch(this.COINGECKO_API_URL);
            if (!response.ok) throw new Error('Could not fetch price from CoinGecko');
            const data = await response.json();
            this.state.bnb_usd_price = data.binancecoin.usd;
            this.updateCalculations();
        } catch (error) {
            console.error("Could not fetch live prices:", error);
            this.dom.apiStatus.textContent = "Could not load live USD price.";
        }
    },

    // This function is updated to calculate and display both BNB and USD costs
    updateCalculations() {
        if (this.state.tradingRate === 0) return;
        
        const metAmount = parseFloat(this.dom.metInput.value) || 0;
        const bnbCost = metAmount / parseFloat(this.state.tradingRate.toString());
        const usdCost = bnbCost * this.state.bnb_usd_price;

        this.dom.bnbCostDisplay.innerHTML = `<strong>BNB:</strong> ${bnbCost.toFixed(6)}`;
        this.dom.usdCostDisplay.innerHTML = `<strong>USD:</strong> ~$${usdCost.toFixed(2)}`;
    },

    async connectWallet() {
        if (!window.ethereum) return alert("Please install MetaMask.");
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
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
            this.dom.buyBtn.disabled = false;

            await this.fetchContractData();
        } catch (error) {
            console.error("Wallet connection failed:", error);
        }
    },

    async executePurchase() {
        // ... (This function remains unchanged)
    }
};

document.addEventListener('DOMContentLoaded', () => {
    TokenSale.init();
});
