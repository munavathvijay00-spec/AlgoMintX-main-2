# AlgoMintX SDK

- **Launch a beautiful, full-featured NFT marketplace on Algorand in minutes.**
- Plug-and-play JavaScript SDK: just drop it in, connect wallets, mint, list, unlist, buy, and earn revenue—no backend required.

## ✨ Features

- 🔐 **Wallet integration** (Pera Wallet & Defly Wallet)
- 🎨 **NFT minting** via IPFS (Pinata)
- 📦 **Listing NFTs** for sale
- 🗑️ **Unlisting NFTs** from the marketplace
- 🛒 **Buying NFTs** from the marketplace
- 💰 **Revenue mechanism** for marketplace owners
- 💸 **Customizable marketplace fees** (minting, listing, buying, unlisting)
- 🛡️ **Robust input validation** for all user and config parameters
- 📁 **IPFS metadata storage** and retrieval
- 🧭 **Minimal, user-friendly UI** with SDK minimization support
- ⚡ **Real-time event emitter** for frontend event handling
- ✅ Works on **Testnet** and **Mainnet**
- 🎥 **Multi-media support** for NFTs (Images, Videos, Audio)
- 🔔 **Customizable toast notifications**
- 🎨 **Customizable UI** with logo support
- 🌗 **Light/Dark theme support**
- 📱 **Mobile-friendly, responsive UI**
- 🆓 **No backend required**—all logic runs in the browser
- ⏳ **UI feedbacks with loaders and toast messages**
- 👐 **Open source & actively maintained**

---

## 🚀 Quick Start (For SDK Users)

### 1. Import the SDK in your HTML

Add the following `<script>` tag to your HTML `<head>` (see demo HTML for reference):

```html
<!-- Import AlgoMintX SDK -->
<script
  defer
  src="https://cdn.jsdelivr.net/gh/IBHAGYESH/AlgoMintX@v1.1.0/dist/algomintx.js"
></script>
```

### 2. Initialize the SDK in your frontend

Add this to your main JS file or a `<script>` tag after the SDK import:

```js
window.algoMintXClient = new window.AlgoMintX({
  pinata_ipfs_server_key: "<YOUR_PINATA_API_KEY>",
  pinata_ipfs_gateway_url: "YOUR_PINATA_GATEWAY.mypinata.cloud",
  env: "testnet", // "testnet" or "mainnet"
  namespace: "ABCDE", // Unique 5-character uppercase string
  revenueWalletAddress: "<YOUR_ALGORAND_WALLET_ADDRESS>",
  // Optional:
  mintFee: 0.1, // in Algos
  listingFee: 0.1, // in Algos
  buyingFee: 0.5, // in Algos
  unListingFee: 0.1, // in Algos
  disableToast: false,
  toastLocation: "TOP_RIGHT", // "TOP_LEFT" or "TOP_RIGHT"
  minimizeUILocation: "right", // "left" or "right"
  logo: "./logo.png", // URL or path to your logo
  supportedMediaFormats: ["IMAGE", "VIDEO", "AUDIO"],
});
```

### 3. See the SDK UI

After initialization, the AlgoMintX UI will automatically appear on your frontend. Users can connect their wallet, mint, list, buy, and manage NFTs with no further setup.

---

## 🧪 How to Run the Demos

### HTML/CSS/JS Demo

- **Location:** `testing/html-css-js/`
- **Config file:** `testing/html-css-js/index.js`

#### Run with Live Deployed SDK (Recommended for most users)

1. Configure the SDK in `index.js` as shown above.
2. Start a local server:
   ```bash
   npx http-server .
   ```
3. Open the demo in your browser:
   ```
   http://127.0.0.1:8080/testing/html-css-js/index.html
   ```

#### Run with Local Development Build of SDK (For SDK Developers)

1. Configure the SDK in `index.js` as above.
2. Install dependencies and build the SDK:
   ```bash
   npm install
   npm run build
   ```
3. Change the `<script src=...>` in your HTML files to point to your local build (e.g., `../../dist/algomintx.js`).
4. Start a local server:
   ```bash
   npx http-server .
   ```
5. Open the demo:
   ```
   http://127.0.0.1:8080/testing/html-css-js/index.html
   ```

### React Demo

- **Location:** `testing/react/`
- **Config file:** `testing/react/src/hooks/useSDK.js`

1. Configure the SDK in `hooks/useSDK.js` as shown above.
2. In the terminal:
   ```bash
   cd testing/react
   npm install
   npm run build
   npm run preview
   ```
3. Open the demo:
   ```
   http://localhost:4173
   ```

---

## 📦 SDK API

### NFT Type Schema

The SDK returns NFT objects with the following structure:

