/**
 * Initialize AlgoMintX
 */
window.algoMintXClient = new window.AlgoMintX({
  // Required
  pinata_ipfs_server_key: "3d894017670967e321cc", // your pinata api key
  pinata_ipfs_gateway_url: "brown-near-hawk-820.mypinata.cloud", // your pinata gateway url
  env: "testnet", // testnet | mainnet
  namespace: "GCETA", // unique 5 letter string
  revenueWalletAddress: "GQJ7W6AYEFO3YCUAOX45DDYILNXIQFJ25GFANTTTIYQAVH4HC3WAG5GC4I", // where fees go
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

/**
 * sdk events
 */

algoMintXClient.events.on(
  "wallet:connection:connected",
  async ({ address }) => {
    console.log("Wallet connected:", address);
    updateProfileSection(address);
  }
);

algoMintXClient.events.on(
  "wallet:connection:disconnected",
  async ({ address }) => {
    console.log("wallet:connection:disconnected:", address);
    updateProfileSection(null);
  }
);

algoMintXClient.events.on("wallet:connection:failed", async ({ error }) => {
  console.log("wallet:connection:failed:", error);
});

algoMintXClient.events.on("window:size:minimized", async ({ minimized }) => {
  console.log("SDK window minimized:", minimized);
});

algoMintXClient.events.on("sdk:processing:started", async ({ processing }) => {
  console.log("SDK processing:", processing);
});

algoMintXClient.events.on("sdk:processing:stopped", async ({ processing }) => {
  console.log("SDK processing:", processing);
});

algoMintXClient.events.on(
  "nft:mint:success",
  async ({ transactionId, nft }) => {
    console.log("nft:mint:success:", transactionId, nft);
  }
);

algoMintXClient.events.on("nft:mint:failed", async ({ error }) => {
  console.log("nft:mint:failed:", error);
});

algoMintXClient.events.on(
  "nft:list:success",
  async ({ transactionId, nft }) => {
    console.log("nft:list:success:", transactionId, nft);
  }
);

algoMintXClient.events.on("nft:list:failed", async ({ error }) => {
  console.log("nft:list:failed:", error);
});

algoMintXClient.events.on(
  "nft:unlist:success",
  async ({ transactionId, nft }) => {
    console.log("nft:unlist:success:", transactionId, nft);
  }
);

algoMintXClient.events.on("nft:unlist:failed", async ({ error }) => {
  console.log("nft:unlist:failed:", error);
});

algoMintXClient.events.on("nft:buy:success", async ({ transactionId, nft }) => {
  console.log("nft:buy:success:", transactionId, nft);
});

algoMintXClient.events.on("nft:buy:failed", async ({ error }) => {
  console.log("nft:buy:failed:", error);
});

/**
 * ui code
 */

// Function to render NFT cards
window.renderNFTCards = function (nfts, isViewingOtherWallet = false) {
  const nftGrid = document.getElementById("nft-grid");
  nftGrid.innerHTML = "";

  if (!nfts || nfts.length === 0) {
    nftGrid.innerHTML = '<p class="no-nfts">No NFTs found</p>';
    return;
  }

  // Function to truncate text
  const truncateText = (text, maxLength) => {
    if (!text) return "";
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };

  nfts.forEach((nft) => {
    const card = document.createElement("div");
    card.className = "nft-card";

    let buttonHtml = "";
    if (isViewingOtherWallet) {
      // When viewing another wallet's NFTs
      if (nft.listing) {
        // Show buy button for listed NFTs
        buttonHtml = `<button class="btn btn-primary buy-nft-btn" onclick="window.algoMintXClient.buyNFT({ assetId: ${nft.assetId} })">Buy Now</button>`;
      } else if (nft.currentHolder === window.algoMintXClient.account) {
        // If the NFT belongs to the connected wallet, show list button
        buttonHtml = `<button class="btn btn-secondary list-nft-btn" onclick="openListNFTModal(${nft.assetId})">List NFT</button>`;
      }
    } else {
      // When viewing own NFTs, show all buttons
      if (nft.listing) {
        if (nft.listing.seller === window.algoMintXClient.account) {
          // Show unlist button if seller is the current user
          buttonHtml = `<button class="btn btn-warning unlist-nft-btn" onclick="window.algoMintXClient.unlistNFT({ assetId: ${nft.assetId} })">Unlist NFT</button>`;
        } else {
          // Show buy button if seller is not the current user
          buttonHtml = `<button class="btn btn-primary buy-nft-btn" onclick="window.algoMintXClient.buyNFT({ assetId: ${nft.assetId} })">Buy Now</button>`;
        }
      } else {
        buttonHtml = `<button class="btn btn-secondary list-nft-btn" onclick="openListNFTModal(${nft.assetId})">List NFT</button>`;
      }
    }

    // Format wallet address to show first 6 and last 4 characters
    const formatWalletAddress = (address) => {
      if (!address) return "Unknown";
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Get the appropriate wallet address based on listing status
    const walletAddress = nft.listing ? nft.listing.seller : nft.currentHolder;
    const walletLabel = nft.listing ? "Seller" : "Owner";

    // Check if the NFT is a video or audio using image_mimetype
    const isVideo = nft.metadata.image_mimetype?.startsWith("video/");
    const isAudio = nft.metadata.image_mimetype?.startsWith("audio/");

    // Create media element based on type
    let mediaElement;
    if (isVideo) {
      mediaElement = `<video class="nft-image" loop playsinline>
        <source src="${nft.metadata.image}" type="${nft.metadata.image_mimetype}">
        Your browser does not support the video tag.
      </video>`;
    } else if (isAudio) {
      mediaElement = `<div class="audio-preview">
        <img src="https://img.icons8.com/ios-filled/50/ffffff/musical-notes.png" alt="Audio" class="audio-icon">
        <audio class="nft-image" preload="metadata">
          <source src="${nft.metadata.image}" type="${nft.metadata.image_mimetype}">
          Your browser does not support the audio tag.
        </audio>
      </div>`;
    } else {
      mediaElement = `<img src="${nft.metadata.image}" alt="${nft.name}" class="nft-image">`;
    }

    card.innerHTML = `
      ${mediaElement}
      <div class="nft-content">
        <h3 class="nft-title" title="${
          nft.name || "Unnamed NFT"
        }">${truncateText(nft.name || "Unnamed NFT", 20)}</h3>
        <p class="nft-description" title="${
          nft.metadata.description || "No description available"
        }">${truncateText(
      nft.metadata.description || "No description available",
      100
    )}</p>
        ${
          nft.listing
            ? `<p class="nft-price">${nft.listing.price} ALGO</p>`
            : ""
        }
        <p class="nft-wallet">
          <strong>${walletLabel}:</strong> 
          <a href="profile.html?wallet=${walletAddress}" class="wallet-link">
            ${formatWalletAddress(walletAddress)}
          </a>
        </p>
        ${buttonHtml}
      </div>
    `;

    // Add event listeners for media autoplay on hover
    if (isVideo) {
      const video = card.querySelector("video");
      card.addEventListener("mouseenter", () => {
        video.muted = false;
        video.volume = 0.5; // Set volume to 10%
        video.play();
      });
      card.addEventListener("mouseleave", () => {
        video.pause();
        video.currentTime = 0;
        video.muted = true;
      });
    } else if (isAudio) {
      const audio = card.querySelector("audio");
      card.addEventListener("mouseenter", () => {
        audio.volume = 0.5; // Set volume to 10%
        audio.play();
      });
      card.addEventListener("mouseleave", () => {
        audio.pause();
        audio.currentTime = 0;
      });
    }

    card.addEventListener("click", (e) => {
      if (
        e.target.classList.contains("buy-nft-btn") ||
        e.target.classList.contains("list-nft-btn") ||
        e.target.classList.contains("unlist-nft-btn")
      ) {
        return;
      }
      window.location.href = `details.html?id=${nft.assetId}`;
    });

    nftGrid.appendChild(card);
  });
};

// Function to open list NFT modal
window.openListNFTModal = function (assetId) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h3>List NFT for Sale</h3>
      <form id="list-nft-form">
        <div class="form-group">
          <label for="price">Price (Algos)</label>
          <input type="number" id="price" class="form-control" required min="0" />
        </div>
        <button type="submit" class="btn btn-primary">List NFT</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = "block";

  const closeBtn = modal.querySelector(".close");
  closeBtn.onclick = function () {
    modal.remove();
  };

  window.onclick = function (event) {
    if (event.target === modal) {
      modal.remove();
    }
  };

  const form = modal.querySelector("#list-nft-form");
  form.onsubmit = async function (e) {
    e.preventDefault();
    const price = document.getElementById("price").value;

    // Remove modal before starting the listing process
    modal.remove();

    try {
      await window.algoMintXClient.listNFT({
        assetId: assetId,
        nftPrice: parseInt(price),
      });
    } catch (error) {
      console.error("Error listing NFT:", error);
      alert("Failed to list NFT: " + error.message);
    }
  };
};

// Function to render NFT details
window.renderNFTDetailsPage = async (assetId) => {
  const nft = await algoMintXClient.getNFTMetadata({ assetId });

  // Check if the NFT is a video or audio using image_mimetype
  const isVideo = nft.metadata.image_mimetype?.startsWith("video/");
  const isAudio = nft.metadata.image_mimetype?.startsWith("audio/");

  // Create media element based on type
  let mediaElement;
  if (isVideo) {
    mediaElement = `<video class="nft-details-media" controls autoplay loop>
      <source src="${nft.metadata.image}" type="${nft.metadata.image_mimetype}">
      Your browser does not support the video tag.
    </video>`;
  } else if (isAudio) {
    mediaElement = `<div class="audio-player">
      <img src="https://img.icons8.com/ios-filled/50/ffffff/musical-notes.png" alt="Audio" class="audio-icon">
      <audio class="nft-details-media" controls autoplay>
        <source src="${nft.metadata.image}" type="${nft.metadata.image_mimetype}">
        Your browser does not support the audio tag.
      </audio>
    </div>`;
  } else {
    mediaElement = `<img src="${nft.metadata.image}" alt="NFT" class="nft-details-media" />`;
  }

  const div = (document.getElementById("nft-details").innerHTML = `
    ${mediaElement}
    <p><strong>Transaction:</strong> ${nft.transactionId}</p>
    <p><strong>Creator:</strong> ${nft.creator}</p>
    <p><strong>${nft?.listing ? "Seller" : "Owner"}:</strong> ${
    nft?.listing ? nft.listing.seller : nft.currentHolder
  }</p>
    <p><strong>Name:</strong> ${nft.name}</p>
    <p><strong>Description:</strong> ${nft.metadata.description}</p>
  `);

  // Ensure media starts playing after the element is added to the DOM
  if (isVideo || isAudio) {
    const media = document.querySelector(".nft-details-media");
    media.play().catch((error) => {
      console.log("Autoplay failed:", error);
      // Some browsers require user interaction before autoplay
      // We'll keep the controls visible so users can play manually
    });
  }

  return nft;
};

// Function to format wallet address
function formatWalletAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Function to get random avatar
function getRandomAvatar() {
  const styles = [
    "adventurer",
    "avataaars",
    "bottts",
    "fun-emoji",
    "micah",
    "miniavs",
    "pixel-art",
    "personas",
  ];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const seed = Math.random().toString(36).substring(7);
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
}

// Function to update profile section
function updateProfileSection(address) {
  const profileSection = document.getElementById("profile-section");
  const walletAddress = document.getElementById("wallet-address");
  const profileAvatar = document.querySelector(".profile-avatar img");

  if (address) {
    walletAddress.textContent = formatWalletAddress(address);
    profileAvatar.src = getRandomAvatar();
    profileSection.style.display = "flex";
  } else {
    profileSection.style.display = "none";
  }
}

// Update profile section on initial load
if (window.algoMintXClient.account) {
  updateProfileSection(window.algoMintXClient.account);
}
