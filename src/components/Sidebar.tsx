import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { WalletIcon, ChartBarIcon, CurrencyDollarIcon, Cog6ToothIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Logo from './Logo';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      const hamburger = document.getElementById('hamburger-button');
      
      if (isOpen && sidebar && hamburger && 
          !sidebar.contains(event.target as Node) && 
          !hamburger.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Hamburger Menu Button */}
      <button
        id="hamburger-button"
        onClick={toggleSidebar}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-white shadow-md lg:hidden hover:bg-gray-50"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <XMarkIcon className="w-6 h-6 text-gray-600" />
        ) : (
          <Bars3Icon className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`sidebar ${isOpen ? 'open' : 'closed'}`}
      >
        <div className="p-6">
          <div className="flex items-center">
            <Logo className="h-8 w-auto mr-2" />
            <h1 className="text-2xl font-bold text-primary-500">MNY</h1>
          </div>
        </div>

        <nav className="space-y-1">
          <NavLink
            to="/"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <WalletIcon className="w-5 h-5 mr-3" />
            Wallets
          </NavLink>
          <NavLink
            to="/movements"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <ChartBarIcon className="w-5 h-5 mr-3" />
            Movements
          </NavLink>
          <NavLink
            to="/investments"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <CurrencyDollarIcon className="w-5 h-5 mr-3" />
            Investments
          </NavLink>
          <NavLink
            to="/setup"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Cog6ToothIcon className="w-5 h-5 mr-3" />
            Setup
          </NavLink>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;