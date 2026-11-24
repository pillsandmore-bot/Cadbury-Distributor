import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { 
  GoodsStage, 
  DMSDashboardStats,
  Party,
  Order,
  Vehicle,
  LoaderTask,
  PaymentTransaction,
  CadburyProduct,
  DeliveryRoute,
  SalesReturn,
  AppUser
} from "./src/types/cadbury.js";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"]
    },
    maxHttpBufferSize: 50e6
  });

  const PORT = process.env.PORT || 3000;
  const dataDir = path.join(process.cwd(), 'data');
  const initialDataPath = path.join(dataDir, 'cadbury_initial_data.json');
  const runtimeDataPath = path.join(dataDir, 'cadbury_store.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load Database State
  let store: {
    products: CadburyProduct[];
    parties: Party[];
    routes: DeliveryRoute[];
    vehicles: Vehicle[];
    orders: Order[];
    loaderTasks: LoaderTask[];
    payments: PaymentTransaction[];
    returns: SalesReturn[];
    users: AppUser[];
  } = {
    products: [],
    parties: [],
    routes: [],
    vehicles: [],
    orders: [],
    loaderTasks: [],
    payments: [],
    returns: [],
    users: []
  };

  function loadStore() {
    try {
      if (fs.existsSync(runtimeDataPath)) {
        store = JSON.parse(fs.readFileSync(runtimeDataPath, 'utf8'));
      } else if (fs.existsSync(initialDataPath)) {
        store = JSON.parse(fs.readFileSync(initialDataPath, 'utf8'));
        saveStore();
      }
    } catch (e) {
      console.error("Error loading cadbury store:", e);
    }
  }

  function saveStore() {
    try {
      fs.writeFileSync(runtimeDataPath, JSON.stringify(store, null, 2));
    } catch (e) {
      console.error("Error saving cadbury store:", e);
    }
  }

  loadStore();

  // Helper: Calculate DMS Dashboard KPIs
  function calculateKPIs(): DMSDashboardStats {
    const totalOrders = store.orders.length;
    const deliveredCount = store.orders.filter(o => o.deliveryStatus === 'Delivered').length;
    const pendingDelivery = store.orders.filter(o => o.deliveryStatus !== 'Delivered').length;
    const todaysSales = store.orders.reduce((acc, o) => acc + (o.totalBill || 0), 0);
    const totalParties = store.parties.length;
    const totalVehicles = store.vehicles.length;
    const marketOutstanding = store.parties.reduce((acc, p) => acc + (p.currentOutstanding || 0), 0);
    
    // Daily collection
    const todayStr = new Date().toISOString().split('T')[0];
    const todayPayments = store.payments.filter(p => p.date === todayStr);
    const todaysCollection = todayPayments.reduce((acc, p) => acc + (p.creditAmount || 0), 0);
    const cashCollected = todayPayments.filter(p => p.paymentMethod === 'Cash').reduce((acc, p) => acc + (p.creditAmount || 0), 0);
    const upiCollected = todayPayments.filter(p => p.paymentMethod === 'UPI').reduce((acc, p) => acc + (p.creditAmount || 0), 0);
    
    const loadingPending = store.loaderTasks.filter(t => t.status === 'Pending' || t.status === 'Loading').length;
    const outForDelivery = store.vehicles.filter(v => v.status === 'On Delivery Route').length;
    const cartonsLoadedToday = store.loaderTasks.reduce((acc, t) => acc + (t.cartonsLoaded || 0), 0);

    return {
      totalOrders,
      todaysSales,
      totalParties,
      totalVehicles,
      loadingPending,
      outForDelivery,
      deliveredCount,
      totalDelivery: deliveredCount,
      pendingDelivery,
      todaysCollection,
      dailyCollection: todaysCollection,
      marketOutstanding,
      pendingPayment: marketOutstanding,
      cartonsLoadedToday,
      cashCollectedToday: cashCollected,
      upiCollectedToday: upiCollected
    };
  }

  // Live Vehicle Telemetry Simulator (simulates moving along delivery route)
  setInterval(() => {
    let changed = false;
    store.vehicles = store.vehicles.map(v => {
      if (v.status === 'On Delivery Route') {
        const latDelta = (Math.random() - 0.49) * 0.0006;
        const lngDelta = (Math.random() - 0.49) * 0.0006;
        v.currentLat = Number((v.currentLat + latDelta).toFixed(6));
        v.currentLng = Number((v.currentLng + lngDelta).toFixed(6));
        v.speedKmH = Math.floor(20 + Math.random() * 25);
        v.temperatureC = Number((18.5 + (Math.random() * 1.2)).toFixed(1));
        v.lastLocationUpdate = new Date().toISOString();
        changed = true;
      }
      return v;
    });

    if (changed) {
      saveStore();
      io.emit('vehicle_telemetry', store.vehicles);
    }
  }, 5000);

  // Socket.IO Real-time Connection
  io.on("connection", (socket) => {
    console.log("Client connected to Cadbury DMS:", socket.id);
    
    socket.emit("initial_data", {
      stats: calculateKPIs(),
      products: store.products,
      parties: store.parties,
      routes: store.routes,
      vehicles: store.vehicles,
      orders: store.orders,
      loaderTasks: store.loaderTasks,
      payments: store.payments,
      returns: store.returns,
      users: store.users
    });
  });

  // REST API Endpoints
  
  // 1. Dashboard Stats
  app.get("/api/cadbury/dashboard", (req, res) => {
    res.json({
      success: true,
      stats: calculateKPIs(),
      activeVehicles: store.vehicles,
      recentOrders: store.orders.slice(0, 5),
      recentPayments: store.payments.slice(0, 5)
    });
  });

  // 2. Products & Stock
  app.get("/api/cadbury/products", (req, res) => {
    res.json(store.products);
  });

  app.put("/api/cadbury/products/:id/stock", (req, res) => {
    const prod = store.products.find(p => p.id === req.params.id);
    if (!prod) return res.status(404).json({ error: "Product not found" });

    Object.assign(prod, req.body);
    saveStore();
    io.emit("stock_updated", store.products);
    res.json({ success: true, product: prod });
  });

  // 3. Routes Master
  app.get("/api/cadbury/routes", (req, res) => {
    res.json(store.routes || []);
  });

  app.post("/api/cadbury/routes", (req, res) => {
    const newRoute: DeliveryRoute = {
      id: `rt-${Date.now()}`,
      code: req.body.code,
      name: req.body.name,
      areas: req.body.areas || [],
      assignedVehicleNumber: req.body.assignedVehicleNumber,
      assignedDriverName: req.body.assignedDriverName,
      totalParties: 0,
      activeOrders: 0,
      description: req.body.description
    };
    if (!store.routes) store.routes = [];
    store.routes.push(newRoute);
    saveStore();
    io.emit("routes_updated", store.routes);
    res.json({ success: true, route: newRoute });
  });

  // 4. Party Management
  app.get("/api/cadbury/parties", (req, res) => {
    res.json(store.parties);
  });

  app.post("/api/cadbury/parties", (req, res) => {
    const newParty: Party = {
      id: `pty-${Date.now()}`,
      code: req.body.code || `PTY-${store.parties.length + 101}`,
      name: req.body.name,
      ownerName: req.body.ownerName || '',
      shopAddress: req.body.shopAddress,
      area: req.body.area || 'Mumbai',
      routeId: req.body.routeId,
      routeName: req.body.routeName,
      pincode: req.body.pincode || '400001',
      mobileNumber: req.body.mobileNumber,
      altMobileNumber: req.body.altMobileNumber || '',
      whatsappNumber: req.body.whatsappNumber || req.body.mobileNumber,
      gstNumber: req.body.gstNumber || '',
      openingBalance: Number(req.body.openingBalance) || 0,
      currentOutstanding: Number(req.body.openingBalance) || 0,
      creditLimit: Number(req.body.creditLimit) || 50000,
      latitude: Number(req.body.latitude) || 19.2812,
      longitude: Number(req.body.longitude) || 72.8561,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0]
    };
    store.parties.push(newParty);
    saveStore();
    io.emit("party_updated", store.parties);
    res.json({ success: true, party: newParty });
  });

  // 5. Vehicles & Live Tracking
  app.get("/api/cadbury/vehicles", (req, res) => {
    res.json(store.vehicles);
  });

  app.put("/api/cadbury/vehicles/:id/status", (req, res) => {
    const v = store.vehicles.find(veh => veh.id === req.params.id);
    if (v) {
      v.status = req.body.status;
      if (req.body.status === 'Completed' || req.body.status === 'Available') {
        v.speedKmH = 0;
      }
      saveStore();
      io.emit("vehicle_telemetry", store.vehicles);
      res.json({ success: true, vehicle: v });
    } else {
      res.status(404).json({ error: "Vehicle not found" });
    }
  });

  // Update Van Crew (Driver, Loader/LDR, Cashier / Delivery Boy)
  app.put("/api/cadbury/vehicles/:id/crew", (req, res) => {
    const v = store.vehicles.find(veh => veh.id === req.params.id);
    if (!v) return res.status(404).json({ error: "Vehicle not found" });

    if (req.body.driverName) v.driverName = req.body.driverName;
    if (req.body.driverMobile) v.driverMobile = req.body.driverMobile;
    if (req.body.loaderName || req.body.helperLoaderName) {
      v.helperLoaderName = req.body.loaderName || req.body.helperLoaderName;
      v.loaderName = v.helperLoaderName;
    }
    if (req.body.cashierName) v.cashierName = req.body.cashierName;
    if (req.body.cashierMobile) v.cashierMobile = req.body.cashierMobile;
    if (req.body.assignedRoute) v.assignedRoute = req.body.assignedRoute;

    saveStore();
    io.emit("vehicle_telemetry", store.vehicles);
    res.json({ success: true, vehicle: v });
  });

  // Add New Vehicle / Van
  app.post("/api/cadbury/vehicles", (req, res) => {
    const newVeh: Vehicle = {
      id: `veh-${Date.now()}`,
      vehicleNumber: req.body.vehicleNumber || `MH 02 Z ${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleType: req.body.vehicleType || 'Tata Ace Gold',
      capacityCartons: Number(req.body.capacityCartons) || 150,
      driverName: req.body.driverName || 'New Driver',
      driverMobile: req.body.driverMobile || '9800000000',
      helperLoaderName: req.body.loaderName || req.body.helperLoaderName || 'Loader Staff',
      loaderName: req.body.loaderName || req.body.helperLoaderName || 'Loader Staff',
      cashierName: req.body.cashierName || 'Cashier / Delivery Boy',
      cashierMobile: req.body.cashierMobile || '9800000000',
      assignedRoute: req.body.assignedRoute || 'Route 1',
      status: 'Available',
      currentLat: 19.2812,
      currentLng: 72.8561,
      speedKmH: 0,
      temperatureC: 18.5,
      batteryLevel: 100,
      totalAssignedOrders: 0,
      deliveredOrders: 0,
      pendingOrders: 0,
      totalBillAmount: 0,
      collectedAmount: 0,
      lastLocationUpdate: new Date().toISOString(),
      routeStops: []
    };
    store.vehicles.push(newVeh);
    saveStore();
    io.emit("vehicle_telemetry", store.vehicles);
    res.json({ success: true, vehicle: newVeh });
  });

  // 6. Orders & Billing
  app.get("/api/cadbury/orders", (req, res) => {
    res.json(store.orders);
  });

  app.post("/api/cadbury/orders", (req, res) => {
    const orderNumber = `ORD-CAD-${store.orders.length + 101}`;
    const invoiceNumber = `INV-2026-${store.orders.length + 101}`;
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      invoiceNumber,
      partyId: req.body.partyId,
      partyName: req.body.partyName,
      partyAddress: req.body.partyAddress,
      partyArea: req.body.partyArea || 'Mumbai',
      partyMobile: req.body.partyMobile,
      partyGst: req.body.partyGst || '',
      partyLat: req.body.partyLat || 19.2812,
      partyLng: req.body.partyLng || 72.8561,
      items: req.body.items || [],
      totalCartons: Number(req.body.totalCartons) || 0,
      subtotal: Number(req.body.subtotal) || 0,
      discountAmount: Number(req.body.discountAmount) || 0,
      gstAmount: Number(req.body.gstAmount) || 0,
      totalBill: Number(req.body.totalBill) || 0,
      orderDate: req.body.orderDate || new Date().toISOString().split('T')[0],
      deliveryDate: req.body.deliveryDate || new Date().toISOString().split('T')[0],
      stage: GoodsStage.WAREHOUSE,
      loadingStatus: 'Pending',
      cartonsLoaded: 0,
      cartonsDifference: 0,
      deliveryStatus: 'Pending',
      deliverySequence: store.orders.length + 1,
      paymentStatus: 'Pending',
      paidAmount: 0,
      pendingAmount: Number(req.body.totalBill) || 0,
      vehicleNumber: req.body.vehicleNumber || 'MH 02 EK 4589',
      driverName: req.body.driverName || 'Santosh Yadav',
      loaderName: req.body.loaderName || 'Ramesh Kumar',
      cashierName: req.body.cashierName || req.body.deliveryBoyName || 'Suresh Patil',
      deliveryBoyName: req.body.cashierName || req.body.deliveryBoyName || 'Suresh Patil'
    };

    const party = store.parties.find(p => p.id === newOrder.partyId);
    if (party) {
      party.currentOutstanding += newOrder.totalBill;
      party.lastOrderDate = newOrder.orderDate;
    }

    // Loader Task
    const loaderTask: LoaderTask = {
      id: `lt-${Date.now()}`,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      partyName: newOrder.partyName,
      loaderName: newOrder.loaderName || 'Ramesh Kumar',
      employeeId: 'LDR-001',
      vehicleNumber: newOrder.vehicleNumber || 'MH 02 EK 4589',
      loadingDate: newOrder.orderDate,
      cartonsToLoad: newOrder.totalCartons,
      cartonsLoaded: 0,
      cartonsDifference: 0,
      itemsChecklist: newOrder.items.map(it => ({
        productName: it.productName,
        ordered: it.cartons,
        loaded: 0,
        difference: 0
      })),
      status: 'Pending',
      notes: 'New order booking created',
      updatedAt: new Date().toISOString()
    };
    store.loaderTasks.push(loaderTask);

    // Ledger Debit Entry
    const ledgerEntry: PaymentTransaction = {
      id: `pay-${Date.now()}`,
      partyId: newOrder.partyId,
      partyName: newOrder.partyName,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      date: newOrder.orderDate,
      type: 'INVOICE',
      paymentMethod: 'Credit',
      referenceNo: newOrder.invoiceNumber,
      debitAmount: newOrder.totalBill,
      creditAmount: 0,
      runningBalance: party ? party.currentOutstanding : newOrder.totalBill,
      collectedBy: 'Sales Invoicing',
      notes: `Tax Invoice for ${newOrder.totalCartons} Cadbury Cartons`
    };
    store.payments.push(ledgerEntry);

    store.orders.unshift(newOrder);
    saveStore();
    io.emit("order_updated", store.orders);
    io.emit("loader_updated", store.loaderTasks);
    io.emit("party_updated", store.parties);
    io.emit("payment_updated", store.payments);
    res.json({ success: true, order: newOrder });
  });

  // Bulk Import Orders & Bills (Excel / CSV)
  app.post("/api/cadbury/orders/bulk-import", (req, res) => {
    const importedOrdersList = Array.isArray(req.body.orders) ? req.body.orders : [];
    if (importedOrdersList.length === 0) {
      return res.status(400).json({ error: "No orders found to import" });
    }

    const createdOrders: Order[] = [];

    importedOrdersList.forEach((ordData: any, idx: number) => {
      const orderNumber = ordData.orderNumber || `ORD-CAD-${store.orders.length + 101 + idx}`;
      const invoiceNumber = ordData.invoiceNumber || `INV-2026-${store.orders.length + 101 + idx}`;
      
      let party = store.parties.find(p => 
        (ordData.partyId && p.id === ordData.partyId) || 
        p.name.toLowerCase() === (ordData.partyName || '').toLowerCase()
      );

      const totalBill = Number(ordData.totalBill) || Number(ordData.subtotal) || 0;
      const totalCartons = Number(ordData.totalCartons) || (ordData.items ? ordData.items.reduce((s: number, i: any) => s + (Number(i.cartons) || 0), 0) : 5);

      if (!party) {
        party = {
          id: `pty-imp-${Date.now()}-${idx}`,
          code: `PTY-${store.parties.length + 101}`,
          name: ordData.partyName || `Retail Customer ${idx + 1}`,
          ownerName: ordData.partyName || 'Proprietor',
          shopAddress: ordData.partyAddress || 'Shop No. 4, Market Road, Mumbai',
          area: ordData.partyArea || 'Mumbai Zone',
          pincode: '400093',
          mobileNumber: ordData.partyMobile || `98200${Math.floor(10000 + Math.random() * 90000)}`,
          gstNumber: ordData.partyGst || '27AABCC1234F1Z5',
          creditLimit: 50000,
          openingBalance: 0,
          currentOutstanding: totalBill,
          totalOrdersCount: 1,
          latitude: 19.1136 + (Math.random() - 0.5) * 0.04,
          longitude: 72.8697 + (Math.random() - 0.5) * 0.04,
          lastOrderDate: ordData.orderDate || new Date().toISOString().split('T')[0]
        };
        store.parties.push(party);
      } else {
        party.currentOutstanding += totalBill;
        party.lastOrderDate = ordData.orderDate || new Date().toISOString().split('T')[0];
        party.totalOrdersCount = (party.totalOrdersCount || 0) + 1;
      }

      const newOrder: Order = {
        id: `ord-imp-${Date.now()}-${idx}`,
        orderNumber,
        invoiceNumber,
        partyId: party ? party.id : (ordData.partyId || `pty-custom-${idx}`),
        partyName: party ? party.name : (ordData.partyName || 'Retail Customer'),
        partyAddress: party ? party.shopAddress : (ordData.partyAddress || 'Mumbai'),
        partyArea: party ? party.area : (ordData.partyArea || 'Mumbai'),
        partyMobile: party ? party.mobileNumber : (ordData.partyMobile || '9820000000'),
        partyGst: party ? party.gstNumber : (ordData.partyGst || '27AABCC1234F1Z5'),
        partyLat: party ? party.latitude : 19.2812,
        partyLng: party ? party.longitude : 72.8561,
        items: ordData.items && ordData.items.length > 0 ? ordData.items : [
          {
            productId: 'cad-1',
            productCode: 'CAD-DM-01',
            productName: ordData.productName || 'Cadbury Dairy Milk 13.2g',
            category: 'Cadbury Dairy Milk',
            cartons: totalCartons || 5,
            units: (totalCartons || 5) * 240,
            ratePerCarton: Math.round(totalBill / (totalCartons || 1)),
            discountPercent: 0,
            gstPercent: 18,
            totalAmount: totalBill
          }
        ],
        totalCartons,
        subtotal: ordData.subtotal ? Number(ordData.subtotal) : Math.round(totalBill / 1.18),
        discountAmount: Number(ordData.discountAmount) || 0,
        gstAmount: ordData.gstAmount ? Number(ordData.gstAmount) : Math.round(totalBill - (totalBill / 1.18)),
        totalBill,
        orderDate: ordData.orderDate || new Date().toISOString().split('T')[0],
        deliveryDate: ordData.deliveryDate || new Date().toISOString().split('T')[0],
        stage: GoodsStage.WAREHOUSE,
        loadingStatus: 'Pending',
        cartonsLoaded: 0,
        cartonsDifference: 0,
        deliveryStatus: 'Pending',
        deliverySequence: store.orders.length + 1,
        paymentStatus: 'Pending',
        paidAmount: 0,
        pendingAmount: totalBill,
        vehicleNumber: ordData.vehicleNumber || 'MH 02 EK 4589',
        driverName: ordData.driverName || 'Santosh Yadav',
        loaderName: ordData.loaderName || 'Ramesh Kumar',
        cashierName: ordData.cashierName || ordData.deliveryBoyName || 'Suresh Patil',
        deliveryBoyName: ordData.cashierName || ordData.deliveryBoyName || 'Suresh Patil',
        billType: ordData.billType || (ordData.paymentMode === 'Credit' ? 'CREDIT' : 'CASH'),
        loadNumber: ordData.loadNumber || '189',
        salesmanCode: ordData.salesmanCode || ordData.sman || 'KR101'
      };

      // Loader Task
      const loaderTask: LoaderTask = {
        id: `lt-imp-${Date.now()}-${idx}`,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        partyName: newOrder.partyName,
        loaderName: newOrder.loaderName || 'Ramesh Kumar',
        employeeId: 'LDR-001',
        vehicleNumber: newOrder.vehicleNumber || 'MH 02 EK 4589',
        loadingDate: newOrder.orderDate,
        cartonsToLoad: newOrder.totalCartons,
        cartonsLoaded: 0,
        cartonsDifference: 0,
        itemsChecklist: newOrder.items.map(it => ({
          productName: it.productName,
          ordered: it.cartons,
          loaded: 0,
          difference: 0
        })),
        status: 'Pending',
        notes: 'Bulk Imported Order',
        updatedAt: new Date().toISOString()
      };
      store.loaderTasks.push(loaderTask);

      // Ledger Debit Entry
      const ledgerEntry: PaymentTransaction = {
        id: `pay-imp-${Date.now()}-${idx}`,
        partyId: newOrder.partyId,
        partyName: newOrder.partyName,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        date: newOrder.orderDate,
        type: 'INVOICE',
        paymentMethod: 'Credit',
        referenceNo: newOrder.invoiceNumber,
        debitAmount: newOrder.totalBill,
        creditAmount: 0,
        runningBalance: party ? party.currentOutstanding : newOrder.totalBill,
        collectedBy: 'Bill Import Desk',
        notes: `Imported Tax Invoice (${newOrder.totalCartons} Box)`
      };
      store.payments.push(ledgerEntry);

      // Update in-place if orderNumber already exists, otherwise unshift
      const existingIdx = store.orders.findIndex(o => o.orderNumber === newOrder.orderNumber);
      if (existingIdx !== -1) {
        store.orders[existingIdx] = { ...store.orders[existingIdx], ...newOrder, id: store.orders[existingIdx].id };
        createdOrders.push(store.orders[existingIdx]);
      } else {
        store.orders.unshift(newOrder);
        createdOrders.push(newOrder);
      }
    });

    saveStore();
    io.emit("order_updated", store.orders);
    io.emit("loader_updated", store.loaderTasks);
    io.emit("party_updated", store.parties);
    io.emit("payment_updated", store.payments);
    res.json({ success: true, count: createdOrders.length, orders: createdOrders });
  });

  // 7. Complete Goods Tracking Stage
  app.put("/api/cadbury/orders/:id/stage", (req, res) => {
    const order = store.orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const newStage = req.body.stage as GoodsStage;
    order.stage = newStage;

    if (newStage === GoodsStage.LOADING) {
      order.loadingStatus = 'In Progress';
      order.loadingStartedAt = new Date().toLocaleTimeString();
    } else if (newStage === GoodsStage.LOADED) {
      order.loadingStatus = 'Loaded';
      order.cartonsLoaded = order.totalCartons;
      order.loadingCompletedAt = new Date().toLocaleTimeString();
    } else if (newStage === GoodsStage.IN_TRANSIT) {
      order.deliveryStatus = 'Out For Delivery';
    } else if (newStage === GoodsStage.DELIVERED) {
      order.deliveryStatus = 'Delivered';
      order.deliveredAt = new Date().toLocaleTimeString();
    } else if (newStage === GoodsStage.COMPLETED) {
      order.paymentStatus = 'Paid';
      order.paidAmount = order.totalBill;
      order.pendingAmount = 0;
    }

    saveStore();
    io.emit("order_updated", store.orders);
    res.json({ success: true, order });
  });

  // Update single order crew & dispatch details
  app.put("/api/cadbury/orders/:id/crew", (req, res) => {
    const order = store.orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (req.body.vehicleNumber !== undefined) order.vehicleNumber = req.body.vehicleNumber;
    if (req.body.driverName !== undefined) order.driverName = req.body.driverName;
    if (req.body.loaderName !== undefined) order.loaderName = req.body.loaderName;
    if (req.body.cashierName !== undefined) {
      order.cashierName = req.body.cashierName;
      order.deliveryBoyName = req.body.cashierName;
    }
    if (req.body.loadNumber !== undefined) order.loadNumber = req.body.loadNumber;

    // Also update associated loaderTask if present
    const lTask = store.loaderTasks.find(t => t.orderId === order.id);
    if (lTask) {
      if (order.loaderName) lTask.loaderName = order.loaderName;
      if (order.vehicleNumber) lTask.vehicleNumber = order.vehicleNumber;
    }

    saveStore();
    io.emit("order_updated", store.orders);
    io.emit("loader_updated", store.loaderTasks);
    res.json({ success: true, order });
  });

  // Batch update crew for multiple orders
  app.put("/api/cadbury/orders/batch-crew", (req, res) => {
    const { orderIds, vehicleNumber, driverName, loaderName, cashierName, loadNumber, cartonsLoaded, driverLocation, loaderLocation, cashierLocation } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: "orderIds array is required" });
    }

    const updatedOrders: Order[] = [];
    store.orders.forEach(order => {
      if (orderIds.includes(order.id) || orderIds.includes(order.orderNumber)) {
        if (vehicleNumber) order.vehicleNumber = vehicleNumber;
        if (driverName) order.driverName = driverName;
        if (loaderName) order.loaderName = loaderName;
        if (cashierName) {
          order.cashierName = cashierName;
          order.deliveryBoyName = cashierName;
        }
        if (loadNumber) order.loadNumber = loadNumber;
        if (cartonsLoaded !== undefined) order.cartonsLoaded = Number(cartonsLoaded);
        if (driverLocation) (order as any).driverLocation = driverLocation;
        if (loaderLocation) (order as any).loaderLocation = loaderLocation;
        if (cashierLocation) (order as any).cashierLocation = cashierLocation;

        const lTask = store.loaderTasks.find(t => t.orderId === order.id);
        if (lTask) {
          if (loaderName) lTask.loaderName = loaderName;
          if (vehicleNumber) lTask.vehicleNumber = vehicleNumber;
          if (cartonsLoaded !== undefined) lTask.cartonsLoaded = Number(cartonsLoaded);
        }
        updatedOrders.push(order);
      }
    });

    saveStore();
    io.emit("order_updated", store.orders);
    io.emit("loader_updated", store.loaderTasks);
    res.json({ success: true, count: updatedOrders.length, orders: updatedOrders });
  });

  // Batch settle / update collection for trip sheet orders
  app.post("/api/cadbury/orders/batch-settle", (req, res) => {
    const { bills, loadNumber } = req.body;
    if (!Array.isArray(bills)) {
      return res.status(400).json({ error: "bills array is required" });
    }

    let updatedCount = 0;
    bills.forEach((b: any) => {
      const ord = store.orders.find(o => o.id === b.orderId || o.orderNumber === b.orderNumber);
      if (ord) {
        if (b.deliveryStatus) ord.deliveryStatus = b.deliveryStatus;
        if (b.paidAmount !== undefined) ord.paidAmount = b.paidAmount;
        if (b.pendingAmount !== undefined) ord.pendingAmount = b.pendingAmount;
        if (b.paymentMode) ord.paymentMode = b.paymentMode;
        (ord as any).cashAmount = b.cashAmount;
        (ord as any).chequeInfo = b.chequeInfo;
        (ord as any).chequeAmount = b.chequeAmount;
        (ord as any).creditAmount = b.creditAmount;
        (ord as any).recd = b.recd;
        (ord as any).partyStamp = b.partyStamp;
        updatedCount++;
      }
    });

    saveStore();
    io.emit("order_updated", store.orders);
    res.json({ success: true, count: updatedCount });
  });

  // Trip Evening Return & Settlement APIs
  app.get("/api/cadbury/trips/settlements", (req, res) => {
    res.json(store.tripSettlements || []);
  });

  app.post("/api/cadbury/trips/settlements", (req, res) => {
    const settlementData = req.body;
    if (!settlementData) return res.status(400).json({ error: "Settlement data required" });

    const newSettlement = {
      id: settlementData.id || `settle-${Date.now()}`,
      settlementNumber: settlementData.settlementNumber || `SET-${settlementData.loadNumber || 'TRIP'}-${Date.now().toString().slice(-6)}`,
      settlementDate: settlementData.settlementDate || new Date().toISOString().split('T')[0],
      settlementTime: settlementData.settlementTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      loadNumber: settlementData.loadNumber || '',
      vanNumber: settlementData.vanNumber || '',
      driverName: settlementData.driverName || '',
      driverLocation: settlementData.driverLocation || '',
      loaderName: settlementData.loaderName || '',
      loaderLocation: settlementData.loaderLocation || '',
      cashierName: settlementData.cashierName || '',
      cashierLocation: settlementData.cashierLocation || '',
      boxesDispatched: Number(settlementData.boxesDispatched) || 0,
      boxesDelivered: Number(settlementData.boxesDelivered) || 0,
      boxesReturned: Number(settlementData.boxesReturned) || 0,
      totalTripDispatched: Number(settlementData.totalTripDispatched) || 0,
      actualCashCollected: Number(settlementData.actualCashCollected) || 0,
      actualChequeCollected: Number(settlementData.actualChequeCollected) || 0,
      actualUpiCollected: Number(settlementData.actualUpiCollected) || 0,
      creditAllowed: Number(settlementData.creditAllowed) || 0,
      returnGoodsValue: Number(settlementData.returnGoodsValue) || 0,
      totalAccounted: Number(settlementData.totalAccounted) || 0,
      shortageOrExcess: Number(settlementData.shortageOrExcess) || 0,
      cheques: settlementData.cheques || [],
      upis: settlementData.upis || [],
      returns: settlementData.returns || [],
      bills: settlementData.bills || [],
      remarks: settlementData.remarks || '',
      createdAt: new Date().toISOString()
    };

    if (!store.tripSettlements) store.tripSettlements = [];
    store.tripSettlements.unshift(newSettlement);

    // Update affected orders if bill statuses were submitted
    if (Array.isArray(settlementData.bills) && settlementData.bills.length > 0) {
      settlementData.bills.forEach((b: any) => {
        const order = store.orders.find(o => o.id === b.orderId || o.orderNumber === b.orderNumber);
        if (order) {
          if (b.deliveryStatus) {
            order.deliveryStatus = b.deliveryStatus;
            if (b.deliveryStatus === 'Delivered') {
              order.stage = GoodsStage.COMPLETED;
            } else if (b.deliveryStatus === 'Return Goods' || b.deliveryStatus === 'Returned') {
              order.deliveryStatus = 'Return Goods';
            }
          }
          if (b.paymentMode) order.paymentMode = b.paymentMode;
          if (b.paidAmount !== undefined) {
            order.paidAmount = Number(b.paidAmount);
            order.pendingAmount = Math.max(0, order.totalBill - order.paidAmount);
            if (order.paidAmount >= order.totalBill) {
              order.paymentStatus = 'Paid';
            } else if (order.paidAmount > 0) {
              order.paymentStatus = 'Partial';
            }
          }
        }
      });
    }

    saveStore();
    io.emit("settlement_updated", store.tripSettlements);
    io.emit("order_updated", store.orders);
    res.json({ success: true, settlement: newSettlement });
  });

  // 8. Loader Task Update
  app.get("/api/cadbury/loader-tasks", (req, res) => {
    res.json(store.loaderTasks);
  });

  app.put("/api/cadbury/loader-tasks/:id", (req, res) => {
    const task = store.loaderTasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    task.cartonsLoaded = req.body.cartonsLoaded !== undefined ? Number(req.body.cartonsLoaded) : task.cartonsLoaded;
    task.cartonsDifference = req.body.cartonsDifference !== undefined ? Number(req.body.cartonsDifference) : (task.cartonsLoaded - task.cartonsToLoad);
    task.status = req.body.status || task.status;
    task.notes = req.body.notes || task.notes;
    task.updatedAt = new Date().toISOString();

    const order = store.orders.find(o => o.id === task.orderId);
    if (order) {
      order.cartonsLoaded = task.cartonsLoaded;
      order.cartonsDifference = task.cartonsDifference;
      if (task.status === 'Loaded') {
        order.loadingStatus = 'Loaded';
        order.stage = GoodsStage.LOADED;
      }
    }

    saveStore();
    io.emit("loader_updated", store.loaderTasks);
    io.emit("order_updated", store.orders);
    res.json({ success: true, task });
  });

  // 9. Delivery Complete (Mobile POD)
  app.put("/api/cadbury/delivery/:id/complete", (req, res) => {
    const order = store.orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const { paymentMethod, amountPaid, signatureData, photoData, remarks, receiverName, status } = req.body;

    order.deliveryStatus = status || 'Delivered';
    order.deliveredAt = new Date().toLocaleTimeString();
    order.receiverName = receiverName || 'Shopkeeper';
    order.partySignature = signatureData || order.partySignature;
    order.deliveryPhoto = photoData || order.deliveryPhoto;
    order.deliveryRemarks = remarks || 'Delivered successfully';
    
    const paid = Number(amountPaid) || 0;
    order.paidAmount = paid;
    order.pendingAmount = Math.max(0, order.totalBill - paid);
    order.paymentMode = paymentMethod;

    if (paid >= order.totalBill) {
      order.paymentStatus = 'Paid';
      order.stage = GoodsStage.COMPLETED;
    } else if (paid > 0) {
      order.paymentStatus = 'Partial';
      order.stage = GoodsStage.PAYMENT_PENDING;
    }

    const party = store.parties.find(p => p.id === order.partyId);
    if (party && paid > 0) {
      party.currentOutstanding = Math.max(0, party.currentOutstanding - paid);
    }

    if (paid > 0) {
      const paymentEntry: PaymentTransaction = {
        id: `pay-${Date.now()}`,
        partyId: order.partyId,
        partyName: order.partyName,
        orderId: order.id,
        orderNumber: order.orderNumber,
        date: new Date().toISOString().split('T')[0],
        type: 'RECEIPT',
        paymentMethod: paymentMethod || 'UPI',
        referenceNo: req.body.refNumber || `DEL-REC-${Date.now().toString().slice(-6)}`,
        debitAmount: 0,
        creditAmount: paid,
        runningBalance: party ? party.currentOutstanding : 0,
        collectedBy: order.deliveryBoyName || 'Delivery Boy',
        notes: `Delivery Door Collection: ${paymentMethod}`
      };
      store.payments.push(paymentEntry);
    }

    saveStore();
    io.emit("order_updated", store.orders);
    io.emit("party_updated", store.parties);
    io.emit("payment_updated", store.payments);
    res.json({ success: true, order });
  });

  // 10. Payments & Hisab-Kitab
  app.get("/api/cadbury/payments", (req, res) => {
    res.json(store.payments);
  });

  app.post("/api/cadbury/payments", (req, res) => {
    const { partyId, amount, paymentMethod, referenceNo, notes, collectedBy } = req.body;
    const party = store.parties.find(p => p.id === partyId);
    if (!party) return res.status(404).json({ error: "Party not found" });

    const creditVal = Number(amount) || 0;
    party.currentOutstanding = Math.max(0, party.currentOutstanding - creditVal);

    const payment: PaymentTransaction = {
      id: `pay-${Date.now()}`,
      partyId,
      partyName: party.name,
      date: req.body.date || new Date().toISOString().split('T')[0],
      type: 'RECEIPT',
      paymentMethod: paymentMethod || 'Cash',
      referenceNo: referenceNo || `RCPT-${Date.now().toString().slice(-6)}`,
      debitAmount: 0,
      creditAmount: creditVal,
      runningBalance: party.currentOutstanding,
      collectedBy: collectedBy || 'Accountant Counter',
      notes: notes || 'Counter collection',
      denominations: req.body.denominations
    };

    store.payments.push(payment);
    saveStore();
    io.emit("payment_updated", store.payments);
    io.emit("party_updated", store.parties);
    res.json({ success: true, payment, party });
  });

  // 11. Sales Returns & Damage
  app.get("/api/cadbury/returns", (req, res) => {
    res.json(store.returns || []);
  });

  app.post("/api/cadbury/returns", (req, res) => {
    const newReturn: SalesReturn = {
      id: `ret-${Date.now()}`,
      returnNumber: req.body.returnNumber || `RET-CAD-${(store.returns?.length || 0) + 101}`,
      invoiceNumber: req.body.invoiceNumber,
      orderNumber: req.body.orderNumber || 'ORD-CAD',
      partyId: req.body.partyId,
      partyName: req.body.partyName,
      productCode: req.body.productCode,
      productName: req.body.productName,
      cartons: Number(req.body.cartons) || 1,
      returnReason: req.body.returnReason,
      amount: Number(req.body.amount) || 0,
      approvalStatus: 'Pending Approval',
      createdAt: new Date().toISOString().split('T')[0],
      notes: req.body.notes
    };
    if (!store.returns) store.returns = [];
    store.returns.unshift(newReturn);
    saveStore();
    io.emit("returns_updated", store.returns);
    res.json({ success: true, returnItem: newReturn });
  });

  app.put("/api/cadbury/returns/:id/approve", (req, res) => {
    if (!store.returns) return res.status(404).json({ error: "No returns found" });
    const ret = store.returns.find(r => r.id === req.params.id);
    if (!ret) return res.status(404).json({ error: "Return claim not found" });

    ret.approvalStatus = 'Approved';
    ret.creditNoteNumber = `CN-2026-${Date.now().toString().slice(-4)}`;

    // Credit party ledger
    const party = store.parties.find(p => p.id === ret.partyId);
    if (party) {
      party.currentOutstanding = Math.max(0, party.currentOutstanding - ret.amount);
      const ledgerEntry: PaymentTransaction = {
        id: `pay-${Date.now()}`,
        partyId: ret.partyId,
        partyName: ret.partyName,
        date: new Date().toISOString().split('T')[0],
        type: 'CREDIT_NOTE',
        paymentMethod: 'Credit',
        referenceNo: ret.creditNoteNumber,
        debitAmount: 0,
        creditAmount: ret.amount,
        runningBalance: party.currentOutstanding,
        collectedBy: 'Returns Dept',
        notes: `Credit Note for return claim: ${ret.returnReason}`
      };
      store.payments.push(ledgerEntry);
    }

    saveStore();
    io.emit("returns_updated", store.returns);
    io.emit("party_updated", store.parties);
    io.emit("payment_updated", store.payments);
    res.json({ success: true, returnItem: ret });
  });

  // 12. Users
  app.get("/api/cadbury/users", (req, res) => {
    res.json(store.users || []);
  });

  // Create User
  app.post("/api/cadbury/users", (req, res) => {
    try {
      const { name, username, password, role, phone, email, employeeId, vehicleAssigned, allowedModules, status, canEditOrders, canDeleteOrders, canExportReports, canAccessAdminDashboard } = req.body;
      if (!name || !username) {
        return res.status(400).json({ error: "Name aur Username zaroori hain" });
      }

      // Check username uniqueness
      const existingUser = (store.users || []).find(u => u.username.toLowerCase() === String(username).trim().toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: `User ID "${username}" pehle se maujood hai. Kripya doosra Username chunein.` });
      }

      const newUser: AppUser = {
        id: `usr-${Date.now()}`,
        name: String(name).trim(),
        username: String(username).trim(),
        password: password ? String(password).trim() : 'cadbury123',
        role: role || Role.SALESMAN,
        phone: phone || '',
        email: email || '',
        employeeId: employeeId || `CAD-EMP-${Math.floor(100 + Math.random() * 900)}`,
        vehicleAssigned: vehicleAssigned || '',
        status: status || 'Active',
        allowedModules: Array.isArray(allowedModules) ? allowedModules : ['orders', 'parties'],
        canEditOrders: canEditOrders ?? true,
        canDeleteOrders: canDeleteOrders ?? false,
        canExportReports: canExportReports ?? true,
        canAccessAdminDashboard: canAccessAdminDashboard ?? (role === Role.ADMIN),
        createdAt: new Date().toISOString()
      };

      if (!store.users) store.users = [];
      store.users.push(newUser);
      saveStore();

      io.emit("users_updated", store.users);
      console.log(`👤 New user created: ${newUser.name} (${newUser.username}) [${newUser.role}]`);

      res.status(201).json({ success: true, user: newUser, message: `User "${newUser.name}" safaltapoorvak ban gaya!` });
    } catch (err: any) {
      res.status(500).json({ error: "User create karne me samasya: " + err.message });
    }
  });

  // Update User
  app.put("/api/cadbury/users/:id", (req, res) => {
    try {
      const { id } = req.params;
      const index = (store.users || []).findIndex(u => u.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "User nahi mila" });
      }

      const { name, username, password, role, phone, email, employeeId, vehicleAssigned, allowedModules, status, canEditOrders, canDeleteOrders, canExportReports, canAccessAdminDashboard } = req.body;

      if (username) {
        const duplicate = store.users.find(u => u.id !== id && u.username.toLowerCase() === String(username).trim().toLowerCase());
        if (duplicate) {
          return res.status(400).json({ error: `User ID "${username}" kisi doosre user ke paas pehle se hai.` });
        }
      }

      const existing = store.users[index];
      const updated: AppUser = {
        ...existing,
        name: name !== undefined ? String(name).trim() : existing.name,
        username: username !== undefined ? String(username).trim() : existing.username,
        password: password ? String(password).trim() : (existing.password || 'cadbury123'),
        role: role !== undefined ? role : existing.role,
        phone: phone !== undefined ? phone : existing.phone,
        email: email !== undefined ? email : existing.email,
        employeeId: employeeId !== undefined ? employeeId : existing.employeeId,
        vehicleAssigned: vehicleAssigned !== undefined ? vehicleAssigned : existing.vehicleAssigned,
        status: status !== undefined ? status : (existing.status || 'Active'),
        allowedModules: Array.isArray(allowedModules) ? allowedModules : existing.allowedModules,
        canEditOrders: canEditOrders !== undefined ? canEditOrders : existing.canEditOrders,
        canDeleteOrders: canDeleteOrders !== undefined ? canDeleteOrders : existing.canDeleteOrders,
        canExportReports: canExportReports !== undefined ? canExportReports : existing.canExportReports,
        canAccessAdminDashboard: canAccessAdminDashboard !== undefined ? canAccessAdminDashboard : existing.canAccessAdminDashboard
      };

      store.users[index] = updated;
      saveStore();

      io.emit("users_updated", store.users);
      console.log(`👤 User updated: ${updated.name} (${updated.username})`);

      res.json({ success: true, user: updated, message: `User "${updated.name}" update ho gaya!` });
    } catch (err: any) {
      res.status(500).json({ error: "User update karne me samasya: " + err.message });
    }
  });

  // Delete User
  app.delete("/api/cadbury/users/:id", (req, res) => {
    try {
      const { id } = req.params;
      const userToDelete = (store.users || []).find(u => u.id === id);
      if (!userToDelete) {
        return res.status(404).json({ error: "User nahi mila" });
      }

      if (userToDelete.username === 'admin' || userToDelete.id === 'usr-1') {
        return res.status(403).json({ error: "Main Admin user ko delete nahi kiya ja sakta!" });
      }

      store.users = store.users.filter(u => u.id !== id);
      saveStore();

      io.emit("users_updated", store.users);
      console.log(`🗑️ User deleted: ${userToDelete.name} (${userToDelete.username})`);

      res.json({ success: true, message: `User "${userToDelete.name}" safaltapoorvak delete kar diya gaya.` });
    } catch (err: any) {
      res.status(500).json({ error: "User delete karne me samasya: " + err.message });
    }
  });

  // Authenticate / Login endpoint
  app.post("/api/cadbury/auth/login", (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username aur Password dono daalna zaroori hai." });
      }

      const user = (store.users || []).find(u => u.username.toLowerCase() === String(username).trim().toLowerCase());
      if (!user) {
        return res.status(401).json({ success: false, message: `User ID "${username}" exist nahi karta.` });
      }

      if (user.status === 'Inactive') {
        return res.status(403).json({ success: false, message: "Aapka account Inactive/Disabled hai. Kripya Admin se sampark karein." });
      }

      // Check password (fallback to default 'cadbury123' if not set)
      const userPass = user.password || 'cadbury123';
      if (userPass !== String(password).trim()) {
        return res.status(401).json({ success: false, message: "Galat Password! Kripya sahi password dalein." });
      }

      res.json({ success: true, user, message: `Swagatam, ${user.name}!` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: "Login me takleef: " + err.message });
    }
  });

  // 13. Reset / Seed Master Data
  app.post("/api/cadbury/reset-data", (req, res) => {
    if (fs.existsSync(initialDataPath)) {
      store = JSON.parse(fs.readFileSync(initialDataPath, 'utf8'));
      saveStore();
      io.emit("initial_data", {
        stats: calculateKPIs(),
        products: store.products,
        parties: store.parties,
        routes: store.routes,
        vehicles: store.vehicles,
        orders: store.orders,
        loaderTasks: store.loaderTasks,
        payments: store.payments,
        returns: store.returns,
        users: store.users
      });
      res.json({ success: true, message: "Cadbury DMS reset to initial demo state" });
    } else {
      res.status(500).json({ error: "Initial seed file not found" });
    }
  });

  // 14. Delete Load Sheet by Load Number (to clear unwanted old loads and free database memory)
  app.delete("/api/cadbury/loads/:loadNumber", (req, res) => {
    try {
      const rawLoad = req.params.loadNumber;
      if (!rawLoad || rawLoad === 'ALL') {
        return res.status(400).json({ error: "Kripya valid Load Number chunein." });
      }

      const loadStr = String(rawLoad).trim();
      const ordersToDelete = store.orders.filter(o => String(o.loadNumber || '').trim() === loadStr);
      const deleteCount = ordersToDelete.length;

      if (deleteCount === 0) {
        return res.status(404).json({ error: `Load No. #${loadStr} me koi bill nahi mila.` });
      }

      const orderIdsToDelete = new Set(ordersToDelete.map(o => o.id));

      // Remove from orders
      store.orders = store.orders.filter(o => !orderIdsToDelete.has(o.id));

      // Remove corresponding loaderTasks
      if (Array.isArray(store.loaderTasks)) {
        store.loaderTasks = store.loaderTasks.filter(t => !orderIdsToDelete.has(t.orderId));
      }

      // Remove corresponding settlements if any
      if (Array.isArray(store.tripSettlements)) {
        store.tripSettlements = store.tripSettlements.filter(s => String(s.loadNumber || '').trim() !== loadStr);
      }

      saveStore();

      // Broadcast updates to all connected clients
      io.emit("order_updated", store.orders);
      if (store.loaderTasks) io.emit("loader_updated", store.loaderTasks);
      if (store.tripSettlements) io.emit("settlement_updated", store.tripSettlements);
      io.emit("initial_data", {
        stats: calculateKPIs(),
        products: store.products,
        parties: store.parties,
        routes: store.routes,
        vehicles: store.vehicles,
        orders: store.orders,
        loaderTasks: store.loaderTasks,
        payments: store.payments,
        returns: store.returns,
        tripSettlements: store.tripSettlements,
        users: store.users
      });

      console.log(`🗑️ Deleted Load #${loadStr} (${deleteCount} orders). Remaining orders: ${store.orders.length}`);

      res.json({
        success: true,
        message: `Load No. #${loadStr} ke sabhi ${deleteCount} bills safaltapoorvak delete ho gaye!`,
        deletedCount: deleteCount,
        loadNumber: loadStr,
        remainingOrders: store.orders.length
      });
    } catch (err: any) {
      console.error("Error deleting load:", err);
      res.status(500).json({ error: "Load delete karne me samasya aayi: " + err.message });
    }
  });

  // 14B. Clear All Previous Data (Clean Slate for Real New Data Entry)
  app.post("/api/cadbury/clear-all-data", (req, res) => {
    try {
      const oldOrdersCount = store.orders.length;
      const oldPartiesCount = store.parties.length;

      // Clear transactional data
      store.orders = [];
      store.loaderTasks = [];
      store.parties = [];
      store.payments = [];
      store.returns = [];
      store.tripSettlements = [];

      // Reset stock & loaded cartons
      store.vehicles.forEach(v => { v.loadedCartons = 0; v.status = 'Available'; });
      store.products.forEach(p => { p.stockCartons = 0; p.availableStock = 0; p.reservedStock = 0; p.loadedStock = 0; p.damagedStock = 0; });

      saveStore();

      // Broadcast empty state
      io.emit("order_updated", []);
      io.emit("loader_updated", []);
      io.emit("parties_updated", []);
      io.emit("payments_updated", []);
      io.emit("returns_updated", []);
      io.emit("settlement_updated", []);
      io.emit("initial_data", {
        stats: calculateKPIs(),
        products: store.products,
        parties: store.parties,
        routes: store.routes,
        vehicles: store.vehicles,
        orders: store.orders,
        loaderTasks: store.loaderTasks,
        payments: store.payments,
        returns: store.returns,
        tripSettlements: store.tripSettlements,
        users: store.users
      });

      console.log(`🧹 All previous data cleared (${oldOrdersCount} orders, ${oldPartiesCount} parties). Ready for fresh data entry.`);

      res.json({
        success: true,
        message: `Sabhi purane ${oldOrdersCount} bills aur ${oldPartiesCount} parties safalta se clear ho gaye! Ab aap apna naya data fresh dhal sakte hain.`,
        clearedOrders: oldOrdersCount,
        clearedParties: oldPartiesCount
      });
    } catch (err: any) {
      console.error("Error clearing data:", err);
      res.status(500).json({ error: "Data clear karne me samasya aayi: " + err.message });
    }
  });

  // 15. Complete Database Backup Download (Local Drive & Cloud JSON)
  app.get("/api/cadbury/backup/download", (req, res) => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
      
      const backupData = {
        system: "Cadbury Distributor Management System",
        version: "2.0",
        backupTimestamp: now.toISOString(),
        backupDate: now.toLocaleDateString('en-GB'),
        summary: {
          totalOrders: store.orders.length,
          totalParties: store.parties.length,
          totalVehicles: store.vehicles.length,
          totalProducts: store.products.length,
          totalPayments: store.payments.length,
          totalLoaderTasks: store.loaderTasks?.length || 0,
          totalSettlements: store.tripSettlements?.length || 0
        },
        stats: calculateKPIs(),
        store: {
          products: store.products,
          parties: store.parties,
          routes: store.routes,
          vehicles: store.vehicles,
          orders: store.orders,
          loaderTasks: store.loaderTasks,
          payments: store.payments,
          returns: store.returns,
          tripSettlements: store.tripSettlements || [],
          users: store.users
        }
      };

      const filename = `Cadbury_DMS_Full_Backup_${dateStr}_${timeStr}.json`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(backupData, null, 2));
    } catch (err: any) {
      res.status(500).json({ error: "Backup generate karne me samasya: " + err.message });
    }
  });

  // 16. Complete Database Backup Restore
  app.post("/api/cadbury/backup/restore", (req, res) => {
    try {
      const payload = req.body;
      const incoming = payload.store || payload;

      if (!incoming || (!Array.isArray(incoming.orders) && !Array.isArray(incoming.parties))) {
        return res.status(400).json({ error: "Anya ya galat format ka backup file hai. Orders ya Parties data nahi mila." });
      }

      // Create pre-restore safety copy on disk
      try {
        const safetyPath = path.join(dataDir, `safety_backup_before_restore_${Date.now()}.json`);
        fs.writeFileSync(safetyPath, JSON.stringify(store, null, 2));
      } catch (err) {
        console.warn("Could not save safety backup file:", err);
      }

      if (Array.isArray(incoming.products)) store.products = incoming.products;
      if (Array.isArray(incoming.parties)) store.parties = incoming.parties;
      if (Array.isArray(incoming.routes)) store.routes = incoming.routes;
      if (Array.isArray(incoming.vehicles)) store.vehicles = incoming.vehicles;
      if (Array.isArray(incoming.orders)) store.orders = incoming.orders;
      if (Array.isArray(incoming.loaderTasks)) store.loaderTasks = incoming.loaderTasks;
      if (Array.isArray(incoming.payments)) store.payments = incoming.payments;
      if (Array.isArray(incoming.returns)) store.returns = incoming.returns;
      if (Array.isArray(incoming.tripSettlements)) store.tripSettlements = incoming.tripSettlements;
      if (Array.isArray(incoming.users)) store.users = incoming.users;

      saveStore();

      io.emit("initial_data", {
        stats: calculateKPIs(),
        products: store.products,
        parties: store.parties,
        routes: store.routes,
        vehicles: store.vehicles,
        orders: store.orders,
        loaderTasks: store.loaderTasks,
        payments: store.payments,
        returns: store.returns,
        tripSettlements: store.tripSettlements,
        users: store.users
      });

      console.log(`🔄 Database restored from backup. Orders: ${store.orders.length}, Parties: ${store.parties.length}`);

      res.json({
        success: true,
        message: "Data backup safaltapoorvak restore ho gaya!",
        totalOrders: store.orders.length,
        totalParties: store.parties.length
      });
    } catch (err: any) {
      console.error("Backup restore error:", err);
      res.status(500).json({ error: "Backup restore karne me samasya aayi: " + err.message });
    }
  });

  // Vite middleware in dev or static dist in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`🍫 Cadbury Distributor Management System live on http://localhost:${PORT}`);
  });
}

startServer();
