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
    name: 'Amar Sharma (Admin / Owner)',
    username: 'admin',
    role: Role.ADMIN,
    phone: '9820011223',
    email: 'admin@cadburydistributor.com',
    employeeId: 'CAD-ADM-01'
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

  const handleSwitchUserRole = (newUser: AppUser) => {
    setCurrentUser(newUser);
    if (newUser.role === Role.LOADER) {
      setActiveTab('loader');
    } else if (newUser.role === Role.DELIVERY_BOY) {
      setActiveTab('delivery_boy');
    } else if (newUser.role === Role.ACCOUNTANT) {
      setActiveTab('ledger');
    } else {
      setActiveTab('dashboard');
    }
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

            {/* Quick Role Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
              <i className="fa-solid fa-user-gear text-cadbury-700"></i>
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const u = users.find(user => user.id === e.target.value);
                  if (u) handleSwitchUserRole(u);
                }}
                className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

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

        {/* Dynamic View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <ErrorBoundary>
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

            {activeTab === 'orders' && (
              <OrderBillingManagement
                products={products}
                parties={parties}
                orders={orders}
                vehicles={vehicles}
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
              />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default App;
