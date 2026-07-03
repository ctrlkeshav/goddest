# ⚗️ Goddest Metals — Silver Transaction Management Software

A professional, **100% offline** Windows desktop application for managing silver transactions, customer accounts, delivery records, and payment documentation.

---

## 🖥️ Technology Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Electron 30 |
| Frontend | React 18 + React Router 6 |
| Build | Vite 5 |
| Database | SQLite (better-sqlite3) |
| Charts | Chart.js + react-chartjs-2 |
| Export | XLSX (Excel/CSV) |
| Backup | Archiver (ZIP) |
| Auth | bcryptjs |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm 9+

### Install & Run (Development)

```bash
npm install
npm run dev
```

This starts Vite dev server + Electron simultaneously.

### Build Windows Installer

```bash
npm run build:electron
```

Output: `dist-electron/` — contains the NSIS installer for Windows.

---

## 📦 Modules

| Module | Features |
|---|---|
| 🏠 Dashboard | Live stats, charts, recent transactions, top pending customers |
| 👥 Customers | CRUD, search, silver balance per customer, GST details |
| ⚖️ Transactions | Silver issued / fine received / payment / adjustment with auto-calculations |
| 💳 Payments | Record payments (Cash/Bank/Cheque/UPI), settlement history |
| 🚚 Deliveries | Delivery log with employee, vehicle, travel expenses |
| 👤 Employees | Employee management, delivery statistics per employee |
| 📁 Documents | Upload PDF/JPG/PNG/DOCX/XLSX, link to customers/transactions |
| 📊 Reports | 5 report types with Excel/CSV export |
| 💾 Backup | One-click ZIP backup, restore, data portability |
| ⚙️ Settings | User management (Admin/Staff), password change, activity log |

---

## 🔐 Default Login

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

> **Change this immediately after first login** via Settings → My Account → Change Password.

---

## 💾 Data Storage

All data is stored **locally** in the Windows user data directory:

```
%APPDATA%\goddest-metals\
  goddest_metals.db     ← SQLite database
  documents\            ← Uploaded files
  backups\              ← ZIP backup files
```

### Moving Data to Another PC
1. Go to **Backup & Restore** → Click **Create Backup Now**
2. Copy the `.zip` file to USB or external drive
3. Install the software on the new PC
4. Go to **Backup & Restore** → Click **Restore from Backup**

---

## ⚖️ Silver Calculation Logic

When issuing silver:
- **Recoverable Fine Silver** = Gross Weight × (Purity % / 100)
- **Balance Fine Silver** = Recoverable × (1 - Wastage% / 100)

Running balance per customer = Σ Recoverable Issued − Σ Fine Received

---

## 🔮 Future Modules (Designed for)

- Inventory Management
- GST Billing & Invoice Generation
- Barcode Support
- SMS Notifications
- Multi-user LAN Support
- Mobile Companion App
