# StockFlow v2.7 verification

Automated test result: **22/22 passed**.

Verified in the local test suite:

- SUCCESS26 catalogue = 20 products / 117 opening units.
- Beaded Bracelet 5 canonical name is retained.
- Sales deduct stock atomically and keep historical values.
- Voids restore stock once and preserve the original sale record.
- Restock originals returns catalogue products to the original quantities without deleting sales/history.
- Restock matches legacy inventory when Firebase product IDs differ by using SKU and normalized product names.
- Legacy “Imposter bracelet” is recognized as Beaded Bracelet 5, and the PDF typo “Pua Kumbu Scaft” is recognized as Pua Kumbu Scarf.
- Genuinely missing catalogue items are recreated automatically at their original quantity while custom products are left unchanged.
- Restock movements record the exact per-product delta.
- Close shift stores completed/voided counts, revenue, payment totals, items sold, stock movements and inventory snapshot.
- A new shift window begins after the previous close.
- Firebase REST continues using `stockFlow/data` with ETag conditional writes.
- Permission-denied errors direct the user to the included no-login StockFlow rules.

Real Firebase permission changes cannot be published by this ZIP. The included rules must be reviewed and published in Firebase Console once because the previous authenticated rules are incompatible with a no-login client.
