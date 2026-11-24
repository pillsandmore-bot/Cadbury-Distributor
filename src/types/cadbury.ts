export enum Role {
    SUPER_ADMIN = 'Super Admin',
    ADMIN = 'Admin',
    MANAGER = 'Manager',
    ACCOUNTANT = 'Accountant',
    LOADER = 'Loader',
    DRIVER = 'Driver',
    DELIVERY_BOY = 'Delivery Boy',
    SALESMAN = 'Salesman'
}

export enum GoodsStage {
    WAREHOUSE = 'Warehouse',
    LOADING = 'Loading',
    LOADED = 'Loaded',
    IN_TRANSIT = 'In Transit',
    DELIVERED = 'Delivered',
    PAYMENT_PENDING = 'Payment Pending',
    COMPLETED = 'Completed'
}

export enum CadburyProductCategory {
    DAIRY_MILK = 'Cadbury Dairy Milk',
    SILK = 'Cadbury Silk',
    FIVE_STAR = 'Cadbury 5 Star',
    PERK = 'Cadbury Perk',
    FUSE = 'Cadbury Fuse',
    GEMS = 'Cadbury Gems',
    CELEBRATIONS = 'Cadbury Celebrations',
    BOURNVITA = 'Cadbury Bournvita',
    OREO = 'Cadbury Oreo & Biscuits',
    CHOCOBAKES = 'Cadbury Chocobakes',
    NUTTIES = 'Cadbury Nutties'
}

export interface CadburyProduct {
    id: string;
    code: string;
    barcode: string;
    name: string;
    category: CadburyProductCategory;
    unitsPerCarton: number;
    purchaseRate: number;
    cartonRate: number;
    pieceRate: number;
    mrp: number;
    gstPercent: number;
    batchNumber: string;
    expiryDate: string;
    openingStock: number;
    stockCartons: number;       // Current physical stock
    availableStock: number;     // Available for new bookings
    reservedStock: number;      // Booked in pending orders
    loadedStock: number;        // In delivery vans
    damagedStock: number;       // Damaged / Unsellable
    expiredStock: number;       // Expired
    minStockAlert: number;
    weight: string;
    description?: string;
}

export interface OrderItem {
    productId: string;
    productCode: string;
    productName: string;
    category: string;
    cartons: number;
    loadedCartons?: number;
    difference?: number;
    units: number;
    ratePerCarton: number;
    discountPercent: number;
    gstPercent: number;
    totalAmount: number;
}

export interface Party {
    id: string;
    code: string;
    name: string;
    ownerName: string;
    shopAddress: string;
    area: string;
    routeId?: string;
    routeName?: string;
    pincode: string;
    mobileNumber: string;
    altMobileNumber?: string;
    whatsappNumber: string;
    gstNumber: string;
    openingBalance: number;
    currentOutstanding: number;
    creditLimit: number;
    latitude: number;
    longitude: number;
    deliverySequence?: number;
    lastOrderDate?: string;
    isActive: boolean;
    createdAt: string;
}

export interface DeliveryRoute {
    id: string;
    name: string;              // e.g. "Route 1 – Bhayandar", "Route 2 – Mira Road"
    code: string;              // e.g. "RT-BHY"
    areas: string[];           // ["Bhayandar West", "Bhayandar East", "Uttan Road"]
    assignedVehicleNumber?: string;
    assignedDriverName?: string;
    totalParties: number;
    activeOrders: number;
    description?: string;
}

export interface Order {
    id: string;
    orderNumber: string;
    invoiceNumber: string;
    partyId: string;
    partyName: string;
    partyAddress: string;
    partyArea: string;
    routeId?: string;
    partyMobile: string;
    partyGst: string;
    partyLat: number;
    partyLng: number;
    items: OrderItem[];
    totalCartons: number;
    subtotal: number;
    discountAmount: number;
    gstAmount: number;
    totalBill: number;
    orderDate: string;
    deliveryDate: string;
    stage: GoodsStage;
    
    // Loader Info
    loaderId?: string;
    loaderName?: string;
    loadingStatus: 'Pending' | 'In Progress' | 'Loaded' | 'Discrepancy';
    cartonsLoaded: number;
    cartonsDifference?: number;
    loadingStartedAt?: string;
    loadingCompletedAt?: string;

    // Vehicle & Driver Info
    vehicleId?: string;
    vehicleNumber?: string;
    driverName?: string;
    driverMobile?: string;
    
    // Delivery Boy & Cashier Info
    deliveryBoyId?: string;
    deliveryBoyName?: string;
    deliveryBoyMobile?: string;
    cashierName?: string;
    cashierMobile?: string;
    deliveryStatus: 'Pending' | 'Out For Delivery' | 'Delivered' | 'Partial' | 'Party Not Available' | 'Return Goods';
    deliverySequence: number;
    deliveredAt?: string;
    receiverName?: string;
    deliveryRemarks?: string;

