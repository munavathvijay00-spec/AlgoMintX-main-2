import { useEffect } from "react";
import { useSDK } from "./useSDK";

export const useSDKEvents = (refreshFunctions) => {
  const { algoMintXClient } = useSDK();

  useEffect(() => {
    if (!algoMintXClient) return;

    const handleWalletConnect = () => {
      if (refreshFunctions.onWalletConnect) {
        refreshFunctions.onWalletConnect();
      }
    };

    const handleWalletDisconnect = () => {
      if (refreshFunctions.onWalletDisconnect) {
        refreshFunctions.onWalletDisconnect();
      }
    };

    const handleNFTMint = () => {
      if (refreshFunctions.onNFTMint) {
        refreshFunctions.onNFTMint();
      }
    };

    const handleNFTList = () => {
      if (refreshFunctions.onNFTList) {
        refreshFunctions.onNFTList();
      }
    };

    const handleNFTUnlist = () => {
      if (refreshFunctions.onNFTUnlist) {
        refreshFunctions.onNFTUnlist();
      }
    };

    const handleNFTBuy = () => {
      if (refreshFunctions.onNFTBuy) {
        refreshFunctions.onNFTBuy();
      }
    };

    // Subscribe to events
    algoMintXClient.events.on(
      "wallet:connection:connected",
      handleWalletConnect
    );
    algoMintXClient.events.on(
      "wallet:connection:disconnected",
      handleWalletDisconnect
    );
    algoMintXClient.events.on("nft:mint:success", handleNFTMint);
    algoMintXClient.events.on("nft:list:success", handleNFTList);
    algoMintXClient.events.on("nft:unlist:success", handleNFTUnlist);
    algoMintXClient.events.on("nft:buy:success", handleNFTBuy);

    // Cleanup subscriptions
    return () => {
      algoMintXClient.events.off(
        "wallet:connection:connected",
        handleWalletConnect
      );
      algoMintXClient.events.off(
        "wallet:connection:disconnected",
        handleWalletDisconnect
      );
      algoMintXClient.events.off("nft:mint:success", handleNFTMint);
      algoMintXClient.events.off("nft:list:success", handleNFTList);
      algoMintXClient.events.off("nft:unlist:success", handleNFTUnlist);
      algoMintXClient.events.off("nft:buy:success", handleNFTBuy);
    };
  }, [algoMintXClient, refreshFunctions]);
};
