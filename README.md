# StockFlow v2.5 — Firebase RTDB, no cashier login

This build keeps the existing StockFlow Firebase Realtime Database connection and removes the cashier ID / signup / password interface.

## Behaviour

- Opens with the StockFlow by Muhammad Irfan loading animation, then goes straight to the dashboard.
- No Firebase Authentication UI, cashier ID, signup, password, or sign-out flow.
- Inventory, sales, movements and operations use the existing Firebase RTDB URL from `firebase-config.js` at `stockFlow/data`.
- Devices using the same deployed StockFlow site and RTDB workspace see the same data.
- Writes use Firebase ETags and conditional PUTs to reduce accidental overwrites when multiple devices save at the same time.
- Refreshes when the app becomes visible and every 15 seconds while visible.
- WhatsApp e-invoice defaults to Indonesia `+62`.
- DuitNow QR, IDR + MYR display, Beaded Bracelet 5, exports/backups and the mobile Safari input auto-zoom fix are retained.

## Important Firebase rules note

This build intentionally performs no user login. It therefore sends RTDB REST requests without a Firebase Authentication token. Your currently deployed RTDB rules for `stockFlow/data` must permit the access pattern you want. This package does not modify or publish your Firebase database or rules.

## Run locally

Use any static web server. The included optional `server.js` can be used only as a preview server if desired; no Node backend is required for StockFlow data.

## Tests

```bash
npm test
```
