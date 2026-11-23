import React, { useState } from 'react';
import { AppUser, Role } from '../types/cadbury';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  currentUser: AppUser;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  setIsOpenMobile,
  currentUser
}) => {
  // Collapsible sub-menus
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    inventory: true,
    parties: true,
    orders: true,
    logistics: true,
    tracking: true,
    accounts: true
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setIsOpenMobile(false);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'fa-house',
      type: 'single'
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: 'fa-box',
      type: 'group',
      children: [
        { id: 'stock', label: 'Products & Stock', icon: 'fa-cubes' },
        { id: 'stock_in', label: 'Stock Inward (+)', icon: 'fa-circle-arrow-down' },
        { id: 'returns', label: 'Damage / Expiry (-)', icon: 'fa-triangle-exclamation' }
      ]
    },
    {
      id: 'parties',
      label: 'Parties',
      icon: 'fa-store',
      type: 'group',
      children: [
        { id: 'parties', label: 'Party List', icon: 'fa-address-book' },
        { id: 'ledger', label: 'Party Ledger', icon: 'fa-book' }
      ]
    },
    {
      id: 'orders',
      label: 'Orders & Billing',
      icon: 'fa-file-invoice-dollar',
      type: 'group',
      children: [
        { id: 'orders', label: 'New Order / Invoices', icon: 'fa-plus-circle' },
        { id: 'pipeline', label: 'Order Pipeline Flow', icon: 'fa-bars-staggered' }
      ]
    },
    {
      id: 'logistics',
      label: 'Logistics',
      icon: 'fa-truck-fast',
      type: 'group',
      children: [
        { id: 'loader', label: 'Loading (Loader Desk)', icon: 'fa-boxes-packing' },
        { id: 'routes', label: 'Route Planning', icon: 'fa-route' },
        { id: 'delivery_boy', label: 'Delivery Boy Portal', icon: 'fa-motorcycle' }
      ]
    },
    {
      id: 'tracking',
      label: 'Live Tracking',
      icon: 'fa-map-location-dot',
      type: 'group',
      children: [
        { id: 'map', label: 'Live GPS Map', icon: 'fa-earth-asia' }
      ]
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: 'fa-coins',
      type: 'group',
      children: [
        { id: 'ledger', label: 'Payment Collection', icon: 'fa-hand-holding-dollar' },
        { id: 'outstanding', label: 'Party Outstanding', icon: 'fa-receipt' }
      ]
    },
    {
      id: 'reports',
      label: 'Reports & Audits',
      icon: 'fa-chart-pie',
      type: 'single'
    },
    {
      id: 'users',
      label: 'Users & Rights',
      icon: 'fa-gear',
      type: 'single'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-cadbury-950 text-white flex flex-col shadow-2xl border-r border-white/10 transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center text-cadbury-950 font-black shadow-md">
              <i className="fa-solid fa-candy-cane text-xl"></i>
            </div>
            <div>
              <div className="font-black text-sm tracking-tight text-white leading-tight">
                CADBURY <span className="text-gold-400">DISTRIBUTOR</span>
              </div>
              <div className="text-[10px] text-cadbury-300 font-semibold tracking-wider uppercase">
                Logistics & DMS
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsOpenMobile(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cadbury-800 border border-gold-400/40 flex items-center justify-center text-gold-400 font-bold text-xs">
            <i className="fa-solid fa-user-shield"></i>
          </div>
          <div className="truncate">
            <div className="text-xs font-bold text-white truncate">{currentUser.name.split(' ')[0]}</div>
            <span className="text-[10px] text-gold-400 font-semibold uppercase">{currentUser.role}</span>
          </div>
        </div>

        {/* Navigation Links Scrollable List */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 text-xs">
          {navItems.map((item) => {
            if (item.type === 'single') {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl font-bold flex items-center gap-3 transition-all ${
                    isActive
                      ? 'bg-gold-500 text-cadbury-950 shadow-md font-black'
                      : 'text-cadbury-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <i className={`fa-solid ${item.icon} text-sm w-4 text-center ${isActive ? 'text-cadbury-950' : 'text-gold-400'}`}></i>
                  <span>{item.label}</span>
                </button>
              );
            }

            // Group Item (Collapsible)
            const isSectionOpen = openSections[item.id] !== false;
            const hasActiveChild = item.children?.some(c => c.id === activeTab);

            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  onClick={() => toggleSection(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl font-bold flex items-center justify-between text-cadbury-300 hover:bg-white/5 hover:text-white transition-all ${
                    hasActiveChild ? 'text-gold-300 font-black' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <i className={`fa-solid ${item.icon} text-xs w-4 text-center text-gold-400`}></i>
                    <span className="uppercase text-[11px] tracking-wider">{item.label}</span>
                  </div>
                  <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${isSectionOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {isSectionOpen && (
                  <div className="pl-6 space-y-0.5 border-l border-white/10 ml-4 py-1">
                    {item.children?.map(sub => {
                      const isSubActive = activeTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSelectTab(sub.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center gap-2.5 transition-all text-xs ${
                            isSubActive
                              ? 'bg-gold-500 text-cadbury-950 font-black shadow-sm'
                              : 'text-cadbury-200 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <i className={`fa-solid ${sub.icon} text-[11px] w-3 text-center ${isSubActive ? 'text-cadbury-950' : 'text-slate-400'}`}></i>
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer Quick Telemetry */}
        <div className="p-3 border-t border-white/10 text-[11px] text-cadbury-300 bg-white/5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live GPS Sync
            </span>
            <span className="font-mono text-white text-[10px]">v2.4 Stable</span>
          </div>
        </div>
      </aside>
    </>
  );
};
