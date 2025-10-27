import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Profile from './pages/Profile';
import About from './pages/About';
import NFTDetails from './pages/NFTDetails';
import { useSDK } from './hooks/useSDK';

function App() {  
  const { algoMintXClient } = useSDK();
  if (!algoMintXClient) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading SDK...</h2>
        <p>Please wait while we initialize the AlgoMintX SDK</p>
      </div>
    );
  }

  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="profile" element={<Profile />} />
          <Route path="about" element={<About />} />
          <Route path="nft/:assetId" element={<NFTDetails />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
