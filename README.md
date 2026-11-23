# 🍫 Cadbury Distributor Management & Live Tracking System (DMS)

Cadbury Distributor ke liye ek complete, robust aur real-time **Distributor Management System (DMS)** jo pure dispatch flow ko track karta hai:
**Warehouse ➔ Loader Packing ➔ Delivery Van ➔ Live GPS Route ➔ Retailer Delivery ➔ Cash/UPI Payment Collection ➔ Party Ledger**.

---

## 🌟 Key Modules & Capabilities

### 1. 🔄 Complete Goods Tracking Pipeline (Maal Ka Status)
* **Warehouse Stock**: Stock ready in warehouse bays, carton allocation.
* **Under Loading**: Loader assigns cartons to vehicles and scans/counts boxes.
* **Vehicle Loaded**: Loaded vehicle manifest verified and sealed.
* **Out for Delivery (In Transit)**: Live GPS telemetry active, real-time AC chocolate temperature monitoring (18°C–20°C).
* **Store Delivered**: Handed over to retail shopkeeper with digital signature & photo proof.
* **Payment Settled**: Real-time payment verification (Cash, UPI, Cheque, or Credit Ledger).

### 2. 🗺️ Live Vehicle & GPS Route Tracking (Google Maps Integration)
* Live interactive map powered by Leaflet & Google Maps tiles.
* Active vehicle location markers, driver details, speed (km/h), and battery status.
* **AC Compartment Cooling Telemetry**: Cadbury chocolate quality sensor monitoring.
* Sequential delivery stop pins (Delivered: Green, Next Stop: Blue, Pending: Orange).
* Direct **"Open in Google Maps"** navigation button for drivers and managers.

### 3. 👷 Loader Tracking & Warehouse Loading Desk
* Loader-specific mobile & desktop dashboard (Ramesh Kumar, Amit Verma, Sunil Gaud).
* Real-time carton counter (+1, +5, Load All) with progress bar per order.
* Status toggles: `Pending` ➔ `Loading` ➔ `Loaded` ➔ `Verified`.
* Discrepancy reporting and vehicle bay assignment.

### 4. 🛵 Delivery Boy Mobile Portal
* Responsive mobile interface designed for smartphones.
* Today's delivery stop sequence with Party Name, Address, and Bill Amount.
* One-click **Call Party** (`tel:`) and **WhatsApp Notification** (`wa.me/`).
* One-click **Google Maps Turn-by-Turn Navigation**.
* **Delivered Action Modal**:
  - Payment mode: UPI (with UTR ref), Cash, Cheque, Credit.
  - **HTML5 Digital Signature Canvas**: Party shopkeeper can sign directly with finger/stylus.
  - **Delivery Photo Proof**: Capture or upload photo of cartons at retail store.

### 5. 🏪 Party Management (Retailer Accounts)
* Complete master of shops and retailers across markets (Andheri, Bandra, Vile Parle, Malad, etc.).
* Party details: Owner Name, Address, Mobile, WhatsApp, GSTIN, Opening Balance, Current Dues, Credit Limit.
* Live GPS Geolocation capture button (`navigator.geolocation`).
* Instant WhatsApp account balance reminder link.

### 6. 🧾 Order & Cadbury GST Billing Management
* Pre-loaded Cadbury Product catalog (Dairy Milk, Silk, 5 Star, Perk, Fuse, Gems, Celebrations, Bournvita, Oreo, Chocobakes).
* Automatic Carton Calculation, Wholesale Carton Rates, Piece Rates, Discounts, and 18% GST.
* **Printable Tax Invoice PDF** with Cadbury branding, GST breakdown, and signature boxes.
* **Direct WhatsApp Bill Share** with formatted invoice text breakdown.

### 7. 💰 Payment & Hisab-Kitab Ledger
* **Party Se Payment Lena**: Cash & UPI receipt entries with instant running balance deduction.
* **Daily Collection Report**: Total Collected Today, Cash in Hand vs UPI Collection.
* **Party Ledger Statement**: Debit (Bills), Credit (Receipts), and real-time running balance.
* **Export to Excel / CSV** download for accounting & audits.

### 8. 👥 User Roles & Access Rights (RBAC)
| Role | Access Scope |
| :--- | :--- |
| **Admin** | Complete System Control & Financials |
| **Manager** | Logistics, Fleet GPS, Orders & Billing |
| **Accountant** | Invoices, Cash/UPI Payments & Party Ledgers |
| **Loader** | Loading Bays, Carton Counts & Manifests |
| **Delivery Boy** | Mobile Delivery List, Navigation, Collection & Signatures |
| **Salesman** | Retailer Directory & New Order Booking |

---

## 🚀 How to Run the Application

### Option 1: Double Click Launcher
Simply double-click `start-server.bat` in this folder. It will start the server on `http://localhost:3000`.

### Option 2: Terminal / Command Prompt
```bash
# Run server with live TypeScript execution & Vite middleware
npm start
# OR
npx tsx server.ts
```

Open your web browser and visit: **`http://localhost:3000`**

---

## 🗄️ Database Architecture

1. **Zero-Setup File Database (Default)**:
   - All data is saved automatically in `data/cadbury_store.json`.
   - Seed demo data is stored in `data/cadbury_initial_data.json`.
   - Ready to run immediately on any PC without installing MySQL.

2. **Production MySQL Database**:
   - Complete production schema is provided in [cadbury_dms_schema.sql](file:///d:/Cadbury%20Distributor/cadbury_dms_schema.sql).
   - Can be imported into MySQL / phpMyAdmin on Hostinger, Railway, cPanel, or VPS.

---

## 📱 Mobile App (Capacitor / Android Ready)
The UI is responsive and optimized for mobile devices. Delivery boys and warehouse loaders can access it via phone browser or install it as a PWA / Capacitor APK.
