import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2pdf from 'html2pdf.js';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';
import { 
  CadburyProduct, 
  Party, 
  Order, 
  OrderItem, 
  Vehicle, 
  CadburyProductCategory,
  GoodsStage
} from '../types/cadbury';

interface OrderBillingManagementProps {
  products: CadburyProduct[];
  parties: Party[];
  orders: Order[];
  vehicles: Vehicle[];
  onCreateOrder: (orderData: Partial<Order>) => void;
  onImportOrders?: (ordersList: any[]) => Promise<any>;
  onAddNewVehicle?: (vehicleData: any) => Promise<any>;
}

export const OrderBillingManagement: React.FC<OrderBillingManagementProps> = ({
  products,
  parties,
  orders,
  vehicles,
  onCreateOrder,
  onImportOrders,
  onAddNewVehicle
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isAddVanModalOpen, setIsAddVanModalOpen] = useState<boolean>(false);
  const [customVanNumber, setCustomVanNumber] = useState<string>('');
  const [customVanType, setCustomVanType] = useState<string>('Tata Ace Gold');
  const [customDriverName, setCustomDriverName] = useState<string>('');
  const [customDriverPhone, setCustomDriverPhone] = useState<string>('9820556677');
  const [customLoaderName, setCustomLoaderName] = useState<string>('');
  const [customCashierName, setCustomCashierName] = useState<string>('');
  const [isSubmittingVan, setIsSubmittingVan] = useState<boolean>(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Trip Dispatch & Loading Sheet Modal State
  const [isTripSheetModalOpen, setIsTripSheetModalOpen] = useState<boolean>(false);
  const [selectedTripLoadNo, setSelectedTripLoadNo] = useState<string>('188');
  const [selectedTripVehicle, setSelectedTripVehicle] = useState<string>('ALL');

  // Editable Trip Crew (Van, Driver, Loader, Cashier) & Locations for Trip Dispatch Sheet
  const [tripEditVan, setTripEditVan] = useState<string>('V1');
  const [tripEditDriver, setTripEditDriver] = useState<string>('Santosh Yadav');
  const [tripEditLoader, setTripEditLoader] = useState<string>('subham (LDR)');
  const [tripEditCashier, setTripEditCashier] = useState<string>('tejas (Cashier)');
  const [tripEditBoxesLoaded, setTripEditBoxesLoaded] = useState<string>('54');
  const [tripEditDriverLocation, setTripEditDriverLocation] = useState<string>('Bhandup West Beat / Station Road');
  const [tripEditLoaderLocation, setTripEditLoaderLocation] = useState<string>('Central Warehouse Bay 1');
  const [tripEditCashierLocation, setTripEditCashierLocation] = useState<string>('Village Road Collection Counter');
  const [isUpdatingTripCrew, setIsUpdatingTripCrew] = useState<boolean>(false);
  const [tripCrewSavedMsg, setTripCrewSavedMsg] = useState<string>('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  // Master lists for Vans (V1 to V6 & custom), Drivers, Loaders (LDR), and Cashiers
  const [crewMaster, setCrewMaster] = useState<{
    vans: Array<{ id: string; name: string; type?: string }>;
    drivers: Array<{ id: string; name: string; beat?: string }>;
    loaders: Array<{ id: string; name: string; bay?: string }>;
    cashiers: Array<{ id: string; name: string; location?: string }>;
  }>(() => {
    try {
      const saved = localStorage.getItem('cadbury_crew_master');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      vans: [
        { id: 'v1', name: 'V1', type: 'Tata Ace (Van 1)' },
        { id: 'v2', name: 'V2', type: 'Mahindra Bolero (Van 2)' },
        { id: 'v3', name: 'V3', type: 'Tata 407 (Van 3)' },
        { id: 'v4', name: 'V4', type: 'Van 4' },
        { id: 'v5', name: 'V5', type: 'Van 5' },
        { id: 'v6', name: 'V6', type: 'Van 6' },
        { id: 'v-mh02', name: 'MH 02 EK 4589', type: 'Tata Ace V2' },
        { id: 'v-mh04', name: 'MH 04 AB 1234', type: 'Mahindra Bolero V1' },
        { id: 'v-mh03', name: 'MH 03 CD 5678', type: 'Tata 407 V3' }
      ],
      drivers: [
        { id: 'd1', name: 'Santosh Yadav', beat: 'Bhandup West Beat / Station Road' },
        { id: 'd2', name: 'Krishna', beat: 'Bhandup Station Road / Village Road' },
        { id: 'd3', name: 'Ramesh Kumar', beat: 'Mulund West Beat' },
        { id: 'd4', name: 'Mukesh Sharma', beat: 'Kanjurmarg Beat' }
      ],
      loaders: [
        { id: 'l1', name: 'subham (LDR)', bay: 'Central Warehouse Bay 1' },
        { id: 'l2', name: 'Arjun (LDR)', bay: 'Central Warehouse Bay 2' },
        { id: 'l3', name: 'Ramesh (LDR)', bay: 'Central Warehouse Bay 3' },
        { id: 'l4', name: 'Ganesh (LDR)', bay: 'Loading Dock Bay 4' }
      ],
      cashiers: [
        { id: 'c1', name: 'tejas (Cashier)', location: 'Village Road Collection Counter' },
        { id: 'c2', name: 'Adarsh (Cashier)', location: 'Station Road Counter' },
        { id: 'c3', name: 'Vikas (Cashier)', location: 'Main Cash Counter' },
        { id: 'c4', name: 'Sunil (Cashier)', location: 'Market Collection Counter' }
      ]
    };
  });

  // Dedicated Crew & Fleet Master Manager Modal State
  const [isCrewMasterModalOpen, setIsCrewMasterModalOpen] = useState<boolean>(false);
  const [crewModalTab, setCrewModalTab] = useState<'vans' | 'drivers' | 'loaders' | 'cashiers'>('vans');
  const [crewNewNameInput, setCrewNewNameInput] = useState<string>('');
  const [crewNewExtraInput, setCrewNewExtraInput] = useState<string>('');
  const [isEveningCrewEditorOpen, setIsEveningCrewEditorOpen] = useState<boolean>(false);

  // Quick Add Modal / State for individual category
  const [quickAddCat, setQuickAddCat] = useState<'vans' | 'drivers' | 'loaders' | 'cashiers' | null>(null);
  const [quickAddName, setQuickAddName] = useState<string>('');
  const [quickAddExtra, setQuickAddExtra] = useState<string>('');

  // Fetch Crew Master from server backend on load
  useEffect(() => {
    fetch('/api/cadbury/crew-master')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.vans) && Array.isArray(data.drivers)) {
          setCrewMaster(data);
          try {
            localStorage.setItem('cadbury_crew_master', JSON.stringify(data));
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  // Save / Add item to crewMaster
  const handleSaveCrewMasterItem = async (
    category: 'vans' | 'drivers' | 'loaders' | 'cashiers',
    name: string,
    extra: string
  ) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const itemData: any = {
      id: `crew-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: trimmed
    };
    if (category === 'vans') itemData.type = extra.trim() || 'Delivery Van';
    if (category === 'drivers') itemData.beat = extra.trim() || 'Delivery Beat / Area';
    if (category === 'loaders') itemData.bay = extra.trim() || 'Warehouse Loading Bay';
    if (category === 'cashiers') itemData.location = extra.trim() || 'Cash Collection Counter';

    setCrewMaster(prev => {
      const next = { ...prev };
      const list = next[category] || [];
      const existsIdx = list.findIndex(x => x.name.toLowerCase() === trimmed.toLowerCase());
      if (existsIdx >= 0) {
        list[existsIdx] = { ...list[existsIdx], ...itemData };
        next[category] = [...list];
      } else {
        next[category] = [...list, itemData];
      }
      try {
        localStorage.setItem('cadbury_crew_master', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Automatically apply to active selection
    if (category === 'vans') setTripEditVan(trimmed);
    if (category === 'drivers') {
      setTripEditDriver(trimmed);
      if (extra.trim()) setTripEditDriverLocation(extra.trim());
    }
    if (category === 'loaders') {
      setTripEditLoader(trimmed);
      if (extra.trim()) setTripEditLoaderLocation(extra.trim());
    }
    if (category === 'cashiers') {
      setTripEditCashier(trimmed);
      if (extra.trim()) setTripEditCashierLocation(extra.trim());
    }

    try {
      await fetch('/api/cadbury/crew-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, item: itemData })
      });
    } catch (e) {}
  };

  // Delete item from crewMaster
  const handleDeleteCrewMasterItem = async (
    category: 'vans' | 'drivers' | 'loaders' | 'cashiers',
    id: string,
    name: string
  ) => {
    const confirm = window.confirm(`क्या आप "${name}" को मास्टर सूची से हटाना चाहते हैं?`);
    if (!confirm) return;

    setCrewMaster(prev => {
      const next = { ...prev };
      next[category] = (next[category] || []).filter(x => x.id !== id && x.name !== name);
      try {
        localStorage.setItem('cadbury_crew_master', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    try {
      await fetch(`/api/cadbury/crew-master/${category}/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch (e) {}
  };

  // Trip Loading Sheet Row-Level Evening Collection & RECD State
  const [isEveningEditMode, setIsEveningEditMode] = useState<boolean>(true);
  const [tripSheetEntries, setTripSheetEntries] = useState<{
    [orderNumber: string]: {
      recd: boolean;
      cash: number;
      cheque: string;
      chequeAmt: number;
      credit: number;
      partyStamp: string;
    };
  }>({});
  const [isSavingTripEntries, setIsSavingTripEntries] = useState<boolean>(false);
  const [importedEveningOrders, setImportedEveningOrders] = useState<Order[]>([]);

  // Dynamic Available Load Numbers from current orders
  const availableLoadNumbers = useMemo(() => {
    const setOfLoads = new Set<string>();
    orders.forEach(o => {
      if (o.loadNumber) setOfLoads.add(String(o.loadNumber).trim());
    });
    importedEveningOrders.forEach(o => {
      if (o.loadNumber) setOfLoads.add(String(o.loadNumber).trim());
    });
    const sorted = Array.from(setOfLoads).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
    return sorted;
  }, [orders, importedEveningOrders]);

  // Load Deletion State
  const [isDeleteLoadModalOpen, setIsDeleteLoadModalOpen] = useState<boolean>(false);
  const [loadToDelete, setLoadToDelete] = useState<string>('189');
  const [isDeletingLoad, setIsDeletingLoad] = useState<boolean>(false);
  const [deleteLoadMsg, setDeleteLoadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data Backup & Restore State (Local Drive & Cloud)
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isExportingBackup, setIsExportingBackup] = useState<boolean>(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string>('');
  const [isRestoringBackup, setIsRestoringBackup] = useState<boolean>(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreFileJson, setRestoreFileJson] = useState<any>(null);
  const [restoreStatus, setRestoreStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Evening Trip Settlement & Delivery Reconciliation State
  const [isEveningSettlementModalOpen, setIsEveningSettlementModalOpen] = useState<boolean>(false);
  const [settlementActualCash, setSettlementActualCash] = useState<string>('61700');
  const [settlementCreditAllowed, setSettlementCreditAllowed] = useState<string>('91722');
  const [settlementBoxesDelivered, setSettlementBoxesDelivered] = useState<string>('54');
  const [settlementBoxesReturned, setSettlementBoxesReturned] = useState<string>('0');
  const [settlementReturnAmount, setSettlementReturnAmount] = useState<string>('0');
  const [settlementRemarks, setSettlementRemarks] = useState<string>('');
  const [chequesList, setChequesList] = useState<Array<{ id: string; chequeNo: string; bankName: string; partyName: string; amount: number }>>([]);
  const [upisList, setUpisList] = useState<Array<{ id: string; upiRef: string; partyName: string; amount: number }>>([]);
  const [returnsList, setReturnsList] = useState<Array<{ id: string; partyName: string; cartons: number; amount: number; reason: string }>>([]);
  const [newChequeInput, setNewChequeInput] = useState<{ chequeNo: string; bankName: string; partyName: string; amount: string }>({ chequeNo: '', bankName: '', partyName: '', amount: '' });
  const [newUpiInput, setNewUpiInput] = useState<{ upiRef: string; partyName: string; amount: string }>({ upiRef: '', partyName: '', amount: '' });
  const [newReturnInput, setNewReturnInput] = useState<{ partyName: string; cartons: string; amount: string; reason: string }>({ partyName: '', cartons: '1', amount: '', reason: 'Party Shop Closed' });
  const [settlementBillsState, setSettlementBillsState] = useState<{ [orderNumber: string]: any }>({});
  const [isSavingSettlement, setIsSavingSettlement] = useState<boolean>(false);
  const [settlementSavedSuccess, setSettlementSavedSuccess] = useState<string>('');
  const [isDownloadingSettlementPdf, setIsDownloadingSettlementPdf] = useState<boolean>(false);
  const [pastSettlements, setPastSettlements] = useState<any[]>([]);
  const [showPastSettlementsTab, setShowPastSettlementsTab] = useState<boolean>(false);

  // Morning Trip Loading Sheet & Evening Settlement File Input Refs
  const morningTripImportInputRef = useRef<HTMLInputElement>(null);
  const eveningImportInputRef = useRef<HTMLInputElement>(null);
  const [isEnvelopeSlipModalOpen, setIsEnvelopeSlipModalOpen] = useState<boolean>(false);
  const [envelopeDenominations, setEnvelopeDenominations] = useState<{ n500: string; n200: string; n100: string; n50: string; n20: string; n10: string; coins: string }>({
    n500: '',
    n200: '',
    n100: '',
    n50: '',
    n20: '',
    n10: '',
    coins: ''
  });
  const [isDownloadingEnvelopePdf, setIsDownloadingEnvelopePdf] = useState<boolean>(false);

  // Sales Invoice Printing Dialog State (WinOmkar Sales Booking)
  const [isSalesInvoicePrintModalOpen, setIsSalesInvoicePrintModalOpen] = useState<boolean>(false);
  const [salesPrintLoadNo, setSalesPrintLoadNo] = useState<string>('189');
  const [salesPrintSeries, setSalesPrintSeries] = useState<string>('CAD');
  const [salesPrintFromBill, setSalesPrintFromBill] = useState<string>('6765');
  const [salesPrintToBill, setSalesPrintToBill] = useState<string>('6842');
  const [salesPrintCopies, setSalesPrintCopies] = useState<number>(2);
  const [salesPrintCopyType, setSalesPrintCopyType] = useState<string>('None');
  const [isBulkPrintPreviewOpen, setIsBulkPrintPreviewOpen] = useState<boolean>(false);
  const [bulkInvoicesToPrint, setBulkInvoicesToPrint] = useState<Order[]>([]);

  // Salesman & Beat Wise Summaries from Excel Report
  const [tripSalesmanSummary, setTripSalesmanSummary] = useState<any[]>([
    { scode: '105  [Jeetendra Rawal]', seriesBillNos: '6793 TO 6802', bills: 9, amount: 39593.00 },
    { scode: '109  [VINOD DHANAWADE]', seriesBillNos: '6770 TO 6775', bills: 6, amount: 14218.00 },
    { scode: '110  [VIJAY SHERE]', seriesBillNos: '6853 TO 6858', bills: 6, amount: 16313.00 },
    { scode: '113  [RAJ VAIRAT]', seriesBillNos: '6843 TO 6859', bills: 10, amount: 24588.00 },
    { scode: '114  [Harishankar Ramadhar Yadav]', seriesBillNos: '6820 TO 6830', bills: 10, amount: 16511.00 },
    { scode: '106  [Prathamesh Shashikant Kadam]', seriesBillNos: '6756 TO 6768', bills: 13, amount: 42199.00 }
  ]);
  const [tripBeatSummary, setTripBeatSummary] = useState<any[]>([
    { scode: '106 [Prathamesh Shashikant Kadam]', beat: 'Q96019', beatName: 'MANGATRAM TOP END', bills: 13, amount: 42199.00 },
    { scode: '109 [VINOD DHANAWADE]', beat: 'Q117042', beatName: 'Ganesh Nagar 1', bills: 6, amount: 14218.00 },
    { scode: '105 [Jeetendra Rawal]', beat: 'Q96018', beatName: 'KONKAN NAGAR TOP END', bills: 9, amount: 39593.00 },
    { scode: '114 [Harishankar Ramadhar Yadav]', beat: 'KO-CAD', beatName: '41 KOKAN NAGAR', bills: 10, amount: 16511.00 },
    { scode: '113 [RAJ VAIRAT]', beat: '61', beatName: '61 SONAPUR 1', bills: 4, amount: 8604.00 },
    { scode: '113 [RAJ VAIRAT]', beat: 'H2-CAD', beatName: '46 MANGATRAM', bills: 6, amount: 15984.00 },
    { scode: '110 [VIJAY SHERE]', beat: 'KON2-CAD', beatName: '47 KONKAN NAGAR 2 JR', bills: 6, amount: 16313.00 }
  ]);

  // Quick Crew Edit State for Individual Order
  const [editingCrewOrder, setEditingCrewOrder] = useState<Order | null>(null);
  const [crewEditVehicle, setCrewEditVehicle] = useState<string>('MH 02 EK 4589');
  const [crewEditDriver, setCrewEditDriver] = useState<string>('Santosh Yadav');
  const [crewEditLoader, setCrewEditLoader] = useState<string>('Ramesh Kumar');
  const [crewEditCashier, setCrewEditCashier] = useState<string>('Suresh Patil');
  const [crewEditLoadNo, setCrewEditLoadNo] = useState<string>('189');
  const [isSavingCrew, setIsSavingCrew] = useState<boolean>(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Form State for New Order & Staff Assignment
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [selectedVehicleNumber, setSelectedVehicleNumber] = useState<string>('MH 02 EK 4589');
  const [selectedDriverName, setSelectedDriverName] = useState<string>('Santosh Yadav');
  const [selectedLoaderName, setSelectedLoaderName] = useState<string>('Ramesh Kumar');
  const [selectedCashierName, setSelectedCashierName] = useState<string>('Suresh Patil');
  const [selectedLoadNo, setSelectedLoadNo] = useState<string>('189');
  const [deliveryDateInput, setDeliveryDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Item Addition Form
  const [chosenProductId, setChosenProductId] = useState<string>('');
  const [cartonsInput, setCartonsInput] = useState<number>(5);
  const [discountPercentInput, setDiscountPercentInput] = useState<number>(3);

  // Bulk Import State
  const [importRawText, setImportRawText] = useState<string>('');
  const [importParsedRows, setImportParsedRows] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string>('');

  // Bulk Import Batch Assignment Defaults
  const [batchVehicleNumber, setBatchVehicleNumber] = useState<string>('MH 02 EK 4589');
  const [batchDriverName, setBatchDriverName] = useState<string>('Santosh Yadav');
  const [batchLoaderName, setBatchLoaderName] = useState<string>('Ramesh Kumar');
  const [batchCashierName, setBatchCashierName] = useState<string>('Suresh Patil');
  const [batchLoadNumber, setBatchLoadNumber] = useState<string>('189');

  const categories = Object.values(CadburyProductCategory);

  const selectedParty = parties.find(p => p.id === selectedPartyId);

  // Handle vehicle change with auto crew filling (allows custom free-typing as well)
  const handleVehicleChange = (vehNum: string) => {
    setSelectedVehicleNumber(vehNum);
    const foundVeh = vehicles.find(v => v.vehicleNumber.toLowerCase() === vehNum.trim().toLowerCase());
    if (foundVeh) {
      if (foundVeh.driverName) setSelectedDriverName(foundVeh.driverName);
      if (foundVeh.helperLoaderName || foundVeh.loaderName) {
        setSelectedLoaderName(foundVeh.helperLoaderName || foundVeh.loaderName || 'Ramesh Kumar');
      }
      if (foundVeh.cashierName) {
        setSelectedCashierName(foundVeh.cashierName);
      }
    }
  };

  const handleBatchVehicleChange = (vehNum: string) => {
    setBatchVehicleNumber(vehNum);
    const foundVeh = vehicles.find(v => v.vehicleNumber.toLowerCase() === vehNum.trim().toLowerCase());
    if (foundVeh) {
      if (foundVeh.driverName) setBatchDriverName(foundVeh.driverName);
      if (foundVeh.helperLoaderName || foundVeh.loaderName) {
        setBatchLoaderName(foundVeh.helperLoaderName || foundVeh.loaderName || 'Ramesh Kumar');
      }
      if (foundVeh.cashierName) {
        setBatchCashierName(foundVeh.cashierName);
      }
    }
  };

  // Register brand new Van permanently into fleet
  const handleRegisterCustomVan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customVanNumber.trim()) {
      alert('Please enter Van Number');
      return;
    }
    setIsSubmittingVan(true);
    try {
      const vanNum = customVanNumber.trim().toUpperCase();
      const drvName = customDriverName.trim() || 'Driver';
      const ldrName = customLoaderName.trim() || 'Loader (LDR)';
      const cshName = customCashierName.trim() || 'Cashier';

      if (onAddNewVehicle) {
        await onAddNewVehicle({
          vehicleNumber: vanNum,
          vehicleType: customVanType,
          driverName: drvName,
          driverMobile: customDriverPhone,
          loaderName: ldrName,
          cashierName: cshName,
          cashierMobile: '9800000000',
          assignedRoute: 'Bhandup / Mumbai Territory'
        });
      }

      // Auto set this new van in both single order and batch import forms
      setSelectedVehicleNumber(vanNum);
      setSelectedDriverName(drvName);
      setSelectedLoaderName(ldrName);
      setSelectedCashierName(cshName);

      setBatchVehicleNumber(vanNum);
      setBatchDriverName(drvName);
      setBatchLoaderName(ldrName);
      setBatchCashierName(cshName);

      setIsAddVanModalOpen(false);
      setCustomVanNumber('');
      setCustomDriverName('');
      setCustomLoaderName('');
      setCustomCashierName('');
      alert(`✅ Delivery Van "${vanNum}" Driver "${drvName}" aur Loader "${ldrName}" ke saath fleet me successfully jud gayi!`);
    } catch (err: any) {
      alert('Failed to register van: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmittingVan(false);
    }
  };

  const handleApplyBatchCrewToRows = () => {
    setImportParsedRows(prev => prev.map(row => ({
      ...row,
      vehicleNumber: batchVehicleNumber,
      driverName: batchDriverName,
      loaderName: batchLoaderName,
      cashierName: batchCashierName,
      deliveryBoyName: batchCashierName,
      loadNumber: batchLoadNumber
    })));
  };

  // Open Crew Edit Modal for an order
  const handleOpenCrewEdit = (order: Order) => {
    setEditingCrewOrder(order);
    setCrewEditVehicle(order.vehicleNumber || 'MH 02 EK 4589');
    setCrewEditDriver(order.driverName || 'Santosh Yadav');
    setCrewEditLoader(order.loaderName || 'Ramesh Kumar');
    setCrewEditCashier(order.cashierName || order.deliveryBoyName || 'Suresh Patil');
    setCrewEditLoadNo(order.loadNumber || '189');
  };

  // Save updated crew to server
  const handleSaveCrewEdit = async () => {
    if (!editingCrewOrder) return;
    setIsSavingCrew(true);
    try {
      const res = await fetch(`/api/cadbury/orders/${editingCrewOrder.id}/crew`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleNumber: crewEditVehicle,
          driverName: crewEditDriver,
          loaderName: crewEditLoader,
          cashierName: crewEditCashier,
          loadNumber: crewEditLoadNo
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update crew');
      // Direct local update
      editingCrewOrder.vehicleNumber = crewEditVehicle;
      editingCrewOrder.driverName = crewEditDriver;
      editingCrewOrder.loaderName = crewEditLoader;
      editingCrewOrder.cashierName = crewEditCashier;
      editingCrewOrder.deliveryBoyName = crewEditCashier;
      editingCrewOrder.loadNumber = crewEditLoadNo;
      setEditingCrewOrder(null);
    } catch (err: any) {
      alert('Error updating crew: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingCrew(false);
    }
  };

  // Fetch past saved evening settlements
  const fetchPastSettlements = async () => {
    try {
      const res = await fetch('/api/cadbury/trips/settlements');
      const data = await res.json();
      if (Array.isArray(data)) setPastSettlements(data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchPastSettlements();
  }, []);

  // Open Trip Sheet modal and sync crew from active trip orders
  const handleOpenTripSheet = (loadNo = '188', veh = 'ALL') => {
    setSelectedTripLoadNo(loadNo);
    setSelectedTripVehicle(veh);
    const matching = orders.filter(o => {
      const matchLoad = loadNo === 'ALL' || (o.loadNumber || '188') === loadNo;
      const matchVeh = veh === 'ALL' || (o.vehicleNumber || 'MH 02 EK 4589') === veh;
      return matchLoad && matchVeh;
    });

    if (matching.length > 0) {
      setTripEditVan(matching[0].vehicleNumber || 'V1');
      setTripEditDriver(matching[0].driverName || 'Santosh Yadav');
      setTripEditLoader(matching[0].loaderName || 'subham (LDR)');
      setTripEditCashier(matching[0].cashierName || matching[0].deliveryBoyName || 'tejas (Cashier)');
      const calcBoxes = matching.reduce((s, o) => s + (o.totalCartons || 0), 0);
      setTripEditBoxesLoaded(calcBoxes > 0 ? String(calcBoxes) : '54');
      setTripEditDriverLocation((matching[0] as any).driverLocation || 'Bhandup West Beat / Station Road');
      setTripEditLoaderLocation((matching[0] as any).loaderLocation || 'Central Warehouse Bay 1');
      setTripEditCashierLocation((matching[0] as any).cashierLocation || 'Village Road Collection Counter');

      // Initialize row-level trip sheet entries for live evening collection
      setTripSheetEntries(prev => {
        const initialTripEntries: any = { ...prev };
        matching.forEach(ord => {
          const isCredit = ord.billType === 'CREDIT';
          if (!initialTripEntries[ord.orderNumber]) {
            initialTripEntries[ord.orderNumber] = {
              recd: ord.deliveryStatus === 'Delivered' || (ord as any).recd === true,
              cash: (ord as any).cashAmount !== undefined ? (ord as any).cashAmount : (isCredit ? 0 : ord.totalBill),
              cheque: (ord as any).chequeInfo || '',
              chequeAmt: (ord as any).chequeAmount !== undefined ? (ord as any).chequeAmount : (parseFloat((ord as any).chequeInfo) || 0),
              credit: (ord as any).creditAmount !== undefined ? (ord as any).creditAmount : (isCredit ? ord.totalBill : 0),
              partyStamp: (ord as any).partyStamp || (ord.deliveryStatus === 'Delivered' ? 'STAMP OK' : '')
            };
          }
        });
        return initialTripEntries;
      });
    } else {
      setTripEditBoxesLoaded('54');
    }
    setTripCrewSavedMsg('');
    setIsTripSheetModalOpen(true);
  };

  // Row-level handlers for editing Cash, Cheque, Credit and ticking RECD
  const handleToggleRecd = (orderNumber: string, totalBill: number, billType: string) => {
    setTripSheetEntries(prev => {
      const isCredit = billType === 'CREDIT';
      const current = prev[orderNumber] || {
        recd: false,
        cash: isCredit ? 0 : totalBill,
        cheque: '',
        chequeAmt: 0,
        credit: isCredit ? totalBill : 0,
        partyStamp: ''
      };
      const nextRecd = !current.recd;
      return {
        ...prev,
        [orderNumber]: {
          ...current,
          recd: nextRecd,
          partyStamp: nextRecd ? (current.partyStamp || 'STAMP OK') : ''
        }
      };
    });
  };

  const handleSetFullCash = (orderNumber: string, totalBill: number) => {
    setTripSheetEntries(prev => ({
      ...prev,
      [orderNumber]: {
        ...(prev[orderNumber] || { recd: true, cash: 0, cheque: '', chequeAmt: 0, credit: 0, partyStamp: '' }),
        recd: true,
        cash: totalBill,
        credit: 0,
        cheque: '',
        chequeAmt: 0,
        partyStamp: 'CASH RECD'
      }
    }));
  };

  const handleSetFullCredit = (orderNumber: string, totalBill: number) => {
    setTripSheetEntries(prev => ({
      ...prev,
      [orderNumber]: {
        ...(prev[orderNumber] || { recd: true, cash: 0, cheque: '', chequeAmt: 0, credit: 0, partyStamp: '' }),
        recd: true,
        cash: 0,
        credit: totalBill,
        cheque: '',
        chequeAmt: 0,
        partyStamp: 'KHATA OK'
      }
    }));
  };

  const handleEditTripCash = (orderNumber: string, val: number) => {
    setTripSheetEntries(prev => ({
      ...prev,
      [orderNumber]: {
        ...(prev[orderNumber] || { recd: true, cash: 0, cheque: '', chequeAmt: 0, credit: 0, partyStamp: '' }),
        recd: true,
        cash: val
      }
    }));
  };

  const handleEditTripCheque = (orderNumber: string, text: string) => {
    const nums = text.match(/\d+(\.\d+)?/g);
    const chqAmt = nums ? parseFloat(nums[nums.length - 1]) : 0;
    setTripSheetEntries(prev => ({
      ...prev,
      [orderNumber]: {
        ...(prev[orderNumber] || { recd: true, cash: 0, cheque: '', chequeAmt: 0, credit: 0, partyStamp: '' }),
        recd: true,
        cheque: text,
        chequeAmt: chqAmt
      }
    }));
  };

  const handleEditTripCredit = (orderNumber: string, val: number) => {
    setTripSheetEntries(prev => ({
      ...prev,
      [orderNumber]: {
        ...(prev[orderNumber] || { recd: true, cash: 0, cheque: '', chequeAmt: 0, credit: 0, partyStamp: '' }),
        recd: true,
        credit: val
      }
    }));
  };

  const handleEditPartyStamp = (orderNumber: string, val: string) => {
    setTripSheetEntries(prev => ({
      ...prev,
      [orderNumber]: {
        ...(prev[orderNumber] || { recd: true, cash: 0, cheque: '', chequeAmt: 0, credit: 0, partyStamp: '' }),
        partyStamp: val
      }
    }));
  };

  const handleMarkAllTripRecd = (tripOrders: Order[]) => {
    const updated: any = { ...tripSheetEntries };
    tripOrders.forEach(ord => {
      const isCredit = ord.billType === 'CREDIT';
      const current = updated[ord.orderNumber];
      updated[ord.orderNumber] = {
        recd: true,
        cash: current?.cash !== undefined ? current.cash : (isCredit ? 0 : ord.totalBill),
        cheque: current?.cheque || '',
        chequeAmt: current?.chequeAmt || 0,
        credit: current?.credit !== undefined ? current.credit : (isCredit ? ord.totalBill : 0),
        partyStamp: current?.partyStamp || 'STAMP OK'
      };
    });
    setTripSheetEntries(updated);
  };

  const handleResetTripEntries = (tripOrders: Order[]) => {
    const reset: any = {};
    tripOrders.forEach(ord => {
      const isCredit = ord.billType === 'CREDIT';
      reset[ord.orderNumber] = {
        recd: false,
        cash: isCredit ? 0 : ord.totalBill,
        cheque: '',
        chequeAmt: 0,
        credit: isCredit ? ord.totalBill : 0,
        partyStamp: ''
      };
    });
    setTripSheetEntries(reset);
  };

  const handleSaveTripSheetEntries = async (tripOrders: Order[]) => {
    setIsSavingTripEntries(true);
    try {
      const billsPayload = tripOrders.map(ord => {
        const isCredit = ord.billType === 'CREDIT';
        const entry = tripSheetEntries[ord.orderNumber] || {
          recd: ord.deliveryStatus === 'Delivered',
          cash: isCredit ? 0 : ord.totalBill,
          cheque: '',
          chequeAmt: 0,
          credit: isCredit ? ord.totalBill : 0,
          partyStamp: ''
        };
        const paid = (Number(entry.cash) || 0) + (Number(entry.chequeAmt) || 0);
        const pending = Math.max(0, ord.totalBill - paid);
        const mode = (entry.chequeAmt > 0) ? 'CHEQUE' : ((entry.credit > 0) ? 'CREDIT' : 'CASH');

        return {
          orderId: ord.id,
          orderNumber: ord.orderNumber,
          deliveryStatus: entry.recd ? 'Delivered' : 'Pending',
          paidAmount: paid,
          pendingAmount: pending,
          paymentMode: mode,
          cashAmount: entry.cash,
          chequeInfo: entry.cheque,
          chequeAmount: entry.chequeAmt,
          creditAmount: entry.credit,
          recd: entry.recd,
          partyStamp: entry.partyStamp
        };
      });

      const res = await fetch('/api/cadbury/orders/batch-settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bills: billsPayload, loadNumber: selectedTripLoadNo })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save entries');

      // Update in-memory orders
      billsPayload.forEach(b => {
        const ord = orders.find(o => o.orderNumber === b.orderNumber || o.id === b.orderId);
        if (ord) {
          ord.deliveryStatus = b.deliveryStatus as any;
          ord.paidAmount = b.paidAmount;
          ord.pendingAmount = b.pendingAmount;
          ord.paymentMode = b.paymentMode as any;
          (ord as any).cashAmount = b.cashAmount;
          (ord as any).chequeInfo = b.chequeInfo;
          (ord as any).chequeAmount = b.chequeAmount;
          (ord as any).creditAmount = b.creditAmount;
          (ord as any).recd = b.recd;
          (ord as any).partyStamp = b.partyStamp;
        }
      });

      setTripCrewSavedMsg(`✅ शाम की वैन वापसी: सभी ${tripOrders.length} बिलों की रोकड़, चेक व RECD टिक सुरक्षित हो गई!`);
      setTimeout(() => setTripCrewSavedMsg(''), 4500);
    } catch (err: any) {
      alert('Save error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingTripEntries(false);
    }
  };

  // Open Delete Load Modal
  const handleOpenDeleteLoadModal = (targetLoad?: string) => {
    const defaultTarget = targetLoad && targetLoad !== 'ALL' 
      ? targetLoad 
      : (selectedTripLoadNo !== 'ALL' ? selectedTripLoadNo : (availableLoadNumbers[0] || '189'));
    setLoadToDelete(defaultTarget);
    setDeleteLoadMsg(null);
    setIsDeleteLoadModalOpen(true);
  };

  // Execute Delete Load No
  const handleConfirmDeleteLoad = async () => {
    if (!loadToDelete || loadToDelete === 'ALL') {
      alert('Kripya valid Load No chunein.');
      return;
    }
    setIsDeletingLoad(true);
    setDeleteLoadMsg(null);
    try {
      const res = await fetch(`/api/cadbury/loads/${encodeURIComponent(loadToDelete)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete load');
      }

      setDeleteLoadMsg({
        type: 'success',
        text: `✅ ${data.message || `Load #${loadToDelete} safaltapoorvak delete ho gaya!`}`
      });

      // If the currently selected trip load was deleted, change it
      if (selectedTripLoadNo === loadToDelete) {
        setSelectedTripLoadNo('ALL');
      }

      setTimeout(() => {
        setIsDeleteLoadModalOpen(false);
        setDeleteLoadMsg(null);
      }, 1800);
    } catch (err: any) {
      setDeleteLoadMsg({
        type: 'error',
        text: `❌ Error: ${err.message || 'Could not delete load'}`
      });
    } finally {
      setIsDeletingLoad(false);
    }
  };

  // Delete Individual Bill from Evening Settlement
  const handleDeleteIndividualBill = async (ord: Order) => {
    const confirm = window.confirm(`क्या आप बिल #${ord.orderNumber} (${ord.partyName} - ₹${(ord.totalBill || 0).toLocaleString('en-IN')}) को इस लोड से डिलीट करना चाहते हैं?`);
    if (!confirm) return;

    try {
      await fetch(`/api/cadbury/orders/${encodeURIComponent(ord.id || ord.orderNumber)}`, {
        method: 'DELETE'
      });
    } catch (e) {}

    // Remove from local imported orders and settlement state
    setImportedEveningOrders(prev => prev.filter(o => o.id !== ord.id && o.orderNumber !== ord.orderNumber));
    setSettlementBillsState((prev: any) => {
      const next = { ...prev };
      delete next[ord.orderNumber];
      delete next[ord.id];
      return next;
    });

    // Remove from cheques/upis/returns if associated
    setChequesList(prev => prev.filter(c => !c.partyName?.includes(ord.partyName)));
    setUpisList(prev => prev.filter(u => !u.partyName?.includes(ord.partyName)));
    setReturnsList(prev => prev.filter(r => !r.partyName?.includes(ord.partyName)));

    alert(`✅ बिल #${ord.orderNumber} (${ord.partyName}) सफलतापूर्वक डिलीट हो गया!`);
  };

  // Delete Past Settlement Record
  const handleDeleteSettlementRecord = async (st: any) => {
    const settleId = st.id || st.settlementNumber;
    const confirm = window.confirm(`क्या आप सेटलमेंट #${st.settlementNumber} (Load #${st.loadNumber} - ${st.driverName}) को हमेशा के लिए डिलीट करना चाहते हैं?`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/cadbury/trips/settlements/${encodeURIComponent(settleId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPastSettlements(prev => prev.filter(s => (s.id || s.settlementNumber) !== settleId));
        alert(`✅ सेटलमेंट #${st.settlementNumber} डिलीट हो गया!`);
      } else {
        // Fallback local remove
        setPastSettlements(prev => prev.filter(s => (s.id || s.settlementNumber) !== settleId));
        alert(`✅ सेटलमेंट #${st.settlementNumber} डिलीट हो गया!`);
      }
    } catch (err: any) {
      setPastSettlements(prev => prev.filter(s => (s.id || s.settlementNumber) !== settleId));
      alert(`✅ सेटलमेंट #${st.settlementNumber} डिलीट हो गया!`);
    }
  };

  // Reset Active Settlement Form for Current Load
  const handleResetActiveSettlement = () => {
    const confirm = window.confirm(`क्या आप Load #${selectedTripLoadNo} का वर्तमान रोकड़, चेक व UPI डेटा रीसेट करना चाहते हैं?`);
    if (!confirm) return;

    setSettlementActualCash('0');
    setSettlementCreditAllowed('0');
    setSettlementReturnAmount('0');
    setChequesList([]);
    setUpisList([]);
    setReturnsList([]);
    setSettlementBoxesDelivered('');
    setSettlementBoxesReturned('0');
    handleAutoBreakdownDenominations(0);
    setSettlementBillsState({});
    alert(`🔄 Load #${selectedTripLoadNo} का सेटलमेंट डेटा रीसेट कर दिया गया।`);
  };

  // Download Complete JSON Backup to Local Computer / Drive
  const handleDownloadLocalBackup = async () => {
    setIsExportingBackup(true);
    try {
      const res = await fetch('/api/cadbury/backup/download');
      if (!res.ok) throw new Error('Backup download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
      a.download = `Cadbury_DMS_Full_Backup_${dateStr}_${timeStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setBackupSuccessMsg('✅ बैकअप फ़ाइल (.JSON) आपके कंप्यूटर पर डाउनलोड हो गई!');
      setTimeout(() => setBackupSuccessMsg(''), 5000);
    } catch (err: any) {
      alert('Backup download error: ' + err.message);
    } finally {
      setIsExportingBackup(false);
    }
  };

  // Save Directly to Chosen Local Folder / Cloud Synchronized Folder using File System Access API
  const handleSaveToLocalFolderDirectly = async () => {
    try {
      const res = await fetch('/api/cadbury/backup/download');
      if (!res.ok) throw new Error('Backup fetch failed');
      const data = await res.json();
      const content = JSON.stringify(data, null, 2);

      if ('showSaveFilePicker' in window) {
        const dateStr = new Date().toISOString().slice(0, 10);
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `Cadbury_DMS_Backup_${dateStr}.json`,
          types: [{
            description: 'JSON Backup File',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        setBackupSuccessMsg('✅ बैकअप आपके चुने हुए फ़ोल्डर (लोकल ड्राइव / पेन ड्राइव / क्लाउड फ़ोल्डर) में सेव हो गया!');
        setTimeout(() => setBackupSuccessMsg(''), 5000);
      } else {
        // Fallback for browsers without File System Access API
        const blob = new Blob([content], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Cadbury_DMS_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setBackupSuccessMsg('✅ बैकअप फ़ाइल डाउनलोड हो गई!');
        setTimeout(() => setBackupSuccessMsg(''), 5000);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        alert('File save error: ' + err.message);
      }
    }
  };

  // Export All Bills / Orders to Excel
  const handleExportBillsExcel = () => {
    try {
      const dataRows = orders.map((o, idx) => ({
        '#': idx + 1,
        'BILL DATE': o.orderDate || '',
        'BILL NO': o.orderNumber.replace('BILL-', '').replace('ORD-', ''),
        'INVOICE NO': o.invoiceNumber || '',
        'LOAD NO': o.loadNumber || '',
        'VAN NO': o.vehicleNumber || '',
        'DRIVER': o.driverName || '',
        'LOADER': o.loaderName || '',
        'CASHIER': o.cashierName || '',
        'PARTY NAME': o.partyName || '',
        'AREA / BEAT': o.partyArea || '',
        'TOTAL CARTONS': o.totalCartons || 0,
        'TOTAL AMOUNT (₹)': o.totalBill || 0,
        'CASH AMOUNT (₹)': (o as any).cashAmount ?? (o.billType !== 'CREDIT' ? o.totalBill : 0),
        'CHEQUE INFO': (o as any).chequeInfo || '',
        'CHEQUE AMT (₹)': (o as any).chequeAmount ?? 0,
        'CREDIT AMOUNT (₹)': (o as any).creditAmount ?? (o.billType === 'CREDIT' ? o.totalBill : 0),
        'DELIVERY STATUS': o.deliveryStatus || 'Pending',
        'PAYMENT STATUS': o.paymentStatus || 'Pending'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Cadbury Bills');
      const filename = `Cadbury_Orders_Bills_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, filename);
      setBackupSuccessMsg('✅ सभी बिल्स Excel (.xlsx) में डाउनलोड हो गए!');
      setTimeout(() => setBackupSuccessMsg(''), 5000);
    } catch (err: any) {
      alert('Excel export error: ' + err.message);
    }
  };

  // Open Cloud Drive (Google Drive / OneDrive)
  const handleOpenCloudDrive = (provider: 'google' | 'onedrive') => {
    if (provider === 'google') {
      window.open('https://drive.google.com/drive/u/0/my-drive', '_blank');
    } else {
      window.open('https://onedrive.live.com/', '_blank');
    }
  };

  // Copy Full Backup JSON to Clipboard
  const handleCopyBackupToClipboard = async () => {
    try {
      const res = await fetch('/api/cadbury/backup/download');
      if (!res.ok) throw new Error('Could not fetch backup');
      const data = await res.json();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setBackupSuccessMsg('✅ पूरा बैकअप JSON क्लिपबोर्ड पर कॉपी हो गया!');
      setTimeout(() => setBackupSuccessMsg(''), 5000);
    } catch (err: any) {
      alert('Copy error: ' + err.message);
    }
  };

  // Handle Restore File Selection
  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setRestoreStatus(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        setRestoreFileJson(json);
        const orderCount = json.summary?.totalOrders || json.store?.orders?.length || (Array.isArray(json.orders) ? json.orders.length : 0);
        setRestoreStatus({
          type: 'info',
          text: `📄 फ़ाइल पढ़ी गई: ${file.name} (${(file.size / 1024).toFixed(1)} KB) - इसमें ${orderCount} बिल्स मौजूद हैं।`
        });
      } catch (err) {
        setRestoreFileJson(null);
        setRestoreStatus({
          type: 'error',
          text: '❌ यह फ़ाइल वैध JSON बैकअप नहीं है। कृपया सही फ़ाइल चुनें।'
        });
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!restoreFileJson) {
      alert('Kripya pehle valid backup file chunein.');
      return;
    }
    const orderCount = restoreFileJson.summary?.totalOrders || restoreFileJson.store?.orders?.length || (Array.isArray(restoreFileJson.orders) ? restoreFileJson.orders.length : 'अनेक');
    const confirmed = window.confirm(`⚠️ क्या आप वाकई यह बैकअप रिस्टोर करना चाहते हैं?\n\nफ़ाइल: ${restoreFile?.name}\nबिल्स: ${orderCount}\n\nवर्तमान डेटा इस बैकअप फ़ाइल से अपडेट हो जाएगा। (सुरक्षा के लिए वर्तमान डेटा की ऑटो-कॉपी बन जाएगी)`);
    if (!confirmed) return;

    setIsRestoringBackup(true);
    setRestoreStatus(null);
    try {
      const res = await fetch('/api/cadbury/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restoreFileJson)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Restore failed');
      }

      setRestoreStatus({
        type: 'success',
        text: `🎉 ${data.message || 'डेटा सफलतापूर्वक रिस्टोर हो गया!'} (कुल बिल्स: ${data.totalOrders})`
      });

      setTimeout(() => {
        setIsBackupModalOpen(false);
        setRestoreFile(null);
        setRestoreFileJson(null);
        setRestoreStatus(null);
      }, 2500);
    } catch (err: any) {
      setRestoreStatus({
        type: 'error',
        text: `❌ रिस्टोर में गड़बड़ी: ${err.message}`
      });
    } finally {
      setIsRestoringBackup(false);
    }
  };

  // Clear All Previous Data Handler (Fresh Start for Real User Data)
  const [isClearingAllData, setIsClearingAllData] = useState<boolean>(false);
  const handleClearAllData = async () => {
    if (!confirm('क्या आप वाकई सभी पुराने बिल और पार्टियाँ हटाना चाहते हैं?\n\nइसके बाद आप अपना खुद का नया डेटा (Orders, Parties, Payments) शुरू से फ्रेश डाल सकेंगे।\n(सुरक्षा हेतु पहले बैकअप अपने कंप्यूटर में डाउनलोड कर लें)')) {
      return;
    }
    setIsClearingAllData(true);
    try {
      const res = await fetch('/api/cadbury/clear-all-data', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to clear data');
      alert('🎉 ' + data.message);
      setIsBackupModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert('Data clear error: ' + err.message);
    } finally {
      setIsClearingAllData(false);
    }
  };

  // Open Evening Trip Settlement modal and prepare reconciliation defaults for specific Load No
  const handleOpenEveningSettlement = (loadNo?: string, veh = 'ALL') => {
    // Strictly isolate each Load No - never aggregate all loads into one settlement!
    const targetLoad = (loadNo && loadNo !== 'ALL')
      ? loadNo
      : (selectedTripLoadNo && selectedTripLoadNo !== 'ALL' ? selectedTripLoadNo : (availableLoadNumbers[0] || '193'));
    setSelectedTripLoadNo(targetLoad);
    setSelectedTripVehicle(veh);
    
    let matching = orders.filter(o => {
      const matchLoad = String(o.loadNumber || '').trim() === String(targetLoad).trim();
      const matchVeh = veh === 'ALL' || (o.vehicleNumber || 'MH 02 EK 4589') === veh;
      return matchLoad && matchVeh;
    });

    if (matching.length === 0 && importedEveningOrders.length > 0) {
      matching = importedEveningOrders.filter(o => {
        const matchLoad = String(o.loadNumber || '').trim() === String(targetLoad).trim();
        const matchVeh = veh === 'ALL' || (o.vehicleNumber || 'MH 02 EK 4589') === veh;
        return matchLoad && matchVeh;
      });
      if (matching.length === 0) {
        matching = importedEveningOrders.filter(o => String(o.loadNumber || '').trim() === String(targetLoad).trim());
      }
    }

    const tripCashTotal = matching.filter(o => o.billType !== 'CREDIT').reduce((s, o) => s + (o.totalBill || 0), 0);
    const tripCreditTotal = matching.filter(o => o.billType === 'CREDIT').reduce((s, o) => s + (o.totalBill || 0), 0);
    const tripBoxesTotal = matching.reduce((s, o) => s + (o.totalCartons || 0), 0);

    setSettlementActualCash(tripCashTotal > 0 ? String(tripCashTotal) : '0');
    setSettlementCreditAllowed(tripCreditTotal > 0 ? String(tripCreditTotal) : '0');
    setSettlementBoxesDelivered(tripBoxesTotal > 0 ? String(tripBoxesTotal) : '0');
    setSettlementBoxesReturned('0');
    setSettlementReturnAmount('0');

    // Initialize per-bill statuses
    const initialBillsState: any = {};
    matching.forEach(ord => {
      const isCash = ord.billType !== 'CREDIT';
      initialBillsState[ord.orderNumber] = {
        orderId: ord.id,
        orderNumber: ord.orderNumber,
        partyName: ord.partyName,
        totalBill: ord.totalBill,
        cashAmount: isCash ? ord.totalBill : 0,
        chequeAmount: 0,
        upiAmount: 0,
        rtnAmount: 0,
        deliveryStatus: ord.deliveryStatus || 'Delivered',
        paymentMode: ord.billType || (isCash ? 'CASH' : 'CREDIT'),
        paidAmount: isCash ? ord.totalBill : 0,
        pendingAmount: !isCash ? ord.totalBill : 0,
        notes: ''
      };
    });
    setSettlementBillsState(initialBillsState);
    setSettlementSavedSuccess('');
    setIsEveningSettlementModalOpen(true);
  };

  // Save Trip Crew & Custom Boxes Loaded to all orders in this trip / load
  const handleSaveTripCrew = async () => {
    const matching = orders.filter(o => {
      const matchLoad = selectedTripLoadNo === 'ALL' || (o.loadNumber || '188') === selectedTripLoadNo;
      const matchVeh = selectedTripVehicle === 'ALL' || (o.vehicleNumber || 'MH 02 EK 4589') === selectedTripVehicle;
      return matchLoad && matchVeh;
    });

    if (matching.length === 0) {
      alert('Is trip/load ke liye koi bills nahi mile');
      return;
    }

    setIsUpdatingTripCrew(true);
    try {
      const orderIds = matching.map(o => o.id);
      const res = await fetch('/api/cadbury/orders/batch-crew', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds,
          vehicleNumber: tripEditVan,
          driverName: tripEditDriver,
          loaderName: tripEditLoader,
          cashierName: tripEditCashier,
          loadNumber: selectedTripLoadNo === 'ALL' ? '188' : selectedTripLoadNo,
          cartonsLoaded: tripEditBoxesLoaded ? Number(tripEditBoxesLoaded) : undefined,
          driverLocation: tripEditDriverLocation,
          loaderLocation: tripEditLoaderLocation,
          cashierLocation: tripEditCashierLocation
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update trip crew');

      // Update in-memory orders
      matching.forEach(ord => {
        ord.vehicleNumber = tripEditVan;
        ord.driverName = tripEditDriver;
        ord.loaderName = tripEditLoader;
        ord.cashierName = tripEditCashier;
        ord.deliveryBoyName = tripEditCashier;
        if (tripEditBoxesLoaded) ord.cartonsLoaded = Number(tripEditBoxesLoaded);
        (ord as any).driverLocation = tripEditDriverLocation;
        (ord as any).loaderLocation = tripEditLoaderLocation;
        (ord as any).cashierLocation = tripEditCashierLocation;
      });

      // If user had filtered by specific van, keep filter synchronized
      if (selectedTripVehicle !== 'ALL') {
        setSelectedTripVehicle(tripEditVan);
      }

      // If this van is new, register to fleet master
      if (onAddNewVehicle && tripEditVan && !vehicles.some(v => v.vehicleNumber.toUpperCase() === tripEditVan.toUpperCase())) {
        onAddNewVehicle({
          vehicleNumber: tripEditVan,
          driverName: tripEditDriver,
          driverPhone: '9820556677',
          loaderName: tripEditLoader,
          cashierName: tripEditCashier,
          type: 'Tata Ace Gold'
        }).catch(() => {});
      }

      // Automatically register any new van, driver, loader, cashier into Crew Master
      if (tripEditVan) handleSaveCrewMasterItem('vans', tripEditVan, 'Delivery Van');
      if (tripEditDriver) handleSaveCrewMasterItem('drivers', tripEditDriver, tripEditDriverLocation);
      if (tripEditLoader) handleSaveCrewMasterItem('loaders', tripEditLoader, tripEditLoaderLocation);
      if (tripEditCashier) handleSaveCrewMasterItem('cashiers', tripEditCashier, tripEditCashierLocation);

      setTripCrewSavedMsg(`✅ Van "${tripEditVan}" par Driver "${tripEditDriver}", Loader "${tripEditLoader}", Cashier "${tripEditCashier}" aur ${tripEditBoxesLoaded || '54'} Boxes jud gaye! (${matching.length} बिल अपडेट)`);
      setTimeout(() => setTripCrewSavedMsg(''), 4500);
    } catch (err: any) {
      alert('Trip crew update error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUpdatingTripCrew(false);
    }
  };

  // Helper to get active trip orders for current selected load & vehicle
  const getActiveTripOrders = (loadNo = selectedTripLoadNo, veh = selectedTripVehicle) => {
    let matching = orders.filter(o => {
      const matchLoad = loadNo === 'ALL' || String(o.loadNumber || '').trim() === String(loadNo).trim();
      const matchVeh = veh === 'ALL' || (o.vehicleNumber || 'MH 02 EK 4589') === veh;
      return matchLoad && matchVeh;
    });
    if (matching.length === 0 && importedEveningOrders.length > 0) {
      matching = importedEveningOrders.filter(o => {
        const matchLoad = loadNo === 'ALL' || String(o.loadNumber || '').trim() === String(loadNo).trim();
        const matchVeh = veh === 'ALL' || (o.vehicleNumber || 'MH 02 EK 4589') === veh;
        return matchLoad && matchVeh;
      });
      if (matching.length === 0) matching = importedEveningOrders;
    }
    return matching;
  };

  // Export Trip Dispatch & Loading Sheet to Excel (.xlsx)
  const handleExportTripSheetExcel = (customOrders?: Order[]) => {
    try {
      const tripOrders = customOrders || getActiveTripOrders();
      const loadStr = selectedTripLoadNo === 'ALL' ? '189' : selectedTripLoadNo;
      const vanStr = (tripEditVan || 'MH02EK4589').replace(/[^a-zA-Z0-9]/g, '_');

      const mainRows: any[] = [];
      mainRows.push({
        '#': 'VISTARAN HEALTH CARE SERVICES PVT.LTD. - MUMBAI: 400079',
        'BILL DATE': '', 'BILL NO': '', 'PARTY NAME': '', 'AMOUNT': '', 'CASH': '', 'CHEQUE': '', 'CREDIT': '', 'RECD': '', 'PARTY STAMP/SIGN': '', 'SCODE': '', 'BEAT': ''
      });
      mainRows.push({
        '#': `Loading Report (Bill Wise) | Load No: ${loadStr} | Van: ${tripEditVan} | Driver: ${tripEditDriver} | Loader: ${tripEditLoader} | Cashier: ${tripEditCashier}`,
        'BILL DATE': '', 'BILL NO': '', 'PARTY NAME': '', 'AMOUNT': '', 'CASH': '', 'CHEQUE': '', 'CREDIT': '', 'RECD': '', 'PARTY STAMP/SIGN': '', 'SCODE': '', 'BEAT': ''
      });
      mainRows.push({});

      let sumBill = 0;
      let sumCash = 0;
      let sumCheque = 0;
      let sumCredit = 0;
      let recdCount = 0;

      tripOrders.forEach((ord, idx) => {
        const cleanBillNo = ord.orderNumber.replace('BILL-', '').replace('ORD-', '');
        const isCredit = ord.billType === 'CREDIT';
        const ent = tripSheetEntries[ord.orderNumber] || {
          recd: ord.deliveryStatus === 'Delivered' || (ord as any).recd === true,
          cash: (ord as any).cashAmount !== undefined ? (ord as any).cashAmount : (isCredit ? 0 : ord.totalBill),
          cheque: (ord as any).chequeInfo || '',
          chequeAmt: (ord as any).chequeAmount !== undefined ? (ord as any).chequeAmount : (parseFloat((ord as any).chequeInfo) || 0),
          credit: (ord as any).creditAmount !== undefined ? (ord as any).creditAmount : (isCredit ? ord.totalBill : 0),
          partyStamp: (ord as any).partyStamp || (ord.deliveryStatus === 'Delivered' ? 'STAMP OK' : '')
        };

        const cashNum = Number(ent.cash) || 0;
        const chqNum = Number(ent.chequeAmt) || 0;
        const credNum = Number(ent.credit) || 0;

        sumBill += (ord.totalBill || 0);
        sumCash += cashNum;
        sumCheque += chqNum;
        sumCredit += credNum;
        if (ent.recd) recdCount++;

        mainRows.push({
          '#': idx + 1,
          'BILL DATE': ord.orderDate || '19-11-2026',
          'BILL NO': `/${cleanBillNo}`,
          'PARTY NAME': ord.partyName,
          'AMOUNT': ord.totalBill || 0,
          'CASH': cashNum,
          'CHEQUE': ent.cheque || (chqNum > 0 ? chqNum : ''),
          'CREDIT': credNum,
          'RECD': ent.recd ? 'YES (✓)' : 'NO',
          'PARTY STAMP/SIGN': ent.partyStamp || '',
          'SCODE': ord.salesmanCode || '',
          'BEAT': ord.partyArea || ''
        });
      });

      // Totals row
      mainRows.push({});
      mainRows.push({
        '#': 'TOTALS',
        'BILL DATE': `${tripOrders.length} BILLS`,
        'BILL NO': '',
        'PARTY NAME': `Boxes: ${tripEditBoxesLoaded || tripOrders.reduce((s, o) => s + (o.totalCartons || 0), 0)}`,
        'AMOUNT': sumBill,
        'CASH': sumCash,
        'CHEQUE': sumCheque,
        'CREDIT': sumCredit,
        'RECD': `${recdCount}/${tripOrders.length} Recd`,
        'PARTY STAMP/SIGN': Math.abs((sumCash + sumCheque + sumCredit) - sumBill) < 1 ? '100% TALLIED' : `DIFF: ₹${(sumCash + sumCheque + sumCredit) - sumBill}`,
        'SCODE': '',
        'BEAT': ''
      });

      const wb = XLSX.utils.book_new();
      const wsMain = XLSX.utils.json_to_sheet(mainRows);
      wsMain['!cols'] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 10 },
        { wch: 38 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 16 },
        { wch: 24 }
      ];
      XLSX.utils.book_append_sheet(wb, wsMain, 'Loading Sheet');

      // Sheet 2: SCODE & Beat Summary
      const summaryRows: any[] = [];
      summaryRows.push({ 'SECTION': 'SCODE / SALESMAN SERIES SUMMARY', 'SERIES': '', 'BILLS': '', 'AMOUNT (₹)': '' });
      tripSalesmanSummary.forEach(s => {
        summaryRows.push({
          'SECTION': s.scode,
          'SERIES': s.seriesBillNos || s.series,
          'BILLS': s.bills,
          'AMOUNT (₹)': Number(s.amount ?? s.amt ?? 0)
        });
      });

      summaryRows.push({});
      summaryRows.push({ 'SECTION': 'BEAT WISE SUMMARY', 'SERIES': 'BEAT CODE', 'BILLS': 'BILLS', 'AMOUNT (₹)': 'AMOUNT (₹)' });
      tripBeatSummary.forEach(b => {
        summaryRows.push({
          'SECTION': `${b.scode} - ${b.beatName}`,
          'SERIES': b.beat,
          'BILLS': b.bills,
          'AMOUNT (₹)': Number(b.amount ?? b.amt ?? 0)
        });
      });

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      wsSummary['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'SCODE & Beat Summary');

      const filename = `Cadbury_Loading_Sheet_Load${loadStr}_${vanStr}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err: any) {
      alert('Excel export error: ' + err.message);
    }
  };

  // Export Trip Dispatch & Loading Sheet to CSV (.csv)
  const handleExportTripSheetCSV = (customOrders?: Order[]) => {
    try {
      const tripOrders = customOrders || getActiveTripOrders();
      const loadStr = selectedTripLoadNo === 'ALL' ? '189' : selectedTripLoadNo;
      const vanStr = (tripEditVan || 'MH02EK4589').replace(/[^a-zA-Z0-9]/g, '_');

      const headers = ['SR NO', 'BILL DATE', 'BILL NO', 'PARTY NAME', 'AMOUNT', 'CASH', 'CHEQUE', 'CREDIT', 'RECD', 'PARTY STAMP/SIGN', 'SCODE', 'BEAT'];
      const rows: string[][] = [];

      let sumBill = 0;
      let sumCash = 0;
      let sumCheque = 0;
      let sumCredit = 0;
      let recdCount = 0;

      tripOrders.forEach((ord, idx) => {
        const cleanBillNo = ord.orderNumber.replace('BILL-', '').replace('ORD-', '');
        const isCredit = ord.billType === 'CREDIT';
        const ent = tripSheetEntries[ord.orderNumber] || {
          recd: ord.deliveryStatus === 'Delivered' || (ord as any).recd === true,
          cash: (ord as any).cashAmount !== undefined ? (ord as any).cashAmount : (isCredit ? 0 : ord.totalBill),
          cheque: (ord as any).chequeInfo || '',
          chequeAmt: (ord as any).chequeAmount !== undefined ? (ord as any).chequeAmount : (parseFloat((ord as any).chequeInfo) || 0),
          credit: (ord as any).creditAmount !== undefined ? (ord as any).creditAmount : (isCredit ? ord.totalBill : 0),
          partyStamp: (ord as any).partyStamp || (ord.deliveryStatus === 'Delivered' ? 'STAMP OK' : '')
        };

        const cashNum = Number(ent.cash) || 0;
        const chqNum = Number(ent.chequeAmt) || 0;
        const credNum = Number(ent.credit) || 0;

        sumBill += (ord.totalBill || 0);
        sumCash += cashNum;
        sumCheque += chqNum;
        sumCredit += credNum;
        if (ent.recd) recdCount++;

        rows.push([
          String(idx + 1),
          ord.orderDate || '19-11-2026',
          `/${cleanBillNo}`,
          `"${(ord.partyName || '').replace(/"/g, '""')}"`,
          String(ord.totalBill || 0),
          String(cashNum),
          `"${(ent.cheque || (chqNum > 0 ? String(chqNum) : '')).replace(/"/g, '""')}"`,
          String(credNum),
          ent.recd ? 'YES' : 'NO',
          `"${(ent.partyStamp || '').replace(/"/g, '""')}"`,
          `"${(ord.salesmanCode || '').replace(/"/g, '""')}"`,
          `"${(ord.partyArea || '').replace(/"/g, '""')}"`
        ]);
      });

      // Total row
      rows.push([
        'TOTALS',
        `${tripOrders.length} BILLS`,
        '',
        `"Boxes: ${tripEditBoxesLoaded || ''}"`,
        String(sumBill),
        String(sumCash),
        String(sumCheque),
        String(sumCredit),
        `${recdCount}/${tripOrders.length} Recd`,
        Math.abs((sumCash + sumCheque + sumCredit) - sumBill) < 1 ? '100% TALLIED' : `DIFF: ${sumCash + sumCheque + sumCredit - sumBill}`,
        '',
        ''
      ]);

      const csvContent = '\uFEFF' + [
        `"VISTARAN HEALTH CARE SERVICES PVT.LTD. - Loading Report (Bill Wise) - Load #${loadStr} - Van ${tripEditVan}"`,
        `"Driver: ${tripEditDriver} | Loader: ${tripEditLoader} | Cashier: ${tripEditCashier} | Date: ${tripOrders[0]?.orderDate || '19-11-2026'}"`,
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cadbury_Loading_Sheet_Load${loadStr}_${vanStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('CSV export error: ' + err.message);
    }
  };

  // Helper to paginate trip bills strictly across clean A4 pages so NO rows or summaries are ever cut
  const getTripSheetPages = (ordersList: Order[]) => {
    if (!ordersList || ordersList.length === 0) return [[]];
    // If 16 bills or fewer, everything fits comfortably on 1 single page with all summaries & signatures!
    if (ordersList.length <= 16) {
      return [ordersList];
    }
    
    // For 17 to 38 bills: Exactly 2 pages!
    // Page 1 gets ALL bills (up to 38 bills) to completely fill Page 1 with ZERO gap!
    // Page 2 gets [] (meaning Page 2 is the dedicated Settlement, Totals Breakdown, SCODE/Beat Summaries & 4 Signatures Sheet)!
    if (ordersList.length <= 38) {
      return [
        ordersList,
        []
      ];
    }

    // For 39 to 54 bills: Exactly 2 pages!
    // Page 1 gets 38 bills (fills Page 1 100%).
    // Page 2 gets remaining bills (rows 39 onwards) + Totals row + Summaries + Signatures.
    if (ordersList.length <= 54) {
      return [
        ordersList.slice(0, 38),
        ordersList.slice(38)
      ];
    }

    // For 55+ bills (3 pages or more):
    const pages: Order[][] = [];
    pages.push(ordersList.slice(0, 38));
    let cursor = 38;

    while (cursor < ordersList.length) {
      const remaining = ordersList.length - cursor;
      if (remaining <= 16) {
        pages.push(ordersList.slice(cursor));
        break;
      }
      const take = Math.min(38, remaining - 4);
      pages.push(ordersList.slice(cursor, cursor + take));
      cursor += take;
    }
    return pages;
  };

  // Direct Multi-Page PDF Download Handler (Strictly Page-by-Page with ZERO Horizontal Cuts)
  const handleDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    let tempWrapper: HTMLElement | null = null;
    try {
      const loadStr = selectedTripLoadNo === 'ALL' ? '188' : selectedTripLoadNo;
      const vanStr = (tripEditVan || 'MH02EK4589').replace(/[^a-zA-Z0-9]/g, '_');

      const pageNodes = document.querySelectorAll('.trip-sheet-pdf-page');
      if (!pageNodes || pageNodes.length === 0) {
        alert('Printable sheet nahi mila');
        return;
      }

      // Create an isolated fixed wrapper at (0, 0) for pristine html2canvas capture without screen interference
      tempWrapper = document.createElement('div');
      tempWrapper.style.position = 'fixed';
      tempWrapper.style.top = '0';
      tempWrapper.style.left = '0';
      tempWrapper.style.width = '794px';
      tempWrapper.style.zIndex = '-9999';
      tempWrapper.style.background = '#ffffff';
      tempWrapper.style.opacity = '1';
      tempWrapper.style.pointerEvents = 'none';
      tempWrapper.style.overflow = 'visible';
      document.body.appendChild(tempWrapper);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      for (let i = 0; i < pageNodes.length; i++) {
        const pageEl = pageNodes[i] as HTMLElement;
        const clone = pageEl.cloneNode(true) as HTMLElement;
        clone.style.width = '794px';
        clone.style.maxWidth = '794px';
        clone.style.minWidth = '794px';
        clone.style.minHeight = '1050px';
        clone.style.display = 'flex';
        clone.style.flexDirection = 'column';
        clone.style.justifyContent = 'space-between';
        clone.style.padding = '12px 14px';
        clone.style.margin = '0 auto';
        clone.style.boxSizing = 'border-box';
        clone.style.background = '#ffffff';
        clone.style.border = '2px solid #000000';

        // Hide no-print inside clone
        clone.querySelectorAll('.no-print').forEach((el) => {
          (el as HTMLElement).style.setProperty('display', 'none', 'important');
        });
        // Show print-only inside clone
        clone.querySelectorAll('.print-only').forEach((el) => {
          (el as HTMLElement).style.setProperty('display', 'inline-block', 'important');
        });

        // Ensure all tables are fixed width and collapse borders
        clone.querySelectorAll('table').forEach((t) => {
          const tbl = t as HTMLElement;
          tbl.style.width = '100%';
          tbl.style.tableLayout = 'fixed';
          tbl.style.borderCollapse = 'collapse';
        });

        // Ensure all cells have solid black borders and black text
        clone.querySelectorAll('th, td').forEach((cell) => {
          const c = cell as HTMLElement;
          c.style.setProperty('border', '1px solid #000000', 'important');
          c.style.setProperty('color', '#000000', 'important');
          c.style.setProperty('padding', '2.5px 3px', 'important');
          c.style.setProperty('word-break', 'break-word', 'important');
          c.style.setProperty('overflow-wrap', 'break-word', 'important');
        });

        // Ensure party cells wrap text cleanly and never truncate with ellipsis
        clone.querySelectorAll('.party-cell').forEach((cell) => {
          const c = cell as HTMLElement;
          c.style.setProperty('white-space', 'normal', 'important');
          c.style.setProperty('word-break', 'break-word', 'important');
          c.style.setProperty('overflow-wrap', 'break-word', 'important');
          c.style.setProperty('overflow', 'visible', 'important');
          c.style.setProperty('text-overflow', 'clip', 'important');
          c.style.setProperty('max-width', 'none', 'important');
          c.style.setProperty('font-size', '10px', 'important');
          c.style.setProperty('line-height', '1.2', 'important');
        });

        clone.querySelectorAll('th').forEach((th) => {
          const h = th as HTMLElement;
          h.style.setProperty('background-color', '#f1f5f9', 'important');
          h.style.setProperty('color', '#000000', 'important');
          h.style.setProperty('font-weight', '800', 'important');
        });

        tempWrapper.innerHTML = '';
        tempWrapper.appendChild(clone);

        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        // A4 size in mm: 210 x 297. Margins: 5mm left/right, 5mm top
        const imgWidthMm = 200;
        const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 5, 5, imgWidthMm, Math.min(imgHeightMm, 287));
      }

      pdf.save(`Cadbury_Trip_Sheet_Load${loadStr}_${vanStr}.pdf`);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      alert('PDF generation me samasya aayi, abhi direct print window khol rahe hain.');
      handlePrintTripSheet();
    } finally {
      if (tempWrapper && document.body.contains(tempWrapper)) {
        document.body.removeChild(tempWrapper);
      }
      setIsDownloadingPdf(false);
    }
  };

  // Full Multi-Page Clean A4 Print Handler (Prevents modal clipping)
  const handlePrintTripSheet = () => {
    const printContent = document.getElementById('printable-trip-sheet');
    if (!printContent) {
      window.print();
      return;
    }

    // Create an isolated hidden iframe so no modal / fixed overflow can clip pages
    const printIframe = document.createElement('iframe');
    printIframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;');
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Cadbury Trip Loading Sheet - Load #${selectedTripLoadNo === 'ALL' ? '188' : selectedTripLoadNo}</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 6mm 6mm 6mm;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              width: 100% !important;
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 10px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .trip-sheet-pdf-page {
              width: 100% !important;
              min-height: 275mm !important;
              page-break-after: always !important;
              break-after: page !important;
              padding: 2mm 0 !important;
              box-sizing: border-box !important;
              border: none !important;
              margin: 0 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
            }
            .trip-sheet-pdf-page:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
              min-height: auto !important;
            }
            table {
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: collapse !important;
              page-break-inside: auto;
              margin-top: 4px;
              margin-bottom: 4px;
            }
            th, td {
              border: 1px solid #000000 !important;
              color: #000000 !important;
              font-weight: 700 !important;
              padding: 2.5px 3px !important;
              font-size: 9.5px !important;
              word-break: break-word !important;
              overflow-wrap: break-word !important;
            }
            .party-cell {
              text-align: left !important;
              white-space: normal !important;
              word-break: break-word !important;
              overflow-wrap: break-word !important;
              overflow: visible !important;
              text-overflow: clip !important;
              max-width: none !important;
              font-size: 9.5px !important;
              line-height: 1.2 !important;
            }
            th {
              background-color: #f1f5f9 !important;
              color: #000000 !important;
              font-weight: 800 !important;
              text-transform: uppercase !important;
            }
            thead {
              display: table-header-group !important;
            }
            tfoot {
              display: table-footer-group !important;
            }
            tr {
              page-break-inside: avoid !important;
              page-break-after: auto !important;
            }
            .avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .no-print {
              display: none !important;
            }
            .print-only {
              display: inline-block !important;
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 3000);
    }, 600);
  };

  // Helper functions for Evening Settlement Entries
  const handleAddCheque = () => {
    if (!newChequeInput.chequeNo || !newChequeInput.amount) {
      alert('Cheque Number aur Amount zaroori hai');
      return;
    }
    const chq = {
      id: `chq-${Date.now()}`,
      chequeNo: newChequeInput.chequeNo.trim(),
      bankName: newChequeInput.bankName.trim() || 'HDFC Bank',
      partyName: newChequeInput.partyName.trim() || 'Retail Party',
      amount: parseFloat(newChequeInput.amount) || 0
    };
    setChequesList(prev => [...prev, chq]);
    setNewChequeInput({ chequeNo: '', bankName: '', partyName: '', amount: '' });
  };

  const handleRemoveCheque = (id: string) => {
    setChequesList(prev => prev.filter(c => c.id !== id));
  };

  const handleAddUpi = () => {
    if (!newUpiInput.upiRef || !newUpiInput.amount) {
      alert('UPI Reference / UTR aur Amount zaroori hai');
      return;
    }
    const upi = {
      id: `upi-${Date.now()}`,
      upiRef: newUpiInput.upiRef.trim(),
      partyName: newUpiInput.partyName.trim() || 'Retail Party',
      amount: parseFloat(newUpiInput.amount) || 0
    };
    setUpisList(prev => [...prev, upi]);
    setNewUpiInput({ upiRef: '', partyName: '', amount: '' });
  };

  const handleRemoveUpi = (id: string) => {
    setUpisList(prev => prev.filter(u => u.id !== id));
  };

  const handleAddReturn = () => {
    if (!newReturnInput.amount) {
      alert('Return Value (₹) zaroori hai');
      return;
    }
    const ret = {
      id: `ret-${Date.now()}`,
      partyName: newReturnInput.partyName.trim() || 'Retail Party',
      cartons: parseInt(newReturnInput.cartons) || 1,
      amount: parseFloat(newReturnInput.amount) || 0,
      reason: newReturnInput.reason || 'Party Shop Closed'
    };
    setReturnsList(prev => [...prev, ret]);
    setNewReturnInput({ partyName: '', cartons: '1', amount: '', reason: 'Party Shop Closed' });
  };

  const handleRemoveReturn = (id: string) => {
    setReturnsList(prev => prev.filter(r => r.id !== id));
  };

  const handleMarkAllDelivered = (tripOrders: Order[]) => {
    const updated: any = { ...settlementBillsState };
    tripOrders.forEach(ord => {
      const isCash = ord.billType !== 'CREDIT';
      updated[ord.orderNumber] = {
        orderId: ord.id,
        orderNumber: ord.orderNumber,
        partyName: ord.partyName,
        totalBill: ord.totalBill,
        deliveryStatus: 'Delivered',
        paymentMode: ord.billType || (isCash ? 'CASH' : 'CREDIT'),
        paidAmount: isCash ? ord.totalBill : 0,
        pendingAmount: !isCash ? ord.totalBill : 0,
        notes: 'Delivered & Verified'
      };
    });
    setSettlementBillsState(updated);
  };

  const handleSaveEveningSettlement = async (tripOrders: Order[], totalTripBill: number) => {
    setIsSavingSettlement(true);
    try {
      const totalChequesAmount = chequesList.reduce((s, c) => s + (Number(c.amount) || 0), 0);
      const totalUpiAmount = upisList.reduce((s, u) => s + (Number(u.amount) || 0), 0);
      const totalReturnsAmount = returnsList.reduce((s, r) => s + (Number(r.amount) || 0), 0) + (Number(settlementReturnAmount) || 0);
      const cashAmt = Number(settlementActualCash) || 0;
      const creditAmt = Number(settlementCreditAllowed) || 0;
      const totalAccounted = cashAmt + totalChequesAmount + totalUpiAmount + creditAmt + totalReturnsAmount;
      const shortageOrExcess = totalAccounted - totalTripBill;

      const payload = {
        loadNumber: selectedTripLoadNo === 'ALL' ? '188' : selectedTripLoadNo,
        vanNumber: tripEditVan,
        driverName: tripEditDriver,
        driverLocation: tripEditDriverLocation,
        loaderName: tripEditLoader,
        loaderLocation: tripEditLoaderLocation,
        cashierName: tripEditCashier,
        cashierLocation: tripEditCashierLocation,
        boxesDispatched: Number(tripEditBoxesLoaded) || tripOrders.reduce((s, o) => s + (o.totalCartons || 0), 0),
        boxesDelivered: Number(settlementBoxesDelivered) || 0,
        boxesReturned: Number(settlementBoxesReturned) || 0,
        totalTripDispatched: totalTripBill,
        actualCashCollected: cashAmt,
        actualChequeCollected: totalChequesAmount,
        actualUpiCollected: totalUpiAmount,
        creditAllowed: creditAmt,
        returnGoodsValue: totalReturnsAmount,
        totalAccounted,
        shortageOrExcess,
        cheques: chequesList,
        upis: upisList,
        returns: returnsList,
        bills: Object.values(settlementBillsState),
        remarks: settlementRemarks
      };

      const res = await fetch('/api/cadbury/trips/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save settlement');

      // Update in-memory orders
      Object.values(settlementBillsState).forEach((b: any) => {
        const ord = orders.find(o => o.orderNumber === b.orderNumber || o.id === b.orderId);
        if (ord) {
          ord.deliveryStatus = b.deliveryStatus;
          ord.paymentMode = b.paymentMode;
          ord.paidAmount = b.paidAmount;
          ord.pendingAmount = Math.max(0, ord.totalBill - b.paidAmount);
        }
      });

      setSettlementSavedSuccess(`✅ शाम का सेटलमेंट #${data.settlement.settlementNumber} सुरक्षित हो गया! सभी ${tripOrders.length} बिलों का डिलीवरी व रोकड़ रिकॉर्ड अपडेट हो गया।`);
      fetchPastSettlements();
      setTimeout(() => setSettlementSavedSuccess(''), 5000);
    } catch (err: any) {
      alert('Settlement Save Error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingSettlement(false);
    }
  };

  // Export Evening Settlement to Excel (.xlsx)
  const handleExportEveningSettlementExcel = (customOrders?: Order[]) => {
    try {
      const tripOrders = customOrders || getActiveTripOrders();
      const loadStr = selectedTripLoadNo === 'ALL' ? '188' : selectedTripLoadNo;
      const vanStr = (tripEditVan || 'V1').replace(/[^a-zA-Z0-9]/g, '_');

      const totalTripCashExpected = tripOrders.filter(o => o.billType !== 'CREDIT').reduce((s, o) => s + (o.totalBill || 0), 0);
      const totalTripCreditExpected = tripOrders.filter(o => o.billType === 'CREDIT').reduce((s, o) => s + (o.totalBill || 0), 0);
      const totalTripBill = tripOrders.reduce((s, o) => s + (o.totalBill || 0), 0);
      const totalTripCartons = tripOrders.reduce((s, o) => s + (o.totalCartons || 0), 0);

      const cashAmt = Number(settlementActualCash) || 0;
      const creditAmt = Number(settlementCreditAllowed) || 0;
      const totalChequesAmount = chequesList.reduce((s, c) => s + (Number(c.amount) || 0), 0);
      const totalUpiAmount = upisList.reduce((s, u) => s + (Number(u.amount) || 0), 0);
      const totalReturnsAmount = returnsList.reduce((s, r) => s + (Number(r.amount) || 0), 0) + (Number(settlementReturnAmount) || 0);
      const totalAccounted = cashAmt + totalChequesAmount + totalUpiAmount + creditAmt + totalReturnsAmount;
      const difference = totalAccounted - totalTripBill;

      const wb = XLSX.utils.book_new();

      // Sheet 1: Financial Reconciliation
      const summaryRows = [
        { 'PARAMETER': 'COMPANY', 'DETAILS': 'VISTARAN HEALTH CARE SERVICES PVT.LTD. (MUMBAI: 400079)' },
        { 'PARAMETER': 'REPORT', 'DETAILS': 'Evening Trip Settlement & Cash Reconciliation Voucher' },
        { 'PARAMETER': 'DATE', 'DETAILS': new Date().toLocaleDateString('en-GB') },
        { 'PARAMETER': 'LOAD NO', 'DETAILS': loadStr },
        { 'PARAMETER': 'VAN NO', 'DETAILS': tripEditVan },
        { 'PARAMETER': 'DRIVER', 'DETAILS': `${tripEditDriver} (${tripEditDriverLocation})` },
        { 'PARAMETER': 'LOADER', 'DETAILS': `${tripEditLoader} (${tripEditLoaderLocation})` },
        { 'PARAMETER': 'CASHIER', 'DETAILS': `${tripEditCashier} (${tripEditCashierLocation})` },
        { 'PARAMETER': 'BOXES DISPATCHED', 'DETAILS': Number(tripEditBoxesLoaded) || totalTripCartons },
        { 'PARAMETER': 'BOXES DELIVERED', 'DETAILS': Number(settlementBoxesDelivered) || 0 },
        { 'PARAMETER': 'BOXES RETURNED', 'DETAILS': Number(settlementBoxesReturned) || 0 },
        {},
        { 'PARAMETER': 'RECONCILIATION ITEM', 'DETAILS': 'COUNT', 'EXPECTED (₹)': 'EXPECTED (₹)', 'ACTUAL (₹)': 'ACTUAL (₹)' },
        { 'PARAMETER': '1. Cash Collected (रोकड़)', 'DETAILS': `${tripOrders.filter(o => o.billType !== 'CREDIT').length} Bills`, 'EXPECTED (₹)': totalTripCashExpected, 'ACTUAL (₹)': cashAmt },
        { 'PARAMETER': '2. Cheques Collected (चेक)', 'DETAILS': `${chequesList.length} Cheques`, 'EXPECTED (₹)': '-', 'ACTUAL (₹)': totalChequesAmount },
        { 'PARAMETER': '3. Digital / UPI Payments (QR)', 'DETAILS': `${upisList.length} UPIs`, 'EXPECTED (₹)': '-', 'ACTUAL (₹)': totalUpiAmount },
        { 'PARAMETER': '4. Credit Allowed (उधारी)', 'DETAILS': `${tripOrders.filter(o => o.billType === 'CREDIT').length} Bills`, 'EXPECTED (₹)': totalTripCreditExpected, 'ACTUAL (₹)': creditAmt },
        { 'PARAMETER': '5. Return Goods / Credit Notes (वापसी माल)', 'DETAILS': `${returnsList.length} Returns`, 'EXPECTED (₹)': '-', 'ACTUAL (₹)': totalReturnsAmount },
        {},
        { 'PARAMETER': 'TOTAL DISPATCHED VALUE (₹)', 'DETAILS': totalTripBill },
        { 'PARAMETER': 'TOTAL ACCOUNTED VALUE (₹)', 'DETAILS': totalAccounted },
        { 'PARAMETER': 'RECONCILIATION RESULT', 'DETAILS': Math.abs(difference) < 1 ? '100% TALLIED (₹0.00)' : difference < 0 ? `SHORTAGE: -₹${Math.abs(difference)}` : `EXCESS: +₹${difference}` }
      ];

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      wsSummary['!cols'] = [{ wch: 32 }, { wch: 30 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Reconciliation Summary');

      // Sheet 2: Cheques, UPIs and Returns Details
      const detailRows: any[] = [];
      if (chequesList.length > 0) {
        detailRows.push({ 'TYPE': 'CHEQUES COLLECTED', 'REF/NUMBER': 'BANK NAME', 'PARTY NAME': 'PARTY', 'AMOUNT (₹)': 'AMOUNT' });
        chequesList.forEach(c => {
          detailRows.push({ 'TYPE': 'Cheque', 'REF/NUMBER': c.chequeNo, 'BANK NAME': c.bankName, 'PARTY NAME': c.partyName, 'AMOUNT (₹)': c.amount });
        });
        detailRows.push({});
      }

      if (upisList.length > 0) {
        detailRows.push({ 'TYPE': 'UPI PAYMENTS', 'REF/NUMBER': 'UPI REF', 'BANK NAME': '', 'PARTY NAME': 'PARTY', 'AMOUNT (₹)': 'AMOUNT' });
        upisList.forEach(u => {
          detailRows.push({ 'TYPE': 'UPI', 'REF/NUMBER': u.upiRef, 'BANK NAME': '', 'PARTY NAME': u.partyName, 'AMOUNT (₹)': u.amount });
        });
        detailRows.push({});
      }

      if (returnsList.length > 0) {
        detailRows.push({ 'TYPE': 'SALES RETURNS', 'REF/NUMBER': 'CARTONS', 'BANK NAME': 'REASON', 'PARTY NAME': 'PARTY', 'AMOUNT (₹)': 'AMOUNT' });
        returnsList.forEach(r => {
          detailRows.push({ 'TYPE': 'Return', 'REF/NUMBER': `${r.cartons} Box`, 'BANK NAME': r.reason, 'PARTY NAME': r.partyName, 'AMOUNT (₹)': r.amount });
        });
      }

      if (detailRows.length > 0) {
        const wsDetail = XLSX.utils.json_to_sheet(detailRows);
        wsDetail['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsDetail, 'Instruments & Returns');
      }

      XLSX.writeFile(wb, `Cadbury_Evening_Settlement_Load${loadStr}_${vanStr}.xlsx`);
    } catch (err: any) {
      alert('Excel export error: ' + err.message);
    }
  };

  // Export Evening Settlement to CSV (.csv)
  const handleExportEveningSettlementCSV = (customOrders?: Order[]) => {
    try {
      const tripOrders = customOrders || getActiveTripOrders();
      const loadStr = selectedTripLoadNo === 'ALL' ? '188' : selectedTripLoadNo;
      const vanStr = (tripEditVan || 'V1').replace(/[^a-zA-Z0-9]/g, '_');

      const totalTripCashExpected = tripOrders.filter(o => o.billType !== 'CREDIT').reduce((s, o) => s + (o.totalBill || 0), 0);
      const totalTripCreditExpected = tripOrders.filter(o => o.billType === 'CREDIT').reduce((s, o) => s + (o.totalBill || 0), 0);
      const totalTripBill = tripOrders.reduce((s, o) => s + (o.totalBill || 0), 0);

      const cashAmt = Number(settlementActualCash) || 0;
      const creditAmt = Number(settlementCreditAllowed) || 0;
      const totalChequesAmount = chequesList.reduce((s, c) => s + (Number(c.amount) || 0), 0);
      const totalUpiAmount = upisList.reduce((s, u) => s + (Number(u.amount) || 0), 0);
      const totalReturnsAmount = returnsList.reduce((s, r) => s + (Number(r.amount) || 0), 0) + (Number(settlementReturnAmount) || 0);
      const totalAccounted = cashAmt + totalChequesAmount + totalUpiAmount + creditAmt + totalReturnsAmount;
      const difference = totalAccounted - totalTripBill;

      const lines: string[] = [
        `"VISTARAN HEALTH CARE SERVICES PVT.LTD. - Evening Trip Settlement & Cash Reconciliation Voucher"`,
        `"Load No: ${loadStr} | Van No: ${tripEditVan} | Date: ${new Date().toLocaleDateString('en-GB')}"`,
        `"Driver: ${tripEditDriver} | Loader: ${tripEditLoader} | Cashier: ${tripEditCashier}"`,
        '',
        'CATEGORY,BILLS/COUNT,EXPECTED (₹),ACTUAL COLLECTED (₹)',
        `"1. Cash Collected (रोकड़)",${tripOrders.filter(o => o.billType !== 'CREDIT').length} Bills,${totalTripCashExpected},${cashAmt}`,
        `"2. Cheques Collected (चेक)",${chequesList.length} Cheques,-,${totalChequesAmount}`,
        `"3. Digital / UPI Payments (QR)",${upisList.length} UPIs,-,${totalUpiAmount}`,
        `"4. Credit Allowed (उधारी)",${tripOrders.filter(o => o.billType === 'CREDIT').length} Bills,${totalTripCreditExpected},${creditAmt}`,
        `"5. Return Goods / Credit Notes (वापसी माल)",${returnsList.length} Returns,-,${totalReturnsAmount}`,
        '',
        `"TOTAL DISPATCHED VALUE",,,${totalTripBill}`,
        `"TOTAL ACCOUNTED VALUE",,,${totalAccounted}`,
        `"RECONCILIATION RESULT",,,${Math.abs(difference) < 1 ? '100% TALLIED (0.00)' : difference < 0 ? `SHORTAGE: -${Math.abs(difference)}` : `EXCESS: +${difference}`}`
      ];

      const csvContent = '\uFEFF' + lines.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cadbury_Evening_Settlement_Load${loadStr}_${vanStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('CSV export error: ' + err.message);
    }
  };

  // Evening Settlement Direct PDF Download Handler (Strictly Formatted for Clean A4 with Zero Cut-offs)
  const handleDownloadEveningSettlementPDF = async () => {
    const element = document.getElementById('printable-evening-settlement');
    if (!element) {
      alert('Settlement sheet nahi mila');
      return;
    }
    setIsDownloadingSettlementPdf(true);
    let wrapper: HTMLElement | null = null;
    try {
      const loadStr = selectedTripLoadNo === 'ALL' ? '188' : selectedTripLoadNo;
      const vanStr = (tripEditVan || 'V1').replace(/[^a-zA-Z0-9]/g, '_');

      // Create an isolated wrapper inside the document at (0, 0) behind viewport
      wrapper = document.createElement('div');
      wrapper.id = 'pdf-render-temp-settlement-wrapper';
      wrapper.style.position = 'fixed';
      wrapper.style.top = '0';
      wrapper.style.left = '0';
      wrapper.style.width = '794px';
      wrapper.style.zIndex = '-9999';
      wrapper.style.opacity = '1';
      wrapper.style.pointerEvents = 'none';
      wrapper.style.background = '#ffffff';
      wrapper.style.overflow = 'visible';

      const clone = element.cloneNode(true) as HTMLElement;
      clone.id = 'pdf-export-evening-settlement-clone';
      clone.style.position = 'relative';
      clone.style.width = '794px';
      clone.style.maxWidth = '794px';
      clone.style.minWidth = '794px';
      clone.style.padding = '12px 14px';
      clone.style.background = '#ffffff';
      clone.style.color = '#000000';
      clone.style.fontSize = '9.5px';
      clone.style.boxSizing = 'border-box';
      clone.style.margin = '0 auto';

      // Hide all .no-print elements inside the clone
      clone.querySelectorAll('.no-print').forEach((el) => {
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
      });

      // Show all .print-only elements inside the clone
      clone.querySelectorAll('.print-only').forEach((el) => {
        (el as HTMLElement).style.setProperty('display', 'inline-block', 'important');
      });

      // Ensure all tables are fixed width 100% and collapse borders
      clone.querySelectorAll('table').forEach((t) => {
        const tbl = t as HTMLElement;
        tbl.style.width = '100%';
        tbl.style.tableLayout = 'fixed';
        tbl.style.borderCollapse = 'collapse';
      });

      // Ensure all th and td have solid black borders, dark black text, compact padding and proper wrapping
      clone.querySelectorAll('th, td').forEach((cell) => {
        const c = cell as HTMLElement;
        c.style.setProperty('border', '1px solid #000000', 'important');
        c.style.setProperty('color', '#000000', 'important');
        c.style.setProperty('padding', '3px 4px', 'important');
        c.style.setProperty('word-break', 'break-word', 'important');
        c.style.setProperty('overflow-wrap', 'break-word', 'important');
      });

      clone.querySelectorAll('th').forEach((th) => {
        const h = th as HTMLElement;
        h.style.setProperty('background-color', '#f1f5f9', 'important');
        h.style.setProperty('color', '#000000', 'important');
        h.style.setProperty('font-weight', '800', 'important');
      });

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      const opt = {
        margin: [6, 4, 6, 4],
        filename: `Cadbury_Evening_Settlement_Load${loadStr}_${vanStr}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width: 794,
          windowWidth: 794
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.avoid-break'] }
      };

      const pdfRunner = (window as any).html2pdf || html2pdf;
      await pdfRunner().set(opt).from(clone).save();
    } catch (err: any) {
      console.error('PDF generation error:', err);
      handlePrintEveningSettlement();
    } finally {
      if (wrapper && document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
      setIsDownloadingSettlementPdf(false);
    }
  };

  // Evening Settlement A4 Clean Print Handler
  const handlePrintEveningSettlement = () => {
    const printContent = document.getElementById('printable-evening-settlement');
    if (!printContent) {
      window.print();
      return;
    }

    const printIframe = document.createElement('iframe');
    printIframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;');
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Cadbury Evening Trip Settlement - Load #${selectedTripLoadNo === 'ALL' ? '188' : selectedTripLoadNo}</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 7mm 6mm 7mm 6mm;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              width: 100% !important;
              height: auto !important;
              min-height: auto !important;
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 10px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table {
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: collapse !important;
              page-break-inside: auto;
              margin-top: 4px;
              margin-bottom: 4px;
            }
            th, td {
              border: 1px solid #000000 !important;
              color: #000000 !important;
              font-weight: 700 !important;
              padding: 2.5px 3px !important;
              font-size: 9.5px !important;
              word-break: break-word !important;
              overflow-wrap: break-word !important;
            }
            .party-cell {
              text-align: left !important;
              white-space: normal !important;
              word-break: break-word !important;
              overflow-wrap: break-word !important;
              overflow: visible !important;
              text-overflow: clip !important;
              max-width: none !important;
              font-size: 9.5px !important;
              line-height: 1.2 !important;
            }
            th {
              background-color: #f1f5f9 !important;
              color: #000000 !important;
              font-weight: 800 !important;
              text-transform: uppercase !important;
            }
            thead {
              display: table-header-group !important;
            }
            tfoot {
              display: table-footer-group !important;
            }
            tr {
              page-break-inside: avoid !important;
              page-break-after: auto !important;
            }
            .avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .no-print {
              display: none !important;
            }
            .print-only {
              display: inline-block !important;
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 3000);
    }, 600);
  };

  // Convert Number to Indian Words for Bank / Cash Deposit Slips
  const numberToIndianWords = (num: number): string => {
    if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';
    num = Math.floor(num);
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      let str = '';
      if (n > 99) {
        str += a[Math.floor(n / 100)] + 'Hundred ';
        n %= 100;
      }
      if (n > 19) {
        str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
      } else if (n > 0) {
        str += a[n];
      }
      return str;
    };

    let result = '';
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;

    if (crore > 0) result += inWords(crore) + 'Crore ';
    if (lakh > 0) result += inWords(lakh) + 'Lakh ';
    if (thousand > 0) result += inWords(thousand) + 'Thousand ';
    if (num > 0) result += inWords(num);

    return ('Rupees ' + result.trim() + ' Only').replace(/\s+/g, ' ');
  };

  // Auto-Calculate Standard Denominations for Envelope Cash
  const handleAutoBreakdownDenominations = (targetCash?: number) => {
    const cashVal = targetCash !== undefined ? targetCash : (Number(settlementActualCash) || 0);
    let rem = Math.floor(cashVal);

    const n500 = Math.floor(rem / 500);
    rem %= 500;
    const n200 = Math.floor(rem / 200);
    rem %= 200;
    const n100 = Math.floor(rem / 100);
    rem %= 100;
    const n50 = Math.floor(rem / 50);
    rem %= 50;
    const n20 = Math.floor(rem / 20);
    rem %= 20;
    const n10 = Math.floor(rem / 10);
    rem %= 10;
    const coins = rem;

    setEnvelopeDenominations({
      n500: n500 > 0 ? String(n500) : '',
      n200: n200 > 0 ? String(n200) : '',
      n100: n100 > 0 ? String(n100) : '',
      n50: n50 > 0 ? String(n50) : '',
      n20: n20 > 0 ? String(n20) : '',
      n10: n10 > 0 ? String(n10) : '',
      coins: coins > 0 ? String(coins) : ''
    });
  };

  // Import Morning Loading Sheet (सुबह का लोडिंग चालान - केवल लोडिंग व डिस्पैच, साथ ही रोकड़ पाए जाने पर स्मार्ट मिलान)
  const handleImportMorningLoadingSheet = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = /\.(xlsx|xls|xlsm|xlsb)$/i.test(file.name);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        let workbook: XLSX.WorkBook;
        let fileRawText = '';
        if (isExcel) {
          const buffer = evt.target?.result as ArrayBuffer;
          workbook = XLSX.read(buffer, { type: 'array' });
        } else {
          fileRawText = (evt.target?.result as string) || '';
          workbook = XLSX.read(fileRawText, { type: 'string' });
        }

        let newlyCreatedOrders: Order[] = [];
        let detectedLoadNo = '';
        let detectedVanNo = '';
        let detectedDate = '';
        let totalDispatchedFromFile = 0;
        let updatedBillsState = { ...settlementBillsState };
        let parsedCash = 0;
        let parsedCredit = 0;
        let newCheques: any[] = [];
        let newUpis: any[] = [];
        let newReturns: any[] = [];
        let hasEveningData = false;

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (!jsonRows || jsonRows.length === 0) continue;

          // 1. Extract metadata from top rows (Load No, Van No, Load Date)
          for (let r = 0; r < Math.min(10, jsonRows.length); r++) {
            const rowStr = (jsonRows[r] || []).join(' ');
            if (!detectedLoadNo) {
              const mLoad = rowStr.match(/Load\s*(?:No|#)?\s*[:.\s-]*([0-9A-Za-z-]+)/i);
              if (mLoad && mLoad[1]) detectedLoadNo = mLoad[1].replace(/,/g, '').trim();
            }
            if (!detectedVanNo) {
              const mVan = rowStr.match(/Van\s*(?:No|#)?\s*[:.\s-]*([0-9A-Za-z-]+)/i);
              if (mVan && mVan[1]) detectedVanNo = mVan[1].replace(/,/g, '').trim();
            }
            if (!detectedDate) {
              const mDate = rowStr.match(/Load\s*Date\s*[:.\s-]*([0-9/-]+)/i) || rowStr.match(/Date\s*[:.\s-]*([0-9/-]+)/i);
              if (mDate && mDate[1]) detectedDate = mDate[1].replace(/,/g, '').trim();
            }
          }

          // 2. Identify header row
          let headerRowIndex = -1;
          let colMap: Record<string, number> = {};

          for (let r = 0; r < Math.min(20, jsonRows.length); r++) {
            const row = jsonRows[r];
            if (!Array.isArray(row)) continue;
            const strRow = row.map(c => String(c).trim().toLowerCase());

            const hasBill = strRow.some(c => c.includes('bill') || c.includes('order') || c.includes('inv'));
            const hasAmtOrParty = strRow.some(c => c.includes('amount') || c.includes('party') || c.includes('customer') || c.includes('amt') || c.includes('total') || c.includes('cash') || c.includes('cheque'));
            
            if (hasBill && hasAmtOrParty) {
              headerRowIndex = r;
              strRow.forEach((c, idx) => {
                if (c.includes('bill date') || c === 'date' || c.includes('दिनांक')) colMap.billDate = idx;
                else if (c.includes('bill no') || c === 'bill' || c.includes('order no') || c === 'inv' || c === '#') colMap.billNo = idx;
                else if (c.includes('party') || c.includes('customer') || c.includes('client') || c.includes('दुकान') || c.includes('party name')) colMap.party = idx;
                else if (c.includes('amount') || c === 'amt' || c.includes('total bill') || c.includes('रकम') || c.includes('value')) colMap.amount = idx;
                else if (c.includes('box') || c.includes('carton') || c.includes('qty')) colMap.cartons = idx;
                else if (c === 'cash' || c.includes('रोकड़') || c.includes('नकद')) colMap.cash = idx;
                else if (c.includes('cheque') || c.includes('check') || c.includes('चेक') || c === 'chq') colMap.cheque = idx;
                else if (c.includes('upi') || c.includes('qr') || c.includes('digital') || c.includes('online')) colMap.upi = idx;
                else if (c === 'rtn' || c.includes('return') || c.includes('वापसी') || c === 'ret') colMap.return = idx;
                else if (c.includes('credit') || c.includes('उधारी') || c === 'cr') colMap.credit = idx;
                else if (c.includes('remark') || c.includes('reason') || c.includes('note') || c.includes('टिप्पणी') || c.includes('narration')) colMap.remark = idx;
              });
              break;
            }
          }

          if (headerRowIndex !== -1 && (colMap.billNo !== undefined || colMap.party !== undefined)) {
            // Bill-wise table rows
            for (let r = headerRowIndex + 1; r < jsonRows.length; r++) {
              const row = jsonRows[r];
              if (!row || row.length === 0) continue;

              const firstCell = String(row[0] || '').toLowerCase();
              const secondCell = String(row[1] || '').toLowerCase();
              const thirdCell = String(row[2] || '').toLowerCase();

              // Check for TOTALS row
              if (firstCell.includes('total') || secondCell.includes('total') || thirdCell.includes('total')) {
                continue;
              }

              const billRaw = colMap.billNo !== undefined ? String(row[colMap.billNo] || '').trim() : '';
              const partyRaw = colMap.party !== undefined ? String(row[colMap.party] || '').trim() : '';
              if (!billRaw && !partyRaw) continue;

              const partyCode = partyRaw.match(/\((.*?)\)/)?.[1]?.trim() || '';
              const cleanPartyName = partyRaw.replace(/\(.*?\)/, '').trim() || partyRaw || `Party-${r}`;

              const amtRaw = colMap.amount !== undefined ? String(row[colMap.amount] || '').trim() : '';
              const totalBillAmt = parseFloat(amtRaw.replace(/[^0-9.]/g, '')) || 0;
              if (totalBillAmt <= 0 && !partyRaw) continue;

              const billDateRaw = colMap.billDate !== undefined ? String(row[colMap.billDate] || '').trim() : '';
              const billKey = billRaw || `BILL-${r}`;
              totalDispatchedFromFile += totalBillAmt;

              const orderCartons = colMap.cartons !== undefined 
                ? (parseInt(String(row[colMap.cartons]).replace(/\D/g, '')) || Math.max(1, Math.round(totalBillAmt / 2500)))
                : Math.max(1, Math.round(totalBillAmt / 2500));

              // Check if evening collection columns exist in this sheet
              const cashStr = colMap.cash !== undefined ? String(row[colMap.cash] || '').trim() : '';
              const chqStr = colMap.cheque !== undefined ? String(row[colMap.cheque] || '').trim() : '';
              const upiStr = colMap.upi !== undefined ? String(row[colMap.upi] || '').trim() : '';
              const rtnStr = colMap.return !== undefined ? String(row[colMap.return] || '').trim() : '';
              const remStr = colMap.remark !== undefined ? String(row[colMap.remark] || '').trim() : '';

              const isCancel = cashStr.toUpperCase().includes('CANCEL') || remStr.toUpperCase().includes('CREDIT NOTE') || remStr.toUpperCase().includes('CANCEL');
              const isSignBill = cashStr.toUpperCase().includes('SIGN BILL') || remStr.toUpperCase().includes('SIGN BILL');

              const rowCash = (!isCancel && !isSignBill && cashStr) ? (parseFloat(cashStr.replace(/[^0-9.]/g, '')) || 0) : 0;
              const rowCheque = chqStr ? (parseFloat(chqStr.replace(/[^0-9.]/g, '')) || 0) : 0;
              const rowUpi = upiStr ? (parseFloat(upiStr.replace(/[^0-9.]/g, '')) || 0) : 0;
              const rowRtn = rtnStr ? (parseFloat(rtnStr.replace(/[^0-9.]/g, '')) || 0) : 0;

              let rowHasEvening = (rowCash > 0 || rowCheque > 0 || rowUpi > 0 || rowRtn > 0 || isCancel || isSignBill);
              if (rowHasEvening) {
                hasEveningData = true;
              }

              let deliveryStatus = 'Pending';
              let paymentMode = 'CASH';
              let paidAmt = 0;
              let stageStatus = (typeof GoodsStage !== 'undefined' && (GoodsStage as any)?.IN_TRANSIT) ? (GoodsStage as any).IN_TRANSIT : 'In Transit';

              if (rowHasEvening) {
                if (isCancel) {
                  deliveryStatus = 'Cancelled';
                  paymentMode = 'CREDIT';
                  paidAmt = 0;
                  stageStatus = (typeof GoodsStage !== 'undefined' && (GoodsStage as any)?.DELIVERED) ? (GoodsStage as any).DELIVERED : 'Delivered';
                  newReturns.push({
                    id: `ret-${Date.now()}-${r}`,
                    partyName: cleanPartyName,
                    cartons: 1,
                    amount: totalBillAmt,
                    reason: 'Credit Note / Cancelled Bill'
                  });
                } else if (isSignBill) {
                  deliveryStatus = 'Delivered';
                  paymentMode = 'CREDIT';
                  paidAmt = 0;
                  parsedCredit += totalBillAmt;
                  stageStatus = (typeof GoodsStage !== 'undefined' && (GoodsStage as any)?.DELIVERED) ? (GoodsStage as any).DELIVERED : 'Delivered';
                } else {
                  deliveryStatus = rowRtn > 0 ? 'Partial' : 'Delivered';
                  stageStatus = (typeof GoodsStage !== 'undefined' && (GoodsStage as any)?.DELIVERED) ? (GoodsStage as any).DELIVERED : 'Delivered';

                  if (rowCheque > 0) paymentMode = 'CHEQUE';
                  else if (rowUpi > 0) paymentMode = 'UPI';
                  else paymentMode = 'CASH';

                  paidAmt = rowCash + rowCheque + rowUpi;
                  if (rowCash > 0) parsedCash += rowCash;

                  if (rowCheque > 0) {
                    newCheques.push({
                      id: `chq-${Date.now()}-${r}`,
                      chequeNo: billRaw.replace(/\D/g, '') || `CHQ-${r}`,
                      bankName: 'Cheque',
                      partyName: cleanPartyName,
                      amount: rowCheque
                    });
                  }
                  if (rowUpi > 0) {
                    newUpis.push({
                      id: `upi-${Date.now()}-${r}`,
                      upiRef: `UPI-${billRaw.replace(/\D/g, '') || r}`,
                      partyName: cleanPartyName,
                      amount: rowUpi
                    });
                  }
                  if (rowRtn > 0) {
                    newReturns.push({
                      id: `ret-${Date.now()}-${r}`,
                      partyName: cleanPartyName,
                      cartons: 1,
                      amount: rowRtn,
                      reason: remStr || 'Partial Return / Return Goods'
                    });
                  }
                }

                updatedBillsState[billKey] = {
                  orderId: billKey,
                  orderNumber: billKey,
                  partyName: cleanPartyName,
                  partyCode,
                  totalBill: totalBillAmt,
                  cashAmount: rowCash,
                  chequeAmount: rowCheque,
                  upiAmount: rowUpi,
                  rtnAmount: rowRtn,
                  deliveryStatus,
                  paymentMode,
                  paidAmount: paidAmt,
                  pendingAmount: isSignBill ? totalBillAmt : Math.max(0, totalBillAmt - paidAmt - rowRtn),
                  notes: remStr || (isCancel ? 'CANCEL' : isSignBill ? 'SIGN BILL' : '')
                };
              }

              newlyCreatedOrders.push({
                id: `ord-morn-${Date.now()}-${r}`,
                orderNumber: billKey,
                invoiceNumber: `INV-${billKey.replace(/\D/g, '') || r}`,
                partyId: partyCode || `pty-morn-${r}`,
                partyName: cleanPartyName,
                partyAddress: 'Market, Mumbai',
                partyArea: 'Mumbai',
                partyMobile: '9820000000',
                partyGst: '27AABCC1234F1Z5',
                partyLat: 19.1136,
                partyLng: 72.8697,
                items: [
                  {
                    productId: 'cad-1',
                    productCode: 'CAD-DM-01',
                    productName: 'Cadbury Assorted',
                    category: (CadburyProductCategory?.DAIRY_MILK || 'Cadbury Dairy Milk') as any,
                    cartons: orderCartons,
                    units: orderCartons * 240,
                    ratePerCarton: Math.round(totalBillAmt / orderCartons),
                    discountPercent: 0,
                    gstPercent: 18,
                    totalAmount: totalBillAmt
                  }
                ],
                totalCartons: orderCartons,
                subtotal: Math.round(totalBillAmt / 1.18),
                discountAmount: 0,
                gstAmount: Math.round(totalBillAmt - (totalBillAmt / 1.18)),
                totalBill: totalBillAmt,
                orderDate: billDateRaw || detectedDate || new Date().toISOString().split('T')[0],
                deliveryDate: billDateRaw || detectedDate || new Date().toISOString().split('T')[0],
                stage: stageStatus,
                loadingStatus: 'Loaded',
                cartonsLoaded: orderCartons,
                deliveryStatus: (rowHasEvening ? deliveryStatus : 'Pending') as any,
                deliverySequence: r,
                paymentStatus: rowHasEvening ? (isSignBill ? 'Pending' : (rowRtn > 0 ? 'Partial' : 'Paid')) : 'Pending',
                paidAmount: rowHasEvening ? paidAmt : 0,
                pendingAmount: rowHasEvening ? (isSignBill ? totalBillAmt : Math.max(0, totalBillAmt - paidAmt - rowRtn)) : totalBillAmt,
                vehicleNumber: detectedVanNo || tripEditVan || 'V1',
                driverName: tripEditDriver || 'Santosh Yadav',
                loaderName: tripEditLoader || 'subham (LDR)',
                cashierName: tripEditCashier || 'tejas (Cashier)',
                billType: isSignBill ? 'CREDIT' : 'CASH',
                loadNumber: detectedLoadNo || selectedTripLoadNo || '193',
                deliveryRemarks: remStr || (rowHasEvening ? '' : 'Morning Dispatch')
              });
            }
          }
        }

        if (detectedLoadNo) setSelectedTripLoadNo(detectedLoadNo);
        if (detectedVanNo) setTripEditVan(detectedVanNo);

        const totalBoxes = newlyCreatedOrders.reduce((s, o) => s + (o.totalCartons || 1), 0);
        setTripEditBoxesLoaded(String(totalBoxes || 54));

        if (hasEveningData) {
          setSettlementBillsState(updatedBillsState);
          setSettlementActualCash(String(parsedCash));
          handleAutoBreakdownDenominations(parsedCash);
          setSettlementCreditAllowed(String(parsedCredit));
          setChequesList(newCheques);
          setUpisList(newUpis);
          setReturnsList(newReturns);
          const retBoxes = newReturns.length;
          setSettlementBoxesDelivered(String(Math.max(0, totalBoxes - retBoxes)));
          setSettlementBoxesReturned(String(retBoxes));
        }

        if (newlyCreatedOrders.length > 0) {
          setImportedEveningOrders(newlyCreatedOrders);
          try {
            if (onImportOrders) {
              await onImportOrders(newlyCreatedOrders);
            } else {
              await fetch('/api/cadbury/orders/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orders: newlyCreatedOrders })
              });
            }
          } catch (apiErr) {
            console.warn('Server sync error on morning bulk orders import:', apiErr);
          }
        }

        let msg = '';
        if (hasEveningData) {
          const totalReturnsAmt = newReturns.reduce((s, r) => s + (Number(r.amount) || 0), 0);
          msg = `✅ एक्सेल शीट सफलतापूर्वक इम्पोर्ट हुई!\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `• लोड नंबर (Load No): #${detectedLoadNo || '193'} | वैन: ${detectedVanNo || 'V1'}\n` +
            `• कुल डिस्पैच बिल: ${newlyCreatedOrders.length} बिल | कुल रकम: ₹${totalDispatchedFromFile.toLocaleString('en-IN')}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💡 नोट: इस शीट में शाम की रोकड़, चेक, UPI व वापसी (RTN) का डेटा भी मिला।\n` +
            `👉 इसे Trip Dispatch Sheet और Evening Settlement (शाम का रोकड़ मिलान) दोनों में सही तरीके से सेट कर दिया गया है ताकि कोई मिसमैच न हो!\n` +
            `• नकद रोकड़ (CASH): ₹${parsedCash.toLocaleString('en-IN')}\n` +
            `• चेक (CHEQUE): ₹${newCheques.reduce((s, c) => s + c.amount, 0).toLocaleString('en-IN')} (${newCheques.length} चेक)\n` +
            `• डिजिटल (UPI): ₹${newUpis.reduce((s, u) => s + u.amount, 0).toLocaleString('en-IN')} (${newUpis.length} UPIs)\n` +
            `• वापसी (RTN/Cancel): ₹${totalReturnsAmt.toLocaleString('en-IN')} (${newReturns.length} आइटम्स)\n` +
            `• उधारी (SIGN BILL): ₹${parsedCredit.toLocaleString('en-IN')}`;
        } else {
          msg = `✅ सुबह का लोडिंग चालान (Morning Loading Sheet) सफलतापूर्वक इम्पोर्ट हुआ!\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `• लोड नंबर (Load No): #${detectedLoadNo || '193'}\n` +
            `• वैन (Van No): ${detectedVanNo || 'V1'}\n` +
            `• कुल डिस्पैच बिल: ${newlyCreatedOrders.length} बिल्स\n` +
            `• कुल डिस्पैच रकम: ₹${totalDispatchedFromFile.toLocaleString('en-IN')}\n` +
            `• कुल लोडेड बॉक्स: ${totalBoxes} Boxes\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `A4 Multi-page Loading Sheet तैयार है। आप इसे प्रिंट करके ड्राइवर को दे सकते हैं।\n` +
            `शाम को वैन वापस आने पर "Evening Settlement" में रोकड़ व चेक का मिलान करें।`;
        }

        setTripCrewSavedMsg(msg);
        alert(msg);
      } catch (err: any) {
        alert('Morning Loading Sheet Import Error: ' + (err.message || 'फाइल पढ़ने में समस्या आई'));
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  // Import Evening Settlement Excel / CSV File Handler
  const handleImportEveningSettlement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = /\.(xlsx|xls|xlsm|xlsb)$/i.test(file.name);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        let workbook: XLSX.WorkBook;
        let fileRawText = '';
        if (isExcel) {
          const buffer = evt.target?.result as ArrayBuffer;
          workbook = XLSX.read(buffer, { type: 'array' });
        } else {
          fileRawText = (evt.target?.result as string) || '';
          workbook = XLSX.read(fileRawText, { type: 'string' });
        }

        let updatedBillsState = { ...settlementBillsState };
        let parsedCash = 0;
        let parsedCredit = 0;
        let newCheques: any[] = [];
        let newUpis: any[] = [];
        let newReturns: any[] = [];
        let newlyCreatedOrders: Order[] = [];
        let detectedLoadNo = '';
        let detectedVanNo = '';
        let detectedDate = '';
        let totalDispatchedFromFile = 0;

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (!jsonRows || jsonRows.length === 0) continue;

          // 1. Extract metadata from top rows (Load No, Van No, Load Date)
          for (let r = 0; r < Math.min(10, jsonRows.length); r++) {
            const rowStr = (jsonRows[r] || []).join(' ');
            if (!detectedLoadNo) {
              const mLoad = rowStr.match(/Load\s*(?:No|#)?\s*[:.\s-]*([0-9A-Za-z-]+)/i);
              if (mLoad && mLoad[1]) detectedLoadNo = mLoad[1].replace(/,/g, '').trim();
            }
            if (!detectedVanNo) {
              const mVan = rowStr.match(/Van\s*(?:No|#)?\s*[:.\s-]*([0-9A-Za-z-]+)/i);
              if (mVan && mVan[1]) detectedVanNo = mVan[1].replace(/,/g, '').trim();
            }
            if (!detectedDate) {
              const mDate = rowStr.match(/Load\s*Date\s*[:.\s-]*([0-9/-]+)/i) || rowStr.match(/Date\s*[:.\s-]*([0-9/-]+)/i);
              if (mDate && mDate[1]) detectedDate = mDate[1].replace(/,/g, '').trim();
            }
          }

          // 2. Identify header row
          let headerRowIndex = -1;
          let colMap: Record<string, number> = {};

          for (let r = 0; r < Math.min(20, jsonRows.length); r++) {
            const row = jsonRows[r];
            if (!Array.isArray(row)) continue;
            const strRow = row.map(c => String(c).trim().toLowerCase());

            const hasBill = strRow.some(c => c.includes('bill') || c.includes('order') || c.includes('inv'));
            const hasAmtOrParty = strRow.some(c => c.includes('amount') || c.includes('party') || c.includes('customer') || c.includes('cash') || c.includes('cheque') || c.includes('upi'));
            
            if (hasBill && hasAmtOrParty) {
              headerRowIndex = r;
              strRow.forEach((c, idx) => {
                if (c.includes('bill date') || c === 'date' || c.includes('दिनांक')) colMap.billDate = idx;
                else if (c.includes('bill no') || c === 'bill' || c.includes('order no') || c === 'inv' || c === '#') colMap.billNo = idx;
                else if (c.includes('party') || c.includes('customer') || c.includes('client') || c.includes('दुकान') || c.includes('party name')) colMap.party = idx;
                else if (c.includes('amount') || c === 'amt' || c.includes('total bill') || c.includes('रकम') || c.includes('value')) colMap.amount = idx;
                else if (c === 'cash' || c.includes('रोकड़') || c.includes('नकद')) colMap.cash = idx;
                else if (c.includes('cheque') || c.includes('check') || c.includes('चेक') || c === 'chq') colMap.cheque = idx;
                else if (c.includes('upi') || c.includes('qr') || c.includes('digital') || c.includes('online')) colMap.upi = idx;
                else if (c === 'rtn' || c.includes('return') || c.includes('वापसी') || c === 'ret') colMap.return = idx;
                else if (c.includes('credit') || c.includes('उधारी') || c === 'cr') colMap.credit = idx;
                else if (c.includes('remark') || c.includes('reason') || c.includes('note') || c.includes('टिप्पणी') || c.includes('narration')) colMap.remark = idx;
                else if (c.includes('status') || c.includes('delivery')) colMap.status = idx;
              });
              break;
            }
          }

          if (headerRowIndex !== -1 && (colMap.billNo !== undefined || colMap.party !== undefined)) {
            // Bill-wise table rows
            for (let r = headerRowIndex + 1; r < jsonRows.length; r++) {
              const row = jsonRows[r];
              if (!row || row.length === 0) continue;

              const firstCell = String(row[0] || '').toLowerCase();
              const secondCell = String(row[1] || '').toLowerCase();
              const thirdCell = String(row[2] || '').toLowerCase();

              // Check for TOTALS row
              if (firstCell.includes('total') || secondCell.includes('total') || thirdCell.includes('total')) {
                continue;
              }

              const billRaw = colMap.billNo !== undefined ? String(row[colMap.billNo] || '').trim() : '';
              const partyRaw = colMap.party !== undefined ? String(row[colMap.party] || '').trim() : '';
              if (!billRaw && !partyRaw) continue;

              // Extract Party Name and Party Code from "NAGESHWAR MEDICAL AND STORES (1267443)"
              const partyCode = partyRaw.match(/\((.*?)\)/)?.[1]?.trim() || '';
              const cleanPartyName = partyRaw.replace(/\(.*?\)/, '').trim() || partyRaw || `Party-${r}`;

              const amtRaw = colMap.amount !== undefined ? String(row[colMap.amount] || '').trim() : '';
              const totalBillAmt = parseFloat(amtRaw.replace(/[^0-9.]/g, '')) || 0;
              if (totalBillAmt <= 0 && !partyRaw) continue;

              const billDateRaw = colMap.billDate !== undefined ? String(row[colMap.billDate] || '').trim() : '';
              const cashStr = colMap.cash !== undefined ? String(row[colMap.cash] || '').trim() : '';
              const chqStr = colMap.cheque !== undefined ? String(row[colMap.cheque] || '').trim() : '';
              const upiStr = colMap.upi !== undefined ? String(row[colMap.upi] || '').trim() : '';
              const rtnStr = colMap.return !== undefined ? String(row[colMap.return] || '').trim() : '';
              const remStr = colMap.remark !== undefined ? String(row[colMap.remark] || '').trim() : '';

              // Special keywords in CASH or REMARK columns:
              // CANCEL or CREDIT NOTE -> Full Return / Credit Note
              const isCancel = cashStr.toUpperCase().includes('CANCEL') || remStr.toUpperCase().includes('CREDIT NOTE') || remStr.toUpperCase().includes('CANCEL');
              // SIGN BILL -> Credit (Udhaari)
              const isSignBill = cashStr.toUpperCase().includes('SIGN BILL') || remStr.toUpperCase().includes('SIGN BILL');

              const rowCash = (!isCancel && !isSignBill && cashStr) ? (parseFloat(cashStr.replace(/[^0-9.]/g, '')) || 0) : 0;
              const rowCheque = chqStr ? (parseFloat(chqStr.replace(/[^0-9.]/g, '')) || 0) : 0;
              const rowUpi = upiStr ? (parseFloat(upiStr.replace(/[^0-9.]/g, '')) || 0) : 0;
              const rowRtn = rtnStr ? (parseFloat(rtnStr.replace(/[^0-9.]/g, '')) || 0) : 0;

              let deliveryStatus = 'Delivered';
              let paymentMode = 'CASH';
              let paidAmt = 0;

              if (isCancel) {
                deliveryStatus = 'Cancelled';
                paymentMode = 'CREDIT';
                paidAmt = 0;
                newReturns.push({
                  id: `ret-${Date.now()}-${r}`,
                  partyName: cleanPartyName,
                  cartons: 1,
                  amount: totalBillAmt,
                  reason: 'Credit Note / Cancelled Bill'
                });
              } else if (isSignBill) {
                deliveryStatus = 'Delivered';
                paymentMode = 'CREDIT';
                paidAmt = 0;
                parsedCredit += totalBillAmt;
              } else {
                if (rowRtn > 0) deliveryStatus = 'Partial';
                else deliveryStatus = 'Delivered';

                if (rowCheque > 0) paymentMode = 'CHEQUE';
                else if (rowUpi > 0) paymentMode = 'UPI';
                else paymentMode = 'CASH';

                paidAmt = rowCash + rowCheque + rowUpi;

                if (rowCash > 0) parsedCash += rowCash;
                if (rowCheque > 0) {
                  newCheques.push({
                    id: `chq-${Date.now()}-${r}`,
                    chequeNo: billRaw.replace(/\D/g, '') || `CHQ-${r}`,
                    bankName: 'Cheque',
                    partyName: cleanPartyName,
                    amount: rowCheque
                  });
                }
                if (rowUpi > 0) {
                  newUpis.push({
                    id: `upi-${Date.now()}-${r}`,
                    upiRef: `UPI-${billRaw.replace(/\D/g, '') || r}`,
                    partyName: cleanPartyName,
                    amount: rowUpi
                  });
                }
                if (rowRtn > 0) {
                  newReturns.push({
                    id: `ret-${Date.now()}-${r}`,
                    partyName: cleanPartyName,
                    cartons: 1,
                    amount: rowRtn,
                    reason: remStr || 'Partial Return / Return Goods'
                  });
                }
              }

              totalDispatchedFromFile += totalBillAmt;
              const billKey = billRaw || `BILL-${r}`;

              updatedBillsState[billKey] = {
                orderId: billKey,
                orderNumber: billKey,
                partyName: cleanPartyName,
                partyCode,
                totalBill: totalBillAmt,
                cashAmount: rowCash,
                chequeAmount: rowCheque,
                upiAmount: rowUpi,
                rtnAmount: rowRtn,
                deliveryStatus,
                paymentMode,
                paidAmount: paidAmt,
                pendingAmount: isSignBill ? totalBillAmt : Math.max(0, totalBillAmt - paidAmt - rowRtn),
                notes: remStr || (isCancel ? 'CANCEL' : isSignBill ? 'SIGN BILL' : '')
              };

              // Prepare created order object
              const orderCartons = Math.max(1, Math.round(totalBillAmt / 2500));
              newlyCreatedOrders.push({
                id: `ord-eve-${Date.now()}-${r}`,
                orderNumber: billKey,
                invoiceNumber: `INV-${billKey.replace(/\D/g, '') || r}`,
                partyId: partyCode || `pty-eve-${r}`,
                partyName: cleanPartyName,
                partyAddress: 'Market, Mumbai',
                partyArea: 'Mumbai',
                partyMobile: '9820000000',
                partyGst: '27AABCC1234F1Z5',
                partyLat: 19.1136,
                partyLng: 72.8697,
                items: [
                  {
                    productId: 'cad-1',
                    productCode: 'CAD-DM-01',
                    productName: 'Cadbury Assorted',
                    category: (CadburyProductCategory?.DAIRY_MILK || 'Cadbury Dairy Milk') as any,
                    cartons: orderCartons,
                    units: orderCartons * 240,
                    ratePerCarton: Math.round(totalBillAmt / orderCartons),
                    discountPercent: 0,
                    gstPercent: 18,
                    totalAmount: totalBillAmt
                  }
                ],
                totalCartons: orderCartons,
                subtotal: Math.round(totalBillAmt / 1.18),
                discountAmount: 0,
                gstAmount: Math.round(totalBillAmt - (totalBillAmt / 1.18)),
                totalBill: totalBillAmt,
                orderDate: billDateRaw || detectedDate || new Date().toISOString().split('T')[0],
                deliveryDate: billDateRaw || detectedDate || new Date().toISOString().split('T')[0],
                stage: (typeof GoodsStage !== 'undefined' && (GoodsStage as any)?.DELIVERED) ? (GoodsStage as any).DELIVERED : 'Delivered',
                loadingStatus: 'Loaded',
                cartonsLoaded: orderCartons,
                deliveryStatus: deliveryStatus as any,
                deliverySequence: r,
                paymentStatus: isSignBill ? 'Pending' : (rowRtn > 0 ? 'Partial' : 'Paid'),
                paidAmount: paidAmt,
                pendingAmount: isSignBill ? totalBillAmt : Math.max(0, totalBillAmt - paidAmt - rowRtn),
                vehicleNumber: detectedVanNo || tripEditVan || 'V1',
                driverName: tripEditDriver || 'Santosh Yadav',
                loaderName: tripEditLoader || 'Loader Ramesh',
                cashierName: tripEditCashier || 'Cashier Suresh',
                billType: isSignBill ? 'CREDIT' : 'CASH',
                loadNumber: detectedLoadNo || selectedTripLoadNo || '193',
                deliveryRemarks: remStr || ''
              });
            }
          }
        }

        // Apply all parsed settlement state
        setSettlementBillsState(updatedBillsState);
        setSettlementActualCash(String(parsedCash));
        handleAutoBreakdownDenominations(parsedCash);
        setSettlementCreditAllowed(String(parsedCredit));
        setChequesList(newCheques);
        setUpisList(newUpis);
        setReturnsList(newReturns);

        if (detectedLoadNo) setSelectedTripLoadNo(detectedLoadNo);
        if (detectedVanNo) setTripEditVan(detectedVanNo);

        const totalBoxes = newlyCreatedOrders.reduce((s, o) => s + (o.totalCartons || 1), 0);
        const retBoxes = newReturns.length;
        setTripEditBoxesLoaded(String(totalBoxes || 54));
        setSettlementBoxesDelivered(String(Math.max(0, totalBoxes - retBoxes)));
        setSettlementBoxesReturned(String(retBoxes));

        if (newlyCreatedOrders.length > 0) {
          setImportedEveningOrders(newlyCreatedOrders);
          // Persist to server backend
          try {
            if (onImportOrders) {
              await onImportOrders(newlyCreatedOrders);
            } else {
              await fetch('/api/cadbury/orders/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orders: newlyCreatedOrders })
              });
            }
          } catch (apiErr) {
            console.warn('Server sync error on bulk orders import:', apiErr);
          }
        }

        const totalReturnsAmt = newReturns.reduce((s, r) => s + (Number(r.amount) || 0), 0);
        const totalAccountedAmt = parsedCash + newCheques.reduce((s, c) => s + c.amount, 0) + newUpis.reduce((s, u) => s + u.amount, 0) + parsedCredit + totalReturnsAmt;
        const diffAmt = totalAccountedAmt - totalDispatchedFromFile;

        const msg = `✅ Excel फ़ाइल "${file.name}" सफलतापूर्वक इम्पोर्ट व कैलकुलेट हो गई!\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `• लोड नंबर (Load No): #${detectedLoadNo || '193'} | वैन: ${detectedVanNo || 'V1'}\n` +
          `• कुल बिल (Total Bills): ${newlyCreatedOrders.length} बिल\n` +
          `• कुल डिस्पैच रकम: ₹${totalDispatchedFromFile.toLocaleString('en-IN')}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `1. रोकड़ (CASH): ₹${parsedCash.toLocaleString('en-IN')}\n` +
          `2. चेक (CHEQUE): ₹${newCheques.reduce((s, c) => s + c.amount, 0).toLocaleString('en-IN')} (${newCheques.length} चेक)\n` +
          `3. डिजिटल (UPI): ₹${newUpis.reduce((s, u) => s + u.amount, 0).toLocaleString('en-IN')} (${newUpis.length} UPIs)\n` +
          `4. उधारी (SIGN BILL): ₹${parsedCredit.toLocaleString('en-IN')}\n` +
          `5. वापसी (RTN + Cancelled): ₹${totalReturnsAmt.toLocaleString('en-IN')} (${newReturns.length} आइटम्स)\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `कुल हिसाब: ₹${totalAccountedAmt.toLocaleString('en-IN')} ` +
          (Math.abs(diffAmt) < 1 ? `(✅ हिसाब 100% बराबर)` : diffAmt > 0 ? `(+₹${diffAmt.toLocaleString('en-IN')} Excess Cash)` : `(-₹${Math.abs(diffAmt).toLocaleString('en-IN')} Shortage)`) + `\n` +
          `✉️ कैश लिफाफा रसीद (Envelope Slip) पर नोटों का ब्रेकडाउन भी अपने-आप भर गया है!`;

        setSettlementSavedSuccess(msg);
        alert(msg);
      } catch (err: any) {
        alert('Excel Import Error: ' + (err.message || 'फाइल पढ़ने में समस्या आई'));
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  // Cash Deposit Envelope Slip Print Handler
  const handlePrintEnvelopeSlip = () => {
    const printContent = document.getElementById('printable-cash-envelope-slip');
    if (!printContent) {
      window.print();
      return;
    }

    const printIframe = document.createElement('iframe');
    printIframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;');
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Cash Deposit Envelope Slip - Load #${selectedTripLoadNo === 'ALL' ? '188' : selectedTripLoadNo}</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              width: 100% !important;
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 11px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            th, td {
              border: 1px solid #000000 !important;
              color: #000000 !important;
              padding: 4px 6px !important;
            }
            th {
              background-color: #f1f5f9 !important;
              font-weight: 800 !important;
            }
          </style>
        </head>
        <body>
          <div style="padding: 10px; max-width: 700px; margin: 0 auto;">
            ${printContent.outerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 3000);
    }, 600);
  };

  // Cash Deposit Envelope Slip PDF Download Handler
  const handleDownloadEnvelopeSlipPDF = async () => {
    const element = document.getElementById('printable-cash-envelope-slip');
    if (!element) {
      alert('Envelope slip nahi mila');
      return;
    }
    setIsDownloadingEnvelopePdf(true);
    let tempWrapper: HTMLElement | null = null;
    try {
      const loadStr = selectedTripLoadNo === 'ALL' ? '188' : selectedTripLoadNo;
      const vanStr = (tripEditVan || 'V1').replace(/[^a-zA-Z0-9]/g, '_');

      tempWrapper = document.createElement('div');
      tempWrapper.style.position = 'fixed';
      tempWrapper.style.top = '0';
      tempWrapper.style.left = '0';
      tempWrapper.style.width = '700px';
      tempWrapper.style.zIndex = '-9999';
      tempWrapper.style.background = '#ffffff';
      document.body.appendChild(tempWrapper);

      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.width = '700px';
      clone.style.margin = '0 auto';
      clone.style.background = '#ffffff';
      tempWrapper.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const imgWidthMm = 190;
      const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 10, 10, imgWidthMm, Math.min(imgHeightMm, 277));
      pdf.save(`Cash_Deposit_Envelope_Slip_Load${loadStr}_${vanStr}.pdf`);
    } catch (err: any) {
      alert('PDF generation error: ' + err.message);
    } finally {
      if (tempWrapper && document.body.contains(tempWrapper)) {
        document.body.removeChild(tempWrapper);
      }
      setIsDownloadingEnvelopePdf(false);
    }
  };

  // WinOmkar Sales Invoice Range Filtering & Graphical Print
  const handleExecuteSalesInvoicePrint = (graphical = false) => {
    const fromNum = parseInt(salesPrintFromBill.replace(/\D/g, '')) || 0;
    const toNum = parseInt(salesPrintToBill.replace(/\D/g, '')) || 999999;
    const minBill = Math.min(fromNum, toNum);
    const maxBill = Math.max(fromNum, toNum);

    const matched = orders.filter(o => {
      const bNum = parseInt(o.orderNumber.replace(/\D/g, '')) || 0;
      const matchLoad = !salesPrintLoadNo || salesPrintLoadNo === 'ALL' || (o.loadNumber || '189') === salesPrintLoadNo;
      const inRange = (bNum >= minBill && bNum <= maxBill) || (fromNum === 0 && toNum === 999999);
      return matchLoad && inRange;
    });

    if (matched.length === 0) {
      alert(`Bill No ${salesPrintFromBill} se ${salesPrintToBill} (Load #${salesPrintLoadNo}) ke beech koi bill nahi mila. Kripya Bill range ya Load No check karein.`);
      return;
    }

    setBulkInvoicesToPrint(matched);
    setIsBulkPrintPreviewOpen(true);
  };

  const handlePrintBulkInvoicesDirect = () => {
    const printContent = document.getElementById('printable-bulk-invoices-sheet');
    if (!printContent) {
      window.print();
      return;
    }

    const printIframe = document.createElement('iframe');
    printIframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;');
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Cadbury Invoices (${bulkInvoicesToPrint.length} Bills) - VISTARAN HEALTH CARE</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 7mm 6mm 7mm 6mm;
            }
            * { box-sizing: border-box; }
            html, body {
              width: 100% !important;
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 11px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .invoice-page {
              page-break-after: always;
              break-after: page;
              margin-bottom: 20px;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            th, td {
              border: 1px solid #94a3b8 !important;
              padding: 3px 5px !important;
              font-size: 10px !important;
            }
            th {
              background-color: #f1f5f9 !important;
              font-weight: 800 !important;
              text-transform: uppercase !important;
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 3000);
    }, 600);
  };

  // Complete 46 Bills from Real Cadbury Loading Report (Bill Wise) Load #189 - Van V2
  const WINOMKAR_LOAD_REPORT_46_BILLS = `BILL DATE\tBILL NO\tPARTY\tAMOUNT\tBILL TYPE\tBEAT NAME\tSCODE
19-11-2026\t6776\tJAISWAL GENERAL STOREA (1265725)\t5430.00\tCASH\tCHECKNAKA TOP END\t102
19-11-2026\t6777\tOM SHRI ARIHANT STORE (2497742)\t3471.00\tCASH\tCHECKNAKA TOP END\t102
19-11-2026\t6778\tARIHANT GENERAL STORE (1265736)\t2072.00\tCASH\tCHECKNAKA TOP END\t102
19-11-2026\t6779\tHERITAGE MILK PRODUCTS (3099654)\t6668.00\tCASH\tCHECKNAKA TOP END\t102
19-11-2026\t6780\tGUDDI AAREY ENERGY (1266967)\t2403.00\tCASH\tCHECKNAKA TOP END\t102
19-11-2026\t6781\tCHEKNAKA PROVISION STORE (1265749)\t2193.00\tCASH\tCHECKNAKA TOP END\t102
19-11-2026\t6782\tSAHAJANAND NAMKEEN AND GENERAL (2654321)\t3167.00\tCASH\tCHECKNAKA TOP END\t102
19-11-2026\t6783\tHARIOM DAIRY (1267546)\t3688.00\tCASH\tBHANDUP STN TOP END\tKR101
19-11-2026\t6784\tGAJANAN STORE (1263136)\t7987.00\tCASH\tBHANDUP STN TOP END\tKR101
19-11-2026\t6785\tVIMAL MEDICAL (1265960)\t3820.00\tCASH\tBHANDUP STN TOP END\tKR101
19-11-2026\t6786\tSHREE SAIRAM PROV STORE (1265969)\t8532.00\tCASH\tBHANDUP STN TOP END\tKR101
19-11-2026\t6787\tBHAWANI MEDICAL STORE (1265949)\t6084.00\tCASH\tBHANDUP STN TOP END\tKR101
19-11-2026\t6788\tGUPTA CHANA SHOP (1264986)\t31624.00\tCASH\tBHANDUP STN TOP END\tKR101
19-11-2026\t6789\tHASMUKH TEA AND DRY FRUITS (1265097)\t5309.00\tCASH\tBHANDUP STN TOP END\tKR101
19-11-2026\t6790\tPRATAPRAI SONS (1265096)\t2263.00\tCASH\tBHANDUP STN TOP END\tKR101
19-11-2026\t6791\tSHANKAR COFFEE (2857249)\t3290.00\tCREDIT\tBHANDUP STN TOP END\tKR101
19-11-2026\t6792\tGOODLUCK MEDICAL GENERAL STORES (1265890)\t3829.00\tCASH\tBHANDUP STN TOP END\tKR101
19-11-2026\t6803\tJAI AMBE STORES.. (1946233)\t1000.00\tCASH\tVILLEGE ROAD TOP END\t111
19-11-2026\t6804\tGOVINDA MILK CENTRE (1266723)\t4983.00\tCASH\tVILLEGE ROAD TOP END\t111
19-11-2026\t6805\tKARAN STORE (1266266)\t2484.00\tCASH\tVILLEGE ROAD TOP END\t111
19-11-2026\t6806\tbhavani supar markat (2460125)\t1772.00\tCASH\tVILLEGE ROAD TOP END\t111
19-11-2026\t6807\tDEVDAS MEDICAL STORES (1265402)\t1444.00\tCASH\tVILLEGE ROAD TOP END\t111
19-11-2026\t6808\tASHAPURA (1263091)\t1109.00\tCASH\tVILLEGE ROAD TOP END\t111
19-11-2026\t6809\tANAND MEDICAL STORES (1265399)\t1138.00\tCASH\tVILLEGE ROAD TOP END\t111
19-11-2026\t6810\tARIHANT STORE (1266071)\t1735.00\tCASH\tVILLEGE ROAD TOP END\t111
19-11-2026\t6811\tCHAUHAN PROVISION STORE (2845822)\t1254.00\tCASH\tVILLEGE ROAD TOP END\t111
19-11-2026\t6812\tKRITI STORES (1265391)\t9983.00\tCASH\tVILLEGE ROAD TOP END\t111
19-11-2026\t6813\tSHREE MAHALAXMI FOODS (2162560)\t1173.00\tCASH\tVILLEGE ROAD TOP END\t111
19-11-2026\t6814\tNITYANAND STORES 1743 (1265362)\t4960.00\tCASH\tVILLEGE ROAD TOP END\t111
19-11-2026\t6815\tROOPNARAYAN DAIRY (2613567)\t4311.00\tCASH\t65 BHANDUP VILL 2\t112
19-11-2026\t6816\tSMART HEALTH CARE (3269047)\t4773.00\tCASH\t65 BHANDUP VILL 2\t112
19-11-2026\t6817\tALANKAR TRADERS (1265328)\t1902.00\tCASH\t65 BHANDUP VILL 2\t112
19-11-2026\t6818\tSHREE DURGA PAN BEDI (3198581)\t2821.00\tCASH\t65 BHANDUP VILL 2\t112
19-11-2026\t6819\tSHUBHAM GEN STORES (1265339)\t2876.00\tCASH\t65 BHANDUP VILL 2\t112
19-11-2026\t6831\tRadhe Krishna Dairy (3023549)\t3759.00\tCREDIT\t31 BHANDUP VILLAGE\t103
19-11-2026\t6832\tLILASHRI MEDICAL (1265330)\t1200.00\tCREDIT\t31 BHANDUP VILLAGE\t103
19-11-2026\t6833\tSAIEES PROVISION STORE (2239071)\t1568.00\tCREDIT\t31 BHANDUP VILLAGE\t103
19-11-2026\t6834\tRASIKA GEN STORE (2987058)\t1423.00\tCREDIT\t31 BHANDUP VILLAGE\t103
19-11-2026\t6835\tSHIV SHAKTI GEN ST (3125992)\t3491.00\tCREDIT\t31 BHANDUP VILLAGE\t103
19-11-2026\t6836\tATUL ICECREEM (3224817)\t1676.00\tCREDIT\t31 BHANDUP VILLAGE\t103
19-11-2026\t6837\tBHAIRAV STORES (3295843)\t2948.00\tCREDIT\t31 BHANDUP VILLAGE\t103
19-11-2026\t6838\tMAHAKALI STORES (3295844)\t1745.00\tCREDIT\t31 BHANDUP VILLAGE\t103
19-11-2026\t6839\tShivaji Medical (3095040)\t3654.00\tCREDIT\t31 BHANDUP VILLAGE\t103
19-11-2026\t6840\tSAI LEELA DHANYA BHANDAR (2341991)\t2202.00\tCREDIT\t31 BHANDUP VILLAGE\t103
19-11-2026\t6841\tSAI SHRADHA MEDICAL AND GEN STORE (2749821)\t3685.00\tCREDIT\t31 BHANDUP VILLAGE\t103
19-11-2026\t6842\tALL IN ONE STORE (1265327)\t4199.00\tCREDIT\t31 BHANDUP VILLAGE\t103`;

  // 15 Real Bills from WINOMKAR Sales Booking Screenshot
  const WINOMKAR_SALES_BOOKING_DEMO_TEXT = `VDATE\tBILL NO\tCASH/CR\tCUSTOMER NAME\tAMOUNT\tLOAD\tSMAN
19/11/2026\t6786\tCASH\tSHREE SAIRAM PROV STORE\t8532.00\t189\tKR101
19/11/2026\t6787\tCASH\tBHAWANI MEDICAL STORE\t6084.00\t189\tKR101
19/11/2026\t6788\tCASH\tGUPTA CHANA SHOP\t31624.00\t189\tKR101
19/11/2026\t6789\tCASH\tHASMUKH TEA AND DRY FRUITS\t5309.00\t189\tKR101
19/11/2026\t6790\tCASH\tPRATAPRAI SONS\t2263.00\t189\tKR101
19/11/2026\t6791\tCREDIT\tSHANKAR COFFEE\t2840.00\t189\tKR101
19/11/2026\t6792\tCASH\tGOODLUCK MEDICAL GEN STORE\t4120.00\t189\tKR101
19/11/2026\t6793\tCREDIT\tDaneshwari Dairy\t3750.00\t189\t105
19/11/2026\t6794\tCREDIT\tGURUKRUPA GEN STORE\t6400.00\t189\t105
19/11/2026\t6795\tCREDIT\tKRUSHNA DAIRY\t1950.00\t189\t105
19/11/2026\t6796\tCASH\tJAI MATADI TOBACOO\t5200.00\t189\t105
19/11/2026\t6797\tCASH\tCHAVDHARI SWEET MART\t4890.00\t189\t105
19/11/2026\t6798\tCASH\tS.P.STORE\t2100.00\t189\t105
19/11/2026\t6799\tCREDIT\tSHIVKRUPA GEN STORE\t3450.00\t189\t105
19/11/2026\t6800\tCASH\tNAYANA GEN.STORE\t2780.00\t189\t105`;

  // 16 Real Orders from WINOMKAR SFA Order Information Screenshot
  const WINOMKAR_SFA_DEMO_TEXT = `SNo\tOrder No\tOrder Date\tCustomer Name\tPC Name\tOrder Amount\tStatus\tOrder Type
906\t342477540\t18/11/2026\tSAI JUICE CENTRE AND JUICE\tRAMCHANDRA BENKER [102]\t3884.44\tCOMPLE\tcomm
907\t342479012\t18/11/2026\tOM SAI GENERAL STORE\tPrathamesh Shashikant Kadam [106]\t3383.95\tCOMPLE\tcomm
908\t342481854\t18/11/2026\tSHREE BALAJI STORES\tMAHESH G GHAG [103]\t2198.22\tCOMPLE\tcomm
909\t342482804\t18/11/2026\tMAHALAXMI SUPER MARKET\tPrathamesh Shashikant Kadam [106]\t8172.37\tCOMPLE\tcomm
910\t342485856\t18/11/2026\tPOOJA CONFECTIONERY\tJeetendra Rawal [105]\t2411.87\tCOMPLE\tcomm
911\t342485856\t18/11/2026\tPOOJA CONFECTIONERY (OOS)\tJeetendra Rawal [105]\t510.20\tCOMPLE\toos
912\t342488818\t18/11/2026\tKRISHNA DAIRY & SWEETS\tPrathamesh Shashikant Kadam [106]\t7976.78\tCOMPLE\tcomm
913\t342488844\t18/11/2026\tGANESH GENERAL STORES\tRAMCHANDRA BENKER [102]\t10331.05\tCOMPLE\tcomm
914\t342498868\t18/11/2026\tGUPTA KIRANA STORE\tRAMCHANDRA BENKER [102]\t2238.71\tCOMPLE\tcomm
915\t342507650\t18/11/2026\tNEW SHARMA STORES\tRAMCHANDRA BENKER [102]\t2190.00\tCOMPLE\tcomm
916\t342509754\t18/11/2026\tMAHESH GENERAL STORES\tRahul Shivram Vairat [111]\t2118.33\tCOMPLE\tcomm
917\t342511367\t18/11/2026\tRADHA KRISHNA SUPER MART\tRahul Shivram Vairat [111]\t2270.12\tCOMPLE\tcomm
918\t342543280\t18/11/2026\tANAND SWEET MART\tRAJ VAIRAT [113]\t1852.82\tPENDIN\tcomm
919\t342543588\t18/11/2026\tROYAL BAKERY & PROVISION\tRAJ VAIRAT [113]\t1931.51\tPENDIN\tcomm
920\t342551313\t18/11/2026\tCITY CONFECTIONERY\tRAJ VAIRAT [113]\t3286.09\tPENDIN\tcomm
921\t342551677\t18/11/2026\tJANATA GENERAL STORE\tRAJ VAIRAT [113]\t1645.03\tPENDIN\tcomm`;

  // Complete 54 Bills from Real Cadbury Loading Report (Bill Wise) Load #188 - Van V1
  const WINOMKAR_LOAD_REPORT_54_BILLS = `VISTARAN HEALTH CARE SERVICES PVT.LTD.,,,,,,
MUMBAI: 400079,,,,,,
,,,,,,
Loading Report (Bill Wise),,,,,,
Narration: V1  Van No.: V1,,,,,,
Load No: 188   Load Date: 19/11/2026,,,,,,
,,,,,,
BILL DATE,BILL NO,PARTY,AMOUNT,CASH,CHEQUE,CREDIT
19-11-2026,/6756,KALPANA GRAIN STORES  (1265187),2937.00,C,,
19-11-2026,/6757,TUSHAR MEDICAL  (1263043),3169.00,,,
19-11-2026,/6758,SAI MEDICAL AND GENERAL STORE  (2701375),2017.00,,,
19-11-2026,/6759,SHREE RAM DEV MEDICAL  (1266712),3013.00,C,,
19-11-2026,/6760,R.K GENERAL STORE  (1265066),1240.00,C,,
19-11-2026,/6761,PATEL PROVISION STORE  (1265057),2785.00,C,,
19-11-2026,/6762,SHEETAL MEDICAL  (1265063),3029.00,C,,
19-11-2026,/6763,SHRI KAMAL MEDICAL  (1265062),6895.00,C,,
19-11-2026,/6764,Preet Trading  (1266773),1636.00,C,,
19-11-2026,/6765,BHAIRAV MEDICAL  GEN STORE  (1266276),3256.00,C,,
19-11-2026,/6766,SHRIPAL MEDICAL  (1265071),3431.00,C,,
19-11-2026,/6767,SIFA MEDICAL  (1265556),5246.00,,,
19-11-2026,/6768,DURGA GEN STORES.  (1265207),3545.00,C,,
19-11-2026,/6770,SIDHI VINAYAK GEN.STORES  (1265484),3066.00,C,,
19-11-2026,/6771,SANKET MEDICAL  (1266733),1793.00,C,,
19-11-2026,/6772,GURUPRASAD NOVELTY  (2039701),1652.00,,,
19-11-2026,/6773,LALBAUGHCHA RAJA GEN STORE  (2837817),4127.00,,,
19-11-2026,/6774,NIKHIL GENERAL STORES  (3037070),1296.00,,,
19-11-2026,/6775,MATOSHRI GENERAL STORE  (3027574),2284.00,,,
19-11-2026,/6793,Daneshwari Dairy  (2894186),3919.00,,,
19-11-2026,/6794,GURUKRUPA GEN STORE 1  (2889165),9135.00,,,
19-11-2026,/6795,KRUSHNA DAIRY  (2594396),2960.00,,,
19-11-2026,/6796,JAI MATADI TOBACOO  (1265491),10318.00,C,,
19-11-2026,/6797,CHAVDHARI SWEET MART  (1266915),1948.00,,,
19-11-2026,/6798,S.P.STORE  (1266142),1780.00,C,,
19-11-2026,/6800,NAYANA GEN.STORE  (1265918),1921.00,C,,
19-11-2026,/6801,SHREE NEW GANESH DAIRY  (2185618),2370.00,,,
19-11-2026,/6802,KRISHNA MEDICO GENERIC  (2767854),5242.00,,,
19-11-2026,/6820,GANESH DAIRY  (2486600),1228.00,,,
19-11-2026,/6821,ASHA MEDICAL  (1263137),1136.00,,,
19-11-2026,/6822,ANAND BAKERY.  (1265954),2154.00,C,,
19-11-2026,/6823,BALAJI MEDICAL  (3270733),1426.00,,,
19-11-2026,/6824,SWAMI SAMATH MEDICAL  (1265605),1862.00,,,
19-11-2026,/6826,KARDAR STORE  (1265903),1419.00,C,,
19-11-2026,/6827,SAHIL GEN STORE  (2915573),1597.00,,,
19-11-2026,/6828,MEDI CURE PHARMACIES  (3091751),1547.00,,,
19-11-2026,/6829,LUCKY BOOK CENTER  GEN STORE  (1265961),2852.00,C,,
19-11-2026,/6830,GIRIJA MEDICAL  GEN.STORES  (1266594),1290.00,C,,
19-11-2026,/6843,KALYANI KIRANA STORE  (3365239),1582.00,,,
19-11-2026,/6844,R D GENERAL STORE  (3030163),2015.00,,,
19-11-2026,/6845,JANTA MEDICAL AND GEN STORE  (2833270),3074.00,,,
19-11-2026,/6846,SANDEEP MEDICAL ANGD GEN STORE  (1264947),1933.00,C,,
19-11-2026,/6847,AMBIKA MEDICAL SURGICAL AND AYURVEDIC  (2726359),4681.00,,,
19-11-2026,/6848,KERALA KART  (3370698),1233.00,,,
19-11-2026,/6849,MATOSHREE MEDICAL AND CHEMIST  (2569942),4960.00,,,
19-11-2026,/6850,DEDHIYA GRAIN STORE  (1266118),1407.00,C,,
19-11-2026,/6851,OM PADMANATH STORES  (2024981),1538.00,,,
19-11-2026,/6853,SAWARIYA ICE CREAM  (2024966),2780.00,,,
19-11-2026,/6854,SHREE CHARBUJA STORES  (1876906),2062.00,,,
19-11-2026,/6855,ANITA GENERAL STORE  (3048777),1005.00,,,
19-11-2026,/6856,BHAUCHAR SUPER MARKET  (2307874),1771.00,,,
19-11-2026,/6857,RAJ ENTERPRISES  (2975955),5625.00,,,
19-11-2026,/6858,LAXMI CELEBRATION POINT  (3371896),3070.00,,,
19-11-2026,/6859,MAHALAXMI DAIRY SWEETS AND SNACKS  (3065893),2165.00,,,
,,,,,,
,,TOTALS:,153422.00,,,
,,CASH BILLS  : 21,,,,
,,CASH AMT    : 61700.00,,,,
,,CREDIT BILLS: 33,,,,
,,CREDIT AMT  : 91722.00,,,,
,,,,,,
,SCODE,SERIES      BILL NOS,,BILLS,AMT,
,105  [Jeetendra Rawal],6793 TO 6802,,9,39593.00,
,109  [VINOD DHANAWADE],6770 TO 6775,,6,14218.00,
,110  [VIJAY SHERE],6853 TO 6858,,6,16313.00,
,113  [RAJ VAIRAT],6843 TO 6859,,10,24588.00,
,114  [Harishankar Ramadhar Yadav],6820 TO 6830,,10,16511.00,
,106  [Prathamesh Shashikant Kadam],6756 TO 6768,,13,42199.00,
,,,,,,
,,,,,,
,,BEAT WISE SUMMARY:,,,,
,SCODE,BEAT        BEAT NAME,,BILLS,AMT,
,106 [Prathamesh Shashikant Kadam],Q96019     MANGATRAM TOP END,,13,42199.00,
,109 [VINOD DHANAWADE],Q117042     Ganesh Nagar 1,,6,14218.00,
,105 [Jeetendra Rawal],Q96018     KONKAN NAGAR TOP END,,9,39593.00,
,114 [Harishankar Ramadhar Yadav],KO-CAD     41 KOKAN NAGAR,,10,16511.00,
,113 [RAJ VAIRAT],61     61 SONAPUR 1,,4,8604.00,
,113 [RAJ VAIRAT],H2-CAD     46 MANGATRAM,,6,15984.00,
,110 [VIJAY SHERE],KON2-CAD     47 KONKAN NAGAR 2 JR,,6,16313.00,`;

  // CSV / TSV / Excel Cash Sheet Parser (Full Support for WINOMKAR Loading Report, Sales Booking & SFA Orders)
  const parseCSVText = (
    text: string,
    veh = batchVehicleNumber,
    drv = batchDriverName,
    ldr = batchLoaderName,
    csh = batchCashierName,
    loadNo = batchLoadNumber
  ) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    // Check for Winomkar / Cadbury Loading Report format
    const isLoadingReport = lines.some(l => 
      /loading\s*report/i.test(l) || 
      /bill\s*date.*bill\s*no.*party/i.test(l) || 
      /narration:.*van\s*no/i.test(l) ||
      (l.includes('6756') && l.includes('KALPANA'))
    );

    if (isLoadingReport) {
      let detectedLoadNo = loadNo || '188';
      let detectedVanNo = veh || 'V1';
      let detectedDate = '19-11-2026';

      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        const loadMatch = line.match(/Load\s*No:?\s*(\d+)/i);
        if (loadMatch) detectedLoadNo = loadMatch[1];
        
        const vanMatch = line.match(/Van\s*No\.?:?\s*([^,\r\n\t]+)/i);
        if (vanMatch) detectedVanNo = vanMatch[1].trim();
        
        const dateMatch = line.match(/Load\s*Date:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
        if (dateMatch) detectedDate = dateMatch[1].trim();
      }

      // Find header row
      let headerIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].toLowerCase();
        if (l.includes('bill no') && (l.includes('party') || l.includes('amount'))) {
          headerIdx = i;
          break;
        }
      }

      const rows: any[] = [];
      let inTotals = false;
      const parsedSmanSummary: any[] = [];
      const parsedBeatSummary: any[] = [];
      let inSman = false;
      let inBeat = false;

      const startIndex = headerIdx !== -1 ? headerIdx + 1 : 0;
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // Stop bill parsing at TOTALS:
        if (/totals?:/i.test(line)) {
          inTotals = true;
          continue;
        }

        if (inTotals) {
          if (/beat\s*wise\s*summary/i.test(line)) {
            inBeat = true;
            inSman = false;
            continue;
          }
          if (/scode.*(series|bill\s*nos)/i.test(line)) {
            inSman = true;
            inBeat = false;
            continue;
          }
          if (/scode.*beat/i.test(line)) {
            inBeat = true;
            inSman = false;
            continue;
          }

          // Parse summary rows
          const sumParts = line.split(/[,\t]/).map(s => s.trim().replace(/^["']|["']$/g, '')).filter(s => s.length > 0);
          if (inBeat && sumParts.length >= 4) {
            parsedBeatSummary.push({
              scode: sumParts[0],
              beat: sumParts[1],
              beatName: sumParts[2],
              bills: parseInt(sumParts[3]) || 0,
              amount: parseFloat(sumParts[4]) || 0
            });
          } else if (inSman && sumParts.length >= 4) {
            parsedSmanSummary.push({
              scode: sumParts[0],
              seriesBillNos: sumParts[1],
              bills: parseInt(sumParts[2]) || 0,
              amount: parseFloat(sumParts[3]) || 0
            });
          }
          continue; // NEVER convert summary lines to bills!
        }

        // Bill row
        const delimiter = line.includes('\t') ? '\t' : ',';
        const parts = line.split(delimiter).map(s => s.trim().replace(/^["']|["']$/g, ''));
        if (parts.length < 3) continue;

        let bDate = parts[0] || detectedDate;
        let bNo = (parts[1] || '').replace(/^\//, '').trim();
        let pName = parts[2] || '';
        let amtStr = parts[3] || '0';
        let cashFlag = (parts[4] || '').toUpperCase();

        if (!bNo && /^\/?\d{3,6}$/.test(parts[0])) {
          bNo = parts[0].replace(/^\//, '');
          pName = parts[1];
          amtStr = parts[2];
          cashFlag = (parts[3] || '').toUpperCase();
        }

        if (!bNo || !pName) continue;

        const totalBill = Math.round((parseFloat(amtStr.replace(/[^0-9.]/g, '')) || 0) * 100) / 100;
        if (totalBill <= 0) continue;

        const isCash = cashFlag === 'C' || cashFlag === 'CASH' || parseFloat(cashFlag) > 0;
        const billType: 'CASH' | 'CREDIT' = isCash ? 'CASH' : 'CREDIT';
        const cartons = Math.max(1, Math.round(totalBill / 1200));
        const baseAmount = Math.round((totalBill / 1.18) * 100) / 100;
        const gstAmount = Math.round((totalBill - baseAmount) * 100) / 100;

        rows.push({
          orderNumber: `BILL-${bNo}`,
          billNo: bNo,
          invoiceNumber: `INV-${bNo}`,
          orderDate: bDate,
          deliveryDate: bDate,
          partyName: pName,
          partyArea: 'Bhandup Beat',
          partyAddress: `${pName}, Bhandup, Mumbai - 400078`,
          partyMobile: `98200${Math.floor(10000 + (parseInt(bNo) || 1000) * 17) % 90000}`,
          productName: 'Cadbury Assorted Dairy Milk & Chocolates',
          totalCartons: cartons,
          subtotal: baseAmount,
          discountAmount: 0,
          gstAmount,
          totalBill,
          billType,
          loadNumber: detectedLoadNo,
          vehicleNumber: detectedVanNo,
          driverName: drv || 'Santosh Yadav',
          loaderName: ldr || 'subham (LDR)',
          cashierName: csh || 'tejas (Cashier)',
          deliveryBoyName: csh || 'tejas (Cashier)',
          notes: `WINOMKAR Load #${detectedLoadNo} | Bill #${bNo} | ${billType}`,
          items: [
            {
              productId: 'cad-1',
              productCode: 'CAD-DM-01',
              productName: 'Cadbury Dairy Milk & Assorted Chocolate Box',
              category: 'Cadbury Dairy Milk',
              cartons,
              units: cartons * 120,
              ratePerCarton: Math.round(baseAmount / cartons),
              discountPercent: 0,
              gstPercent: 18,
              totalAmount: totalBill
            }
          ]
        });
      }

      if (parsedSmanSummary.length > 0) setTripSalesmanSummary(parsedSmanSummary);
      if (parsedBeatSummary.length > 0) setTripBeatSummary(parsedBeatSummary);

      return rows;
    }

    // Fallback: WINOMKAR Sales Booking / SFA / Standard CSV
    let startIndex = 0;
    for (let j = 0; j < Math.min(8, lines.length); j++) {
      const lower = lines[j].toLowerCase();
      if (
        lower.includes('bill no') || lower.includes('party') || lower.includes('customer') ||
        lower.includes('amount') || lower.includes('vdate') || lower.includes('order no')
      ) {
        startIndex = j + 1;
        break;
      }
    }

    const rows: any[] = [];
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (/^(totals?|grand\s*total|cash\s*bills?|credit\s*bills?|balance|beat\s*wise\s*summary|scode)/i.test(line.trim())) {
        break; // Stop at summary!
      }

      const delimiter = line.includes('\t') ? '\t' : (line.includes(',') ? ',' : ' ');
      const parts = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, '')).filter(c => c.length > 0);
      if (parts.length >= 2) {
        const billNoPart = parts.find(p => /^(67\d{2}|68\d{2})$/.test(p)) || parts[1] || `${6756 + i}`;
        const isCredit = parts.some(p => p.toUpperCase() === 'CREDIT');
        const billType: 'CASH' | 'CREDIT' = isCredit ? 'CREDIT' : 'CASH';

        const nonNumberParts = parts.filter(p => 
          !/^\d+(\.\d+)?$/.test(p) && 
          !/^\d{2}[-/]\d{2}[-/]\d{4}/.test(p) && 
          p !== 'CASH' && p !== 'CREDIT' && p !== 'CAD' && p !== 'supervisor'
        );
        const customerName = nonNumberParts[0] || `Party ${billNoPart}`;
        const amountPart = parts.find(p => /^\d{3,6}(\.\d{1,2})?$/.test(p) && p !== billNoPart);
        const totalBill = amountPart ? parseFloat(amountPart) : 2500;
        const cartons = Math.max(1, Math.round(totalBill / 1200));
        const baseAmount = Math.round((totalBill / 1.18) * 100) / 100;
        const gstAmount = Math.round((totalBill - baseAmount) * 100) / 100;

        rows.push({
          orderNumber: `BILL-${billNoPart}`,
          invoiceNumber: `INV-${billNoPart}`,
          partyName: customerName,
          productName: 'Cadbury Assorted Dairy Milk & Chocolates',
          totalCartons: cartons,
          subtotal: baseAmount,
          discountAmount: 0,
          gstAmount,
          totalBill,
          billType,
          loadNumber: loadNo || '188',
          salesmanCode: 'KR101',
          vehicleNumber: veh,
          driverName: drv,
          loaderName: ldr,
          cashierName: csh,
          deliveryBoyName: csh,
          notes: `Imported Bill #${billNoPart} | ${billType}`,
          items: [
            {
              productId: 'cad-1',
              productCode: 'CAD-DM-01',
              productName: 'Cadbury Dairy Milk & Assorted Chocolate Box',
              category: 'Cadbury Dairy Milk',
              cartons,
              units: cartons * 120,
              ratePerCarton: Math.round(baseAmount / cartons),
              discountPercent: 0,
              gstPercent: 18,
              totalAmount: totalBill
            }
          ]
        });
      }
    }
    return rows;
  };

  // Download real Excel workbook (.xlsx) formatted for Cadbury Cash Sheet / Billing
  const handleDownloadSampleExcel = () => {
    const wsData = [
      ['BILL DATE', 'BILL NO', 'CUSTOMER / PARTY NAME', 'AMOUNT', 'BILL TYPE', 'BEAT NAME', 'SMAN CODE'],
      ['19-11-2026', '6776', 'JAISWAL GENERAL STOREA (1265725)', 5430, 'CASH', 'CHECKNAKA TOP END', '102'],
      ['19-11-2026', '6777', 'OM SHRI ARIHANT STORE (2497742)', 3471, 'CASH', 'CHECKNAKA TOP END', '102'],
      ['19-11-2026', '6778', 'ARIHANT GENERAL STORE (1265736)', 2072, 'CASH', 'CHECKNAKA TOP END', '102'],
      ['19-11-2026', '6786', 'SHREE SAIRAM PROV STORE (1265969)', 8532, 'CASH', 'BHANDUP STN TOP END', 'KR101'],
      ['19-11-2026', '6788', 'GUPTA CHANA SHOP (1264986)', 31624, 'CASH', 'BHANDUP STN TOP END', 'KR101'],
      ['19-11-2026', '6791', 'SHANKAR COFFEE (2857249)', 3290, 'CREDIT', 'BHANDUP STN TOP END', 'KR101'],
      ['19-11-2026', '6815', 'ROOPNARAYAN DAIRY (2613567)', 4311, 'CASH', '65 BHANDUP VILL 2', '112'],
      ['19-11-2026', '6831', 'Radhe Krishna Dairy (3023549)', 3759, 'CREDIT', '31 BHANDUP VILLAGE', '103'],
      ['19-11-2026', '6842', 'ALL IN ONE STORE (1265327)', 4199, 'CREDIT', '31 BHANDUP VILLAGE', '103']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cadbury Cash Sheet');
    XLSX.writeFile(wb, 'cadbury_cash_and_billing_sheet.xlsx');
  };

  const handleDownloadSampleCSV = () => {
    const csvContent = "Party Name,Product Name,Cartons,Rate,Vehicle Number,Driver Name,Loader Name,Cashier Name\n" +
      "Sharma Stores,Cadbury Dairy Milk 13.2g,10,2400,MH 02 EK 4589,Santosh Yadav,Ramesh Kumar,Suresh Patil\n" +
      "Om General Store,Cadbury 5 Star 20g,8,2880,MH 02 EK 4589,Santosh Yadav,Ramesh Kumar,Suresh Patil\n" +
      "Balaji Confectionery,Cadbury Dairy Milk Silk 60g,5,3500,MH 04 AB 1234,Mukesh Sharma,Amit Singh,Vikas Gupta\n" +
      "Gupta Mart,Cadbury Perk 13g,12,1800,MH 04 EF 9012,Anil Kumar,Dinesh Yadav,Pradeep Jadhav\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "cadbury_retail_bills_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFillSampleDemo = () => {
    const demo = "Party Name,Product Name,Cartons,Rate,Vehicle Number,Driver Name,Loader Name,Cashier Name\n" +
      "Sharma Stores,Cadbury Dairy Milk 13.2g,10,2400,MH 02 EK 4589,Santosh Yadav,Ramesh Kumar,Suresh Patil\n" +
      "Om General Store,Cadbury 5 Star 20g,8,2880,MH 02 EK 4589,Santosh Yadav,Ramesh Kumar,Suresh Patil\n" +
      "Balaji Confectionery,Cadbury Dairy Milk Silk 60g,5,3500,MH 04 AB 1234,Mukesh Sharma,Amit Singh,Vikas Gupta";
    setImportRawText(demo);
    setImportParsedRows(parseCSVText(demo));
  };

  const handleFillLoadReport54Bills = () => {
    setImportRawText(WINOMKAR_LOAD_REPORT_54_BILLS);
    setImportParsedRows(parseCSVText(WINOMKAR_LOAD_REPORT_54_BILLS, 'V1', 'Santosh Yadav', 'subham (LDR)', 'tejas (Cashier)', '188'));
    setTripSalesmanSummary([
      { scode: '105  [Jeetendra Rawal]', seriesBillNos: '6793 TO 6802', bills: 9, amount: 39593.00 },
      { scode: '109  [VINOD DHANAWADE]', seriesBillNos: '6770 TO 6775', bills: 6, amount: 14218.00 },
      { scode: '110  [VIJAY SHERE]', seriesBillNos: '6853 TO 6858', bills: 6, amount: 16313.00 },
      { scode: '113  [RAJ VAIRAT]', seriesBillNos: '6843 TO 6859', bills: 10, amount: 24588.00 },
      { scode: '114  [Harishankar Ramadhar Yadav]', seriesBillNos: '6820 TO 6830', bills: 10, amount: 16511.00 },
      { scode: '106  [Prathamesh Shashikant Kadam]', seriesBillNos: '6756 TO 6768', bills: 13, amount: 42199.00 }
    ]);
    setTripBeatSummary([
      { scode: '106 [Prathamesh Shashikant Kadam]', beat: 'Q96019', beatName: 'MANGATRAM TOP END', bills: 13, amount: 42199.00 },
      { scode: '109 [VINOD DHANAWADE]', beat: 'Q117042', beatName: 'Ganesh Nagar 1', bills: 6, amount: 14218.00 },
      { scode: '105 [Jeetendra Rawal]', beat: 'Q96018', beatName: 'KONKAN NAGAR TOP END', bills: 9, amount: 39593.00 },
      { scode: '114 [Harishankar Ramadhar Yadav]', beat: 'KO-CAD', beatName: '41 KOKAN NAGAR', bills: 10, amount: 16511.00 },
      { scode: '113 [RAJ VAIRAT]', beat: '61', beatName: '61 SONAPUR 1', bills: 4, amount: 8604.00 },
      { scode: '113 [RAJ VAIRAT]', beat: 'H2-CAD', beatName: '46 MANGATRAM', bills: 6, amount: 15984.00 },
      { scode: '110 [VIJAY SHERE]', beat: 'KON2-CAD', beatName: '47 KONKAN NAGAR 2 JR', bills: 6, amount: 16313.00 }
    ]);
  };

  const handleFillLoadReport46Bills = () => {
    setImportRawText(WINOMKAR_LOAD_REPORT_46_BILLS);
    setImportParsedRows(parseCSVText(WINOMKAR_LOAD_REPORT_46_BILLS, 'MH 02 EK 4589', 'Santosh Yadav', 'Ramesh Kumar (LDR)', 'Suresh Patil (Cashier)', '189'));
    setTripSalesmanSummary([
      { scode: '102 [RAJESH]', seriesBillNos: '6776 TO 6782', bills: 7, amount: 25404.00 },
      { scode: '103 [MANOJ]', seriesBillNos: '6831 TO 6842', bills: 12, amount: 31550.00 },
      { scode: '111 [RAMESH]', seriesBillNos: '6803 TO 6814', bills: 12, amount: 33035.00 },
      { scode: '112 [ANIL]', seriesBillNos: '6815 TO 6819', bills: 5, amount: 16683.00 },
      { scode: 'KR101 [KAMLESH]', seriesBillNos: '6783 TO 6792', bills: 10, amount: 76426.00 }
    ]);
    setTripBeatSummary([
      { scode: '102 [RAJESH]', beat: 'Q96009', beatName: 'CHECKNAKA TOP END', bills: 7, amount: 25404.00 },
      { scode: 'KR101 [KAMLESH]', beat: 'Q96005', beatName: 'BHANDUP STN TOP END', bills: 10, amount: 76426.00 },
      { scode: '111 [RAMESH]', beat: 'Q96021', beatName: 'VILLEGE ROAD TOP END', bills: 12, amount: 33035.00 },
      { scode: '112 [ANIL]', beat: '65', beatName: '65 BHANDUP VILL 2', bills: 5, amount: 16683.00 },
      { scode: '103 [MANOJ]', beat: 'BV-CAD', beatName: '31 BHANDUP VILLAGE', bills: 12, amount: 31550.00 }
    ]);
  };

  const handleFillSalesBookingDemo = () => {
    setImportRawText(WINOMKAR_SALES_BOOKING_DEMO_TEXT);
    setImportParsedRows(parseCSVText(WINOMKAR_SALES_BOOKING_DEMO_TEXT));
  };

  const handleFillWinomkarDemo = () => {
    setImportRawText(WINOMKAR_SFA_DEMO_TEXT);
    setImportParsedRows(parseCSVText(WINOMKAR_SFA_DEMO_TEXT));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);

    const isExcel = /\.(xlsx|xls|xlsm|xlsb)$/i.test(file.name);

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert Excel sheet to tab-separated text so parseCSVText can parse it seamlessly
          const tsvContent = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
          setImportRawText(tsvContent);

          const parsed = parseCSVText(tsvContent);
          setImportParsedRows(parsed);
          setImportSuccessMsg(`📊 Excel Sheet "${file.name}" successfully imported! Total ${parsed.length} bills loaded.`);
        } catch (err: any) {
          alert('Excel file read error: ' + (err.message || 'Could not parse Excel'));
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Standard CSV / Text file
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = (event.target?.result as string) || '';
        setImportRawText(content);
        const parsed = parseCSVText(content);
        setImportParsedRows(parsed);
        setImportSuccessMsg(`📄 File "${file.name}" loaded! Total ${parsed.length} bills.`);
      };
      reader.readAsText(file);
    }
  };

  const handleTextareaChange = (txt: string) => {
    setImportRawText(txt);
    setImportParsedRows(parseCSVText(txt));
  };

  const handleExecuteImport = async () => {
    if (importParsedRows.length === 0) {
      alert('Please upload a file or paste at least one bill row');
      return;
    }
    setIsImporting(true);
    try {
      if (onImportOrders) {
        await onImportOrders(importParsedRows);
      } else {
        const res = await fetch('/api/cadbury/orders/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders: importParsedRows })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Import failed');
      }
      setImportSuccessMsg(`Successfully imported ${importParsedRows.length} Cadbury Retail Bills into DMS!`);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportRawText('');
        setImportParsedRows([]);
        setImportSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      alert('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsImporting(false);
    }
  };

  // Handle adding an item to current order
  const handleAddItem = () => {
    const prod = products.find(p => p.id === chosenProductId);
    if (!prod) return;

    const baseAmount = cartonsInput * prod.cartonRate;
    const discountVal = (baseAmount * discountPercentInput) / 100;
    const taxableAmount = baseAmount - discountVal;
    const gstVal = (taxableAmount * prod.gstPercent) / 100;
    const totalAmount = Math.round(taxableAmount + gstVal);

    const newItem: OrderItem = {
      productId: prod.id,
      productCode: prod.code,
      productName: prod.name,
      category: prod.category,
      cartons: cartonsInput,
      units: cartonsInput * prod.unitsPerCarton,
      ratePerCarton: prod.cartonRate,
      discountPercent: discountPercentInput,
      gstPercent: prod.gstPercent,
      totalAmount
    };

    setOrderItems([...orderItems, newItem]);
    setChosenProductId('');
    setCartonsInput(5);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  // Calculations for total bill
  const totalCartons = orderItems.reduce((sum, item) => sum + item.cartons, 0);
  const subtotal = orderItems.reduce((sum, item) => sum + (item.cartons * item.ratePerCarton), 0);
  const totalDiscount = orderItems.reduce((sum, item) => sum + ((item.cartons * item.ratePerCarton * item.discountPercent) / 100), 0);
  const taxable = subtotal - totalDiscount;
  const totalGst = Math.round((taxable * 0.18));
  const grandTotal = Math.round(taxable + totalGst);

  // Submit Order
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) {
      alert('Please select a Party / Shop');
      return;
    }
    if (orderItems.length === 0) {
      alert('Please add at least one Cadbury product to the order');
      return;
    }

    onCreateOrder({
      partyId: selectedParty.id,
      partyName: selectedParty.name,
      partyAddress: selectedParty.shopAddress,
      partyArea: selectedParty.area,
      partyMobile: selectedParty.mobileNumber,
      partyGst: selectedParty.gstNumber,
      partyLat: selectedParty.latitude,
      partyLng: selectedParty.longitude,
      items: orderItems,
      totalCartons,
      subtotal,
      discountAmount: totalDiscount,
      gstAmount: totalGst,
      totalBill: grandTotal,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: deliveryDateInput || new Date().toISOString().split('T')[0],
      vehicleNumber: selectedVehicleNumber,
      driverName: selectedDriverName,
      loaderName: selectedLoaderName,
      cashierName: selectedCashierName,
      deliveryBoyName: selectedCashierName
    });

    setIsCreateModalOpen(false);
    setOrderItems([]);
    setSelectedPartyId('');
  };

  // WhatsApp Bill Text Generator
  const generateWhatsAppBillLink = (order: Order) => {
    let msg = `*CADBURY DISTRIBUTOR INVOICE*\n`;
    msg += `Invoice No: ${order.invoiceNumber}\n`;
    msg += `Order No: ${order.orderNumber}\n`;
    msg += `Party: ${order.partyName}\n`;
    msg += `Date: ${order.orderDate}\n`;
    msg += `----------------------------\n`;
    order.items.forEach(it => {
      msg += `• ${it.productName}: ${it.cartons} Box @ Rs.${it.ratePerCarton} = Rs.${it.totalAmount}\n`;
    });
    msg += `----------------------------\n`;
    msg += `Total Cartons: ${order.totalCartons} Box\n`;
    msg += `Subtotal: Rs.${order.subtotal}\n`;
    msg += `GST (18%): Rs.${order.gstAmount}\n`;
    msg += `*GRAND TOTAL: Rs.${order.totalBill}*\n`;
    msg += `Status: ${order.stage} | Payment: ${order.paymentStatus}\n`;
    msg += `Thank you for your business!`;

    return `https://wa.me/91${order.partyMobile}?text=${encodeURIComponent(msg)}`;
  };

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cadbury-950 via-cadbury-900 to-indigo-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <i className="fa-solid fa-file-invoice text-gold-400"></i> Cadbury Billing Desk
          </div>
          <h2 className="text-2xl font-black">Order & Cadbury GST Billing System</h2>
          <p className="text-xs text-cadbury-200 mt-1">
            Create new Cadbury retail invoices, auto-calculate 18% GST, generate PDF invoices, and send WhatsApp bills.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenTripSheet(selectedTripLoadNo, 'ALL')}
            className="px-4 py-3 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 border border-purple-400/40 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all"
            title="सुबह जब वेयरहाउस से माल गाड़ी में लोड होकर निकलता है: लोडिंग शीट इम्पोर्ट व A4 प्रिंट निकालें"
          >
            <i className="fa-solid fa-sun text-amber-300"></i> 🌞 Step 1: Trip Dispatch & Loading Sheet (सुबह का चालान)
          </button>

          <button
            onClick={() => handleOpenEveningSettlement(selectedTripLoadNo, selectedTripVehicle)}
            className="px-4 py-3 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 border border-emerald-400/40 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all"
            title="शाम को जब गाड़ी वापस आती है: रोकड़, चेक, UPI, रिटर्न शीट अपलोड करें व लिफाफा रसीद प्रिंट करें"
          >
            <i className="fa-solid fa-hand-holding-dollar text-gold-300"></i> 🌆 Step 2: Evening Van Return & Cash Settlement (शाम की वापसी व रोकड़)
          </button>

          <button
            onClick={() => setIsSalesInvoicePrintModalOpen(true)}
            className="px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 border border-amber-400/40 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all"
          >
            <i className="fa-solid fa-copy text-gold-200"></i> 📄 Sales Invoice Printing (WinOmkar)
          </button>

          <button
            onClick={() => setIsBackupModalOpen(true)}
            className="px-4 py-3 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 border border-blue-400/40 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all"
          >
            <i className="fa-solid fa-cloud-arrow-down text-gold-300"></i> 💾 Data Backup & Restore (लोकल व क्लाउड)
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-xl backdrop-blur-md shadow-md flex items-center gap-2 active:scale-95 transition-all"
          >
            <i className="fa-solid fa-file-import text-gold-400"></i> Import Bills (Excel / CSV)
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-3 bg-gold-500 hover:bg-gold-600 text-cadbury-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all"
          >
            <i className="fa-solid fa-plus"></i> Create New Cadbury Order
          </button>
        </div>
      </div>

      {/* Orders Table & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search Order No, Invoice No, or Party..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
            />
          </div>

          <div className="text-xs text-slate-500">
            Total Invoices: <strong className="text-slate-800">{filteredOrders.length}</strong>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Order / Invoice</th>
                <th className="py-3 px-3">Party Name</th>
                <th className="py-3 px-3">Cadbury Items</th>
                <th className="py-3 px-3">Cartons</th>
                <th className="py-3 px-3">Van & Staff</th>
                <th className="py-3 px-3">Total Bill</th>
                <th className="py-3 px-3">Stage</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70 transition-all">
                  <td className="py-3 px-3">
                    <div className="font-mono font-bold text-cadbury-900">{order.orderNumber}</div>
                    <div className="text-[10px] text-slate-400">{order.invoiceNumber} • {order.orderDate}</div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    <div>{order.partyName}</div>
                    <div className="text-[11px] text-slate-400">{order.partyArea}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-medium text-slate-700">
                      {order.items?.length || 0} product lines
                    </span>
                    <div className="text-[10px] text-slate-400 truncate max-w-xs">
                      {order.items?.map(it => it.productName.split(' ')[1] || it.productName).join(', ')}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-800">
                    {order.totalCartons} Box
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 text-[11px]">
                      <span>{order.vehicleNumber || 'MH 02 EK 4589'}</span>
                      <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                        Load #{order.loadNumber || '189'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-1 mt-0.5">
                      <span title="Loader (LDR)">LDR: <strong className="text-cadbury-900">{order.loaderName || 'Ramesh'}</strong></span>
                      <span>•</span>
                      <span title="Cashier / Collection">Cashier: <strong className="text-emerald-800">{order.cashierName || order.deliveryBoyName || 'Suresh'}</strong></span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-black text-cadbury-900 text-sm">
                    ₹{(order.totalBill ?? 0).toLocaleString('en-IN')}
                    {order.billType && (
                      <span className={`block text-[9px] font-bold ${order.billType === 'CASH' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {order.billType}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {order.stage}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.paymentStatus === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                    {/* Quick Crew Edit Button */}
                    <button
                      onClick={() => handleOpenCrewEdit(order)}
                      title="Edit Loader, Cashier & Van for this bill"
                      className="p-1.5 bg-purple-50 hover:bg-purple-100 text-cadbury-900 border border-purple-200 rounded-lg text-xs font-semibold"
                    >
                      <i className="fa-solid fa-users-gear mr-1 text-purple-700"></i> Crew
                    </button>

                    {/* View & Print Invoice Modal */}
                    <button
                      onClick={() => setSelectedInvoiceOrder(order)}
                      title="View & Print A4 Tax Invoice"
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      <i className="fa-solid fa-print text-emerald-600 mr-1"></i> Print
                    </button>

                    {/* WhatsApp Bill */}
                    <a
                      href={generateWhatsAppBillLink(order)}
                      target="_blank"
                      rel="noreferrer"
                      title="Share Invoice on WhatsApp"
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold"
                    >
                      <i className="fa-brands fa-whatsapp text-emerald-600 mr-1"></i> WhatsApp
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ORDER POPUP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-6 space-y-5 max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-cadbury-700 tracking-wider">
                  New Booking
                </span>
                <h3 className="text-xl font-black text-slate-900">Create Cadbury Retail Order & Bill</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              {/* Select Retailer / Party & Delivery Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Select Party / Retailer *</label>
                    {selectedParty && (
                      <span className="text-[10px] text-slate-500">
                        Area: <strong className="text-slate-800">{selectedParty.area}</strong> | 
                        Pending: <strong className="text-red-600">₹{(selectedParty.currentOutstanding ?? 0).toLocaleString('en-IN')}</strong>
                      </span>
                    )}
                  </div>
                  <select
                    required
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cadbury-600 focus:outline-none bg-white font-semibold text-slate-800"
                  >
                    <option value="">-- Choose Cadbury Retailer / Party --</option>
                    {parties.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.ownerName}) - {p.area} [Dues: ₹{(p.currentOutstanding ?? 0).toLocaleString('en-IN')}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={deliveryDateInput}
                    onChange={(e) => setDeliveryDateInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cadbury-600 focus:outline-none bg-white font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Van & Crew Details (Van, Driver, Loader / LDR, Cashier) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-cadbury-900">
                    <i className="fa-solid fa-truck-ramp-box text-cadbury-700"></i>
                    Gaadi & Staff Assignment (Van, Driver, Loader / LDR, Cashier)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ Aap khud Van, Driver aur Loader ka naam type kar sakte hain
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddVanModalOpen(true)}
                      className="text-[10px] bg-cadbury-900 hover:bg-cadbury-800 text-white font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1 transition-all active:scale-95"
                    >
                      <i className="fa-solid fa-plus-circle text-gold-400"></i> + Nayi Gaadi Register Karein
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  {/* Delivery Van (Editable Free-Type Input with Datalist Suggestions) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">Delivery Van *</label>
                      <span className="text-[9px] text-cadbury-700 font-extrabold uppercase">Khud Type Karein</span>
                    </div>
                    <input
                      type="text"
                      list="create-van-suggestions"
                      required
                      value={selectedVehicleNumber}
                      onChange={(e) => handleVehicleChange(e.target.value)}
                      placeholder="e.g. MH 02 EK 4589 ya Van V2"
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                    />
                    <datalist id="create-van-suggestions">
                      {vehicles.map(v => (
                        <option key={v.id} value={v.vehicleNumber}>
                          {v.vehicleNumber} ({v.driverName} - {v.vehicleType})
                        </option>
                      ))}
                    </datalist>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {vehicles.slice(0, 3).map(v => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleVehicleChange(v.vehicleNumber)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/70 hover:bg-cadbury-100 text-slate-700 hover:text-cadbury-900 transition-colors font-mono"
                        >
                          {v.vehicleNumber.split(' ').pop()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Driver Ka Naam */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">Driver Ka Naam *</label>
                      <span className="text-[9px] text-cadbury-700 font-extrabold uppercase">Khud Type Karein</span>
                    </div>
                    <input
                      type="text"
                      required
                      value={selectedDriverName}
                      onChange={(e) => setSelectedDriverName(e.target.value)}
                      placeholder="e.g. Santosh Yadav"
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['Santosh Yadav', 'Mukesh Sharma', 'Anil Kumar'].map(drv => (
                        <button
                          key={drv}
                          type="button"
                          onClick={() => setSelectedDriverName(drv)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/70 hover:bg-cadbury-100 text-slate-700 hover:text-cadbury-900 transition-colors"
                        >
                          {drv.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Loader (LDR) Naam */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">Loader (LDR) Naam *</label>
                      <span className="text-[9px] text-cadbury-700 font-extrabold uppercase">Maal Loading Staff</span>
                    </div>
                    <input
                      type="text"
                      required
                      value={selectedLoaderName}
                      onChange={(e) => setSelectedLoaderName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['Ramesh Kumar', 'Amit Singh', 'Dinesh Yadav'].map(ldr => (
                        <button
                          key={ldr}
                          type="button"
                          onClick={() => setSelectedLoaderName(ldr)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/70 hover:bg-cadbury-100 text-slate-700 hover:text-cadbury-900 transition-colors"
                        >
                          {ldr.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cashier / Staff */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">Cashier / Staff *</label>
                      <span className="text-[9px] text-emerald-700 font-extrabold uppercase">Collection Staff</span>
                    </div>
                    <input
                      type="text"
                      required
                      value={selectedCashierName}
                      onChange={(e) => setSelectedCashierName(e.target.value)}
                      placeholder="e.g. Suresh Patil"
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['Suresh Patil', 'Vikas Gupta', 'Pradeep Jadhav'].map(csh => (
                        <button
                          key={csh}
                          type="button"
                          onClick={() => setSelectedCashierName(csh)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/70 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 transition-colors"
                        >
                          {csh.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cadbury Product Adding Widget */}
              <div className="bg-cadbury-50/60 p-4 rounded-xl border border-cadbury-100 space-y-3">
                <div className="text-xs font-bold text-cadbury-900 flex items-center gap-1.5">
                  <i className="fa-solid fa-candy-cane text-cadbury-700"></i> Add Cadbury Items to Order:
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      selectedCategory === 'ALL'
                        ? 'bg-cadbury-900 text-white'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.slice(0, 6).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        selectedCategory === cat
                          ? 'bg-cadbury-900 text-white'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {cat.replace('Cadbury ', '')}
                    </button>
                  ))}
                </div>

                {/* Product, Cartons, Discount Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Product</label>
                    <select
                      value={chosenProductId}
                      onChange={(e) => setChosenProductId(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">-- Choose Cadbury Item --</option>
                      {products
                        .filter(p => selectedCategory === 'ALL' || p.category === selectedCategory)
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Rate: ₹{p.cartonRate}/carton)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Cartons (Box)</label>
                    <input
                      type="number"
                      min="1"
                      value={cartonsInput}
                      onChange={(e) => setCartonsInput(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Discount %</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max="25"
                        value={discountPercentInput}
                        onChange={(e) => setDiscountPercentInput(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddItem}
                        disabled={!chosenProductId}
                        className="px-3 bg-cadbury-900 hover:bg-cadbury-800 disabled:opacity-40 text-white rounded-lg font-bold"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5 text-center">Cartons</th>
                      <th className="p-2.5 text-right">Rate / Carton</th>
                      <th className="p-2.5 text-right">Disc %</th>
                      <th className="p-2.5 text-right">Amount (Inc GST)</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                          No items added yet. Select a product above and click Add.
                        </td>
                      </tr>
                    ) : (
                      orderItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-semibold text-slate-800">{item.productName}</td>
                          <td className="p-2.5 text-center font-bold">{item.cartons} Box</td>
                          <td className="p-2.5 text-right">₹{item.ratePerCarton}</td>
                          <td className="p-2.5 text-right">{item.discountPercent}%</td>
                          <td className="p-2.5 text-right font-black text-cadbury-900">
                            ₹{(item.totalAmount ?? 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bill Totals & GST Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-3 text-xs">
                <div className="space-y-1 text-slate-500 w-full sm:w-auto">
                  <div>Total Cartons: <strong className="text-slate-800">{totalCartons} Box</strong></div>
                  <div>Subtotal: ₹{(subtotal ?? 0).toLocaleString('en-IN')}</div>
                  <div>Total Discount: ₹{(totalDiscount ?? 0).toLocaleString('en-IN')}</div>
                  <div>GST (18%): ₹{(totalGst ?? 0).toLocaleString('en-IN')}</div>
                </div>

                <div className="text-right w-full sm:w-auto">
                  <span className="text-xs text-slate-500 block">Grand Total Bill:</span>
                  <span className="text-2xl font-black text-cadbury-900">
                    ₹{(grandTotal ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={orderItems.length === 0}
                  className="px-6 py-2.5 bg-cadbury-900 hover:bg-cadbury-800 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-lg"
                >
                  Confirm & Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT BILLS MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <i className="fa-solid fa-file-excel"></i> Bulk Bill & Cash Sheet Import
                </div>
                <h3 className="text-xl font-black text-slate-900">Import Retail Bills, Invoices & Cash Sheets (Excel / CSV)</h3>
                <p className="text-xs text-slate-500">
                  Multiple retail bills ek saath import karein. Agar CSV nahi hai to seedha apna Excel Cash Sheet (.xlsx / .xls) upload karein.
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleFillLoadReport54Bills}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-700 to-cadbury-900 hover:from-emerald-700 hover:to-cadbury-950 text-white font-black rounded-lg flex items-center gap-1.5 shadow-md transition-all active:scale-95 border border-emerald-300 ring-2 ring-emerald-400/30"
                >
                  <i className="fa-solid fa-truck-ramp-box text-gold-300 animate-bounce"></i> 🚚 ⚡ Load Cadbury Sheet #188 (54 Bills, ₹1,53,422)
                </button>
                <button
                  type="button"
                  onClick={handleFillLoadReport46Bills}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 via-orange-600 to-cadbury-900 hover:from-amber-700 hover:to-cadbury-950 text-white font-black rounded-lg flex items-center gap-1.5 shadow-md transition-all active:scale-95 border border-amber-300 ring-2 ring-amber-400/30"
                >
                  <i className="fa-solid fa-truck-ramp-box text-gold-300 animate-bounce"></i> 🚚 ⚡ Load Cadbury Sheet #189 (46 Bills, ₹1,83,098)
                </button>
                <button
                  type="button"
                  onClick={handleFillSalesBookingDemo}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold rounded-lg flex items-center gap-1.5 shadow-md transition-all active:scale-95 border border-emerald-400/30"
                >
                  <i className="fa-solid fa-receipt text-gold-400 animate-pulse"></i> ⚡ Load WINOMKAR Sales Booking (Bills 6786-6800, Load #189)
                </button>
                <button
                  type="button"
                  onClick={handleFillWinomkarDemo}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-cadbury-900 to-indigo-900 hover:from-cadbury-800 hover:to-indigo-800 text-white font-extrabold rounded-lg flex items-center gap-1.5 shadow-md transition-all active:scale-95 border border-purple-400/30"
                >
                  <i className="fa-solid fa-bolt text-gold-400"></i> WINOMKAR SFA (16 Orders)
                </button>
                <button
                  type="button"
                  onClick={handleFillSampleDemo}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <i className="fa-solid fa-file-lines text-blue-600"></i> Standard CSV Demo
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSampleExcel}
                  className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <i className="fa-solid fa-file-excel text-emerald-600"></i> Download Excel Template (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSampleCSV}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <i className="fa-solid fa-download text-slate-600"></i> CSV Template
                </button>
              </div>

              {/* File upload input (Accepts .xlsx, .xls, .csv, .tsv, .txt) */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 hover:from-emerald-700 hover:to-teal-900 text-white font-extrabold rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95 border border-emerald-400/40 text-xs">
                  <i className="fa-solid fa-file-excel text-base text-yellow-300 animate-pulse"></i>
                  <span>Upload Excel (.xlsx / .xls) / Cash Sheet</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .xlsm, .xlsb, .csv, .txt, .tsv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Uploaded File Banner */}
            {uploadedFileName && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 font-bold">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-file-excel text-emerald-600 text-lg"></i>
                  <span>Loaded File: <strong className="font-mono text-emerald-900">{uploadedFileName}</strong></span>
                  <span className="bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-black">
                    {importParsedRows.length} Bills Found
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-emerald-700 block">Total Amount:</span>
                  <span className="text-sm font-black text-emerald-900 font-mono">
                    ₹{(importParsedRows.reduce((sum: number, r: any) => sum + (Number(r.totalBill) || 0), 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            {/* Batch Van & Staff Assignment Bar */}
            <div className="p-3 bg-cadbury-50/50 border border-cadbury-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-cadbury-950 flex items-center gap-1.5">
                  <i className="fa-solid fa-truck-ramp-box text-cadbury-700"></i>
                  Delivery Van, Loader (LDR), Cashier & Load No for Imported Bills:
                </span>
                <button
                  type="button"
                  onClick={handleApplyBatchCrewToRows}
                  className="px-3 py-1 bg-cadbury-900 hover:bg-cadbury-800 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all"
                >
                  <i className="fa-solid fa-check-double mr-1"></i> Apply Crew to All Rows
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block text-[10px] font-bold text-slate-700">Delivery Van</label>
                    <span className="text-[9px] text-cadbury-700 font-bold uppercase">Type/Select</span>
                  </div>
                  <input
                    type="text"
                    list="batch-van-suggestions"
                    value={batchVehicleNumber}
                    onChange={(e) => handleBatchVehicleChange(e.target.value)}
                    className="w-full p-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                    placeholder="e.g. MH 02 EK 4589 ya Van V2"
                  />
                  <datalist id="batch-van-suggestions">
                    {vehicles.map(v => (
                      <option key={v.id} value={v.vehicleNumber}>
                        {v.vehicleNumber} ({v.driverName} - {v.vehicleType})
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Driver Name (खुद लिखें)</label>
                  <input
                    type="text"
                    value={batchDriverName}
                    onChange={(e) => setBatchDriverName(e.target.value)}
                    className="w-full p-1.5 text-xs border border-slate-300 rounded-lg font-semibold text-slate-800"
                    placeholder="Driver ka naam khud dalein"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Loader / LDR (खुद लिखें)</label>
                  <input
                    type="text"
                    value={batchLoaderName}
                    onChange={(e) => setBatchLoaderName(e.target.value)}
                    className="w-full p-1.5 text-xs border border-slate-300 rounded-lg font-semibold text-slate-800"
                    placeholder="Loader ka naam khud dalein"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Cashier / Staff (खुद लिखें)</label>
                  <input
                    type="text"
                    value={batchCashierName}
                    onChange={(e) => setBatchCashierName(e.target.value)}
                    className="w-full p-1.5 text-xs border border-slate-300 rounded-lg font-semibold text-slate-800"
                    placeholder="Cashier ka naam khud dalein"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Load No / Trip</label>
                  <input
                    type="text"
                    value={batchLoadNumber}
                    onChange={(e) => setBatchLoadNumber(e.target.value)}
                    className="w-full p-1.5 text-xs border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
                    placeholder="189"
                  />
                </div>
              </div>
            </div>

            {/* Paste Text Area */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <label className="font-bold text-slate-700">
                  Paste CSV / Excel Data (Comma ya Tab separated rows):
                </label>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  Party, Product, Cartons, Rate, Vehicle No, Driver, Loader, Cashier
                </span>
              </div>
              <textarea
                rows={5}
                value={importRawText}
                onChange={(e) => handleTextareaChange(e.target.value)}
                placeholder="Sharma Stores, Cadbury Dairy Milk 13.2g, 10, 2400, MH 02 EK 4589, Santosh Yadav, Ramesh Kumar, Suresh Patil"
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
              />
            </div>

            {/* Preview of Parsed Rows */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  Preview ({importParsedRows.length} Bills Parsed)
                </span>
                {importParsedRows.length > 0 && (
                  <span className="text-emerald-700 font-bold">
                    Total Cartons: {importParsedRows.reduce((s, r) => s + r.totalCartons, 0)} Box | Total Value: ₹{importParsedRows.reduce((s, r) => s + r.totalBill, 0).toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Order No / Party</th>
                      <th className="p-2">Product & Details</th>
                      <th className="p-2 text-center">Cartons</th>
                      <th className="p-2 text-right">Total Bill</th>
                      <th className="p-2">Van Number</th>
                      <th className="p-2">Loader (LDR)</th>
                      <th className="p-2">Cashier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {importParsedRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                          No bills parsed yet. Click "⚡ Load WINOMKAR SFA Orders" or upload a file.
                        </td>
                      </tr>
                    ) : (
                      importParsedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2">
                            <span className="font-mono text-[11px] font-bold text-cadbury-900 block">{row.orderNumber || `ORD-${idx + 1}`}</span>
                            <span className="font-bold text-slate-800">{row.partyName}</span>
                          </td>
                          <td className="p-2 text-slate-600 text-[11px]">
                            <div>{row.productName}</div>
                            {row.notes && <div className="text-[10px] text-purple-700 font-medium">{row.notes}</div>}
                          </td>
                          <td className="p-2 text-center font-bold text-cadbury-900">{row.totalCartons} Box</td>
                          <td className="p-2 text-right font-black text-emerald-700">₹{(row.totalBill || 0).toLocaleString('en-IN')}</td>
                          <td className="p-2 font-mono text-[11px]">{row.vehicleNumber}</td>
                          <td className="p-2 font-bold text-slate-800">{row.loaderName}</td>
                          <td className="p-2 font-bold text-slate-800">{row.cashierName}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Success message banner */}
            {importSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-emerald-600 text-base"></i> {importSuccessMsg}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                disabled={importParsedRows.length === 0 || isImporting}
                onClick={handleExecuteImport}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
              >
                {isImporting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Importing...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check-double"></i> Confirm & Import {importParsedRows.length} Bills
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CREW EDIT MODAL (Loader, Cashier & Van) */}
      {editingCrewOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-users-gear text-cadbury-700"></i>
                  Edit Bill Crew (Loader & Cashier)
                </h3>
                <p className="text-xs text-slate-500">
                  {editingCrewOrder.orderNumber} • {editingCrewOrder.partyName} (₹{(editingCrewOrder.totalBill ?? 0).toLocaleString('en-IN')})
                </p>
              </div>
              <button
                onClick={() => setEditingCrewOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">Delivery Van Number (गाड़ी का नंबर खुद लिखें या चुनें)</label>
                  <span className="text-[9px] text-cadbury-700 font-extrabold uppercase">Free Type</span>
                </div>
                <input
                  type="text"
                  list="crew-van-suggestions"
                  value={crewEditVehicle}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCrewEditVehicle(val);
                    const found = vehicles.find(v => v.vehicleNumber.toLowerCase() === val.trim().toLowerCase());
                    if (found) {
                      if (found.driverName) setCrewEditDriver(found.driverName);
                      if (found.loaderName || found.helperLoaderName) setCrewEditLoader(found.loaderName || found.helperLoaderName || 'Ramesh Kumar');
                      if (found.cashierName) setCrewEditCashier(found.cashierName);
                    }
                  }}
                  placeholder="e.g. MH 02 EK 4589 ya Van V2"
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                />
                <datalist id="crew-van-suggestions">
                  {vehicles.map(v => (
                    <option key={v.id} value={v.vehicleNumber}>
                      {v.vehicleNumber} ({v.driverName} - {v.vehicleType})
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Driver Ka Naam (खुद लिखें)</label>
                <input
                  type="text"
                  value={crewEditDriver}
                  onChange={(e) => setCrewEditDriver(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  placeholder="e.g. Santosh Yadav"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-700">Loader / LDR Name (माल लोड करने वाला Staff - खुद लिखें)</label>
                  <span className="text-[10px] text-purple-700 font-bold uppercase">LDR on Van</span>
                </div>
                <input
                  type="text"
                  value={crewEditLoader}
                  onChange={(e) => setCrewEditLoader(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  placeholder="e.g. Ramesh Kumar"
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {['Ramesh Kumar', 'Amit Singh', 'Dinesh Yadav', 'Pradeep Jadhav'].map(name => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setCrewEditLoader(name)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px]"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-700">Cashier / Collection Boy (रोकड़ लेने वाला)</label>
                  <span className="text-[10px] text-emerald-700 font-semibold">Payment Incharge</span>
                </div>
                <input
                  type="text"
                  value={crewEditCashier}
                  onChange={(e) => setCrewEditCashier(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  placeholder="Cashier ka naam"
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {['Suresh Patil', 'Vikas Gupta', 'Pradeep Jadhav', 'Rajesh Sharma'].map(name => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setCrewEditCashier(name)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px]"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Load No / Trip Number</label>
                <input
                  type="text"
                  value={crewEditLoadNo}
                  onChange={(e) => setCrewEditLoadNo(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  placeholder="189"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingCrewOrder(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingCrew}
                onClick={handleSaveCrewEdit}
                className="px-5 py-2 bg-cadbury-900 hover:bg-cadbury-800 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5"
              >
                {isSavingCrew ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i> Save & Update Bill Crew
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRIP DISPATCH & LOADING SHEET PRINT MODAL (Load Wise / Van Wise) */}
      {isTripSheetModalOpen && (
        <div id="printable-trip-sheet-modal-backdrop" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          {/* Print Specific CSS to prevent overflow cutting and isolate #printable-trip-sheet across all pages */}
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm 6mm 8mm 6mm;
              }
              html, body, #root {
                width: 100% !important;
                height: auto !important;
                min-height: auto !important;
                overflow: visible !important;
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-trip-sheet-modal-backdrop {
                position: static !important;
                display: block !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
                width: 100% !important;
                inset: auto !important;
              }
              #printable-trip-sheet-modal-card {
                position: static !important;
                display: block !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
                width: 100% !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
              }
              #printable-trip-sheet, #printable-trip-sheet * {
                visibility: visible !important;
              }
              #printable-trip-sheet {
                position: relative !important;
                display: block !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 2mm !important;
                border: none !important;
                box-shadow: none !important;
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
              .no-print, .no-print * {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                page-break-inside: auto !important;
              }
              th, td {
                border: 1px solid #000000 !important;
                color: #000000 !important;
                font-weight: 700 !important;
              }
              th {
                background-color: #f1f5f9 !important;
                color: #000000 !important;
                font-weight: 800 !important;
              }
              thead {
                display: table-header-group !important;
              }
              tfoot {
                display: table-footer-group !important;
              }
              tr {
                page-break-inside: avoid !important;
                page-break-after: auto !important;
              }
              .avoid-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .trip-sheet-pdf-page {
                width: 100% !important;
                min-height: 275mm !important;
                page-break-after: always !important;
                break-after: page !important;
                padding: 2mm 0 !important;
                box-sizing: border-box !important;
                border: none !important;
                margin: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
              }
              .trip-sheet-pdf-page:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
                min-height: auto !important;
              }
              .party-cell {
                text-align: left !important;
                white-space: normal !important;
                word-break: break-word !important;
                overflow-wrap: break-word !important;
                overflow: visible !important;
                text-overflow: clip !important;
                max-width: none !important;
                font-size: 9.5px !important;
                line-height: 1.2 !important;
              }
            }
          `}</style>

          <div id="printable-trip-sheet-modal-card" className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-6 space-y-5 max-h-[95vh] overflow-y-auto">
            {/* Modal Controls (Hidden in Print) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-black uppercase mb-1">
                  <i className="fa-solid fa-sun text-amber-500"></i> 🌞 स्टेप 1: सुबह की प्रक्रिया — वेयरहाउस से गाड़ी लोडिंग व डिस्पैच चालान
                </div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-truck-ramp-box text-cadbury-700"></i>
                  Trip Dispatch & Loading Sheet (गाड़ी लोडिंग व रोकड़ चालान)
                </h3>
                <p className="text-xs text-slate-500">
                  A4 Multi-page Loading Sheet with Loader (LDR), Driver, Cashier & Bill-wise details
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Hidden input for Morning Loading Sheet import */}
                <input
                  type="file"
                  ref={morningTripImportInputRef}
                  onChange={handleImportMorningLoadingSheet}
                  accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.tsv"
                  className="hidden"
                />

                {/* Import Morning Loading Sheet Button */}
                <button
                  type="button"
                  onClick={() => morningTripImportInputRef.current?.click()}
                  className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                  title="सुबह वेयरहाउस से लोड होने वाले बिल्स / लोडिंग रिपोर्ट एक्सेल फ़ाइल से सीधे इम्पोर्ट करें"
                >
                  <i className="fa-solid fa-file-import text-indigo-200"></i>
                  <span>📥 Import Morning Sheet (सुबह का चालान)</span>
                </button>

                {/* Direct Link to Evening Settlement */}
                <button
                  type="button"
                  onClick={() => {
                    setIsTripSheetModalOpen(false);
                    handleOpenEveningSettlement(selectedTripLoadNo, selectedTripVehicle);
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                  title="शाम को गाड़ी लौटने पर रोकड़ व वापसी हिसाब के लिए Evening Settlement खोलें"
                >
                  <i className="fa-solid fa-hand-holding-dollar text-gold-300"></i>
                  <span>🌆 Evening Settlement (शाम का रोकड़ मिलान) ➡️</span>
                </button>

                {/* Dynamic Load No Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-slate-600">Load:</span>
                  <select
                    value={selectedTripLoadNo}
                    onChange={(e) => setSelectedTripLoadNo(e.target.value)}
                    className="p-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white text-slate-900 shadow-sm"
                  >
                    <option value="ALL">All Loads ({orders.length} Bills)</option>
                    {availableLoadNumbers.map(lNo => {
                      const count = orders.filter(o => String(o.loadNumber || '').trim() === lNo).length;
                      return (
                        <option key={lNo} value={lNo}>
                          Load #{lNo} ({count} Bills)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Delete Unwanted Load Button */}
                <button
                  type="button"
                  onClick={() => handleOpenDeleteLoadModal(selectedTripLoadNo !== 'ALL' ? selectedTripLoadNo : undefined)}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  title="पुराना या अनचाहा Load No डिलीट करें ताकि डेटा फुल न हो"
                >
                  <i className="fa-solid fa-trash-can text-rose-600"></i>
                  <span>{selectedTripLoadNo !== 'ALL' ? `Delete Load #${selectedTripLoadNo}` : 'Delete Load No'}</span>
                </button>

                {/* Data Backup Button */}
                <button
                  type="button"
                  onClick={() => setIsBackupModalOpen(true)}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  title="डेटा का लोकल ड्राइव या गूगल ड्राइव/क्लाउड बैकअप लें"
                >
                  <i className="fa-solid fa-cloud-arrow-down text-blue-600"></i>
                  <span>💾 Data Backup</span>
                </button>

                {/* Van Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-slate-600">Van:</span>
                  <select
                    value={selectedTripVehicle}
                    onChange={(e) => {
                      const newVeh = e.target.value;
                      setSelectedTripVehicle(newVeh);
                      if (newVeh !== 'ALL') setTripEditVan(newVeh);
                    }}
                    className="p-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                  >
                    <option value="ALL">All Vans</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.vehicleNumber}>{v.vehicleNumber}</option>
                    ))}
                  </select>
                </div>

                {/* Export Excel (.xlsx) Button */}
                <button
                  type="button"
                  onClick={() => handleExportTripSheetExcel()}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                  title="लोड शीट को Excel स्प्रेडशीट (.xlsx) में डाउनलोड करें"
                >
                  <i className="fa-solid fa-file-excel text-emerald-300"></i>
                  <span>Excel (.xlsx)</span>
                </button>

                {/* Export CSV (.csv) Button */}
                <button
                  type="button"
                  onClick={() => handleExportTripSheetCSV()}
                  className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                  title="लोड शीट को CSV फ़ाइल (.csv) में डाउनलोड करें"
                >
                  <i className="fa-solid fa-file-csv text-teal-300"></i>
                  <span>CSV (.csv)</span>
                </button>

                {/* Direct PDF Download Button */}
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPdf}
                  className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                  title="Download complete multi-page PDF with zero cut-off"
                >
                  <i className={`fa-solid ${isDownloadingPdf ? 'fa-spinner fa-spin' : 'fa-file-pdf'} text-white`}></i>
                  {isDownloadingPdf ? 'Creating PDF...' : '📥 Download PDF (A4)'}
                </button>

                {/* Print Trip Sheet (Full Multi-Page) */}
                <button
                  type="button"
                  onClick={handlePrintTripSheet}
                  className="px-3.5 py-2 bg-cadbury-900 hover:bg-cadbury-800 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                  title="Print all pages without cutting off"
                >
                  <i className="fa-solid fa-print text-gold-400"></i> 🖨️ Print Trip Sheet (A4)
                </button>

                <button
                  type="button"
                  onClick={() => setIsTripSheetModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            {/* PRINTABLE TRIP SHEET (Rendered & Print-Scoped) */}
            {(() => {
              const tripOrders = getActiveTripOrders(selectedTripLoadNo, selectedTripVehicle);

              const totalTripCartons = tripOrders.reduce((s, o) => s + (o.totalCartons || 0), 0);
              const totalTripBill = tripOrders.reduce((s, o) => s + (o.totalBill || 0), 0);
              const totalTripCash = tripOrders.filter(o => o.billType !== 'CREDIT').reduce((s, o) => s + (o.totalBill || 0), 0);
              const totalTripCredit = tripOrders.filter(o => o.billType === 'CREDIT').reduce((s, o) => s + (o.totalBill || 0), 0);

              // Live Evening Calculations based on user edits & RECD ticks
              const liveCashTotal = tripOrders.reduce((sum, ord) => {
                const ent = tripSheetEntries[ord.orderNumber];
                if (ent && ent.cash !== undefined) return sum + (Number(ent.cash) || 0);
                return sum + (ord.billType !== 'CREDIT' ? ord.totalBill : 0);
              }, 0);

              const liveChequeTotal = tripOrders.reduce((sum, ord) => {
                const ent = tripSheetEntries[ord.orderNumber];
                return sum + (Number(ent?.chequeAmt) || 0);
              }, 0);

              const liveCreditTotal = tripOrders.reduce((sum, ord) => {
                const ent = tripSheetEntries[ord.orderNumber];
                if (ent && ent.credit !== undefined) return sum + (Number(ent.credit) || 0);
                return sum + (ord.billType === 'CREDIT' ? ord.totalBill : 0);
              }, 0);

              const liveRecdCount = tripOrders.filter(ord => {
                const ent = tripSheetEntries[ord.orderNumber];
                if (ent && ent.recd !== undefined) return ent.recd;
                return ord.deliveryStatus === 'Delivered';
              }).length;

              const liveTotalRecd = liveCashTotal + liveChequeTotal + liveCreditTotal;
              const liveDifference = liveTotalRecd - totalTripBill;

              const activeTripVan = tripEditVan || tripOrders[0]?.vehicleNumber || (selectedTripVehicle !== 'ALL' ? selectedTripVehicle : 'MH 02 EK 4589');
              const activeTripDriver = tripEditDriver || tripOrders[0]?.driverName || 'Santosh Yadav';
              const activeTripLoader = tripEditLoader || tripOrders[0]?.loaderName || 'Ramesh Kumar';
              const activeTripCashier = tripEditCashier || tripOrders[0]?.cashierName || tripOrders[0]?.deliveryBoyName || 'Suresh Patil';
              const tripSheetPages = getTripSheetPages(tripOrders);

              return (
                <div className="space-y-4">
                  {/* INTERACTIVE TRIP CREW ASSIGNMENT BAR (Screen only - no-print) */}
                  <div className="no-print p-4 bg-gradient-to-r from-amber-50 via-purple-50 to-indigo-50 border border-purple-200 rounded-2xl shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-cadbury-950 flex items-center gap-1.5">
                            <i className="fa-solid fa-truck-ramp-box text-cadbury-700"></i>
                            वैन, ड्राइवर, लोडर व कैशियर चयन (Van, Driver, Loader & Cashier Assignment)
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsCrewMasterModalOpen(true)}
                            className="px-2.5 py-1 bg-cadbury-900 hover:bg-cadbury-950 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1 transition-all active:scale-95"
                            title="वैन, ड्राइवर, लोडर व कैशियर मास्टर सूची खोलें व नए नाम जोड़ें"
                          >
                            <i className="fa-solid fa-users-gear text-gold-400"></i>
                            <span>👥 Manage Master List (मास्टर लिस्ट खोलें)</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          वैन (V1, V2, V3...), ड्राइवर, लोडर और कैशियर चुनें या नया जोड़ें — यह सभी {tripOrders.length} बिलों व प्रिंटआउट पर तुरंत लागू होगा:
                        </p>
                      </div>
                      {tripCrewSavedMsg && (
                        <div className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl shadow-sm animate-bounce flex items-center gap-1.5">
                          <i className="fa-solid fa-circle-check text-emerald-600"></i> {tripCrewSavedMsg}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {/* 1. Van Selection (V1 to V6 & Custom) */}
                      <div className="bg-white p-2.5 rounded-xl border border-purple-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                              <i className="fa-solid fa-truck text-cadbury-700"></i> Delivery Van No.
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickAddCat('vans');
                                setQuickAddName('');
                                setQuickAddExtra('');
                              }}
                              className="text-[10px] font-bold text-cadbury-700 hover:text-cadbury-900 underline flex items-center gap-0.5"
                              title="नई वैन जोड़ें"
                            >
                              <i className="fa-solid fa-circle-plus"></i> + New Van
                            </button>
                          </div>

                          {/* Quick Van Pills: V1 to V6 */}
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {crewMaster.vans.slice(0, 6).map(v => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => setTripEditVan(v.name)}
                                className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${
                                  tripEditVan.toUpperCase() === v.name.toUpperCase()
                                    ? 'bg-cadbury-900 text-white shadow-sm ring-2 ring-cadbury-500 scale-105'
                                    : 'bg-slate-100 hover:bg-purple-100 text-slate-800 border border-slate-200'
                                }`}
                              >
                                {v.name}
                              </button>
                            ))}
                          </div>

                          <input
                            type="text"
                            list="trip-crew-van-list"
                            value={tripEditVan}
                            onChange={(e) => setTripEditVan(e.target.value.toUpperCase())}
                            placeholder="e.g. V1, V2, MH 02..."
                            className="w-full px-2.5 py-1 border border-purple-300 rounded-lg font-mono font-bold text-xs bg-white text-slate-900 focus:ring-2 focus:ring-purple-500 uppercase shadow-inner"
                          />
                          <datalist id="trip-crew-van-list">
                            {crewMaster.vans.map(v => (
                              <option key={v.id} value={v.name}>{v.name} ({v.type || 'Van'})</option>
                            ))}
                          </datalist>
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1 block">चुनी हुई वैन: <strong className="font-mono text-cadbury-900">{tripEditVan}</strong></span>
                      </div>

                      {/* 2. Boxes Loaded (Custom Box Count) */}
                      <div className="bg-white p-2.5 rounded-xl border border-indigo-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-black text-indigo-950 flex items-center gap-1">
                              <i className="fa-solid fa-boxes-stacked text-indigo-600"></i> Boxes Loaded (लोड बॉक्स) *
                            </label>
                            <button
                              type="button"
                              onClick={() => setTripEditBoxesLoaded(String(totalTripCartons || 54))}
                              className="text-[10px] font-bold text-indigo-700 hover:underline"
                            >
                              Auto: {totalTripCartons}
                            </button>
                          </div>

                          {/* Quick Box presets */}
                          <div className="flex gap-1 mb-1.5">
                            {['54', '108', '120'].map(b => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => setTripEditBoxesLoaded(b)}
                                className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${
                                  tripEditBoxesLoaded === b
                                    ? 'bg-indigo-700 text-white shadow-sm'
                                    : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {b} Bx
                              </button>
                            ))}
                          </div>

                          <input
                            type="number"
                            value={tripEditBoxesLoaded}
                            onChange={(e) => setTripEditBoxesLoaded(e.target.value)}
                            placeholder="Total Boxes"
                            className="w-full px-2.5 py-1 border border-indigo-300 rounded-lg font-mono font-black text-xs bg-white text-indigo-950 focus:ring-2 focus:ring-indigo-500 shadow-inner"
                          />
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1 block">प्रिंट पर दिखेगा: <strong className="font-mono text-indigo-900">{tripEditBoxesLoaded || totalTripCartons} Boxes</strong></span>
                      </div>

                      {/* 3. Driver Name & Beat */}
                      <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-black text-blue-950 flex items-center gap-1">
                              <i className="fa-solid fa-id-card text-blue-700"></i> Driver & Beat
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickAddCat('drivers');
                                setQuickAddName('');
                                setQuickAddExtra('');
                              }}
                              className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-0.5"
                              title="नया ड्राइवर जोड़ें"
                            >
                              <i className="fa-solid fa-circle-plus"></i> + New Driver
                            </button>
                          </div>

                          {/* Select from saved drivers */}
                          <select
                            onChange={(e) => {
                              const found = crewMaster.drivers.find(d => d.name === e.target.value);
                              if (found) {
                                setTripEditDriver(found.name);
                                if (found.beat) setTripEditDriverLocation(found.beat);
                              }
                            }}
                            className="w-full px-2 py-0.5 mb-1 border border-blue-300 rounded text-[10px] font-bold bg-blue-50/60 text-blue-950 truncate"
                          >
                            <option value="">-- ड्राइवर चुनें ({crewMaster.drivers.length}) --</option>
                            {crewMaster.drivers.map(d => (
                              <option key={d.id} value={d.name}>{d.name} {d.beat ? `(${d.beat})` : ''}</option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={tripEditDriver}
                            onChange={(e) => setTripEditDriver(e.target.value)}
                            placeholder="Driver Name"
                            className="w-full px-2.5 py-1 border border-blue-300 rounded-lg font-bold text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 mb-1"
                          />
                          <input
                            type="text"
                            value={tripEditDriverLocation}
                            onChange={(e) => setTripEditDriverLocation(e.target.value)}
                            placeholder="Beat / Route Area"
                            className="w-full px-2 py-0.5 border border-blue-200 rounded text-[10px] bg-slate-50 text-slate-700"
                          />
                        </div>
                      </div>

                      {/* 4. Loader (LDR) & Bay */}
                      <div className="bg-white p-2.5 rounded-xl border border-purple-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-black text-purple-950 flex items-center gap-1">
                              <i className="fa-solid fa-boxes-packing text-purple-700"></i> Loader (LDR) & Bay
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickAddCat('loaders');
                                setQuickAddName('');
                                setQuickAddExtra('');
                              }}
                              className="text-[10px] font-bold text-purple-700 hover:text-purple-900 underline flex items-center gap-0.5"
                              title="नया लोडर जोड़ें"
                            >
                              <i className="fa-solid fa-circle-plus"></i> + New Loader
                            </button>
                          </div>

                          {/* Select from saved loaders */}
                          <select
                            onChange={(e) => {
                              const found = crewMaster.loaders.find(l => l.name === e.target.value);
                              if (found) {
                                setTripEditLoader(found.name);
                                if (found.bay) setTripEditLoaderLocation(found.bay);
                              }
                            }}
                            className="w-full px-2 py-0.5 mb-1 border border-purple-300 rounded text-[10px] font-bold bg-purple-50/60 text-purple-950 truncate"
                          >
                            <option value="">-- लोडर चुनें ({crewMaster.loaders.length}) --</option>
                            {crewMaster.loaders.map(l => (
                              <option key={l.id} value={l.name}>{l.name} {l.bay ? `(${l.bay})` : ''}</option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={tripEditLoader}
                            onChange={(e) => setTripEditLoader(e.target.value)}
                            placeholder="Loader Name"
                            className="w-full px-2.5 py-1 border border-purple-300 rounded-lg font-bold text-xs bg-white text-purple-950 focus:ring-2 focus:ring-purple-500 mb-1"
                          />
                          <input
                            type="text"
                            value={tripEditLoaderLocation}
                            onChange={(e) => setTripEditLoaderLocation(e.target.value)}
                            placeholder="Loading Bay / Dock"
                            className="w-full px-2 py-0.5 border border-purple-200 rounded text-[10px] bg-slate-50 text-slate-700"
                          />
                        </div>
                      </div>

                      {/* 5. Cashier / Collection & Location */}
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-black text-emerald-950 flex items-center gap-1">
                              <i className="fa-solid fa-hand-holding-dollar text-emerald-700"></i> Cashier & Location
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickAddCat('cashiers');
                                setQuickAddName('');
                                setQuickAddExtra('');
                              }}
                              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-0.5"
                              title="नया कैशियर जोड़ें"
                            >
                              <i className="fa-solid fa-circle-plus"></i> + New Cashier
                            </button>
                          </div>

                          {/* Select from saved cashiers */}
                          <select
                            onChange={(e) => {
                              const found = crewMaster.cashiers.find(c => c.name === e.target.value);
                              if (found) {
                                setTripEditCashier(found.name);
                                if (found.location) setTripEditCashierLocation(found.location);
                              }
                            }}
                            className="w-full px-2 py-0.5 mb-1 border border-emerald-300 rounded text-[10px] font-bold bg-emerald-50/60 text-emerald-950 truncate"
                          >
                            <option value="">-- कैशियर चुनें ({crewMaster.cashiers.length}) --</option>
                            {crewMaster.cashiers.map(c => (
                              <option key={c.id} value={c.name}>{c.name} {c.location ? `(${c.location})` : ''}</option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={tripEditCashier}
                            onChange={(e) => setTripEditCashier(e.target.value)}
                            placeholder="Cashier Name"
                            className="w-full px-2.5 py-1 border border-emerald-300 rounded-lg font-bold text-xs bg-white text-emerald-950 focus:ring-2 focus:ring-emerald-500 mb-1"
                          />
                          <input
                            type="text"
                            value={tripEditCashierLocation}
                            onChange={(e) => setTripEditCashierLocation(e.target.value)}
                            placeholder="Counter Location"
                            className="w-full px-2 py-0.5 border border-emerald-200 rounded text-[10px] bg-slate-50 text-slate-700"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                      <div className="text-[11px] text-slate-500 italic">
                        💡 Tip: Delivery Van, Driver, Loader, Cashier ya Boxes Loaded badal kar button dabayein — sabhi {tripOrders.length} bills aur printout par turant update ho jayega.
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsTripSheetModalOpen(false);
                            handleOpenEveningSettlement(selectedTripLoadNo, selectedTripVehicle);
                          }}
                          className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                          <i className="fa-solid fa-receipt text-gold-300"></i> 🌆 Go to Evening Settlement (शाम की वापसी व रोकड़ भरें)
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveTripCrew}
                          disabled={isUpdatingTripCrew}
                          className="px-4 py-2 bg-gradient-to-r from-cadbury-900 to-purple-800 hover:from-cadbury-950 hover:to-purple-900 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <i className={`fa-solid ${isUpdatingTripCrew ? 'fa-spinner fa-spin' : 'fa-floppy-disk'} text-gold-400`}></i>
                          {isUpdatingTripCrew ? 'Updating Bills...' : '💾 Update & Assign to All Bills (सभी बिलों पर लागू करें)'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* EVENING LIVE TALLY & QUICK ACTION CONTROL BAR (Screen only - No print) */}
                  <div className="no-print p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-300 rounded-xl space-y-2.5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2">
                      <div>
                        <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                          <i className="fa-solid fa-money-check-dollar text-emerald-700"></i>
                          शाम की वैन वापसी - रोकड़ (CASH), चेक (CHEQUE), क्रेडिट (CREDIT) व RECD टिक लाइव एंट्री
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          टेबल में सीधे नकद या उधारी एडिट करें, RECD पर टिक करें — नीचे कुल रकम (Total Amount) ऑटोमैटिक अपने-आप बदल जाएगी:
                        </p>
                      </div>

                      {/* Live Balance / Tallied Badge */}
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm ${
                          Math.abs(liveDifference) < 1
                            ? 'bg-emerald-600 text-white'
                            : liveDifference < 0
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-blue-600 text-white'
                        }`}>
                          {Math.abs(liveDifference) < 1 ? (
                            <>
                              <i className="fa-solid fa-circle-check"></i> हिसाब 100% बराबर (₹{liveTotalRecd.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </>
                          ) : liveDifference < 0 ? (
                            <>
                              <i className="fa-solid fa-triangle-exclamation"></i> शॉर्टेज (कमी): -₹{Math.abs(liveDifference).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-circle-plus"></i> अतिरिक्त रोकड़: +₹{liveDifference.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-700 text-[11px]">
                          RECD स्थिति: <strong className="text-emerald-800 font-mono text-xs">{liveRecdCount} / {tripOrders.length} बिल प्राप्त ({tripOrders.length ? Math.round((liveRecdCount / tripOrders.length) * 100) : 0}%)</strong>
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-[11px] text-slate-600">
                          रोकड़: <strong className="text-emerald-700 font-mono">₹{liveCashTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> | 
                          चेक: <strong className="text-blue-700 font-mono">₹{liveChequeTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> | 
                          उधारी: <strong className="text-amber-700 font-mono">₹{liveCreditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Mark All Recd Button */}
                        <button
                          type="button"
                          onClick={() => handleMarkAllTripRecd(tripOrders)}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 active:scale-95 transition-all"
                          title="सभी बिलों को एक साथ RECD टिक करें और कैश/क्रेडिट भरें"
                        >
                          <i className="fa-solid fa-check-double text-gold-300"></i> ⚡ All RECD (सब टिक करें)
                        </button>

                        {/* Reset Button */}
                        <button
                          type="button"
                          onClick={() => handleResetTripEntries(tripOrders)}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl shadow-sm active:scale-95 transition-all"
                          title="मूल बिल स्थिति में रीसेट करें"
                        >
                          <i className="fa-solid fa-rotate-left"></i> रीसेट
                        </button>

                        {/* Save Button */}
                        <button
                          type="button"
                          onClick={() => handleSaveTripSheetEntries(tripOrders)}
                          disabled={isSavingTripEntries}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-cadbury-900 to-indigo-900 hover:from-cadbury-950 text-white font-black text-xs rounded-xl shadow flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <i className={`fa-solid ${isSavingTripEntries ? 'fa-spinner fa-spin' : 'fa-floppy-disk'} text-gold-400`}></i>
                          {isSavingTripEntries ? 'Saving...' : '💾 Save Changes (सेव करें)'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PRINTABLE TRIP SHEET (Rendered as distinct A4 pages for ZERO horizontal text-cuts) */}
                  <div id="printable-trip-sheet" className="space-y-6">
                    {tripSheetPages.map((pageOrders, pageIdx) => {
                      const isFirstPage = pageIdx === 0;
                      const isLastPage = pageIdx === tripSheetPages.length - 1;
                      const totalPages = tripSheetPages.length;

                      return (
                        <React.Fragment key={pageIdx}>
                          <div
                            className="trip-sheet-pdf-page bg-white text-black font-sans p-3 sm:p-4 border-2 border-black rounded-xl"
                            style={{
                              width: '100%',
                              maxWidth: '794px',
                              minHeight: '1050px',
                              margin: '0 auto',
                              boxSizing: 'border-box',
                              backgroundColor: '#ffffff',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between'
                            }}
                          >
                            {/* Main Content Area */}
                            <div className="space-y-2 flex-1">
                              {/* Header */}
                              {isFirstPage ? (
                                <div className="border-b-2 border-black pb-2">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <h1 className="text-xl font-black text-black uppercase tracking-tight font-serif leading-none">
                                        VISTARAN HEALTH CARE SERVICES PVT.LTD.
                                      </h1>
                                      <div className="text-[11px] font-bold text-black mt-0.5">
                                        MUMBAI: 400079
                                      </div>
                                      <div className="text-xs font-black text-black mt-1 uppercase underline decoration-2">
                                        Loading Report (Bill Wise)
                                      </div>
                                    </div>

                                    <div className="text-right text-xs">
                                      <div className="font-bold text-black flex items-center justify-end gap-3 text-[11px]">
                                        <span>Narration: <strong className="font-mono font-bold">{activeTripVan.includes('V') ? activeTripVan : (tripOrders[0]?.vehicleNumber || 'V1')}</strong></span>
                                        <span>Van No: <strong className="font-mono font-black text-black">{activeTripVan}</strong></span>
                                      </div>
                                      <div className="font-bold text-black mt-0.5 flex items-center justify-end gap-2.5 text-[10px]">
                                        <span>Load No: <strong className="font-mono font-black text-black">{selectedTripLoadNo === 'ALL' ? (tripOrders[0]?.loadNumber || '188') : selectedTripLoadNo}</strong></span>
                                        <span>Date: <strong className="font-mono font-black">{tripOrders[0]?.orderDate || '19/11/2026'}</strong></span>
                                        <span>Boxes: <strong className="font-mono font-black text-black">{tripEditBoxesLoaded || totalTripCartons} Boxes</strong></span>
                                      </div>
                                      <div className="text-[9px] text-black mt-0.5 font-bold flex items-center justify-end gap-2">
                                        <span>Generated: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="bg-slate-200 px-2 py-0.5 border border-black rounded font-mono font-black text-[10px]">Page 1 of {totalPages}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Trip Van & Staff Crew Snapshot */}
                                  <div className="mt-2 pt-1.5 border-t-2 border-black grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-black text-black">
                                    <div>
                                      <span className="text-[9px] text-black font-extrabold block uppercase">Delivery Van:</span>
                                      <strong className="font-mono text-black text-xs font-black block">{activeTripVan}</strong>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-black font-extrabold block uppercase">Boxes Loaded:</span>
                                      <strong className="font-mono text-black text-xs font-black block">{tripEditBoxesLoaded || totalTripCartons} Boxes</strong>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-black font-extrabold block uppercase">Driver Name:</span>
                                      <strong className="text-black text-xs font-black block truncate">{activeTripDriver}</strong>
                                      <span className="text-[9px] text-slate-700 block truncate font-medium">{tripEditDriverLocation}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-black font-extrabold block uppercase">Loader (LDR):</span>
                                      <strong className="text-black text-xs font-black block truncate">{activeTripLoader}</strong>
                                      <span className="text-[9px] text-slate-700 block truncate font-medium">{tripEditLoaderLocation}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-black font-extrabold block uppercase">Cashier / Collection:</span>
                                      <strong className="text-black text-xs font-black block truncate">{activeTripCashier}</strong>
                                      <span className="text-[9px] text-slate-700 block truncate font-medium">{tripEditCashierLocation}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Continuation Page Header */
                                <div className="border-b-2 border-black pb-1.5 mb-1">
                                  <div className="flex justify-between items-center text-xs">
                                    <div>
                                      <span className="font-serif font-black text-black text-sm uppercase">VISTARAN HEALTH CARE SERVICES PVT.LTD.</span>
                                      <span className="font-bold text-[10px] text-black ml-2 uppercase">(Loading Report - Bill Wise Continuation)</span>
                                    </div>
                                    <div className="text-right text-[10px] font-bold text-black flex items-center gap-3">
                                      <span>Load No: <strong className="font-mono font-black">{selectedTripLoadNo === 'ALL' ? (tripOrders[0]?.loadNumber || '188') : selectedTripLoadNo}</strong></span>
                                      <span>Van: <strong className="font-mono font-black">{activeTripVan}</strong></span>
                                      <span>Boxes: <strong className="font-mono font-black">{tripEditBoxesLoaded || totalTripCartons}</strong></span>
                                      <span className="font-mono font-black bg-slate-200 px-2 py-0.5 border border-black rounded">Page {pageIdx + 1} of {totalPages}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Table */}
                              {pageOrders.length > 0 ? (
                                <div className="overflow-visible">
                                  <table className="w-full text-xs text-left border-collapse border-2 border-black table-fixed text-black">
                                    <thead className="bg-slate-100 text-[10px] uppercase font-black text-black border-b-2 border-black">
                                      <tr>
                                        <th className="p-1 border border-black text-center w-[3.5%] text-black font-extrabold">#</th>
                                        <th className="p-1 border border-black w-[8.5%] text-center text-black font-extrabold whitespace-nowrap">DATE</th>
                                        <th className="p-1 border border-black w-[7%] text-center text-black font-extrabold whitespace-nowrap">BILL NO</th>
                                        <th className="p-1 border border-black w-[33%] text-left text-black font-extrabold">PARTY NAME</th>
                                        <th className="p-1 border border-black text-right w-[10.5%] text-black font-extrabold whitespace-nowrap">AMOUNT</th>
                                        <th className="p-1 border border-black text-right w-[10%] text-black font-extrabold whitespace-nowrap">CASH (रोकड़)</th>
                                        <th className="p-1 border border-black text-center w-[7.5%] text-black font-extrabold whitespace-nowrap">CHEQUE</th>
                                        <th className="p-1 border border-black text-right w-[10%] text-black font-extrabold whitespace-nowrap">CREDIT (उधारी)</th>
                                        <th className="p-1 border border-black text-center w-[4.5%] text-black font-extrabold whitespace-nowrap">RECD</th>
                                        <th className="p-1 border border-black text-center w-[5.5%] text-black font-extrabold whitespace-nowrap">SIGN</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black">
                                      {pageOrders.map((ord) => {
                                        const globalIdx = tripOrders.indexOf(ord) + 1;
                                        const cleanBillNo = ord.orderNumber.replace('BILL-', '').replace('ORD-', '');
                                        const isDefaultCredit = ord.billType === 'CREDIT';
                                        const entry = tripSheetEntries[ord.orderNumber] || {
                                          recd: ord.deliveryStatus === 'Delivered' || (ord as any).recd === true,
                                          cash: (ord as any).cashAmount !== undefined ? (ord as any).cashAmount : (isDefaultCredit ? 0 : ord.totalBill),
                                          cheque: (ord as any).chequeInfo || '',
                                          chequeAmt: (ord as any).chequeAmount !== undefined ? (ord as any).chequeAmount : (parseFloat((ord as any).chequeInfo) || 0),
                                          credit: (ord as any).creditAmount !== undefined ? (ord as any).creditAmount : (isDefaultCredit ? ord.totalBill : 0),
                                          partyStamp: (ord as any).partyStamp || (ord.deliveryStatus === 'Delivered' ? 'STAMP OK' : '')
                                        };

                                        return (
                                          <tr key={ord.id || ord.orderNumber} className={`hover:bg-slate-50 border-b border-black ${entry.recd ? 'bg-emerald-50/20' : ''}`}>
                                            <td className="p-1 border border-black text-center font-mono text-[10px] text-black font-bold">{globalIdx}</td>
                                            <td className="p-1 border border-black text-center font-mono whitespace-nowrap text-black font-bold text-[9px]">{ord.orderDate || '19-11-2026'}</td>
                                            <td className="p-1 border border-black text-center font-mono font-black text-black text-[10px]">/{cleanBillNo}</td>
                                            <td className="party-cell p-1 border border-black font-bold text-black text-[10px] leading-tight text-left" title={ord.partyName}>
                                              {ord.partyName}
                                            </td>
                                            <td className="p-1 border border-black text-right font-mono font-black text-black whitespace-nowrap text-[10px]">
                                              {(ord.totalBill ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>

                                            {/* CASH Cell */}
                                            <td className="p-1 border border-black text-right font-mono font-black text-black whitespace-nowrap text-[10px]">
                                              <div className="no-print flex items-center justify-end gap-1">
                                                <input
                                                  type="number"
                                                  value={entry.cash === 0 ? '' : entry.cash}
                                                  onChange={(e) => handleEditTripCash(ord.orderNumber, parseFloat(e.target.value) || 0)}
                                                  placeholder="0"
                                                  className="w-16 text-right px-1 py-0.5 font-mono font-black text-xs text-black bg-emerald-50/60 border border-emerald-400 rounded focus:bg-white focus:ring-1 focus:ring-emerald-500"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleSetFullCash(ord.orderNumber, ord.totalBill)}
                                                  title="पूरा बिल नकद (Full Cash)"
                                                  className="text-[9px] px-1 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded font-bold"
                                                >
                                                  Full
                                                </button>
                                              </div>
                                              <span className="print-only text-black font-black font-mono">
                                                {entry.cash > 0 ? entry.cash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                              </span>
                                            </td>

                                            {/* CHEQUE Cell */}
                                            <td className="p-1 border border-black text-center font-mono text-black font-bold whitespace-nowrap text-[10px]">
                                              <div className="no-print">
                                                <input
                                                  type="text"
                                                  value={entry.cheque}
                                                  onChange={(e) => handleEditTripCheque(ord.orderNumber, e.target.value)}
                                                  placeholder="Chq / Amt"
                                                  className="w-16 text-center px-1 py-0.5 font-mono text-[11px] text-black bg-blue-50/60 border border-blue-400 rounded focus:bg-white focus:ring-1 focus:ring-blue-500"
                                                />
                                              </div>
                                              <span className="print-only text-[10px] text-black font-bold font-mono">
                                                {entry.cheque || ''}
                                              </span>
                                            </td>

                                            {/* CREDIT Cell */}
                                            <td className="p-1 border border-black text-right font-mono font-black text-black whitespace-nowrap text-[10px]">
                                              <div className="no-print flex items-center justify-end gap-1">
                                                <input
                                                  type="number"
                                                  value={entry.credit === 0 ? '' : entry.credit}
                                                  onChange={(e) => handleEditTripCredit(ord.orderNumber, parseFloat(e.target.value) || 0)}
                                                  placeholder="0"
                                                  className="w-16 text-right px-1 py-0.5 font-mono font-black text-xs text-black bg-amber-50/60 border border-amber-400 rounded focus:bg-white focus:ring-1 focus:ring-amber-500"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleSetFullCredit(ord.orderNumber, ord.totalBill)}
                                                  title="पूरा बिल उधारी (Full Credit)"
                                                  className="text-[9px] px-1 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold"
                                                >
                                                  Full
                                                </button>
                                              </div>
                                              <span className="print-only text-black font-black font-mono">
                                                {entry.credit > 0 ? entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                              </span>
                                            </td>

                                            {/* RECD Checkbox Cell */}
                                            <td className="p-1 border border-black text-center">
                                              <div className="no-print flex justify-center">
                                                <button
                                                  type="button"
                                                  onClick={() => handleToggleRecd(ord.orderNumber, ord.totalBill, ord.billType)}
                                                  className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-xs border transition-all ${
                                                    entry.recd
                                                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm scale-105'
                                                      : 'bg-white border-slate-400 hover:border-emerald-500 text-slate-200 hover:text-slate-400'
                                                  }`}
                                                  title={entry.recd ? 'RECD टिक है' : 'क्लिक करके RECD टिक करें'}
                                                >
                                                  {entry.recd ? '✓' : ''}
                                                </button>
                                              </div>
                                              <div className="print-only w-4 h-4 border-2 border-black mx-auto rounded-sm flex items-center justify-center text-[10px] font-black text-black">
                                                {entry.recd ? '✓' : ''}
                                              </div>
                                            </td>

                                            {/* PARTY STAMP / SIGN Cell */}
                                            <td className="p-1 border border-black text-center">
                                              <div className="no-print">
                                                <input
                                                  type="text"
                                                  value={entry.partyStamp}
                                                  onChange={(e) => handleEditPartyStamp(ord.orderNumber, e.target.value)}
                                                  placeholder="Sign / Stamp"
                                                  className="w-16 text-center px-1 py-0.5 text-[10px] border border-slate-300 rounded bg-slate-50 focus:bg-white text-black font-bold"
                                                />
                                              </div>
                                              <div className="print-only text-center">
                                                {entry.partyStamp ? (
                                                  <span className="font-black text-[9px] text-black uppercase tracking-tight">{entry.partyStamp}</span>
                                                ) : (
                                                  <div className="w-12 h-3 border-b border-dashed border-black mx-auto"></div>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>

                                    {/* Table Footer Totals */}
                                    {(isLastPage || pageOrders.length === tripOrders.length) && (
                                      <tfoot className="bg-slate-100 font-black text-xs border-t-2 border-black">
                                        <tr className="border-t-2 border-black">
                                          <td colSpan={4} className="p-1.5 border border-black text-right uppercase text-black font-black">
                                            TOTALS ({tripOrders.length} BILLS):
                                          </td>
                                          <td className="p-1 border border-black text-right font-mono font-black text-black whitespace-nowrap text-[10px]">
                                            ₹{totalTripBill.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                          <td className="p-1 border border-black text-right font-mono font-black text-black whitespace-nowrap text-[10px]">
                                            ₹{liveCashTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                          <td className="p-1 border border-black text-center font-mono font-black text-black whitespace-nowrap text-[10px]">
                                            {liveChequeTotal > 0 ? `₹${liveChequeTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                          </td>
                                          <td className="p-1 border border-black text-right font-mono font-black text-black whitespace-nowrap text-[10px]">
                                            ₹{liveCreditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                          <td className="p-1 border border-black text-center text-[10px] text-black font-black whitespace-nowrap">
                                            {liveRecdCount}/{tripOrders.length}
                                          </td>
                                          <td className="p-1 border border-black text-center text-[10px] text-black font-bold">
                                            Sign
                                          </td>
                                        </tr>
                                      </tfoot>
                                    )}
                                  </table>
                                </div>
                              ) : (
                                /* When all bills were delivered on Page 1, show Consolidated Load Summary Bar on Page 2 */
                                <div className="border-2 border-black rounded-lg p-2.5 bg-slate-100 text-black">
                                  <div className="flex justify-between items-center text-xs font-black uppercase border-b border-black pb-1 mb-1.5">
                                    <span>Consolidated Load Totals ({tripOrders.length} Bills Delivered on Page 1)</span>
                                    <span className="font-mono text-sm font-black">Total: ₹{totalTripBill.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                    <div className="bg-white p-1.5 rounded border border-black">
                                      <span className="text-[9px] font-bold block text-slate-600 uppercase">Total Bills</span>
                                      <strong className="text-sm font-mono font-black">{tripOrders.length} Bills</strong>
                                    </div>
                                    <div className="bg-white p-1.5 rounded border border-black">
                                      <span className="text-[9px] font-bold block text-emerald-800 uppercase">Cash Amount</span>
                                      <strong className="text-sm font-mono font-black text-emerald-900">₹{liveCashTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                    </div>
                                    <div className="bg-white p-1.5 rounded border border-black">
                                      <span className="text-[9px] font-bold block text-blue-800 uppercase">Cheque Amount</span>
                                      <strong className="text-sm font-mono font-black text-blue-900">{liveChequeTotal > 0 ? `₹${liveChequeTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}</strong>
                                    </div>
                                    <div className="bg-white p-1.5 rounded border border-black">
                                      <span className="text-[9px] font-bold block text-amber-800 uppercase">Credit Amount</span>
                                      <strong className="text-sm font-mono font-black text-amber-900">₹{liveCreditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Final Page Content: Winomkar Totals Breakdown, SCODE & Beat Summaries, Four Signatures */}
                              {isLastPage && (
                                <>
                                  {/* Winomkar Totals Breakdown */}
                                  <div className="avoid-break border-2 border-black p-2 bg-slate-50 rounded-lg text-xs space-y-1 text-black">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between font-black border-b border-black pb-1 text-xs gap-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="uppercase text-black font-black">TOTALS:</span>
                                        <span className="font-mono text-sm text-black font-black">
                                          ₹{totalTripBill.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-[10px] text-black font-bold">
                                          (Boxes Loaded: <strong className="font-mono text-black font-black">{tripEditBoxesLoaded || totalTripCartons} Boxes</strong> | प्राप्त कुल हिसाब: <strong className="font-mono text-black font-black">₹{liveTotalRecd.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>)
                                        </span>
                                      </div>

                                      <div>
                                        {Math.abs(liveDifference) < 1 ? (
                                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-950 border border-emerald-400">
                                            ✅ हिसाब 100% बराबर (TALLIED)
                                          </span>
                                        ) : liveDifference < 0 ? (
                                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-950 border border-rose-400">
                                            ⚠️ रोकड़ शॉर्टेज: -₹{Math.abs(liveDifference).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-950 border border-blue-400">
                                            ℹ️ अतिरिक्त रोकड़: +₹{liveDifference.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-0.5 font-bold text-black text-[10px]">
                                      <div className="space-y-0.5 text-black bg-emerald-50/60 p-1 rounded border border-black">
                                        <div className="flex justify-between">
                                          <span className="font-bold">CASH BILLS :</span>
                                          <span className="font-mono font-black">{tripOrders.filter(o => (tripSheetEntries[o.orderNumber]?.cash ?? (o.billType !== 'CREDIT' ? o.totalBill : 0)) > 0).length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-bold">CASH AMT :</span>
                                          <span className="font-mono font-black">₹{liveCashTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                      </div>

                                      <div className="space-y-0.5 text-black bg-blue-50/60 p-1 rounded border border-black">
                                        <div className="flex justify-between">
                                          <span className="font-bold">CHEQUE BILLS :</span>
                                          <span className="font-mono font-black">{tripOrders.filter(o => (tripSheetEntries[o.orderNumber]?.chequeAmt ?? 0) > 0).length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-bold">CHEQUE AMT :</span>
                                          <span className="font-mono font-black">₹{liveChequeTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                      </div>

                                      <div className="space-y-0.5 text-black bg-amber-50/60 p-1 rounded border border-black">
                                        <div className="flex justify-between">
                                          <span className="font-bold">CREDIT BILLS :</span>
                                          <span className="font-mono font-black">{tripOrders.filter(o => (tripSheetEntries[o.orderNumber]?.credit ?? (o.billType === 'CREDIT' ? o.totalBill : 0)) > 0).length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-bold">CREDIT AMT :</span>
                                          <span className="font-mono font-black">₹{liveCreditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* SCODE & Beat Summaries */}
                                  {(tripSalesmanSummary.length > 0 || tripBeatSummary.length > 0) && (
                                    <div className="avoid-break grid grid-cols-1 md:grid-cols-2 gap-2 text-[9px] pt-0.5 text-black">
                                      {/* Table 1: Salesman Series Summary */}
                                      {tripSalesmanSummary.length > 0 && (
                                        <div className="border-2 border-black rounded-lg overflow-hidden">
                                          <div className="bg-slate-200 px-2 py-0.5 font-black text-black text-[9px] uppercase border-b-2 border-black">
                                            SCODE / SERIES BILL NOS SUMMARY
                                          </div>
                                          <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-100 text-[8.5px] font-black text-black border-b border-black">
                                              <tr>
                                                <th className="p-0.5 border border-black text-black font-black">SCODE</th>
                                                <th className="p-0.5 border border-black text-black font-black">SERIES BILL NOS</th>
                                                <th className="p-0.5 border border-black text-center w-10 text-black font-black">BILLS</th>
                                                <th className="p-0.5 border border-black text-right w-16 text-black font-black">AMT</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {tripSalesmanSummary.map((s, idx) => (
                                                <tr key={idx} className="border-b border-black text-black font-bold">
                                                  <td className="p-0.5 border border-black font-black text-black leading-tight">{s.scode}</td>
                                                  <td className="p-0.5 border border-black font-mono font-bold text-[8.5px] text-black">{s.seriesBillNos || s.series}</td>
                                                  <td className="p-0.5 border border-black text-center font-black text-black">{s.bills}</td>
                                                  <td className="p-0.5 border border-black text-right font-mono font-black text-black whitespace-nowrap">
                                                    {Number(s.amount ?? s.amt ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}

                                      {/* Table 2: Beat Wise Summary */}
                                      {tripBeatSummary.length > 0 && (
                                        <div className="border-2 border-black rounded-lg overflow-hidden">
                                          <div className="bg-slate-200 px-2 py-0.5 font-black text-black text-[9px] uppercase border-b-2 border-black">
                                            BEAT WISE SUMMARY:
                                          </div>
                                          <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-100 text-[8.5px] font-black text-black border-b border-black">
                                              <tr>
                                                <th className="p-0.5 border border-black text-black font-black">SCODE</th>
                                                <th className="p-0.5 border border-black text-black font-black">BEAT</th>
                                                <th className="p-0.5 border border-black text-black font-black">BEAT NAME</th>
                                                <th className="p-0.5 border border-black text-center w-10 text-black font-black">BILLS</th>
                                                <th className="p-0.5 border border-black text-right w-16 text-black font-black">AMT</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {tripBeatSummary.map((b, idx) => (
                                                <tr key={idx} className="border-b border-black text-black font-bold">
                                                  <td className="p-0.5 border border-black font-black text-black leading-tight">{b.scode}</td>
                                                  <td className="p-0.5 border border-black font-mono font-bold text-[8px] text-black">{b.beat}</td>
                                                  <td className="p-0.5 border border-black font-bold text-black text-[8.5px] leading-tight break-words">{b.beatName}</td>
                                                  <td className="p-0.5 border border-black text-center font-black text-black">{b.bills}</td>
                                                  <td className="p-0.5 border border-black text-right font-mono font-black text-black whitespace-nowrap">
                                                    {Number(b.amount ?? b.amt ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Four Signatures Undertaking Cards */}
                                  <div className="avoid-break mt-2 pt-2 border-t-2 border-black text-black">
                                    <div className="text-[9px] font-black uppercase tracking-wider text-center text-slate-800 mb-1.5">
                                      वाहन रवानगी व रोकड़ सुपुर्दगी अधिकार पत्र (TRIP DISPATCH & CREW UNDERTAKING)
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                      {/* Card 1: Loader */}
                                      <div className="border border-black rounded-lg p-1.5 bg-slate-50 flex flex-col justify-between" style={{ minHeight: '82px' }}>
                                        <div>
                                          <span className="block font-black text-black text-[10px] uppercase border-b border-black/30 pb-0.5">
                                            1. LOADER (LDR)
                                          </span>
                                          <div className="font-extrabold text-black text-[11px] mt-1 truncate" title={activeTripLoader}>
                                            {activeTripLoader}
                                          </div>
                                          <div className="text-slate-600 font-bold text-[8.5px] truncate">
                                            {tripEditLoaderLocation || 'Central Bay'}
                                          </div>
                                        </div>
                                        <div className="mt-1 pt-1 border-t border-dashed border-black">
                                          <span className="block text-[8px] font-bold text-slate-700">हस्ताक्षर (Verified)</span>
                                        </div>
                                      </div>

                                      {/* Card 2: Driver */}
                                      <div className="border border-black rounded-lg p-1.5 bg-slate-50 flex flex-col justify-between" style={{ minHeight: '82px' }}>
                                        <div>
                                          <span className="block font-black text-black text-[10px] uppercase border-b border-black/30 pb-0.5">
                                            2. DRIVER (चालक)
                                          </span>
                                          <div className="font-extrabold text-black text-[11px] mt-1 truncate" title={activeTripDriver}>
                                            {activeTripDriver}
                                          </div>
                                          <div className="text-slate-600 font-bold text-[8.5px] truncate">
                                            {tripEditDriverLocation || activeTripVan}
                                          </div>
                                        </div>
                                        <div className="mt-1 pt-1 border-t border-dashed border-black">
                                          <span className="block text-[8px] font-bold text-slate-700">हस्ताक्षर (Received)</span>
                                        </div>
                                      </div>

                                      {/* Card 3: Cashier */}
                                      <div className="border border-black rounded-lg p-1.5 bg-slate-50 flex flex-col justify-between" style={{ minHeight: '82px' }}>
                                        <div>
                                          <span className="block font-black text-black text-[10px] uppercase border-b border-black/30 pb-0.5">
                                            3. CASHIER (रोकड़िया)
                                          </span>
                                          <div className="font-extrabold text-black text-[11px] mt-1 truncate" title={activeTripCashier}>
                                            {activeTripCashier}
                                          </div>
                                          <div className="text-slate-600 font-bold text-[8.5px] truncate">
                                            {tripEditCashierLocation || 'Collection Counter'}
                                          </div>
                                        </div>
                                        <div className="mt-1 pt-1 border-t border-dashed border-black">
                                          <span className="block text-[8px] font-bold text-slate-700">हस्ताक्षर (Custody)</span>
                                        </div>
                                      </div>

                                      {/* Card 4: Dispatcher / Manager */}
                                      <div className="border border-black rounded-lg p-1.5 bg-slate-50 flex flex-col justify-between" style={{ minHeight: '82px' }}>
                                        <div>
                                          <span className="block font-black text-black text-[10px] uppercase border-b border-black/30 pb-0.5">
                                            4. MANAGER / ADMIN
                                          </span>
                                          <div className="font-extrabold text-black text-[11px] mt-1 truncate">
                                            VISTARAN HEALTH CARE
                                          </div>
                                          <div className="text-slate-600 font-bold text-[8.5px] truncate">
                                            Mumbai Hub 400079
                                          </div>
                                        </div>
                                        <div className="mt-1 pt-1 border-t border-dashed border-black">
                                          <span className="block text-[8px] font-bold text-slate-700">आधिकारिक स्वीकृति (Sign)</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Pinned Bottom Footer on Every Page */}
                            <div className="pt-2 mt-auto flex justify-between items-center text-[10px] font-bold text-black border-t-2 border-black">
                              <span>Report Generated: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              {!isLastPage && <span className="italic font-bold">...जारी (Continued on Page {pageIdx + 2} ➔)</span>}
                              <span className="font-mono font-black">Page {pageIdx + 1} of {totalPages} {isLastPage ? '(FINAL)' : ''}</span>
                            </div>
                          </div>

                          {/* Screen-only page break indicator if multiple pages */}
                          {!isLastPage && (
                            <div className="no-print my-4 flex items-center justify-center gap-3">
                              <div className="h-[1px] bg-slate-300 flex-1"></div>
                              <span className="px-3 py-1 bg-slate-100 border border-slate-300 text-slate-700 rounded-full text-xs font-bold shadow-sm">
                                📄 Page {pageIdx + 2} of {totalPages} (अगला पेज नीचे है)
                              </span>
                              <div className="h-[1px] bg-slate-300 flex-1"></div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
              </div>
            );
            })()}
          </div>
        </div>
      )}

      {/* EVENING TRIP SETTLEMENT & CASH RECONCILIATION MODAL (दूसरा फ़ॉर्म - शाम की वैन वापसी व रोकड़ मिलान) */}
      {isEveningSettlementModalOpen && (
        <div id="evening-settlement-modal-backdrop" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          {/* Modal Container */}
          <div className="bg-slate-50 w-full max-w-5xl rounded-2xl shadow-2xl p-4 sm:p-6 space-y-5 max-h-[95vh] overflow-y-auto border border-slate-200">
            {/* Header */}
            {(() => {
              const tripOrders = (() => {
                const currentLoad = (selectedTripLoadNo && selectedTripLoadNo !== 'ALL') ? selectedTripLoadNo : (availableLoadNumbers[0] || '193');
                let matched = orders.filter(o => {
                  const matchLoad = String(o.loadNumber || '').trim() === String(currentLoad).trim();
                  const matchVeh = selectedTripVehicle === 'ALL' || (o.vehicleNumber || 'MH 02 EK 4589') === selectedTripVehicle;
                  return matchLoad && matchVeh;
                });
                if (matched.length === 0 && importedEveningOrders.length > 0) {
                  matched = importedEveningOrders.filter(o => {
                    const matchLoad = String(o.loadNumber || '').trim() === String(currentLoad).trim();
                    const matchVeh = selectedTripVehicle === 'ALL' || (o.vehicleNumber || 'MH 02 EK 4589') === selectedTripVehicle;
                    return matchLoad && matchVeh;
                  });
                  if (matched.length === 0) {
                    matched = importedEveningOrders.filter(o => String(o.loadNumber || '').trim() === String(currentLoad).trim());
                  }
                }
                return matched;
              })();

              const totalTripBill = tripOrders.reduce((s, o) => s + (o.totalBill || 0), 0);
              const totalTripCartons = tripOrders.reduce((s, o) => s + (o.totalCartons || 0), 0);
              const totalTripCashExpected = tripOrders.filter(o => o.billType !== 'CREDIT').reduce((s, o) => s + (o.totalBill || 0), 0);
              const totalTripCreditExpected = tripOrders.filter(o => o.billType === 'CREDIT').reduce((s, o) => s + (o.totalBill || 0), 0);

              const totalChequesAmount = chequesList.reduce((s, c) => s + (Number(c.amount) || 0), 0);
              const totalUpiAmount = upisList.reduce((s, u) => s + (Number(u.amount) || 0), 0);
              const totalReturnsAmount = returnsList.reduce((s, r) => s + (Number(r.amount) || 0), 0) + (Number(settlementReturnAmount) || 0);

              const cashAmt = Number(settlementActualCash) || 0;
              const creditAmt = Number(settlementCreditAllowed) || 0;
              const totalAccounted = cashAmt + totalChequesAmount + totalUpiAmount + creditAmt + totalReturnsAmount;
              const difference = totalAccounted - totalTripBill;

              const totalBoxesDispatched = Number(tripEditBoxesLoaded) || totalTripCartons;
              const boxesDelivered = Number(settlementBoxesDelivered) || 0;
              const boxesReturned = Number(settlementBoxesReturned) || 0;
              const boxesDiff = totalBoxesDispatched - (boxesDelivered + boxesReturned);

              return (
                <div className="space-y-4">
                  {/* Modal Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase mb-1">
                        <i className="fa-solid fa-moon text-emerald-700"></i> 🌆 स्टेप 2: शाम की प्रक्रिया — वैन वापसी, रोकड़, चेक, UPI व वापसी माल मिलान
                      </div>
                      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        Evening Van Return & Cash Settlement (शाम की वैन वापसी व रोकड़ मिलान)
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-0.5">
                        <span>Van: <strong className="font-mono text-cadbury-900 font-black">{tripEditVan}</strong></span>
                        <span>| Boxes: <strong className="font-mono text-indigo-900 font-black">{tripEditBoxesLoaded || '54'}</strong></span>
                        <span>| Driver: <strong>{tripEditDriver}</strong> ({tripEditDriverLocation})</span>
                        <span>| Loader: <strong>{tripEditLoader}</strong> ({tripEditLoaderLocation})</span>
                        <span>| Cashier: <strong>{tripEditCashier}</strong> ({tripEditCashierLocation})</span>
                        <button
                          type="button"
                          onClick={() => setIsEveningCrewEditorOpen(prev => !prev)}
                          className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded font-bold text-[10px] inline-flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                          title="शाम के इस लोड के लिए वैन, ड्राइवर, लोडर या कैशियर बदलें"
                        >
                          <i className="fa-solid fa-user-pen text-purple-700"></i>
                          <span>{isEveningCrewEditorOpen ? '▲ Hide Editor' : '✏️ वैन / स्टाफ बदलें (Change Staff)'}</span>
                        </button>
                      </div>
                    </div>

                    {isEveningCrewEditorOpen && (
                      <div className="p-3 bg-gradient-to-r from-amber-50 via-purple-50 to-indigo-50 border border-purple-300 rounded-xl shadow-sm space-y-2.5">
                        <div className="flex items-center justify-between border-b border-purple-200 pb-1.5">
                          <span className="text-xs font-black text-cadbury-950 flex items-center gap-1.5">
                            <i className="fa-solid fa-truck text-cadbury-700"></i>
                            शाम के लोड #{selectedTripLoadNo !== 'ALL' ? selectedTripLoadNo : (availableLoadNumbers[0] || '193')} हेतु गाड़ी व स्टाफ चयन
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsCrewMasterModalOpen(true)}
                            className="text-[10px] font-bold text-cadbury-700 hover:underline flex items-center gap-1"
                          >
                            <i className="fa-solid fa-users-gear"></i> मास्टर लिस्ट खोलें
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                          {/* Van */}
                          <div className="bg-white p-2 rounded-lg border border-purple-200">
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Van No. (V1 to V6)</label>
                            <div className="flex flex-wrap gap-1 mb-1">
                              {crewMaster.vans.slice(0, 6).map(v => (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => setTripEditVan(v.name)}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                    tripEditVan.toUpperCase() === v.name.toUpperCase()
                                      ? 'bg-cadbury-900 text-white'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {v.name}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={tripEditVan}
                              onChange={(e) => setTripEditVan(e.target.value.toUpperCase())}
                              className="w-full px-2 py-0.5 border border-purple-300 rounded text-xs font-mono font-bold"
                            />
                          </div>

                          {/* Boxes */}
                          <div className="bg-white p-2 rounded-lg border border-indigo-200">
                            <label className="text-[10px] font-bold text-indigo-900 block mb-0.5">Boxes Loaded</label>
                            <input
                              type="number"
                              value={tripEditBoxesLoaded}
                              onChange={(e) => setTripEditBoxesLoaded(e.target.value)}
                              className="w-full px-2 py-1 border border-indigo-300 rounded text-xs font-mono font-bold text-indigo-950"
                            />
                            <span className="text-[9px] text-slate-500 mt-0.5 block">डिफ़ॉल्ट: {tripEditBoxesLoaded || '54'} Bx</span>
                          </div>

                          {/* Driver */}
                          <div className="bg-white p-2 rounded-lg border border-blue-200">
                            <label className="text-[10px] font-bold text-blue-900 block mb-0.5">Driver & Beat</label>
                            <select
                              onChange={(e) => {
                                const found = crewMaster.drivers.find(d => d.name === e.target.value);
                                if (found) {
                                  setTripEditDriver(found.name);
                                  if (found.beat) setTripEditDriverLocation(found.beat);
                                }
                              }}
                              className="w-full px-1.5 py-0.5 mb-1 border border-blue-300 rounded text-[10px] font-bold bg-blue-50 text-blue-950"
                            >
                              <option value="">-- ड्राइवर चुनें --</option>
                              {crewMaster.drivers.map(d => (
                                <option key={d.id} value={d.name}>{d.name} {d.beat ? `(${d.beat})` : ''}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={tripEditDriver}
                              onChange={(e) => setTripEditDriver(e.target.value)}
                              className="w-full px-2 py-0.5 border border-blue-300 rounded text-xs font-bold mb-0.5"
                            />
                            <input
                              type="text"
                              value={tripEditDriverLocation}
                              onChange={(e) => setTripEditDriverLocation(e.target.value)}
                              placeholder="Beat / Route"
                              className="w-full px-1.5 py-0.5 border border-blue-200 rounded text-[9px] text-slate-600"
                            />
                          </div>

                          {/* Loader */}
                          <div className="bg-white p-2 rounded-lg border border-purple-200">
                            <label className="text-[10px] font-bold text-purple-900 block mb-0.5">Loader & Bay</label>
                            <select
                              onChange={(e) => {
                                const found = crewMaster.loaders.find(l => l.name === e.target.value);
                                if (found) {
                                  setTripEditLoader(found.name);
                                  if (found.bay) setTripEditLoaderLocation(found.bay);
                                }
                              }}
                              className="w-full px-1.5 py-0.5 mb-1 border border-purple-300 rounded text-[10px] font-bold bg-purple-50 text-purple-950"
                            >
                              <option value="">-- लोडर चुनें --</option>
                              {crewMaster.loaders.map(l => (
                                <option key={l.id} value={l.name}>{l.name} {l.bay ? `(${l.bay})` : ''}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={tripEditLoader}
                              onChange={(e) => setTripEditLoader(e.target.value)}
                              className="w-full px-2 py-0.5 border border-purple-300 rounded text-xs font-bold mb-0.5"
                            />
                            <input
                              type="text"
                              value={tripEditLoaderLocation}
                              onChange={(e) => setTripEditLoaderLocation(e.target.value)}
                              placeholder="Bay / Dock"
                              className="w-full px-1.5 py-0.5 border border-purple-200 rounded text-[9px] text-slate-600"
                            />
                          </div>

                          {/* Cashier */}
                          <div className="bg-white p-2 rounded-lg border border-emerald-200">
                            <label className="text-[10px] font-bold text-emerald-900 block mb-0.5">Cashier & Counter</label>
                            <select
                              onChange={(e) => {
                                const found = crewMaster.cashiers.find(c => c.name === e.target.value);
                                if (found) {
                                  setTripEditCashier(found.name);
                                  if (found.location) setTripEditCashierLocation(found.location);
                                }
                              }}
                              className="w-full px-1.5 py-0.5 mb-1 border border-emerald-300 rounded text-[10px] font-bold bg-emerald-50 text-emerald-950"
                            >
                              <option value="">-- कैशियर चुनें --</option>
                              {crewMaster.cashiers.map(c => (
                                <option key={c.id} value={c.name}>{c.name} {c.location ? `(${c.location})` : ''}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={tripEditCashier}
                              onChange={(e) => setTripEditCashier(e.target.value)}
                              className="w-full px-2 py-0.5 border border-emerald-300 rounded text-xs font-bold mb-0.5"
                            />
                            <input
                              type="text"
                              value={tripEditCashierLocation}
                              onChange={(e) => setTripEditCashierLocation(e.target.value)}
                              placeholder="Counter Location"
                              className="w-full px-1.5 py-0.5 border border-emerald-200 rounded text-[9px] text-slate-600"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-500 italic">प्रिंटआउट व सेटलमेंट वाउचर पर यही वैन व स्टाफ दर्ज होगा।</span>
                          <button
                            type="button"
                            onClick={() => {
                              handleSaveTripCrew();
                              setIsEveningCrewEditorOpen(false);
                            }}
                            className="px-3 py-1 bg-cadbury-900 hover:bg-cadbury-950 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1 active:scale-95"
                          >
                            <i className="fa-solid fa-floppy-disk text-gold-400"></i>
                            <span>💾 Apply & Update Bills (लागू करें)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Direct Bridge to Morning Trip Loading Sheet */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsEveningSettlementModalOpen(false);
                          syncTripParameters();
                          setIsTripSheetModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-indigo-700 to-cadbury-800 hover:from-indigo-800 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                        title="सुबह का लोडिंग व डिस्पैच चालान देखने या प्रिंट करने हेतु Step 1 खोलें"
                      >
                        <i className="fa-solid fa-truck-ramp-box text-amber-300"></i>
                        <span>🌞 Step 1: Morning Sheet (सुबह का चालान) ⬅️</span>
                      </button>

                      {/* Dynamic Load dropdown - Isolated by Load No */}
                      <select
                        value={selectedTripLoadNo !== 'ALL' ? selectedTripLoadNo : (availableLoadNumbers[0] || '193')}
                        onChange={(e) => handleOpenEveningSettlement(e.target.value, selectedTripVehicle)}
                        className="px-2.5 py-1.5 border-2 border-emerald-500 rounded-xl text-xs font-mono font-black bg-emerald-50 text-emerald-950 shadow-sm"
                        title="लोड नंबर चुनें - हर लोड का सेटलमेंट अलग है"
                      >
                        {availableLoadNumbers.map(lNo => {
                          const count = orders.filter(o => String(o.loadNumber || '').trim() === lNo).length;
                          return (
                            <option key={lNo} value={lNo}>
                              🚚 Load #{lNo} ({count} Bills)
                            </option>
                          );
                        })}
                      </select>

                      {/* Delete Current Load Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteLoadModal(selectedTripLoadNo !== 'ALL' ? selectedTripLoadNo : availableLoadNumbers[0])}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                        title={`Load #${selectedTripLoadNo} और इसके सभी बिल्स डिलीट करें`}
                      >
                        <i className="fa-solid fa-trash-can text-rose-600"></i>
                        <span>Delete Load #{selectedTripLoadNo !== 'ALL' ? selectedTripLoadNo : (availableLoadNumbers[0] || '193')}</span>
                      </button>

                      {/* Hidden File Input for Evening Settlement Excel/CSV Import */}
                      <input
                        type="file"
                        ref={eveningImportInputRef}
                        onChange={handleImportEveningSettlement}
                        accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.tsv"
                        className="hidden"
                      />

                      {/* Import Evening Settlement Excel / CSV */}
                      <button
                        type="button"
                        onClick={() => eveningImportInputRef.current?.click()}
                        className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95"
                        title="भरी हुई Excel/CSV शीट से रोकड़, चेक व डिलीवरी स्टेटस ऑटोमैटिक इम्पोर्ट करें"
                      >
                        <i className="fa-solid fa-file-import text-blue-200"></i>
                        <span>📥 Import Evening Sheet (शाम की रोकड़ शीट)</span>
                      </button>

                      {/* Cash Deposit Envelope Slip (लिफाफा रसीद) */}
                      <button
                        type="button"
                        onClick={() => {
                          handleAutoBreakdownDenominations();
                          setIsEnvelopeSlipModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-800 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 animate-pulse"
                        title="बैंक / कैशियर लिफाफे पर चिपकाने हेतु रोकड़ जमा रसीद (Envelope Slip)"
                      >
                        <i className="fa-solid fa-envelope-open-text text-amber-200"></i>
                        <span>✉️ Cash Envelope Slip (लिफाफा रसीद)</span>
                      </button>

                      {/* Export Evening Settlement to Excel (.xlsx) */}
                      <button
                        type="button"
                        onClick={() => handleExportEveningSettlementExcel()}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95"
                        title="शाम का सेटलमेंट Excel स्प्रेडशीट (.xlsx) में डाउनलोड करें"
                      >
                        <i className="fa-solid fa-file-excel text-emerald-300"></i> Excel (.xlsx)
                      </button>

                      {/* Export Evening Settlement to CSV (.csv) */}
                      <button
                        type="button"
                        onClick={() => handleExportEveningSettlementCSV()}
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95"
                        title="शाम का सेटलमेंट CSV फ़ाइल (.csv) में डाउनलोड करें"
                      >
                        <i className="fa-solid fa-file-csv text-teal-300"></i> CSV (.csv)
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadEveningSettlementPDF}
                        disabled={isDownloadingSettlementPdf}
                        className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <i className={`fa-solid ${isDownloadingSettlementPdf ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
                        {isDownloadingSettlementPdf ? 'PDF...' : '📥 PDF Download'}
                      </button>

                      <button
                        type="button"
                        onClick={handlePrintEveningSettlement}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95"
                      >
                        <i className="fa-solid fa-print text-gold-400"></i> 🖨️ Print Settlement
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEveningSettlementModalOpen(false)}
                        className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center font-bold"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  </div>

                  {/* INDEPENDENT LOAD NUMBERS TAB BAR (हर लोड नंबर का अलग सेटलमेंट) */}
                  <div className="bg-gradient-to-r from-slate-100 to-indigo-50/70 p-3 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <i className="fa-solid fa-layer-group text-emerald-700"></i>
                        लोड अनुसार अलग-अलग सेटलमेंट (Select Load Number - Separate Settlement):
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        (प्रत्येक लोड नंबर का रोकड़ व डिलीवरी हिसाब 100% अलग-अलग रहेगा)
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {availableLoadNumbers.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">कोई लोड नंबर उपलब्ध नहीं है।</span>
                      ) : (
                        availableLoadNumbers.map(lNo => {
                          const loadOrders = orders.filter(o => String(o.loadNumber || '').trim() === lNo);
                          const totalVal = loadOrders.reduce((s, o) => s + (o.totalBill || 0), 0);
                          const isSelected = String(selectedTripLoadNo).trim() === lNo;
                          const isSettled = pastSettlements.some(s => String(s.loadNumber || '').trim() === lNo);

                          return (
                            <button
                              key={lNo}
                              type="button"
                              onClick={() => handleOpenEveningSettlement(lNo, selectedTripVehicle)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                                isSelected
                                  ? 'bg-gradient-to-r from-emerald-800 to-cadbury-900 text-white ring-2 ring-emerald-500 font-black shadow-md'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                              }`}
                            >
                              <i className={`fa-solid fa-truck ${isSelected ? 'text-gold-400' : 'text-slate-400'}`}></i>
                              <span>Load #{lNo}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {loadOrders.length} Bills
                              </span>
                              <span className="font-mono text-[11px]">
                                ₹{totalVal.toLocaleString('en-IN')}
                              </span>
                              {isSettled ? (
                                <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-black">
                                  ✅ Settled
                                </span>
                              ) : (
                                <span className="text-[9px] bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded font-black">
                                  ⏳ Pending
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Tabs: Entry vs History */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      type="button"
                      onClick={() => setShowPastSettlementsTab(false)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                        !showPastSettlementsTab
                          ? 'bg-cadbury-900 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <i className="fa-solid fa-receipt text-gold-400"></i> शाम का नया रोकड़ मिलान (Active Settlement)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPastSettlementsTab(true)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                        showPastSettlementsTab
                          ? 'bg-cadbury-900 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <i className="fa-solid fa-clock-rotate-left"></i> पिछले सुरक्षित सेटलमेंट्स ({pastSettlements.length})
                    </button>
                  </div>

                  {/* Notification banner on save */}
                  {settlementSavedSuccess && (
                    <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 font-bold text-xs flex items-center gap-2 animate-bounce">
                      <i className="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
                      {settlementSavedSuccess}
                    </div>
                  )}

                  {showPastSettlementsTab ? (
                    /* PAST SETTLEMENTS TAB */
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                      <h3 className="font-bold text-slate-800 text-sm">सुरक्षित शाम के सेटलमेंट रिकॉर्ड्स (Past Settlements)</h3>
                      {pastSettlements.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs italic">
                          Abhi tak koi evening settlement save nahi kiya gaya hai. "Active Settlement" tab me details bhar kar "Save Evening Settlement" karein.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse border border-slate-200">
                            <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
                              <tr>
                                <th className="p-2 border border-slate-200">Settlement #</th>
                                <th className="p-2 border border-slate-200">Date & Time</th>
                                <th className="p-2 border border-slate-200">Load / Van</th>
                                <th className="p-2 border border-slate-200">Driver / Cashier</th>
                                <th className="p-2 border border-slate-200 text-right">Dispatched</th>
                                <th className="p-2 border border-slate-200 text-right">Accounted</th>
                                <th className="p-2 border border-slate-200 text-center">Shortage / Excess</th>
                                <th className="p-2 border border-slate-200 text-center">Status</th>
                                <th className="p-2 border border-slate-200 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pastSettlements.map((st, idx) => (
                                <tr key={st.id || idx} className="hover:bg-slate-50 border-b border-slate-200">
                                  <td className="p-2 border border-slate-200 font-mono font-bold text-cadbury-900">{st.settlementNumber}</td>
                                  <td className="p-2 border border-slate-200 text-[10px] text-slate-600">{new Date(st.timestamp).toLocaleString('en-IN')}</td>
                                  <td className="p-2 border border-slate-200 font-mono font-bold text-emerald-900">Load #{st.loadNumber} ({st.vanNumber})</td>
                                  <td className="p-2 border border-slate-200">{st.driverName} / {st.cashierName}</td>
                                  <td className="p-2 border border-slate-200 text-right font-mono font-bold">₹{Number(st.totalTripDispatched || 0).toLocaleString('en-IN')}</td>
                                  <td className="p-2 border border-slate-200 text-right font-mono font-bold text-emerald-800">₹{Number(st.totalAccounted || 0).toLocaleString('en-IN')}</td>
                                  <td className="p-2 border border-slate-200 text-center font-bold">
                                    {Math.abs(Number(st.shortageOrExcess || 0)) < 1 ? (
                                      <span className="text-emerald-700">✅ Tallied</span>
                                    ) : Number(st.shortageOrExcess || 0) < 0 ? (
                                      <span className="text-rose-700 font-mono">Shortage: -₹{Math.abs(Number(st.shortageOrExcess))}</span>
                                    ) : (
                                      <span className="text-blue-700 font-mono">Excess: +₹{Number(st.shortageOrExcess)}</span>
                                    )}
                                  </td>
                                  <td className="p-2 border border-slate-200 text-center">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      {st.status || 'Verified'}
                                    </span>
                                  </td>
                                  <td className="p-2 border border-slate-200 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSettlementRecord(st)}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm"
                                      title="यह सुरक्षित सेटलमेंट रिकॉर्ड डिलीट करें"
                                    >
                                      <i className="fa-solid fa-trash-can text-rose-600 text-[10px]"></i>
                                      <span>Delete</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ACTIVE SETTLEMENT ENTRY VIEW */
                    <div className="space-y-4">
                      {/* Top Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">1. Total Dispatched Value</span>
                          <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
                            ₹{totalTripBill.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] text-slate-500">{tripOrders.length} Bills in Load #{selectedTripLoadNo}</span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-indigo-200 bg-indigo-50/30 shadow-sm">
                          <span className="text-[10px] font-bold text-indigo-700 uppercase block">2. Total Boxes Loaded</span>
                          <div className="text-base sm:text-lg font-black text-indigo-950 font-mono">
                            {totalBoxesDispatched} Boxes
                          </div>
                          <span className="text-[10px] text-indigo-600">Van: {tripEditVan}</span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase block">3. Expected Cash Bills</span>
                          <div className="text-base sm:text-lg font-black text-emerald-950 font-mono">
                            ₹{totalTripCashExpected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] text-emerald-600">{tripOrders.filter(o => o.billType !== 'CREDIT').length} Cash Bills</span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">
                          <span className="text-[10px] font-bold text-amber-700 uppercase block">4. Expected Credit Bills</span>
                          <div className="text-base sm:text-lg font-black text-amber-950 font-mono">
                            ₹{totalTripCreditExpected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] text-amber-600">{tripOrders.filter(o => o.billType === 'CREDIT').length} Credit Bills</span>
                        </div>
                      </div>

                      {/* 5 Entry Sections (Grid of Collections) */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* 1. Cash Collected */}
                        <div className="lg:col-span-4 p-4 bg-white rounded-xl border border-emerald-200 shadow-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                            <h3 className="font-bold text-xs text-emerald-950 uppercase flex items-center gap-1.5">
                              <i className="fa-solid fa-money-bill-wave text-emerald-600"></i> 1. रोकड़ (Cash Collected)
                            </h3>
                            <button
                              type="button"
                              onClick={() => setSettlementActualCash(String(totalTripCashExpected))}
                              className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-semibold"
                            >
                              Auto-Fill Expected
                            </button>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">कुल नकद रकम (₹)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                              <input
                                type="number"
                                value={settlementActualCash}
                                onChange={(e) => setSettlementActualCash(e.target.value)}
                                placeholder="0"
                                className="w-full pl-7 pr-3 py-2 border border-emerald-300 rounded-xl font-mono font-black text-base text-emerald-950 focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20"
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1 block">कैशियर द्वारा डिस्ट्रीब्यूटर काउंटर पर जमा रोकड़</span>
                          </div>
                        </div>

                        {/* 2. Credit Allowed */}
                        <div className="lg:col-span-4 p-4 bg-white rounded-xl border border-amber-200 shadow-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                            <h3 className="font-bold text-xs text-amber-950 uppercase flex items-center gap-1.5">
                              <i className="fa-solid fa-file-invoice text-amber-600"></i> 2. स्वीकृत उधारी (Credit Allowed)
                            </h3>
                            <button
                              type="button"
                              onClick={() => setSettlementCreditAllowed(String(totalTripCreditExpected))}
                              className="text-[10px] text-amber-700 hover:text-amber-900 underline font-semibold"
                            >
                              Auto-Fill Expected
                            </button>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">स्वीकृत उधारी रकम (₹)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                              <input
                                type="number"
                                value={settlementCreditAllowed}
                                onChange={(e) => setSettlementCreditAllowed(e.target.value)}
                                placeholder="0"
                                className="w-full pl-7 pr-3 py-2 border border-amber-300 rounded-xl font-mono font-black text-base text-amber-950 focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1 block">क्रेडिट पार्टी बिल जो खाते में दर्ज हुए</span>
                          </div>
                        </div>

                        {/* 3. Boxes Delivered & Returned */}
                        <div className="lg:col-span-4 p-4 bg-white rounded-xl border border-indigo-200 shadow-sm space-y-2">
                          <h3 className="font-bold text-xs text-indigo-950 uppercase flex items-center gap-1.5 border-b border-indigo-100 pb-2">
                            <i className="fa-solid fa-boxes-stacked text-indigo-600"></i> 3. बॉक्स गिनती (Boxes Tally)
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">वितरित बॉक्स</label>
                              <input
                                type="number"
                                value={settlementBoxesDelivered}
                                onChange={(e) => setSettlementBoxesDelivered(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-indigo-300 rounded-lg font-mono font-bold text-xs bg-indigo-50/20"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">वापस बॉक्स</label>
                              <input
                                type="number"
                                value={settlementBoxesReturned}
                                onChange={(e) => setSettlementBoxesReturned(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-rose-300 rounded-lg font-mono font-bold text-xs bg-rose-50/20 text-rose-950"
                              />
                            </div>
                          </div>
                          <div className="text-[10px] font-bold flex justify-between pt-1">
                            <span>लोड: {totalBoxesDispatched}</span>
                            <span className={boxesDiff === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {boxesDiff === 0 ? '✅ Boxes Ok' : `⚠️ अंतर: ${boxesDiff} Box`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cheques & UPI Entry Row */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Cheques Entry Box */}
                        <div className="p-4 bg-white rounded-xl border border-blue-200 shadow-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                            <h3 className="font-bold text-xs text-blue-950 uppercase flex items-center gap-1.5">
                              <i className="fa-solid fa-money-check text-blue-600"></i> 4. चेक संग्रह (Cheques: ₹{totalChequesAmount.toLocaleString('en-IN')})
                            </h3>
                            <span className="text-[10px] text-blue-700 font-bold">{chequesList.length} Cheques</span>
                          </div>

                          {/* Add Cheque Form */}
                          <div className="grid grid-cols-4 gap-2 text-xs bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                            <div>
                              <input
                                type="text"
                                placeholder="Cheque No"
                                value={newChequeInput.chequeNo}
                                onChange={(e) => setNewChequeInput({ ...newChequeInput, chequeNo: e.target.value })}
                                className="w-full p-1.5 border border-blue-300 rounded-lg font-mono text-[11px]"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="Bank (e.g. HDFC)"
                                value={newChequeInput.bankName}
                                onChange={(e) => setNewChequeInput({ ...newChequeInput, bankName: e.target.value })}
                                className="w-full p-1.5 border border-blue-300 rounded-lg text-[11px]"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="Party Name"
                                value={newChequeInput.partyName}
                                onChange={(e) => setNewChequeInput({ ...newChequeInput, partyName: e.target.value })}
                                className="w-full p-1.5 border border-blue-300 rounded-lg text-[11px]"
                              />
                            </div>
                            <div className="flex gap-1.5">
                              <input
                                type="number"
                                placeholder="Amount (₹)"
                                value={newChequeInput.amount}
                                onChange={(e) => setNewChequeInput({ ...newChequeInput, amount: e.target.value })}
                                className="w-full p-1.5 border border-blue-300 rounded-lg font-mono text-[11px]"
                              />
                              <button
                                type="button"
                                onClick={handleAddCheque}
                                className="px-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs"
                                title="Add Cheque"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Cheques List */}
                          {chequesList.length > 0 && (
                            <div className="max-h-28 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg text-xs">
                              {chequesList.map(c => (
                                <div key={c.id} className="p-2 flex items-center justify-between hover:bg-slate-50">
                                  <div>
                                    <strong className="font-mono text-blue-900">#{c.chequeNo}</strong> - {c.bankName} ({c.partyName})
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-800">₹{Number(c.amount).toLocaleString('en-IN')}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCheque(c.id)}
                                      className="text-rose-500 hover:text-rose-700 text-xs"
                                    >
                                      <i className="fa-solid fa-trash-can"></i>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* UPI / QR Payments Entry Box */}
                        <div className="p-4 bg-white rounded-xl border border-teal-200 shadow-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                            <h3 className="font-bold text-xs text-teal-950 uppercase flex items-center gap-1.5">
                              <i className="fa-solid fa-qrcode text-teal-600"></i> 5. डिजिटल भुगतान (UPI / QR: ₹{totalUpiAmount.toLocaleString('en-IN')})
                            </h3>
                            <span className="text-[10px] text-teal-700 font-bold">{upisList.length} UPIs</span>
                          </div>

                          {/* Add UPI Form */}
                          <div className="grid grid-cols-3 gap-2 text-xs bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
                            <div>
                              <input
                                type="text"
                                placeholder="UPI Ref / UTR No"
                                value={newUpiInput.upiRef}
                                onChange={(e) => setNewUpiInput({ ...newUpiInput, upiRef: e.target.value })}
                                className="w-full p-1.5 border border-teal-300 rounded-lg font-mono text-[11px]"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="Party Name"
                                value={newUpiInput.partyName}
                                onChange={(e) => setNewUpiInput({ ...newUpiInput, partyName: e.target.value })}
                                className="w-full p-1.5 border border-teal-300 rounded-lg text-[11px]"
                              />
                            </div>
                            <div className="flex gap-1.5">
                              <input
                                type="number"
                                placeholder="Amount (₹)"
                                value={newUpiInput.amount}
                                onChange={(e) => setNewUpiInput({ ...newUpiInput, amount: e.target.value })}
                                className="w-full p-1.5 border border-teal-300 rounded-lg font-mono text-[11px]"
                              />
                              <button
                                type="button"
                                onClick={handleAddUpi}
                                className="px-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs"
                                title="Add UPI"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* UPIs List */}
                          {upisList.length > 0 && (
                            <div className="max-h-28 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg text-xs">
                              {upisList.map(u => (
                                <div key={u.id} className="p-2 flex items-center justify-between hover:bg-slate-50">
                                  <div>
                                    <strong className="font-mono text-teal-900">{u.upiRef}</strong> - {u.partyName}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-800">₹{Number(u.amount).toLocaleString('en-IN')}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveUpi(u.id)}
                                      className="text-rose-500 hover:text-rose-700 text-xs"
                                    >
                                      <i className="fa-solid fa-trash-can"></i>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Returns & Damaged Entry Box */}
                      <div className="p-4 bg-white rounded-xl border border-rose-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                          <h3 className="font-bold text-xs text-rose-950 uppercase flex items-center gap-1.5">
                            <i className="fa-solid fa-box-open text-rose-600"></i> 6. वापसी माल / दुकान बंद (Returns & Credit Notes: ₹{totalReturnsAmount.toLocaleString('en-IN')})
                          </h3>
                          <span className="text-[10px] text-rose-700 font-bold">{returnsList.length} Returns</span>
                        </div>

                        {/* Add Return Form */}
                        <div className="grid grid-cols-4 gap-2 text-xs bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
                          <div>
                            <input
                              type="text"
                              placeholder="Party Name"
                              value={newReturnInput.partyName}
                              onChange={(e) => setNewReturnInput({ ...newReturnInput, partyName: e.target.value })}
                              className="w-full p-1.5 border border-rose-300 rounded-lg text-[11px]"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              placeholder="Cartons"
                              value={newReturnInput.cartons}
                              onChange={(e) => setNewReturnInput({ ...newReturnInput, cartons: e.target.value })}
                              className="w-full p-1.5 border border-rose-300 rounded-lg font-mono text-[11px]"
                            />
                          </div>
                          <div>
                            <select
                              value={newReturnInput.reason}
                              onChange={(e) => setNewReturnInput({ ...newReturnInput, reason: e.target.value })}
                              className="w-full p-1.5 border border-rose-300 rounded-lg text-[11px] bg-white"
                            >
                              <option value="Party Shop Closed">Party Shop Closed (दुकान बंद)</option>
                              <option value="Damaged in Transit">Damaged in Transit (डैमेज माल)</option>
                              <option value="Order Rejected / Cancelled">Order Cancelled (मना किया)</option>
                              <option value="Near Expiry Exchange">Near Expiry Exchange (एक्सपायरी)</option>
                            </select>
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              placeholder="Amount (₹)"
                              value={newReturnInput.amount}
                              onChange={(e) => setNewReturnInput({ ...newReturnInput, amount: e.target.value })}
                              className="w-full p-1.5 border border-rose-300 rounded-lg font-mono text-[11px]"
                            />
                            <button
                              type="button"
                              onClick={handleAddReturn}
                              className="px-3 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs"
                              title="Add Return"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Returns List */}
                        {returnsList.length > 0 && (
                          <div className="max-h-28 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg text-xs">
                            {returnsList.map(r => (
                              <div key={r.id} className="p-2 flex items-center justify-between hover:bg-slate-50">
                                <div>
                                  <strong className="text-rose-900">{r.partyName}</strong> - {r.cartons} Box ({r.reason})
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-rose-800">₹{Number(r.amount).toLocaleString('en-IN')}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveReturn(r.id)}
                                    className="text-rose-500 hover:text-rose-700 text-xs"
                                  >
                                    <i className="fa-solid fa-trash-can"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* LIVE RECONCILIATION SUMMARY CARD (HISAAB TALLY) */}
                      <div className={`p-4 rounded-2xl border-2 shadow-md transition-all ${
                        Math.abs(difference) < 1
                          ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-emerald-400'
                          : difference < 0
                          ? 'bg-gradient-to-r from-rose-50 via-amber-50 to-red-50 border-rose-400'
                          : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 border-blue-400'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                              रोकड़ व डिलीवरी हिसाब मिलान (Cash & Return Reconciliation)
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                                कुल हिसाब: ₹{totalAccounted.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-xs text-slate-500 font-bold">
                                / ₹{totalTripBill.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dispatched
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              रोकड़: ₹{cashAmt.toLocaleString('en-IN')} | चेक: ₹{totalChequesAmount.toLocaleString('en-IN')} | UPI: ₹{totalUpiAmount.toLocaleString('en-IN')} | उधारी: ₹{creditAmt.toLocaleString('en-IN')} | वापसी: ₹{totalReturnsAmount.toLocaleString('en-IN')}
                            </div>
                          </div>

                          <div className="text-right">
                            {Math.abs(difference) < 1 ? (
                              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-md">
                                <i className="fa-solid fa-circle-check"></i> हिसाब 100% बराबर (TALLIED)
                              </div>
                            ) : difference < 0 ? (
                              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white font-black text-xs shadow-md animate-pulse">
                                <i className="fa-solid fa-triangle-exclamation"></i> शॉर्टेज (SHORTAGE): -₹{Math.abs(difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-xs shadow-md">
                                <i className="fa-solid fa-circle-plus"></i> अतिरिक्त रोकड़ (EXCESS): +₹{difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-500 mt-1">
                              {Math.abs(difference) < 1 ? 'रोकड़ व माल पूरा मिल गया - कोई अंतर नहीं' : 'ड्राइवर व कैशियर से तुरंत हिसाब कन्फर्म करें'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BILL-BY-BILL DELIVERY STATUS TABLE */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-2 p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                          <div>
                            <h3 className="font-bold text-xs text-slate-900 uppercase">
                              बिल अनुसार डिलीवरी स्थिति (Bill-Wise Delivery Verification - {tripOrders.length} Bills)
                            </h3>
                            <p className="text-[10px] text-slate-500">प्रत्येक दूकानदार का पेमेंट मोड व डिलीवरी स्टेटस अपडेट करें</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => eveningImportInputRef.current?.click()}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95"
                              title="भरी हुई Excel/CSV से सीधे बिल अपडेट करें"
                            >
                              <i className="fa-solid fa-file-import text-blue-600"></i> 📥 Import Excel File
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkAllDelivered(tripOrders)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95"
                            >
                              <i className="fa-solid fa-check-double"></i> ⚡ Mark All Delivered & Paid (सभी सफल)
                            </button>
                            <button
                              type="button"
                              onClick={handleResetActiveSettlement}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                              title="इस लोड का रोकड़, चेक व UPI डेटा रीसेट करें"
                            >
                              <i className="fa-solid fa-rotate-left text-rose-500"></i>
                              <span>🔄 हिसाब रीसेट (Reset)</span>
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto max-h-96">
                          <table className="w-full text-xs text-left border-collapse border border-slate-200">
                            <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700 sticky top-0 z-10">
                              <tr>
                                <th className="p-1.5 border border-slate-200 text-center w-8">#</th>
                                <th className="p-1.5 border border-slate-200 w-16 text-center">Bill No</th>
                                <th className="p-1.5 border border-slate-200">Party Name</th>
                                <th className="p-1.5 border border-slate-200 text-right w-20">AMOUNT (₹)</th>
                                <th className="p-1.5 border border-slate-200 text-right w-20 bg-emerald-50 text-emerald-900">CASH (₹)</th>
                                <th className="p-1.5 border border-slate-200 text-right w-20 bg-blue-50 text-blue-900">CHEQUE (₹)</th>
                                <th className="p-1.5 border border-slate-200 text-right w-20 bg-teal-50 text-teal-900">UPI (₹)</th>
                                <th className="p-1.5 border border-slate-200 text-right w-20 bg-rose-50 text-rose-900">RTN (₹)</th>
                                <th className="p-1.5 border border-slate-200 text-center w-28">STATUS</th>
                                <th className="p-1.5 border border-slate-200 text-center w-20">MODE</th>
                                <th className="p-1.5 border border-slate-200 text-left w-24">REMARK</th>
                                <th className="p-1.5 border border-slate-200 text-center w-12 text-rose-700">DELETE</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {tripOrders.map((ord, idx) => {
                                const bState = settlementBillsState[ord.orderNumber] || {
                                  deliveryStatus: ord.deliveryStatus || 'Delivered',
                                  paymentMode: ord.billType || 'CASH',
                                  paidAmount: ord.billType === 'CREDIT' ? 0 : ord.totalBill,
                                  cashAmount: ord.billType === 'CREDIT' ? 0 : ord.totalBill,
                                  chequeAmount: 0,
                                  upiAmount: 0,
                                  rtnAmount: 0,
                                  notes: ''
                                };
                                return (
                                  <tr key={ord.id || ord.orderNumber} className="hover:bg-slate-50">
                                    <td className="p-1.5 border border-slate-200 text-center font-mono text-[10px] text-slate-500">{idx + 1}</td>
                                    <td className="p-1.5 border border-slate-200 text-center font-mono font-bold text-slate-900">
                                      {ord.orderNumber.startsWith('/') ? ord.orderNumber : `/${ord.orderNumber.replace(/\D/g, '') || ord.orderNumber}`}
                                    </td>
                                    <td className="p-1.5 border border-slate-200 font-medium text-slate-800 truncate max-w-xs" title={ord.partyName}>
                                      {ord.partyName}
                                    </td>
                                    <td className="p-1.5 border border-slate-200 text-right font-mono font-bold">
                                      ₹{(ord.totalBill ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                    </td>
                                    <td className="p-1.5 border border-slate-200 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20">
                                      {bState.cashAmount !== undefined && bState.cashAmount > 0 
                                        ? `₹${Number(bState.cashAmount).toLocaleString('en-IN')}` 
                                        : (bState.notes === 'CANCEL' ? <span className="text-rose-600 font-bold text-[10px]">CANCEL</span> : bState.notes === 'SIGN BILL' ? <span className="text-amber-600 font-bold text-[10px]">SIGN BILL</span> : '-')}
                                    </td>
                                    <td className="p-1.5 border border-slate-200 text-right font-mono font-bold text-blue-700 bg-blue-50/20">
                                      {bState.chequeAmount !== undefined && bState.chequeAmount > 0 ? `₹${Number(bState.chequeAmount).toLocaleString('en-IN')}` : '-'}
                                    </td>
                                    <td className="p-1.5 border border-slate-200 text-right font-mono font-bold text-teal-700 bg-teal-50/20">
                                      {bState.upiAmount !== undefined && bState.upiAmount > 0 ? `₹${Number(bState.upiAmount).toLocaleString('en-IN')}` : '-'}
                                    </td>
                                    <td className="p-1.5 border border-slate-200 text-right font-mono font-bold text-rose-700 bg-rose-50/20">
                                      {bState.rtnAmount !== undefined && bState.rtnAmount > 0 ? `₹${Number(bState.rtnAmount).toLocaleString('en-IN')}` : '-'}
                                    </td>
                                    <td className="p-1 border border-slate-200 text-center">
                                      <select
                                        value={bState.deliveryStatus}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setSettlementBillsState((prev: any) => ({
                                            ...prev,
                                            [ord.orderNumber]: { ...(prev[ord.orderNumber] || {}), deliveryStatus: val }
                                          }));
                                        }}
                                        className={`w-full p-1 rounded font-bold text-[10px] border ${
                                          bState.deliveryStatus === 'Delivered'
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                            : bState.deliveryStatus === 'Returned'
                                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                                            : bState.deliveryStatus === 'Cancelled'
                                            ? 'bg-rose-100 text-rose-900 border-rose-400'
                                            : 'bg-amber-50 text-amber-800 border-amber-300'
                                        }`}
                                      >
                                        <option value="Delivered">Delivered</option>
                                        <option value="Returned">Returned</option>
                                        <option value="Partial">Partial</option>
                                        <option value="Cancelled">Cancelled</option>
                                      </select>
                                    </td>
                                    <td className="p-1 border border-slate-200 text-center">
                                      <select
                                        value={bState.paymentMode}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setSettlementBillsState((prev: any) => ({
                                            ...prev,
                                            [ord.orderNumber]: { ...(prev[ord.orderNumber] || {}), paymentMode: val }
                                          }));
                                        }}
                                        className="w-full p-1 rounded font-bold text-[10px] border border-slate-300 bg-white"
                                      >
                                        <option value="CASH">CASH</option>
                                        <option value="CHEQUE">CHEQUE</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CREDIT">CREDIT</option>
                                      </select>
                                    </td>
                                    <td className="p-1 border border-slate-200 text-left">
                                      <input
                                        type="text"
                                        value={bState.notes || ''}
                                        placeholder="Remark..."
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setSettlementBillsState((prev: any) => ({
                                            ...prev,
                                            [ord.orderNumber]: { ...(prev[ord.orderNumber] || {}), notes: val }
                                          }));
                                        }}
                                        className="w-full p-1 text-[11px] font-mono border border-slate-300 rounded bg-white"
                                      />
                                    </td>
                                    <td className="p-1 border border-slate-200 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteIndividualBill(ord)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                        title={`Bill #${ord.orderNumber} (${ord.partyName}) हटाएं / डिलीट करें`}
                                      >
                                        <i className="fa-solid fa-trash-can text-rose-500 text-xs"></i>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-slate-100 font-mono font-bold text-xs sticky bottom-0 border-t-2 border-slate-300">
                              <tr>
                                <td colSpan={3} className="p-2 text-right uppercase">कुल योग (TOTALS):</td>
                                <td className="p-2 text-right font-black text-slate-900">₹{totalTripBill.toLocaleString('en-IN')}</td>
                                <td className="p-2 text-right font-black text-emerald-800">₹{cashAmt.toLocaleString('en-IN')}</td>
                                <td className="p-2 text-right font-black text-blue-800">₹{totalChequesAmount.toLocaleString('en-IN')}</td>
                                <td className="p-2 text-right font-black text-teal-800">₹{totalUpiAmount.toLocaleString('en-IN')}</td>
                                <td className="p-2 text-right font-black text-rose-800">₹{totalReturnsAmount.toLocaleString('en-IN')}</td>
                                <td colSpan={4} className="p-2 text-center text-slate-700 font-sans text-[11px]">
                                  उधारी (SIGN BILL): <strong>₹{creditAmt.toLocaleString('en-IN')}</strong> | अंतर: <strong className={Math.abs(difference) < 1 ? 'text-emerald-700' : 'text-rose-700'}>{difference >= 0 ? `+₹${difference}` : `-₹${Math.abs(difference)}`}</strong>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {/* Remarks & Bottom Actions */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <div className="w-full sm:w-1/2">
                          <input
                            type="text"
                            placeholder="Settlement Remarks (टिप्पणी / Cashier Note)..."
                            value={settlementRemarks}
                            onChange={(e) => setSettlementRemarks(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEveningSettlementModalOpen(false)}
                            className="px-4 py-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl"
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEveningSettlement(tripOrders, totalTripBill)}
                            disabled={isSavingSettlement}
                            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-700 to-cadbury-900 hover:from-emerald-700 hover:to-cadbury-950 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50"
                          >
                            <i className={`fa-solid ${isSavingSettlement ? 'fa-spinner fa-spin' : 'fa-floppy-disk'} text-gold-300`}></i>
                            {isSavingSettlement ? 'Saving Settlement...' : '💾 Save Evening Settlement (सेटलमेंट सुरक्षित करें)'}
                          </button>
                        </div>
                      </div>

                      {/* PRINTABLE EVENING SETTLEMENT VOUCHER (Clean A4 Print-Scoped) */}
                      <div id="printable-evening-settlement" className="p-6 bg-white text-black font-sans space-y-4 border-2 border-black rounded-xl">
                        {/* Header */}
                        <div className="border-b-2 border-black pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h1 className="text-xl font-black text-black uppercase tracking-tight font-serif">
                                VISTARAN HEALTH CARE SERVICES PVT.LTD.
                              </h1>
                              <div className="text-xs font-bold text-black">MUMBAI: 400079</div>
                              <div className="text-sm font-black text-black mt-1 uppercase underline decoration-2">
                                Evening Trip Settlement & Cash Reconciliation Report (शाम का रोकड़ मिलान वाउचर)
                              </div>
                            </div>
                            <div className="text-right text-xs text-black">
                              <div className="font-bold text-black">
                                Van No.: <span className="font-mono font-black text-black">{tripEditVan}</span>
                              </div>
                              <div className="font-bold text-black mt-0.5">
                                Load No: <span className="font-mono font-black text-black">{selectedTripLoadNo}</span> | Date: {new Date().toLocaleDateString('en-GB')}
                              </div>
                              <div className="text-[10px] text-black font-bold mt-0.5">
                                Generated: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>

                          {/* Crew & Location Snapshot */}
                          <div className="mt-2.5 pt-2 border-t-2 border-black grid grid-cols-4 gap-2 text-xs bg-slate-50 p-2 rounded border border-black text-black">
                            <div>
                              <span className="text-[9px] text-black font-extrabold block uppercase">Driver:</span>
                              <strong className="text-black font-black">{tripEditDriver}</strong>
                              <span className="text-[9px] text-black block truncate font-medium">{tripEditDriverLocation}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-black font-extrabold block uppercase">Loader (LDR):</span>
                              <strong className="text-black font-black">{tripEditLoader}</strong>
                              <span className="text-[9px] text-black block truncate font-medium">{tripEditLoaderLocation}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-black font-extrabold block uppercase">Cashier:</span>
                              <strong className="text-black font-black">{tripEditCashier}</strong>
                              <span className="text-[9px] text-black block truncate font-medium">{tripEditCashierLocation}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-black font-extrabold block uppercase">Boxes Dispatched:</span>
                              <strong className="font-mono text-black font-black">{totalBoxesDispatched} Boxes</strong>
                              <span className="text-[9px] text-black block font-bold">Delivered: {boxesDelivered} | Return: {boxesReturned}</span>
                            </div>
                          </div>
                        </div>

                        {/* Financial Reconciliation Summary Table */}
                        <div className="border-2 border-black rounded-lg overflow-hidden text-xs text-black">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-200 font-black text-black text-[10px] uppercase border-b-2 border-black">
                              <tr>
                                <th className="p-2 border border-black text-black font-black">Category (विवरण)</th>
                                <th className="p-2 border border-black text-center w-24 text-black font-black">Bills / Count</th>
                                <th className="p-2 border border-black text-right w-36 text-black font-black">Expected (₹)</th>
                                <th className="p-2 border border-black text-right w-36 text-black font-black">Actual Collected (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black">
                              <tr className="border-b border-black">
                                <td className="p-2 border border-black font-black text-black">1. Cash Collected (रोकड़)</td>
                                <td className="p-2 border border-black text-center font-mono font-bold text-black">{tripOrders.filter(o => o.billType !== 'CREDIT').length} Bills</td>
                                <td className="p-2 border border-black text-right font-mono font-bold text-black">₹{totalTripCashExpected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="p-2 border border-black text-right font-mono font-black text-black">₹{cashAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="p-2 border border-black font-black text-black">2. Cheques Collected (चेक)</td>
                                <td className="p-2 border border-black text-center font-mono font-bold text-black">{chequesList.length} Cheques</td>
                                <td className="p-2 border border-black text-right font-mono font-bold text-black">-</td>
                                <td className="p-2 border border-black text-right font-mono font-black text-black">₹{totalChequesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="p-2 border border-black font-black text-black">3. Digital / UPI Payments (QR)</td>
                                <td className="p-2 border border-black text-center font-mono font-bold text-black">{upisList.length} UPIs</td>
                                <td className="p-2 border border-black text-right font-mono font-bold text-black">-</td>
                                <td className="p-2 border border-black text-right font-mono font-black text-black">₹{totalUpiAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="p-2 border border-black font-black text-black">4. Credit Allowed (उधारी)</td>
                                <td className="p-2 border border-black text-center font-mono font-bold text-black">{tripOrders.filter(o => o.billType === 'CREDIT').length} Bills</td>
                                <td className="p-2 border border-black text-right font-mono font-bold text-black">₹{totalTripCreditExpected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="p-2 border border-black text-right font-mono font-black text-black">₹{creditAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="p-2 border border-black font-black text-black">5. Return Goods / Credit Notes (वापसी माल)</td>
                                <td className="p-2 border border-black text-center font-mono font-bold text-black">{returnsList.length} Returns</td>
                                <td className="p-2 border border-black text-right font-mono font-bold text-black">-</td>
                                <td className="p-2 border border-black text-right font-mono font-black text-black">₹{totalReturnsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            </tbody>
                            <tfoot className="bg-slate-100 font-black text-xs border-t-2 border-black">
                              <tr className="border-t-2 border-black">
                                <td colSpan={2} className="p-2 border border-black uppercase text-black font-black">
                                  TOTAL DISPATCHED vs TOTAL ACCOUNTED:
                                </td>
                                <td className="p-2 border border-black text-right font-mono text-black font-black">
                                  ₹{totalTripBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-2 border border-black text-right font-mono text-black font-black">
                                  ₹{totalAccounted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                              <tr className={`border-t border-black ${Math.abs(difference) < 1 ? 'bg-emerald-100' : difference < 0 ? 'bg-rose-100' : 'bg-blue-100'}`}>
                                <td colSpan={3} className="p-2 border border-black uppercase text-black font-black">
                                  RECONCILIATION RESULT (अंतिम हिसाब स्थिति):
                                </td>
                                <td className="p-2 border border-black text-right font-mono font-black text-black">
                                  {Math.abs(difference) < 1 ? (
                                    <span className="text-black font-black">✅ 100% TALLIED (₹0.00)</span>
                                  ) : difference < 0 ? (
                                    <span className="text-black font-black">⚠️ SHORTAGE: -₹{Math.abs(difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                  ) : (
                                    <span className="text-black font-black">EXCESS: +₹{difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                  )}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Cheques & Returns Detail Lists for Printout */}
                        {(chequesList.length > 0 || returnsList.length > 0) && (
                          <div className="grid grid-cols-2 gap-3 text-[10px] text-black">
                            {chequesList.length > 0 && (
                              <div className="border-2 border-black rounded p-2">
                                <strong className="block border-b border-black pb-1 text-black font-black">Cheques Submitted:</strong>
                                <div className="space-y-0.5 pt-1">
                                  {chequesList.map(c => (
                                    <div key={c.id} className="flex justify-between font-bold">
                                      <span>#{c.chequeNo} ({c.bankName} - {c.partyName})</span>
                                      <strong className="font-mono font-black">₹{c.amount}</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {returnsList.length > 0 && (
                              <div className="border-2 border-black rounded p-2">
                                <strong className="block border-b border-black pb-1 text-black font-black">Returns / Damaged Goods:</strong>
                                <div className="space-y-0.5 pt-1">
                                  {returnsList.map(r => (
                                    <div key={r.id} className="flex justify-between font-bold">
                                      <span>{r.partyName} ({r.cartons} Box - {r.reason})</span>
                                      <strong className="font-mono font-black">₹{r.amount}</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Signatures Undertaking */}
                        <div className="avoid-break grid grid-cols-4 gap-3 pt-6 text-center text-xs border-t-2 border-black text-black">
                          <div>
                            <div className="h-10"></div>
                            <div className="border-t-2 border-black pt-1">
                              <strong className="block text-black font-black">Driver Sign</strong>
                              <span className="text-[11px] font-black text-black block">{tripEditDriver}</span>
                              <span className="text-[9px] text-black font-bold block">वाहन वापसी व माल जमा</span>
                            </div>
                          </div>
                          <div>
                            <div className="h-10"></div>
                            <div className="border-t-2 border-black pt-1">
                              <strong className="block text-black font-black">Loader (LDR) Sign</strong>
                              <span className="text-[11px] font-black text-black block">{tripEditLoader}</span>
                              <span className="text-[9px] text-black font-bold block">खाली क्रेट्स व वापसी माल गिनती</span>
                            </div>
                          </div>
                          <div>
                            <div className="h-10"></div>
                            <div className="border-t-2 border-black pt-1">
                              <strong className="block text-black font-black">Cashier Sign</strong>
                              <span className="text-[11px] font-black text-black block">{tripEditCashier}</span>
                              <span className="text-[9px] text-black font-bold block">रोकड़ व चेक डिस्ट्रीब्यूटर काउंटर पर सुपुर्द</span>
                            </div>
                          </div>
                          <div>
                            <div className="h-10"></div>
                            <div className="border-t-2 border-black pt-1">
                              <strong className="block text-black font-black">Accounts Manager Sign</strong>
                              <span className="text-[11px] font-black text-black block">VISTARAN HEALTH CARE</span>
                              <span className="text-[9px] text-black font-bold block">हिसाब व रोकड़ मिलान प्रमाणित</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* CASH DEPOSIT ENVELOPE SLIP MODAL (रोकड़ जमा लिफाफा रसीद) */}
      {isEnvelopeSlipModalOpen && (
        <div id="envelope-slip-modal-backdrop" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[95vh] overflow-y-auto border border-slate-200">
            {/* Modal Controls Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black uppercase mb-1">
                  <i className="fa-solid fa-envelope-open-text text-amber-600"></i> Cash Deposit Envelope Slip
                </div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  ✉️ दैनिक वैन रोकड़ जमा लिफाफा रसीद
                </h3>
                <p className="text-xs text-slate-500">
                  बैंक या कैशियर काउंटर पर लिफाफे (Envelope) पर चिपकाने व जमा करने हेतु आधिकारिक रसीद
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadEnvelopeSlipPDF}
                  disabled={isDownloadingEnvelopePdf}
                  className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  title="Download Slip as PDF"
                >
                  <i className={`fa-solid ${isDownloadingEnvelopePdf ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
                  {isDownloadingEnvelopePdf ? 'Creating...' : '📥 Download Slip PDF'}
                </button>

                <button
                  type="button"
                  onClick={handlePrintEnvelopeSlip}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 active:scale-95"
                  title="Print Slip for Cash Envelope"
                >
                  <i className="fa-solid fa-print text-gold-400"></i> 🖨️ Print Slip
                </button>

                <button
                  type="button"
                  onClick={() => setIsEnvelopeSlipModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            {/* Interactive Note Denomination Calculator (Hidden in Print) */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2.5 no-print">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 uppercase flex items-center gap-1.5">
                  <i className="fa-solid fa-coins text-amber-600"></i> नोटों का विवरण (Cash Denomination Breakdown)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAutoBreakdownDenominations()}
                    className="text-[10px] px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg transition-all"
                  >
                    ⚡ Auto-Fill Notes (₹{Number(settlementActualCash || 0).toLocaleString('en-IN')})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvelopeDenominations({ n500: '', n200: '', n100: '', n50: '', n20: '', n10: '', coins: '' })}
                    className="text-[10px] px-2 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-slate-300 rounded-lg"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600">₹500 Notes</label>
                  <input
                    type="number"
                    value={envelopeDenominations.n500}
                    onChange={(e) => setEnvelopeDenominations({ ...envelopeDenominations, n500: e.target.value })}
                    placeholder="0"
                    className="w-full p-1.5 border border-amber-300 rounded-lg font-mono font-bold text-center bg-white"
                  />
                  <span className="block text-[9px] text-right font-mono text-slate-500">= ₹{((Number(envelopeDenominations.n500) || 0) * 500).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600">₹200 Notes</label>
                  <input
                    type="number"
                    value={envelopeDenominations.n200}
                    onChange={(e) => setEnvelopeDenominations({ ...envelopeDenominations, n200: e.target.value })}
                    placeholder="0"
                    className="w-full p-1.5 border border-amber-300 rounded-lg font-mono font-bold text-center bg-white"
                  />
                  <span className="block text-[9px] text-right font-mono text-slate-500">= ₹{((Number(envelopeDenominations.n200) || 0) * 200).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600">₹100 Notes</label>
                  <input
                    type="number"
                    value={envelopeDenominations.n100}
                    onChange={(e) => setEnvelopeDenominations({ ...envelopeDenominations, n100: e.target.value })}
                    placeholder="0"
                    className="w-full p-1.5 border border-amber-300 rounded-lg font-mono font-bold text-center bg-white"
                  />
                  <span className="block text-[9px] text-right font-mono text-slate-500">= ₹{((Number(envelopeDenominations.n100) || 0) * 100).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600">₹50 Notes</label>
                  <input
                    type="number"
                    value={envelopeDenominations.n50}
                    onChange={(e) => setEnvelopeDenominations({ ...envelopeDenominations, n50: e.target.value })}
                    placeholder="0"
                    className="w-full p-1.5 border border-amber-300 rounded-lg font-mono font-bold text-center bg-white"
                  />
                  <span className="block text-[9px] text-right font-mono text-slate-500">= ₹{((Number(envelopeDenominations.n50) || 0) * 50).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600">₹20 Notes</label>
                  <input
                    type="number"
                    value={envelopeDenominations.n20}
                    onChange={(e) => setEnvelopeDenominations({ ...envelopeDenominations, n20: e.target.value })}
                    placeholder="0"
                    className="w-full p-1.5 border border-amber-300 rounded-lg font-mono font-bold text-center bg-white"
                  />
                  <span className="block text-[9px] text-right font-mono text-slate-500">= ₹{((Number(envelopeDenominations.n20) || 0) * 20).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600">₹10 Notes</label>
                  <input
                    type="number"
                    value={envelopeDenominations.n10}
                    onChange={(e) => setEnvelopeDenominations({ ...envelopeDenominations, n10: e.target.value })}
                    placeholder="0"
                    className="w-full p-1.5 border border-amber-300 rounded-lg font-mono font-bold text-center bg-white"
                  />
                  <span className="block text-[9px] text-right font-mono text-slate-500">= ₹{((Number(envelopeDenominations.n10) || 0) * 10).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600">सिक्के (Coins)</label>
                  <input
                    type="number"
                    value={envelopeDenominations.coins}
                    onChange={(e) => setEnvelopeDenominations({ ...envelopeDenominations, coins: e.target.value })}
                    placeholder="0"
                    className="w-full p-1.5 border border-amber-300 rounded-lg font-mono font-bold text-center bg-white"
                  />
                  <span className="block text-[9px] text-right font-mono text-slate-500">= ₹{(Number(envelopeDenominations.coins) || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {(() => {
                const totalDenom = (Number(envelopeDenominations.n500) || 0) * 500 +
                  (Number(envelopeDenominations.n200) || 0) * 200 +
                  (Number(envelopeDenominations.n100) || 0) * 100 +
                  (Number(envelopeDenominations.n50) || 0) * 50 +
                  (Number(envelopeDenominations.n20) || 0) * 20 +
                  (Number(envelopeDenominations.n10) || 0) * 10 +
                  (Number(envelopeDenominations.coins) || 0);
                const actualCash = Number(settlementActualCash) || 0;
                const match = Math.abs(totalDenom - actualCash) < 1;

                return (
                  <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 text-xs">
                    <span className="font-bold text-slate-700">
                      नोटों का कुल जोड़: <strong className="font-mono text-sm text-slate-900">₹{totalDenom.toLocaleString('en-IN')}</strong> / कुल रोकड़: ₹{actualCash.toLocaleString('en-IN')}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${match ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {match ? '✅ नोटों की गिनती रोकड़ से 100% मैच है' : `⚠️ अंतर: ₹${(totalDenom - actualCash).toLocaleString('en-IN')}`}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* THE PRINTABLE CASH DEPOSIT ENVELOPE SLIP (VOUCHER) */}
            <div
              id="printable-cash-envelope-slip"
              className="p-4 sm:p-5 bg-white text-black font-sans space-y-3 border-2 border-dashed border-black rounded-xl shadow-sm max-w-2xl mx-auto"
            >
              {/* Cutting Line Banner */}
              <div className="flex items-center justify-between border-b-2 border-dashed border-black pb-1.5 text-[10px] font-black text-black uppercase tracking-wider">
                <span>✂️ CUT & ATTACH TO CASH ENVELOPE (कट करके रोकड़ लिफाफे पर चिपकाएं)</span>
                <span>DEPOSIT SLIP</span>
              </div>

              {/* Company & Header */}
              <div className="flex justify-between items-start pt-1">
                <div>
                  <h2 className="text-base font-black text-black uppercase font-serif tracking-tight leading-tight">
                    VISTARAN HEALTH CARE SERVICES PVT.LTD.
                  </h2>
                  <div className="text-[10px] font-bold text-black">MUMBAI: 400079</div>
                  <div className="inline-block mt-1 px-2 py-0.5 bg-slate-100 border border-black font-mono font-black text-[11px] uppercase">
                    VAN CASH DEPOSIT ENVELOPE SLIP (दैनिक रोकड़ जमा रसीद)
                  </div>
                </div>
                <div className="text-right text-[10px] font-bold text-black space-y-0.5">
                  <div>Date: <strong className="font-mono">{new Date().toLocaleDateString('en-GB')}</strong></div>
                  <div>Time: <strong className="font-mono">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</strong></div>
                  <div>Load No: <strong className="font-mono font-black">#{selectedTripLoadNo === 'ALL' ? '188' : selectedTripLoadNo}</strong></div>
                  <div>Van No: <strong className="font-mono font-black">{tripEditVan}</strong></div>
                </div>
              </div>

              {/* Crew Snapshot */}
              <div className="border border-black p-2 bg-slate-50 text-[10px] grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[8.5px] font-bold text-slate-600 block uppercase">Driver (चालक):</span>
                  <strong className="text-black font-black truncate block">{tripEditDriver}</strong>
                </div>
                <div>
                  <span className="text-[8.5px] font-bold text-slate-600 block uppercase">Loader (LDR):</span>
                  <strong className="text-black font-black truncate block">{tripEditLoader}</strong>
                </div>
                <div>
                  <span className="text-[8.5px] font-bold text-slate-600 block uppercase">Cashier (रोकड़िया):</span>
                  <strong className="text-black font-black truncate block">{tripEditCashier}</strong>
                </div>
              </div>

              {/* BIG CASH HIGHLIGHT BOX */}
              <div className="border-2 border-black p-2.5 bg-slate-100 text-center rounded">
                <span className="text-[9px] font-black text-slate-700 block uppercase tracking-wider">
                  TOTAL CASH ENCLOSED IN THIS ENVELOPE (लिफाफे में कुल नकद रोकड़)
                </span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-black my-0.5 tracking-tight">
                  ₹{(Number(settlementActualCash) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] font-black text-black italic">
                  ({numberToIndianWords(Number(settlementActualCash) || 0)})
                </div>
              </div>

              {/* Denominations & Reconciliation Side-by-Side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                {/* Note Denomination Breakdown */}
                <div className="border border-black p-2 bg-white">
                  <span className="font-black text-black uppercase block border-b border-black pb-1 mb-1 text-[9px]">
                    नोटों का विवरण (Cash Denomination)
                  </span>
                  <table className="w-full text-left border-collapse text-[9.5px]">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-0.5 font-bold">₹500 x {envelopeDenominations.n500 || '-'}</td>
                        <td className="py-0.5 text-right font-mono font-bold">₹{((Number(envelopeDenominations.n500) || 0) * 500).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-0.5 font-bold">₹200 x {envelopeDenominations.n200 || '-'}</td>
                        <td className="py-0.5 text-right font-mono font-bold">₹{((Number(envelopeDenominations.n200) || 0) * 200).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-0.5 font-bold">₹100 x {envelopeDenominations.n100 || '-'}</td>
                        <td className="py-0.5 text-right font-mono font-bold">₹{((Number(envelopeDenominations.n100) || 0) * 100).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-0.5 font-bold">₹50 x {envelopeDenominations.n50 || '-'}</td>
                        <td className="py-0.5 text-right font-mono font-bold">₹{((Number(envelopeDenominations.n50) || 0) * 50).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-0.5 font-bold">₹20 x {envelopeDenominations.n20 || '-'}</td>
                        <td className="py-0.5 text-right font-mono font-bold">₹{((Number(envelopeDenominations.n20) || 0) * 20).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-0.5 font-bold">₹10 x {envelopeDenominations.n10 || '-'}</td>
                        <td className="py-0.5 text-right font-mono font-bold">₹{((Number(envelopeDenominations.n10) || 0) * 10).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-0.5 font-bold">Coins (सिक्के)</td>
                        <td className="py-0.5 text-right font-mono font-bold">₹{(Number(envelopeDenominations.coins) || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-t-2 border-black font-black bg-slate-50">
                        <td className="py-0.5 uppercase">TOTAL CASH</td>
                        <td className="py-0.5 text-right font-mono">₹{(Number(settlementActualCash) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Other Instruments & Trip Settlement Summary */}
                <div className="border border-black p-2 bg-white flex flex-col justify-between">
                  <div>
                    <span className="font-black text-black uppercase block border-b border-black pb-1 mb-1 text-[9px]">
                      डिलीवरी व हिसाब स्थिति (Trip Settlement)
                    </span>
                    <div className="space-y-1 text-[9.5px]">
                      <div className="flex justify-between">
                        <span className="text-slate-600">कुल बिल (Total Dispatched):</span>
                        <strong className="font-mono">₹{(() => {
                          const active = getActiveTripOrders();
                          return active.reduce((s, o) => s + (o.totalBill || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                        })()}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">लिफाफा रोकड़ (Cash):</span>
                        <strong className="font-mono text-emerald-900">₹{(Number(settlementActualCash) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">चेक संग्रह ({chequesList.length} Cheques):</span>
                        <strong className="font-mono">₹{chequesList.reduce((s, c) => s + (Number(c.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">डिजिटल / UPI ({upisList.length} UPIs):</span>
                        <strong className="font-mono">₹{upisList.reduce((s, u) => s + (Number(u.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">स्वीकृत उधारी (Credit):</span>
                        <strong className="font-mono">₹{(Number(settlementCreditAllowed) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">वापसी माल (Returns):</span>
                        <strong className="font-mono">₹{(returnsList.reduce((s, r) => s + (Number(r.amount) || 0), 0) + (Number(settlementReturnAmount) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-black text-center">
                    <span className="px-2 py-0.5 rounded border border-black font-black text-[9px] bg-slate-100 inline-block uppercase">
                      ✅ हिसाब व रोकड़ सत्यापित (VERIFIED & AUDITED)
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Signatures */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t-2 border-black text-center text-[10px]">
                <div>
                  <div className="h-6"></div>
                  <div className="border-t border-dashed border-black pt-1">
                    <strong className="block text-black font-black">1. चालक (Driver)</strong>
                    <span className="text-[9px] text-slate-600 font-bold block">{tripEditDriver}</span>
                    <span className="text-[8px] text-slate-500 block">रोकड़ सुपुर्दगी (Handed Over)</span>
                  </div>
                </div>
                <div>
                  <div className="h-6"></div>
                  <div className="border-t border-dashed border-black pt-1">
                    <strong className="block text-black font-black">2. रोकड़िया (Cashier)</strong>
                    <span className="text-[9px] text-slate-600 font-bold block">{tripEditCashier}</span>
                    <span className="text-[8px] text-slate-500 block">रोकड़ प्राप्ति व गिनती (Counted)</span>
                  </div>
                </div>
                <div>
                  <div className="h-6"></div>
                  <div className="border-t border-dashed border-black pt-1">
                    <strong className="block text-black font-black">3. प्रबंधक (Manager)</strong>
                    <span className="text-[9px] text-slate-600 font-bold block">VISTARAN HEALTH CARE</span>
                    <span className="text-[8px] text-slate-500 block">स्वीकृति व बैंक प्रेषण (Approved)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SALES INVOICE PRINTING MODAL (WINOMKAR REPLICA) */}
      {isSalesInvoicePrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          {/* WinOmkar Classic Dialog Box */}
          <div className="bg-[#fcedd0] border-2 border-[#a3703c] rounded-lg shadow-2xl p-5 w-full max-w-md space-y-4 font-sans text-slate-900">
            {/* Window Title Bar */}
            <div className="flex items-center justify-between border-b border-[#cca370] pb-2">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <i className="fa-solid fa-print text-amber-800"></i> WINOMKAR - [Sales Invoice Printing]
              </span>
              <button
                type="button"
                onClick={() => setIsSalesInvoicePrintModalOpen(false)}
                className="w-6 h-6 rounded bg-[#f7d9aa] hover:bg-[#ebc489] text-amber-950 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="text-center font-black italic text-lg text-amber-950 font-serif border-b border-[#e6be8a] pb-2">
              Sales Invoice Printing
            </div>

            {/* Form Fields matching WinOmkar */}
            <div className="space-y-2.5 text-xs font-bold text-slate-800">
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-right">LoadNo :</label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={salesPrintLoadNo}
                    onChange={(e) => setSalesPrintLoadNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-400 rounded bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-right">Series :</label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={salesPrintSeries}
                    onChange={(e) => setSalesPrintSeries(e.target.value)}
                    placeholder="CAD"
                    className="w-full px-2.5 py-1.5 border border-slate-400 rounded bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-right">From Bill :</label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={salesPrintFromBill}
                    onChange={(e) => setSalesPrintFromBill(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-400 rounded bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-right">To Bill :</label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={salesPrintToBill}
                    onChange={(e) => setSalesPrintToBill(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-400 rounded bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-right">No. of Copies :</label>
                <div className="col-span-2">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={salesPrintCopies}
                    onChange={(e) => setSalesPrintCopies(parseInt(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 border border-slate-400 rounded bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-right">Copy Type :</label>
                <div className="col-span-2">
                  <select
                    value={salesPrintCopyType}
                    onChange={(e) => setSalesPrintCopyType(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-400 rounded bg-white text-xs"
                  >
                    <option value="None">None</option>
                    <option value="Original for Buyer">Original for Buyer</option>
                    <option value="Duplicate for Transporter">Duplicate for Transporter</option>
                    <option value="Triplicate for Supplier">Triplicate for Supplier</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Buttons matching WinOmkar */}
            <div className="flex items-center justify-center gap-3 pt-3 border-t border-[#cca370]">
              <button
                type="button"
                onClick={() => handleExecuteSalesInvoicePrint(false)}
                className="px-5 py-2 bg-[#f28e2b] hover:bg-[#e07d1a] border border-[#b85b00] text-slate-950 font-black text-xs rounded shadow active:scale-95 transition-all"
              >
                Print
              </button>

              <button
                type="button"
                onClick={() => handleExecuteSalesInvoicePrint(true)}
                className="px-5 py-2 bg-[#f28e2b] hover:bg-[#e07d1a] border-2 border-slate-900 text-slate-950 font-black text-xs rounded shadow active:scale-95 transition-all"
              >
                Graphical Print
              </button>

              <button
                type="button"
                onClick={() => setIsSalesInvoicePrintModalOpen(false)}
                className="px-5 py-2 bg-[#f28e2b] hover:bg-[#e07d1a] border border-[#b85b00] text-slate-950 font-black text-xs rounded shadow active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK INVOICES PRINT PREVIEW MODAL */}
      {isBulkPrintPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 no-print">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  🖨️ Cadbury Sales Invoices Print ({bulkInvoicesToPrint.length} Bills: {salesPrintFromBill} to {salesPrintToBill})
                </h3>
                <p className="text-xs text-slate-500">
                  Load #{salesPrintLoadNo} | {salesPrintCopies} Copies ({salesPrintCopyType})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintBulkInvoicesDirect}
                  className="px-4 py-2 bg-cadbury-900 hover:bg-cadbury-950 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-print text-gold-400"></i> Print All {bulkInvoicesToPrint.length} Invoices (A4)
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkPrintPreviewOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Bulk Invoices Container */}
            <div id="printable-bulk-invoices-sheet" className="space-y-6">
              {bulkInvoicesToPrint.map((ord, iIdx) => (
                <div key={ord.id || ord.orderNumber} className="invoice-page border border-slate-300 p-6 rounded-xl space-y-4 bg-white text-slate-800 font-sans">
                  {/* Invoice Header */}
                  <div className="flex justify-between items-start border-b-2 border-slate-800 pb-2">
                    <div>
                      <h1 className="text-lg font-black text-cadbury-950 uppercase tracking-tight">
                        VISTARAN HEALTH CARE SERVICES PVT. LTD.
                      </h1>
                      <div className="text-[11px] font-bold text-cadbury-800">
                        CADBURY AUTHORIZED DISTRIBUTOR & LOGISTICS | MUMBAI: 400079
                      </div>
                      <p className="text-[10px] text-slate-500">
                        GSTIN: <strong>27AAACF8912C1Z7</strong> | State: Maharashtra (27)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-black text-white bg-slate-900 px-2 py-0.5 rounded">
                        TAX INVOICE {salesPrintCopyType !== 'None' ? `(${salesPrintCopyType})` : ''}
                      </span>
                      <div className="text-xs font-mono font-black mt-1 text-slate-900">
                        {ord.invoiceNumber || ord.orderNumber}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Date: {ord.orderDate || '19/11/2026'} | Load #{ord.loadNumber || salesPrintLoadNo}
                      </div>
                    </div>
                  </div>

                  {/* Party & Van Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Billed To (Customer):</span>
                      <strong className="text-slate-900 text-xs block">{ord.partyName}</strong>
                      <span className="text-[10px] text-slate-600 block">{ord.partyAddress || 'Mumbai'}</span>
                      <span className="text-[10px] text-slate-600 block">Mobile: {ord.partyMobile || 'N/A'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Dispatch Info:</span>
                      <span className="block font-mono font-bold">Van: {ord.vehicleNumber || tripEditVan}</span>
                      <span className="block">Driver: {ord.driverName || tripEditDriver}</span>
                      <span className="block font-bold text-purple-900">Type: {ord.billType || 'CASH'}</span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
                      <tr>
                        <th className="p-1.5 border border-slate-300 text-center w-8">#</th>
                        <th className="p-1.5 border border-slate-300">Item Description</th>
                        <th className="p-1.5 border border-slate-300 text-center w-16">Boxes</th>
                        <th className="p-1.5 border border-slate-300 text-right w-20">Rate</th>
                        <th className="p-1.5 border border-slate-300 text-right w-24">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ord.items && ord.items.length > 0 ? (
                        ord.items.map((it, itIdx) => (
                          <tr key={itIdx}>
                            <td className="p-1.5 border border-slate-300 text-center">{itIdx + 1}</td>
                            <td className="p-1.5 border border-slate-300 font-medium">{it.productName}</td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold">{it.cartons} Box</td>
                            <td className="p-1.5 border border-slate-300 text-right font-mono">₹{it.ratePerCarton}</td>
                            <td className="p-1.5 border border-slate-300 text-right font-mono font-bold">₹{(it.totalAmount ?? 0).toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="p-1.5 border border-slate-300 text-center">1</td>
                          <td className="p-1.5 border border-slate-300 font-medium">Cadbury Assorted Chocolates (Load #{ord.loadNumber || '189'})</td>
                          <td className="p-1.5 border border-slate-300 text-center font-bold">{ord.totalCartons || 1} Box</td>
                          <td className="p-1.5 border border-slate-300 text-right font-mono">₹{(ord.totalBill ?? 0).toLocaleString('en-IN')}</td>
                          <td className="p-1.5 border border-slate-300 text-right font-mono font-bold">₹{(ord.totalBill ?? 0).toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-black text-xs">
                      <tr>
                        <td colSpan={4} className="p-1.5 border border-slate-300 text-right uppercase">Total Invoice Value:</td>
                        <td className="p-1.5 border border-slate-300 text-right font-mono text-cadbury-950 font-black">
                          ₹{(ord.totalBill ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Signatures */}
                  <div className="flex justify-between items-end pt-3 text-[10px]">
                    <div>Receiver's Signature & Stamp</div>
                    <div>For VISTARAN HEALTH CARE SERVICES PVT. LTD.</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SINGLE INVOICE PDF & PRINT MODAL */}
      {selectedInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[95vh] overflow-y-auto">
            {/* Modal Controls (Hidden in Print) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 no-print">
              <span className="text-xs font-bold text-cadbury-900 flex items-center gap-1.5">
                <i className="fa-solid fa-file-invoice text-gold-500"></i> Cadbury Tax Invoice Preview (A4 Printable)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-cadbury-900 hover:bg-cadbury-800 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <i className="fa-solid fa-print text-gold-400"></i> Print Invoice (A4)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceOrder(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            {/* Printable Invoice Sheet */}
            <div id="printable-cadbury-invoice" className="border border-slate-300 p-6 rounded-xl space-y-5 text-slate-800 bg-white font-sans">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3">
                <div>
                  <h1 className="text-xl font-black text-cadbury-950 uppercase tracking-tight">
                    VISTARAN HEALTH CARE SERVICES PVT. LTD.
                  </h1>
                  <div className="text-xs font-bold text-cadbury-800">
                    CADBURY AUTHORIZED DISTRIBUTOR & LOGISTICS
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    MIDC Industrial Estate, Andheri East, Mumbai - 400093
                  </p>
                  <p className="text-[11px] text-slate-500">
                    GSTIN: <strong>27AAACF8912C1Z7</strong> | State: Maharashtra (27)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase font-black text-white bg-slate-900 px-2.5 py-1 rounded">
                    TAX INVOICE
                  </span>
                  <div className="text-sm font-mono font-bold mt-1 text-slate-900">
                    {selectedInvoiceOrder.invoiceNumber}
                  </div>
                  <div className="text-xs text-slate-500">
                    Date: {selectedInvoiceOrder.orderDate}
                  </div>
                  {selectedInvoiceOrder.billType && (
                    <div className="text-xs font-bold text-purple-900 mt-0.5">
                      Type: {selectedInvoiceOrder.billType} | Load #{selectedInvoiceOrder.loadNumber || '189'}
                    </div>
                  )}
                </div>
              </div>

              {/* Bill To & Dispatch */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Billed To (Party Details):
                  </span>
                  <div className="font-bold text-slate-900 text-sm">{selectedInvoiceOrder.partyName}</div>
                  <div className="text-slate-600 mt-0.5">{selectedInvoiceOrder.partyAddress}</div>
                  <div className="text-slate-600">Mobile: {selectedInvoiceOrder.partyMobile}</div>
                  <div className="text-slate-600">GST: {selectedInvoiceOrder.partyGst || 'Unregistered'}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Dispatch & Crew Details:
                  </span>
                  <div>Vehicle: <strong className="font-mono">{selectedInvoiceOrder.vehicleNumber || 'MH 02 EK 4589'}</strong></div>
                  <div>Driver: <strong>{selectedInvoiceOrder.driverName || 'Santosh Yadav'}</strong></div>
                  <div>Loader (LDR): <strong className="text-purple-900">{selectedInvoiceOrder.loaderName || 'Ramesh Kumar'}</strong></div>
                  <div>Cashier / Collection: <strong className="text-emerald-900">{selectedInvoiceOrder.cashierName || selectedInvoiceOrder.deliveryBoyName || 'Suresh Patil'}</strong></div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700 border-b border-slate-300">
                  <tr>
                    <th className="p-2 border border-slate-300 text-center w-8">#</th>
                    <th className="p-2 border border-slate-300">Item Description</th>
                    <th className="p-2 border border-slate-300 text-center">Cartons</th>
                    <th className="p-2 border border-slate-300 text-right">Rate</th>
                    <th className="p-2 border border-slate-300 text-right">Disc</th>
                    <th className="p-2 border border-slate-300 text-right">GST (18%)</th>
                    <th className="p-2 border border-slate-300 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedInvoiceOrder.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-semibold">{item.productName}</td>
                      <td className="p-2 border border-slate-300 text-center font-bold">{item.cartons} Box</td>
                      <td className="p-2 border border-slate-300 text-right">₹{item.ratePerCarton}</td>
                      <td className="p-2 border border-slate-300 text-right">{item.discountPercent}%</td>
                      <td className="p-2 border border-slate-300 text-right">18%</td>
                      <td className="p-2 border border-slate-300 text-right font-bold">₹{(item.totalAmount ?? 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="border-t border-slate-300 pt-3 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500">Payment Status: </span>
                  <strong className={selectedInvoiceOrder.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}>
                    {selectedInvoiceOrder.paymentStatus} ({selectedInvoiceOrder.billType || 'CASH'})
                  </strong>
                </div>

                <div className="text-right">
                  <div className="text-slate-500">Total Cartons: <strong>{selectedInvoiceOrder.totalCartons} Box</strong></div>
                  <div className="text-lg font-black text-cadbury-950 mt-1">
                    Invoice Amount: ₹{(selectedInvoiceOrder?.totalBill ?? 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Four Signatures */}
              <div className="grid grid-cols-4 gap-3 pt-8 text-center text-[10px] text-slate-600 border-t border-slate-300">
                <div>
                  <div className="h-8"></div>
                  <div className="border-t border-slate-400 pt-1 font-semibold">Loader (LDR) Sign</div>
                  <div className="text-[9px] text-slate-400">{selectedInvoiceOrder.loaderName || 'Ramesh Kumar'}</div>
                </div>
                <div>
                  <div className="h-8"></div>
                  <div className="border-t border-slate-400 pt-1 font-semibold">Cashier Sign</div>
                  <div className="text-[9px] text-slate-400">{selectedInvoiceOrder.cashierName || 'Suresh Patil'}</div>
                </div>
                <div>
                  <div className="h-8"></div>
                  <div className="border-t border-slate-400 pt-1 font-semibold">Receiver Stamp & Sign</div>
                  <div className="text-[9px] text-slate-400">{selectedInvoiceOrder.partyName}</div>
                </div>
                <div>
                  <div className="h-8"></div>
                  <div className="border-t border-slate-400 pt-1 font-semibold">For VISTARAN HEALTH CARE</div>
                  <div className="text-[9px] text-slate-400">Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD NEW DELIVERY VAN MODAL */}
      {isAddVanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-cadbury-700 tracking-wider">
                  Van & Staff Master
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  + Nayi Delivery Gaadi Register Karein
                </h3>
                <p className="text-xs text-slate-500">
                  Delivery Van number, Driver name aur Loader (LDR) name khud add karein.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVanModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleRegisterCustomVan} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Delivery Van Number *</label>
                  <input
                    type="text"
                    required
                    value={customVanNumber}
                    onChange={(e) => setCustomVanNumber(e.target.value)}
                    placeholder="e.g. MH 04 CD 1234 ya Van V2"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vehicle Model / Type</label>
                  <select
                    value={customVanType}
                    onChange={(e) => setCustomVanType(e.target.value)}
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
                    value={customDriverName}
                    onChange={(e) => setCustomDriverName(e.target.value)}
                    placeholder="e.g. Mukesh Sharma"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Driver Mobile</label>
                  <input
                    type="tel"
                    value={customDriverPhone}
                    onChange={(e) => setCustomDriverPhone(e.target.value)}
                    placeholder="98200XXXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">Loader (LDR) Naam *</label>
                    <span className="text-[9px] text-cadbury-700 font-bold uppercase">Loading</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={customLoaderName}
                    onChange={(e) => setCustomLoaderName(e.target.value)}
                    placeholder="e.g. Amit Singh"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">Cashier / Staff Naam *</label>
                    <span className="text-[9px] text-emerald-700 font-bold uppercase">Collection</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={customCashierName}
                    onChange={(e) => setCustomCashierName(e.target.value)}
                    placeholder="e.g. Vikas Gupta"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-cadbury-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddVanModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVan}
                  className="px-5 py-2 bg-cadbury-900 hover:bg-cadbury-800 text-white font-black rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                >
                  {isSubmittingVan ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Saving...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i> Save & Register Van
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE UNWANTED LOAD NO CONFIRMATION MODAL */}
      {isDeleteLoadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 border border-rose-200">
            <div className="flex items-start justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-lg font-black">
                  <i className="fa-solid fa-trash-can"></i>
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-950">
                    Delete Unwanted Load No (लोड डिलीट करें)
                  </h3>
                  <p className="text-xs text-slate-500">
                    अनावश्यक पुराना लोड डेटा हटाएँ ताकि सिस्टम स्टोरेज / मेमोरी फुल न हो
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteLoadModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Select Load to delete */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                डिलीट करने के लिए Load No चुनें:
              </label>
              <select
                value={loadToDelete}
                onChange={(e) => setLoadToDelete(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white text-slate-900"
              >
                {availableLoadNumbers.map(lNo => {
                  const bCount = orders.filter(o => String(o.loadNumber || '').trim() === lNo).length;
                  return (
                    <option key={lNo} value={lNo}>
                      Load #{lNo} ({bCount} Bills)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Load stats to be deleted */}
            {(() => {
              const matchedOrders = orders.filter(o => String(o.loadNumber || '').trim() === String(loadToDelete).trim());
              const totalAmt = matchedOrders.reduce((s, o) => s + (o.totalBill || 0), 0);
              const totalCartons = matchedOrders.reduce((s, o) => s + (o.totalCartons || 0), 0);

              return (
                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-rose-950 flex items-center gap-1.5">
                    <i className="fa-solid fa-triangle-exclamation text-rose-600"></i>
                    चेतावनी: लोड #{loadToDelete} का निम्न डेटा हमेशा के लिए हट जाएगा:
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                    <div className="bg-white p-2 rounded-lg border border-rose-200 shadow-sm">
                      <span className="text-[10px] text-slate-500 block">कुल बिल</span>
                      <strong className="text-sm text-slate-900">{matchedOrders.length}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-rose-200 shadow-sm">
                      <span className="text-[10px] text-slate-500 block">कुल पेटियां</span>
                      <strong className="text-sm text-slate-900">{totalCartons}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-rose-200 shadow-sm">
                      <span className="text-[10px] text-slate-500 block">कुल रकम</span>
                      <strong className="text-sm text-emerald-800">₹{totalAmt.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-rose-800 mt-1">
                    यह एक्शन इस लोड के सभी बिल और लोडिंग रिकॉर्ड्स को डेटाबेस से डिलीट कर देगा।
                  </p>
                </div>
              );
            })()}

            {/* Safety Backup Tip */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs flex items-center justify-between gap-2">
              <div className="text-blue-900 text-[11px]">
                <i className="fa-solid fa-shield-halved text-blue-600 mr-1"></i>
                <strong>सुरक्षा सुझाव:</strong> डिलीट करने से पहले आप डेटा बैकअप ले सकते हैं।
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteLoadModalOpen(false);
                  setIsBackupModalOpen(true);
                }}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shrink-0"
              >
                💾 पहले बैकअप लें
              </button>
            </div>

            {deleteLoadMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                deleteLoadMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'
              }`}>
                {deleteLoadMsg.text}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsDeleteLoadModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLoad}
                disabled={isDeletingLoad || !loadToDelete || loadToDelete === 'ALL'}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-black text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <i className={`fa-solid ${isDeletingLoad ? 'fa-spinner fa-spin' : 'fa-trash-can'}`}></i>
                {isDeletingLoad ? 'Deleting...' : `हाँ, Load #${loadToDelete} डिलीट करें`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATA BACKUP & RESTORE MODAL (LOCAL DRIVE & CLOUD) */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-5 border border-slate-200 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-lg font-black shadow-md">
                  <i className="fa-solid fa-cloud-arrow-down"></i>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    💾 Data Backup & Cloud Storage (डेटा बैकअप व रिस्टोर)
                  </h3>
                  <p className="text-xs text-slate-500">
                    सिस्टम का पूरा डेटा (बिल्स, पार्टी, गाड़ियाँ, पेमेंट्स) लोकल ड्राइव या गूगल ड्राइव पर सुरक्षित रखें
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Current Data Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center font-mono">
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">Total Bills</span>
                <strong className="text-base text-cadbury-900">{orders.length}</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">Retail Parties</span>
                <strong className="text-base text-blue-900">{parties.length}</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">Delivery Vans</span>
                <strong className="text-base text-emerald-900">{vehicles.length}</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">Products</span>
                <strong className="text-base text-purple-900">{products.length}</strong>
              </div>
            </div>

            {backupSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
                {backupSuccessMsg}
              </div>
            )}

            {/* SECTION 1: Local Drive & Pen Drive Backup */}
            <div className="p-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-hard-drive text-blue-700 text-base"></i>
                <h4 className="text-xs font-black text-blue-950 uppercase tracking-wide">
                  1. Local Drive / Pen Drive Backup (कंप्यूटर या पेन ड्राइव में सेव करें)
                </h4>
              </div>
              <p className="text-[11px] text-slate-600">
                एक क्लिक में अपने कंप्यूटर के Downloads, Documents या Pen Drive (USB) में सुरक्षित बैकअप फाइल डाउनलोड करें:
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {/* JSON Full Backup Button */}
                <button
                  type="button"
                  onClick={handleDownloadLocalBackup}
                  disabled={isExportingBackup}
                  className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                >
                  <i className={`fa-solid ${isExportingBackup ? 'fa-spinner fa-spin' : 'fa-download'} text-gold-300`}></i>
                  {isExportingBackup ? 'Downloading...' : '📥 Download Database Backup (.JSON)'}
                </button>

                {/* Choose Folder Directly */}
                <button
                  type="button"
                  onClick={handleSaveToLocalFolderDirectly}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-blue-300 text-blue-900 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                  title="विंडोज फ़ाइल पिकर से अपनी पसंद का फ़ोल्डर चुनें"
                >
                  <i className="fa-solid fa-folder-open text-amber-500"></i>
                  📁 Choose Folder to Save Directly
                </button>

                {/* Excel Export Button */}
                <button
                  type="button"
                  onClick={handleExportBillsExcel}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 active:scale-95 transition-all"
                  title="सभी बिलों का एक्सेल स्प्रेडशीट डाउनलोड करें"
                >
                  <i className="fa-solid fa-file-excel text-emerald-300"></i>
                  📊 Export Bills to Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* SECTION 2: Cloud Storage (Google Drive / OneDrive) */}
            <div className="p-4 bg-gradient-to-r from-sky-50/70 to-teal-50/70 border border-sky-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-cloud text-sky-700 text-base"></i>
                <h4 className="text-xs font-black text-sky-950 uppercase tracking-wide">
                  2. Cloud Storage Backup (गूगल ड्राइव या वनड्राइव पर रखें)
                </h4>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                अपने बैकअप को Google Drive या Microsoft OneDrive पर स्टोर करने के लिए:
              </p>
              <div className="bg-white/80 p-3 rounded-lg border border-sky-100 text-[11px] text-slate-700 space-y-1">
                <div>1️⃣ ऊपर दिए गए <strong>Download Database Backup</strong> बटन से फ़ाइल डाउनलोड करें।</div>
                <div>2️⃣ नीचे <strong>Open Google Drive</strong> दबाएं और फ़ाइल को अपने ड्राइव फ़ोल्डर में ड्रैग & ड्रॉप (Upload) कर दें।</div>
                <div>💡 <em>टिप: यदि आप Google Drive Desktop ऐप उपयोग करते हैं, तो 'Choose Folder' बटन से सीधे Google Drive फ़ोल्डर में सेव कर सकते हैं!</em></div>
              </div>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenCloudDrive('google')}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-emerald-600 to-blue-600 hover:opacity-90 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <i className="fa-brands fa-google-drive text-white"></i>
                  🚀 Open Google Drive (गूगल ड्राइव खोलें)
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenCloudDrive('onedrive')}
                  className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <i className="fa-brands fa-microsoft text-white"></i>
                  ☁️ Open OneDrive
                </button>

                <button
                  type="button"
                  onClick={handleCopyBackupToClipboard}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                  title="पूरा बैकअप JSON टेक्स्ट कॉपी करें"
                >
                  <i className="fa-solid fa-copy text-slate-500"></i>
                  📋 Copy JSON to Clipboard
                </button>
              </div>
            </div>

            {/* SECTION 3: Restore Data from Backup */}
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-rotate-left text-purple-700 text-base"></i>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  3. Restore Data from Backup (बैकअप से डेटा वापस लाएं)
                </h4>
              </div>
              <p className="text-[11px] text-slate-600">
                यदि आपको किसी पुराने बैकअप `.json` फ़ाइल से सिस्टम डेटा वापस लोड करना हो:
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleSelectRestoreFile}
                  className="file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cadbury-900 file:text-white hover:file:bg-cadbury-800 text-xs text-slate-600 border border-slate-300 rounded-lg p-1 bg-white cursor-pointer flex-1"
                />

                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isRestoringBackup || !restoreFileJson}
                  className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-40"
                >
                  <i className={`fa-solid ${isRestoringBackup ? 'fa-spinner fa-spin' : 'fa-upload'} text-gold-300`}></i>
                  {isRestoringBackup ? 'Restoring...' : '⚡ Restore All Data (रिस्टोर करें)'}
                </button>
              </div>

              {restoreStatus && (
                <div className={`p-2.5 rounded-lg text-xs font-bold ${
                  restoreStatus.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                    : restoreStatus.type === 'error'
                    ? 'bg-rose-50 text-rose-800 border border-rose-300'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}>
                  {restoreStatus.text}
                </div>
              )}
            </div>

            {/* SECTION 4: Clear All Previous Data (Clean Slate for Real Data) */}
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-trash-can text-rose-600 text-base"></i>
                <h4 className="text-xs font-black text-rose-950 uppercase tracking-wide">
                  4. Clear All Previous Data (नया डेटा भरने हेतु पुराना डेटा साफ़ करें)
                </h4>
              </div>
              <p className="text-[11px] text-slate-600">
                यदि आप सभी पुराने टेस्ट / डेमो बिल और पार्टियाँ हटाकर अपना असली नया डेटा शुरू से भरना चाहते हैं, तो यह बटन दबाएं। लॉगिन यूज़र्स और कैडबरी प्रोडक्ट्स सुरक्षित रहेंगे।
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleClearAllData}
                  disabled={isClearingAllData}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                >
                  <i className={`fa-solid ${isClearingAllData ? 'fa-spinner fa-spin' : 'fa-broom'} text-white`}></i>
                  {isClearingAllData ? 'Clearing Data...' : '🧹 Clear All Previous Data (पुराना डेटा पूरी तरह साफ़ करें)'}
                </button>
              </div>
            </div>

            {/* Footer close */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD CREW ITEM POPUP (Van, Driver, Loader, Cashier) */}
      {quickAddCat && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md border-2 border-cadbury-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                {quickAddCat === 'vans' && <><i className="fa-solid fa-truck text-cadbury-700"></i> नई डिलीवरी वैन जोड़ें (Add Delivery Van)</>}
                {quickAddCat === 'drivers' && <><i className="fa-solid fa-id-card text-blue-700"></i> नया ड्राइवर व बीट जोड़ें (Add Driver & Beat)</>}
                {quickAddCat === 'loaders' && <><i className="fa-solid fa-boxes-packing text-purple-700"></i> नया लोडर व बे जोड़ें (Add Loader & Bay)</>}
                {quickAddCat === 'cashiers' && <><i className="fa-solid fa-hand-holding-dollar text-emerald-700"></i> नया कैशियर व काउंटर जोड़ें (Add Cashier)</>}
              </h3>
              <button
                type="button"
                onClick={() => setQuickAddCat(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {quickAddCat === 'vans' ? 'Van Number / Name (e.g. V7, V8, MH 02 EK 9999) *' :
                   quickAddCat === 'drivers' ? 'Driver Name (e.g. Praveen Kumar) *' :
                   quickAddCat === 'loaders' ? 'Loader Name (e.g. Suraj (LDR)) *' :
                   'Cashier / Collection Name (e.g. Manish (Cashier)) *'}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  placeholder="नाम या नंबर दर्ज करें..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-cadbury-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {quickAddCat === 'vans' ? 'Vehicle Type / Model (e.g. Tata Ace, Mahindra Bolero)' :
                   quickAddCat === 'drivers' ? 'Assigned Beat / Area (e.g. Bhandup West Beat)' :
                   quickAddCat === 'loaders' ? 'Warehouse Bay / Dock (e.g. Bay 2, Dock 4)' :
                   'Collection Counter / Location (e.g. Station Road Counter)'}
                </label>
                <input
                  type="text"
                  value={quickAddExtra}
                  onChange={(e) => setQuickAddExtra(e.target.value)}
                  placeholder="विवरण दर्ज करें..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-cadbury-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setQuickAddCat(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!quickAddName.trim()) {
                    alert('कृपया नाम या नंबर दर्ज करें');
                    return;
                  }
                  handleSaveCrewMasterItem(quickAddCat, quickAddName, quickAddExtra);
                  setQuickAddCat(null);
                  setTripCrewSavedMsg(`✅ ${quickAddName} सफलतापूर्वक मास्टर लिस्ट में जुड़ गया व चुन लिया गया!`);
                  setTimeout(() => setTripCrewSavedMsg(''), 4000);
                }}
                className="px-4 py-2 bg-cadbury-900 hover:bg-cadbury-950 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <i className="fa-solid fa-floppy-disk text-gold-400"></i>
                <span>💾 Save & Apply (सेव व लागू करें)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL CREW & FLEET MASTER MANAGER MODAL */}
      {isCrewMasterModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-3xl border-2 border-cadbury-900 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-black uppercase mb-1">
                  <i className="fa-solid fa-users-gear text-purple-700"></i> Fleet & Staff Master Management
                </div>
                <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  👥 वैन, ड्राइवर, लोडर व कैशियर मास्टर (Fleet & Crew Master)
                </h3>
                <p className="text-xs text-slate-500">
                  यहां से आप नई डिलीवरी वैन (V1 से V6 व अन्य), नए ड्राइवर, लोडर और कैशियर जोड़ या हटा सकते हैं।
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCrewMasterModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => { setCrewModalTab('vans'); setCrewNewNameInput(''); setCrewNewExtraInput(''); }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  crewModalTab === 'vans'
                    ? 'bg-cadbury-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <i className="fa-solid fa-truck"></i>
                <span>🚚 Vans ({crewMaster.vans.length})</span>
              </button>

              <button
                type="button"
                onClick={() => { setCrewModalTab('drivers'); setCrewNewNameInput(''); setCrewNewExtraInput(''); }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  crewModalTab === 'drivers'
                    ? 'bg-blue-700 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <i className="fa-solid fa-id-card"></i>
                <span>🪪 Drivers ({crewMaster.drivers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => { setCrewModalTab('loaders'); setCrewNewNameInput(''); setCrewNewExtraInput(''); }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  crewModalTab === 'loaders'
                    ? 'bg-purple-700 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <i className="fa-solid fa-boxes-packing"></i>
                <span>📦 Loaders ({crewMaster.loaders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => { setCrewModalTab('cashiers'); setCrewNewNameInput(''); setCrewNewExtraInput(''); }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  crewModalTab === 'cashiers'
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <i className="fa-solid fa-hand-holding-dollar"></i>
                <span>💵 Cashiers ({crewMaster.cashiers.length})</span>
              </button>
            </div>

            {/* Quick Add Form for Active Tab */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                {crewModalTab === 'vans' ? '➕ नई वैन जोड़ें (e.g. V7, Tata Ace, MH 02...):' :
                 crewModalTab === 'drivers' ? '➕ नया ड्राइवर जोड़ें (नाम व बीट/एरिया):' :
                 crewModalTab === 'loaders' ? '➕ नया लोडर जोड़ें (नाम व वेयरहाउस बे):' :
                 '➕ नया कैशियर जोड़ें (नाम व काउंटर लोकेशन):'}
              </span>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={crewNewNameInput}
                  onChange={(e) => setCrewNewNameInput(e.target.value)}
                  placeholder={
                    crewModalTab === 'vans' ? 'Van No (e.g. V7, MH 02 AB 1234)' :
                    crewModalTab === 'drivers' ? 'Driver Name (e.g. Ramesh)' :
                    crewModalTab === 'loaders' ? 'Loader Name (e.g. Arjun (LDR))' :
                    'Cashier Name (e.g. Tejas (Cashier))'
                  }
                  className="w-full sm:w-1/2 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                />
                <input
                  type="text"
                  value={crewNewExtraInput}
                  onChange={(e) => setCrewNewExtraInput(e.target.value)}
                  placeholder={
                    crewModalTab === 'vans' ? 'Model / Type (e.g. Tata Ace)' :
                    crewModalTab === 'drivers' ? 'Beat (e.g. Bhandup West Beat)' :
                    crewModalTab === 'loaders' ? 'Bay Location (e.g. Bay 2)' :
                    'Counter Location (e.g. Village Road)'
                  }
                  className="w-full sm:w-1/2 px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!crewNewNameInput.trim()) {
                      alert('कृपया नाम या नंबर दर्ज करें');
                      return;
                    }
                    handleSaveCrewMasterItem(crewModalTab, crewNewNameInput, crewNewExtraInput);
                    setCrewNewNameInput('');
                    setCrewNewExtraInput('');
                  }}
                  className="w-full sm:w-auto px-4 py-1.5 bg-cadbury-900 hover:bg-cadbury-950 text-white font-bold text-xs rounded-lg shadow-sm whitespace-nowrap active:scale-95"
                >
                  <i className="fa-solid fa-plus mr-1"></i> Add to Master
                </button>
              </div>
            </div>

            {/* List / Table of Items */}
            <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 uppercase text-[10px] font-bold text-slate-700 sticky top-0">
                  <tr>
                    <th className="p-2 border-b border-slate-200 w-10 text-center">#</th>
                    <th className="p-2 border-b border-slate-200">नाम / नंबर (Name)</th>
                    <th className="p-2 border-b border-slate-200">
                      {crewModalTab === 'vans' ? 'गाड़ी का प्रकार (Type)' :
                       crewModalTab === 'drivers' ? 'बीट / एरिया (Beat)' :
                       crewModalTab === 'loaders' ? 'बे लोकेशन (Bay)' :
                       'काउंटर लोकेशन (Location)'}
                    </th>
                    <th className="p-2 border-b border-slate-200 text-center w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {crewMaster[crewModalTab]?.map((item, idx) => {
                    const extraVal = (item as any).type || (item as any).beat || (item as any).bay || (item as any).location || '-';
                    const isCurrentlySelected =
                      crewModalTab === 'vans' ? tripEditVan.toUpperCase() === item.name.toUpperCase() :
                      crewModalTab === 'drivers' ? tripEditDriver.toLowerCase() === item.name.toLowerCase() :
                      crewModalTab === 'loaders' ? tripEditLoader.toLowerCase() === item.name.toLowerCase() :
                      tripEditCashier.toLowerCase() === item.name.toLowerCase();

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-900 flex items-center gap-1.5">
                          {crewModalTab === 'vans' && <i className="fa-solid fa-truck text-cadbury-700 text-[11px]"></i>}
                          {crewModalTab === 'drivers' && <i className="fa-solid fa-id-card text-blue-700 text-[11px]"></i>}
                          {crewModalTab === 'loaders' && <i className="fa-solid fa-boxes-packing text-purple-700 text-[11px]"></i>}
                          {crewModalTab === 'cashiers' && <i className="fa-solid fa-hand-holding-dollar text-emerald-700 text-[11px]"></i>}
                          <span>{item.name}</span>
                          {isCurrentlySelected && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-slate-600">{extraVal}</td>
                        <td className="p-2 text-center space-x-1 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (crewModalTab === 'vans') setTripEditVan(item.name);
                              if (crewModalTab === 'drivers') {
                                setTripEditDriver(item.name);
                                if ((item as any).beat) setTripEditDriverLocation((item as any).beat);
                              }
                              if (crewModalTab === 'loaders') {
                                setTripEditLoader(item.name);
                                if ((item as any).bay) setTripEditLoaderLocation((item as any).bay);
                              }
                              if (crewModalTab === 'cashiers') {
                                setTripEditCashier(item.name);
                                if ((item as any).location) setTripEditCashierLocation((item as any).location);
                              }
                              setIsCrewMasterModalOpen(false);
                            }}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded border border-emerald-300"
                            title="इस ट्रिप के लिए चुनें"
                          >
                            ✓ Select
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCrewMasterItem(crewModalTab, item.id, item.name)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded border border-rose-300"
                            title="मास्टर से हटाएं"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Close footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-[11px] text-slate-500 italic">
                💡 यहां जो भी वैन, ड्राइवर, लोडर या कैशियर जोड़ेंगे वह हमेशा के लिए सुरक्षित रहेगा।
              </span>
              <button
                type="button"
                onClick={() => setIsCrewMasterModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED SCREEN & PRINT STYLES */}
      <style>{`
        .print-only {
          display: none !important;
        }
        @media print {
          .print-only {
            display: inline-block !important;
          }
          @page {
            size: A4 portrait;
            margin: 7mm 6mm 7mm 6mm;
          }
          html, body, #root {
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-trip-sheet-modal-backdrop, #printable-trip-sheet-modal-card {
            position: static !important;
            display: block !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
          #printable-trip-sheet, #printable-trip-sheet * {
            visibility: visible !important;
          }
          #printable-trip-sheet {
            position: relative !important;
            display: block !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            border: none !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          #printable-evening-settlement, #printable-evening-settlement * {
            visibility: visible !important;
          }
          #printable-evening-settlement {
            position: relative !important;
            display: block !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            border: none !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          #printable-cash-envelope-slip, #printable-cash-envelope-slip * {
            visibility: visible !important;
          }
          #printable-cash-envelope-slip {
            position: relative !important;
            display: block !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            max-width: 680px !important;
            margin: 0 auto !important;
            padding: 4mm !important;
            background: white !important;
            border: 2px dashed #000000 !important;
            overflow: visible !important;
          }
          #printable-bulk-invoices-sheet, #printable-bulk-invoices-sheet * {
            visibility: visible !important;
          }
          #printable-bulk-invoices-sheet {
            position: relative !important;
            display: block !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            border: none !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          #printable-cadbury-invoice, #printable-cadbury-invoice * {
            visibility: visible !important;
          }
          #printable-cadbury-invoice {
            position: relative !important;
            display: block !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            border: none !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          th, td {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            font-weight: 700 !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #000000 !important;
            font-weight: 800 !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .trip-sheet-pdf-page {
            width: 100% !important;
            min-height: 275mm !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 2mm 0 !important;
            box-sizing: border-box !important;
            border: none !important;
            margin: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .trip-sheet-pdf-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
            min-height: auto !important;
          }
          .party-cell {
            text-align: left !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            overflow: visible !important;
            text-overflow: clip !important;
            max-width: none !important;
            font-size: 9.5px !important;
            line-height: 1.2 !important;
          }
        }
      `}</style>
    </div>
  );
};
