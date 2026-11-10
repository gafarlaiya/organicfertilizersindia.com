# Organic Fertilizers India — D2C Store

Plain HTML/CSS/JS storefront for organicfertilizersindia.com (Gujarat Bio Organics Pvt. Ltd.). No frameworks, no build step — upload and it runs.

## Files
- `index.html` — homepage
- `products.html` — full catalog with filters
- `product.html` — product page (reads `?id=` from URL)
- `cart.html` — cart + WhatsApp checkout
- `policies.html` — shipping/returns/privacy/terms (required by Razorpay)
- `data/products.json` — **the only file to edit for products/prices** (47 SKUs go here)
- `js/store.js` — store logic
- `css/style.css` — design
- `assets/img/` — put real product photos here, then set `"image": "assets/img/xyz.jpg"` on the product

## Edit products
Open `data/products.json`. Each product has `packs` where a value can be:
- `null` → shows "Price on WhatsApp"
- `450` → plain selling price ₹450
- `{"mrp": 500, "price": 450}` → shows ₹450 with ₹500 struck through and "10% off"

Liquids: 250ml/500ml/1L/5L. Solids: 500g/1kg/2kg/4kg/8kg/25kg. To regenerate the whole file from the Excel sheet (after filling MRP / Discounted Price), run `python3 tools/xlsx_to_products.py <sheet.xlsx>` from the `tools/` folder.

## Checkout
- Now: cart → "Confirm Order on WhatsApp" opens wa.me/919978791167 with the full order text.
- Later: Razorpay — replace `checkoutRazorpay()` in `js/store.js` with Razorpay Checkout using your key, or paste a Razorpay Payment Button. Policies page is already in place for Razorpay KYC.

## Deploy (GitHub → Hostinger)
1. Create a GitHub repo (e.g. `organicfertilizersindia.com`), push this folder's contents to it (files at repo root).
2. Hostinger hPanel → Websites → organicfertilizersindia.com → **Advanced → Git** → paste the repo URL, branch `main`, directory `public_html` → Create → Deploy.
3. Future updates: push to GitHub, click Deploy (or enable the webhook Hostinger shows for auto-deploy on push).

Alternative without GitHub: zip these files and upload via Hostinger File Manager into `public_html`.
