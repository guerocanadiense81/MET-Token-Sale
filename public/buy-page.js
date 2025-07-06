/**
 * @file buy-page.js
 * @description Final logic for the MET token purchase page with network switching and live pricing.
 */
const TokenSale = {
    // --- CONFIGURATION ---
    CONTRACT_ADDRESS: "0xb80b92Be7402E1e2D3189fff261D672D8104b322",
    // This ABI matches the functions we need from your specific smart contract.
    CONTRACT_ABI: [
        "function buyTokens() payable",
        "function tradingRate() view returns (uint256)"
    ],
    // The required network information for Binance Smart Chain
    REQUIRED_NETWORK: {
        chainId: '0x38', // 56 in hexadecimal
        chainName: 'Binance Smart Chain',
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18
        },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com']
    },
    COINGECKO_API_URL: "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd",

    // --- STATE ---
    state: {
        signer: null,
        contract: null,
        tradingRate: 0,
        bnb_usd_price: 0,
        isReady: false
    },
    
    dom: {},

    // --- INITIALIZATION ---
    init() {
        if (typeof ethers === "undefined") {
            return alert("Ethers.js failed to load. Please refresh the page.");
        }
        this.cacheDOMElements();
        this.attachEventListeners();
        // Fetch initial data that doesn't require a wallet connection
        this.fetchLivePrices();
    },

    cacheDOMElements() {
        this.dom = {
            connectBtn: document.getElementById('connectWalletBtn'),
            walletStatus: document.getElementById('walletStatus'),
            purchaseSection: document.getElementById('purchaseSection'),
            bnbInput: document.getElementById('bnbAmountInput'),
            metToReceive: document.getElementById('metToReceive'),
            estimatedCost: document.getElementById('estimatedCost'),
            apiStatus: document.getElementById('apiStatus'),
            buyBtn: document.getElementById('buyBtn'),
            txStatus: document.getElementById('txStatus'),
        };
    },

    attachEventListeners() {
        this.dom.connectBtn.addEventListener('click', () => this.connectWallet());
        this.dom.bnbInput.addEventListener('input', () => this.updateCalculations());
        this.dom.buyBtn.addEventListener('click', () => this.executePurchase());
    },

    // --- DATA FETCHING ---
    async fetchContractData() {
        if (!this.state.contract) return;
        try {
            this.state.tradingRate = await this.state.contract.tradingRate();
            this.dom.apiStatus.textContent = `Contract Rate: 1 BNB = ${this.state.tradingRate.toString()} MET`;
        } catch (error) {
            console.error("Could not fetch trading rate from contract:", error);
            this.dom.apiStatus.textContent = "Error fetching contract data.";
        }
    },

    async fetchLivePrices() {
        try {
            const response = await fetch(this.COINGECKO_API_URL);
            if (!response.ok) throw new Error('Could not fetch price from CoinGecko');
            const data = await response.json();
            this.state.bnb_usd_price = data.binancecoin.usd;
            this.state.isReady = true;
            this.updateCalculations(); // Update calculations with initial price
        } catch (error) {
            console.error("Could not fetch live prices:", error);
            this.dom.apiStatus.textContent = "Could not load live prices.";
            this.dom.buyBtn.disabled = true;
        }
    },

    // --- UI UPDATES ---
    updateCalculations() {
        if (!this.state.isReady) return;
        
        const bnbAmount = parseFloat(this.dom.bnbInput.value) || 0;
        const metToReceive = bnbAmount * (this.state.tradingRate > 0 ? parseFloat(this.state.tradingRate.toString()) : 0);
        const usdCost = bnbAmount * this.state.bnb_usd_price;

        this.dom.metToReceive.innerHTML = `<strong>MET:</strong> ~${metToReceive.toFixed(2)}`;
        this.dom.estimatedCost.innerHTML = `<strong>Estimated Cost (USD):</strong> ~$${usdCost.toFixed(2)}`;
    },

    // --- WEB3 ACTIONS ---
    async connectWallet() {
        if (!window.ethereum) return alert("Please install MetaMask.");

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            
            // Check network and prompt user to switch if incorrect
            const network = await provider.getNetwork();
            if (network.chainId !== parseInt(this.REQUIRED_NETWORK.chainId, 16)) {
                this.dom.walletStatus.textContent = "Wrong network. Please switch to BSC.";
                try {
                    await provider.send('wallet_switchEthereumChain', [{ chainId: this.REQUIRED_NETWORK.chainId }]);
                } catch (switchError) {
                    // This error means the user rejected the switch, or the network isn't added to their MetaMask
                    alert("Please switch your MetaMask network to Binance Smart Chain to continue.");
                    return;
                }
            }
            
            // If we've reached here, the user is on the correct network.
            await provider.send("eth_requestAccounts", []);
            this.state.signer = provider.getSigner();
            const walletAddress = await this.state.signer.getAddress();
            
            this.state.contract = new ethers.Contract(this.CONTRACT_ADDRESS, this.CONTRACT_ABI, this.state.signer);

            this.dom.walletStatus.textContent = `Connected: ${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
            this.dom.connectBtn.style.display = 'none';
            this.dom.purchaseSection.style.display = 'block';
            this.dom.buyBtn.disabled = false;

            await this.fetchContractData();

        } catch (error) {
            console.error("Wallet connection failed:", error);
            this.dom.walletStatus.textContent = `Connection failed: ${error.message}`;
        }
    },

    async executePurchase() {
        if (!this.state.contract) return alert("Please connect your wallet first.");
        
        const bnbAmount = this.dom.bnbInput.value;
        if (!bnbAmount || parseFloat(bnbAmount) <= 0) return alert("Please enter a valid BNB amount.");

        this.dom.txStatus.textContent = "Preparing transaction...";
        this.dom.buyBtn.disabled = true;

        try {
            const bnbInWei = ethers.utils.parseEther(bnbAmount);
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

// Initialize the script once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    TokenSale.init();
});