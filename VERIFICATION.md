# StockFlow Verification

Verified on 15 September 2026.

## v2.3 device-only behavior

- Removed the Node server and all `/api/...` calls.
- Removed cross-phone cashier login behavior.
- Cashier signup/login now works entirely from browser local storage.
- The signed-in cashier is remembered on the same phone/browser until sign out.
- Multiple Cashier IDs created on the same phone share one local inventory and sales workspace.
- Passwords are stored as salted hashes rather than plaintext.
- Existing v2.2 local cashier/workspace keys are preserved, so previously created local data can continue to load.
- WhatsApp +62 default, DuitNow QR, IDR + MYR display, Beaded Bracelet 5, welcome animation, and mobile anti-zoom behavior remain included.

## Automated tests

`npm test` → **21/21 passing**.

Coverage includes:

- local cashier signup and remembered login
- incorrect/unknown cashier credentials
- duplicate ID protection
- shared local workspace between cashier IDs on one device
- local inventory persistence
- password hashing fallback without Web Crypto
- catalogue totals and missing values
- atomic multi-line sales and stock deduction
- insufficient-stock protection
- stable operation IDs / safe retries
- sale voiding and stock restoration
- product and stock validation
- WIB business-day handling
- CSV escaping/export

## Syntax checks

- `node --check app.js` — passed
- `node --check core.js` — passed
- `node --check stockflow-api.js` — passed
