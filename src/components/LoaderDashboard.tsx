import React, { useState } from 'react';
import { LoaderTask, Order } from '../types/cadbury';

interface LoaderDashboardProps {
  loaderTasks: LoaderTask[];
  orders: Order[];
  onUpdateLoaderTask: (taskId: string, updates: Partial<LoaderTask>) => void;
}

export const LoaderDashboard: React.FC<LoaderDashboardProps> = ({
  loaderTasks,
  orders,
  onUpdateLoaderTask
}) => {
  const [selectedLoader, setSelectedLoader] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loaders = Array.from(new Set(loaderTasks.map(t => t.loaderName)));

  const filteredTasks = loaderTasks.filter(task => {
    const matchesLoader = selectedLoader === 'ALL' || task.loaderName === selectedLoader;
    const matchesSearch = 
      task.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'ACTIVE' 
      ? (task.status === 'Pending' || task.status === 'Loading')
      : (task.status === 'Loaded' || task.status === 'Verified');
    return matchesLoader && matchesSearch && matchesTab;
  });

  const totalCartonsTarget = loaderTasks.reduce((sum, t) => sum + t.cartonsToLoad, 0);
  const totalCartonsLoaded = loaderTasks.reduce((sum, t) => sum + t.cartonsLoaded, 0);

  const handleIncrement = (task: LoaderTask, delta: number) => {
    const newCount = Math.min(task.cartonsToLoad, Math.max(0, task.cartonsLoaded + delta));
    const newStatus = newCount === task.cartonsToLoad ? 'Loaded' : 'Loading';
    onUpdateLoaderTask(task.id, {
      cartonsLoaded: newCount,
      status: newStatus
    });
  };

  const handleCompleteAll = (task: LoaderTask) => {
    onUpdateLoaderTask(task.id, {
      cartonsLoaded: task.cartonsToLoad,
      status: 'Loaded',
      notes: `Verified 100% loaded (${task.cartonsToLoad}/${task.cartonsToLoad})`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <i className="fa-solid fa-boxes-packing text-yellow-300"></i> Warehouse Dispatch Bay
          </div>
          <h2 className="text-2xl font-black">Loader Operations & Carton Tracking</h2>
          <p className="text-xs text-blue-200 mt-1">
            Loader-specific mobile screen to scan and verify Cadbury chocolate carton loading into delivery vans.
          </p>
        </div>

        {/* Loader Profile Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 flex items-center gap-2">
            <span className="text-xs text-blue-200 font-semibold pl-2">Logged in Loader:</span>
            <select
              value={selectedLoader}
              onChange={(e) => setSelectedLoader(e.target.value)}
              className="bg-blue-950 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-700 focus:outline-none"
            >
              <option value="ALL">All Loaders (Overview)</option>
              {loaders.map(l => (
                <option key={l} value={l}>👷 {l}</option>
              ))}
            </select>
          </div>

          <div className="bg-white/10 px-4 py-2 rounded-xl text-center border border-white/20">
            <span className="block text-xl font-extrabold text-yellow-300">{totalCartonsLoaded} / {totalCartonsTarget}</span>
            <span className="text-[10px] text-blue-200 uppercase font-semibold">Cartons Loaded Today</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'ACTIVE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <i className="fa-solid fa-clock"></i> Active Loading Tasks
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
              {loaderTasks.filter(t => t.status === 'Pending' || t.status === 'Loading').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'HISTORY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <i className="fa-solid fa-circle-check"></i> Completed & Verified
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
              {loaderTasks.filter(t => t.status === 'Loaded' || t.status === 'Verified').length}
            </span>
          </button>
        </div>

        <div className="relative">
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input
            type="text"
            placeholder="Search Order, Party, Vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-full sm:w-64"
          />
        </div>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200">
            <i className="fa-solid fa-boxes-packing text-4xl text-slate-300 mb-3 block"></i>
            <h4 className="text-base font-bold text-slate-700">No Loading Tasks in this View</h4>
            <p className="text-xs text-slate-400 mt-1">Select a different tab or loader filter.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const correspondingOrder = orders.find(o => o.orderNumber === task.orderNumber);
            const isFinished = task.status === 'Loaded' || task.status === 'Verified';
            const percent = task.cartonsToLoad > 0 ? Math.round((task.cartonsLoaded / task.cartonsToLoad) * 100) : 0;

            return (
              <div
                key={task.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                      {task.orderNumber}
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                      <i className="fa-solid fa-truck text-slate-500 mr-1"></i>
                      {task.vehicleNumber}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      task.status === 'Loaded'
                        ? 'bg-emerald-100 text-emerald-800'
                        : task.status === 'Loading'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <i
                      className={`fa-solid ${
                        task.status === 'Loaded' ? 'fa-check' : 'fa-spinner fa-spin'
                      } text-[10px]`}
                    ></i>
                    {task.status}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">{task.partyName}</h4>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <i className="fa-solid fa-user-gear text-slate-400"></i>
                      Loader: <strong className="text-slate-700">{task.loaderName}</strong> ({task.employeeId})
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  {correspondingOrder && correspondingOrder.items && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Cadbury Products in Order:
                      </span>
                      {correspondingOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-slate-700">
                          <span className="truncate pr-2 font-medium">• {item.productName}</span>
                          <span className="font-bold whitespace-nowrap">{item.cartons} Box</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Carton Counter Controls */}
                  <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-blue-900">Cartons Loaded in Van:</span>
                      <span className="font-black text-blue-950 text-base">
                        {task.cartonsLoaded} <span className="text-xs font-normal text-blue-700">/ {task.cartonsToLoad} Boxes</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-blue-200/70 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>

                    {/* Increment / Decrement Buttons for Loader */}
                    {!isFinished && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          onClick={() => handleIncrement(task, -1)}
                          disabled={task.cartonsLoaded <= 0}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center shadow-sm"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleIncrement(task, +1)}
                          disabled={task.cartonsLoaded >= task.cartonsToLoad}
                          className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center shadow-sm"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleIncrement(task, +5)}
                          disabled={task.cartonsLoaded >= task.cartonsToLoad}
                          className="px-3 h-10 rounded-xl bg-blue-100 text-blue-800 font-bold hover:bg-blue-200 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center shadow-sm text-xs"
                        >
                          +5 Box
                        </button>
                        <button
                          onClick={() => handleCompleteAll(task)}
                          className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm text-xs"
                        >
                          <i className="fa-solid fa-check-double"></i> Load All
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Notes / Remarks */}
                  {task.notes && (
                    <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                      <i className="fa-regular fa-comment-dots mr-1"></i> {task.notes}
                    </div>
                  )}
                </div>

                {/* Footer Status Bar */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">
                    Updated: {task.updatedAt}
                  </span>
                  {isFinished && (
                    <button
                      onClick={() =>
                        onUpdateLoaderTask(task.id, {
                          status: 'Loading',
                          notes: 'Re-opened for count check'
                        })
                      }
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Edit Counts
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