    // Payment Tracking
    paymentStatus: 'Pending' | 'Partial' | 'Paid';
    billType?: 'CASH' | 'CREDIT';
    loadNumber?: string;
    salesmanCode?: string;
    paidAmount: number;
    pendingAmount: number;
    paymentMode?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Credit';
    paymentRefNumber?: string;
    
    // Proof of Delivery (POD)
    partySignature?: string; // Base64 data URL
    deliveryPhoto?: string;  // Base64 data URL
}

export interface Vehicle {
    id: string;
    vehicleNumber: string;
    vehicleType: string;
    capacityCartons: number;
    driverName: string;
    driverMobile: string;
    helperLoaderName?: string;
    loaderName?: string;
    cashierName?: string;
    cashierMobile?: string;
    assignedRoute?: string;
    status: 'Available' | 'Loading' | 'On Delivery Route' | 'Delivered / Returning' | 'Maintenance' | 'Returned';
    currentLat: number;
    currentLng: number;
    speedKmH: number;
    temperatureC: number; // Cadbury chocolate cooling sensor
    batteryLevel: number;
    totalAssignedOrders: number;
    deliveredOrders: number;
    pendingOrders: number;
    totalBillAmount: number;
    collectedAmount: number;
    currentPartyDestination?: string;
    lastLocationUpdate: string;
    startTime?: string;
    returnTime?: string;
    routeStops: {
        orderId: string;
        orderNumber: string;
        partyName: string;
        area: string;
        lat: number;
        lng: number;
        sequence: number;
        status: 'Delivered' | 'Pending' | 'Next' | 'Failed';
        billAmount: number;
        cartons: number;
    }[];
}

export interface LoaderTask {
    id: string;
    orderId: string;
    orderNumber: string;
    partyName: string;
    loaderName: string;
    employeeId: string;
    vehicleNumber: string;
    loadingDate: string;
    cartonsToLoad: number;
    cartonsLoaded: number;
    cartonsDifference: number; // e.g. -2 or 0
    itemsChecklist?: {
        productName: string;
        ordered: number;
        loaded: number;
        difference: number;
    }[];
    status: 'Pending' | 'Loading' | 'Loaded' | 'Discrepancy' | 'Verified';
    notes?: string;
    updatedAt: string;
}

export interface SalesReturn {
    id: string;
    returnNumber: string;
    invoiceNumber: string;
    orderNumber: string;
    partyId: string;
    partyName: string;
    productCode: string;
    productName: string;
    cartons: number;
    returnReason: 'Damaged Product' | 'Expired Product' | 'Short Delivery' | 'Wrong Product' | 'Rate Difference' | 'Party Rejected';
    amount: number;
    photo?: string;
    approvalStatus: 'Pending Approval' | 'Approved' | 'Rejected';
    creditNoteNumber?: string;
    createdAt: string;
    notes?: string;
}

export interface PaymentTransaction {
    id: string;
    partyId: string;
    partyName: string;
    orderId?: string;
    orderNumber?: string;
    date: string;
    type: 'RECEIPT' | 'INVOICE' | 'RETURN' | 'CREDIT_NOTE';
    paymentMethod: 'Cash' | 'UPI' | 'Cheque' | 'Bank Transfer' | 'Credit';
    referenceNo?: string;
    debitAmount: number;  // Increases party's debt (Invoice)
    creditAmount: number; // Reduces party's debt (Payment received)
    runningBalance: number;
    collectedBy: string;
    notes?: string;
    denominations?: {
        note500?: number;
        note200?: number;
        note100?: number;
        note50?: number;
        note20?: number;
        note10?: number;
        coins?: number;
    };
}

export interface DMSDashboardStats {
    totalOrders: number;
    todaysSales: number;
    totalParties: number;
    totalVehicles: number;
    loadingPending: number;
    outForDelivery: number;
    deliveredCount: number;
    totalDelivery?: number;
    pendingDelivery: number;
    todaysCollection: number;
    dailyCollection?: number;
    marketOutstanding: number;
    pendingPayment?: number;
    cartonsLoadedToday?: number;
    cashCollectedToday: number;
    upiCollectedToday: number;
}

export interface AppUser {
    id: string;
    name: string;
    username: string;
    password?: string;
    role: Role;
    phone: string;
    email: string;
    employeeId?: string;
    avatar?: string;
    vehicleAssigned?: string;
    status?: 'Active' | 'Inactive';
    allowedModules?: string[];
    canEditOrders?: boolean;
    canDeleteOrders?: boolean;
    canExportReports?: boolean;
    canAccessAdminDashboard?: boolean;
    createdAt?: string;
}
