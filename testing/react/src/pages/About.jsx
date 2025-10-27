import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Collections as CollectionsIcon,
  ShoppingCart as ShoppingCartIcon,
  MonetizationOn as MonetizationOnIcon,
  Code as CodeIcon,
} from '@mui/icons-material';

function About() {
  return (
    <>
      <h2 className="page-title">About QuickMint</h2>
      <div className="about-content">
        <h3>Welcome to QuickMint Demo</h3>
        <p>
          AlgoMintX is a powerful NFT marketplace SDK built on the Algorand
          blockchain. This demo showcases the full potential of our SDK,
          demonstrating how easily you can integrate a complete NFT
          marketplace into your application.
        </p>

        <h3>Core Features</h3>
        <ul>
          <li>Seamless wallet integration with Pera Wallet and Defly Wallet</li>
          <li>Mint NFTs with IPFS metadata storage (via Pinata)</li>
          <li>Support for multiple media formats (Images, Videos, Audio)</li>
          <li>List and buy NFTs with custom pricing</li>
          <li>Track NFT ownership and transfers</li>
          <li>Configurable fees for listing, buying, and unlisting</li>
          <li>Minimizable UI with floating button</li>
          <li>Customizable toast notifications</li>
          <li>Real-time event system for frontend integration</li>
          <li>Support for both Testnet and Mainnet</li>
        </ul>

        <h3>Getting Started</h3>
        <p>To experience the full functionality of AlgoMintX:</p>
        <ol>
          <li>Connect your wallet using the SDK interface</li>
          <li>Browse the marketplace to view listed NFTs</li>
          <li>Create your own NFTs using the minting interface</li>
          <li>List your NFTs for sale with custom pricing</li>
          <li>Buy NFTs from other creators</li>
          <li>Manage your NFT collection in your profile</li>
        </ol>

        <h3>Technical Integration</h3>
        <p>
          The AlgoMintX SDK is designed for easy integration into any web
          application. With just a few lines of code, you can add a complete
          NFT marketplace to your platform:
        </p>
        <pre>
          <code>{`window.algoMintXClient = new window.AlgoMintX({
  pinata_ipfs_server_key: "YOUR_PINATA_KEY",
  pinata_ipfs_gateway_url: "YOUR_PINATA_GATEWAY",
  env: "testnet",
  namespace: "YOUR_NAMESPACE",
  revenueWalletAddress: "YOUR_WALLET",
  // Optional configurations
  listingFee: 0.1,
  buyingFee: 0.5,
  unListingFee: 0.1,
  disableToast: false,
  toastLocation: "TOP_RIGHT",
  minimizeUILocation: "right",
  logo: "./logo.png",
  supportedMediaFormats: ["IMAGE", "VIDEO", "AUDIO"]
});`}</code>
        </pre>

        <p>
          This demo showcases just a fraction of what's possible with
          AlgoMintX. The SDK is continuously evolving with new features and
          improvements to provide the best NFT marketplace experience on
          Algorand.
        </p>
      </div>
    </>
  );
}

export default About; 