import { Outlet, Link } from "react-router-dom";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import logo from "../assets/logo.png";
import { formatWalletAddress, getRandomAvatar } from "../utils";
import { useState, useCallback } from "react";

function MainLayout() {
  const { algoMintXClient } = useSDK();
  const [, forceUpdate] = useState({});

  const refreshHeader = useCallback(() => {
    forceUpdate({});
  }, []);

  useSDKEvents({
    onWalletConnect: refreshHeader,
    onWalletDisconnect: refreshHeader,
  });

  return (
    <>
      <header>
        <div className="container header-content">
          <div className="logo">
            <img src={logo} alt="AlgoMintX Logo" />
            <h1>QuickMInt</h1>
          </div>
          {algoMintXClient?.account && (
            <div className="profile-section">
              <div className="wallet-info">
                <span>{formatWalletAddress(algoMintXClient.account)}</span>
              </div>
              <div className="profile-avatar">
                <img src={getRandomAvatar()} alt="Profile" />
              </div>
            </div>
          )}
        </div>
      </header>

      <nav>
        <div className="container">
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/profile">Profile</Link>
            <Link to="/about">About</Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer>
        <div className="container footer-content">
          <p>
            &copy; {new Date().getFullYear()} QuickMInt. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}

export default MainLayout;
