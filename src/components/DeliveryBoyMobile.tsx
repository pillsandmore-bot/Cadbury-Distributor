import React, { useState, useRef } from 'react';
import { Order, GoodsStage } from '../types/cadbury';

interface DeliveryBoyMobileProps {
  orders: Order[];
  onCompleteDelivery: (
    orderId: string,
    data: {
      paymentMethod: 'Cash' | 'UPI' | 'Cheque' | 'Credit';
      amountPaid: number;
      signatureData?: string;
      photoData?: string;
      remarks?: string;
      refNumber?: string;
    }
  ) => void;
}

export const DeliveryBoyMobile: React.FC<DeliveryBoyMobileProps> = ({
  orders,
  onCompleteDelivery
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'DELIVERED'>('PENDING');
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<Order | null>(null);

  // Delivery Modal State
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Cheque' | 'Credit'>('UPI');
  const [amountCollected, setAmountCollected] = useState<string>('');
  const [refNumber, setRefNumber] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Canvas Signature Pad
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);

  const filteredOrders = orders.filter(o => {
    if (activeFilter === 'PENDING') return o.deliveryStatus !== 'Delivered';
    if (activeFilter === 'DELIVERED') return o.deliveryStatus === 'Delivered';
    return true;
  });

  const totalDeliveries = orders.length;
  const completedDeliveries = orders.filter(o => o.deliveryStatus === 'Delivered').length;
  const pendingDeliveries = totalDeliveries - completedDeliveries;
  const totalAmountToCollect = orders.reduce((sum, o) => sum + o.totalBill, 0);
  const totalCollectedToday = orders
    .filter(o => o.deliveryStatus === 'Delivered')
    .reduce((sum, o) => sum + (o.paidAmount || 0), 0);

  // Open Delivery Modal
  const openDeliveryModal = (order: Order) => {
    setSelectedOrderForDelivery(order);
    setAmountCollected(order.totalBill.toString());
    setPaymentMethod('UPI');
    setRefNumber(`UPI/${Date.now().toString().slice(-6)}`);
    setRemarks('Delivered in fresh condition');
    setPhotoPreview(null);
    setHasSignature(false);

    setTimeout(() => {
      clearSignature();
    }, 100);
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Completed Delivery
  const handleConfirmDelivery = () => {
    if (!selectedOrderForDelivery) return;

    let signatureBase64: string | undefined = undefined;
    if (canvasRef.current && hasSignature) {
      signatureBase64 = canvasRef.current.toDataURL('image/png');
    }

    onCompleteDelivery(selectedOrderForDelivery.id, {
      paymentMethod,
      amountPaid: Number(amountCollected) || 0,
      signatureData: signatureBase64,
      photoData: photoPreview || undefined,
      remarks,
      refNumber
    });

    setSelectedOrderForDelivery(null);
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Mobile Top App Bar */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <i className="fa-solid fa-motorcycle text-yellow-300"></i> Delivery Boy Mobile Portal
          </div>
          <h2 className="text-2xl font-black">Today's Delivery Route & Dispatch</h2>
          <p className="text-xs text-emerald-100 mt-1">
            Deliver Cadbury orders to retail parties, collect Cash/UPI payments & take digital shopkeeper signature.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/20">
            <span className="block text-lg font-black text-white">{completedDeliveries} / {totalDeliveries}</span>
            <span className="text-[10px] text-emerald-200 uppercase font-bold">Delivered</span>
          </div>
          <div className="bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/20">
            <span className="block text-lg font-black text-yellow-300">{pendingDeliveries}</span>
            <span className="text-[10px] text-emerald-200 uppercase font-bold">Pending</span>
          </div>
          <div className="bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/20">
            <span className="block text-lg font-black text-emerald-300">₹{(totalCollectedToday ?? 0).toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-emerald-200 uppercase font-bold">Collected</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveFilter('PENDING')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeFilter === 'PENDING'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <i className="fa-solid fa-hourglass-half text-amber-500"></i> Pending Deliveries ({pendingDeliveries})
        </button>

        <button
          onClick={() => setActiveFilter('DELIVERED')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeFilter === 'DELIVERED'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <i className="fa-solid fa-circle-check text-emerald-500"></i> Delivered ({completedDeliveries})
        </button>

        <button
          onClick={() => setActiveFilter('ALL')}
          className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${
            activeFilter === 'ALL'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All ({totalDeliveries})
        </button>
      </div>

      {/* Today's Party Delivery List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
            <i className="fa-solid fa-clipboard-check text-4xl text-slate-300 mb-3 block"></i>
            <h4 className="font-bold text-slate-700">No Orders in this view</h4>
            <p className="text-xs text-slate-400 mt-1">All deliveries in this category are up to date!</p>
          </div>
        ) : (
          filteredOrders.map((order, idx) => {
            const isDelivered = order.deliveryStatus === 'Delivered';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden shadow-sm hover:shadow-md ${
                  isDelivered ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
                }`}
              >
                <div className="p-4 sm:p-5 flex flex-col space-y-4">
                  {/* Top Row: Order ID, Sequence & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-cadbury-900 text-white font-black text-xs flex items-center justify-center">
                        #{order.deliverySequence || idx + 1}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded">
                        {order.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Inv: {order.invoiceNumber}
                      </span>
                    </div>

                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <i className={`fa-solid ${isDelivered ? 'fa-check' : 'fa-truck'} text-[10px]`}></i>
                      {order.deliveryStatus}
                    </span>
                  </div>

                  {/* Party Information */}
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{order.partyName}</h3>
                    <div className="text-xs text-slate-600 flex items-start gap-1.5 mt-1">
                      <i className="fa-solid fa-location-dot text-red-500 mt-0.5"></i>
                      <span>
                        <strong>{order.partyArea}</strong> - {order.partyAddress}
                      </span>
                    </div>
                  </div>

                  {/* Order Financials & Cartons */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Cartons</span>
                      <span className="font-black text-slate-800 text-sm">{order.totalCartons} Box</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Bill Amount</span>
                      <span className="font-black text-cadbury-800 text-sm">
                        ₹{(order.totalBill ?? 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment</span>
                      <span
                        className={`font-black text-xs ${
                          order.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {order.paymentStatus}
                        {order.paymentMode && ` (${order.paymentMode})`}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Boy Mobile Quick Actions: Call, WhatsApp, Google Maps, Deliver */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {/* Call Retailer */}
                    <a
                      href={`tel:${order.partyMobile}`}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      <i className="fa-solid fa-phone text-emerald-600"></i> Call Party
                    </a>

                    {/* WhatsApp Retailer */}
                    <a
                      href={`https://wa.me/91${order.partyMobile}?text=Namaste%20${encodeURIComponent(
                        order.partyName
                      )},%20Cadbury%20Delivery%20Boy%20is%20reaching%20your%20shop%20with%20Bill%20No%20${encodeURIComponent(
                        order.invoiceNumber
                      )}%20Amount:%20Rs.${order.totalBill}.`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all border border-emerald-200"
                    >
                      <i className="fa-brands fa-whatsapp text-emerald-600"></i> WhatsApp
                    </a>

                    {/* Google Map Navigation */}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${order.partyLat},${order.partyLng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all border border-blue-200"
                    >
                      <i className="fa-solid fa-diamond-turn-right text-blue-600"></i> Navigate
                    </a>

                    {/* Delivered Confirm Action */}
                    {!isDelivered ? (
                      <button
                        onClick={() => openDeliveryModal(order)}
                        className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                      >
                        <i className="fa-solid fa-circle-check"></i> Delivered
                      </button>
                    ) : (
                      <div className="py-2.5 px-3 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1">
                        <i className="fa-solid fa-check"></i> Confirmed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DELIVERY COMPLETION POPUP MODAL */}
      {selectedOrderForDelivery && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                  Proof of Delivery & Collection
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Confirm Delivery - {selectedOrderForDelivery.partyName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrderForDelivery(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Bill Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-500 block">Total Bill Amount:</span>
                <span className="text-2xl font-black text-cadbury-900">
                  ₹{(selectedOrderForDelivery?.totalBill ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-500 block">Cartons to Deliver:</span>
                <span className="font-bold text-slate-800 text-base">
                  {selectedOrderForDelivery.totalCartons} Box
                </span>
              </div>
            </div>

            {/* Payment Method Selector (Cash / UPI / Cheque / Credit) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Payment Collection Mode:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['UPI', 'Cash', 'Cheque', 'Credit'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMethod(mode)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      paymentMethod === mode
                        ? 'bg-cadbury-900 text-white border-cadbury-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mode === 'UPI' && <i className="fa-solid fa-qrcode mr-1"></i>}
                    {mode === 'Cash' && <i className="fa-solid fa-money-bill mr-1"></i>}
                    {mode === 'Cheque' && <i className="fa-solid fa-money-check mr-1"></i>}
                    {mode === 'Credit' && <i className="fa-solid fa-clock mr-1"></i>}
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Collected Input */}
            {paymentMethod !== 'Credit' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Amount Received (₹):
                </label>
                <input
                  type="number"
                  value={amountCollected}
                  onChange={(e) => setAmountCollected(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            )}

            {paymentMethod === 'UPI' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  UPI Reference / UTR Number:
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI/2026/891278"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            )}

            {/* Digital Signature Pad (Party Signature) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">
                  Party Shopkeeper Signature:
                </label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-[11px] font-semibold text-red-600 hover:underline"
                >
                  Clear Signature
                </button>
              </div>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-1 bg-slate-50 touch-none">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={110}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-28 bg-white rounded-lg cursor-crosshair"
                />
              </div>
              <span className="text-[10px] text-slate-400 block">
                Sign with finger or stylus on mobile screen.
              </span>
            </div>

            {/* Delivery Photo Attachment */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Delivery Photo Proof (Store / Cartons):
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer text-center flex items-center justify-center gap-2">
                  <i className="fa-solid fa-camera text-slate-500"></i> Take / Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {photoPreview && (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-300">
                    <img src={photoPreview} alt="Delivery proof" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-0 right-0 bg-red-600 text-white w-4 h-4 text-[9px] flex items-center justify-center rounded-bl"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmDelivery}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-check"></i> Complete & Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
