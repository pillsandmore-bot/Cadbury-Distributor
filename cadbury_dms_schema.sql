-- ====================================================================
-- CADBURY DISTRIBUTOR MANAGEMENT SYSTEM (DMS)
-- Complete Relational MySQL Database Schema & Seed Data
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `cadbury_dms` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `cadbury_dms`;

-- 1. USERS & ROLES
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(50) PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL DEFAULT '$2a$10$defaultHash',
    `full_name` VARCHAR(100) NOT NULL,
    `role` ENUM('Super Admin', 'Admin', 'Manager', 'Accountant', 'Loader', 'Driver', 'Delivery Boy', 'Salesman') NOT NULL DEFAULT 'Admin',
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100),
    `employee_id` VARCHAR(50),
    `vehicle_assigned` VARCHAR(50),
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. CADBURY PRODUCT MASTER & STOCK
CREATE TABLE IF NOT EXISTS `products` (
    `id` VARCHAR(50) PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `barcode` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `units_per_carton` INT NOT NULL DEFAULT 1,
    `purchase_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `carton_rate` DECIMAL(10,2) NOT NULL,
    `piece_rate` DECIMAL(10,2) NOT NULL,
    `mrp` DECIMAL(10,2) NOT NULL,
    `gst_percent` DECIMAL(5,2) DEFAULT 18.00,
    `batch_number` VARCHAR(50),
    `expiry_date` DATE,
    `opening_stock` INT NOT NULL DEFAULT 0,
    `stock_cartons` INT NOT NULL DEFAULT 0,
    `available_stock` INT NOT NULL DEFAULT 0,
    `reserved_stock` INT NOT NULL DEFAULT 0,
    `loaded_stock` INT NOT NULL DEFAULT 0,
    `damaged_stock` INT NOT NULL DEFAULT 0,
    `expired_stock` INT NOT NULL DEFAULT 0,
    `min_stock_alert` INT NOT NULL DEFAULT 10,
    `weight` VARCHAR(50),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ROUTES MASTER
CREATE TABLE IF NOT EXISTS `routes` (
    `id` VARCHAR(50) PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `areas_json` TEXT NOT NULL,
    `assigned_vehicle_number` VARCHAR(30),
    `assigned_driver_name` VARCHAR(100),
    `description` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. PARTY / RETAILER MASTER
CREATE TABLE IF NOT EXISTS `parties` (
    `id` VARCHAR(50) PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `owner_name` VARCHAR(100),
    `shop_address` TEXT NOT NULL,
    `area` VARCHAR(100) NOT NULL,
    `route_id` VARCHAR(50),
    `pincode` VARCHAR(10),
    `mobile_number` VARCHAR(20) NOT NULL,
    `alt_mobile_number` VARCHAR(20),
    `whatsapp_number` VARCHAR(20),
    `gst_number` VARCHAR(50),
    `opening_balance` DECIMAL(12,2) DEFAULT 0.00,
    `current_outstanding` DECIMAL(12,2) DEFAULT 0.00,
    `credit_limit` DECIMAL(12,2) DEFAULT 50000.00,
    `latitude` DECIMAL(10,7) NOT NULL,
    `longitude` DECIMAL(10,7) NOT NULL,
    `delivery_sequence` INT DEFAULT 1,
    `last_order_date` DATE,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE SET NULL
);

-- 5. VEHICLES & LIVE TRACKING
CREATE TABLE IF NOT EXISTS `vehicles` (
    `id` VARCHAR(50) PRIMARY KEY,
    `vehicle_number` VARCHAR(30) NOT NULL UNIQUE,
    `vehicle_type` VARCHAR(80) NOT NULL,
    `capacity_cartons` INT NOT NULL DEFAULT 150,
    `driver_name` VARCHAR(100) NOT NULL,
    `driver_mobile` VARCHAR(20) NOT NULL,
    `helper_loader_name` VARCHAR(100),
    `assigned_route` VARCHAR(100),
    `status` ENUM('Available', 'Loading', 'On Delivery Route', 'Delivered / Returning', 'Maintenance', 'Returned') DEFAULT 'Available',
    `current_lat` DECIMAL(10,7),
    `current_lng` DECIMAL(10,7),
    `speed_kmh` DECIMAL(5,2) DEFAULT 0.00,
    `temperature_c` DECIMAL(4,1) DEFAULT 19.0,
    `battery_level` INT DEFAULT 100,
    `start_time` VARCHAR(20),
    `return_time` VARCHAR(20),
    `last_location_update` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. ORDERS & BILLING
CREATE TABLE IF NOT EXISTS `orders` (
    `id` VARCHAR(50) PRIMARY KEY,
    `order_number` VARCHAR(50) NOT NULL UNIQUE,
    `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
    `party_id` VARCHAR(50) NOT NULL,
    `total_cartons` INT NOT NULL DEFAULT 0,
    `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(12,2) DEFAULT 0.00,
    `gst_amount` DECIMAL(12,2) DEFAULT 0.00,
    `total_bill` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `order_date` DATE NOT NULL,
    `delivery_date` DATE NOT NULL,
    `stage` ENUM('Warehouse', 'Loading', 'Loaded', 'In Transit', 'Delivered', 'Payment Pending', 'Completed') DEFAULT 'Warehouse',
    
    -- Loader Assignment
    `loader_id` VARCHAR(50),
    `loading_status` ENUM('Pending', 'In Progress', 'Loaded', 'Discrepancy') DEFAULT 'Pending',
    `cartons_loaded` INT DEFAULT 0,
    `cartons_difference` INT DEFAULT 0,
    `loading_started_at` DATETIME,
    `loading_completed_at` DATETIME,
    
    -- Vehicle & Driver Assignment
    `vehicle_id` VARCHAR(50),
    
    -- Delivery Boy Assignment
    `delivery_boy_id` VARCHAR(50),
    `delivery_status` ENUM('Pending', 'Out For Delivery', 'Delivered', 'Partial', 'Party Not Available', 'Return Goods') DEFAULT 'Pending',
    `delivery_sequence` INT DEFAULT 1,
    `delivered_at` DATETIME,
    `receiver_name` VARCHAR(100),
    `delivery_remarks` TEXT,
    
    -- Payment Settlement
    `payment_status` ENUM('Pending', 'Partial', 'Paid') DEFAULT 'Pending',
    `paid_amount` DECIMAL(12,2) DEFAULT 0.00,
    `pending_amount` DECIMAL(12,2) DEFAULT 0.00,
    `payment_mode` ENUM('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit'),
    `payment_ref_number` VARCHAR(100),
    
    -- Proof of Delivery
    `party_signature` LONGTEXT,
    `delivery_photo` LONGTEXT,
    
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`),
    FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`)
);

-- 7. ORDER ITEMS
CREATE TABLE IF NOT EXISTS `order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` VARCHAR(50) NOT NULL,
    `product_id` VARCHAR(50) NOT NULL,
    `cartons` INT NOT NULL,
    `loaded_cartons` INT DEFAULT 0,
    `difference` INT DEFAULT 0,
    `units` INT NOT NULL,
    `rate_per_carton` DECIMAL(10,2) NOT NULL,
    `discount_percent` DECIMAL(5,2) DEFAULT 0.00,
    `gst_percent` DECIMAL(5,2) DEFAULT 18.00,
    `total_amount` DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
);

-- 8. LOADER TASKS / LOGS
CREATE TABLE IF NOT EXISTS `loader_tasks` (
    `id` VARCHAR(50) PRIMARY KEY,
    `order_id` VARCHAR(50) NOT NULL,
    `loader_name` VARCHAR(100) NOT NULL,
    `employee_id` VARCHAR(50) NOT NULL,
    `vehicle_number` VARCHAR(30) NOT NULL,
    `loading_date` DATE NOT NULL,
    `cartons_to_load` INT NOT NULL,
    `cartons_loaded` INT DEFAULT 0,
    `cartons_difference` INT DEFAULT 0,
    `items_checklist_json` TEXT,
    `status` ENUM('Pending', 'Loading', 'Loaded', 'Discrepancy', 'Verified') DEFAULT 'Pending',
    `notes` TEXT,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`)
);

