# StockFlow — Local Device Edition

**StockFlow by Muhammad Irfan** is a lightweight POS, inventory, cashier-account and WhatsApp e-invoice web app for the SUCCESS26 catalogue.

## v2.3 — no server required

This version is deliberately **device-only**. There is no Firebase login, Node API, or cross-phone account syncing.

- Cashiers create a **StockFlow Cashier ID + password** on the phone/browser they are using.
- That phone remembers the signed-in cashier until they sign out.
- Multiple Cashier IDs created on the **same phone/browser** all use the same StockFlow inventory and sales workspace.
- An ID created on Phone A does not automatically exist on Phone B. Create a separate ID there if needed.
- Inventory, sales, stock movements, accounts and settings are stored in the browser's local storage.
- Customer WhatsApp numbers default to Indonesia country code **+62**.
- Completed sales can send a formatted e-invoice through WhatsApp.
- **QR / bank transfer** shows the supplied DuitNow QR and the QR can be enlarged.
- Prices display IDR plus an MYR reference value.
- Product naming includes **Beaded Bracelet 5**.
- The branded StockFlow welcome/loading animation and mobile anti-zoom fix are included.

## Running StockFlow

No backend is required. Upload the `StockFlow` folder to any static website host, or serve the folder as static files. Node.js is only needed if you want to run the automated tests with `npm test`.

For the most reliable phone experience, use the same website address each time. Browser storage belongs to that site address. Clearing browser/site data or changing to a different domain can remove or create a separate local workspace.

## Cashier accounts

Example:

- Cashier ID: `F4nz`
- Password: `1234567`

Passwords are not stored as plain text. StockFlow stores a salted password hash locally on the device.

All cashier accounts created on the same browser share the same local inventory and sales data, while each transaction still records which cashier made it.

## Backups

Because the data lives on the phone/browser, use **Setup → Download backup** regularly. Clearing site data, uninstalling the browser, or losing the device can remove local StockFlow data.

## WhatsApp e-invoice

At checkout:

1. Enter the customer name if needed.
2. Enter their Indonesian WhatsApp number after the default `+62` prefix.
3. Complete the sale.
4. Tap **Send e-invoice via WhatsApp** on the receipt.

StockFlow opens WhatsApp with the invoice number, cashier, items, IDR + MYR total, payment method and note already prepared.

## QR payment

Choose **QR / bank transfer** in Payment method. StockFlow shows `assets/duitnow-qr.png`. The same QR is shown on the completed receipt screen for QR sales.

## Testing

```bash
npm test
```
