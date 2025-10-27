import { useState, useEffect, useCallback } from "react";

// Create a singleton instance outside the hook
let sdkInstance = null;

export function useSDK() {
  const [algoMintXClient, setAlgoMintXClient] = useState(null);

  const initializeSDK = useCallback(() => {
    if (window.AlgoMintX && !sdkInstance) {
      try {
        // Initialize SDK with required parameters
        sdkInstance = new window.AlgoMintX({
          // Required
          pinata_ipfs_server_key: "", // your pinata api key
          pinata_ipfs_gateway_url: "xxx.mypinata.cloud", // your pinata gateway url
          env: "testnet", // testnet | mainnet
          namespace: "", // unique 5 letter string
          revenueWalletAddress: "", // where fees go
          // Optional
          mintFee: 0.1, // in Algos
          listingFee: 0.1, // in Algos
          unListingFee: 0.1, // in Algos
          buyingFee: 0.5, // in Algos
          disableToast: false, // disable toast notifications
          toastLocation: "TOP_RIGHT", // TOP_LEFT | TOP_RIGHT
          minimizeUILocation: "right", // left | right
          logo: "./logo.png", // your website logo (URL / path to image)
          supportedMediaFormats: ["IMAGE", "VIDEO", "AUDIO"], // ["IMAGE", "VIDEO", "AUDIO"]
        });

        setAlgoMintXClient(sdkInstance);
      } catch (error) {
        console.error("SDK initialization error:", error);
      }
    } else if (sdkInstance) {
      // If SDK is already initialized, use the existing instance
      setAlgoMintXClient(sdkInstance);
    }
  }, []);

  useEffect(() => {
    let intervalId;

    const checkAndInitializeSDK = () => {
      if (window.AlgoMintX) {
        initializeSDK();
        clearInterval(intervalId);
      }
    };

    // Start checking every 100ms
    intervalId = setInterval(checkAndInitializeSDK, 100);

    // Cleanup interval on component unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [initializeSDK]);

  return { algoMintXClient };
}
