# POS System PRD (Philippine BIR Compliant)

**Stack:**
- **Backend:** Laravel 12  
- **Frontend:** Vue 3 + PrimeVue + TailwindCSS  
- **Database:** MySQL (online), SQLite (offline)  
- **Packages:** Spatie Roles & Permissions, Spatie Media Library, Spatie Query Builder, Bensampu Laravel Enums, nwdart Laravel modules  
- **Admin Panel:** Filament 4 (Admin + Merchant)  

---

## 1. Objective
To develop a **modern, cloud-based, offline-capable POS system** for Philippine businesses with **full BIR compliance**, advanced inventory, sales analytics, and multi-tier plans.

---

## 2. Key Features

### 2.1 Core POS (High Priority)
1. **Product & Inventory Management**
   - CRUD products with variants
   - Batch & expiry tracking
   - Stock in/out, low-stock alerts
   - Supplier management
   - Inventory transfer between branches

2. **Sales & Checkout**
   - Barcode & product search
   - Multiple payment methods (cash, card, e-wallet)
   - Discounts & promotions
   - VAT computation (VATable, VAT-exempt, zero-rated)
   - Offline mode support (SQLite)
   - Cash drawer management (last in priority)
   - OR printing (BIR-compliant)
   - Refunds & voids (with audit trail)

3. **User Management**
   - Role-based access (Spatie Roles)
   - Cashier, Supervisor, Admin
   - Permission-based actions
   - Shift login/logout tracking

4. **Reports & Analytics**
   - Daily, weekly, monthly sales
   - Product & category performance
   - Z-reading & X-reading
   - Cashier performance
   - VAT & tax summary (BIR ready)

---

### 2.2 Advanced Features
1. **Customer & CRM**
   - Customer profiles & purchase history
   - Loyalty points & membership pricing

2. **Multi-branch & Cloud Sync**
   - Real-time inventory & sales sync
   - Offline fallback with SQLite

3. **Integrations**
   - Payment gateways
   - Accounting (QuickBooks/Xero)
   - E-commerce integration

4. **Filament Admin Panel**
   - Plan/Tier management
   - Full CRUD management for products, branches, users
   - BIR OR series setup
   - Audit trail monitoring

5. **Filament Merchant Panel**
   - Daily sales dashboard
   - Product sales analytics
   - Shift & cashier management
   - POS terminal interface

---

### 2.3 Philippine BIR Compliance
- BIR-accredited POS with PTU number
- Sequential OR numbering
- OR contains:
  - Business name, TIN, branch code
  - VAT breakdown
  - PTU & machine serial
- X-Reading & Z-Reading
- Audit trail & non-editable sales
- Data retention (10+ years)
- Optional EIS integration (electronic OR submission)

---

## 3. Technical Architecture

### 3.1 Backend (Laravel 12)
- **Modules (nwdart)**
  - Inventory
  - Sales
  - Users
  - Reports
  - CRM
- **Packages**
  - Spatie Roles & Permissions
  - Spatie Media Library
  - Spatie Query Builder
  - Bensampu Laravel Enums
- **Offline support:** SQLite fallback for POS terminal
- **API:** RESTful / JSON APIs for Vue frontend

### 3.2 Frontend (Vue 3 + PrimeVue + TailwindCSS)
- **POS interface:** fast, touchscreen-friendly
- **Admin & Merchant panels:** Filament 4 integration
- **Offline support:** IndexedDB / SQLite sync

---

## 4. Module & Feature Prioritization

| Priority | Module / Feature |
|----------|-----------------|
| **P1** | Product & inventory management (CRUD, stock, suppliers) |
| **P1** | Sales & checkout (POS, VAT, OR printing) |
| **P1** | User management & role-based permissions |
| **P2** | Reports (daily, monthly, BIR summary) |
| **P2** | Multi-branch & cloud sync |
| **P2** | Filament admin panel setup (plans, OR series) |
| **P3** | CRM, loyalty programs, customer management |
| **P3** | Advanced analytics dashboards |
| **P4** | Cash drawer / register management |
| **P4** | Offline mode final sync & conflict handling |
| **P4** | Optional EIS electronic OR submission |

---

## 5. Plan / Tier Management
- **Plans:** Free, Basic, Pro, Enterprise
- **Filament Admin Panel**
  - Set plan features (e.g., branches, users, CRM access)
  - Tier-based module activation
  - Subscription & expiration tracking
- **Merchant Panel**
  - View plan limits
  - Upgrade notifications

---

## 6. AI Development Guidance
- **Backend Automation**
  - AI-assisted code scaffolding for CRUD modules
  - AI-generated report templates (daily, VAT, BIR)
  - AI-assisted inventory predictions & reorder alerts
- **Frontend**
  - AI-assisted UI component generation (PrimeVue forms, tables)
  - AI-suggested POS layouts for efficiency
- **Testing**
  - Automated AI-generated test cases for sales flow
  - AI-assisted offline sync testing
- **Documentation**
  - Auto-generate README & setup scripts
  - API docs generation for frontend dev

---

## 7. Implementation Notes
1. **Start from:** Core management modules (inventory, products, users)
2. **Next:** Sales & checkout workflow (online first, offline next)
3. **Then:** Reports & BIR compliance
4. **Finally:** Register/cash drawer & AI enhancements
5. **Filament panels:** Configure plans, OR series, branch controls

---

## 8. Optional / Future Features
- E-commerce integration (Shopify, WooCommerce, Lazada, Shopee)
- Mobile POS app (Flutter or Vue-native)
- AI-driven inventory forecasting
- Multi-currency & tax support (for global expansion)

