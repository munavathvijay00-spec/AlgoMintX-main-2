import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";
import { DeflyWalletConnect } from "@blockshake/defly-connect";
import eventBus from "./event-bus.js";
import "./algomintx.css";

const appSpecJson = require("./AlgoMintXClient/AlgoMintX.arc32.json");
const encoder = new algosdk.ABIContract({
  name: appSpecJson.contract.name,
  methods: appSpecJson.contract.methods,
});

class AlgoMintX {
  #walletConnectors;
  #walletConnected;
  #connectionInfo;
  #connectionInProgress;
  #supportedWallets;
  #selectedWalletType;
  #algodClient;
  #contractApplicationId;
  #contractWalletAddress;
  #indexerUrl;
  #unitName;
  #metadataMark;
  #messageElement;
  #pinata_ipfs_server_key;
  #pinata_ipfs_gateway_url;
  #namespace;
  #revenueWalletAddress;
  #listingFee;
  #buyingFee;
  #unListingFee;
  #mintFee;
  #disableToast;
  #disableUi;
  #minimizeUILocation;
  #logo;
  #supportedNetworks;
  #theme;
  #toastLocation;
  #supportedMediaFormats;
  #currentLoadingMessage;
  #tempWalletOverlay;

  constructor({
    pinata_ipfs_server_key,
    pinata_ipfs_gateway_url,
    env,
    namespace,
    revenueWalletAddress,
    listingFee = 0,
    buyingFee = 0,
    unListingFee = 0,
    mintFee = 0,
    disableToast = false,
    disableUi = false,
    minimizeUILocation = "right",
    logo = null,
    toastLocation = "TOP_RIGHT",
    supportedMediaFormats = ["IMAGE"],
  }) {
    try {
      // Validate all parameters
      this.#pinata_ipfs_server_key = this.#validatePinataServerKey(
        pinata_ipfs_server_key
      );
      this.#pinata_ipfs_gateway_url = this.#validatePinataGatewayUrl(
        pinata_ipfs_gateway_url
      );
      this.network = this.#validateEnvironment(env);
      this.#namespace = this.#validateNamespace(namespace);
      this.#revenueWalletAddress =
        this.#validateRevenueWalletAddress(revenueWalletAddress);
      this.#listingFee = this.#validateFee(listingFee, "Listing fee");
      this.#buyingFee = this.#validateFee(buyingFee, "Buying fee");
      this.#unListingFee = this.#validateFee(unListingFee, "unListingFee fee");
      this.#mintFee = this.#validateFee(mintFee, "Mint fee");
      this.#disableToast = this.#validateDisableToast(disableToast);
      this.#disableUi = this.#validateDisableUi(disableUi);
      this.#minimizeUILocation =
        this.#validateMinimizeUILocation(minimizeUILocation);
      this.#logo = this.#validateLogo(logo);
      this.#toastLocation = this.#validateToastLocation(toastLocation);
      this.#supportedMediaFormats = this.#validateSupportedMediaFormats(
        supportedMediaFormats
      );

      // Initialize other properties
      this.#supportedNetworks = ["mainnet", "testnet"];
      this.#walletConnectors = {
        pera: new PeraWalletConnect(),
        defly: new DeflyWalletConnect(),
      };
      this.#walletConnected = false;
      this.account = null;
      this.#connectionInfo = null;
      this.#connectionInProgress = false;
      this.#supportedWallets = ["pera", "defly"];
      this.#selectedWalletType = null;

      // Initialize algosdk client
      this.#algodClient = new algosdk.Algodv2(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        this.network === "mainnet"
          ? "https://mainnet-api.algonode.cloud"
          : "https://testnet-api.algonode.cloud",
        443
      );

      // Initialize contract details
      this.#contractApplicationId =
        this.network === "mainnet" ? 3127816536 : 741003115;
      this.#contractWalletAddress =
        this.network === "mainnet"
          ? "57U43PN2WYSYFQZAJ2WBGSHT2RG3GJF2B4JJZYBOGUZ5ZDR6K7WCFLQNHU"
          : "G6FBCN7OZTTHBSPU6RGYEFW6I7F5UAEUD7DLS7J66JU2FJEAKPZDWBUHNQ";

      // Initialize SDK variables
      this.#indexerUrl =
        this.network === "mainnet"
          ? "https://mainnet-idx.algonode.cloud"
          : "https://testnet-idx.algonode.cloud";
      this.#unitName = `AMX${this.#namespace}`;
      this.#metadataMark = "AlgoMintX";
      this.events = eventBus;

      // Initialize UI state
      this.#messageElement = null;
      this.processing = false;

      // Load saved UI state (only if UI is not disabled)
      if (!this.#disableUi) {
        const savedState = localStorage.getItem("amx");
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            this.isMinimized = parsedState.minimized || false;
            this.theme = parsedState.theme || this.#getSystemTheme();
          } catch (e) {
            this.isMinimized = false;
            this.theme = this.#getSystemTheme();
          }
        } else {
          this.isMinimized = false;
          this.theme = this.#getSystemTheme();
        }

        // Save initial state and initialize UI
        this.#saveUIState();
        this.#initUI();
      }
    } catch (error) {
      this.#sdkValidationFailed(error.message);
    }
  }
  /**
   * SDK parameters Validation
   */

  #validateRequired(value, paramName) {
    if (value === undefined || value === null) {
      throw new Error(`${paramName} is required`);
    }
    return value;
  }

  #validateString(value, paramName) {
    this.#validateRequired(value, paramName);
    if (typeof value !== "string") {
      throw new Error(`${paramName} must be a string`);
    }
    if (value.trim().length === 0) {
      throw new Error(`${paramName} cannot be empty`);
    }
    return value;
  }

  #validateEnum(value, paramName, validValues) {
    this.#validateString(value, paramName);
    if (!validValues.includes(value)) {
      throw new Error(`${paramName} must be one of: ${validValues.join(", ")}`);
    }
    return value;
  }

  #validateNumber(value, paramName, options = {}) {
    if (value === undefined || value === null) {
      return options.default ?? 0;
    }
    if (typeof value !== "number") {
      throw new Error(`${paramName} must be a number`);
    }
    if (!Number.isFinite(value)) {
      throw new Error(`${paramName} must be a finite number`);
    }
    if (options.min !== undefined && value < options.min) {
      throw new Error(
        `${paramName} must be greater than or equal to ${options.min}`
      );
    }
    if (options.max !== undefined && value > options.max) {
      throw new Error(
        `${paramName} must be less than or equal to ${options.max}`
      );
    }
    return value;
  }

  #validateBoolean(value, paramName, defaultValue = false) {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    if (typeof value !== "boolean") {
      throw new Error(`${paramName} must be a boolean`);
    }
    return value;
  }

  #validateUrl(value, paramName) {
    this.#validateString(value, paramName);
    try {
      new URL(value);
      return value;
    } catch (e) {
      throw new Error(`${paramName} must be a valid URL`);
    }
  }

  #validatePinataServerKey(key) {
    return this.#validateString(key, "Pinata IPFS server key");
  }

  #validatePinataGatewayUrl(url) {
    const validatedUrl = this.#validateString(url, "Pinata IPFS gateway URL");

    // Check for https:// or http://
    if (
      validatedUrl.startsWith("http://") ||
      validatedUrl.startsWith("https://")
    ) {
      throw new Error(
        "Pinata IPFS gateway URL must not include http:// or https://"
      );
    }

    // Check for any forward slashes
    if (validatedUrl.includes("/")) {
      throw new Error(
        "Pinata IPFS gateway URL must not contain any forward slashes"
      );
    }

    try {
      // Test if it's a valid URL by adding https://
      new URL(`https://${validatedUrl}`);
      return validatedUrl;
    } catch (e) {
      throw new Error("Pinata IPFS gateway URL must be a valid URL");
    }
  }

  #validateEnvironment(env) {
    return this.#validateEnum(env, "Environment", ["testnet", "mainnet"]);
  }

  #validateNamespace(namespace) {
    const validatedNamespace = this.#validateString(namespace, "Namespace");
    if (validatedNamespace.length !== 5) {
      throw new Error("Namespace must be exactly 5 characters long");
    }
    if (!/^[A-Z]+$/.test(validatedNamespace)) {
      throw new Error("Namespace must contain only uppercase letters");
    }
    return validatedNamespace;
  }

  #validateRevenueWalletAddress(address) {
    const validatedAddress = this.#validateString(
      address,
      "Revenue wallet address"
    );
    if (validatedAddress.length !== 58) {
      throw new Error("Revenue wallet address must be 58 characters long");
    }
    if (!/^[A-Z2-7]{58}$/.test(validatedAddress)) {
      throw new Error("Invalid Algorand wallet address format");
    }
    return validatedAddress;
  }

  #validateFee(fee, paramName) {
    return this.#validateNumber(fee, paramName, { min: 0 });
  }

  #validateDisableToast(disableToast) {
    return this.#validateBoolean(disableToast, "disableToast", false);
  }

  #validateDisableUi(disableUi) {
    return this.#validateBoolean(disableUi, "disableUi", false);
  }

  async #showTemporaryWalletConnectionUI(walletType) {
    // Create a temporary overlay for wallet connection
    const overlay = document.createElement("div");
    overlay.id = "algomintx-temp-wallet-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const container = document.createElement("div");
    container.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 12px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      margin: 1rem;
    `;

    const title = document.createElement("h2");
    title.textContent = "Connect Wallet";
    title.style.cssText = `
      margin: 0 0 1rem 0;
      color: #1f2937;
      font-size: 1.5rem;
      font-weight: 600;
    `;

    const message = document.createElement("p");
    message.textContent = `Please open your ${walletType} wallet to complete the connection.`;
    message.style.cssText = `
      margin: 0 0 1.5rem 0;
      color: #6b7280;
      font-size: 1rem;
      line-height: 1.5;
    `;

    const spinner = document.createElement("div");
    spinner.style.cssText = `
      width: 40px;
      height: 40px;
      border: 4px solid #e5e7eb;
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem auto;
    `;

    // Add CSS animation
    const style = document.createElement("style");
    style.setAttribute("data-algomintx-temp", "true");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      background: #ef4444;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    `;
    cancelBtn.onmouseover = () => (cancelBtn.style.background = "#dc2626");
    cancelBtn.onmouseout = () => (cancelBtn.style.background = "#ef4444");

    cancelBtn.onclick = async () => {
      // Cancel the connection
      this.#connectionInProgress = false;
      if (this.#walletConnectors[walletType]) {
        try {
          await this.#walletConnectors[walletType].disconnect();
          if (this.#walletConnectors[walletType].killSession) {
            await this.#walletConnectors[walletType].killSession();
          }
        } catch (error) {
          console.error("Failed to disconnect wallet:", error);
        }
      }
      this.#hideTemporaryWalletConnectionUI();
      eventBus.emit("wallet:connection:cancelled", { walletType });
    };

    container.appendChild(title);
    container.appendChild(message);
    container.appendChild(spinner);
    container.appendChild(cancelBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Store reference to overlay for later removal
    this.#tempWalletOverlay = overlay;

    // Add a safety timeout to auto-hide the UI after 5 minutes
    setTimeout(() => {
      if (this.#tempWalletOverlay && this.#connectionInProgress) {
        this.#hideTemporaryWalletConnectionUI();
        this.#connectionInProgress = false;
        eventBus.emit("wallet:connection:timeout", { walletType });
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  #hideTemporaryWalletConnectionUI() {
    if (this.#tempWalletOverlay) {
      this.#tempWalletOverlay.remove();
      this.#tempWalletOverlay = null;
    }
  }

  // Force cleanup of any temporary UI elements (useful for headless mode)
  forceCleanup() {
    this.#hideTemporaryWalletConnectionUI();
    // Also remove any temporary styles that might have been added
    const tempStyles = document.querySelectorAll("style[data-algomintx-temp]");
    tempStyles.forEach((style) => style.remove());
  }

  // Force disconnect and clear all wallet sessions
  async forceDisconnect() {
    try {
      // Disconnect from all supported wallets
      for (const [walletType, connector] of Object.entries(
        this.#walletConnectors
      )) {
        try {
          if (connector.disconnect) {
            await connector.disconnect();
          }
          if (connector.killSession) {
            await connector.killSession();
          }
        } catch (error) {
          console.error(`Error disconnecting from ${walletType}:`, error);
        }
      }

      // Clear localStorage
      localStorage.removeItem("walletconnect");
      localStorage.removeItem("DeflyWallet.Wallet");
      localStorage.removeItem("PeraWallet.Wallet");

      // Reset internal state
      this.#walletConnected = false;
      this.account = null;
      this.#connectionInfo = null;
      this.#selectedWalletType = null;
      this.#connectionInProgress = false;

      // Emit disconnect event
      eventBus.emit("wallet:connection:disconnected", {
        address: this.account,
      });

      return true;
    } catch (error) {
      console.error("Error during force disconnect:", error);
      return false;
    }
  }

  #validateMinimizeUILocation(location) {
    return (
      this.#validateEnum(location, "minimizeUILocation", ["left", "right"]) ||
      "right"
    );
  }

  #validateLogo(logo) {
    if (logo === undefined || logo === null) {
      return null;
    }

    const validatedLogo = this.#validateString(logo, "Logo");

    // Check if it's a URL
    if (
      validatedLogo.startsWith("http://") ||
      validatedLogo.startsWith("https://")
    ) {
      return this.#validateUrl(validatedLogo, "Logo");
    }

    // Check if it's a local file path
    if (
      validatedLogo.startsWith("./") ||
      validatedLogo.startsWith("../") ||
      validatedLogo.startsWith("/")
    ) {
      if (
        !/^[./\\a-zA-Z0-9_-]+\.(png|jpg|jpeg|gif|svg|webp)$/i.test(
          validatedLogo
        )
      ) {
        throw new Error(
          "Invalid logo file path. Must be a valid image file path"
        );
      }
      return validatedLogo;
    }

    throw new Error(
      "Logo must be either a valid URL or a valid local file path"
    );
  }

  #validateToastLocation(location) {
    return this.#validateEnum(location, "Toast location", [
      "TOP_LEFT",
      "TOP_RIGHT",
    ]);
  }

  #validateSupportedMediaFormats(formats) {
    if (!Array.isArray(formats)) {
      throw new Error("supportedMediaFormats must be an array");
    }

    const validFormats = ["IMAGE", "VIDEO", "AUDIO"];
    const invalidFormats = formats.filter(
      (format) => !validFormats.includes(format)
    );

    if (invalidFormats.length > 0) {
      throw new Error(
        `Invalid media formats: ${invalidFormats.join(
          ", "
        )}. Valid formats are: ${validFormats.join(", ")}`
      );
    }

    return formats;
  }

  #validateFileType(file) {
    const allowedTypes = {
      IMAGE: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ],
      VIDEO: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"],
      AUDIO: [
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
        "audio/mp4",
        "audio/webm",
      ],
    };

    // Get all allowed types based on supported formats
    const allowedMimeTypes = this.#supportedMediaFormats.reduce(
      (types, format) => {
        return [...types, ...allowedTypes[format]];
      },
      []
    );

    if (!allowedMimeTypes.includes(file.type)) {
      const formatNames = this.#supportedMediaFormats
        .map((format) => format.toLowerCase())
        .join(", ");
      return {
        valid: false,
        message: `Please upload a supported file type (${formatNames})`,
      };
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > maxSize) {
      return {
        valid: false,
        message: "File size must be less than 100MB",
      };
    }

    return { valid: true };
  }

  #sdkValidationFailed(message) {
    localStorage.removeItem("walletconnect");
    localStorage.removeItem("DeflyWallet.Wallet");
    localStorage.removeItem("PeraWallet.Wallet");

    // If UI is disabled, don't show alert or reload
    if (this.#disableUi) {
      console.error("SDK validation failed:", message);
      return;
    }

    alert(message);
    window.location.reload();
  }

  /**
   * SDK private methods
   */

  #getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  #setupThemeListener() {
    // If UI is disabled, don't set up theme listener
    if (this.#disableUi) {
      return;
    }

    // Listen for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        // Only update if user hasn't manually set a theme
        const savedState = localStorage.getItem("amx");
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            if (!parsedState.theme) {
              // If theme wasn't manually set
              this.theme = e.matches ? "dark" : "light";
              this.#saveUIState();
              this.#applyTheme();
            }
          } catch (error) {
            console.error("Failed to parse saved state:", error);
          }
        }
      });
  }

  #applyTheme() {
    // If UI is disabled, don't manipulate DOM elements
    if (this.#disableUi) {
      return;
    }

    const container = document.getElementById("algomintx-sdk-container");
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");

    if (this.theme === "dark") {
      container.classList.add("dark-theme");
      minimizedBtn.classList.add("dark-theme");
    } else {
      container.classList.remove("dark-theme");
      minimizedBtn.classList.remove("dark-theme");
    }
  }

  #toggleTheme() {
    this.theme = this.theme === "light" ? "dark" : "light";
    this.#saveUIState();
    this.#applyTheme();
    eventBus.emit("theme:changed", { theme: this.theme });
  }

  #saveUIState() {
    // If UI is disabled, don't save UI state
    if (this.#disableUi) {
      return;
    }

    localStorage.setItem(
      "amx",
      JSON.stringify({
        minimized: this.isMinimized,
        theme: this.theme,
      })
    );
  }

  async #initUI() {
    try {
      // If UI is disabled, don't create any UI elements
      if (this.#disableUi) {
        return;
      }

      // Inject the entire SDK container directly into document.body with highest z-index

      // check if sdk container already exists
      const existingSdk = document.getElementById("algomintx-sdk-container");
      if (existingSdk) existingSdk.remove(); // remove if existing to avoid duplicates

      const container = document.createElement("div");
      container.id = "algomintx-sdk-container";

      container.innerHTML = `
      <div id="sdk-header">
        <div class="header-logo">
          ${
            this.#logo
              ? `<img src="${
                  this.#logo
                }" alt="AlgoMintX" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />`
              : ""
          }
          <h3 style="${
            this.#logo ? "display: none;" : "display: block;"
          }">AlgoMintX</h3>
        </div>
        <div>
          <button id="themeToggleBtn" title="Toggle Theme">🌓</button>
          <button id="logoutBtn" title="Logout">⏻</button>
          <button id="sdkMinimizeBtn" title="Minimize">&#x2013;</button>
        </div>
      </div>
    
      <div id="walletChoiceScreen">
        <button class="walletBtn" data-wallet="pera">
          <img src="https://perawallet.s3.amazonaws.com/images/media-kit/logomark-white.svg" alt="Pera Wallet" />
          Connect Pera Wallet
        </button>
        <button class="walletBtn" data-wallet="defly">
          <img src="https://docs.defly.app/~gitbook/image?url=https%3A%2F%2F2700986753-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fcollections%252FWDbwYIFtoiPa3JoJufCw%252Ficon%252FbQUUOW6VhH6vKR0XH7UB%252Flogo-notext-whiteonblack.png%3Falt%3Dmedia%26token%3D7d62c65b-fd29-47b6-a83b-162caac2fc8f&width=32&dpr=2&quality=100&sign=952138fe&sv=2" alt="Defly Wallet" />
          Connect Defly Wallet
        </button>
      </div>
    
      <div id="sdkUI">
        <input type="text" id="nftName" placeholder="NFT Name" />
        <textarea id="nftDescription" placeholder="NFT Description"></textarea>
        <input type="file" id="nftFile" accept="image/*,video/*" />
        <button id="#mintNFTBtn" title="Mint NFT">Mint NFT</button>
        <button id="resetNFTBtn">Mint another NFT</button>
        <div id="sdkMessages" title="Click to copy"></div>
      </div>

      <div id="walletAddressBar" title="Click to copy connected wallet address"></div>
      
      <div id="sdkFooter">
        <span>AlgoMintX crafted with ❤️ by <a href="https://ibhagyesh.site/" target="_blank" rel="noopener noreferrer">ibhagyesh</a></span>
      </div>

      <div id="algomintx-loading-overlay">
        <div id="algomintx-loader"></div>
        <div id="algomintx-processing-message"></div>
      </div>
    `;

      document.body.appendChild(container);

      // check if sdk minimized button already exists
      const existingSdkMinimizeBtn = document.getElementById("sdkMinimizedBtn");
      if (existingSdkMinimizeBtn) existingSdkMinimizeBtn.remove(); // remove if existing to avoid duplicates

      // Create minimized circle button but hide initially
      const minimizedBtn = document.createElement("button");
      minimizedBtn.id = "sdkMinimizedBtn";
      minimizedBtn.innerHTML = this.#logo
        ? `<img src="${
            this.#logo
          }" alt="AMX" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><span style="display: none;">AMX</span>`
        : "AMX";

      document.body.appendChild(minimizedBtn);

      // Apply initial theme
      this.#applyTheme();

      // Setup theme listener
      this.#setupThemeListener();

      // Choose wallet button
      document
        .getElementById("walletChoiceScreen")
        .addEventListener("click", async (event) => {
          if (event.target.classList.contains("walletBtn")) {
            const walletType = event.target.getAttribute("data-wallet");
            await this.#startWalletConnection(walletType);
          }
        });

      // Mint NFT button
      document
        .getElementById("#mintNFTBtn")
        .addEventListener("click", async () => {
          await this.#validateNFTDetails();
        });

      // Reset NFT button
      document
        .getElementById("resetNFTBtn")
        .addEventListener("click", () => this.#resetNFTDetails());

      // Minimize button
      document
        .getElementById("sdkMinimizeBtn")
        .addEventListener("click", () => this.minimizeSDK());

      // Logout button
      document
        .getElementById("logoutBtn")
        .addEventListener("click", () => this.#handleLogout());

      minimizedBtn.addEventListener("click", () => this.maximizeSDK());

      // Copy to clipboard for sdkMessages (tx id)
      this.#messageElement = document.getElementById("sdkMessages");
      this.#messageElement.addEventListener("click", () => {
        if (
          this.#messageElement.innerText &&
          this.#messageElement.innerText !== "Minting NFT... Please wait."
        ) {
          const txId = this.#messageElement.innerText.replace(
            "NFT Minted! Transaction ID: ",
            ""
          );

          // Copy to clipboard
          navigator.clipboard.writeText(txId);
          this.#showToast("Transaction ID copied to clipboard", "success");

          // Open transaction in new tab
          const network = this.network === "mainnet" ? "mainnet" : "testnet";
          const txUrl = `https://lora.algokit.io/${network}/transaction/${txId}`;
          window.open(txUrl, "_blank");
        }
      });

      // Copy to clipboard for wallet address bar
      walletAddressBar.addEventListener("click", () => {
        if (this.account) {
          navigator.clipboard.writeText(this.account);
          this.#showToast("Wallet address copied to clipboard", "success");
        }
      });

      // Add theme toggle button listener
      document
        .getElementById("themeToggleBtn")
        .addEventListener("click", () => {
          this.#toggleTheme();
        });

      // Check if already connected (from localStorage)
      await this.#loadConnectionFromStorage();

      // Add validation for mint button
      const nftName = document.getElementById("nftName");
      const nftDescription = document.getElementById("nftDescription");
      const nftFile = document.getElementById("nftFile");

      // Setup input validation and sanitization
      this.#setupNFTInputValidation();

      nftName.addEventListener("input", () => this.#validateMintButton());
      nftDescription.addEventListener("input", () =>
        this.#validateMintButton()
      );
      nftFile.addEventListener("change", () => this.#validateMintButton());

      // Initial validation
      this.#validateMintButton();
    } catch (error) {
      console.error(error, "init");
    }
  }

  #resetToLoginUI() {
    this.#walletConnected = false;
    this.account = null;
    this.#connectionInfo = null;
    this.#selectedWalletType = null;

    // If UI is disabled, don't manipulate DOM elements
    if (this.#disableUi) {
      return;
    }

    this.#clearMessage();
    this.#updateWalletAddressBar();

    document.getElementById("algomintx-sdk-container").style.display = "flex";
    document.getElementById("sdk-header").style.display = "flex";
    document.getElementById("logoutBtn").style.display = "none";
    document.getElementById("walletChoiceScreen").style.display = "flex";
    document.getElementById("sdkUI").style.display = "none";

    if (this.isMinimized) {
      this.minimizeSDK(true);
    } else {
      this.maximizeSDK(true);
    }
  }

  async #loadConnectionFromStorage() {
    try {
      // Check for wallet connection data in localStorage
      const walletconnect = localStorage.getItem("walletconnect");
      const peraWallet = localStorage.getItem("PeraWallet.Wallet");
      const deflyWallet = localStorage.getItem("DeflyWallet.Wallet");

      let walletType = null;
      let accounts = null;

      // Try to reconnect to existing sessions
      if (peraWallet) {
        try {
          const peraAccounts =
            await this.#walletConnectors.pera.reconnectSession();
          if (peraAccounts && peraAccounts.length > 0) {
            walletType = "pera";
            accounts = peraAccounts;
          }
        } catch (error) {
          console.log("Failed to reconnect to Pera wallet:", error.message);
        }
      }

      if (!accounts && deflyWallet) {
        try {
          const deflyAccounts =
            await this.#walletConnectors.defly.reconnectSession();
          if (deflyAccounts && deflyAccounts.length > 0) {
            walletType = "defly";
            accounts = deflyAccounts;
          }
        } catch (error) {
          console.log("Failed to reconnect to Defly wallet:", error.message);
        }
      }

      // If we found a valid session, restore the connection
      if (accounts && accounts.length > 0 && walletType) {
        this.#walletConnected = true;
        this.account = accounts[0];
        this.#selectedWalletType = walletType;
        this.#connectionInfo = { address: this.account, walletType };

        this.#showToast(
          `Restored connection to ${walletType} wallet`,
          "success"
        );

        if (!this.#disableUi) {
          this.#showSDKUI();
        }
        eventBus.emit("wallet:connection:connected", { address: this.account });
      } else {
        // No valid session found, reset to login UI
        if (!this.#disableUi) {
          this.#resetToLoginUI();
        }
      }
    } catch (error) {
      console.error("Failed to restore connection", error);
      this.#showToast("Failed to restore connection!", "error");
      eventBus.emit("wallet:connection:failed", {
        error: "Failed to restore connection",
      });
      if (!this.#disableUi) {
        this.#resetToLoginUI();
      }
    }
  }

  async #startWalletConnection(walletType) {
    if (this.#connectionInProgress) {
      this.#showToast("A wallet connection is already in progress.", "warning");
      return;
    }

    if (!this.#supportedWallets.includes(walletType)) {
      this.#showToast("Unsupported wallet selected.", "error");
      return;
    }

    this.#clearMessage();
    this.#selectedWalletType = walletType;

    // If UI is disabled, we need to temporarily show wallet connection UI
    if (this.#disableUi) {
      // Create temporary wallet connection UI
      await this.#showTemporaryWalletConnectionUI(walletType);
    } else {
      // Only manipulate DOM if UI is not disabled
      document.getElementById("algomintx-sdk-container").style.display = "none";
    }

    const walletConnector = this.#walletConnectors[walletType];

    this.#connectionInProgress = true;

    try {
      const connectPromise = walletConnector.connect();

      // Set a timeout fallback (e.g., 60s) to detect "hanging" connections
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Wallet connection timed out.")),
          60 * 1000
        )
      );

      const accounts = await Promise.race([connectPromise, timeoutPromise]);

      if (!accounts || accounts.length === 0) {
        throw new Error("Wallet connection declined or no account returned.");
      }

      this.#walletConnected = true;
      this.account = accounts[0];
      this.#connectionInfo = { address: this.account, walletType };

      if (!this.#disableUi) {
        this.#showSDKUI();
        this.#updateWalletAddressBar();
      } else {
        // Hide the temporary wallet connection UI
        this.#hideTemporaryWalletConnectionUI();
      }
      this.#showToast(`Connected to ${walletType} wallet`, "success");
      eventBus.emit("wallet:connection:connected", { address: this.account });
      this.#connectionInProgress = false;
    } catch (error) {
      if (error.message === "Wallet connection timed out.") {
        await walletConnector.disconnect();
        if (walletConnector.killSession) {
          await walletConnector.killSession(); // Extra hard-kill if supported
        }
        if (this.#disableUi) {
          this.#hideTemporaryWalletConnectionUI();
        } else {
          window.location.reload();
        }
      } else {
        console.error("Failed to connect wallet!", error);
        this.#connectionInProgress = false;

        // Handle specific error cases
        if (
          error.message &&
          error.message.includes("Session currently connected")
        ) {
          // Wallet is already connected, try to get the current session
          try {
            const accounts = await walletConnector.reconnectSession();
            if (accounts && accounts.length > 0) {
              // Successfully got the current session
              this.#walletConnected = true;
              this.account = accounts[0];
              this.#selectedWalletType = walletType;
              this.#connectionInfo = { address: this.account, walletType };

              if (!this.#disableUi) {
                this.#showSDKUI();
                this.#updateWalletAddressBar();
              } else {
                this.#hideTemporaryWalletConnectionUI();
              }

              this.#showToast(
                `Connected to existing ${walletType} session`,
                "success"
              );
              eventBus.emit("wallet:connection:connected", {
                address: this.account,
              });
              return; // Exit successfully
            }
          } catch (reconnectError) {
            console.error(
              "Failed to reconnect to existing session:",
              reconnectError
            );
          }
        }

        this.#showToast("Failed to connect wallet!", "error");
        eventBus.emit("wallet:connection:failed", {
          error: "Failed to connect wallet!",
        });
        if (this.#disableUi) {
          this.#hideTemporaryWalletConnectionUI();
        } else {
          this.#resetToLoginUI();
        }
      }
    }
  }

  #showSDKUI() {
    // If UI is disabled, don't manipulate DOM elements
    if (this.#disableUi) {
      return;
    }

    document.getElementById("algomintx-sdk-container").style.display = "flex";
    document.getElementById("sdk-header").style.display = "flex";
    document.getElementById("logoutBtn").style.display = "contents";
    document.getElementById("walletChoiceScreen").style.display = "none";
    document.getElementById("sdkUI").style.display = "flex";
    this.#updateWalletAddressBar();

    if (this.isMinimized) {
      this.minimizeSDK(true);
    } else {
      this.maximizeSDK(true);
    }
  }

  #updateWalletAddressBar() {
    // If UI is disabled, don't manipulate DOM elements
    if (this.#disableUi) {
      return;
    }

    const bar = document.getElementById("walletAddressBar");
    if (!bar) return;

    if (this.#walletConnected && this.account) {
      bar.innerText = this.account;
      bar.style.display = "block";
    } else {
      bar.innerText = "";
      bar.style.display = "none";
    }
  }

  async #handleLogout() {
    if (this.processing) {
      return;
    }
    if (confirm("Are you sure you want to logout?")) {
      try {
        if (
          this.#selectedWalletType &&
          this.#walletConnectors[this.#selectedWalletType]
        ) {
          const connector = this.#walletConnectors[this.#selectedWalletType];
          await connector.disconnect();
          if (connector.killSession) {
            await connector.killSession(); // Extra hard-kill if supported
          }
        }

        localStorage.removeItem("walletconnect");
        localStorage.removeItem("DeflyWallet.Wallet");
        localStorage.removeItem("PeraWallet.Wallet");
      } catch (error) {
        console.error("Failed to disconnect wallet session:", error);
      }

      eventBus.emit("wallet:connection:disconnected", {
        address: this.account,
      });
      this.#showToast("Logged out successfully.", "success");
      if (!this.#disableUi) {
        this.#resetToLoginUI();
      } else {
        // Reset internal state when UI is disabled
        this.#walletConnected = false;
        this.account = null;
        this.#connectionInfo = null;
        this.#selectedWalletType = null;
      }
    }
  }

  #showToast(message, type = "info") {
    // Emit toast event regardless of disableToast setting
    eventBus.emit("toast:show", { message, type });

    // Only show toast UI if not disabled
    if (this.#disableToast || this.#disableUi) return;

    // Remove existing toast if any
    const existingToast = document.getElementById("algomintx-toast");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.id = "algomintx-toast";

    // Create toast content container
    const toastContent = document.createElement("div");
    toastContent.className = "toast-content";
    toastContent.innerText = message;

    // Create close button
    const closeButton = document.createElement("button");
    closeButton.className = "toast-close";
    closeButton.innerHTML = "×";
    closeButton.onclick = () => {
      toast.style.opacity = "0";
      toast.addEventListener(
        "transitionend",
        () => {
          if (toast.parentElement) toast.parentElement.removeChild(toast);
        },
        { once: true }
      );
    };

    // Add content and close button to toast
    toast.appendChild(toastContent);
    toast.appendChild(closeButton);

    // Assign toast type class dynamically
    if (type === "error") {
      toast.classList.add("error");
    } else if (type === "success") {
      toast.classList.add("success");
    } else {
      toast.classList.add("info");
    }

    // Set toast location - convert to lowercase for CSS class
    const locationClass = this.#toastLocation.toLowerCase().replace("_", "-");
    toast.classList.add(locationClass);

    document.body.appendChild(toast);

    // Show fade-in
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });

    // Auto fade out after 3.5 seconds
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.addEventListener(
        "transitionend",
        () => {
          if (toast.parentElement) toast.parentElement.removeChild(toast);
        },
        { once: true }
      );
    }, 3500);
  }

  #clearMessage() {
    // If UI is disabled, don't manipulate DOM elements
    if (this.#disableUi) {
      return;
    }

    if (this.#messageElement) {
      this.#messageElement.innerText = "";
      this.#messageElement.style.display = "none";
    }
  }

  #resetNFTDetails() {
    if (this.processing) {
      return;
    }

    // If UI is disabled, don't manipulate DOM elements
    if (this.#disableUi) {
      return;
    }

    // Reset form fields
    const nftName = document.getElementById("nftName");
    const nftDescription = document.getElementById("nftDescription");
    const nftFile = document.getElementById("nftFile");
    const mintBtn = document.getElementById("#mintNFTBtn");
    const resetBtn = document.getElementById("resetNFTBtn");

    nftName.value = "";
    nftDescription.value = "";
    nftFile.value = "";

    // Reset UI state
    mintBtn.style.display = "block";
    resetBtn.style.display = "none";
    mintBtn.disabled = true; // Keep button disabled until fields are filled
    this.#clearMessage();

    // Re-validate mint button
    this.#validateMintButton();
  }

  #validateMintButton() {
    // If UI is disabled, don't manipulate DOM elements
    if (this.#disableUi) {
      return;
    }

    const mintBtn = document.getElementById("#mintNFTBtn");
    const nftName = document.getElementById("nftName");
    const nftDescription = document.getElementById("nftDescription");
    const nftFile = document.getElementById("nftFile");

    const isNameValid = nftName.value.trim().length > 0;
    const isDescriptionValid = nftDescription.value.trim().length > 0;
    const isFileValid = nftFile.files.length > 0;
    mintBtn.disabled = !(isNameValid && isDescriptionValid && isFileValid);
  }

  #sanitizeInput(input) {
    // Remove any HTML tags
    input = input.replace(/<[^>]*>/g, "");
    // Remove any script tags and their content
    input = input.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ""
    );
    // Remove any special characters except basic punctuation, spaces, and alphanumeric
    input = input.replace(
      /[^a-zA-Z0-9\s.,!?@#$%^&*()_+\-=\[\]{};':"\\|<>\/]/g,
      ""
    );
    // Remove multiple spaces but keep single spaces
    input = input.replace(/\s+/g, " ");
    return input.trim();
  }

  #validateNFTName(name) {
    // Check length (between 1 and 50 characters)
    if (name.length < 1 || name.length > 50) {
      return {
        valid: false,
        message: "NFT name must be between 1 and 50 characters",
      };
    }
    return { valid: true };
  }

  #validateNFTDescription(description) {
    // Check length (between 1 and 500 characters)
    if (description.length < 1 || description.length > 500) {
      return {
        valid: false,
        message: "NFT description must be between 1 and 500 characters",
      };
    }
    return { valid: true };
  }

  #setupNFTInputValidation() {
    // If UI is disabled, don't manipulate DOM elements
    if (this.#disableUi) {
      return;
    }

    const nftName = document.getElementById("nftName");
    const nftDescription = document.getElementById("nftDescription");
    const nftFile = document.getElementById("nftFile");

    // Set up file input accept attribute based on supported formats
    const mimeTypes = {
      IMAGE: "image/jpeg,image/png,image/gif,image/webp,image/svg+xml",
      VIDEO: "video/mp4,video/webm,video/ogg,video/quicktime",
      AUDIO: "audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm",
    };

    const acceptedTypes = this.#supportedMediaFormats
      .map((format) => mimeTypes[format])
      .join(",");

    nftFile.setAttribute("accept", acceptedTypes);

    // Add input event listeners for real-time validation
    nftName.addEventListener("input", (e) => {
      // Stop input if length exceeds 50 characters
      if (e.target.value.length > 50) {
        e.target.value = e.target.value.slice(0, 50);
        this.#showToast("NFT name cannot exceed 50 characters", "error");
        return;
      }

      // Only sanitize if there are HTML tags or scripts
      if (e.target.value.includes("<") || e.target.value.includes(">")) {
        const sanitized = this.#sanitizeInput(e.target.value);
        if (sanitized !== e.target.value) {
          e.target.value = sanitized;
        }
      }
      this.#validateMintButton();
    });

    nftDescription.addEventListener("input", (e) => {
      // Stop input if length exceeds 500 characters
      if (e.target.value.length > 500) {
        e.target.value = e.target.value.slice(0, 500);
        this.#showToast(
          "NFT description cannot exceed 500 characters",
          "error"
        );
        return;
      }

      // Only sanitize if there are HTML tags or scripts
      if (e.target.value.includes("<") || e.target.value.includes(">")) {
        const sanitized = this.#sanitizeInput(e.target.value);
        if (sanitized !== e.target.value) {
          e.target.value = sanitized;
        }
      }
      this.#validateMintButton();
    });

    // Add file validation
    nftFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const validation = this.#validateFileType(file);
        if (!validation.valid) {
          this.#showToast(validation.message, "error");
          e.target.value = ""; // Clear the file input
          this.#validateMintButton();
        }
      }
    });

    // Add paste event listeners to sanitize pasted content
    nftName.addEventListener("paste", (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData(
        "text"
      );
      // Truncate pasted text if it exceeds 50 characters
      const truncatedText = pastedText.slice(0, 50);
      const sanitized = this.#sanitizeInput(truncatedText);
      e.target.value = sanitized;
      if (pastedText.length > 50) {
        this.#showToast("NFT name cannot exceed 50 characters", "error");
      }
      this.#validateMintButton();
    });

    nftDescription.addEventListener("paste", (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData(
        "text"
      );
      // Truncate pasted text if it exceeds 500 characters
      const truncatedText = pastedText.slice(0, 500);
      const sanitized = this.#sanitizeInput(truncatedText);
      e.target.value = sanitized;
      if (pastedText.length > 500) {
        this.#showToast(
          "NFT description cannot exceed 500 characters",
          "error"
        );
      }
      this.#validateMintButton();
    });
  }

  async #validateNFTDetails() {
    if (this.processing) {
      return;
    }

    const name = this.#sanitizeInput(document.getElementById("nftName").value);
    const description = this.#sanitizeInput(
      document.getElementById("nftDescription").value
    );
    const fileInput = document.getElementById("nftFile");

    // Validate name
    const nameValidation = this.#validateNFTName(name);
    if (!nameValidation.valid) {
      this.#showToast(nameValidation.message, "error");
      return;
    }

    // Validate description
    const descriptionValidation = this.#validateNFTDescription(description);
    if (!descriptionValidation.valid) {
      this.#showToast(descriptionValidation.message, "error");
      return;
    }

    // Validate file
    if (!fileInput.files.length) {
      this.#showToast("Please upload a file.", "error");
      return;
    }

    // Disable UI elements (only if UI is not disabled)
    if (!this.#disableUi) {
      this.#messageElement.style.display = "block";
      this.#messageElement.style.cursor = "default";
      this.#messageElement.innerText = "Minting NFT... Please wait.";
      document.getElementById("#mintNFTBtn").disabled = true;
      document.getElementById("logoutBtn").disabled = true;
    }

    // show loading overlay after validation
    this.processing = true;
    this.#showLoadingOverlay("Processing...");
    eventBus.emit("sdk:processing:started", { processing: this.processing });

    try {
      const { transactionId, assetId } = await this.#mintNFT({
        name,
        description,
        file: fileInput.files[0],
      });

      if (!this.#disableUi) {
        this.#messageElement.style.cursor = "pointer";
        this.#messageElement.innerText = `NFT Minted! Transaction ID: ${transactionId}`;
      }

      this.processing = false;
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      this.#showToast(
        `NFT Minted Successfully! TxID: ${transactionId}`,
        "success"
      );

      // show resetNFTBtn and hide mintNFTBtn (only if UI is not disabled)
      if (!this.#disableUi) {
        document.getElementById("#mintNFTBtn").style.display = "none";
        document.getElementById("resetNFTBtn").style.display = "block";

        // enable mintNFTBtn and logout button
        document.getElementById("#mintNFTBtn").disabled = false;
        document.getElementById("logoutBtn").disabled = false;
      }

      const nftData = await this.getNFTMetadata({ assetId });

      eventBus.emit("nft:mint:success", {
        transactionId,
        nft: nftData,
      });
    } catch (error) {
      this.processing = false;
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      // Reset form on error (only if UI is not disabled)
      if (!this.#disableUi) {
        this.#resetNFTDetails();
      }

      this.#showToast("Failed to mint NFT!", "error");
      eventBus.emit("nft:mint:failed", { error: "Failed to mint NFT!" });
    }
  }

  async #sha256Hash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    return new Uint8Array(hashBuffer);
  }

  async #getImageIntegrityBase64(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const base64Hash = btoa(String.fromCharCode(...hashArray));
    return `sha256-${base64Hash}`;
  }

  async #mintNFT({ name, description, file }) {
    if (!this.#walletConnected || !this.account) {
      throw new Error("Wallet is not connected.");
    }

    let ipfsHash = null;
    let metadataIpfsHash = null;
    let currentStep = 0;

    try {
      // 1. Upload file to IPFS (Pinata) using your API key
      currentStep = 1;
      this.#updateLoadingMessage(
        "Processing... Step 1: Uploading file to IPFS"
      );
      ipfsHash = await this.#uploadFileToIPFS(file);

      // 2. Create metadata JSON with IPFS link, name, description
      currentStep = 2;
      this.#updateLoadingMessage("Processing... Step 2: Creating metadata");
      const integrity = await this.#getImageIntegrityBase64(file);

      const metadata = {
        name,
        description,
        image: `ipfs://${ipfsHash}`,
        image_integrity: integrity,
        image_mimetype: file.type,
        decimals: 0, // must be 0 for NFTs ARC-3 compliant
        standard: "arc3",
        minted_by: this.#metadataMark,
        marketplace: this.#unitName,
      };

      // 3. Hash metadata JSON to get 32 byte assetMetadataHash
      currentStep = 3;
      this.#updateLoadingMessage("Processing... Step 3: Hashing metadata");
      const metadataStr = JSON.stringify(metadata);
      const metadataHash = await this.#sha256Hash(metadataStr);

      // 4. Upload metadata JSON to IPFS to get the CID for assetURL
      currentStep = 4;
      this.#updateLoadingMessage(
        "Processing... Step 4: Uploading metadata to IPFS"
      );
      metadataIpfsHash = await this.#uploadJSONToIPFS(metadata);

      // 5. Create Algorand asset (NFT) pointing to metadata URL
      currentStep = 5;
      this.#updateLoadingMessage("Processing... Open your wallet to continue");
      const { txid, assetId } = await this.#createAlgorandAsset(
        metadataIpfsHash,
        name,
        metadataHash
      );

      return { transactionId: txid, assetId };
    } catch (error) {
      // Cleanup IPFS files if minting fails
      try {
        if (currentStep >= 4) {
          // If we got to step 4 or beyond, delete both the metadata JSON and the file
          if (metadataIpfsHash) {
            await this.#deleteFromIPFS(metadataIpfsHash);
          }
          if (ipfsHash) {
            await this.#deleteFromIPFS(ipfsHash);
          }
        } else if (currentStep >= 1) {
          // If we got to step 1 but failed before step 4, only delete the file
          if (ipfsHash) {
            await this.#deleteFromIPFS(ipfsHash);
          }
        }
      } catch (cleanupError) {
        console.error("Failed to cleanup IPFS files:", cleanupError);
      }
      throw error;
    }
  }

  async #deleteFromIPFS(ipfsHash) {
    try {
      const response = await fetch(
        `https://api.pinata.cloud/pinning/unpin/${ipfsHash}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.#pinata_ipfs_server_key}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete from IPFS: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("Error deleting from IPFS:", error);
      throw error;
    }
  }

  async #uploadFileToIPFS(file) {
    const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";

    const data = new FormData();
    data.append("file", file);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.#pinata_ipfs_server_key}`,
      },
      body: data,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to upload file to IPFS: ${response.status} ${response.statusText}`
      );
    }

    const json = await response.json();
    if (!json.IpfsHash) {
      throw new Error("Pinata did not return an IPFS hash.");
    }

    return json.IpfsHash;
  }

  async #uploadJSONToIPFS(jsonData) {
    const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#pinata_ipfs_server_key}`,
      },
      body: JSON.stringify(jsonData),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to upload JSON to IPFS: ${response.status} ${response.statusText}`
      );
    }

    const json = await response.json();
    if (!json.IpfsHash) {
      throw new Error("Pinata did not return an IPFS hash for metadata.");
    }

    return json.IpfsHash;
  }

  async #createAlgorandAsset(metadataIpfsHash, assetName, metadataHashBuffer) {
    const suggestedParams = await this.#algodClient.getTransactionParams().do();

    /**
     * To access the ipfs files
     * https://purple-shrill-worm-294.mypinata.cloud/ipfs/QmY5FMJW43yxJ2hco1jQbD4rzByxviKTYWR5sY18sZ6k5n
     * https://gateway.pinata.cloud/ipfs/QmY5FMJW43yxJ2hco1jQbD4rzByxviKTYWR5sY18sZ6k5n
     * https://ipfs.io/ipfs/QmY5FMJW43yxJ2hco1jQbD4rzByxviKTYWR5sY18sZ6k5n
     */
    const metadataURL = `ipfs://${metadataIpfsHash}#arc3`;

    const safeAssetName =
      assetName && typeof assetName === "string" && assetName.length > 0
        ? assetName.substring(0, 32).replace(/[^a-zA-Z0-9 _-]/g, "") // Allow spaces, hyphens, underscores
        : "Unnamed Asset";

    const assetCreateTxn =
      algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        sender: this.account,
        total: 1,
        decimals: 0,
        defaultFrozen: false,
        unitName: this.#unitName,
        assetName: safeAssetName,
        assetURL: metadataURL,
        assetMetadataHash: metadataHashBuffer,
        suggestedParams,
        clawback: this.#contractWalletAddress,
      });

    // Prepare group transaction array
    const mintingGroup = [assetCreateTxn];

    // If mintFee > 0, add payment txn to revenueWalletAddress
    if (this.#mintFee > 0) {
      const revenueTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: this.account,
        receiver: this.#revenueWalletAddress,
        amount: this.#algosToMicroAlgos(this.#mintFee),
        suggestedParams,
      });
      mintingGroup.push(revenueTxn);
    }

    // Assign group id if more than one txn
    if (mintingGroup.length > 1) {
      algosdk.assignGroupID(mintingGroup);
    }

    const walletConnector = this.#walletConnectors[this.#selectedWalletType];
    const signedMinting = await walletConnector.signTransaction([
      mintingGroup.map((txn) => ({ txn, signers: [this.account] })),
    ]);
    const { txid } = await this.#algodClient
      .sendRawTransaction(signedMinting)
      .do();

    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(
      this.#algodClient,
      txid,
      10
    );

    // Extract asset ID
    const assetId = Number(confirmedTxn.assetIndex);

    return { txid, assetId };
  }

  async #decodeListingBoxFromAlgod(boxNameB64) {
    const boxNameBytes = Uint8Array.from(atob(boxNameB64), (c) =>
      c.charCodeAt(0)
    );
    const assetIdBytes = boxNameBytes.slice(8); // skip 'listing_' prefix
    const assetId = algosdk.decodeUint64(assetIdBytes, "safe");

    // Get the box value
    const boxValueResponse = await this.#algodClient
      .getApplicationBoxByName(this.#contractApplicationId, boxNameBytes)
      .do();

    // The value is already a Uint8Array in the browser environment
    const raw = boxValueResponse.value;

    // Use DataView to decode the values
    const view = new DataView(raw.buffer);

    // skip the following bytes
    // (bytes 0-1) struct type ID (2 bytes)
    // (bytes 2-3) seller length (2 bytes)
    // (bytes 4-5) price length (2 bytes)
    // (bytes 6-7) marketplace length (2 bytes)

    // Read seller string (bytes 8-65)
    const sellerStart = 8; // Skip struct type ID (2) + seller length (2) + price length (2) + marketplace length (2)
    const sellerEnd = sellerStart + 58; // Algorand addresses are always 58 bytes
    const sellerBytes = raw.slice(sellerStart, sellerEnd);

    // Decode seller string
    const seller = new TextDecoder().decode(sellerBytes);
    // console.log("seller:", seller);

    // Read price length (uint16 BE) (bytes 66-73)
    const priceLen = view.getUint16(sellerEnd, false); // Read price length at position 66

    // Read price string (bytes 66-67): price length (2 bytes) (bytes 68-73): price value
    const priceStart = sellerEnd + 2; // Start after seller (66) + 2 bytes for price length
    const priceEnd = priceStart + priceLen; // End after reading price length bytes
    const priceBytes = raw.slice(priceStart, priceEnd);

    // Decode price as a UTF-8 string (not number)
    const nftPrice = this.#microAlgosToAlgos(
      Number(new TextDecoder().decode(priceBytes))
    );
    // console.log("nftPrice:", nftPrice);

    // Read marketplace length (uint16 BE) (bytes 74-84)
    const marketplaceLen = view.getUint16(priceEnd, false); // Read marketplace length at position 74

    // Read marketplace string (bytes 74-75): marketplace length (2 bytes) (bytes 76-84): marketplace value
    const marketplaceStart = priceEnd + 2; // Start after price (74) + 2 bytes for marketplace length
    const marketplaceEnd = marketplaceStart + marketplaceLen; // End after reading marketplace length bytes
    const marketplaceBytes = raw.slice(marketplaceStart, marketplaceEnd);

    // Decode marketplace string
    const marketplace = new TextDecoder().decode(marketplaceBytes);
    // console.log("marketplace:", marketplace);

    // Return result
    return {
      key: `listing_${assetId}`,
      value: {
        seller,
        nftPrice,
        marketplace,
      },
    };
  }

  #convertIpfsToHttp(ipfsUrl, gateway = "https://ipfs.io/ipfs/") {
    if (gateway) {
      return ipfsUrl.replace("ipfs://", `https://${gateway}/ipfs/`);
    } else {
      return ipfsUrl.replace("ipfs://", gateway);
    }
  }

  #microAlgosToAlgos(microAlgos) {
    return Number(microAlgos / 1_000_000);
  }

  #algosToMicroAlgos(algos) {
    return Math.round(algos * 1_000_000);
  }

  #getListingBoxReference(appIndex, assetId) {
    const prefix = "listing_";
    const encodedAssetId = algosdk.encodeUint64(BigInt(assetId)); // Uint64 to 8-byte Buffer
    const boxName = new Uint8Array([
      ...Buffer.from(prefix), // "listing_" as bytes
      ...encodedAssetId, // 8-byte encoded assetId
    ]);

    return { appIndex, name: boxName };
  }

  #getBoxNameB64(assetId) {
    const prefix = "listing_";
    const encodedAssetId = algosdk.encodeUint64(BigInt(assetId)); // Uint64 to 8-byte Buffer
    const boxName = new Uint8Array([
      ...Buffer.from(prefix), // "listing_" as bytes
      ...encodedAssetId, // 8-byte encoded assetId
    ]);
    return Buffer.from(boxName).toString("base64");
  }

  #showLoadingOverlay(message = "Processing...") {
    // If UI is disabled, don't show loading overlay
    if (this.#disableUi) {
      return;
    }

    if (this.isMinimized) {
      // Show processing spinner on minimized button
      const minimizedBtn = document.getElementById("sdkMinimizedBtn");
      if (minimizedBtn) {
        minimizedBtn.classList.add("processing");
      }
      // Store the current message
      this.#currentLoadingMessage = message;
      return;
    }

    const overlay = document.getElementById("algomintx-loading-overlay");
    const messageElement = document.getElementById(
      "algomintx-processing-message"
    );
    if (!overlay) return;

    // Apply theme to overlay
    if (this.theme === "dark") {
      overlay.classList.add("dark-theme");
    } else {
      overlay.classList.remove("dark-theme");
    }

    // Update processing message
    if (messageElement) {
      if (message === "Processing..." && this.#selectedWalletType) {
        messageElement.innerHTML = `Processing... Open ${
          this.#selectedWalletType
        } wallet on your mobile to continue<br><br>Please do not reload the page or close the tab`;
      } else {
        messageElement.textContent = message;
      }
    }

    // Store the current message
    this.#currentLoadingMessage = message;

    // Show overlay with animation
    requestAnimationFrame(() => {
      overlay.classList.add("visible");
    });

    // Disable logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.disabled = true;
    }
  }

  #updateLoadingMessage(message) {
    // If UI is disabled, don't manipulate DOM elements
    if (this.#disableUi) {
      return;
    }

    const messageElement = document.getElementById(
      "algomintx-processing-message"
    );
    if (messageElement) {
      if (message === "Processing..." && this.#selectedWalletType) {
        messageElement.innerHTML = `Processing... Open ${
          this.#selectedWalletType
        } wallet on your mobile to continue<br><br>Please do not reload the page or close the tab`;
      } else {
        messageElement.textContent = message;
      }
    }
    // Store the current message
    this.#currentLoadingMessage = message;
  }

  #hideLoadingOverlay() {
    // If UI is disabled, don't manipulate DOM elements
    if (this.#disableUi) {
      return;
    }

    // Remove processing spinner from minimized button
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");
    if (minimizedBtn) {
      minimizedBtn.classList.remove("processing");
    }

    const overlay = document.getElementById("algomintx-loading-overlay");
    if (!overlay) return;

    // Hide overlay with animation using requestAnimationFrame
    requestAnimationFrame(() => {
      overlay.classList.remove("visible");
    });

    // Enable logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.disabled = false;
    }
  }

  /**
   * SDK public methods
   */

  async connectWallet(walletType) {
    if (!this.#supportedWallets.includes(walletType)) {
      throw new Error(
        `Unsupported wallet type. Supported types: ${this.#supportedWallets.join(
          ", "
        )}`
      );
    }

    if (this.#walletConnected) {
      throw new Error("Wallet is already connected");
    }

    if (this.#connectionInProgress) {
      throw new Error("A wallet connection is already in progress");
    }

    // Check if there's an existing session that needs to be handled
    try {
      const walletConnector = this.#walletConnectors[walletType];

      // Try to reconnect to existing session first
      if (walletConnector.reconnectSession) {
        try {
          const accounts = await walletConnector.reconnectSession();
          if (accounts && accounts.length > 0) {
            // Successfully reconnected to existing session
            this.#walletConnected = true;
            this.account = accounts[0];
            this.#selectedWalletType = walletType;
            this.#connectionInfo = { address: this.account, walletType };

            // Emit connection event
            eventBus.emit("wallet:connection:connected", {
              address: this.account,
            });

            // Show toast notification
            this.#showToast(`Reconnected to ${walletType} wallet`, "success");

            return; // Exit early since we successfully reconnected
          }
        } catch (reconnectError) {
          console.log(
            `No existing session to reconnect to: ${reconnectError.message}`
          );
          // Continue with normal connection flow
        }
      }
    } catch (error) {
      console.log("Error checking for existing session:", error.message);
      // Continue with normal connection flow
    }

    // Check if there are any conflicting sessions from other wallets
    try {
      for (const [otherWalletType, connector] of Object.entries(
        this.#walletConnectors
      )) {
        if (otherWalletType !== walletType && connector.reconnectSession) {
          try {
            const accounts = await connector.reconnectSession();
            if (accounts && accounts.length > 0) {
              console.log(
                `Found existing session from ${otherWalletType}, clearing it first`
              );
              // Clear the conflicting session
              await connector.disconnect();
              if (connector.killSession) {
                await connector.killSession();
              }
            }
          } catch (error) {
            // Ignore errors when checking other wallet sessions
          }
        }
      }
    } catch (error) {
      console.log("Error checking for conflicting sessions:", error.message);
    }

    // Start wallet connection process
    await this.#startWalletConnection(walletType);
  }

  isWalletSupported(walletType) {
    return this.#supportedWallets.includes(walletType);
  }

  getSupportedWallets() {
    return [...this.#supportedWallets];
  }

  isHeadlessMode() {
    return this.#disableUi;
  }

  async disconnectWallet() {
    if (!this.#walletConnected) {
      throw new Error("No wallet is currently connected");
    }

    // Handle logout process
    await this.#handleLogout();
  }

  getConnectionStatus() {
    return {
      connected: this.#walletConnected,
      account: this.account,
      walletType: this.#selectedWalletType,
      connectionInProgress: this.#connectionInProgress,
      network: this.network,
      namespace: this.#namespace,
    };
  }

  // Get detailed wallet session information
  async getWalletSessionInfo() {
    const sessionInfo = {};

    for (const [walletType, connector] of Object.entries(
      this.#walletConnectors
    )) {
      try {
        if (connector.reconnectSession) {
          const accounts = await connector.reconnectSession();
          sessionInfo[walletType] = {
            hasSession: accounts && accounts.length > 0,
            accountCount: accounts ? accounts.length : 0,
            firstAccount: accounts && accounts.length > 0 ? accounts[0] : null,
          };
        } else {
          sessionInfo[walletType] = {
            hasSession: false,
            accountCount: 0,
            firstAccount: null,
          };
        }
      } catch (error) {
        sessionInfo[walletType] = {
          hasSession: false,
          accountCount: 0,
          firstAccount: null,
          error: error.message,
        };
      }
    }

    return sessionInfo;
  }

  minimizeSDK(initialLoad) {
    // If UI is disabled, don't manipulate DOM elements
    if (this.#disableUi) {
      return;
    }

    if (!initialLoad && this.isMinimized) return;

    const container = document.getElementById("algomintx-sdk-container");
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");

    // Set position based on minimizeUILocation
    minimizedBtn.style.right =
      this.#minimizeUILocation === "right" ? "20px" : "auto";
    minimizedBtn.style.left =
      this.#minimizeUILocation === "left" ? "20px" : "auto";

    // Start minimizing animation
    container.classList.add("minimizing");
    minimizedBtn.style.display = "block";

    // Store current loading message if processing
    if (this.processing) {
      const messageElement = document.getElementById(
        "algomintx-processing-message"
      );
      if (messageElement) {
        this.#currentLoadingMessage = messageElement.textContent;
      }
    }

    // Wait for the minimizing animation to complete
    setTimeout(() => {
      container.style.display = "none";
      container.classList.remove("minimizing");

      // Start showing minimized button animation
      requestAnimationFrame(() => {
        minimizedBtn.classList.add("showing");
        // Add processing class if processing is active
        if (this.processing) {
          minimizedBtn.classList.add("processing");
        }
      });
    }, 300);

    this.isMinimized = true;
    this.#saveUIState();
    eventBus.emit("window:size:minimized", { minimized: this.isMinimized });
  }

  maximizeSDK(initialLoad) {
    // If UI is disabled, don't manipulate DOM elements
    if (this.#disableUi) {
      return;
    }

    if (!initialLoad && !this.isMinimized) return;

    const container = document.getElementById("algomintx-sdk-container");
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");

    // Start hiding minimized button animation
    minimizedBtn.classList.remove("showing");
    minimizedBtn.classList.add("hiding");

    // Wait for the hiding animation to complete
    setTimeout(() => {
      minimizedBtn.style.display = "none";
      minimizedBtn.classList.remove("hiding");
      minimizedBtn.classList.remove("processing"); // Remove processing class

      // Show and animate the main container
      container.style.display = "flex";
      container.classList.add("maximizing");

      // Force a reflow
      container.offsetHeight;

      requestAnimationFrame(() => {
        container.classList.remove("maximizing");
        // Show loading overlay if processing
        if (this.processing) {
          this.#showLoadingOverlay(this.#currentLoadingMessage);
        }
      });
    }, 300);

    this.isMinimized = false;
    this.#saveUIState();
    eventBus.emit("window:size:minimized", { minimized: this.isMinimized });
  }

  async getListedNFTs() {
    const nfts = [];

    try {
      const boxUrl = `${this.#indexerUrl}/v2/applications/${
        this.#contractApplicationId
      }/boxes`;
      const boxRes = await fetch(boxUrl);

      if (boxRes.ok) {
        const boxData = await boxRes.json();
        if (boxData.boxes && boxData.boxes.length > 0) {
          for (const box of boxData.boxes) {
            let nft = {};
            let decodedBox;
            try {
              decodedBox = await this.#decodeListingBoxFromAlgod(box.name);

              nft.listing = {
                seller: decodedBox.value.seller,
                price: decodedBox.value.nftPrice,
                marketplace: decodedBox.value.marketplace,
              };
            } catch (error) {
              console.warn(`Failed to decode box for NFT ${assetId}:`, error);
            }

            if (
              nft.listing.marketplace !== this.#unitName // only show current marketplce nfts
            )
              continue;

            const assetId = decodedBox.key.replace("listing_", "");
            const assetUrl = `${this.#indexerUrl}/v2/assets/${assetId}`;
            const assetRes = await fetch(assetUrl);
            if (!assetRes.ok) continue;

            const assetData = await assetRes.json();
            const params = assetData.asset.params;

            nft = {
              ...nft,
              ...params,
              assetId,
            };

            if (
              params.total !== 1 ||
              params.decimals !== 0 ||
              !params.clawback ||
              (params.clawback &&
                params.clawback !== this.#contractWalletAddress) // filter out NFTs that are not owned by the contract or not set to clawback
            )
              continue;

            // Handle IPFS metadata
            const metadataUrl = params.url;
            if (metadataUrl?.startsWith("ipfs://")) {
              const ipfsUrl = this.#convertIpfsToHttp(
                metadataUrl,
                this.#pinata_ipfs_gateway_url
              );
              try {
                const metadataRes = await fetch(ipfsUrl);
                if (metadataRes.ok) {
                  const metadata = await metadataRes.json();
                  if (
                    metadata.decimals === 0 &&
                    metadata.image_integrity &&
                    metadata.image_mimetype &&
                    metadata.standard &&
                    metadata.image &&
                    metadata.image.startsWith("ipfs://")
                  ) {
                    metadata.image = this.#convertIpfsToHttp(
                      metadata.image,
                      this.#pinata_ipfs_gateway_url
                    );
                    nft.metadata = metadata;
                  }
                }
              } catch (error) {
                console.warn(
                  `IPFS metadata fetch failed for asset ${assetId}`,
                  error
                );
              }
            }

            // Get current holder's address
            const holdersUrl = `${
              this.#indexerUrl
            }/v2/assets/${assetId}/balances?currency-greater-than=0`;
            const holdersRes = await fetch(holdersUrl);
            if (holdersRes.ok) {
              const holdersData = await holdersRes.json();
              if (holdersData.balances && holdersData.balances.length > 0) {
                // The first balance entry with amount > 0 is the current holder
                const currentHolder = holdersData.balances.find(
                  (balance) => balance.amount > 0
                );
                if (currentHolder) {
                  nft.currentHolder = currentHolder.address;
                }
              }
            }

            nfts.push(nft);
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching listed NFTS`, error.message);
      throw error;
    }

    return nfts;
  }

  async getWalletNFTs({ accountId }) {
    const nfts = [];

    try {
      if (!accountId) {
        if (!this.#walletConnected || !this.account) {
          // Maximize SDK if minimized to show login screen
          if (this.isMinimized) {
            this.maximizeSDK(true);
          }
          throw new Error("Wallet is not connected");
        }
      } else {
        this.#validateRevenueWalletAddress(accountId);
      }

      const url = `${this.#indexerUrl}/v2/accounts/${
        accountId ? accountId : this.account
      }`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Indexer fetch error: ${res.status}`);

      const accountData = await res.json();
      const assets = accountData.account.assets || [];

      for (const holding of assets) {
        // Check if the wallet actually holds this NFT (amount > 0)
        if (holding.amount === 0) continue;

        const assetId = holding["asset-id"];
        const assetUrl = `${this.#indexerUrl}/v2/assets/${assetId}`;
        const assetRes = await fetch(assetUrl);
        if (!assetRes.ok) continue;

        const assetData = await assetRes.json();
        const params = assetData.asset.params;

        const nft = {
          ...params,
          assetId,
        };

        if (
          params.total !== 1 ||
          params.decimals !== 0 ||
          !params.clawback ||
          (params.clawback && params.clawback !== this.#contractWalletAddress) // filter out NFTs that are not owned by the contract or not set to clawback
        )
          continue;

        // Handle IPFS metadata
        const metadataUrl = params.url;
        if (metadataUrl?.startsWith("ipfs://")) {
          const ipfsUrl = this.#convertIpfsToHttp(
            metadataUrl,
            this.#pinata_ipfs_gateway_url
          );
          try {
            const metadataRes = await fetch(ipfsUrl);
            if (metadataRes.ok) {
              const metadata = await metadataRes.json();
              if (
                metadata.decimals === 0 &&
                metadata.image_integrity &&
                metadata.image_mimetype &&
                metadata.standard &&
                metadata.image &&
                metadata.image.startsWith("ipfs://")
              ) {
                metadata.image = this.#convertIpfsToHttp(
                  metadata.image,
                  this.#pinata_ipfs_gateway_url
                );
                nft.metadata = metadata;
              }
            }
          } catch (error) {
            console.warn(
              `IPFS metadata fetch failed for asset ${assetId}`,
              error
            );
          }
        }

        // Get current holder's address
        const holdersUrl = `${
          this.#indexerUrl
        }/v2/assets/${assetId}/balances?currency-greater-than=0`;
        const holdersRes = await fetch(holdersUrl);
        if (holdersRes.ok) {
          const holdersData = await holdersRes.json();
          if (holdersData.balances && holdersData.balances.length > 0) {
            // The first balance entry with amount > 0 is the current holder
            const currentHolder = holdersData.balances.find(
              (balance) => balance.amount > 0
            );
            if (currentHolder) {
              nft.currentHolder = currentHolder.address;
            }
          }
        }

        nfts.push(nft);
      }
    } catch (error) {
      console.error("Error fetching NFTs by wallet:", error.message);
      throw error;
    }

    return nfts;
  }

  async getNFTMetadata({ assetId }) {
    try {
      const assetUrl = `${this.#indexerUrl}/v2/assets/${assetId}`;
      const assetRes = await fetch(assetUrl);
      if (!assetRes.ok) {
        throw new Error(`Failed to fetch asset data: ${assetRes.status}`);
      }
      const assetData = await assetRes.json();
      const params = assetData.asset.params;

      const nft = {
        ...params,
        assetId,
      };

      // Fetch box data for this NFT
      const boxUrl = `${this.#indexerUrl}/v2/applications/${
        this.#contractApplicationId
      }/boxes`;
      const boxRes = await fetch(boxUrl);

      if (boxRes.ok) {
        const boxData = await boxRes.json();
        if (boxData.boxes && boxData.boxes.length > 0) {
          // Find the box that matches our asset ID
          for (const box of boxData.boxes) {
            try {
              const decodedBox = await this.#decodeListingBoxFromAlgod(
                box.name
              );
              if (decodedBox.key === `listing_${assetId}`) {
                nft.listing = {
                  seller: decodedBox.value.seller,
                  price: decodedBox.value.nftPrice,
                  marketplace: decodedBox.value.marketplace,
                };
                break;
              }
            } catch (error) {
              console.warn(`Failed to decode box for NFT ${assetId}:`, error);
            }
          }
        }
      }

      // Handle IPFS metadata
      const metadataUrl = params.url;
      if (metadataUrl?.startsWith("ipfs://")) {
        const ipfsUrl = this.#convertIpfsToHttp(
          metadataUrl,
          this.#pinata_ipfs_gateway_url
        );
        try {
          const metadataRes = await fetch(ipfsUrl);
          if (!metadataRes.ok) {
            throw new Error(
              `Failed to fetch IPFS metadata: ${metadataRes.status}`
            );
          }
          const metadata = await metadataRes.json();
          if (
            metadata.decimals === 0 &&
            metadata.image_integrity &&
            metadata.image_mimetype &&
            metadata.standard &&
            metadata.image &&
            metadata.image.startsWith("ipfs://")
          ) {
            metadata.image = this.#convertIpfsToHttp(
              metadata.image,
              this.#pinata_ipfs_gateway_url
            );
            nft.metadata = metadata;
          }
        } catch (error) {
          console.warn(
            `IPFS metadata fetch failed for asset ${assetId}`,
            error
          );
        }
      }

      // Get current holder's address
      const holdersUrl = `${
        this.#indexerUrl
      }/v2/assets/${assetId}/balances?currency-greater-than=0`;
      const holdersRes = await fetch(holdersUrl);
      if (holdersRes.ok) {
        const holdersData = await holdersRes.json();
        if (holdersData.balances && holdersData.balances.length > 0) {
          // The first balance entry with amount > 0 is the current holder
          const currentHolder = holdersData.balances.find(
            (balance) => balance.amount > 0
          );
          if (currentHolder) {
            nft.currentHolder = currentHolder.address;
          }
        }
      }

      // Fetch transaction id for this NFT
      const txUrl = `${
        this.#indexerUrl
      }/v2/transactions?asset-id=${assetId}&tx-type=acfg`;
      const txRes = await fetch(txUrl);
      if (!txRes.ok) {
        throw new Error(
          `Failed to fetch asset config transaction: ${txRes.status}`
        );
      }
      const txData = await txRes.json();
      nft.transactionId = txData.transactions?.[0]?.id;

      return nft;
    } catch (error) {
      console.error("Error fetching NFT metadata:", error.message);
      throw error; // Re-throw to allow caller to handle the error
    }
  }

  async listNFT({ assetId, nftPrice }) {
    try {
      this.processing = true;
      this.#showLoadingOverlay("Processing...");
      eventBus.emit("sdk:processing:started", { processing: this.processing });

      if (!this.#walletConnected || !this.account) {
        // Maximize SDK if minimized to show login screen
        if (this.isMinimized) {
          this.maximizeSDK(true);
        }
        throw new Error("Wallet is not connected");
      }
      if (!assetId || !nftPrice) {
        throw new Error("Asset ID and price are required");
      }

      if (isNaN(assetId) || isNaN(nftPrice)) {
        throw new Error("Asset ID and price must be a number.");
      }

      // Get suggested parameters
      const suggestedParams = await this.#algodClient
        .getTransactionParams()
        .do();

      const oneMicroAlgo = { ...suggestedParams, flatFee: true, fee: 1000 }; // 0.001 Algo
      const twoMicroAlgo = { ...suggestedParams, flatFee: true, fee: 2000 }; // 0.002 Algo
      const threeMicroAlgo = { ...suggestedParams, flatFee: true, fee: 3000 }; // 0.003 Algo
      const fourMicroAlgo = { ...suggestedParams, flatFee: true, fee: 4000 }; // 0.004 Algo
      const fiveMicroAlgo = { ...suggestedParams, flatFee: true, fee: 5000 }; // 0.005 Algo

      // Get the wallet connector
      const walletConnector = this.#walletConnectors[this.#selectedWalletType];

      // Get the listing box reference
      const boxRef = this.#getListingBoxReference(
        this.#contractApplicationId,
        assetId
      );

      const fundContractTxn =
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.#contractWalletAddress,
          amount: 100_000,
          suggestedParams,
        });

      const transferNFTToContractAndAddListingMethod = encoder.methods.find(
        (m) => m.name === "transferNFTToContractAndAddListing"
      );
      const transferNFTToContractAndAddListingTxn =
        algosdk.makeApplicationCallTxnFromObject({
          sender: this.account,
          appIndex: this.#contractApplicationId,
          onComplete: algosdk.OnApplicationComplete.NoOpOC,
          appArgs: [
            transferNFTToContractAndAddListingMethod.getSelector(),
            algosdk.ABIType.from("uint64").encode(BigInt(assetId)),
            algosdk.ABIType.from("string").encode(this.account),
            algosdk.ABIType.from("string").encode(
              this.#algosToMicroAlgos(nftPrice).toString()
            ),
            algosdk.ABIType.from("string").encode(this.#unitName),
          ],
          boxes: [boxRef],
          foreignAssets: [assetId],
          suggestedParams: fourMicroAlgo,
        });

      // opt-in, asset transfer is done inside contract
      const listingGroup = [
        fundContractTxn,
        transferNFTToContractAndAddListingTxn,
      ];

      // if listing fee is greater than 0, add revenue transaction to the listing group
      if (this.#listingFee > 0) {
        const revenueTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.#revenueWalletAddress,
          amount: this.#algosToMicroAlgos(this.#listingFee),
          suggestedParams,
        });
        listingGroup.push(revenueTxn);
      }

      algosdk.assignGroupID(listingGroup);

      const signedListing = await walletConnector.signTransaction([
        listingGroup.map((txn) => ({ txn, signers: [this.account] })),
      ]);
      const { txid: listingTxId } = await this.#algodClient
        .sendRawTransaction(signedListing)
        .do();

      await algosdk.waitForConfirmation(this.#algodClient, listingTxId, 10);

      this.processing = false;
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      const nftData = await this.getNFTMetadata({ assetId });

      // Emit event for successful listing
      eventBus.emit("nft:list:success", {
        nft: nftData,
        transactionId: listingTxId,
      });

      return {
        nft: nftData,
        transactionId: listingTxId,
      };
    } catch (error) {
      console.error("Error listing NFT:", error.message);
      this.processing = false;
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("nft:list:failed", { error: "Could not list NFT!" });
      throw error;
    }
  }

  async unlistNFT({ assetId }) {
    try {
      this.processing = true;
      this.#showLoadingOverlay("Processing...");
      eventBus.emit("sdk:processing:started", { processing: this.processing });

      if (!this.#walletConnected || !this.account) {
        // Maximize SDK if minimized to show login screen
        if (this.isMinimized) {
          this.maximizeSDK(true);
        }
        throw new Error("Wallet is not connected.");
      }

      if (!assetId) {
        throw new Error("Asset ID is required.");
      }

      if (isNaN(assetId)) {
        throw new Error("Asset ID must be a number.");
      }

      const nftData = await this.getNFTMetadata({ assetId });

      if (nftData.listing.marketplace !== this.#unitName) {
        throw new Error("Cannot un-list nft from other marketplace.");
      }

      // Get suggested parameters
      const suggestedParams = await this.#algodClient
        .getTransactionParams()
        .do();

      const oneMicroAlgo = { ...suggestedParams, flatFee: true, fee: 1000 }; // 0.001 Algo
      const twoMicroAlgo = { ...suggestedParams, flatFee: true, fee: 2000 }; // 0.002 Algo
      const threeMicroAlgo = { ...suggestedParams, flatFee: true, fee: 3000 }; // 0.003 Algo
      const fourMicroAlgo = { ...suggestedParams, flatFee: true, fee: 4000 }; // 0.004 Algo
      const fiveMicroAlgo = { ...suggestedParams, flatFee: true, fee: 5000 }; // 0.005 Algo

      // Get the wallet connector
      const walletConnector = this.#walletConnectors[this.#selectedWalletType];

      // Get the listing box reference
      const boxRef = this.#getListingBoxReference(
        this.#contractApplicationId,
        assetId
      );

      const receiverOptInToNFTTxn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.account,
          amount: 0,
          assetIndex: assetId,
          suggestedParams,
        });

      const transferNFTToSellerAndRemoveListingMethod = encoder.methods.find(
        (m) => m.name === "transferNFTToSellerAndRemoveListing"
      );
      const transferNFTToSellerAndRemoveListingTxn =
        algosdk.makeApplicationCallTxnFromObject({
          sender: this.account,
          appIndex: this.#contractApplicationId,
          onComplete: algosdk.OnApplicationComplete.NoOpOC,
          appArgs: [
            transferNFTToSellerAndRemoveListingMethod.getSelector(),
            algosdk.ABIType.from("uint64").encode(BigInt(assetId)),
            // for preventing false asset transfer to unauthorised seller
            algosdk.ABIType.from("string").encode(this.account),
            // for preventing un-listing from other marketplace [false revenue prevention]
            algosdk.ABIType.from("string").encode(this.#unitName),
          ],
          boxes: [boxRef],
          foreignAssets: [assetId],
          suggestedParams: threeMicroAlgo,
        });

      // asset transfer is done inside contract
      const unlistingGroup = [
        receiverOptInToNFTTxn,
        transferNFTToSellerAndRemoveListingTxn,
      ];

      // if unlisting fee is greater than 0, add revenue transaction to the unlisting group
      if (this.#unListingFee > 0) {
        const revenueTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.#revenueWalletAddress,
          amount: this.#algosToMicroAlgos(this.#unListingFee),
          suggestedParams,
        });
        unlistingGroup.push(revenueTxn);
      }

      algosdk.assignGroupID(unlistingGroup);

      const signedUnlisting = await walletConnector.signTransaction([
        unlistingGroup.map((txn) => ({ txn, signers: [this.account] })),
      ]);
      const { txid: unlistingTxId } = await this.#algodClient
        .sendRawTransaction(signedUnlisting)
        .do();

      await algosdk.waitForConfirmation(this.#algodClient, unlistingTxId, 10);

      this.processing = false;
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      const newNftData = await this.getNFTMetadata({ assetId });

      // Emit event for successful purchase
      eventBus.emit("nft:buy:success", {
        nft: newNftData,
        transactionId: unlistingTxId,
      });

      return {
        nft: newNftData,
        transactionId: unlistingTxId,
      };
    } catch (error) {
      console.error("Error un-listing NFT:", error.message);
      this.processing = false;
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("nft:unlist:failed", { error: "Could not unlist NFT!" });
      throw error;
    }
  }

  async buyNFT({ assetId }) {
    try {
      this.processing = true;
      this.#showLoadingOverlay("Processing...");
      eventBus.emit("sdk:processing:started", { processing: this.processing });

      if (!this.#walletConnected || !this.account) {
        // Maximize SDK if minimized to show login screen
        if (this.isMinimized) {
          this.maximizeSDK(true);
        }
        throw new Error("Wallet is not connected.");
      }

      if (!assetId) {
        throw new Error("Asset ID is required.");
      }

      if (isNaN(assetId)) {
        throw new Error("Asset ID must be a number.");
      }

      // Get the listing box reference
      const nftData = await this.getNFTMetadata({ assetId });

      if (nftData.listing.seller === this.account) {
        throw new Error("Seller cannot buy the listed nft.");
      }

      if (nftData.listing.marketplace !== this.#unitName) {
        throw new Error("Cannot buy nft from other marketplace.");
      }

      // Get suggested parameters
      const suggestedParams = await this.#algodClient
        .getTransactionParams()
        .do();

      const oneMicroAlgo = { ...suggestedParams, flatFee: true, fee: 1000 }; // 0.001 Algo
      const twoMicroAlgo = { ...suggestedParams, flatFee: true, fee: 2000 }; // 0.002 Algo
      const threeMicroAlgo = { ...suggestedParams, flatFee: true, fee: 3000 }; // 0.003 Algo
      const fourMicroAlgo = { ...suggestedParams, flatFee: true, fee: 4000 }; // 0.004 Algo
      const fiveMicroAlgo = { ...suggestedParams, flatFee: true, fee: 5000 }; // 0.005 Algo

      // Get the wallet connector
      const walletConnector = this.#walletConnectors[this.#selectedWalletType];

      // Get the listing box reference
      const boxRef = this.#getListingBoxReference(
        this.#contractApplicationId,
        assetId
      );

      const receiverOptInToNFTTxn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.account,
          amount: 0,
          assetIndex: assetId,
          suggestedParams,
        });

      const transferNFTToReceiverAndRemoveListingMethod = encoder.methods.find(
        (m) => m.name === "transferNFTToReceiverAndRemoveListing"
      );
      const transferNFTToReceiverAndRemoveListingTxn =
        algosdk.makeApplicationCallTxnFromObject({
          sender: this.account,
          appIndex: this.#contractApplicationId,
          onComplete: algosdk.OnApplicationComplete.NoOpOC,
          appArgs: [
            transferNFTToReceiverAndRemoveListingMethod.getSelector(),
            algosdk.ABIType.from("uint64").encode(BigInt(assetId)),
            // for preventing false payment to unauthorised seller [false revenue prevention]
            algosdk.ABIType.from("string").encode(nftData.listing.seller),
            // for preventing buying from other marketplace [false revenue prevention]
            algosdk.ABIType.from("string").encode(this.#unitName),
          ],
          boxes: [boxRef],
          foreignAssets: [assetId],
          suggestedParams: threeMicroAlgo,
        });

      // tempering the following transaction will still be failed (asset wont be transferred)
      const transferNFTPriceToSellerTxn =
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: nftData.listing.seller,
          amount: this.#algosToMicroAlgos(nftData.listing.price),
          suggestedParams,
        });

      // asset transfer is done inside contract
      const buyingGroup = [
        receiverOptInToNFTTxn,
        transferNFTToReceiverAndRemoveListingTxn,
        transferNFTPriceToSellerTxn,
      ];

      // if buying fee is greater than 0, add revenue transaction to the buying group
      if (this.#buyingFee > 0) {
        const revenueTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.#revenueWalletAddress,
          amount: this.#algosToMicroAlgos(this.#buyingFee),
          suggestedParams,
        });
        buyingGroup.push(revenueTxn);
      }

      algosdk.assignGroupID(buyingGroup);

      const signedBuying = await walletConnector.signTransaction([
        buyingGroup.map((txn) => ({ txn, signers: [this.account] })),
      ]);
      const { txid: buyingTxId } = await this.#algodClient
        .sendRawTransaction(signedBuying)
        .do();

      await algosdk.waitForConfirmation(this.#algodClient, buyingTxId, 10);

      this.processing = false;
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });

      const newNftData = await this.getNFTMetadata({ assetId });

      // Emit event for successful purchase
      eventBus.emit("nft:buy:success", {
        nft: newNftData,
        transactionId: buyingTxId,
      });

      return {
        nft: newNftData,
        transactionId: buyingTxId,
      };
    } catch (error) {
      console.error("Error buying NFT:", error.message);
      this.processing = false;
      this.#hideLoadingOverlay();
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("nft:buy:failed", { error: "Could not buy NFT!" });
      throw error;
    }
  }
}

export default AlgoMintX;
