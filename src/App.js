import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DialogProvider } from './context/DialogContext';
import { CompanyProvider, useCompany } from './context/CompanyContext';
import { ProductsProvider } from './context/ProductsContext';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Setup from './pages/Setup';
import './App.css';

function ToasterWrapper() {
  const { isDarkMode } = useTheme();
  
  return (
    <Toaster
      position="top-center"
      expand={false}
      closeButton
      theme={isDarkMode ? 'dark' : 'light'}
      toastOptions={{
        style: {
          background: isDarkMode ? '#1F2937' : '#FFFFFF',
          color: isDarkMode ? '#F9FAFB' : '#111827',
          border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
        },
        className: 'sonner-toast',
        duration: 4000,
        success: {
          style: {
            background: '#F0FDF4',
            color: '#34C759',
            border: '1px solid #86EFAC',
          },
          className: 'success-toast-green',
          iconTheme: {
            primary: '#34C759',
            secondary: '#FFFFFF',
          },
        },
      }}
    />
  );
}

// Wrapper to check if setup is complete
function SetupGuard({ children }) {
  const { company, loading } = useCompany();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  // If no company data, redirect to setup
  if (!company || !company.name) {
    return <Navigate to="/setup" replace />;
  }
  
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <DialogProvider>
        <CompanyProvider>
          <ProductsProvider>
            <Router>
              <ToasterWrapper />
              <Routes>
                <Route path="/setup" element={<Setup />} />
                <Route 
                  path="/dashboard/*" 
                  element={
                    <SetupGuard>
                      <Landing />
                    </SetupGuard>
                  } 
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Router>
          </ProductsProvider>
        </CompanyProvider>
      </DialogProvider>
    </ThemeProvider>
  );
}

export default App;