-- 9. SALES RETURN & DAMAGE MANAGEMENT
CREATE TABLE IF NOT EXISTS `sales_returns` (
    `id` VARCHAR(50) PRIMARY KEY,
    `return_number` VARCHAR(50) NOT NULL UNIQUE,
    `invoice_number` VARCHAR(50) NOT NULL,
    `order_number` VARCHAR(50) NOT NULL,
    `party_id` VARCHAR(50) NOT NULL,
    `product_code` VARCHAR(50) NOT NULL,
    `product_name` VARCHAR(150) NOT NULL,
    `cartons` INT NOT NULL DEFAULT 1,
    `return_reason` ENUM('Damaged Product', 'Expired Product', 'Short Delivery', 'Wrong Product', 'Rate Difference', 'Party Rejected') NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `photo` LONGTEXT,
    `approval_status` ENUM('Pending Approval', 'Approved', 'Rejected') DEFAULT 'Pending Approval',
    `credit_note_number` VARCHAR(50),
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`)
);

-- 10. PAYMENT & HISAB-KITAB / LEDGER
CREATE TABLE IF NOT EXISTS `payment_ledger` (
    `id` VARCHAR(50) PRIMARY KEY,
    `party_id` VARCHAR(50) NOT NULL,
    `order_id` VARCHAR(50),
    `date` DATE NOT NULL,
    `transaction_type` ENUM('RECEIPT', 'INVOICE', 'RETURN', 'CREDIT_NOTE') NOT NULL,
    `payment_method` ENUM('Cash', 'UPI', 'Cheque', 'Bank Transfer', 'Credit') NOT NULL,
    `reference_no` VARCHAR(100),
    `debit_amount` DECIMAL(12,2) DEFAULT 0.00,
    `credit_amount` DECIMAL(12,2) DEFAULT 0.00,
    `running_balance` DECIMAL(12,2) NOT NULL,
    `collected_by` VARCHAR(100) NOT NULL,
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`)
);
