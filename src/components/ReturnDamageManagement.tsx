import React, { useState } from 'react';
import { SalesReturn, Party, Order, CadburyProduct } from '../types/cadbury';

interface ReturnDamageManagementProps {
  returns: SalesReturn[];
  parties: Party[];
  orders: Order[];
  products: CadburyProduct[];
  onAddReturn: (returnData: Partial<SalesReturn>) => void;
  onApproveReturn: (returnId: string) => void;
}

export const ReturnDamageManagement: React.FC<ReturnDamageManagementProps> = ({
  returns,
  parties,
  orders,
  products,
  onAddReturn,
  onApproveReturn
}) => {
  const [isNewReturnModalOpen, setIsNewReturnModalOpen] = useState<boolean>(false);
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [invoiceNumberInput, setInvoiceNumberInput] = useState<string>('');
  const [selectedProductCode, setSelectedProductCode] = useState<string>('');
  const [cartonsInput, setCartonsInput] = useState<number>(1);
  const [reasonInput, setReasonInput] = useState<SalesReturn['returnReason']>('Damaged Product');
  const [notesInput, setNotesInput] = useState<string>('');

  const returnReasons: SalesReturn['returnReason'][] = [
    'Damaged Product',
    'Expired Product',
    'Short Delivery',
    'Wrong Product',
    'Rate Difference',
    'Party Rejected'
  ];

  const totalReturnAmount = returns.reduce((sum, r) => sum + r.amount, 0);
  const pendingApprovals = returns.filter(r => r.approvalStatus === 'Pending Approval').length;

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const party = parties.find(p => p.id === selectedPartyId);
    const prod = products.find(p => p.code === selectedProductCode);

    if (!party || !prod) {
      alert('Please select party and product');
      return;
    }

    const calculatedAmount = cartonsInput * prod.cartonRate;

    onAddReturn({
      id: `ret-${Date.now()}`,
      returnNumber: `RET-CAD-${returns.length + 101}`,
      invoiceNumber: invoiceNumberInput || 'INV-2026-MANUAL',
      orderNumber: `ORD-CAD-${returns.length + 101}`,
      partyId: party.id,
      partyName: party.name,
      productCode: prod.code,
      productName: prod.name,
      cartons: cartonsInput,
      returnReason: reasonInput,
      amount: calculatedAmount,
      approvalStatus: 'Pending Approval',
      createdAt: new Date().toISOString().split('T')[0],
      notes: notesInput
    });

    setIsNewReturnModalOpen(false);
    setSelectedPartyId('');
    setSelectedProductCode('');
    setCartonsInput(1);
    setNotesInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-cadbury-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <i className="fa-solid fa-arrow-rotate-left text-rose-400"></i> Reverse Logistics & Claims
          </div>
          <h2 className="text-2xl font-black">Sales Return & Damaged Goods Management</h2>
          <p className="text-xs text-rose-200 mt-1">
            Track damaged chocolates, short deliveries, expiry claims, credit notes, and warehouse stock reversal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/20 text-center">
            <span className="block text-xl font-black text-rose-400">₹{(totalReturnAmount ?? 0).toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-300 uppercase font-bold">Total Return Claims</span>
          </div>

          <button
            onClick={() => setIsNewReturnModalOpen(true)}
            className="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all"
          >
            <i className="fa-solid fa-plus-circle"></i> Create Return Entry
          </button>
        </div>
      </div>

      {/* Return KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Claims</span>
          <div className="text-xl font-black text-slate-900 mt-1">{returns.length}</div>
          <div className="text-[10px] text-slate-500">Recorded cases</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-amber-600 block">Pending Approvals</span>
          <div className="text-xl font-black text-amber-600 mt-1">{pendingApprovals}</div>
          <div className="text-[10px] text-amber-600">Awaiting Manager sign-off</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-emerald-600 block">Approved & Credited</span>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {returns.filter(r => r.approvalStatus === 'Approved').length}
          </div>
          <div className="text-[10px] text-emerald-600">Credit notes issued to ledger</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-rose-600 block">Damaged Cartons</span>
          <div className="text-xl font-black text-rose-600 mt-1">
            {returns.filter(r => r.returnReason === 'Damaged Product').reduce((sum, r) => sum + r.cartons, 0)} Box
          </div>
          <div className="text-[10px] text-rose-600">Melted / Transit damage</div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Sales Return & Damage Registry</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3">Return ID / Inv</th>
                <th className="p-3">Party Name</th>
                <th className="p-3">Product Name</th>
                <th className="p-3 text-center">Cartons</th>
                <th className="p-3">Return Reason</th>
                <th className="p-3 text-right">Claim Amount</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returns.map((ret) => (
                <tr key={ret.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono">
                    <div className="font-bold text-slate-900">{ret.returnNumber}</div>
                    <div className="text-[10px] text-slate-400">{ret.invoiceNumber} • {ret.createdAt}</div>
                  </td>
                  <td className="p-3 font-bold text-slate-800">{ret.partyName}</td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{ret.productName}</div>
                    <div className="text-[10px] font-mono text-slate-400">{ret.productCode}</div>
                  </td>
                  <td className="p-3 text-center font-bold text-slate-900">{ret.cartons} Box</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      {ret.returnReason}
                    </span>
                    {ret.notes && (
                      <div className="text-[10px] text-slate-500 italic mt-0.5">{ret.notes}</div>
                    )}
                  </td>
                  <td className="p-3 text-right font-black text-rose-700 text-sm">
                    ₹{(ret.amount ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        ret.approvalStatus === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ret.approvalStatus}
                    </span>
                    {ret.creditNoteNumber && (
                      <div className="text-[9px] font-mono text-emerald-700 font-bold mt-0.5">
                        {ret.creditNoteNumber}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {ret.approvalStatus === 'Pending Approval' ? (
                      <button
                        onClick={() => onApproveReturn(ret.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-sm"
                      >
                        Approve Claim
                      </button>
                    ) : (
                      <span className="text-emerald-700 font-bold text-[11px]">
                        <i className="fa-solid fa-check mr-1"></i> Credited
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RETURN MODAL */}
      {isNewReturnModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-rose-600 tracking-wider">
                  Reversal Entry
                </span>
                <h3 className="text-lg font-black text-slate-900">Record Sales Return / Damage</h3>
              </div>
              <button
                onClick={() => setIsNewReturnModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Retail Party *</label>
                <select
                  required
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="">-- Choose Party --</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.area})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Invoice Number</label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-102"
                  value={invoiceNumberInput}
                  onChange={(e) => setInvoiceNumberInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Product *</label>
                <select
                  required
                  value={selectedProductCode}
                  onChange={(e) => setSelectedProductCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="">-- Choose Cadbury Item --</option>
                  {products.map(p => (
                    <option key={p.code} value={p.code}>{p.name} (₹{p.cartonRate}/Box)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Return Cartons *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cartonsInput}
                    onChange={(e) => setCartonsInput(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Return Reason *</label>
                  <select
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    {returnReasons.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Remarks / Driver Note</label>
                <input
                  type="text"
                  placeholder="e.g. Received damaged during delivery"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewReturnModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-lg shadow-md"
                >
                  Save Return Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
