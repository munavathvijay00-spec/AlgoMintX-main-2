import { useState, useEffect, useCallback } from "react";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import { toast } from "react-toastify";
import NFTCard from "../components/NFTCard";
import { useSearchParams } from "react-router-dom";

function Profile() {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { algoMintXClient } = useSDK();
  const [searchParams] = useSearchParams();
  const walletAddressParam = searchParams.get("wallet");

  const fetchNFTs = useCallback(async () => {
    if (!algoMintXClient) return;

    try {
      setLoading(true);
      setError(null);

      // If viewing another wallet's NFTs
      if (walletAddressParam) {
        const data = await algoMintXClient.getWalletNFTs({
          accountId: walletAddressParam,
        });
        setNfts(data);
      }
      // If viewing own NFTs
      else if (algoMintXClient?.account) {
        const data = await algoMintXClient.getWalletNFTs({});
        setNfts(data);
      }
    } catch (err) {
      console.error("Error fetching NFTs:", err);
      setError("Failed to load NFTs. Please try again later.");
      toast.error("Failed to load NFTs");
    } finally {
      setLoading(false);
    }
  }, [algoMintXClient, algoMintXClient?.account, walletAddressParam]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  useSDKEvents({
    onWalletConnect: fetchNFTs,
    onWalletDisconnect: fetchNFTs,
    onNFTMint: fetchNFTs,
    onNFTList: fetchNFTs,
  });

  const handleConnectWallet = () => {
    algoMintXClient.maximizeSDK();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">
          {walletAddressParam ? "Loading NFTs..." : "Loading Your NFTs..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  // Only show login message if viewing own NFTs and wallet is not connected
  if (!walletAddressParam && !algoMintXClient?.account) {
    return (
      <div className="login-message">
        <h3>Connect Your Wallet</h3>
        <p>Please connect your wallet to view your NFTs</p>
        <button className="btn btn-primary" onClick={handleConnectWallet}>
          Connect Wallet
        </button>
      </div>
    );
  }

  if (!nfts || nfts.length === 0) {
    return (
      <div className="no-nfts-container">
        <p className="no-nfts-text">
          {walletAddressParam
            ? "This wallet has no NFTs"
            : "You don't have any NFTs yet"}
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="page-title">
        {walletAddressParam ? "Wallet NFTs" : "Your NFTs"}
      </h2>
      <div className="nft-grid">
        {nfts.map((nft) => (
          <NFTCard key={nft.assetId} nft={nft} />
        ))}
      </div>
    </>
  );
}

export default Profile;
