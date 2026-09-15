# StockFlow v2.7 — Firebase RTDB, resilient restock matching + shift closing

StockFlow by Muhammad Irfan keeps the same Firebase Realtime Database project and the same `stockFlow/data` workspace. There is no cashier ID, signup, password or Firebase Authentication screen.

## What this build adds

- **Close shift** button on the dashboard plus a dedicated **Shifts** page.
- A closed shift stores a snapshot of sales, payment totals, voided sales, stock movements and the complete inventory at closing time.
- Each shift can be reopened and downloaded as **CSV** or full **JSON**.
- The next shift automatically starts after the previous shift close.
- **Restock originals** now matches catalogue products by ID, SKU, normalized product name, and known legacy names. It restores the 20 SUCCESS26 catalogue products to their original opening quantities (117 units total), and automatically recreates a catalogue item if it is genuinely missing. Sales, shift reports and stock history are preserved. Custom products are not changed.
- Existing WhatsApp e-invoice (+62 default), DuitNow QR, IDR + MYR displays, Beaded Bracelet 5, exports/backups, launch animation and mobile anti-zoom behaviour are retained.

## Firebase RTDB permission fix — required once

The older StockFlow rules required an authenticated Firebase email account. Because this version has **no login**, those old rules return `Permission denied`.

The app code already uses the same Firebase database URL and path. Do **not** change `firebase-config.js`.

This ZIP includes:

- `database.rules.additions.json` — the no-login StockFlow rule branch with schema validation, including shifts.
- `update-stockflow-rules.js` — offline helper that replaces only the `stockFlow` branch in a copy of your currently deployed rules.
- `FIREBASE-RULES-SETUP.txt` — exact one-time steps.

Recommended procedure:

1. Firebase Console → **Realtime Database → Rules**.
2. Copy the current full rules into `current-live-rules.json` in this folder.
3. Run:

   ```text
   node update-stockflow-rules.js current-live-rules.json merged-rules.json
   ```

4. Review `merged-rules.json`.
5. Paste it back into Firebase Console and click **Publish**.
6. Reload StockFlow and tap **Try again**.

The helper never connects to Firebase and cannot publish anything itself.

### Security note

A shared RTDB path with no authentication has no per-user identity boundary. The included rules still validate the StockFlow data structure, but anyone who can directly reach the database endpoint could potentially access the StockFlow path. If stronger security is needed later without a visible cashier login, use a trusted backend or a configured App Check/authentication flow.

## Data layout

```text
stockFlow/data/products      live inventory
stockFlow/data/sales         e-invoices / sales records
stockFlow/data/movements     sales, restocks, adjustments and void restores
stockFlow/data/shifts        closed-shift snapshots and reports
stockFlow/data/operations    stable operation IDs for safe retries
```

## Catalogue restock quantities

The original StockFlow catalogue contains 20 products and 117 opening units. `catalog.js` is the preserved reference used by the Restock originals action. Restock preserves existing matched product records and prices, changes their quantities to the PDF opening quantities, and recreates any genuinely missing catalogue product from the preserved catalogue metadata. It does not erase historical records.

## Running

Serve the `StockFlow` folder with any normal static web host/server and open `index.html`. No Node backend is required for live StockFlow data; Node is only needed if you choose to run the offline rules helper or automated tests.

## Tests

```text
npm test
```

The v2.7 suite covers Firebase REST reads/writes and ETag conflict handling, sales/voids, catalogue totals, legacy ID/SKU/name restock matching, missing-item recreation, full-catalogue restock, shift snapshots and shift boundaries.
