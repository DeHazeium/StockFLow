# StockFlow v2.8 verification

This build was checked in two ways.

## Automated core/API tests
- `npm test`
- 22/22 tests passing.

## Real browser integration test
The application was loaded in headless Chromium against a simulated Firebase RTDB endpoint using a legacy inventory whose product IDs/SKUs did not match the SUCCESS26 catalogue.

The browser was intentionally run in a restricted context where:
- `crypto.randomUUID()` was unavailable
- `sessionStorage` was unavailable
- `structuredClone()` was unavailable
- `AbortSignal.timeout()` was unavailable

Verified end-to-end:
1. StockFlow loads and reads the shared RTDB workspace.
2. Inventory page opens.
3. Restock recognizes legacy products by name/alias.
4. Missing SUCCESS26 items are recreated.
5. Restock completes at exactly 20 catalogue products / 117 catalogue units.
6. A new sale can be completed and saved.
7. Stock is reduced by the sale.
8. Close Shift saves a shift report.
9. No browser page errors occur during the flow.

The mobile compatibility fixes are in `app.js` and `stockflow-api.js`.

v3.1 verification
-----------------
- Cash received >= sale total is enforced; change is calculated and stored.
- Closed-shift sales are excluded from current Sales History via currentShiftSales().
- Cash received/change fields are included in sales CSV and detailed close-shift CSV.
- npm test: 28/28 passing.


## v3.2 checks
- Concurrent carts cannot reserve more units than physical stock.
- A sale can consume its own hold but cannot consume another cashier's hold.
- Stale holds expire automatically.
- Clear revenue/history preserves inventory and active holds.
- Availability polling reads only products + live hold data every 2.5 seconds; full workspace sync remains every 15 seconds.
