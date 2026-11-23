import React, { useState } from 'react';
import { Party, Order, PaymentTransaction } from '../types/cadbury';

interface PartyManagementProps {
  parties: Party[];
  orders: Order[];
  payments: PaymentTransaction[];
  onAddParty: (partyData: Partial<Party>) => void;
  onUpdateParty: (partyId: string, updates: Partial<Party>) => void;
  onSelectPartyLedger?: (party: Party) => void;
}

export const PartyManagement: React.FC<PartyManagementProps> = ({
  parties,
  orders,
  payments,
  onAddParty,
  onUpdateParty,
  onSelectPartyLedger
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [inspectParty, setInspectParty] = useState<Party | null>(null);

  // New Party Form State
  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    shopAddress: '',
    area: '',
    pincode: '400001',
    mobileNumber: '',
    whatsappNumber: '',
    gstNumber: '',
    openingBalance: '',
    creditLimit: '50000',
    latitude: 19.1136,
    longitude: 72.8697
  });

  const areas = Array.from(new Set(parties.map(p => p.area)));

  const filteredParties = parties.filter(p => {
    const matchesArea = selectedArea === 'ALL' || p.area === selectedArea;
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.mobileNumber.includes(searchQuery) ||
      p.shopAddress.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesArea && matchesSearch;
  });

  const totalOutstanding = parties.reduce((sum, p) => sum + (p.currentOutstanding || 0), 0);

  const handleCaptureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData(prev => ({
            ...prev,
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6))
          }));
          alert(`Captured GPS coordinates: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
        },
        () => {
          alert('GPS permission denied or not available. Using default Mumbai location.');
        }
      );
    }
  };

  const handleSubmitNewParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.shopAddress || !formData.mobileNumber) {
      alert('Please fill Party Name, Address and Mobile Number');
      return;
    }

    onAddParty({
      ...formData,
      openingBalance: Number(formData.openingBalance) || 0,
      creditLimit: Number(formData.creditLimit) || 50000,
      latitude: Number(formData.latitude),
      longitude: Number(formData.longitude)
    });

    setIsAddModalOpen(false);
    setFormData({
      name: '',
      ownerName: '',
      shopAddress: '',
      area: '',
      pincode: '400001',
      mobileNumber: '',
      whatsappNumber: '',
      gstNumber: '',
      openingBalance: '',
      creditLimit: '50000',
      latitude: 19.1136,
      longitude: 72.8697
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cadbury-900 to-indigo-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <i className="fa-solid fa-store text-gold-400"></i> Retailer & Shop Master
          </div>
          <h2 className="text-2xl font-black">Party Management & Retailer Accounts</h2>
          <p className="text-xs text-cadbury-200 mt-1">
            Complete database of shops, GST details, GPS map locations, balance hisab-kitab, and order history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/20 text-center">
            <span className="block text-xl font-black text-gold-400">
              ₹{(totalOutstanding ?? 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-white/80 uppercase font-bold">Total Market Outstanding</span>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-3 bg-gold-500 hover:bg-gold-600 text-cadbury-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all"
          >
            <i className="fa-solid fa-plus"></i> Add New Party
          </button>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search by Party Name, Owner, Mobile, or Address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
            />
          </div>

          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Areas ({parties.length})</option>
            {areas.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong className="text-slate-800">{filteredParties.length}</strong> Parties
        </div>
      </div>

      {/* Party Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredParties.map((party) => {
          const partyOrders = orders.filter(o => o.partyId === party.id);
          const isOverLimit = party.currentOutstanding > party.creditLimit;

          return (
            <div
              key={party.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-cadbury-900 bg-cadbury-50 px-2 py-0.5 rounded border border-cadbury-200">
                    {party.code}
                  </span>
                  <span className="text-[11px] text-slate-500 ml-2 font-medium">
                    {party.area}
                  </span>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isOverLimit
                      ? 'bg-red-100 text-red-800'
                      : party.currentOutstanding > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isOverLimit ? 'Limit Exceeded' : party.currentOutstanding > 0 ? 'Pending Dues' : 'Clear'}
                </span>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 space-y-3">
                <div>
                  <h3 className="text-base font-black text-slate-800">{party.name}</h3>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <i className="fa-solid fa-user text-slate-400"></i>
                    Owner: <strong className="text-slate-700">{party.ownerName || 'Proprietor'}</strong>
                  </div>
                  <div className="text-xs text-slate-500 flex items-start gap-1.5 mt-1">
                    <i className="fa-solid fa-location-dot text-red-500 mt-0.5"></i>
                    <span className="truncate">{party.shopAddress}</span>
                  </div>
                </div>

                {/* Outstanding & Orders Summary */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Balance</span>
                    <span className={`text-base font-black ${(party.currentOutstanding ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ₹{(party.currentOutstanding ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Credit Limit</span>
                    <span className="text-xs font-bold text-slate-700 block mt-1">
                      ₹{(party.creditLimit ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* GST & Contact Info */}
                <div className="text-xs space-y-1 text-slate-600 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">GST No:</span>
                    <span className="font-mono font-semibold text-slate-800">{party.gstNumber || 'Unregistered / Retail'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Orders:</span>
                    <span className="font-bold text-slate-800">{partyOrders.length} bookings</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 grid grid-cols-4 gap-1.5 text-xs">
                {/* Call */}
                <a
                  href={`tel:${party.mobileNumber}`}
                  title="Call Shop"
                  className="py-2 text-center bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg transition-all"
                >
                  <i className="fa-solid fa-phone text-emerald-600"></i>
                </a>

                {/* WhatsApp Statement */}
                <a
                  href={`https://wa.me/91${party.mobileNumber}?text=Namaste%20${encodeURIComponent(
                    party.name
                  )},%20Cadbury%20Distributor%20account%20statement:%20Current%20Outstanding%20Balance%20is%20Rs.${party.currentOutstanding}.%20Kindly%20settle%20payment.`}
                  target="_blank"
                  rel="noreferrer"
                  title="Send WhatsApp Reminder"
                  className="py-2 text-center bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-700 font-bold rounded-lg transition-all"
                >
                  <i className="fa-brands fa-whatsapp text-emerald-600"></i>
                </a>

                {/* Google Maps Pin */}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${party.latitude},${party.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Navigate on Google Maps"
                  className="py-2 text-center bg-white hover:bg-blue-50 border border-slate-200 text-blue-700 font-bold rounded-lg transition-all"
                >
                  <i className="fa-solid fa-diamond-turn-right text-blue-600"></i>
                </a>

                {/* View Ledger */}
                <button
                  onClick={() => onSelectPartyLedger && onSelectPartyLedger(party)}
                  title="View Ledger Statement"
                  className="py-2 text-center bg-cadbury-900 hover:bg-cadbury-800 text-white font-bold rounded-lg shadow-sm transition-all text-[11px]"
                >
                  Ledger
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD NEW PARTY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-cadbury-700 tracking-wider">
                  Registration
                </span>
                <h3 className="text-xl font-black text-slate-900">Add New Cadbury Retailer / Party</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSubmitNewParty} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Party / Shop Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Balaji Confectionery"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Owner / Proprietor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Patel"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="font-bold text-slate-700 block mb-1">Shop Address *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Full physical address for delivery boy..."
                  value={formData.shopAddress}
                  onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Area / Market *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Andheri East"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10 digit mobile"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">GST Number</label>
                  <input
                    type="text"
                    placeholder="27AA..."
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    placeholder="50000"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* GPS Coordinates & Live Location Button */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Google Maps Geolocation:</span>
                  <button
                    type="button"
                    onClick={handleCaptureGPS}
                    className="px-2.5 py-1 bg-cadbury-900 text-white rounded font-bold text-[11px] flex items-center gap-1"
                  >
                    <i className="fa-solid fa-location-crosshairs"></i> Get Current Device GPS
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: Number(e.target.value) })}
                    className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: Number(e.target.value) })}
                    className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cadbury-900 hover:bg-cadbury-800 text-white text-xs font-black rounded-xl shadow-md"
                >
                  Save Party Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
