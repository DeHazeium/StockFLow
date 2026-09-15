# StockFlow — sales & inventory, first working version

A plain HTML/CSS/JavaScript sales app adapted from your supplied game's Firebase REST backbone. No packages to install and no build step. The original ZIP and its files are untouched.

## Try it

- Open `index.html` in a modern browser and choose **Try the working demo**. A local web server is recommended for predictable browser storage and Firebase access.
- With Node.js installed: open this folder in a terminal and run `node server.js`. Open **http://127.0.0.1:4173**. `npm start` does the same thing.
- VS Code Live Server also works. Serve this folder, not its parent.
- Demo mode saves to this browser only, using a separate storage key. It never writes to Firebase. It opens with 20 products, 117 units, and zero sales. After browser testing, this machine's demo may contain a clearly labelled, voided test sale.
- The `?demo=1` URL opens the demo directly. Export sales or a JSON backup before clearing browser storage.

## What works

- Email/password sign-in with the same Firebase project and accounts as your original app.
- Inventory prefilled from **Product Sarawak SUCCESS26** when you choose to import it. Product photos come from the supplied PDF; marked/covered parts of reference photos remain covered.
- Add/edit products, standard and promotional prices, RM purchase costs, and low-stock thresholds.
- Record restocks or corrections with a reason and seller identity.
- Multi-product sales with editable quantities and IDR prices, with MYR reference values shown alongside; optional customer and note; Cash, QR / bank transfer, or Card **recordkeeping** (no payment processing).
- One version-checked write saves a sale, its stock deduction, and stock movements together. Conflicts fetch fresh stock and retry. Repeated operation IDs do not deduct stock twice.
- Sales history, date/status/search filters, receipt details, CSV exports, and JSON backup export.
- Void a sale with a reason, keeping its history and restoring stock once.
- Dashboard revenue, units sold, stock remaining, low-stock watch, and seven-day sales chart. Voided sales are excluded from revenue.
- Layouts for desktop and mobile. The new-sale cart moves below products on narrow screens.

## Reuse your Firebase setup

The original `firebase-config.js` is retained, including the existing project and owner email. No passwords or service-account credentials are included. Email/password authentication uses the same Identity Toolkit sign-in and refresh endpoints as the game. A separate, tab-scoped session avoids changing the game's login storage. Game registrations created through anonymous authentication are not email/password accounts; they cannot sign in here as named staff.

### 1. Add the sales rules without replacing game rules

The game ZIP's rules cover `games/current`, not sales. Its sample admin rule still contains a placeholder, so do not publish that file blindly.

1. In **Firebase Console → Realtime Database → Rules**, copy your **currently deployed** rules into a local `current-live-rules.json` file. Keep an unchanged backup.
2. This package's `database.rules.additions.json` is an **additions-only fragment**, not a complete replacement. It defines `stockFlow` and `stockFlowMembers`.
3. Merge them offline with:

   ```text
   node merge-rules.js current-live-rules.json merged-rules.json
   ```

   The helper preserves existing branches, refuses broad parent read/write grants, refuses existing sales branches, and will not overwrite an output file. If your export has comments, remove the comments so it is valid JSON first.
4. Review `merged-rules.json`. Publish the merged rules in the Firebase console when ready. The app and merge helper never publish rules automatically.
5. Sign in with the owner account already configured in `firebase-config.js`. Choose **Load SUCCESS26 catalogue** in an empty inventory. The live workspace is never seeded automatically.

### 2. Allow existing staff accounts

In **Firebase Authentication → Users**, copy the UID of each email/password account you want on the sales team. In **Realtime Database → Data**, add:

```text
stockFlowMembers
  EXISTING_STAFF_UID: true
```

The configured owner has access automatically. An existing game account does not automatically receive access to business records. Set a member to `false` or remove that entry to revoke access. Do not share passwords. All approved members have full inventory and sales access in this MVP; there is no cashier/manager permission split yet.

### Data layout

