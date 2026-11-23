import React, { useEffect, useRef, useState } from 'react';
import { Vehicle, Order } from '../types/cadbury';

interface LiveVehicleMapProps {
  vehicles: Vehicle[];
  orders: Order[];
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onUpdateVehicleStatus?: (vehicleId: string, status: Vehicle['status']) => void;
  onUpdateVehicleCrew?: (vehicleId: string, crewData: any) => Promise<any>;
  onAddNewVehicle?: (vehicleData: any) => Promise<any>;
}

declare global {
  interface Window {
    L: any;
  }
}

export const LiveVehicleMap: React.FC<LiveVehicleMapProps> = ({
  vehicles,
  orders,
  onSelectVehicle,
  onUpdateVehicleStatus,
  onUpdateVehicleCrew,
  onAddNewVehicle
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const polylineRef = useRef<any>(null);
  
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    vehicles.length > 0 ? vehicles[0].id : ''
  );
  const [mapMode, setMapMode] = useState<'streets' | 'satellite'>('streets');

  // Modals for Van Crew Editing & Adding New Van
  const [isEditCrewModalOpen, setIsEditCrewModalOpen] = useState<boolean>(false);
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState<boolean>(false);

  // Edit Crew Form Fields
  const [editCrewDriver, setEditCrewDriver] = useState<string>('');
  const [editCrewDriverPhone, setEditCrewDriverPhone] = useState<string>('');
  const [editCrewLoader, setEditCrewLoader] = useState<string>('');
  const [editCrewCashier, setEditCrewCashier] = useState<string>('');
  const [editCrewCashierPhone, setEditCrewCashierPhone] = useState<string>('');
  const [editCrewRoute, setEditCrewRoute] = useState<string>('');

  // Add Van Form Fields
  const [newVanNumber, setNewVanNumber] = useState<string>('MH 04 CD 9988');
  const [newVanType, setNewVanType] = useState<string>('Tata Ace Gold');
  const [newVanDriver, setNewVanDriver] = useState<string>('Mukesh Sharma');
  const [newVanDriverPhone, setNewVanDriverPhone] = useState<string>('9820556677');
  const [newVanLoader, setNewVanLoader] = useState<string>('Amit Singh');
  const [newVanCashier, setNewVanCashier] = useState<string>('Vikas Gupta');
  const [newVanCashierPhone, setNewVanCashierPhone] = useState<string>('9870112233');
  const [newVanRoute, setNewVanRoute] = useState<string>('Route 2 – Mulund');

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];

  // Derive stops dynamically from orders assigned to this vehicle / Load #189
  const vehicleOrders = orders.filter(o => {
    if (!selectedVehicle) return false;
    const vMatch = o.vehicleNumber && (
      o.vehicleNumber.toLowerCase() === selectedVehicle.vehicleNumber.toLowerCase() ||
      selectedVehicle.vehicleNumber.toLowerCase().includes(o.vehicleNumber.toLowerCase()) ||
      o.vehicleNumber.toLowerCase().includes(selectedVehicle.vehicleNumber.toLowerCase())
    );
    const isV2 = (selectedVehicle.vehicleNumber.includes('4589') || selectedVehicle.vehicleNumber.includes('V2')) && 
                 (o.loadNumber === '189' || o.vehicleNumber?.includes('V2') || o.vehicleNumber?.includes('4589'));
    return vMatch || isV2;
  });

  const effectiveStops = (vehicleOrders.length > 0)
    ? vehicleOrders.map((ord, idx) => {
        // Base center coordinates around Bhandup West: lat 19.1465, lng 72.9365
        const beatOffsetMap: { [key: string]: [number, number] } = {
          'CHECKNAKA TOP END': [0.015, -0.005],
          'BHANDUP STN TOP END': [-0.002, 0.008],
          'VILLEGE ROAD TOP END': [-0.008, -0.006],
          '65 BHANDUP VILL 2': [-0.012, 0.002],
          '31 BHANDUP VILLAGE': [-0.016, -0.004]
        };
        const beatName = ord.partyArea || (ord.notes?.includes('Beat:') ? ord.notes.split('Beat:')[1]?.split('|')[0]?.trim() : 'Bhandup Beat');
        const baseOffset = beatOffsetMap[beatName] || [0, 0];
        const microJitterLat = ((idx % 7) * 0.0018) - 0.005;
        const microJitterLng = (((idx * 3) % 9) * 0.0016) - 0.007;

        const stopLat = 19.1465 + baseOffset[0] + microJitterLat;
        const stopLng = 72.9365 + baseOffset[1] + microJitterLng;

        const isDelivered = ord.deliveryStatus === 'Delivered' || ord.status === 'DELIVERED';
        const isNext = !isDelivered && (idx === 0 || vehicleOrders[idx - 1]?.deliveryStatus === 'Delivered');
        const status: 'Delivered' | 'Next' | 'Pending' = isDelivered ? 'Delivered' : (isNext ? 'Next' : 'Pending');

        return {
          orderId: ord.id,
          orderNumber: ord.orderNumber,
          partyName: ord.partyName,
          area: beatName,
          lat: stopLat,
          lng: stopLng,
          status,
          cartons: ord.totalCartons || 1,
          billAmount: ord.totalBill || 0,
          billType: ord.billType || 'CASH'
        };
      })
    : (selectedVehicle?.routeStops || []);

  const effectiveTotalAssigned = effectiveStops.length || selectedVehicle?.totalAssignedOrders || 0;
  const effectiveDeliveredCount = effectiveStops.filter(s => s.status === 'Delivered').length || selectedVehicle?.deliveredOrders || 0;
  const effectiveTripTotalAmount = effectiveStops.reduce((sum, s) => sum + (s.billAmount || 0), 0) || selectedVehicle?.totalBillAmount || 0;
  const effectiveCollectedAmount = effectiveStops.filter(s => s.status === 'Delivered').reduce((sum, s) => sum + (s.billAmount || 0), 0) || selectedVehicle?.collectedAmount || 0;

  // Initialize or update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      // Default center around Mumbai Cadbury Distribution Region
      const initialLat = selectedVehicle?.currentLat || 19.1136;
      const initialLng = selectedVehicle?.currentLng || 72.8697;

      const map = window.L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([initialLat, initialLng], 12);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    Object.values(markersRef.current).forEach((m: any) => map.removeLayer(m));
    markersRef.current = {};

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    // Add Central Warehouse Marker
    const warehouseIcon = window.L.divIcon({
      className: 'custom-warehouse-pin',
      html: `
        <div style="background-color: #3d0c5a; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid #fbbf24;">
          <i class="fa-solid fa-warehouse" style="font-size: 16px;"></i>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const warehouseMarker = window.L.marker([19.1190, 72.8685], { icon: warehouseIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: inherit; padding: 4px;">
          <strong style="color: #3d0c5a; font-size: 14px;">🏭 Cadbury Central Hub</strong>
          <p style="margin: 4px 0 0; font-size: 12px; color: #475569;">MIDC Andheri East Distribution Center</p>
        </div>
      `);
    markersRef.current['warehouse'] = warehouseMarker;

    // Add Vehicle Markers
    vehicles.forEach(vehicle => {
      const isSelected = vehicle.id === selectedVehicleId;
      const vehIcon = window.L.divIcon({
        className: 'custom-vehicle-pin',
        html: `
          <div style="background-color: ${isSelected ? '#f59e0b' : '#3d0c5a'}; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.4); border: 3px solid white; transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'}; transition: all 0.3s;">
            <i class="fa-solid fa-truck" style="font-size: 16px;"></i>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const vMarker = window.L.marker([vehicle.currentLat, vehicle.currentLng], { icon: vehIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: inherit; padding: 4px; min-width: 180px;">
            <div style="font-weight: 800; font-size: 13px; color: #3d0c5a;">${vehicle.vehicleNumber}</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${vehicle.driverName} (${vehicle.driverMobile})</div>
            <div style="font-size: 11px; display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span>Status:</span>
              <strong style="color: #0284c7;">${vehicle.status}</strong>
            </div>
            <div style="font-size: 11px; display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span>Speed:</span>
              <strong>${vehicle.speedKmH} km/h</strong>
            </div>
            <div style="font-size: 11px; display: flex; justify-content: space-between;">
              <span>Cooling:</span>
              <strong style="color: #10b981;">${vehicle.temperatureC}°C</strong>
            </div>
          </div>
        `);

      vMarker.on('click', () => {
        setSelectedVehicleId(vehicle.id);
      });

      markersRef.current[vehicle.id] = vMarker;
    });

    // Add Route Stops & Route Polyline for Selected Vehicle
    if (selectedVehicle && effectiveStops.length > 0) {
      const latLngs: [number, number][] = [[selectedVehicle.currentLat, selectedVehicle.currentLng]];

      effectiveStops.forEach((stop, index) => {
        latLngs.push([stop.lat, stop.lng]);

        const stopColor =
          stop.status === 'Delivered'
            ? '#10b981'
            : stop.status === 'Next'
            ? '#3b82f6'
            : '#f97316';

        const stopIcon = window.L.divIcon({
          className: 'custom-stop-pin',
          html: `
            <div style="background-color: ${stopColor}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid white; font-weight: bold; font-size: 11px;">
              ${index + 1}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const stopMarker = window.L.marker([stop.lat, stop.lng], { icon: stopIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: inherit; padding: 4px; min-width: 170px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: ${stopColor};">Stop #${index + 1} • ${stop.status}</span>
                <span style="font-size: 9px; font-weight: bold; background: #f1f5f9; padding: 2px 5px; border-radius: 4px;">${stop.billType || 'CASH'}</span>
              </div>
              <div style="font-weight: 700; font-size: 13px; color: #1e293b; margin-top: 2px;">${stop.partyName}</div>
              <div style="font-size: 11px; color: #64748b;">${stop.area}</div>
              <div style="font-size: 11px; margin-top: 4px; border-top: 1px solid #e2e8f0; padding-top: 4px; display: flex; justify-content: space-between;">
                <span>Cartons: <strong>${stop.cartons} Box</strong></span>
                <span>Bill: <strong>₹${(stop.billAmount ?? 0).toLocaleString('en-IN')}</strong></span>
              </div>
            </div>
          `);

        markersRef.current[`stop-${stop.orderId}`] = stopMarker;
      });

      // Draw polyline connecting current vehicle location through delivery stops
      polylineRef.current = window.L.polyline(latLngs, {
        color: '#7333a4',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8',
        lineCap: 'round'
      }).addTo(map);

      // Pan map smoothly to selected vehicle
      map.panTo([selectedVehicle.currentLat, selectedVehicle.currentLng]);
    }

  }, [vehicles, selectedVehicleId, orders]);

  return (
    <div className="space-y-6">
      {/* Top Controller Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cadbury-50 text-cadbury-800 text-xs font-bold mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live GPS Fleet Telematics
          </div>
          <h2 className="text-xl font-bold text-slate-800">Live Vehicle & Route Tracking</h2>
          <p className="text-xs text-slate-500">
            Real-time GPS tracking for Cadbury distribution vans, stop sequences, and chocolate compartment cooling.
          </p>
        </div>

        {/* Vehicle Selector Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {vehicles.map((v) => {
            const isSel = v.id === selectedVehicleId;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVehicleId(v.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSel
                    ? 'bg-cadbury-900 text-white shadow-md ring-2 ring-gold-400'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <i className="fa-solid fa-truck"></i>
                <div className="text-left">
                  <div className="leading-tight">{v.vehicleNumber}</div>
                  <div className={`text-[10px] font-normal ${isSel ? 'text-cadbury-200' : 'text-slate-500'}`}>
                    {v.driverName}
                  </div>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    v.status === 'On Delivery Route'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {v.speedKmH} km/h
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setIsAddVehicleModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black bg-gold-500 hover:bg-gold-600 text-cadbury-950 shadow-sm active:scale-95 transition-all"
          >
            <i className="fa-solid fa-plus-circle"></i> Add Van
          </button>
        </div>
      </div>

      {/* Main Map + Side Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Interactive Map View (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative h-[560px]">
          {/* Map Floating Control Overlay */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-lg text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-cadbury-900 font-bold">
              <i className="fa-solid fa-map-location-dot text-cadbury-600"></i>
              {selectedVehicle?.vehicleNumber}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              Target: <strong className="text-slate-900">{selectedVehicle?.currentPartyDestination || 'Warehouse'}</strong>
            </span>
          </div>

          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            {/* Direct Google Maps Navigation Button */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedVehicle?.currentLat},${selectedVehicle?.currentLng}`}
              target="_blank"
              rel="noreferrer"
              className="bg-white/95 hover:bg-white text-slate-800 text-xs font-bold px-3 py-2 rounded-xl shadow-lg border border-slate-200 flex items-center gap-1.5 transition-all"
            >
              <i className="fa-brands fa-google text-blue-600"></i>
              Open in Google Maps
            </a>
          </div>

          {/* Leaflet Map DOM Node */}
          <div ref={mapContainerRef} className="w-full h-full z-10"></div>

          {/* Map Footer Legend */}
          <div className="p-3 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-3 z-20">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-cadbury-900 border border-white"></span> Warehouse
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 border border-white"></span> Active Van
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></span> Delivered Stop
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 border border-white"></span> Next Stop
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-500 border border-white"></span> Pending Stop
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Auto-refreshing every 5 seconds
            </div>
          </div>
        </div>

        {/* Selected Vehicle Telematics & Route Stops (1 Col) */}
        {selectedVehicle && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col space-y-4">
            {/* Vehicle Header Card */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-cadbury-600 uppercase tracking-wider block">
                  {selectedVehicle.vehicleType}
                </span>
                <h3 className="text-xl font-black text-slate-800 mt-0.5">
                  {selectedVehicle.vehicleNumber}
                </h3>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                  <i className="fa-solid fa-id-badge text-slate-400"></i>
                  Driver: <strong className="text-slate-700">{selectedVehicle.driverName}</strong>
                </div>
              </div>

              {/* Status Switcher Dropdown */}
              <select
                value={selectedVehicle.status}
                onChange={(e) =>
                  onUpdateVehicleStatus &&
                  onUpdateVehicleStatus(selectedVehicle.id, e.target.value as any)
                }
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cadbury-600"
              >
                <option value="On Delivery Route">🚚 On Delivery Route</option>
                <option value="Loading">📦 Loading at Bay</option>
                <option value="Delivered / Returning">↩️ Delivered / Returning</option>
                <option value="In Warehouse">🏭 In Warehouse</option>
                <option value="Completed">✅ Shift Completed</option>
              </select>
            </div>

            {/* Van Crew Details (Driver, Loader / LDR, Cashier) */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-users text-cadbury-700"></i> Van Staff Crew
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditCrewDriver(selectedVehicle.driverName || '');
                    setEditCrewDriverPhone(selectedVehicle.driverMobile || '');
                    setEditCrewLoader(selectedVehicle.helperLoaderName || selectedVehicle.loaderName || 'Ramesh Kumar');
                    setEditCrewCashier(selectedVehicle.cashierName || 'Suresh Patil');
                    setEditCrewCashierPhone(selectedVehicle.cashierMobile || '9870123456');
                    setEditCrewRoute(selectedVehicle.assignedRoute || '');
                    setIsEditCrewModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cadbury-900 hover:bg-cadbury-800 text-white font-extrabold text-[10px] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <i className="fa-solid fa-user-pen text-gold-400"></i> Edit Staff / Crew
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/70">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Driver</span>
                  <div className="font-bold text-slate-800 truncate">{selectedVehicle.driverName || '-'}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{selectedVehicle.driverMobile || '-'}</div>
                </div>
                <div>
                  <span className="text-[9px] text-cadbury-700 uppercase font-bold block">Loader (LDR)</span>
                  <div className="font-bold text-slate-800 truncate">{selectedVehicle.helperLoaderName || selectedVehicle.loaderName || 'Ramesh Kumar'}</div>
                  <div className="text-[10px] text-slate-400">Loading Bay</div>
                </div>
                <div>
                  <span className="text-[9px] text-emerald-700 uppercase font-bold block">Cashier / Staff</span>
                  <div className="font-bold text-slate-800 truncate">{selectedVehicle.cashierName || 'Suresh Patil'}</div>
                  <div className="text-[10px] text-slate-400">Cash/UPI Desk</div>
                </div>
              </div>
            </div>

            {/* Vehicle Sensors / Telemetry Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Temperature Sensor for Cadbury Chocolate */}
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                <div className="text-[10px] font-bold uppercase text-emerald-700 flex items-center gap-1">
                  <i className="fa-solid fa-snowflake"></i> AC Compartment
                </div>
                <div className="text-xl font-black text-emerald-800 mt-1">
                  {selectedVehicle.temperatureC}°C
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">
                  Optimal for chocolate quality
                </div>
              </div>

              {/* Speed & Battery */}
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                <div className="text-[10px] font-bold uppercase text-blue-700 flex items-center gap-1">
                  <i className="fa-solid fa-gauge"></i> Live Speed
                </div>
                <div className="text-xl font-black text-blue-800 mt-1">
                  {selectedVehicle.speedKmH} <span className="text-xs font-medium">km/h</span>
                </div>
                <div className="text-[10px] text-blue-600 mt-0.5">
                  Battery: {selectedVehicle.batteryLevel}%
                </div>
              </div>
            </div>

            {/* Delivery Progress Bar */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-600">Trip Delivery Progress:</span>
                <span className="font-bold text-cadbury-800">
                  {effectiveDeliveredCount} / {effectiveTotalAssigned} Parties Done
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{
                    width: `${
                      effectiveTotalAssigned > 0
                        ? (effectiveDeliveredCount / effectiveTotalAssigned) * 100
                        : 0
                    }%`
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Collected: <strong>₹{(effectiveCollectedAmount ?? 0).toLocaleString('en-IN')}</strong></span>
                <span>Total Trip: <strong>₹{(effectiveTripTotalAmount ?? 0).toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            {/* Delivery Stops Checklist */}
            <div className="flex-1 space-y-2 overflow-y-auto max-h-64 pr-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Planned Delivery Stops ({effectiveStops.length})</span>
                {selectedVehicle.vehicleNumber.includes('4589') && (
                  <span className="text-[10px] text-cadbury-700 font-extrabold bg-cadbury-100 px-1.5 py-0.5 rounded">
                    Van V2 • Load #189
                  </span>
                )}
              </h4>
              <div className="space-y-2">
                {effectiveStops.map((stop, i) => (
                  <div
                    key={stop.orderId || i}
                    className={`p-3 rounded-xl border transition-all text-xs flex items-center justify-between ${
                      stop.status === 'Delivered'
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : stop.status === 'Next'
                        ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-400'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 ${
                          stop.status === 'Delivered'
                            ? 'bg-emerald-500'
                            : stop.status === 'Next'
                            ? 'bg-blue-500'
                            : 'bg-orange-400'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">{stop.partyName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span>{stop.area}</span>
                          <span>•</span>
                          <span>{stop.cartons} Box</span>
                          {stop.billType && (
                            <span className={`text-[9px] font-bold px-1 rounded ${stop.billType === 'CASH' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                              {stop.billType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-800">
                        ₹{(stop.billAmount ?? 0).toLocaleString('en-IN')}
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          stop.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : stop.status === 'Next'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {stop.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Driver Contact Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <a
                href={`tel:${selectedVehicle.driverMobile}`}
                className="flex-1 py-2 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <i className="fa-solid fa-phone text-emerald-600"></i> Call Driver
              </a>
              <a
                href={`https://wa.me/91${selectedVehicle.driverMobile}?text=Hello%20${encodeURIComponent(
                  selectedVehicle.driverName
                )},%20please%20update%20current%20delivery%20status%20for%20vehicle%20${encodeURIComponent(
                  selectedVehicle.vehicleNumber
                )}.`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 text-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <i className="fa-brands fa-whatsapp"></i> WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>

      {/* EDIT VAN CREW MODAL */}
      {isEditCrewModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-cadbury-700 tracking-wider">
                  Van Staff Assignment
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Edit Crew for {selectedVehicle.vehicleNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Gaadi par kaun loader (LDR), driver aur cashier/delivery staff jayega, yahan customize karein.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditCrewModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (onUpdateVehicleCrew) {
                  await onUpdateVehicleCrew(selectedVehicle.id, {
                    driverName: editCrewDriver,
                    driverMobile: editCrewDriverPhone,
                    loaderName: editCrewLoader,
                    cashierName: editCrewCashier,
                    cashierMobile: editCrewCashierPhone,
                    assignedRoute: editCrewRoute
                  });
                }
                setIsEditCrewModalOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Driver Ka Naam *</label>
                  <input
                    type="text"
                    required
                    value={editCrewDriver}
                    onChange={(e) => setEditCrewDriver(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Driver Mobile</label>
                  <input
                    type="tel"
                    value={editCrewDriverPhone}
                    onChange={(e) => setEditCrewDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Loader (LDR) Name */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">Loader (LDR) Ka Naam *</label>
                  <span className="text-[10px] text-cadbury-700 font-bold uppercase">Godown / Loading Staff</span>
                </div>
                <input
                  type="text"
                  required
                  value={editCrewLoader}
                  onChange={(e) => setEditCrewLoader(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                />
                <div className="flex gap-1.5 mt-1">
                  {['Ramesh Kumar', 'Amit Singh', 'Dinesh Yadav', 'Rajesh Verma'].map(ldr => (
                    <button
                      key={ldr}
                      type="button"
                      onClick={() => setEditCrewLoader(ldr)}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-cadbury-100 text-slate-700 hover:text-cadbury-900 transition-colors"
                    >
                      {ldr.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cashier / Delivery Boy */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">Cashier / Staff *</label>
                    <span className="text-[9px] text-emerald-700 font-bold uppercase">Collection</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={editCrewCashier}
                    onChange={(e) => setEditCrewCashier(e.target.value)}
                    placeholder="e.g. Suresh Patil"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                  <div className="flex gap-1.5 mt-1">
                    {['Suresh Patil', 'Vikas Gupta', 'Pradeep Jadhav'].map(csh => (
                      <button
                        key={csh}
                        type="button"
                        onClick={() => setEditCrewCashier(csh)}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 transition-colors"
                      >
                        {csh.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cashier Mobile</label>
                  <input
                    type="tel"
                    value={editCrewCashierPhone}
                    onChange={(e) => setEditCrewCashierPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Assigned Route */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Route / Territory</label>
                <input
                  type="text"
                  value={editCrewRoute}
                  onChange={(e) => setEditCrewRoute(e.target.value)}
                  placeholder="e.g. Route 2 – Mira Road / Bhayandar"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditCrewModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cadbury-900 hover:bg-cadbury-800 text-white font-black rounded-xl shadow-md active:scale-95 transition-all"
                >
                  Save Van Crew
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW VAN MODAL */}
      {isAddVehicleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-gold-600 tracking-wider">
                  Fleet Management
                </span>
                <h3 className="text-xl font-black text-slate-900">Add New Delivery Van</h3>
                <p className="text-xs text-slate-500">
                  Nayi delivery gaadi aur uska staff (Driver, Loader, Cashier) register karein.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVehicleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (onAddNewVehicle) {
                  await onAddNewVehicle({
                    vehicleNumber: newVanNumber,
                    vehicleType: newVanType,
                    driverName: newVanDriver,
                    driverMobile: newVanDriverPhone,
                    loaderName: newVanLoader,
                    cashierName: newVanCashier,
                    cashierMobile: newVanCashierPhone,
                    assignedRoute: newVanRoute
                  });
                }
                setIsAddVehicleModalOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vehicle Number *</label>
                  <input
                    type="text"
                    required
                    value={newVanNumber}
                    onChange={(e) => setNewVanNumber(e.target.value)}
                    placeholder="e.g. MH 04 CD 9988"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vehicle Type / Model</label>
                  <select
                    value={newVanType}
                    onChange={(e) => setNewVanType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none bg-white"
                  >
                    <option value="Tata Ace Gold">Tata Ace Gold (Chhota Hathi)</option>
                    <option value="Mahindra Bolero Maxi Truck">Mahindra Bolero Maxi Truck</option>
                    <option value="Ashok Leyland Dost">Ashok Leyland Dost</option>
                    <option value="Eicher Pro 2049 (Refrigerated)">Eicher Pro 2049 (Refrigerated AC)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Driver Ka Naam *</label>
                  <input
                    type="text"
                    required
                    value={newVanDriver}
                    onChange={(e) => setNewVanDriver(e.target.value)}
                    placeholder="e.g. Mukesh Sharma"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Driver Mobile</label>
                  <input
                    type="tel"
                    value={newVanDriverPhone}
                    onChange={(e) => setNewVanDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Loader (LDR) Naam *</label>
                  <input
                    type="text"
                    required
                    value={newVanLoader}
                    onChange={(e) => setNewVanLoader(e.target.value)}
                    placeholder="e.g. Amit Singh"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cashier / Staff Naam *</label>
                  <input
                    type="text"
                    required
                    value={newVanCashier}
                    onChange={(e) => setNewVanCashier(e.target.value)}
                    placeholder="e.g. Vikas Gupta"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Route</label>
                <input
                  type="text"
                  value={newVanRoute}
                  onChange={(e) => setNewVanRoute(e.target.value)}
                  placeholder="e.g. Route 3 – Thane"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gold-500 hover:bg-gold-600 text-cadbury-950 font-black rounded-xl shadow-md active:scale-95 transition-all"
                >
                  Save & Register Van
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
