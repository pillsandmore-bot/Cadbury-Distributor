import React, { useState } from 'react';
import { Order, GoodsStage } from '../types/cadbury';

interface GoodsTrackingPipelineProps {
  orders: Order[];
  onUpdateStage: (orderId: string, newStage: GoodsStage) => void;
  onSelectOrder?: (order: Order) => void;
}

export const GoodsTrackingPipeline: React.FC<GoodsTrackingPipelineProps> = ({
  orders,
  onUpdateStage,
  onSelectOrder
}) => {
  const [filterStage, setFilterStage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const stages = [
    { key: GoodsStage.WAREHOUSE, label: 'Warehouse Stock', icon: 'fa-warehouse', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { key: GoodsStage.LOADING, label: 'Under Loading', icon: 'fa-box-open', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { key: GoodsStage.LOADED, label: 'Vehicle Loaded', icon: 'fa-truck-loading', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { key: GoodsStage.IN_TRANSIT, label: 'Out on Route', icon: 'fa-truck', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { key: GoodsStage.DELIVERED, label: 'Party Delivered', icon: 'fa-store', color: 'bg-teal-100 text-teal-800 border-teal-300' },
    { key: GoodsStage.PAYMENT_PENDING, label: 'Payment Pending', icon: 'fa-clock', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    { key: GoodsStage.COMPLETED, label: 'Fully Settled', icon: 'fa-circle-check', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
  ];

  const getStageCounts = (stageKey: GoodsStage) => {
    return orders.filter(o => o.stage === stageKey).length;
  };

  const getStageCartons = (stageKey: GoodsStage) => {
    return orders
      .filter(o => o.stage === stageKey)
      .reduce((sum, o) => sum + (o.totalCartons || 0), 0);
  };

  const filteredOrders = orders.filter(o => {
    const matchesStage = filterStage === 'ALL' || o.stage === filterStage;
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.vehicleNumber && o.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.partyArea.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Goods Flow Explanation */}
      <div className="bg-gradient-to-r from-cadbury-900 to-cadbury-700 text-white p-6 rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
              <i className="fa-solid fa-boxes-stacked text-gold-400"></i> Cadbury Goods Flow Lifecycle
            </div>
            <h2 className="text-2xl font-bold">Complete Goods Tracking System</h2>
            <p className="text-sm text-cadbury-200 mt-1">
              Track chocolates from Warehouse Loading Bay to Vehicle Dispatch, Live Route, Store Delivery & Final Payment.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-white/10 px-4 py-2 rounded-xl text-center backdrop-blur-sm border border-white/10">
              <span className="block text-xl font-extrabold text-gold-400">{orders.length}</span>
              <span className="text-xs text-white/80">Active Shipments</span>
            </span>
            <span className="bg-white/10 px-4 py-2 rounded-xl text-center backdrop-blur-sm border border-white/10">
              <span className="block text-xl font-extrabold text-emerald-300">
                {orders.reduce((sum, o) => sum + (o.totalCartons || 0), 0)}
              </span>
              <span className="text-xs text-white/80">Total Cartons</span>
            </span>
          </div>
        </div>

        {/* Visual Pipeline Funnel Flow */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 mt-6 pt-6 border-t border-white/15">
          {stages.map((st, idx) => {
            const count = getStageCounts(st.key);
            const cartons = getStageCartons(st.key);
            const isSelected = filterStage === st.key;
            return (
              <button
                key={st.key}
                onClick={() => setFilterStage(isSelected ? 'ALL' : st.key)}
                className={`flex flex-col items-start p-3 rounded-xl transition-all text-left relative overflow-hidden ${
                  isSelected
                    ? 'bg-white text-cadbury-900 font-semibold shadow-lg scale-105 ring-2 ring-gold-400'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs opacity-75 font-mono">0{idx + 1}</span>
                  <i className={`fa-solid ${st.icon} text-sm ${isSelected ? 'text-cadbury-700' : 'text-gold-400'}`}></i>
                </div>
                <div className="text-xs font-bold truncate w-full">{st.label}</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-black">{count}</span>
                  <span className="text-[10px] opacity-75">orders</span>
                </div>
                <div className="text-[10px] opacity-80 font-medium">
                  {cartons} cartons
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search by Order ID (ORD-CAD-...), Party Name, Area, or Vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cadbury-600 focus:border-transparent"
            />
          </div>
          {filterStage !== 'ALL' && (
            <button
              onClick={() => setFilterStage('ALL')}
              className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1"
            >
              <i className="fa-solid fa-xmark"></i> Clear Filter
            </button>
          )}
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{filteredOrders.length}</span> orders
        </div>
      </div>

      {/* Goods Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredOrders.map((order) => {
          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-cadbury-800 bg-cadbury-50 px-2 py-0.5 rounded border border-cadbury-200">
                    {order.orderNumber}
                  </span>
                  <span className="text-[11px] text-slate-500 ml-2">
                    <i className="fa-regular fa-calendar mr-1"></i>
                    {order.orderDate}
                  </span>
                </div>
                {/* Stage Badge */}
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                    order.stage === GoodsStage.COMPLETED
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.stage === GoodsStage.DELIVERED
                      ? 'bg-teal-100 text-teal-800'
                      : order.stage === GoodsStage.IN_TRANSIT
                      ? 'bg-purple-100 text-purple-800'
                      : order.stage === GoodsStage.LOADED
                      ? 'bg-indigo-100 text-indigo-800'
                      : order.stage === GoodsStage.LOADING
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                  {order.stage}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 space-y-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{order.partyName}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <i className="fa-solid fa-location-dot text-red-500"></i>
                    {order.partyArea} - {order.partyAddress}
                  </p>
                </div>

                {/* Items & Cartons Summary */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Cartons</span>
                    <span className="font-black text-slate-800 text-sm">{order.totalCartons} Box</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Bill Total</span>
                    <span className="font-black text-cadbury-700 text-sm">₹{(order.totalBill ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment</span>
                    <span
                      className={`font-bold ${
                        order.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Operational Assignments */}
                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <i className="fa-solid fa-person-dolly text-cadbury-600"></i> Loader:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {order.loaderName || 'Unassigned'} ({order.loadingStatus})
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <i className="fa-solid fa-truck text-cadbury-600"></i> Vehicle:
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {order.vehicleNumber || 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <i className="fa-solid fa-motorcycle text-cadbury-600"></i> Delivery Boy:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {order.deliveryBoyName || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Stage Progression Bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                    <span>Warehouse</span>
                    <span>Loading</span>
                    <span>Transit</span>
                    <span>Delivered</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cadbury-600 to-emerald-500 h-full transition-all duration-500"
                      style={{
                        width:
                          order.stage === GoodsStage.COMPLETED
                            ? '100%'
                            : order.stage === GoodsStage.DELIVERED
                            ? '85%'
                            : order.stage === GoodsStage.IN_TRANSIT
                            ? '60%'
                            : order.stage === GoodsStage.LOADED
                            ? '40%'
                            : order.stage === GoodsStage.LOADING
                            ? '25%'
                            : '10%'
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Action Buttons to Advance Goods Stage */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 font-medium">Quick Stage Change:</span>
                <div className="flex items-center gap-1.5">
                  {order.stage === GoodsStage.WAREHOUSE && (
                    <button
                      onClick={() => onUpdateStage(order.id, GoodsStage.LOADING)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1"
                    >
                      <i className="fa-solid fa-box"></i> Start Loading
                    </button>
                  )}
                  {order.stage === GoodsStage.LOADING && (
                    <button
                      onClick={() => onUpdateStage(order.id, GoodsStage.LOADED)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1"
                    >
                      <i className="fa-solid fa-check"></i> Mark Loaded
                    </button>
                  )}
                  {order.stage === GoodsStage.LOADED && (
                    <button
                      onClick={() => onUpdateStage(order.id, GoodsStage.IN_TRANSIT)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1"
                    >
                      <i className="fa-solid fa-truck-fast"></i> Dispatch On Route
                    </button>
                  )}
                  {order.stage === GoodsStage.IN_TRANSIT && (
                    <button
                      onClick={() => onUpdateStage(order.id, GoodsStage.DELIVERED)}
                      className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1"
                    >
                      <i className="fa-solid fa-store"></i> Mark Delivered
                    </button>
                  )}
                  {order.stage === GoodsStage.DELIVERED && (
                    <button
                      onClick={() => onUpdateStage(order.id, GoodsStage.COMPLETED)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1"
                    >
                      <i className="fa-solid fa-money-bill-wave"></i> Settle Payment
                    </button>
                  )}
                  {order.stage === GoodsStage.COMPLETED && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <i className="fa-solid fa-circle-check"></i> Finished
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
