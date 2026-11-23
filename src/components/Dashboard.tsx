import React from 'react';
import { 
  DMSDashboardStats, 
  Vehicle, 
  Order, 
  Party, 
  GoodsStage,
  CadburyProduct 
} from '../types/cadbury';

interface DashboardProps {
  stats: DMSDashboardStats;
  vehicles: Vehicle[];
  orders: Order[];
  parties: Party[];
  products: CadburyProduct[];
  onNavigateTab: (tabId: string) => void;
  onUpdateStage: (orderId: string, stage: GoodsStage) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats = {} as DMSDashboardStats,
  vehicles = [],
  orders = [],
  parties = [],
  products = [],
  onNavigateTab,
  onUpdateStage
}) => {
  const safeVehiclesList = vehicles || [];
  const safeOrdersList = orders || [];
  const safePartiesList = parties || [];
  const safeProductsList = products || [];

  const activeVehiclesCount = safeVehiclesList.filter(v => v?.status === 'On Delivery Route').length || 0;
  const lowStockProducts = safeProductsList.filter(p => (p?.stockCartons ?? 0) <= (p?.minStockAlert ?? 0)) || [];

  const safeSales = (stats?.todaysSales ?? 0).toLocaleString('en-IN');
  const safeTotalOrders = stats?.totalOrders ?? safeOrdersList.length ?? 0;
  const safeDelivered = stats?.deliveredCount ?? stats?.totalDelivery ?? safeOrdersList.filter(o => o?.deliveryStatus === 'Delivered').length ?? 0;
  const safePending = stats?.pendingDelivery ?? (safeTotalOrders - safeDelivered) ?? 0;
  const safeCollection = (stats?.dailyCollection ?? stats?.todaysCollection ?? 0).toLocaleString('en-IN');
  const safeCash = (stats?.cashCollectedToday ?? 0).toLocaleString('en-IN');
  const safeUpi = (stats?.upiCollectedToday ?? 0).toLocaleString('en-IN');
  const safeOutstanding = (stats?.pendingPayment ?? stats?.marketOutstanding ?? 0).toLocaleString('en-IN');
  const safeParties = stats?.totalParties ?? safePartiesList.length ?? 0;
  const safeVehicles = safeVehiclesList.length || stats?.totalVehicles || 0;
  const safeCartonsLoaded = stats?.cartonsLoadedToday ?? 0;

  const kpis = [
    {
      label: "Today's Sales",
      value: `₹${safeSales}`,
      sub: `${safeTotalOrders} total orders booked`,
      icon: 'fa-chart-line',
      gradient: 'from-purple-600 to-indigo-700',
      tab: 'orders'
    },
    {
      label: 'Deliveries Done',
      value: `${safeDelivered} / ${safeTotalOrders}`,
      sub: `${safePending} deliveries pending`,
      icon: 'fa-circle-check',
      gradient: 'from-emerald-600 to-teal-700',
      tab: 'delivery_boy'
    },
    {
      label: 'Daily Collection',
      value: `₹${safeCollection}`,
      sub: `Cash: ₹${safeCash} | UPI: ₹${safeUpi}`,
      icon: 'fa-money-bill-wave',
      gradient: 'from-blue-600 to-cyan-700',
      tab: 'ledger'
    },
    {
      label: 'Market Outstanding',
      value: `₹${safeOutstanding}`,
      sub: `Across ${safeParties} retail stores`,
      icon: 'fa-file-invoice-dollar',
      gradient: 'from-rose-600 to-amber-700',
      tab: 'parties'
    },
    {
      label: 'Active Vans on Road',
      value: `${activeVehiclesCount} / ${safeVehicles}`,
      sub: 'Live GPS tracking active',
      icon: 'fa-truck-fast',
      gradient: 'from-indigo-600 to-purple-800',
      tab: 'map'
    },
    {
      label: 'Cartons Loaded Today',
      value: `${safeCartonsLoaded} Box`,
      sub: 'Verified by warehouse loaders',
      icon: 'fa-boxes-packing',
      gradient: 'from-amber-600 to-orange-700',
      tab: 'loader'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-cadbury-950 via-cadbury-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-gold-400 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Cadbury Real-Time Operations Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Distributor Management & Live Goods Tracking
            </h1>
            <p className="text-sm text-cadbury-200 mt-2 max-w-2xl leading-relaxed">
              Complete dispatch tracking from <strong>Warehouse Loading Bay</strong> to <strong>Vehicle GPS Route</strong>, 
              <strong>Retailer Store Delivery</strong>, and <strong>Cash/UPI Payment Collection</strong>.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigateTab('orders')}
              className="px-4 py-2.5 bg-gold-500 hover:bg-gold-600 text-cadbury-950 text-xs font-extrabold rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-plus-circle"></i> New Cadbury Order
            </button>
            <button
              onClick={() => onNavigateTab('map')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl backdrop-blur-md active:scale-95 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-map-location-dot text-gold-400"></i> Live GPS Map
            </button>
            <button
              onClick={() => onNavigateTab('delivery_boy')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-motorcycle"></i> Delivery Boy App
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            onClick={() => onNavigateTab(kpi.tab)}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${kpi.gradient} text-white flex items-center justify-center text-xs shadow-sm group-hover:scale-110 transition-transform`}>
                  <i className={`fa-solid ${kpi.icon}`}></i>
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 group-hover:text-cadbury-900 transition-colors">
                {kpi.value}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="truncate pr-1">{kpi.sub}</span>
              <i className="fa-solid fa-chevron-right text-[8px] text-slate-400 group-hover:translate-x-0.5 transition-transform"></i>
            </div>
          </div>
        ))}
      </div>

      {/* Mid Section: Goods Flow Timeline & Fleet GPS Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goods Pipeline Flow Widget (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-800">Maal Ka Status (End-to-End Pipeline)</h3>
              <p className="text-xs text-slate-500">Live order flow across Warehouse, Loading, Vehicle, Transit and Delivery</p>
            </div>
            <button
              onClick={() => onNavigateTab('pipeline')}
              className="text-xs font-bold text-cadbury-700 hover:text-cadbury-900 flex items-center gap-1"
            >
              Full Funnel <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>

          {/* Stepper Pipeline Flow Visual */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
              <i className="fa-solid fa-warehouse text-amber-600 text-base mb-1 block"></i>
              <span className="font-bold text-slate-800 block text-[11px]">Warehouse</span>
              <span className="text-lg font-black text-amber-800">
                {safeOrdersList.filter(o => o?.stage === GoodsStage.WAREHOUSE).length}
              </span>
              <span className="text-[9px] text-slate-400 block">Orders</span>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
              <i className="fa-solid fa-box-open text-blue-600 text-base mb-1 block"></i>
              <span className="font-bold text-slate-800 block text-[11px]">Loading</span>
              <span className="text-lg font-black text-blue-800">
                {safeOrdersList.filter(o => o?.stage === GoodsStage.LOADING).length}
              </span>
              <span className="text-[9px] text-slate-400 block">Orders</span>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl">
              <i className="fa-solid fa-truck-loading text-indigo-600 text-base mb-1 block"></i>
              <span className="font-bold text-slate-800 block text-[11px]">Loaded</span>
              <span className="text-lg font-black text-indigo-800">
                {safeOrdersList.filter(o => o?.stage === GoodsStage.LOADED).length}
              </span>
              <span className="text-[9px] text-slate-400 block">Orders</span>
            </div>

            <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl">
              <i className="fa-solid fa-truck-fast text-purple-600 text-base mb-1 block"></i>
              <span className="font-bold text-slate-800 block text-[11px]">In Transit</span>
              <span className="text-lg font-black text-purple-800">
                {safeOrdersList.filter(o => o?.stage === GoodsStage.IN_TRANSIT).length}
              </span>
              <span className="text-[9px] text-slate-400 block">Orders</span>
            </div>

            <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl">
              <i className="fa-solid fa-store text-teal-600 text-base mb-1 block"></i>
              <span className="font-bold text-slate-800 block text-[11px]">Delivered</span>
              <span className="text-lg font-black text-teal-800">
                {safeOrdersList.filter(o => o?.stage === GoodsStage.DELIVERED).length}
              </span>
              <span className="text-[9px] text-slate-400 block">Orders</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
              <i className="fa-solid fa-circle-check text-emerald-600 text-base mb-1 block"></i>
              <span className="font-bold text-slate-800 block text-[11px]">Settled</span>
              <span className="text-lg font-black text-emerald-800">
                {safeOrdersList.filter(o => o?.stage === GoodsStage.COMPLETED).length}
              </span>
              <span className="text-[9px] text-slate-400 block">Paid</span>
            </div>
          </div>

          {/* Active Shipments Table Snippet */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Order</th>
                  <th className="py-2.5 px-3">Retail Party</th>
                  <th className="py-2.5 px-3">Cartons</th>
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3">Current Status</th>
                  <th className="py-2.5 px-3 text-right">Bill Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safeOrdersList.slice(0, 5).map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-cadbury-900">{ord.orderNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{ord.partyName}</td>
                    <td className="py-2.5 px-3 font-bold">{ord.totalCartons ?? 0} Box</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">{ord.vehicleNumber || '-'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {ord.stage}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      ₹{(ord.totalBill ?? 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Delivery Vans Mini Widget (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800">Fleet GPS Telematics</h3>
                <p className="text-xs text-slate-500">Live vans and AC compartment temperature</p>
              </div>
              <button
                onClick={() => onNavigateTab('map')}
                className="text-xs font-bold text-cadbury-700 hover:text-cadbury-900 flex items-center gap-1"
              >
                Open Map <i className="fa-solid fa-map text-[10px]"></i>
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {safeVehiclesList.map((v) => (
                <div
                  key={v.id}
                  onClick={() => onNavigateTab('map')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-cadbury-300 hover:bg-cadbury-50/20 transition-all cursor-pointer text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-slate-800">{v.vehicleNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.status === 'On Delivery Route'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Driver: <strong>{v.driverName}</strong></span>
                    <span>Speed: <strong>{v.speedKmH} km/h</strong></span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <i className="fa-solid fa-snowflake"></i> {v.temperatureC}°C AC Cabin
                    </span>
                    <span className="text-slate-600 font-semibold">
                      {v.deliveredOrders}/{v.totalAssignedOrders} Parties Done
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chocolate Stock Alert Mini Banner */}
          {lowStockProducts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs flex items-center gap-2 text-amber-800 mt-2">
              <i className="fa-solid fa-triangle-exclamation text-amber-600 text-base"></i>
              <div>
                <strong>Low Stock Notice:</strong> {lowStockProducts.length} Cadbury items below minimum reserve!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
