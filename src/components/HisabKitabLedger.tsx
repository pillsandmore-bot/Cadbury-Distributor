import React, { useState } from 'react';
import { Party, PaymentTransaction, Order } from '../types/cadbury';

interface HisabKitabLedgerProps {
  parties: Party[];
  payments: PaymentTransaction[];
  orders: Order[];
  onRecordPayment: (data: {
    partyId: string;
    amount: number;
    paymentMethod: 'Cash' | 'UPI' | 'Cheque' | 'Bank Transfer' | 'Credit';
    referenceNo?: string;
    notes?: string;
    collectedBy?: string;
    denominations?: {
      note500?: number;
      note200?: number;
      note100?: number;
      note50?: number;
      note20?: number;
      note10?: number;
      coins?: number;
    };
  }) => void;
}

export const HisabKitabLedger: React.FC<HisabKitabLedgerProps> = ({
  parties,
  payments,
  orders,
  onRecordPayment
}) => {
  const [selectedPartyId, setSelectedPartyId] = useState<string>(
    parties.length > 0 ? parties[0].id : ''
  );
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Payment Entry Form State
  const [payPartyId, setPayPartyId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'Cash' | 'UPI' | 'Cheque' | 'Bank Transfer'>('UPI');
  const [payRefNo, setPayRefNo] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [collectedByInput, setCollectedByInput] = useState<string>('Accountant Counter');

  // Currency Note Denomination State (नोटों का हिसाब)
  const [note500, setNote500] = useState<number>(0);
  const [note200, setNote200] = useState<number>(0);
  const [note100, setNote100] = useState<number>(0);
  const [note50, setNote50] = useState<number>(0);
  const [note20, setNote20] = useState<number>(0);
  const [note10, setNote10] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);

  const selectedParty = parties.find(p => p.id === selectedPartyId) || parties[0];

  // Payments for selected party
  const partyLedgerTransactions = payments.filter(
    p => p.partyId === (selectedParty ? selectedParty.id : '')
  );

  const totalDebit = partyLedgerTransactions.reduce((sum, t) => sum + (t.debitAmount || 0), 0);
  const totalCredit = partyLedgerTransactions.reduce((sum, t) => sum + (t.creditAmount || 0), 0);

  // Daily Collection Stats (Today)
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = payments.filter(p => p.date === todayStr && p.type === 'RECEIPT');
  const totalDailyCollected = todayTransactions.reduce((acc, t) => acc + t.creditAmount, 0);
  const cashDaily = todayTransactions.filter(t => t.paymentMethod === 'Cash').reduce((acc, t) => acc + t.creditAmount, 0);
  const upiDaily = todayTransactions.filter(t => t.paymentMethod === 'UPI').reduce((acc, t) => acc + t.creditAmount, 0);
  const chequeDaily = todayTransactions.filter(t => t.paymentMethod === 'Cheque').reduce((acc, t) => acc + t.creditAmount, 0);

  const totalMarketOutstanding = parties.reduce((sum, p) => sum + (p.currentOutstanding || 0), 0);

  // Cash Denomination auto calculator
  const updateDenomination = (
    val500: number, 
    val200: number, 
    val100: number, 
    val50: number, 
    val20: number, 
    val10: number, 
    valCoins: number
  ) => {
    setNote500(val500);
    setNote200(val200);
    setNote100(val100);
    setNote50(val50);
    setNote20(val20);
    setNote10(val10);
    setCoins(valCoins);

    const total = 
      (val500 * 500) + 
      (val200 * 200) + 
      (val100 * 100) + 
      (val50 * 50) + 
      (val20 * 20) + 
      (val10 * 10) + 
      valCoins;

    setPayAmount(total > 0 ? total.toString() : '');

    // Automatic note breakdown narration
    const parts: string[] = [];
    if (val500 > 0) parts.push(`₹500x${val500}`);
    if (val200 > 0) parts.push(`₹200x${val200}`);
    if (val100 > 0) parts.push(`₹100x${val100}`);
    if (val50 > 0) parts.push(`₹50x${val50}`);
    if (val20 > 0) parts.push(`₹20x${val20}`);
    if (val10 > 0) parts.push(`₹10x${val10}`);
    if (valCoins > 0) parts.push(`Coins: ₹${valCoins}`);
    
    if (parts.length > 0) {
      setPayNotes(`Cash Notes: ${parts.join(', ')} = ₹${total.toLocaleString('en-IN')}`);
    }
  };

  const resetDenomination = () => {
    setNote500(0);
    setNote200(0);
    setNote100(0);
    setNote50(0);
    setNote20(0);
    setNote10(0);
    setCoins(0);
    setPayAmount('');
    setPayNotes('Counter cash collection');
  };

  const handleOpenPayment = (partyId?: string) => {
    setPayPartyId(partyId || selectedPartyId);
    setPayAmount('');
    setPayRefNo(`RCPT/${Date.now().toString().slice(-6)}`);
    setPayNotes('Counter payment receipt');
    resetDenomination();
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payPartyId || !payAmount || Number(payAmount) <= 0) {
      alert('Please select party and enter valid amount');
      return;
    }

    onRecordPayment({
      partyId: payPartyId,
      amount: Number(payAmount),
      paymentMethod: payMethod,
      referenceNo: payRefNo,
      notes: payNotes,
      collectedBy: collectedByInput,
      denominations: payMethod === 'Cash' ? {
        note500,
        note200,
        note100,
        note50,
        note20,
        note10,
        coins
      } : undefined
    });

    setIsPaymentModalOpen(false);
  };

  // Export Ledger to CSV
  const handleExportCSV = () => {
    if (!selectedParty) return;

    let csvContent = `Date,Type,Payment Mode,Reference No,Debit (Bill),Credit (Payment),Notes\n`;
    partyLedgerTransactions.forEach(t => {
      csvContent += `"${t.date}","${t.type}","${t.paymentMethod}","${t.referenceNo || ''}",${t.debitAmount},${t.creditAmount},"${t.notes || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedParty.code}_Cadbury_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-cadbury-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <i className="fa-solid fa-coins text-gold-400"></i> Financial Hisab-Kitab
          </div>
          <h2 className="text-2xl font-black">Payment & Retailer Ledger Management</h2>
          <p className="text-xs text-emerald-100 mt-1">
            Track daily Cash & UPI collections, outstanding balances, party debits/credits, and ledger statements.
          </p>
        </div>

        <button
          onClick={() => handleOpenPayment()}
          className="px-5 py-3 bg-gold-500 hover:bg-gold-600 text-cadbury-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all"
        >
          <i className="fa-solid fa-plus-circle"></i> Party Se Payment Lena (Cash / UPI)
        </button>
      </div>

      {/* Daily Collection Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Today's Total Collection</span>
          <div className="text-xl font-black text-emerald-700 mt-1">
            ₹{(totalDailyCollected ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{todayTransactions.length} receipts today</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">UPI Collection</span>
          <div className="text-xl font-black text-blue-700 mt-1">
            ₹{(upiDaily ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-blue-500 mt-0.5">GooglePay / PhonePe / Paytm</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Cash in Hand</span>
          <div className="text-xl font-black text-amber-700 mt-1">
            ₹{(cashDaily ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5">Physical currency counter</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Market Outstanding</span>
          <div className="text-xl font-black text-red-700 mt-1">
            ₹{(totalMarketOutstanding ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-red-500 mt-0.5">Total retail pending dues</div>
        </div>
      </div>

      {/* Main Split: Party Selector & Ledger Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Party Directory & Balances */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Retail Parties ({parties.length})</h3>
            <span className="text-[11px] text-slate-400">Select to view ledger</span>
          </div>

          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search party..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[500px] pr-1">
            {parties
              .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((p) => {
                const isSelected = selectedParty && p.id === selectedParty.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPartyId(p.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500'
                        : 'bg-slate-50/50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800">{p.name}</div>
                      <div className="text-[10px] text-slate-500">{p.area} • {p.mobileNumber}</div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-black text-xs ${
                          p.currentOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        ₹{(p.currentOutstanding ?? 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[9px] text-slate-400 uppercase">Balance</div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Right Side: Ledger Statement */}
        {selectedParty && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            {/* Ledger Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-cadbury-900 bg-cadbury-50 px-2 py-0.5 rounded border border-cadbury-200">
                  {selectedParty.code}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{selectedParty.name}</h3>
                <p className="text-xs text-slate-500">{selectedParty.shopAddress}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <i className="fa-solid fa-print text-gold-400"></i> Print A4 Statement (PDF)
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <i className="fa-solid fa-file-excel text-emerald-600"></i> Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPayment(selectedParty.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <i className="fa-solid fa-plus"></i> Collect Payment
                </button>
              </div>
            </div>

            {/* Financial Status Summary */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Opening Balance</span>
                <span className="font-bold text-slate-800 text-sm">
                  ₹{(selectedParty.openingBalance ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Credit Limit</span>
                <span className="font-bold text-slate-800 text-sm">
                  ₹{(selectedParty.creditLimit ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Pending Dues</span>
                <span
                  className={`font-black text-base ${
                    selectedParty.currentOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  ₹{(selectedParty.currentOutstanding ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Type & Ref</th>
                    <th className="p-2.5">Mode</th>
                    <th className="p-2.5 text-right text-red-600">Debit (Invoice)</th>
                    <th className="p-2.5 text-right text-emerald-600">Credit (Payment)</th>
                    <th className="p-2.5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partyLedgerTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                        No transactions recorded for this party yet.
                      </td>
                    </tr>
                  ) : (
                    partyLedgerTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="p-2.5 text-slate-600 whitespace-nowrap">{tx.date}</td>
                        <td className="p-2.5">
                          <span
                            className={`font-bold ${
                              tx.type === 'INVOICE' ? 'text-red-700' : 'text-emerald-700'
                            }`}
                          >
                            {tx.type}
                          </span>
                          <div className="text-[10px] text-slate-400">{tx.referenceNo}</div>
                        </td>
                        <td className="p-2.5 font-semibold text-slate-700">{tx.paymentMethod}</td>
                        <td className="p-2.5 text-right font-bold text-red-600">
                          {tx.debitAmount > 0 ? `₹${(tx.debitAmount ?? 0).toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-600">
                          {tx.creditAmount > 0 ? `₹${(tx.creditAmount ?? 0).toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-900">
                          ₹{(tx.runningBalance ?? 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* RECORD PAYMENT POPUP MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                  Cash & Bank Entry
                </span>
                <h3 className="text-lg font-black text-slate-900">Receive Party Payment</h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Party *</label>
                <select
                  required
                  value={payPartyId}
                  onChange={(e) => setPayPartyId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800"
                >
                  <option value="">-- Choose Party --</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Pending: ₹{p.currentOutstanding})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Mode *</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['UPI', 'Cash', 'Cheque', 'Bank Transfer'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPayMethod(mode)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                        payMethod === mode
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Denomination Breakdown */}
              {payMethod === 'Cash' && (
                <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                      <i className="fa-solid fa-money-bill-wave text-amber-600"></i>
                      <span>Cash Note Denomination Counter (नोटों का हिसाब)</span>
                    </div>
                    <button
                      type="button"
                      onClick={resetDenomination}
                      className="text-[10px] text-red-600 hover:text-red-800 font-bold flex items-center gap-1"
                    >
                      <i className="fa-solid fa-rotate-left text-[9px]"></i> Reset Notes
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {/* 500 Note */}
                    <div className="bg-white p-2 rounded-lg border border-amber-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="text-amber-800">₹500 Note</span>
                        <span className="font-mono text-slate-500">₹{(note500 * 500).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={note500 || ''}
                          onChange={(e) => updateDenomination(Number(e.target.value) || 0, note200, note100, note50, note20, note10, coins)}
                          placeholder="0"
                          className="w-full px-2 py-1 border border-slate-300 rounded text-center font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => updateDenomination(note500 + 1, note200, note100, note50, note20, note10, coins)}
                          className="px-1.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[10px]"
                        >
                          +1
                        </button>
                      </div>
                    </div>

                    {/* 200 Note */}
                    <div className="bg-white p-2 rounded-lg border border-amber-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="text-amber-800">₹200 Note</span>
                        <span className="font-mono text-slate-500">₹{(note200 * 200).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={note200 || ''}
                          onChange={(e) => updateDenomination(note500, Number(e.target.value) || 0, note100, note50, note20, note10, coins)}
                          placeholder="0"
                          className="w-full px-2 py-1 border border-slate-300 rounded text-center font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => updateDenomination(note500, note200 + 1, note100, note50, note20, note10, coins)}
                          className="px-1.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[10px]"
                        >
                          +1
                        </button>
                      </div>
                    </div>

                    {/* 100 Note */}
                    <div className="bg-white p-2 rounded-lg border border-amber-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="text-amber-800">₹100 Note</span>
                        <span className="font-mono text-slate-500">₹{(note100 * 100).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={note100 || ''}
                          onChange={(e) => updateDenomination(note500, note200, Number(e.target.value) || 0, note50, note20, note10, coins)}
                          placeholder="0"
                          className="w-full px-2 py-1 border border-slate-300 rounded text-center font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => updateDenomination(note500, note200, note100 + 1, note50, note20, note10, coins)}
                          className="px-1.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[10px]"
                        >
                          +1
                        </button>
                      </div>
                    </div>

                    {/* 50 Note */}
                    <div className="bg-white p-2 rounded-lg border border-amber-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="text-amber-800">₹50 Note</span>
                        <span className="font-mono text-slate-500">₹{(note50 * 50).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={note50 || ''}
                          onChange={(e) => updateDenomination(note500, note200, note100, Number(e.target.value) || 0, note20, note10, coins)}
                          placeholder="0"
                          className="w-full px-2 py-1 border border-slate-300 rounded text-center font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => updateDenomination(note500, note200, note100, note50 + 1, note20, note10, coins)}
                          className="px-1.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[10px]"
                        >
                          +1
                        </button>
                      </div>
                    </div>

                    {/* 20 Note */}
                    <div className="bg-white p-2 rounded-lg border border-amber-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="text-amber-800">₹20 Note</span>
                        <span className="font-mono text-slate-500">₹{(note20 * 20).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={note20 || ''}
                          onChange={(e) => updateDenomination(note500, note200, note100, note50, Number(e.target.value) || 0, note10, coins)}
                          placeholder="0"
                          className="w-full px-2 py-1 border border-slate-300 rounded text-center font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => updateDenomination(note500, note200, note100, note50, note20 + 1, note10, coins)}
                          className="px-1.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[10px]"
                        >
                          +1
                        </button>
                      </div>
                    </div>

                    {/* 10 Note */}
                    <div className="bg-white p-2 rounded-lg border border-amber-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="text-amber-800">₹10 Note</span>
                        <span className="font-mono text-slate-500">₹{(note10 * 10).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={note10 || ''}
                          onChange={(e) => updateDenomination(note500, note200, note100, note50, note20, Number(e.target.value) || 0, coins)}
                          placeholder="0"
                          className="w-full px-2 py-1 border border-slate-300 rounded text-center font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => updateDenomination(note500, note200, note100, note50, note20, note10 + 1, coins)}
                          className="px-1.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[10px]"
                        >
                          +1
                        </button>
                      </div>
                    </div>

                    {/* Coins / Chhutta */}
                    <div className="bg-white p-2 rounded-lg border border-amber-200 shadow-2xs space-y-1 col-span-2 sm:col-span-3">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="text-amber-800">Coins / Chhutta (₹ Amount)</span>
                        <span className="font-mono text-slate-500">₹{(coins || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={coins || ''}
                        onChange={(e) => updateDenomination(note500, note200, note100, note50, note20, note10, Number(e.target.value) || 0)}
                        placeholder="e.g. 45"
                        className="w-full px-2 py-1 border border-slate-300 rounded font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Amount Received (₹) * {payMethod === 'Cash' && <span className="text-amber-600 text-[10px] font-normal">(Notes se automatic total hota hai)</span>}
                </label>
                <input
                  type="number"
                  required
                  placeholder="Enter amount"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-base font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reference / UTR / Cheque Number</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/2026/889911"
                  value={payRefNo}
                  onChange={(e) => setPayRefNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Collected By</label>
                <input
                  type="text"
                  value={collectedByInput}
                  onChange={(e) => setCollectedByInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes / Narration</label>
                <input
                  type="text"
                  placeholder="e.g. Settled against Inv #102"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg shadow-md"
                >
                  Save Payment Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* A4 PRINTABLE LEDGER STATEMENT MODAL */}
      {isPrintModalOpen && selectedParty && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn overflow-y-auto">
          {/* Print Specific CSS to Isolate #printable-a4-ledger */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-a4-ledger, #printable-a4-ledger * {
                visibility: visible !important;
              }
              #printable-a4-ledger {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 12mm !important;
                background: white !important;
                color: black !important;
                border: none !important;
                box-shadow: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200">
            {/* Top Action Bar (Screen Only - Hidden on Print) */}
            <div className="no-print bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-print text-gold-400"></i>
                <span className="font-bold text-xs">A4 Print & PDF Preview - {selectedParty.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-cadbury-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <i className="fa-solid fa-print"></i> Print / Save as PDF (A4)
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <i className="fa-solid fa-file-excel text-emerald-400"></i> Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm ml-2 transition-all"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            {/* A4 Printable Container */}
            <div id="printable-a4-ledger" className="p-8 sm:p-10 space-y-6 text-slate-800 bg-white font-sans max-h-[82vh] overflow-y-auto">
              {/* Distributor Company Header */}
              <div className="border-b-2 border-cadbury-900 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-cadbury-900 text-gold-400 flex items-center justify-center text-xl font-black">
                      <i className="fa-solid fa-candy-cane"></i>
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-cadbury-950">
                        CADBURY DISTRIBUTOR & LOGISTICS
                      </h1>
                      <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Authorized Wholesale Distribution Network • Mumbai Division
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Central Logistics Park, Western Express Highway, Mumbai 400068
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    GSTIN: <strong>27AABCC1234F1Z5</strong> | FSSAI: <strong>11521018000452</strong>
                  </div>
                </div>

                <div className="sm:text-right text-xs space-y-1">
                  <div className="inline-block px-3 py-1 bg-cadbury-900 text-gold-300 font-black text-xs uppercase tracking-wider rounded-lg mb-1">
                    Party Account Ledger
                  </div>
                  <div className="text-slate-500">Statement Date: <strong>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                  <div className="text-slate-500">Contact: <strong>+91 98200 11223</strong></div>
                </div>
              </div>

              {/* Retailer Details Box & Financial Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Retailer Info */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account / Retailer Details:</div>
                  <div className="text-base font-black text-slate-900">{selectedParty.name}</div>
                  <div className="text-slate-700"><strong>Owner:</strong> {selectedParty.ownerName}</div>
                  <div className="text-slate-700"><strong>Shop Address:</strong> {selectedParty.shopAddress}</div>
                  <div className="text-slate-700"><strong>Area / Route:</strong> {selectedParty.area}</div>
                  <div className="text-slate-700"><strong>Mobile:</strong> {selectedParty.mobileNumber}</div>
                  <div className="text-slate-700 font-mono"><strong>GSTIN:</strong> {selectedParty.gstNumber || 'Unregistered Retailer'}</div>
                </div>

                {/* Financial Position Snapshot */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Financial Account Summary:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[10px] block">Opening Balance</span>
                      <span className="font-bold text-slate-800">₹{(selectedParty.openingBalance ?? 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[10px] block">Credit Limit</span>
                      <span className="font-bold text-slate-800">₹{(selectedParty.creditLimit ?? 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[10px] block">Total Invoiced (Debit)</span>
                      <span className="font-bold text-red-600">₹{(totalDebit ?? 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[10px] block">Total Received (Credit)</span>
                      <span className="font-bold text-emerald-600">₹{(totalCredit ?? 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-cadbury-50 border border-cadbury-200 rounded-lg flex items-center justify-between">
                    <span className="font-black text-cadbury-950 text-xs">Closing Outstanding Balance:</span>
                    <span className={`text-base font-black ${(selectedParty.currentOutstanding ?? 0) > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      ₹{(selectedParty.currentOutstanding ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-600 border-b border-slate-300">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Particulars / Ref No</th>
                      <th className="p-2.5">Payment Mode</th>
                      <th className="p-2.5 text-right text-red-700">Debit (Invoice)</th>
                      <th className="p-2.5 text-right text-emerald-700">Credit (Payment)</th>
                      <th className="p-2.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {partyLedgerTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                          No transactions recorded for this account.
                        </td>
                      </tr>
                    ) : (
                      partyLedgerTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">{tx.date}</td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{tx.type}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{tx.referenceNo}</div>
                            {tx.notes && (
                              <div className="text-[10px] text-slate-500 italic mt-0.5">{tx.notes}</div>
                            )}
                          </td>
                          <td className="p-2.5 font-semibold text-slate-700">{tx.paymentMethod}</td>
                          <td className="p-2.5 text-right font-bold text-red-600">
                            {tx.debitAmount > 0 ? `₹${(tx.debitAmount ?? 0).toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="p-2.5 text-right font-bold text-emerald-600">
                            {tx.creditAmount > 0 ? `₹${(tx.creditAmount ?? 0).toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="p-2.5 text-right font-black text-slate-900">
                            ₹{(tx.runningBalance ?? 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-xs">
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right font-black text-slate-800">Statement Totals:</td>
                      <td className="p-2.5 text-right font-black text-red-600">₹{(totalDebit ?? 0).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right font-black text-emerald-600">₹{(totalCredit ?? 0).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right font-black text-cadbury-900">₹{(selectedParty.currentOutstanding ?? 0).toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Terms & Authorized Signatures Section */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-600">
                <div>
                  <div className="font-bold text-slate-800 mb-1">Declaration & Terms:</div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    1. This statement is computer-generated and represents official account transactions.<br />
                    2. Please verify all entries and settle pending dues within agreed credit terms.<br />
                    3. Cadbury chocolates must be stored below 20°C in distributor authorized chocolate coolers.
                  </p>
                  <div className="mt-8 pt-2 border-t border-dashed border-slate-300 text-center font-bold text-[11px] text-slate-700">
                    Retailer Signature & Rubber Stamp (ग्राहक मुहर व हस्ताक्षर)
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div className="text-right text-[10px] text-slate-400">
                    Generated via Cadbury DMS • {new Date().toLocaleTimeString()}
                  </div>
                  <div className="mt-8 pt-2 border-t border-dashed border-slate-300 text-center font-bold text-[11px] text-cadbury-950">
                    For CADBURY DISTRIBUTOR & LOGISTICS<br />
                    <span className="text-[10px] font-normal text-slate-500">Authorized Signatory / Accountant Seal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
