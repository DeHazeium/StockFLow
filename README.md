# StockFlow — Shared Sales & Inventory

**StockFlow by Muhammad Irfan** is a lightweight POS, inventory, cashier-account and e-invoice web app for the SUCCESS26 catalogue.

## What changed in v2.2

- Fixed cashier ID creation when StockFlow is opened from a static host or without the included API server.
- StockFlow now tries the shared server first. If the server is unavailable, it securely creates a **local cashier ID on that phone** instead of failing.
- Local IDs can sign out and sign back in on the same phone, and local sales/inventory are saved in that browser.
- The UI clearly shows **Saved on this phone** / **Local mode** so it never pretends local data is shared.
- The existing shared-server mode is unchanged: when the included Node server is running, cashier IDs and stock remain shared across phones.
- Mobile anti-zoom behavior is preserved.

## Features carried forward

- Firebase account login has been removed completely.
- Cashiers create their own **StockFlow Cashier ID + password** from the Sign Up page.
- The current phone remembers the cashier until they explicitly sign out. The same ID/password can be used on another phone.
- Every cashier connected to the same StockFlow server sees the **same inventory, sales, stock movements and history**.
- Customer WhatsApp numbers default to Indonesia country code **+62**.
- Completed sales can send a formatted **e-invoice through WhatsApp**.
- Selecting **QR / bank transfer** displays the supplied DuitNow Malaysia National QR. Tap the QR to enlarge it.
- Prices display IDR and MYR reference values.
- Product naming includes **Beaded Bracelet 5**.
- A branded welcome/loading animation appears after login.

## Important: shared phones need one server

There is **no Firebase dependency** in this version. StockFlow has two modes:

- **Shared mode** — when the included Node.js server/API is reachable. Cashier IDs, inventory and sales are shared across phones opening the same StockFlow URL.
- **Local fallback mode** — when the API is not reachable (for example, a static-only upload). Account creation still works and the workspace is saved on that phone/browser, but it cannot sync to another phone without a shared backend.

For multiple phones to see the same live StockFlow, they must all open the same running/deployed server URL. A browser-only static website cannot share writable stock data between different phones by itself.

## Run it

Requires Node.js 18 or newer.

```bash
npm start
```

By default StockFlow listens on:

```text
http://0.0.0.0:4173
```

On the same Wi-Fi network, open the computer/server's LAN IP from the cashier phones, for example `http://192.168.1.10:4173`. For real deployment, use a Node-capable host and HTTPS.

### Environment variables

- `PORT` — server port, default `4173`
- `HOST` — bind address, default `0.0.0.0`
- `STOCKFLOW_SECRET` — recommended in production; a long random secret used to sign remembered cashier sessions
- `STOCKFLOW_DATA_FILE` — optional path for the persistent StockFlow database file

If `STOCKFLOW_SECRET` is not provided, StockFlow creates a private `.stockflow-secret` file on first launch.

## Data and cashier security

Cashier passwords are never saved in plain text. The server stores a salted **scrypt** password hash. The browser stores only a signed session token and basic cashier profile so the phone can remember the login.

The server creates `.stockflow-data.json` for cashier accounts and the shared workspace. Back this file up if StockFlow contains real sales data.

For internet-facing deployment, use HTTPS, keep `STOCKFLOW_SECRET` private, restrict server access as appropriate, and keep regular backups.

## WhatsApp e-invoice

At checkout:

1. Enter the customer name if needed.
2. Enter their Indonesian WhatsApp number after the fixed `+62` prefix.
3. Complete the sale.
4. Tap **Send e-invoice via WhatsApp** on the receipt.

StockFlow opens WhatsApp with the invoice number, cashier, items, IDR + MYR total, payment method and note already prepared.

## QR payment

Choose **QR / bank transfer** in Payment method. StockFlow shows `assets/duitnow-qr.png`, extracted from the supplied Business QR image. The same QR is shown on the completed e-invoice screen for QR sales.

## Testing

```bash
npm test
```

The automated suite covers sales/stock atomicity, retries, voids, CSV export, cashier signup/login, remembered sessions, shared API reads/writes and connection failures.
