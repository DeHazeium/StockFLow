StockFlow v2.9 — Close Shift Firebase Key Fix

Fixed a Firebase Realtime Database error that appeared when closing a shift:
"Invalid data; couldn't parse key ... Key value can't be empty or contain $ # [ ] / or ."

Cause:
The shift snapshot stored payment totals with the human-readable payment label
"QR / bank transfer" as an object key. Firebase RTDB forbids '/' inside keys.

Fix:
- Shift payment total fields now use Firebase-safe keys: cash, qrBankTransfer, card.
- Human-readable sale payment values remain unchanged ("QR / bank transfer").
- Added a recursive Firebase key guard before every write.
- Added tests that close a QR shift and verify the full PUT payload contains no invalid keys.

All 24 automated tests pass.
