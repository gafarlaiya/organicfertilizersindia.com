/* Organic Fertilizers India — storefront logic (no frameworks)
   Data lives in data/products.json. Cart lives in localStorage.
   Checkout = WhatsApp order message now; Razorpay hook ready (see checkoutRazorpay). */

const WA_FALLBACK = "919978791167";
let DB = { store: {}, products: [] };

async function loadDB() {
  if (DB.products.length) return DB;
  const res = await fetch("data/products.json");
  DB = await res.json();
  return DB;
}

/* ---------- helpers ---------- */
const inr = n => "₹" + Number(n).toLocaleString("en-IN");
function qs(name) { return new URLSearchParams(location.search).get(name); }

/* A pack value can be: null | 450 | {mrp: 500, price: 450} */
function packVal(v) {
  if (v === null || v === undefined) return { price: null, mrp: null };
  if (typeof v === "number") return { price: v, mrp: null };
  return { price: v.price ?? null, mrp: v.mrp ?? null };
}

function cartGet() {
  try { return JSON.parse(localStorage.getItem("ofi_cart") || "[]"); }
  catch (e) { return []; }
}
function cartSet(c) {
  try { localStorage.setItem("ofi_cart", JSON.stringify(c)); } catch (e) {}
  updateCartCount();
}
function updateCartCount() {
  const n = cartGet().reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll(".cart-count").forEach(el => el.textContent = n);
}

function minPrice(p) {
  const vals = Object.values(p.packs).map(v => packVal(v).price).filter(v => v !== null);
  return vals.length ? Math.min(...vals) : null;
}

