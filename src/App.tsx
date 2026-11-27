import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  GoodsStage, 
  DMSDashboardStats, 
  CadburyProduct, 
  Party, 
  Vehicle, 
  Order, 
  LoaderTask, 
  PaymentTransaction, 
  DeliveryRoute,
  SalesReturn,
  AppUser, 
  Role 
} from './types/cadbury';

import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { GoodsTrackingPipeline } from './components/GoodsTrackingPipeline';
import { LiveVehicleMap } from './components/LiveVehicleMap';
import { PartyManagement } from './components/PartyManagement';
import { OrderBillingManagement } from './components/OrderBillingManagement';
import { LoaderDashboard } from './components/LoaderDashboard';
import { DeliveryBoyMobile } from './components/DeliveryBoyMobile';
import { HisabKitabLedger } from './components/HisabKitabLedger';
import { UserRoleManagement } from './components/UserRoleManagement';
import { StockInventoryManagement } from './components/StockInventoryManagement';
import { RouteManagement } from './components/RouteManagement';
import { ReturnDamageManagement } from './components/ReturnDamageManagement';
import { ReportsAnalytics } from './components/ReportsAnalytics';
import { LoginScreen } from './components/LoginScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  // Core DMS Datastore
  const [stats, setStats] = useState<DMSDashboardStats>({
    totalOrders: 6,
    todaysSales: 195150,
    totalParties: 6,
    totalVehicles: 3,
    loadingPending: 2,
    outForDelivery: 2,
    deliveredCount: 1,
    totalDelivery: 1,
    pendingDelivery: 5,
    todaysCollection: 14250,
    dailyCollection: 14250,
    marketOutstanding: 154850,
    pendingPayment: 154850,
    cartonsLoadedToday: 74,
    cashCollectedToday: 0,
    upiCollectedToday: 14250
  });

  const [products, setProducts] = useState<CadburyProduct[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaderTasks, setLoaderTasks] = useState<LoaderTask[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);

  // Current Logged-in User
  const [currentUser, setCurrentUser] = useState<AppUser>({
    id: 'usr-1',
    name: 'Amarjeet (Admin / Owner)',
    username: 'admin',
    role: Role.ADMIN,
    phone: '9820011223',
    password: '88283671',
    email: 'admin@cadburydistributor.com',
    employeeId: 'CAD-ADM-01',
    canAccessAdminDashboard: true,
    canEditOrders: true,
    canDeleteOrders: true,
    canExportReports: true
  });

  // Socket Connection and initial fetch
  useEffect(() => {
    const socket: Socket = io();

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('Connected to Cadbury DMS Socket Server');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('initial_data', (payload: any) => {
      if (payload.stats) setStats(payload.stats);
      if (payload.products) setProducts(payload.products);
      if (payload.parties) setParties(payload.parties);
      if (payload.routes) setRoutes(payload.routes);
      if (payload.vehicles) setVehicles(payload.vehicles);
      if (payload.orders) setOrders(payload.orders);
      if (payload.loaderTasks) setLoaderTasks(payload.loaderTasks);
      if (payload.payments) setPayments(payload.payments);
      if (payload.returns) setReturns(payload.returns);
      if (payload.users) setUsers(payload.users);
    });

    socket.on('vehicle_telemetry', (vehList: Vehicle[]) => setVehicles(vehList));
    socket.on('order_updated', (ordList: Order[]) => setOrders(ordList));
    socket.on('loader_updated', (tList: LoaderTask[]) => setLoaderTasks(tList));
    socket.on('party_updated', (pList: Party[]) => setParties(pList));
    socket.on('payment_updated', (payList: PaymentTransaction[]) => setPayments(payList));
    socket.on('stock_updated', (prodList: CadburyProduct[]) => setProducts(prodList));
    socket.on('returns_updated', (retList: SalesReturn[]) => setReturns(retList));
    socket.on('routes_updated', (rtList: DeliveryRoute[]) => setRoutes(rtList));

    // Fallback REST fetch
    fetch('/api/cadbury/dashboard').then(res => res.json()).then(data => {
      if (data.stats) setStats(data.stats);
      if (data.activeVehicles) setVehicles(data.activeVehicles);
    }).catch(() => {});

    fetch('/api/cadbury/products').then(res => res.json()).then(setProducts).catch(() => {});
    fetch('/api/cadbury/parties').then(res => res.json()).then(setParties).catch(() => {});
    fetch('/api/cadbury/routes').then(res => res.json()).then(setRoutes).catch(() => {});
    fetch('/api/cadbury/orders').then(res => res.json()).then(setOrders).catch(() => {});
    fetch('/api/cadbury/vehicles').then(res => res.json()).then(setVehicles).catch(() => {});
    fetch('/api/cadbury/loader-tasks').then(res => res.json()).then(setLoaderTasks).catch(() => {});
    fetch('/api/cadbury/payments').then(res => res.json()).then(setPayments).catch(() => {});
    fetch('/api/cadbury/returns').then(res => res.json()).then(setReturns).catch(() => {});
    fetch('/api/cadbury/users').then(res => res.json()).then(setUsers).catch(() => {});

    return () => {
      socket.disconnect();
    };
  }, []);

  // Handlers for Application Events
  const handleUpdateStage = async (orderId: string, newStage: GoodsStage) => {
    try {
      const res = await fetch(`/api/cadbury/orders/${orderId}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateVehicleStatus = async (vehicleId: string, status: Vehicle['status']) => {
    try {
      const res = await fetch(`/api/cadbury/vehicles/${vehicleId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setVehicles(prev => prev.map(v => v.id === vehicleId ? data.vehicle : v));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLoaderTask = async (taskId: string, updates: Partial<LoaderTask>) => {
    try {
      const res = await fetch(`/api/cadbury/loader-tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setLoaderTasks(prev => prev.map(t => t.id === taskId ? data.task : t));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteDelivery = async (orderId: string, payload: any) => {
    try {
      const res = await fetch(`/api/cadbury/delivery/${orderId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddParty = async (partyData: Partial<Party>) => {
    try {
      const res = await fetch('/api/cadbury/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partyData)
      });
      const data = await res.json();
      if (data.success) {
        setParties(prev => [...prev, data.party]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateOrder = async (orderData: Partial<Order>) => {
    try {
      const res = await fetch('/api/cadbury/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => [data.order, ...prev]);
        setActiveTab('pipeline');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportOrders = async (importedOrdersList: any[]) => {
    try {
      const res = await fetch('/api/cadbury/orders/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: importedOrdersList })
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => {
          const importedOrderNumbers = new Set(data.orders.map((o: any) => o.orderNumber));
          const rest = prev.filter(o => !importedOrderNumbers.has(o.orderNumber));
          return [...data.orders, ...rest];
        });
        fetch('/api/cadbury/loader-tasks').then(r => r.json()).then(setLoaderTasks).catch(() => {});
        fetch('/api/cadbury/parties').then(r => r.json()).then(setParties).catch(() => {});
        fetch('/api/cadbury/payments').then(r => r.json()).then(setPayments).catch(() => {});
        fetch('/api/cadbury/dashboard').then(r => r.json()).then(d => d.stats && setStats(d.stats)).catch(() => {});
        return data;
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleUpdateVehicleCrew = async (vehicleId: string, crewData: any) => {
    try {
      const res = await fetch(`/api/cadbury/vehicles/${vehicleId}/crew`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crewData)
      });
      const data = await res.json();
      if (data.success) {
        setVehicles(prev => prev.map(v => v.id === vehicleId ? data.vehicle : v));
        return data;
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleAddVehicle = async (vehData: any) => {
    try {
      const res = await fetch('/api/cadbury/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehData)
      });
      const data = await res.json();
      if (data.success) {
        setVehicles(prev => [...prev, data.vehicle]);
        return data;
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleRecordPayment = async (payData: any) => {
    try {
      const res = await fetch('/api/cadbury/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payData)
      });
      const data = await res.json();
      if (data.success) {
        setPayments(prev => [...prev, data.payment]);
        setParties(prev => prev.map(p => p.id === data.party.id ? data.party : p));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProductStock = async (prodId: string, updates: Partial<CadburyProduct>) => {
    try {
      const res = await fetch(`/api/cadbury/products/${prodId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setProducts(prev => prev.map(p => p.id === prodId ? data.product : p));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddReturn = async (returnData: Partial<SalesReturn>) => {
    try {
      const res = await fetch('/api/cadbury/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData)
      });
      const data = await res.json();
      if (data.success) {
        setReturns(prev => [data.returnItem, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveReturn = async (returnId: string) => {
    try {
      const res = await fetch(`/api/cadbury/returns/${returnId}/approve`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (data.success) {
        setReturns(prev => prev.map(r => r.id === returnId ? data.returnItem : r));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRoute = async (routeData: Partial<DeliveryRoute>) => {
    try {
      const res = await fetch('/api/cadbury/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeData)
      });
      const data = await res.json();
      if (data.success) {
        setRoutes(prev => [...prev, data.route]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetData = async () => {
    if (confirm('Reset Cadbury DMS to default seed demonstration data?')) {
      try {
        await fetch('/api/cadbury/reset-data', { method: 'POST' });
        window.location.reload();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const isAdminUser = currentUser.role === Role.ADMIN || currentUser.role === Role.SUPER_ADMIN;

  const handleSwitchUserRole = (newUser: AppUser) => {
    setCurrentUser(newUser);
    const isTargetAdmin = newUser.role === Role.ADMIN || newUser.role === Role.SUPER_ADMIN;
    if (isTargetAdmin || newUser.canAccessAdminDashboard || newUser.allowedModules?.includes('dashboard')) {
      setActiveTab('dashboard');
    } else if (newUser.role === Role.LOADER) {
      setActiveTab('loader');
    } else if (newUser.role === Role.DELIVERY_BOY) {
      setActiveTab('delivery_boy');
    } else if (newUser.role === Role.ACCOUNTANT) {
      setActiveTab('orders');
    } else if (newUser.role === Role.SALESMAN) {
      setActiveTab('orders');
    } else if (newUser.allowedModules && newUser.allowedModules.length > 0) {
      setActiveTab(newUser.allowedModules[0]);
    } else {
      setActiveTab('orders');
    }
  };

  const canAccessTab = (tab: string) => {
    if (isAdminUser) return true;
    if (tab === 'users') return false; // Users & Rights is strictly Admin only
    if (tab === 'dashboard') return !!(currentUser.canAccessAdminDashboard || currentUser.allowedModules?.includes('dashboard'));
    
    if (currentUser.allowedModules) {
      if (currentUser.allowedModules.includes(tab)) return true;
      if (['stock', 'stock_in', 'returns'].includes(tab) && currentUser.allowedModules.includes('inventory')) return true;
      if (['parties', 'ledger'].includes(tab) && currentUser.allowedModules.includes('parties')) return true;
      if (['orders', 'trip_sheet', 'evening_settlement', 'pipeline'].includes(tab) && currentUser.allowedModules.includes('orders')) return true;
      if (['loader', 'routes', 'delivery_boy'].includes(tab) && currentUser.allowedModules.includes('logistics')) return true;
      if (['ledger', 'outstanding'].includes(tab) && currentUser.allowedModules.includes('accounts')) return true;
      if (['map'].includes(tab) && currentUser.allowedModules.includes('tracking')) return true;
      return false;
    }
    return true;
  };

  // Get current active tab title
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Distributor Management Dashboard';
      case 'stock': return 'Inventory & Cadbury Product Stock';
      case 'stock_in': return 'Stock Inward & Batch Entry';
      case 'routes': return 'Route Planning & Geographic Territories';
      case 'pipeline': return 'Goods Flow Pipeline (Warehouse ➔ Route ➔ Party)';
      case 'map': return 'Live Fleet GPS Telematics & Route Map';
      case 'parties': return 'Party & Retailer Master Accounts';
      case 'orders': return 'Order Booking & Cadbury Tax Invoicing';
      case 'trip_sheet': return 'Step 1: Trip Dispatch & Loading Sheet (सुबह का लोडिंग चालान)';
      case 'evening_settlement': return 'Step 2: Evening Van Return & Cash Settlement (शाम की वैन वापसी व रोकड़ मिलान)';
      case 'loader': return 'Warehouse Loader Operations & Carton Counts';
      case 'delivery_boy': return 'Delivery Boy Mobile Dashboard & POD';
      case 'returns': return 'Sales Return & Damaged Goods Management';
      case 'ledger': return 'Payment Collection & Party Ledger';
      case 'outstanding': return 'Party Outstanding & Dues Collection';
      case 'reports': return 'Executive Reports, Audits & Excel Exports';
      case 'users': return 'User Accounts & Access Rights (RBAC)';
      default: return 'Cadbury Distributor DMS';
    }
  };

  // If logged out, render standalone Login Screen
  if (!isAuthenticated) {
    return (
      <LoginScreen
        users={users}
        onLogin={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          handleSwitchUserRole(user);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* 1. Left-Side Collapsible Enterprise Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpenMobile={isMobileSidebarOpen}
        setIsOpenMobile={setIsMobileSidebarOpen}
        currentUser={currentUser}
      />

      {/* 2. Main Application Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger button for mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all"
            >
              <i className="fa-solid fa-bars text-sm"></i>
            </button>

            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {getTabTitle()}
              </h2>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Cadbury Authorized Distributor & Logistics Management System
              </p>
            </div>
          </div>

          {/* Right Header Widgets */}
          <div className="flex items-center gap-2.5">
            {/* GPS Telemetry Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{socketConnected ? 'GPS Live Stream' : 'Connecting...'}</span>
            </div>

            {/* Quick Role Switcher - ONLY FOR ADMIN */}
            {isAdminUser ? (
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                <i className="fa-solid fa-user-gear text-cadbury-700"></i>
                <select
                  value={currentUser.id}
                  onChange={(e) => {
                    const u = users.find(user => user.id === e.target.value);
                    if (u) handleSwitchUserRole(u);
                  }}
                  className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer"
                  title="एडमिन द्वारा टेस्ट करने हेतु रोल स्विच करें"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold">
                <i className="fa-solid fa-user-check text-emerald-600"></i>
                <span className="truncate max-w-[140px]">{currentUser.name.split(' ')[0]} ({currentUser.role})</span>
              </div>
            )}

            {/* Reset Button */}
            <button
              onClick={handleResetData}
              title="Reset Seed Demo Data"
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs transition-all"
            >
              <i className="fa-solid fa-rotate"></i>
            </button>

            {/* Logout Button */}
            <button
              onClick={() => setIsAuthenticated(false)}
              title="Logout / Role Login Screen"
              className="px-3 py-1.5 rounded-xl bg-cadbury-50 hover:bg-cadbury-100 text-cadbury-900 border border-cadbury-200 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <i className="fa-solid fa-right-from-bracket text-cadbury-700"></i>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Dynamic View Body with Access Permission Verification */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <ErrorBoundary>
            {!canAccessTab(activeTab) ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-lg mx-auto space-y-4 shadow-xl my-12 animate-fadeIn">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">
                  <i className="fa-solid fa-lock"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900">सुरक्षा प्रतिबंध (Access Restricted)</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  आपके यूजर आईडी <strong>(@{currentUser.username})</strong> को इस मॉड्यूल का एक्सेस नहीं दिया गया है। 
                  एडमिन डैशबोर्ड और गोपनीय डेटा सुरक्षित है।
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold">
                  यदि आपको इस कार्य की आवश्यकता है, तो कृपया डिस्ट्रीब्यूटर एडमिन से संपर्क करें।
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const fallback = (currentUser.allowedModules && currentUser.allowedModules.length > 0)
                      ? currentUser.allowedModules[0]
                      : 'orders';
                    setActiveTab(fallback);
                  }}
                  className="px-5 py-2.5 bg-cadbury-900 hover:bg-cadbury-950 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  <span>अनुमत सेक्शन पर वापस जाएं</span>
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <Dashboard
                    stats={stats}
                    vehicles={vehicles}
                    orders={orders}
                    parties={parties}
                    products={products}
                    onNavigateTab={setActiveTab}
                    onUpdateStage={handleUpdateStage}
                  />
                )}

                {(activeTab === 'stock' || activeTab === 'stock_in') && (
                  <StockInventoryManagement
                    products={products}
                    onUpdateProductStock={handleUpdateProductStock}
                  />
                )}

                {activeTab === 'routes' && (
                  <RouteManagement
                    routes={routes}
                    parties={parties}
                    vehicles={vehicles}
                    onAddRoute={handleAddRoute}
                  />
                )}

                {activeTab === 'pipeline' && (
                  <GoodsTrackingPipeline
                    orders={orders}
                    onUpdateStage={handleUpdateStage}
                  />
                )}

                {activeTab === 'map' && (
                  <LiveVehicleMap
                    vehicles={vehicles}
                    orders={orders}
                    onUpdateVehicleStatus={handleUpdateVehicleStatus}
                    onUpdateVehicleCrew={handleUpdateVehicleCrew}
                    onAddNewVehicle={handleAddVehicle}
                  />
                )}

                {activeTab === 'parties' && (
                  <PartyManagement
                    parties={parties}
                    orders={orders}
                    payments={payments}
                    onAddParty={handleAddParty}
                    onUpdateParty={() => {}}
                    onSelectPartyLedger={() => setActiveTab('ledger')}
                  />
                )}

                {(activeTab === 'orders' || activeTab === 'trip_sheet' || activeTab === 'evening_settlement') && (
                  <OrderBillingManagement
                    products={products}
                    parties={parties}
                    orders={orders}
                    vehicles={vehicles}
                    currentUser={currentUser}
                    initialActiveView={activeTab === 'trip_sheet' ? 'trip_sheet' : activeTab === 'evening_settlement' ? 'evening_settlement' : 'orders'}
                    onCreateOrder={handleCreateOrder}
                    onImportOrders={handleImportOrders}
                    onAddNewVehicle={handleAddVehicle}
                  />
                )}

                {activeTab === 'loader' && (
                  <LoaderDashboard
                    loaderTasks={loaderTasks}
                    orders={orders}
                    onUpdateLoaderTask={handleUpdateLoaderTask}
                  />
                )}

                {activeTab === 'delivery_boy' && (
                  <DeliveryBoyMobile
                    orders={orders}
                    onCompleteDelivery={handleCompleteDelivery}
                  />
                )}

                {activeTab === 'returns' && (
                  <ReturnDamageManagement
                    returns={returns}
                    parties={parties}
                    orders={orders}
                    products={products}
                    onAddReturn={handleAddReturn}
                    onApproveReturn={handleApproveReturn}
                  />
                )}

                {(activeTab === 'ledger' || activeTab === 'outstanding') && (
                  <HisabKitabLedger
                    parties={parties}
                    payments={payments}
                    orders={orders}
                    onRecordPayment={handleRecordPayment}
                  />
                )}

                {activeTab === 'reports' && (
                  <ReportsAnalytics
                    orders={orders}
                    parties={parties}
                    products={products}
                    vehicles={vehicles}
                    loaderTasks={loaderTasks}
                    payments={payments}
                    returns={returns}
                  />
                )}

                {activeTab === 'users' && (
                  <UserRoleManagement
                    users={users}
                    activeUser={currentUser}
                    onSwitchUser={handleSwitchUserRole}
                    onUserCreated={(newUser) => setUsers(prev => [...prev, newUser])}
                    onUserUpdated={(updatedUser) => setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))}
                    onUserDeleted={(deletedId) => setUsers(prev => prev.filter(u => u.id !== deletedId))}
                  />
                )}
              </>
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default App;
