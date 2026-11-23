import React, { useState } from 'react';
import { DeliveryRoute, Party, Vehicle } from '../types/cadbury';

interface RouteManagementProps {
  routes: DeliveryRoute[];
  parties: Party[];
  vehicles: Vehicle[];
  onAddRoute?: (route: Partial<DeliveryRoute>) => void;
  onAssignPartyRoute?: (partyId: string, routeId: string) => void;
}

export const RouteManagement: React.FC<RouteManagementProps> = ({
  routes,
  parties,
  vehicles,
  onAddRoute
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    routes.length > 0 ? routes[0].id : ''
  );
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState<boolean>(false);
  const [newRouteName, setNewRouteName] = useState<string>('');
  const [newRouteCode, setNewRouteCode] = useState<string>('');
  const [newRouteAreas, setNewRouteAreas] = useState<string>('');

  const selectedRoute = routes.find(r => r.id === selectedRouteId) || routes[0];

  const partiesInSelectedRoute = parties.filter(p => 
    p.routeId === (selectedRoute ? selectedRoute.id : '') ||
    (selectedRoute && selectedRoute.areas.some(a => p.area.toLowerCase().includes(a.toLowerCase())))
  );

  const handleCreateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteName || !newRouteCode) return;

    if (onAddRoute) {
      onAddRoute({
        id: `rt-${Date.now()}`,
        code: newRouteCode,
        name: newRouteName,
        areas: newRouteAreas.split(',').map(a => a.trim()).filter(Boolean),
        totalParties: 0,
        activeOrders: 0
      });
    }

    setIsNewRouteModalOpen(false);
    setNewRouteName('');
    setNewRouteCode('');
    setNewRouteAreas('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cadbury-950 via-indigo-950 to-cadbury-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <i className="fa-solid fa-route text-gold-400"></i> Route Planning & Territory
          </div>
          <h2 className="text-2xl font-black">Area-Wise Delivery Route Management</h2>
          <p className="text-xs text-cadbury-200 mt-1">
            Organize retail shops by geographic routes to optimize delivery sequences and eliminate driver backtracking.
          </p>
        </div>

        <button
          onClick={() => setIsNewRouteModalOpen(true)}
          className="px-4 py-3 bg-gold-500 hover:bg-gold-600 text-cadbury-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all"
        >
          <i className="fa-solid fa-plus-circle"></i> Create New Route
        </button>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {routes.map((rt) => {
          const isSelected = selectedRoute && rt.id === selectedRoute.id;
          const assignedParties = parties.filter(p => 
            p.routeId === rt.id || rt.areas.some(a => p.area.toLowerCase().includes(a.toLowerCase()))
          );

          return (
            <div
              key={rt.id}
              onClick={() => setSelectedRouteId(rt.id)}
              className={`bg-white rounded-2xl border p-5 shadow-sm transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-cadbury-600 ring-2 ring-cadbury-500 shadow-md bg-cadbury-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-cadbury-900 bg-cadbury-100 px-2 py-0.5 rounded">
                    {rt.code}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    <i className="fa-solid fa-store mr-1 text-slate-400"></i>
                    {assignedParties.length} Shops
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-800">{rt.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{rt.description}</p>

                {/* Assigned Vehicle & Driver */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1 mt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Van:</span>
                    <span className="font-mono font-bold text-slate-800">{rt.assignedVehicleNumber || 'Auto-Assigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver:</span>
                    <span className="font-semibold text-slate-800">{rt.assignedDriverName || 'Santosh Yadav'}</span>
                  </div>
                </div>

                {/* Area Tags */}
                <div className="mt-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Coverage Areas:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {rt.areas.map(area => (
                      <span key={area} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                <span className="text-cadbury-700 font-bold">
                  {isSelected ? '✓ Viewing Route Stops' : 'Click to View Stops'}
                </span>
                <i className="fa-solid fa-chevron-right text-slate-400"></i>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Route Delivery Stops Sequencing */}
      {selectedRoute && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs uppercase font-bold text-cadbury-700">{selectedRoute.code} Sequence</span>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">
                Delivery Stops on {selectedRoute.name}
              </h3>
              <p className="text-xs text-slate-500">
                Optimized route order to save fuel and ensure on-time delivery to all retail confectionery shops.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=19.1190,72.8685&destination=${
                  partiesInSelectedRoute[0]?.latitude || 19.2936
                },${partiesInSelectedRoute[0]?.longitude || 72.8480}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
              >
                <i className="fa-brands fa-google"></i> Route on Google Maps
              </a>
            </div>
          </div>

          {/* Stops List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partiesInSelectedRoute.map((party, idx) => (
              <div
                key={party.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3 text-xs"
              >
                <span className="w-7 h-7 rounded-full bg-cadbury-900 text-white font-black flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>

                <div className="flex-1 space-y-1">
                  <div className="font-bold text-slate-900 text-sm">{party.name}</div>
                  <div className="text-slate-600">{party.shopAddress}</div>
                  <div className="text-slate-400">Mobile: {party.mobileNumber}</div>
                  <div className="text-cadbury-800 font-bold pt-1">
                    Pending Dues: ₹{(party.currentOutstanding ?? 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${party.latitude},${party.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Navigate directly"
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 text-blue-600 flex items-center justify-center"
                >
                  <i className="fa-solid fa-diamond-turn-right"></i>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE NEW ROUTE MODAL */}
      {isNewRouteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-cadbury-700 tracking-wider">
                  Territory Setup
                </span>
                <h3 className="text-lg font-black text-slate-900">Add New Delivery Route</h3>
              </div>
              <button
                onClick={() => setIsNewRouteModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Route Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Route 4 – Borivali"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Route Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RT-BOR"
                  value={newRouteCode}
                  onChange={(e) => setNewRouteCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Coverage Areas (Comma-separated) *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Borivali West, Borivali East, Shimpoli Road, IC Colony"
                  value={newRouteAreas}
                  onChange={(e) => setNewRouteAreas(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewRouteModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cadbury-900 hover:bg-cadbury-800 text-white font-black rounded-lg shadow-md"
                >
                  Save Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
