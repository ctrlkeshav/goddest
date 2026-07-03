# ⚡ Goddest Metals — Instant Preview

Run the full UI in your browser **without installing Electron, SQLite, or anything heavy**.  
Data lives in browser `localStorage`. All modules are fully interactive.

---

## 🚀 Start in one step

### Windows
```
Double-click  START_PREVIEW.bat
```

### macOS / Linux
```bash
./start_preview.sh
```

That's it. The script auto-installs npm packages on first run, then opens **http://localhost:3000**.

---

## 🔑 Login

| Username | Password |
|---|---|
| `admin` | `admin123` |

---

## 📦 What works in preview mode

| Feature | Status |
|---|---|
| Login / logout | ✅ |
| Dashboard with live charts | ✅ |
| Customer CRUD + search | ✅ |
| Silver transactions + auto-calculations | ✅ |
| Payments | ✅ |
| Deliveries | ✅ |
| Employees + stats | ✅ |
| Document upload (browser file picker) | ✅ |
| All 5 report types | ✅ |
| One-click backup (stored in localStorage) | ✅ |
| User management + password change | ✅ |
| Activity log | ✅ |
| Excel / CSV export | ℹ️ Shows confirmation — file download works in desktop app |
| Open document shell | ℹ️ Not available in browser — works in desktop app |

---

## 💡 How it works

```
preview/
  src/
    mock/
      db.js          ← localStorage database (all tables, seed data)
      bcrypt-shim.js ← password hashing for browser
      api.js         ← installs window.api — identical to Electron preload
    pages/           ← same React files as the real app, zero changes
    ...
```

`window.api` is mounted **before** React starts, so every page component
works identically to the production Electron build.

---

## 🔄 Reset all data

Open browser DevTools → Console → run:
```js
localStorage.clear(); location.reload()
```

---

## ➡️ Moving to production

When you're happy with the UI, the real app is in the root of this repo.  
Run `npm install && npm run dev` from the root to start the Electron version.
