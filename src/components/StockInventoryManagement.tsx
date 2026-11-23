import React, { useState } from 'react';
import { CadburyProduct, CadburyProductCategory } from '../types/cadbury';

interface StockInventoryManagementProps {
  products: CadburyProduct[];
  onUpdateProductStock: (productId: string, updates: Partial<CadburyProduct>) => void;
}

export const StockInventoryManagement: React.FC<StockInventoryManagementProps> = ({
  products,
  onUpdateProductStock
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockAdjustmentModalProduct, setStockAdjustmentModalProduct] = useState<CadburyProduct | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'STOCK_IN' | 'DAMAGE' | 'EXPIRY'>('STOCK_IN');
  const [adjustmentCartons, setAdjustmentCartons] = useState<number>(10);
  const [batchNoInput, setBatchNoInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');

  const categories = Object.values(CadburyProductCategory);

  // Overall Stock Aggregates
  const totalPhysicalStock = products.reduce((sum, p) => sum + p.stockCartons, 0);
  const totalAvailableStock = products.reduce((sum, p) => sum + (p.availableStock || p.stockCartons), 0);
  const totalReservedStock = products.reduce((sum, p) => sum + (p.reservedStock || 0), 0);
  const totalLoadedStock = products.reduce((sum, p) => sum + (p.loadedStock || 0), 0);
  const totalDamagedStock = products.reduce((sum, p) => sum + (p.damagedStock || 0), 0);
  const totalStockValuation = products.reduce((sum, p) => sum + (p.stockCartons * p.cartonRate), 0);

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    return matchesCat && matchesSearch;
  });

  const handleOpenAdjustment = (prod: CadburyProduct, type: 'STOCK_IN' | 'DAMAGE' | 'EXPIRY') => {
    setStockAdjustmentModalProduct(prod);
    setAdjustmentType(type);
    setAdjustmentCartons(10);
    setBatchNoInput(prod.batchNumber || `BN-${new Date().getFullYear()}-01`);
    setNotesInput('');
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdjustmentModalProduct) return;

    let updatedStock = stockAdjustmentModalProduct.stockCartons;
    let updatedDamaged = stockAdjustmentModalProduct.damagedStock || 0;
    let updatedAvailable = stockAdjustmentModalProduct.availableStock || stockAdjustmentModalProduct.stockCartons;

    if (adjustmentType === 'STOCK_IN') {
      updatedStock += adjustmentCartons;
      updatedAvailable += adjustmentCartons;
    } else if (adjustmentType === 'DAMAGE') {
      updatedStock = Math.max(0, updatedStock - adjustmentCartons);
      updatedAvailable = Math.max(0, updatedAvailable - adjustmentCartons);
      updatedDamaged += adjustmentCartons;
    } else if (adjustmentType === 'EXPIRY') {
      updatedStock = Math.max(0, updatedStock - adjustmentCartons);
      updatedAvailable = Math.max(0, updatedAvailable - adjustmentCartons);
    }

    onUpdateProductStock(stockAdjustmentModalProduct.id, {
      stockCartons: updatedStock,
      availableStock: updatedAvailable,
      damagedStock: updatedDamaged,
      batchNumber: batchNoInput || stockAdjustmentModalProduct.batchNumber
    });

    setStockAdjustmentModalProduct(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cadbury-900 to-indigo-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <i className="fa-solid fa-boxes-stacked text-gold-400"></i> Warehouse Stock Control
          </div>
          <h2 className="text-2xl font-black">Cadbury Product & Inventory Management</h2>
          <p className="text-xs text-cadbury-200 mt-1">
            Real-time stock ledger, batch numbers, barcodes, expiration dates, carton counts, and damages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 px-4 py-2 rounded-xl text-center border border-white/20">
            <span className="block text-xl font-black text-gold-400">₹{(totalStockValuation ?? 0).toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-cadbury-200 uppercase font-bold">Total Stock Valuation</span>
          </div>
        </div>
      </div>

      {/* Stock KPIs Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Physical Stock</span>
          <div className="text-lg font-black text-slate-800 mt-0.5">{totalPhysicalStock} Box</div>
          <div className="text-[10px] text-slate-500">In warehouse bays</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-emerald-600 font-bold uppercase block">Available Stock</span>
          <div className="text-lg font-black text-emerald-700 mt-0.5">{totalAvailableStock} Box</div>
          <div className="text-[10px] text-emerald-600">Free for new booking</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-blue-600 font-bold uppercase block">Reserved Stock</span>
          <div className="text-lg font-black text-blue-700 mt-0.5">{totalReservedStock} Box</div>
          <div className="text-[10px] text-blue-600">Committed in orders</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-purple-600 font-bold uppercase block">Loaded in Vans</span>
          <div className="text-lg font-black text-purple-700 mt-0.5">{totalLoadedStock} Box</div>
          <div className="text-[10px] text-purple-600">Out on delivery routes</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-rose-600 font-bold uppercase block">Damaged / Melted</span>
          <div className="text-lg font-black text-rose-700 mt-0.5">{totalDamagedStock} Box</div>
          <div className="text-[10px] text-rose-600">Pending claim / return</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-amber-600 font-bold uppercase block">Low Stock Alert</span>
          <div className="text-lg font-black text-amber-700 mt-0.5">
            {products.filter(p => p.stockCartons <= p.minStockAlert).length} Items
          </div>
          <div className="text-[10px] text-amber-600">Below safety threshold</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search product name, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold bg-slate-50 text-slate-700"
          >
            <option value="ALL">All Cadbury Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong>{filteredProducts.length}</strong> Products
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3">Product / SKU</th>
                <th className="p-3">Barcode & Batch</th>
                <th className="p-3 text-center">Expiry</th>
                <th className="p-3 text-center">Units/Box</th>
                <th className="p-3 text-right">Carton Rate</th>
                <th className="p-3 text-center font-black text-slate-800">Physical Stock</th>
                <th className="p-3 text-center font-bold text-emerald-700">Available</th>
                <th className="p-3 text-center font-bold text-rose-600">Damaged</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((prod) => {
                const isLow = prod.stockCartons <= prod.minStockAlert;

                return (
                  <tr key={prod.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{prod.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {prod.code} • {prod.category}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-mono text-slate-700 text-[11px] flex items-center gap-1">
                        <i className="fa-solid fa-barcode text-slate-400"></i> {prod.barcode}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Batch: {prod.batchNumber}</div>
                    </td>
                    <td className="p-3 text-center font-mono text-[11px] text-slate-600">
                      {prod.expiryDate}
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-700">
                      {prod.unitsPerCarton} pcs
                    </td>
                    <td className="p-3 text-right font-bold text-cadbury-900">
                      ₹{(prod.cartonRate ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-black text-xs ${
                        isLow ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-400' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {prod.stockCartons} Box
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-700">
                      {prod.availableStock || prod.stockCartons} Box
                    </td>
                    <td className="p-3 text-center font-semibold text-rose-600">
                      {prod.damagedStock || 0}
                    </td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenAdjustment(prod, 'STOCK_IN')}
                        title="Add Fresh Stock In"
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold"
                      >
                        + Stock In
                      </button>
                      <button
                        onClick={() => handleOpenAdjustment(prod, 'DAMAGE')}
                        title="Mark Damaged Stock"
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-bold"
                      >
                        Damaged
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* STOCK IN / DAMAGE ADJUSTMENT MODAL */}
      {stockAdjustmentModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-cadbury-700 tracking-wider">
                  Inventory Entry
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {adjustmentType === 'STOCK_IN' ? 'Stock Inward (Purchase/Transfer)' : 'Mark Damaged Stock'}
                </h3>
              </div>
              <button
                onClick={() => setStockAdjustmentModalProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <span className="text-slate-400 block font-semibold">Selected Product:</span>
              <strong className="text-slate-900 text-sm block mt-0.5">{stockAdjustmentModalProduct.name}</strong>
              <span className="text-slate-500">Current Stock: <strong>{stockAdjustmentModalProduct.stockCartons} Box</strong></span>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {adjustmentType === 'STOCK_IN' ? 'Cartons Received (+)' : 'Damaged Cartons (-)'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustmentCartons}
                  onChange={(e) => setAdjustmentCartons(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base font-black text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Batch Number</label>
                <input
                  type="text"
                  value={batchNoInput}
                  onChange={(e) => setBatchNoInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Remarks / Inward Challan No</label>
                <input
                  type="text"
                  placeholder="e.g. Inward from Cadbury Thane Plant Challan #8812"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStockAdjustmentModalProduct(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cadbury-900 hover:bg-cadbury-800 text-white font-black rounded-lg shadow-md"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
