# Verification — 15 September 2026

## Automated checks

19 tests passed using Node's built-in test runner:

- Catalogue: 20 products, 117 opening units, missing costs preserved.
- Sales: multiple lines, promotional prices, historical price snapshots, seller identity, dashboard arithmetic.
- Inventory: atomic rejection of insufficient stock, negative/fractional input rejection, duplicate lines/SKUs, adjustments, stale edits.
- Corrections: void restores stock exactly once and excludes revenue while retaining the original receipt.
- Reliability: stable operation IDs, simulated concurrent sellers, ETag conflicts, missing version checks, lost responses, token refresh, expired session rejection, and permission errors.
- Reporting: WIB day boundary and CSV quoting/formula protection.

The REST tests use a simulated Firebase server. They do not authenticate to, alter, or prove the deployed state of the real Firebase project.

## Browser checks

- Opened the running local app, entered its demo, and confirmed all 20 products and 117 units.
- Recorded 2 Beaded Bracelet 1 units at promotional Rp 75,000 and 3 Coffee units at Rp 9,000. Receipt and dashboard showed **Rp 177,000**, **5 units sold**, and **112 units remaining**.
- Confirmed the receipt contains the customer, seller, payment method, line quantities, and historical prices.
- Voided that demo sale with a reason. Revenue became **Rp 0**, stock returned to **117**, and the original receipt remained marked **Voided**.
- Searched inventory for Coffee. A restock of +5 changed Coffee to 41 and overall stock to 122. A documented -5 correction restored 36 Coffee units and 117 overall units.
- Reloaded the app and reopened the demo; saved history and restored quantities persisted.
- Verified quantity input updates the totals as typed. Entering 37 when only 36 Coffee units are available disables checkout.
- Reviewed the dashboard at desktop size and at a 390 × 844 mobile viewport. Confirmed mobile navigation, sign-out access, and cart layout.
- Checked the browser console for JavaScript errors during the sales workflow; none were reported.

The local demo contains one voided verification sale and its documented stock adjustments. No test sales or other writes were sent to the user's Firebase database. Fresh browser storage starts with the catalogue and no sales.

## Rules / files

- JavaScript syntax checks passed.
- The offline rule-merging helper was exercised against the supplied game's rule file. Its complete `games` branch was preserved and the separate sales branches were added.
- Original ZIP and PDF were not modified.

## Requires owner setup / not verified live

- Real Firebase email/password sign-in with an existing account.
- Publishing and validating the merged rules in the real project.
- Granting staff access and verifying multiple real devices.
- Public hosting or deployment.

See README.md for these setup steps and the scope of this trusted-team MVP.
