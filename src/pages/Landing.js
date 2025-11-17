import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';

// Import all page components
import Home from './Home';
import Selection from './products/Selection';
import ProductForm from './products/ProductForm';
import Development from './products/Development';
import Catalog from './products/Catalog';
import ProductDetail from './products/catalog/ProductDetail';
import Dashboard from './team/Dashboard';
import Formula from './team/Formula';
import Design from './team/Design';
import Listing from './team/Listing';
import Ads from './team/Ads';
import Bottles from './supply-chain/bottles/index';
import BottleOrderPage from './supply-chain/bottles/components/BottleOrderPage';
import Closures from './supply-chain/closures/index';
import ClosureOrderPage from './supply-chain/closures/components/ClosureOrderPage';
import Boxes from './supply-chain/boxes/index';
import Labels from './supply-chain/labels/index';
import RawMaterials from './supply-chain/rawMaterials/index';
import Planning from './production/planning';
import Manufacturing from './production/Manufacturing';
import Packaging from './production/Packaging';
import Inventory from './production/Inventory';
import NewShipment from './production/new-shipment';
import Notifications from './Notifications';
import Settings from './Settings';

const Landing = () => {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary'}`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1" style={{ overflow: 'auto', height: '100vh' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/selection" element={<Selection />} />
          <Route path="/products/form" element={<ProductForm />} />
          <Route path="/products/development" element={<Development />} />
          <Route path="/products/catalog" element={<Catalog />} />
          <Route path="/products/catalog/detail" element={<ProductDetail />} />
          <Route path="/team/dashboard" element={<Dashboard />} />
          <Route path="/team/formula" element={<Formula />} />
          <Route path="/team/design" element={<Design />} />
          <Route path="/team/listing" element={<Listing />} />
          <Route path="/team/ads" element={<Ads />} />
          <Route path="/supply-chain/bottles" element={<Bottles />} />
          <Route path="/supply-chain/bottles/order" element={<BottleOrderPage />} />
          <Route path="/supply-chain/closures" element={<Closures />} />
          <Route path="/supply-chain/closures/order" element={<ClosureOrderPage />} />
          <Route path="/supply-chain/boxes" element={<Boxes />} />
          <Route path="/supply-chain/labels" element={<Labels />} />
          <Route path="/supply-chain/raw-materials" element={<RawMaterials />} />
          <Route path="/production/planning" element={<Planning />} />
          <Route path="/production/manufacturing" element={<Manufacturing />} />
          <Route path="/production/packaging" element={<Packaging />} />
          <Route path="/production/inventory" element={<Inventory />} />
          <Route path="/production/shipment/new" element={<NewShipment />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
};

export default Landing;

