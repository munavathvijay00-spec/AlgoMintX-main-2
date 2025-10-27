import { useState, useEffect, useCallback } from "react";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import { toast } from "react-toastify";
import NFTCard from "../components/NFTCard";

function Home() {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { algoMintXClient } = useSDK();

  const fetchNFTs = useCallback(async () => {
    if (!algoMintXClient) return;

    try {
      setLoading(true);
      const data = await algoMintXClient.getListedNFTs();
      setNfts(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching NFTs:", err);
      setError("Failed to load NFTs. Please try again later.");
      toast.error("Failed to load NFTs");
    } finally {
      setLoading(false);
    }
  }, [algoMintXClient]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  useSDKEvents({
    onWalletConnect: fetchNFTs,
    onWalletDisconnect: fetchNFTs,
    onNFTBuy: fetchNFTs,
    onNFTUnlist: fetchNFTs,
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading NFTs...</p>
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

  if (!nfts || nfts.length === 0) {
    return (
      <div className="no-nfts-container">
        <p className="no-nfts-text">No NFTs found</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="page-title">Featured NFTs</h2>
      <div className="nft-grid">
        {nfts.map((nft) => (
          <NFTCard key={nft.assetId} nft={nft} />
        ))}
      </div>
    </>
  );
}

export default Home;