```ts
type NFT = {
  assetId: number; // Algorand asset ID
  name: string; // NFT name
  unitName?: string; // Asset unit name (e.g., AMXDEMO)
  creator?: string; // Wallet address of the creator
  url?: string; // IPFS metadata URL (ipfs://...)
  clawback?: string; // Clawback address (should be contract address)
  decimals: number; // Always 0 for NFTs
  total: number; // Always 1 for NFTs
  metadata?: {
    name: string; // NFT name (from metadata)
    description: string; // NFT description
    image: string; // IPFS gateway URL to image/media
    image_integrity: string; // SHA-256 hash of the image/media
    image_mimetype: string; // MIME type (e.g., image/png, video/mp4)
    decimals: number; // Always 0
    standard: string; // e.g., "arc3"
    minted_by: string; // SDK identifier
    marketplace: string; // Marketplace namespace
  };
  currentHolder?: string; // Wallet address of current holder
  listing?: {
    seller: string; // Wallet address of seller
    price: number; // Price in ALGOs
    marketplace: string; // Marketplace namespace
  };
  transactionId?: string; // Asset creation or last relevant transaction ID
};
```

🔧 **Exposed Variables**
| Variable | Type | Description |
| ------------- | --------- | -------------------------------------------------------- |
| `account` | string | Wallet address of the currently connected user |
| `events` | object | Event emitter for subscribing to SDK lifecycle events |
| `isMinimized` | boolean | If the SDK UI is currently minimized |
| `network` | string | Current configured network (`"testnet"` or `"mainnet"`) |
| `processing` | boolean | If an operation (e.g., minting, buying, etc.) is ongoing |
| `theme` | string | Current theme of the SDK UI (`"light"` or `"dark"`) |

🧠 **Exposed Methods**
| Method & Signature | Description |
| ------------------ | ----------- |
| `listNFT({ assetId: number, nftPrice: number })` | List an existing NFT to the marketplace |
| `unlistNFT({ assetId: number })` | Remove an NFT from the marketplace listing |
| `buyNFT({ assetId: number })` | Buy a listed NFT from the marketplace |
| `getListedNFTs(): Promise<Array<NFT>>` | Fetch all NFTs currently listed for sale |
| `getWalletNFTs({ accountId?: string }): Promise<Array<NFT>>` | Retrieve NFTs owned by the specified account or connected wallet. Pass `{}` to get NFTs of connected wallet. |
| `getNFTMetadata({ assetId: number }): Promise<NFT>` | Fetch metadata of a specific NFT using its asset ID |
| `minimizeSDK(): void` | Minimize the SDK UI to a floating button |
| `maximizeSDK(): void` | Restore the SDK UI to its full size |

---

## 📡 SDK Events

The SDK emits various events during wallet operations, UI transitions, and NFT transactions. You can use these events in your frontend to update the UI, show loaders, display messages, etc.

✅ Example Usage

```js
window.algoMintXClient.events.on(
  "wallet:connection:connected",
  ({ address }) => {
    console.log("Wallet connected:", address);
  }
);
```

| Event Name                       | Description                                         | Emitted Data (Type)                   |
| -------------------------------- | --------------------------------------------------- | ------------------------------------- |
| `wallet:connection:connected`    | Fired when wallet is successfully connected         | `{ address: string }`                 |
| `wallet:connection:disconnected` | Fired when wallet is disconnected                   | `{ address: string }`                 |
| `wallet:connection:failed`       | Fired when wallet connection fails                  | `{ error: string }`                   |
| `window:size:minimized`          | Fired when the SDK UI is minimized or restored      | `{ minimized: boolean }`              |
| `sdk:processing:started`         | Fired when a process (minting, buying, etc.) starts | `{ processing: boolean }`             |
| `sdk:processing:stopped`         | Fired when the process ends                         | `{ processing: boolean }`             |
| `nft:mint:success`               | Fired after successful NFT minting                  | `{ transactionId: string, nft: NFT }` |
| `nft:mint:failed`                | Fired if minting fails                              | `{ error: string }`                   |
| `nft:list:success`               | Fired after NFT is successfully listed              | `{ transactionId: string, nft: NFT }` |
| `nft:list:failed`                | Fired if listing fails                              | `{ error: string }`                   |
| `nft:unlist:success`             | Fired after NFT is successfully unlisted            | `{ transactionId: string, nft: NFT }` |
| `nft:unlist:failed`              | Fired if unlisting fails                            | `{ error: string }`                   |
| `nft:buy:success`                | Fired after successful NFT purchase                 | `{ transactionId: string, nft: NFT }` |
| `nft:buy:failed`                 | Fired if buying fails                               | `{ error: string }`                   |

---

## 🤝 Contributing

Pull requests and feature suggestions are welcome! For major changes, please open an issue first to discuss your idea.

## 🙏 Appreciation

Thank you for checking out AlgoMintX! This project was crafted with care to simplify NFT marketplace development on Algorand and help developers ship faster.

If you found this useful, feel free to ⭐️ star the repo and share it with others in the community.

## 👨‍💻 About the Author

Built and maintained by Bhagyesh Jahangirpuria.

- 🌐 Website: http://ibhagyesh.site
- 🔗 LinkedIn: https://in.linkedin.com/in/bhagyesh-jahangirpuria

Feel free to connect for collaborations, feedback, or consulting!
