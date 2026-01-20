import React, { createContext, useContext, useState } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  
  const toggleSidebar = () => {
    setIsMinimized(prev => !prev);
  };
  
  // Sidebar widths match Tailwind classes: w-64 (256px) and w-20 (80px)
  const sidebarWidth = isMinimized ? 80 : 256;
  
  return (
    <SidebarContext.Provider value={{ 
      isMinimized, 
      setIsMinimized, 
      toggleSidebar,
      sidebarWidth 
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export default SidebarContext;
