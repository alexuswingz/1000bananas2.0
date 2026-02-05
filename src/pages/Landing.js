import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { SidebarProvider } from '../context/SidebarContext';
import Sidebar from '../components/Sidebar';

// Import all page components
import Home from './Home';
import Selection from './products/Selection';
import ProductForm from './products/ProductForm';
import Development from './products/Development';
import Catalog from './products/Catalog';
import ProductDetail from './products/catalog/ProductDetail';
import VineTracker from './products/vine-tracker';
import Dashboard from './team/Dashboard';
import Formula from './team/Formula';
import Design from './team/Design';
import Listing from './team/Listing';
import Ads from './team/Ads';
import Bottles from './supply-chain/bottles/index';
import BottleOrderPage from './supply-chain/bottles/components/BottleOrderPage';
import BottleCycleCounts from './supply-chain/bottles/components/CycleCounts';
import BottleCycleCountDetail from './supply-chain/bottles/components/CycleCountDetail';
import Closures from './supply-chain/closures/index';
import ClosureOrderPage from './supply-chain/closures/components/ClosureOrderPage';
import ClosureCycleCounts from './supply-chain/closures/components/CycleCounts';
import ClosureCycleCountDetail from './supply-chain/closures/components/CycleCountDetail';
import Boxes from './supply-chain/boxes/index';
import BoxOrderPage from './supply-chain/boxes/components/BoxOrderPage';
import BoxCycleCounts from './supply-chain/boxes/components/CycleCounts';
import BoxCycleCountDetail from './supply-chain/boxes/components/CycleCountDetail';
import Labels from './supply-chain/labels/index';
import LabelOrderPage from './supply-chain/labels/components/LabelOrderPage';
import LabelCycleCounts from './supply-chain/labels/components/CycleCounts';
import LabelCycleCountDetail from './supply-chain/labels/components/CycleCountDetail';
import RawMaterials from './supply-chain/rawMaterials/index';
import Planning from './production/planning';
import Manufacturing from './production/manufacturing';
import Packaging from './production/Packaging';
import Inventory from './production/Inventory';
import NewShipment from './production/new-shipment';
import Notifications from './Notifications';
import Settings from './Settings';

const Landing = () => {
  const { isDarkMode } = useTheme();
  
  return (
    <SidebarProvider>
      <div className={`flex h-screen ${isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary'}`}>
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area - flex column so route content can fill and scroll without footer overlap */}
        <div className="flex-1 md:pt-0 pt-14" style={{ height: '100vh', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/selection" element={<Selection />} />
          <Route path="/products/form" element={<ProductForm />} />
          <Route path="/products/development" element={<Development />} />
          <Route path="/products/catalog" element={<Catalog />} />
          <Route path="/products/catalog/detail" element={<ProductDetail />} />
          <Route path="/products/vine-tracker" element={<VineTracker />} />
          <Route path="/team/dashboard" element={<Dashboard />} />
          <Route path="/team/formula" element={<Formula />} />
          <Route path="/team/design" element={<Design />} />
          <Route path="/team/listing" element={<Listing />} />
          <Route path="/team/ads" element={<Ads />} />
          <Route path="/supply-chain/bottles" element={<Bottles />} />
          <Route path="/supply-chain/bottles/order" element={<BottleOrderPage />} />
          <Route path="/supply-chain/bottles/cycle-counts" element={<BottleCycleCounts />} />
          <Route path="/supply-chain/bottles/cycle-counts/detail" element={<BottleCycleCountDetail />} />
          <Route path="/supply-chain/closures" element={<Closures />} />
          <Route path="/supply-chain/closures/order" element={<ClosureOrderPage />} />
          <Route path="/supply-chain/closures/cycle-counts" element={<ClosureCycleCounts />} />
          <Route path="/supply-chain/closures/cycle-counts/detail" element={<ClosureCycleCountDetail />} />
          <Route path="/supply-chain/boxes" element={<Boxes />} />
          <Route path="/supply-chain/boxes/order" element={<BoxOrderPage />} />
          <Route path="/supply-chain/boxes/cycle-counts" element={<BoxCycleCounts />} />
          <Route path="/supply-chain/boxes/cycle-counts/detail" element={<BoxCycleCountDetail />} />
          <Route path="/supply-chain/labels" element={<Labels />} />
          <Route path="/supply-chain/labels/order" element={<LabelOrderPage />} />
          <Route path="/supply-chain/labels/cycle-counts" element={<LabelCycleCounts />} />
          <Route path="/supply-chain/labels/cycle-counts/detail" element={<LabelCycleCountDetail />} />
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
      </div>
    </SidebarProvider>
  );
};

export default Landing;