/* ---------- catalog ---------- */
function productCard(p) {
  const mp = minPrice(p);
  const priceLine = mp !== null ? `From <b>${inr(mp)}</b>` : `<b>Price on WhatsApp</b>`;
  return `
  <div class="card" data-cat="${p.category}" data-form="${p.form}">
    <a href="product.html?id=${p.id}">
      <div class="thumb">${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy">` : p.icon}</div>
    </a>
    <div class="body">
      <span class="tag">${p.cat_label || (p.category === "biofertilizer" ? "Biofertilizer" : "Biostimulant")} · ${p.form}</span>
      <h3><a href="product.html?id=${p.id}">${p.name}</a></h3>
      <div class="from">${priceLine}</div>
      <a class="btn btn-green" href="product.html?id=${p.id}">View &amp; Buy</a>
    </div>
  </div>`;
}

async function renderCatalog(targetId, limit) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const db = await loadDB();
  let list = db.products;
  if (limit) list = list.slice(0, limit);
  el.innerHTML = list.map(productCard).join("");
  updateCartCount();
}

function applyFilter(btn, value) {
  document.querySelectorAll(".filters .chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll("#catalog .card").forEach(card => {
    const show = value === "all" || card.dataset.cat === value || card.dataset.form === value;
    card.style.display = show ? "" : "none";
  });
}

/* ---------- product page ---------- */
let CURRENT = { p: null, pack: null, qty: 1 };

async function renderProduct() {
  const wrap = document.getElementById("pwrap");
  if (!wrap) return;
  const db = await loadDB();
  const p = db.products.find(x => x.id === qs("id")) || db.products[0];
  CURRENT.p = p;
  const packs = Object.keys(p.packs);
  CURRENT.pack = packs[0];
  CURRENT.qty = 1;
  document.title = p.name + " — " + (db.store.brand || "Organic Fertilizers India");

  const applyBlock = (p.apply && p.apply.length)
    ? `<p style="margin-top:14px"><b>How to apply:</b></p>
       <ul class="benefits">${p.apply.map(a => `<li>${a}</li>`).join("")}</ul>` : "";
  const mixBlock = p.mixing ? `<p style="margin-top:10px"><b>Mixing note:</b> ${p.mixing}</p>` : "";
  const specsLink = p.specs_url
    ? `<p style="margin-top:10px"><a href="${p.specs_url}" target="_blank" rel="noopener" style="color:var(--green);font-weight:700">Full technical specifications →</a></p>` : "";

  wrap.innerHTML = `
    <div class="pimg">${p.image ? `<img src="${p.image}" alt="${p.name}"><span class="img-note">Illustrative image</span>` : p.icon}</div>
    <div class="pinfo">
      <span class="tag">${p.cat_label || ""} · ${p.category === "biofertilizer" ? "Biofertilizer" : "Biostimulant"} · ${p.form}</span>
      <h1>${p.name}</h1>
      <p>${p.desc || ""}</p>
      <div class="price" id="price"></div>
      <div><b>Select pack:</b></div>
      <div class="packs" id="packs">
        ${packs.map((s, i) => `<button class="pack${i === 0 ? " active" : ""}" onclick="pickPack(this,'${s}')">${s}</button>`).join("")}
      </div>
      <div class="qty">
        <b>Qty:</b>
        <button onclick="chQty(-1)">−</button><span id="qty">1</span><button onclick="chQty(1)">+</button>
      </div>
      <div class="pactions">
        <button class="btn btn-accent" onclick="addToCart()">Add to Cart</button>
        <button class="btn btn-wa" onclick="buyNowWA()">Order on WhatsApp</button>
      </div>
      <ul class="benefits">${(p.benefits || []).map(b => `<li>${b}</li>`).join("")}</ul>
      ${applyBlock}
      ${mixBlock}
      <p style="margin-top:10px"><b>Dose:</b> ${p.dose || "As per label — ask on WhatsApp for your crop."}</p>
      <div class="crops">${(p.crops || []).map(c => `<span>${c}</span>`).join("")}</div>
      ${specsLink}
      <div class="note">Results vary by farm, soil and season. Experiences shared on this site are individual farmer reports, not product guarantees. Always follow label directions.</div>
    </div>`;
  paintPrice();
  updateCartCount();
}

function paintPrice() {
  const v = packVal(CURRENT.p.packs[CURRENT.pack]);
  let html;
  if (v.price === null) {
    html = `Price on WhatsApp <small>/ ${CURRENT.pack}</small>`;
  } else if (v.mrp && v.mrp > v.price) {
    const off = Math.round((1 - v.price / v.mrp) * 100);
    html = `${inr(v.price)} <s style="color:var(--muted);font-size:1rem;font-weight:500">${inr(v.mrp)}</s> <span style="color:var(--accent);font-size:.95rem">${off}% off</span> <small>/ ${CURRENT.pack} · incl. of all taxes</small>`;
  } else {
    html = `${inr(v.price)} <small>/ ${CURRENT.pack} · incl. of all taxes</small>`;
  }
  document.getElementById("price").innerHTML = html;
}
function pickPack(btn, s) {
  CURRENT.pack = s;
  document.querySelectorAll(".pack").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  paintPrice();
}
function chQty(d) {
  CURRENT.qty = Math.max(1, CURRENT.qty + d);
  document.getElementById("qty").textContent = CURRENT.qty;
}
function addToCart() {
  const c = cartGet();
  const key = CURRENT.p.id + "|" + CURRENT.pack;
  const v = packVal(CURRENT.p.packs[CURRENT.pack]);
  const found = c.find(i => i.key === key);
  if (found) found.qty += CURRENT.qty;
  else c.push({ key, id: CURRENT.p.id, name: CURRENT.p.name, pack: CURRENT.pack,
                price: v.price, qty: CURRENT.qty });
  cartSet(c);
  location.href = "cart.html";
}
function buyNowWA() {
  const p = CURRENT.p, v = packVal(p.packs[CURRENT.pack]);
  waOrder(`Namaste 🙏 I want to order:\n• ${p.name} — ${CURRENT.pack} × ${CURRENT.qty}` +
    (v.price !== null ? ` (${inr(v.price)} each)` : " (please send price)") +
    `\n\nPlease confirm total with delivery. My address/PIN: `);
}

/* ---------- cart page ---------- */
async function renderCart() {
  const box = document.getElementById("cartbox");
  if (!box) return;
  await loadDB();
  const c = cartGet();
  if (!c.length) {
    box.innerHTML = `<p style="text-align:center;padding:40px 0">Your cart is empty. <a href="products.html" style="color:var(--green);font-weight:700">Browse products →</a></p>`;
    updateCartCount(); return;
  }
  let total = 0, unknown = false;
  const rows = c.map((i, idx) => {
    const line = i.price !== null ? i.price * i.qty : null;
    if (line !== null) total += line; else unknown = true;
    return `<tr>
      <td><b>${i.name}</b><br><small>${i.pack}</small></td>
      <td>${i.price !== null ? inr(i.price) : "On WhatsApp"}</td>
      <td>
        <button onclick="cQty(${idx},-1)">−</button> ${i.qty} <button onclick="cQty(${idx},1)">+</button>
      </td>
      <td>${line !== null ? inr(line) : "—"}</td>
      <td><button class="rm" onclick="cRm(${idx})">Remove</button></td>
    </tr>`;
  }).join("");
  box.innerHTML = `
    <table class="cart-table">
      <tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th><th></th></tr>${rows}
    </table>
    <div class="cart-total">Total: ${inr(total)}${unknown ? " + items priced on WhatsApp" : ""}</div>
    <div class="note">${DB.store.shipping_note || ""} ${DB.store.payment_note || ""}</div>
    <div class="cart-actions">
      <button class="btn btn-wa" onclick="checkoutWA()">Confirm Order on WhatsApp</button>
      <button class="btn btn-accent" onclick="checkoutRazorpay()">Pay Online</button>
    </div>`;
  updateCartCount();
}
function cQty(i, d) { const c = cartGet(); c[i].qty = Math.max(1, c[i].qty + d); cartSet(c); renderCart(); }
function cRm(i) { const c = cartGet(); c.splice(i, 1); cartSet(c); renderCart(); }

function checkoutWA() {
  const c = cartGet();
  let total = 0;
  const lines = c.map(i => {
    const line = i.price !== null ? i.price * i.qty : null;
    if (line) total += line;
    return `• ${i.name} — ${i.pack} × ${i.qty}` + (line ? ` = ${inr(line)}` : " (send price)");
  });
  waOrder(`Namaste 🙏 My order from OrganicFertilizersIndia.com:\n${lines.join("\n")}\n\nItems total: ${inr(total)}\nName: \nAddress & PIN: \nPlease confirm final amount with delivery.`);
}

/* Razorpay goes live later: replace this with Razorpay Checkout (your key) or a Payment Button. */
function checkoutRazorpay() {
  alert("Online payment is being activated. For now, confirm your order on WhatsApp — we will send you a secure Razorpay payment link.");
  checkoutWA();
}

function waOrder(text) {
  const num = (DB.store && DB.store.whatsapp) || WA_FALLBACK;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank");
}

document.addEventListener("DOMContentLoaded", () => {
  renderCatalog("catalog");
  renderCatalog("featured", 4);
  renderProduct();
  renderCart();
  updateCartCount();
});
