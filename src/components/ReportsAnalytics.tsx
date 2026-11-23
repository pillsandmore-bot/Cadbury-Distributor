import React, { useState } from 'react';
import { 
  Order, 
  Party, 
  CadburyProduct, 
  Vehicle, 
  LoaderTask, 
  PaymentTransaction, 
  SalesReturn 
} from '../types/cadbury';

interface ReportsAnalyticsProps {
  orders: Order[];
  parties: Party[];
  products: CadburyProduct[];
  vehicles: Vehicle[];
  loaderTasks: LoaderTask[];
  payments: PaymentTransaction[];
  returns: SalesReturn[];
}

export const ReportsAnalytics: React.FC<ReportsAnalyticsProps> = ({
  orders,
  parties,
  products,
  vehicles,
  loaderTasks,
  payments,
  returns
}) => {
  const [activeReportType, setActiveReportType] = useState<
    'DAILY_SALES' | 'COLLECTION' | 'OUTSTANDING' | 'PRODUCT_SALES' | 'LOADER_PERFORMANCE' | 'RETURNS'
  >('DAILY_SALES');

  // Export Table Data to CSV
  const handleExportCSV = () => {
    let csv = '';
    let filename = `Cadbury_${activeReportType}_Report.csv`;

    if (activeReportType === 'DAILY_SALES') {
      csv = `Order Number,Invoice Number,Date,Party Name,Area,Cartons,Bill Amount,Stage,Payment Status\n`;
      orders.forEach(o => {
        csv += `"${o.orderNumber}","${o.invoiceNumber}","${o.orderDate}","${o.partyName}","${o.partyArea}",${o.totalCartons},${o.totalBill},"${o.stage}","${o.paymentStatus}"\n`;
      });
    } else if (activeReportType === 'COLLECTION') {
      csv = `Date,Party Name,Reference No,Payment Mode,Amount,Collected By,Notes\n`;
      payments.forEach(p => {
        csv += `"${p.date}","${p.partyName}","${p.referenceNo || ''}","${p.paymentMethod}",${p.creditAmount},"${p.collectedBy}","${p.notes || ''}"\n`;
      });
    } else if (activeReportType === 'OUTSTANDING') {
      csv = `Party Code,Party Name,Area,Mobile,GSTIN,Opening Balance,Current Outstanding,Credit Limit\n`;
      parties.forEach(p => {
        csv += `"${p.code}","${p.name}","${p.area}","${p.mobileNumber}","${p.gstNumber}",${p.openingBalance},${p.currentOutstanding},${p.creditLimit}\n`;
      });
    } else if (activeReportType === 'PRODUCT_SALES') {
      csv = `Product Code,Product Name,Category,Units/Box,Carton Rate,Physical Stock,Available Stock\n`;
      products.forEach(p => {
        csv += `"${p.code}","${p.name}","${p.category}",${p.unitsPerCarton},${p.cartonRate},${p.stockCartons},${p.availableStock}\n`;
      });
    } else if (activeReportType === 'LOADER_PERFORMANCE') {
      csv = `Order No,Loader Name,Employee ID,Vehicle No,Cartons To Load,Cartons Loaded,Difference,Status\n`;
      loaderTasks.forEach(t => {
        csv += `"${t.orderNumber}","${t.loaderName}","${t.employeeId}","${t.vehicleNumber}",${t.cartonsToLoad},${t.cartonsLoaded},${t.cartonsDifference || 0},"${t.status}"\n`;
      });
    } else if (activeReportType === 'RETURNS') {
      csv = `Return No,Invoice No,Party Name,Product,Cartons,Reason,Amount,Status\n`;
      returns.forEach(r => {
        csv += `"${r.returnNumber}","${r.invoiceNumber}","${r.partyName}","${r.productName}",${r.cartons},"${r.returnReason}",${r.amount},"${r.approvalStatus}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cadbury-950 to-indigo-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <i className="fa-solid fa-chart-line text-gold-400"></i> Executive Reports & Audits
          </div>
          <h2 className="text-2xl font-black">Distributor Reports & Analytics</h2>
          <p className="text-xs text-slate-300 mt-1">
            Generate, filter and download Daily Sales, Collections, Market Outstanding, Loader KPIs and Returns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center gap-1.5 transition-all"
          >
            <i className="fa-solid fa-print"></i> Print
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
          >
            <i className="fa-solid fa-file-excel"></i> Export Excel (CSV)
          </button>
        </div>
      </div>

      {/* Report Type Selector Pills */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-1.5 text-xs font-bold">
        {[
          { id: 'DAILY_SALES', label: "Daily Sales & Orders", icon: 'fa-file-invoice' },
          { id: 'COLLECTION', label: 'Daily Collection (Cash/UPI)', icon: 'fa-money-bill-wave' },
          { id: 'OUTSTANDING', label: 'Market Outstanding', icon: 'fa-hand-holding-dollar' },
          { id: 'PRODUCT_SALES', label: 'Cadbury Product Stock', icon: 'fa-candy-cane' },
          { id: 'LOADER_PERFORMANCE', label: 'Loader Loading & Discrepancy', icon: 'fa-boxes-packing' },
          { id: 'RETURNS', label: 'Damage & Returns', icon: 'fa-arrow-rotate-left' }
        ].map((tab) => {
          const isSel = activeReportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportType(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
                isSel
                  ? 'bg-cadbury-900 text-white shadow-sm font-black'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <i className={`fa-solid ${tab.icon} ${isSel ? 'text-gold-400' : 'text-slate-400'}`}></i>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Report Table Display */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        {/* DAILY SALES REPORT */}
        {activeReportType === 'DAILY_SALES' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-xs">
              <span className="font-bold text-slate-800">Orders Dispatched Today ({orders.length})</span>
              <span className="text-slate-500">
                Total Invoiced Value: <strong className="text-cadbury-900 font-black text-sm">
                  ₹{orders.reduce((sum, o) => sum + (o.totalBill || 0), 0).toLocaleString('en-IN')}
                </strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-2.5">Order No</th>
                    <th className="p-2.5">Party Name</th>
                    <th className="p-2.5">Area</th>
                    <th className="p-2.5 text-center">Cartons</th>
                    <th className="p-2.5 text-right">Bill Total</th>
                    <th className="p-2.5 text-center">Stage</th>
                    <th className="p-2.5 text-center">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-cadbury-900">{o.orderNumber}</td>
                      <td className="p-2.5 font-bold text-slate-800">{o.partyName}</td>
                      <td className="p-2.5">{o.partyArea}</td>
                      <td className="p-2.5 text-center font-bold">{o.totalCartons} Box</td>
                      <td className="p-2.5 text-right font-black text-slate-900">₹{(o.totalBill ?? 0).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-center font-semibold">{o.stage}</td>
                      <td className="p-2.5 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          o.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {o.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COLLECTION REPORT */}
        {activeReportType === 'COLLECTION' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-xs">
              <span className="font-bold text-slate-800">Payment Collection Receipts ({payments.length})</span>
              <span className="text-slate-500">
                Total Collected: <strong className="text-emerald-700 font-black text-sm">
                  ₹{payments.reduce((sum, p) => sum + (p.creditAmount || 0), 0).toLocaleString('en-IN')}
                </strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Party Name</th>
                    <th className="p-2.5">Payment Mode</th>
                    <th className="p-2.5">Ref No</th>
                    <th className="p-2.5 text-right font-bold text-emerald-700">Amount Received</th>
                    <th className="p-2.5">Collected By</th>
                    <th className="p-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono">{p.date}</td>
                      <td className="p-2.5 font-bold text-slate-800">{p.partyName}</td>
                      <td className="p-2.5 font-semibold text-slate-700">{p.paymentMethod}</td>
                      <td className="p-2.5 font-mono text-[11px]">{p.referenceNo}</td>
                      <td className="p-2.5 text-right font-black text-emerald-700">₹{(p.creditAmount ?? 0).toLocaleString('en-IN')}</td>
                      <td className="p-2.5">{p.collectedBy}</td>
                      <td className="p-2.5 text-slate-500 italic">{p.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OUTSTANDING REPORT */}
        {activeReportType === 'OUTSTANDING' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-xs">
              <span className="font-bold text-slate-800">Parties with Outstanding Dues ({parties.length})</span>
              <span className="text-slate-500">
                Total Market Dues: <strong className="text-red-700 font-black text-sm">
                  ₹{parties.reduce((sum, p) => sum + (p.currentOutstanding || 0), 0).toLocaleString('en-IN')}
                </strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Party / Shop Name</th>
                    <th className="p-2.5">Area</th>
                    <th className="p-2.5">Mobile</th>
                    <th className="p-2.5 text-right">Credit Limit</th>
                    <th className="p-2.5 text-right font-black text-red-600">Outstanding Balance</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parties.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-cadbury-900">{p.code}</td>
                      <td className="p-2.5 font-bold text-slate-900">{p.name}</td>
                      <td className="p-2.5">{p.area}</td>
                      <td className="p-2.5 font-mono">{p.mobileNumber}</td>
                      <td className="p-2.5 text-right">₹{(p.creditLimit ?? 0).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right font-black text-red-600">₹{(p.currentOutstanding ?? 0).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.currentOutstanding > p.creditLimit ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {p.currentOutstanding > p.creditLimit ? 'Over Limit' : 'Within Limit'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LOADER PERFORMANCE */}
        {activeReportType === 'LOADER_PERFORMANCE' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-xs">
              <span className="font-bold text-slate-800">Warehouse Loader Dispatch Audits ({loaderTasks.length})</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-2.5">Order</th>
                    <th className="p-2.5">Party</th>
                    <th className="p-2.5">Loader Name</th>
                    <th className="p-2.5">Vehicle</th>
                    <th className="p-2.5 text-center">Target Cartons</th>
                    <th className="p-2.5 text-center">Loaded Cartons</th>
                    <th className="p-2.5 text-center">Difference</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loaderTasks.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-cadbury-900">{t.orderNumber}</td>
                      <td className="p-2.5 font-bold text-slate-800">{t.partyName}</td>
                      <td className="p-2.5 font-semibold text-slate-700">{t.loaderName} ({t.employeeId})</td>
                      <td className="p-2.5 font-mono">{t.vehicleNumber}</td>
                      <td className="p-2.5 text-center">{t.cartonsToLoad} Box</td>
                      <td className="p-2.5 text-center font-bold text-slate-900">{t.cartonsLoaded} Box</td>
                      <td className="p-2.5 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          (t.cartonsDifference || 0) < 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {t.cartonsDifference || 0}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
