# StockFlow Verification

Verified on 15 September 2026.

## Automated tests

`npm test` → **19/19 passing**.

Coverage includes:

- catalogue totals and missing values
- atomic multi-line sales and stock deduction
- insufficient-stock protection
- stable operation IDs / safe retries
- sale voiding and stock restoration
- product and stock validation
- WIB business-day handling
- CSV escaping/export
- StockFlow Cashier ID signup/login
- remembered cashier sessions
- shared workspace API reads and mutations
- session expiry and network interruption handling

## Live server smoke test

A temporary StockFlow server was started with an isolated data file. The following were checked successfully:

- cashier account creation (`F4nz` test account)
- ID/password login
- signed remembered session token
- authenticated shared data retrieval
- static app delivery from `/`

The temporary integration data was not included in the project package.

## Syntax checks

- `node --check app.js` — passed
- `node --check core.js` — passed
- `node --check stockflow-api.js` — passed
- `node --check server.js` — passed
