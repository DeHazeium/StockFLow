STOCKFLOW v2.8 — MORNING HOTFIX
===============================

This build fixes the silent mobile/browser failure where buttons could appear normal but do nothing.

Root causes fixed:
- crypto.randomUUID() was used directly. It can be unavailable outside secure HTTPS contexts.
- sessionStorage can be denied in sandboxed/privacy browser contexts and was able to stop saves.
- structuredClone() was assumed to exist.
- AbortSignal.timeout() was assumed to exist.
- IntersectionObserver is now optional.

Restock behavior:
- Matches by exact ID, SKU, normalized product name, then legacy aliases.
- "Imposter Bracelet" maps to "Beaded Bracelet 5".
- "Pua Kumbu Scaft" maps to "Pua Kumbu Scarf".
- Missing SUCCESS26 products are recreated automatically.
- Restores the catalogue to exactly 117 opening units.
- Sales history, shifts and stock history are not deleted.

Firebase:
- Same existing Firebase project.
- Same RTDB path: stockFlow/data
- No cashier login / no Firebase Authentication UI.

IMPORTANT:
If Firebase shows Permission denied, the deployed RTDB rules still need to allow unauthenticated read/write for stockFlow/data. That is separate from the browser compatibility bug fixed in this build.