```text
games/...                    existing game data, untouched
stockFlowMembers/<uid>       approved existing team accounts
stockFlow/data/products      product details and current stock
stockFlow/data/sales         receipts, status, seller, historical line prices
stockFlow/data/movements     opening stock, sales, adjustments, voids
stockFlow/data/operations    stable operation IDs for safe retries
```

Successful changes save immediately. Other devices refresh every 15 seconds while the tab is visible. Every save fetches fresh data first. Live mode requires a connection; it does not silently store business sales in demo mode. If a save is uncertain, **Retry pending save** reuses the original operation ID. Keep that tab open until it is confirmed. Authentication tokens and pending saves are held in session storage, so closing the tab ends this local session.

### 3. Hosting later

The app can be hosted as static files. Upload only `index.html`, `styles.css`, `app.js`, `core.js`, `catalog.js`, `firebase.js`, `firebase-config.js`, and `assets/`. Use HTTPS. Keep the rules, tests and local helpers out of the public upload. Choose a new hosting site or subdomain for StockFlow if the game is still live. This delivery has not changed your hosting or Firebase project.

## Catalogue decisions

- **Sales currency:** IDR. `ribu` means a thousand, so `80 ribu` becomes `80000`. The interface also shows an MYR reference conversion using 1 MYR = Rp 4,333.17 (reference rate dated 15 Sep 2026).
- **Purchase costs:** MYR, stored separately. MYR selling-price figures are reference conversions only; no mixed-currency profit is calculated.
- **SALES column:** interpreted as an optional promotional unit price. Standard selling price is the default; select **Use promo** to apply it.
- Product 18's purchase cost is blank. Product 19 (Assorted Perfume) has no purchase cost or promotional price. Those remain blank.
- “Imposter Bracelet” is corrected to **Beaded Bracelet 5**.
- The two separate Beaded Necklace entries are labelled **Beaded Necklace 1** and **Beaded Necklace 2**, with distinct SKUs and their original quantities/prices.
- `Pua Kumbu Scaft` is displayed as `Pua Kumbu Scarf`.
- Beaded Bracelet 4 retains the source note that its picture is only a reference.
- Opening quantity is 117. No historic sales are inferred from the PDF.
- Reports use Jogjakarta/WIB dates (UTC+7), including around midnight. Timestamps come from the seller's device; keep its clock accurate.

## Scope of this first version

This is a small, trusted-team MVP. Approved members can modify the underlying sales workspace; schema rules validate basic data but do not enforce an independently tamper-proof accounting ledger. For stricter cashier permissions or audited accounting, move mutations to a backend and enforce totals and stock transitions there. The entire small workspace is version-checked per write; a larger catalogue or long sales history should move to smaller server transactions and paginated queries.

There is no payment collection, exchange-rate profit report, barcode scanning, partial refund, purchase-order module, user signup, offline live-sales queue, or backup restore yet. Voiding corrects a complete sale; it does not send a financial refund. CSV exports include voided rows marked as such. JSON backups include customer notes and seller email addresses; keep them private.

## Verification

Run `npm test`, or `node --test tests/*.test.js` with Node.js 18 or newer. Tests cover catalogue totals, sale arithmetic, atomic failure, overselling, input validation, duplicate-save protection, void/stock restoration, edit conflicts, date boundaries, safe CSV export, and Firebase REST conflict/refresh/error handling with a simulated server. Real Firebase sign-in, deployed rules and live multi-device access require the owner's account and are not claimed as verified here.

The browser demo was also exercised for a multi-line promotional-price sale, receipt, history, stock changes, and voiding. See `VERIFICATION.md` for the final results.

## Code map

`app.js` — screens and forms · `styles.css` — responsive interface · `core.js` — testable sales/stock logic · `firebase.js` — adapted REST auth and storage · `catalog.js` — the 20 reference products · `server.js` — optional localhost preview.

Firebase reference: [REST authentication](https://firebase.google.com/docs/reference/rest/auth) and [version-checked writes](https://firebase.google.com/docs/database/rest/save-data#section-conditional-requests).
