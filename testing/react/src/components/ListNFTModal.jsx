import { useState } from "react";
import { useSDK } from "../hooks/useSDK";

function ListNFTModal({ assetId, onClose }) {
  const [price, setPrice] = useState("");
  const { algoMintXClient } = useSDK();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      onClose();
      await algoMintXClient.listNFT({
        assetId: assetId,
        nftPrice: parseInt(price),
      });
    } catch (error) {
      console.error("Error listing NFT:", error);
      alert("Failed to list NFT: " + error.message);
    }
  };

  return (
    <div className="modal" style={{ display: "block" }}>
      <div className="modal-content">
        <span className="close" onClick={onClose}>
          &times;
        </span>
        <h3>List NFT for Sale</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="price">Price (Algos)</label>
            <input
              type="number"
              id="price"
              className="form-control"
              required
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            List NFT
          </button>
        </form>
      </div>
    </div>
  );
}

export default ListNFTModal;
