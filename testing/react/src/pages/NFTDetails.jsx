import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import { toast } from "react-toastify";
import ListNFTModal from "../components/ListNFTModal";

function NFTDetails() {
  const { assetId } = useParams();
  const [nftData, setNftData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showListModal, setShowListModal] = useState(false);
  const { algoMintXClient } = useSDK();

  const fetchNFTDetails = useCallback(async () => {
    if (!algoMintXClient || !assetId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await algoMintXClient.getNFTMetadata({
        assetId: Number(assetId),
      });
      setNftData(data);
    } catch (err) {
      console.error("Error fetching NFT details:", err);
      setError(err.message || "Failed to load NFT details");
      toast.error("Failed to load NFT details");
    } finally {
      setLoading(false);
    }
  }, [algoMintXClient, assetId]);

  useEffect(() => {
    fetchNFTDetails();
  }, [fetchNFTDetails]);

  useSDKEvents({
    onWalletConnect: fetchNFTDetails,
    onWalletDisconnect: fetchNFTDetails,
    onNFTList: fetchNFTDetails,
    onNFTUnlist: fetchNFTDetails,
    onNFTBuy: fetchNFTDetails,
  });

  const handleAction = async (action) => {
    try {
      switch (action) {
        case "buy":
          await algoMintXClient.buyNFT({ assetId: Number(assetId) });
          toast.success("NFT purchased successfully!");
          break;
        case "unlist":
          await algoMintXClient.unlistNFT({ assetId: Number(assetId) });
          toast.success("NFT unlisted successfully!");
          break;
        case "list":
          setShowListModal(true);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error("Error performing NFT action:", err);
      toast.error(err.message || "Failed to perform action");
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading NFT details...</p>
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

  if (!nftData) {
    return (
      <div className="error-container">
        <p className="error-text">NFT not found</p>
      </div>
    );
  }

  const walletConnected = algoMintXClient.account !== null;
  const isOwner = nftData.currentHolder === algoMintXClient.account;
  const isSeller = nftData.listing?.seller === algoMintXClient.account;

  // Determine the media type based on image_mimetype
  const renderMedia = () => {
    const isVideo = nftData.metadata.image_mimetype?.startsWith("video/");
    const isAudio = nftData.metadata.image_mimetype?.startsWith("audio/");

    if (isVideo) {
      return (
        <div className="nft-details-media-container">
          <video
            className="nft-details-media"
            controls
            autoPlay
            loop
            src={nftData.metadata.image}
            type={nftData.metadata.image_mimetype}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    } else if (isAudio) {
      return (
        <div className="nft-details-media-container">
          <div className="audio-player">
            <img
              src="https://img.icons8.com/ios-filled/50/ffffff/musical-notes.png"
              alt="Audio"
              className="audio-icon"
            />
            <audio
              className="nft-details-media"
              controls
              autoPlay
              src={nftData.metadata.image}
              type={nftData.metadata.image_mimetype}
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        </div>
      );
    } else {
      return (
        <div className="nft-details-media-container">
          <img
            src={nftData.metadata.image}
            alt={nftData.metadata.name}
            className="nft-details-media"
          />
        </div>
      );
    }
  };

  return (
    <div className="container">
      <h2 className="page-title">NFT Details</h2>
      <div className="nft-details">
        {renderMedia()}
        <div className="nft-info">
          <h3>{nftData.metadata.name}</h3>
          <p className="nft-description">{nftData.metadata.description}</p>
          <div className="nft-meta">
            <p className="nft-wallet">
              <strong>Owner:</strong> {nftData.currentHolder}
            </p>
            {nftData.listing && (
              <p className="price">
                <strong>Price:</strong> {nftData.listing.price} Algo
              </p>
            )}
            <p className="nft-wallet">
              <strong>Asset ID:</strong> {assetId}
            </p>
            <p className="nft-wallet">
              <strong>Transaction:</strong> {nftData.transactionId}
            </p>
            <p className="nft-wallet">
              <strong>Creator:</strong> {nftData.creator}
            </p>
            {nftData.listing && (
              <p className="nft-wallet">
                <strong>Listed by:</strong> {nftData.listing.seller}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="nft-actions">
        {nftData.listing ? (
          // NFT is listed
          !walletConnected ? (
            <button
              className="action-button buy-button"
              onClick={() => handleAction("buy")}
            >
              Buy NFT for {nftData.listing.price} Algo
            </button>
          ) : isSeller ? (
            <button
              className="action-button unlist-button"
              onClick={() => handleAction("unlist")}
            >
              Unlist NFT
            </button>
          ) : (
            <button
              className="action-button buy-button"
              onClick={() => handleAction("buy")}
            >
              Buy NFT for {nftData.listing.price} Algo
            </button>
          )
        ) : (
          // NFT is not listed
          isOwner && (
            <button
              className="action-button list-button"
              onClick={() => handleAction("list")}
            >
              List NFT
            </button>
          )
        )}
      </div>
      {showListModal && (
        <ListNFTModal
          assetId={Number(assetId)}
          onClose={() => setShowListModal(false)}
        />
      )}
    </div>
  );
}

export default NFTDetails;
