import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';
import { useSidebar } from '../context/SidebarContext';

const Sidebar = (props = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const { company, getEnabledWorkspaceModules, getEnabledProductModules } = useCompany();
  const { isMinimized, setIsMinimized } = useSidebar();
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedMenus, setExpandedMenus] = useState({
    products: false,
    teamWorkspaces: false,
    supplyChain: false,
    production: false,
  });
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0 });
  const hoverTimeoutRef = useRef(null);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get enabled workspace modules
  const enabledModules = getEnabledWorkspaceModules ? getEnabledWorkspaceModules() : [];
  const enabledProductModules = getEnabledProductModules ? getEnabledProductModules() : [];

  const toggleMenu = (menu) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const handleMenuEnter = (menu, rect) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setMenuPosition({ top: rect.top });
    setHoveredMenu(menu);
  };

  const handleMenuLeave = () => {
    // Delay hiding the menu to give time to move cursor
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMenu(null);
    }, 200); // 200ms delay
  };

  const handleSubmenuEnter = () => {
    // Clear the timeout if user enters the submenu
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleSubmenuLeave = () => {
    // Hide immediately when leaving the submenu
    setHoveredMenu(null);
  };

  const isActive = (path) => {
    // For home, check if we're exactly at /dashboard or /dashboard/
    if (path === '/' || path === '') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    
    // Special handling for product detail page - check returnPath from location state
    if (location.pathname === '/dashboard/products/catalog/detail' && location.state?.returnPath) {
      const returnPath = location.state.returnPath.replace('/dashboard', '');
      return path === returnPath || returnPath.startsWith(path + '/');
    }
    
    return location.pathname === `/dashboard${path}` || location.pathname.startsWith(`/dashboard${path}/`);
  };

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-light-bg-secondary',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-light-text-primary',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-light-border-primary',
    hover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-light-bg-hover',
    activeBlue: isDarkMode ? 'bg-dark-accent-blue' : 'bg-light-accent-blue',
    orange: isDarkMode ? 'text-dark-accent-orange' : 'text-light-accent-orange',
  };

  const menuItemClass = (path) => `
    flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg cursor-pointer transition-all
    ${isActive(path) 
      ? `${themeClasses.activeBlue} text-white font-medium` 
      : `${themeClasses.text} ${themeClasses.hover}`
    }
  `;

  const subMenuItemClass = (path) => `
    flex items-center gap-3 px-4 py-2 text-sm rounded-lg cursor-pointer transition-all ml-6
    ${isActive(path) 
      ? `${themeClasses.activeBlue} text-white font-medium` 
      : `${themeClasses.textSecondary} ${themeClasses.hover} hover:${themeClasses.text}`
    }
  `;

  const subSubMenuItemClass = (path) => `
    flex items-center gap-3 px-4 py-2 text-sm rounded-lg cursor-pointer transition-all ml-12
    ${isActive(path) 
      ? `${themeClasses.activeBlue} text-white font-medium` 
      : `${themeClasses.textSecondary} ${themeClasses.hover} hover:${themeClasses.text}`
    }
  `;

  // Remove this function - we don't want parent to be active when child is active

  const handleLogout = () => {
    navigate('/');
  };

  const toggleSidebar = () => {
    // Close all expanded menus when minimizing
    if (!isMinimized) {
      setExpandedMenus({
        products: false,
        teamWorkspaces: false,
        supplyChain: false,
        production: false,
      });
    }
    setIsMinimized(!isMinimized);
  };

  // Hide sidebar on mobile (unless forced to show)
  if (isMobile && !props?.forceMobile) {
    return null;
  }

  // For mobile forced display, use full width and don't allow minimization
  const isForcedMobile = props?.forceMobile && isMobile;
  const effectiveMinimized = isForcedMobile ? false : isMinimized;
  const effectiveWidth = isForcedMobile ? 'w-full' : (effectiveMinimized ? 'w-20' : 'w-64');
  const displayClasses = isForcedMobile ? 'flex' : 'hidden md:flex';

  return (
    <div 
      className={`${displayClasses} ${effectiveWidth} h-screen ${isForcedMobile ? '' : themeClasses.border + ' border-r'} flex-col transition-all duration-300 relative`}
      style={{
        background: 'linear-gradient(180deg, #1A2235 0%, #1A2235 15%, #243347 50%, #10151C 85%, #10151C 100%)'
      }}
    >
      {/* Logo Header - Hide on forced mobile since parent provides header */}
      {!isForcedMobile && (
        <div className={`p-4 ${themeClasses.border} border-b flex items-center ${isMinimized ? 'justify-center' : 'justify-between'}`}>
        {!isMinimized && (
          <div className="flex items-center gap-3">
            {/* Logo without border - image already has it */}
            <div className="flex-shrink-0">
              <img 
                src={company?.logoUrl || "/assets/logo.png"} 
                alt={company?.name || "Logo"} 
                className="w-12 h-12 object-contain rounded-lg" 
              />
            </div>
            {/* Brand Text - Single line */}
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-bold ${themeClasses.orange}`}>
                {company?.name || "1000 Bananas"}
              </span>
            </div>
          </div>
        )}
        {isMinimized && (
          <div className="flex-shrink-0">
            <img 
              src={company?.logoUrl || "/assets/logo.png"} 
              alt={company?.name || "Logo"} 
              className="w-12 h-12 object-contain rounded-lg" 
            />
          </div>
        )}
        {/* Toggle Button with toggle icon from assets */}
        {!isMinimized && (
          <button 
            onClick={toggleSidebar}
            className={`w-8 h-8 flex items-center justify-center ${themeClasses.hover} rounded-lg transition-all group`}
          >
            <img src="/assets/toggle.png" alt="Toggle" className="w-5 h-5 object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>
      )}

      {/* Minimize Button when collapsed */}
      {!isForcedMobile && isMinimized && (
        <div className="px-4 py-2">
          <button 
            onClick={toggleSidebar}
            className={`w-full h-10 flex items-center justify-center ${themeClasses.hover} rounded-lg transition-all group`}
          >
            <img src="/assets/toggle.png" alt="Toggle" className="w-5 h-5 object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      )}

      {/* Menu Items - No scrollbar */}
      <div className="flex-1 overflow-y-auto overflow-x-visible py-4 px-3 space-y-1 scrollbar-hide">
        {/* Home */}
        <div 
          className={`${menuItemClass('')} ${isMinimized ? 'justify-center' : ''}`} 
          onClick={() => navigate('/dashboard')}
          title={isMinimized ? 'Home' : ''}
        >
          <img src="/assets/home-icon.png" alt="Home" className="w-5 h-5 object-contain" />
          {!isMinimized && <span>Home</span>}
        </div>

        {/* Products */}
        {!isMinimized ? (
          <div>
            <div className={`flex items-center justify-between px-4 py-2.5 text-sm rounded-lg cursor-pointer transition-all ${themeClasses.text} ${themeClasses.hover}`} onClick={() => toggleMenu('products')}>
              <div className="flex items-center gap-3">
                <img src="/assets/productselection.png" alt="Products" className="w-5 h-5 object-contain" />
                <span>Products</span>
              </div>
              <svg className={`w-4 h-4 transition-transform ${expandedMenus.products ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {expandedMenus.products && (
              <div className="mt-1 space-y-1">
                {enabledProductModules.map(module => (
                  <div 
                    key={module.id} 
                    className={subMenuItemClass(`/products/${module.id}`)} 
                    onClick={() => navigate(`/dashboard/products/${module.id}`)}
                  >
                    {module.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <div 
              className={`${menuItemClass('/products')} justify-center`}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                handleMenuEnter('products', rect);
              }}
              onMouseLeave={handleMenuLeave}
              title="Products"
            >
              <img src="/assets/productselection.png" alt="Products" className="w-5 h-5 object-contain" />
            </div>
            {/* Hover Submenu */}
            {hoveredMenu === 'products' && (
              <div 
                className={`fixed left-20 ${themeClasses.bg} ${themeClasses.border} border-2 rounded-lg shadow-2xl py-2 px-3 w-48 z-[9999]`}
                style={{ top: `${menuPosition.top}px` }}
                onMouseEnter={handleSubmenuEnter}
                onMouseLeave={handleSubmenuLeave}
              >
                <div className={`text-sm font-semibold ${themeClasses.text} mb-2 px-2`}>Products</div>
                {enabledProductModules.map(module => (
                  <div 
                    key={module.id} 
                    className={`text-xs ${themeClasses.textSecondary} px-2 py-1.5 ${themeClasses.hover} rounded cursor-pointer`} 
                    onClick={() => navigate(`/dashboard/products/${module.id}`)}
                  >
                    {module.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Team Workspaces */}
        {!isMinimized ? (
          <div>
            <div className={`flex items-center justify-between px-4 py-2.5 text-sm rounded-lg cursor-pointer transition-all ${themeClasses.text} ${themeClasses.hover}`} onClick={() => toggleMenu('teamWorkspaces')}>
              <div className="flex items-center gap-3">
                <img src="/assets/teamworkspaces.png" alt="Team Workspaces" className="w-5 h-5 object-contain" />
                <span>Team Workspaces</span>
              </div>
              <svg className={`w-4 h-4 transition-transform ${expandedMenus.teamWorkspaces ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {expandedMenus.teamWorkspaces && (
              <div className="mt-1 space-y-1">
                {enabledModules.map(module => (
                  <div 
                    key={module.id} 
                    className={subMenuItemClass(`/team/${module.id}`)} 
                    onClick={() => navigate(`/dashboard/team/${module.id}`)}
                  >
                    {module.name}
                  </div>
                ))}
                
                {/* Supply Chain - Submenu Category with Caret */}
                <div 
                  className={`flex items-center justify-between px-4 py-2 text-sm font-semibold ${themeClasses.text} ml-6 mt-2 ${themeClasses.hover} rounded-lg cursor-pointer`}
                  onClick={() => toggleMenu('supplyChain')}
                >
                  <span>Supply Chain</span>
                  <svg className={`w-3 h-3 transition-transform ${expandedMenus.supplyChain ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {expandedMenus.supplyChain && (
                  <>
                    <div className={subSubMenuItemClass('/supply-chain/bottles')} onClick={() => navigate('/dashboard/supply-chain/bottles')}>
                      Bottles
                    </div>
                    <div className={subSubMenuItemClass('/supply-chain/closures')} onClick={() => navigate('/dashboard/supply-chain/closures')}>
                      Closures
                    </div>
                    <div className={subSubMenuItemClass('/supply-chain/boxes')} onClick={() => navigate('/dashboard/supply-chain/boxes')}>
                      Boxes
                    </div>
                    <div className={subSubMenuItemClass('/supply-chain/labels')} onClick={() => navigate('/dashboard/supply-chain/labels')}>
                      Labels
                    </div>
                    <div className={subSubMenuItemClass('/supply-chain/raw-materials')} onClick={() => navigate('/dashboard/supply-chain/raw-materials')}>
                      Raw Materials
                    </div>
                  </>
                )}

                {/* Production - Submenu Category with Caret */}
                <div 
                  className={`flex items-center justify-between px-4 py-2 text-sm font-semibold ${themeClasses.text} ml-6 mt-2 ${themeClasses.hover} rounded-lg cursor-pointer`}
                  onClick={() => toggleMenu('production')}
                >
                  <span>Production</span>
                  <svg className={`w-3 h-3 transition-transform ${expandedMenus.production ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {expandedMenus.production && (
                  <>
                    <div className={subSubMenuItemClass('/production/planning')} onClick={() => navigate('/dashboard/production/planning')}>
                      Shipments
                    </div>
                    <div className={subSubMenuItemClass('/production/manufacturing')} onClick={() => navigate('/dashboard/production/manufacturing')}>
                      Manufacturing
                    </div>
                    <div className={subSubMenuItemClass('/production/packaging')} onClick={() => navigate('/dashboard/production/packaging')}>
                      Packaging
                    </div>
                    <div className={subSubMenuItemClass('/production/inventory')} onClick={() => navigate('/dashboard/production/inventory')}>
                      Inventory
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <div 
              className={`${menuItemClass('/team')} justify-center`}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                handleMenuEnter('team', rect);
              }}
              onMouseLeave={handleMenuLeave}
              title="Team Workspaces"
            >
              <img src="/assets/teamworkspaces.png" alt="Team Workspaces" className="w-5 h-5 object-contain" />
            </div>
            {/* Hover Submenu */}
            {hoveredMenu === 'team' && (
              <div 
                className={`fixed left-20 ${themeClasses.bg} ${themeClasses.border} border-2 rounded-lg shadow-2xl py-2 px-3 w-52 z-[9999] max-h-96 overflow-y-auto scrollbar-hide`}
                style={{ top: `${menuPosition.top}px` }}
                onMouseEnter={handleSubmenuEnter}
                onMouseLeave={handleSubmenuLeave}
              >
                <div className={`text-sm font-semibold ${themeClasses.text} mb-2 px-2`}>Team Workspaces</div>
                {enabledModules.map(module => (
                  <div 
                    key={module.id} 
                    className={`text-xs ${themeClasses.textSecondary} px-2 py-1.5 ${themeClasses.hover} rounded cursor-pointer`} 
                    onClick={() => navigate(`/dashboard/team/${module.id}`)}
                  >
                    {module.name}
                  </div>
                ))}
                
                <div className={`border-t ${themeClasses.border} my-2`}></div>
                
                <div className={`text-xs font-semibold ${themeClasses.text} mb-1 px-2`}>Supply Chain</div>
                <div className={`text-xs ${themeClasses.textSecondary} px-2 py-1.5 ${themeClasses.hover} rounded cursor-pointer`} onClick={() => navigate('/dashboard/supply-chain/bottles')}>• Bottles</div>
                <div className={`text-xs ${themeClasses.textSecondary} px-2 py-1.5 ${themeClasses.hover} rounded cursor-pointer`} onClick={() => navigate('/dashboard/supply-chain/closures')}>• Closures</div>
                <div className={`text-xs ${themeClasses.textSecondary} px-2 py-1.5 ${themeClasses.hover} rounded cursor-pointer`} onClick={() => navigate('/dashboard/supply-chain/boxes')}>• Boxes</div>
                <div className={`text-xs ${themeClasses.textSecondary} px-2 py-1.5 ${themeClasses.hover} rounded cursor-pointer`} onClick={() => navigate('/dashboard/supply-chain/labels')}>• Labels</div>
                <div className={`text-xs ${themeClasses.textSecondary} px-2 py-1.5 ${themeClasses.hover} rounded cursor-pointer`} onClick={() => navigate('/dashboard/supply-chain/raw-materials')}>• Raw Materials</div>
                
                <div className={`text-xs font-semibold ${themeClasses.text} mt-2 px-2`}>Production</div>
                <div className={`text-xs ${themeClasses.textSecondary} px-2 py-1.5 ${themeClasses.hover} rounded cursor-pointer`} onClick={() => navigate('/dashboard/production/planning')}>• Shipments</div>
                <div className={`text-xs ${themeClasses.textSecondary} px-2 py-1.5 ${themeClasses.hover} rounded cursor-pointer`} onClick={() => navigate('/dashboard/production/manufacturing')}>• Manufacturing</div>
                <div className={`text-xs ${themeClasses.textSecondary} px-2 py-1.5 ${themeClasses.hover} rounded cursor-pointer`} onClick={() => navigate('/dashboard/production/packaging')}>• Packaging</div>
                <div className={`text-xs ${themeClasses.textSecondary} px-2 py-1.5 ${themeClasses.hover} rounded cursor-pointer`} onClick={() => navigate('/dashboard/production/inventory')}>• Inventory</div>
              </div>
            )}
          </div>
        )}

        {/* Action Items */}
        <div 
          className={`${menuItemClass('/action-items')} ${isMinimized ? 'justify-center' : ''}`} 
          onClick={() => navigate('/dashboard/action-items')}
          title={isMinimized ? 'Action Items' : ''}
        >
          <img src="/assets/action-items-icon.png" alt="Action Items" className="w-5 h-5 object-contain" />
          {!isMinimized && <span>Action Items</span>}
        </div>
      </div>

      {/* Bottom Section - Notifications, Settings, Dark Theme, Logout */}
      <div className={`${themeClasses.border} border-t`}>
        <div className="py-2 px-3 space-y-1">
          {/* Notifications */}
          <div 
            className={`${menuItemClass('/notifications')} ${isMinimized ? 'justify-center' : ''}`} 
            onClick={() => navigate('/dashboard/notifications')}
            title={isMinimized ? 'Notifications' : ''}
          >
            <img src="/assets/notification-icon.png" alt="Notifications" className="w-5 h-5 object-contain" />
            {!isMinimized && <span>Notifications</span>}
          </div>

          {/* Settings */}
          <div 
            className={`${menuItemClass('/settings')} ${isMinimized ? 'justify-center' : ''}`} 
            onClick={() => navigate('/dashboard/settings')}
            title={isMinimized ? 'Settings' : ''}
          >
            <img src="/assets/settings-icon.png" alt="Settings" className="w-5 h-5 object-contain" />
            {!isMinimized && <span>Settings</span>}
          </div>

          {/* Divider */}
          <div className={`${themeClasses.border} border-t my-2`}></div>

          {/* Logout */}
          <div 
            className={`flex items-center ${isMinimized ? 'justify-center' : ''} gap-3 px-4 py-2.5 text-sm ${themeClasses.text} ${themeClasses.hover} rounded-lg cursor-pointer transition-all`} 
            onClick={handleLogout}
            title={isMinimized ? 'Logout' : ''}
          >
            <img src="/assets/logout-icon.png" alt="Logout" className="w-5 h-5 object-contain" />
            {!isMinimized && <span>Logout</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
