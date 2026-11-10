#!/usr/bin/env python3
"""Regenerate store/data/products.json from the GBO D2C product-list Excel.

Usage:  python3 xlsx_to_products.py <path-to-xlsx>
Run it again whenever the sheet changes (e.g. after MRP / Discounted Price are filled).

Price columns it understands (case-insensitive, anywhere in the header row):
  'MRP'              -> pack mrp  (strike-through price)
  'Discounted Price' or 'Selling price' -> pack price (what the customer pays)
If a price cell is empty, the pack shows "Price on WhatsApp" on the site.
If the sheet has one price per product (not per pack), the same price is applied
to the base pack only and other packs stay null — fill per-pack prices in the
JSON or extend the sheet with per-pack columns later.
"""
import json, re, sys, unicodedata
import openpyxl

LIQUID_PACKS = ["250ml", "500ml", "1L", "5L"]
SOLID_PACKS  = ["500g", "1kg", "2kg", "4kg", "8kg", "25kg"]

ICONS = [
    ("humic", "🌱"), ("fulv", "🌱"), ("seaweed", "🌊"), ("amino", "💧"),
    ("protein", "💧"), ("zyme", "🌾"), ("granul", "🌾"), ("micro", "🦠"),
    ("bacter", "🦠"), ("azoto", "🦠"), ("rhizo", "🦠"), ("phosph", "🦠"),
    ("potash", "🦠"), ("mycor", "🍄"), ("trichoderma", "🍄"),
]

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"%", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s

def icon_for(name, category, typ):
    t = (name + " " + category).lower()
    for k, v in ICONS:
        if k in t:
            return v
    return "🦠" if "biofert" in typ.lower() else "🌿"

def split_list(s, n=5):
    if not s:
        return []
    parts = [p.strip().rstrip(".") for p in re.split(r";|\n", str(s)) if p.strip()]
    return parts[:n]

def main(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["Products (47)"] if "Products (47)" in wb.sheetnames else wb.worksheets[0]
    headers = [str(c.value).strip().lower() if c.value else "" for c in ws[1]]

    def col(*names):
        for i, h in enumerate(headers):
            for n in names:
                if n in h:
                    return i
        return None

    c = {
        "type": col("type"), "cat": col("category"), "name": col("product"),
        "form": col("form"), "what": col("what it is"), "uses": col("main uses"),
        "apply": col("how to apply"), "mix": col("mixing"), "crops": col("best for crops"),
        "fit": col("d2c fit"), "b2b": col("b2b page"), "retail": col("retail name"),
        "mrp": col("mrp"), "price": col("discounted price", "selling price"),
    }

    products = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        grade = row[c["name"]] if c["name"] is not None else None
        if not grade:
            continue
        typ = str(row[c["type"]] or "")
        form_raw = str(row[c["form"]] or "").strip().lower()
        form = "liquid" if "liquid" in form_raw else "solid"
        category = "biofertilizer" if "biofert" in typ.lower() else "biostimulant"
        cat_label = str(row[c["cat"]] or "").strip()
        retail = (row[c["retail"]] if c["retail"] is not None else None)
        name = str(retail).strip() if retail else f"{grade} ({str(row[c['form']]).strip()})"

        packs = {s: None for s in (LIQUID_PACKS if form == "liquid" else SOLID_PACKS)}
        mrp = row[c["mrp"]] if c["mrp"] is not None else None
        price = row[c["price"]] if c["price"] is not None else None
        if price or mrp:
            base = list(packs.keys())[0]
            if price and mrp:
                packs[base] = {"mrp": float(mrp), "price": float(price)}
            else:
                packs[base] = float(price or mrp)

        uses = split_list(row[c["uses"]])
        p = {
            "id": slug(str(grade) + "-" + form_raw),
            "name": name,
            "grade": str(grade).strip(),
            "category": category,
            "cat_label": cat_label,
            "form": form,
            "icon": icon_for(str(grade), cat_label, typ),
            "short": uses[0] if uses else cat_label,
            "desc": str(row[c["what"]] or "").strip(),
            "benefits": uses,
            "apply": split_list(row[c["apply"]], 6),
            "mixing": str(row[c["mix"]] or "").strip() or None,
            "crops": split_list(row[c["crops"]], 10) or ["All crops"],
            "dose": "Dose as per label and crop dose chart — ask on WhatsApp for your crop.",
            "d2c_fit": str(row[c["fit"]] or "").strip(),
            "specs_url": str(row[c["b2b"]] or "").strip() or None,
            "packs": packs,
        }
        products.append(p)

    out = json.load(open("../data/products.json"))
    out["products"] = products
    out["_generated_from"] = path.split("/")[-1]
    json.dump(out, open("../data/products.json", "w"), ensure_ascii=False, indent=1)
    bio = sum(1 for p in products if p["category"] == "biostimulant")
    print(f"Wrote {len(products)} products ({bio} biostimulants, {len(products)-bio} biofertilizers)")

if __name__ == "__main__":
    main(sys.argv[1])
