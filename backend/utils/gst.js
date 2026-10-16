// GST helpers: state codes, GSTIN check, invoice maths. All money maths is done in whole paise
// (integers), never in decimals, so totals are always exact.

const STATES = [
  ["01", "Jammu and Kashmir"], ["02", "Himachal Pradesh"], ["03", "Punjab"], ["04", "Chandigarh"],
  ["05", "Uttarakhand"], ["06", "Haryana"], ["07", "Delhi"], ["08", "Rajasthan"], ["09", "Uttar Pradesh"],
  ["10", "Bihar"], ["11", "Sikkim"], ["12", "Arunachal Pradesh"], ["13", "Nagaland"], ["14", "Manipur"],
  ["15", "Mizoram"], ["16", "Tripura"], ["17", "Meghalaya"], ["18", "Assam"], ["19", "West Bengal"],
  ["20", "Jharkhand"], ["21", "Odisha"], ["22", "Chhattisgarh"], ["23", "Madhya Pradesh"], ["24", "Gujarat"],
  ["25", "Daman and Diu"], ["26", "Dadra and Nagar Haveli and Daman and Diu"], ["27", "Maharashtra"],
  ["29", "Karnataka"], ["30", "Goa"], ["31", "Lakshadweep"], ["32", "Kerala"], ["33", "Tamil Nadu"],
  ["34", "Puducherry"], ["35", "Andaman and Nicobar Islands"], ["36", "Telangana"], ["37", "Andhra Pradesh"],
  ["38", "Ladakh"], ["97", "Other Territory"],
];

// Rates the invoice form offers. Your CA confirms which ones Divyadip really needs.
const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];

const isStateCode = (c) => STATES.some(([code]) => code === c);

const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Returns null if the GSTIN is fine, otherwise a message. Checks shape, state code and the check digit.
function validateGstin(value) {
  const g = String(value || "").trim().toUpperCase();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return "GSTIN must be 15 characters, like 27ABCDE1234F1Z5.";
  if (!isStateCode(g.slice(0, 2))) return "The first two digits of the GSTIN are not a valid state code.";
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = GSTIN_CHARS.indexOf(g[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  if (GSTIN_CHARS[(36 - (sum % 36)) % 36] !== g[14]) return "This GSTIN looks mistyped (the last character does not match). Please check it.";
  return null;
}

// Financial year of a date, e.g. 2026-10-11 -> "2026-27" (April to March)
function financialYear(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

// items: [{ qty, rate, gstRate }], interstate: true -> IGST, false -> CGST + SGST
function calcInvoice(items, interstate) {
  const lines = items.map((it) => {
    const qtyMilli = Math.round(Number(it.qty) * 1000);
    const ratePaise = Math.round(Number(it.rate) * 100);
    return { amountPaise: Math.round((qtyMilli * ratePaise) / 1000) };
  });

  const byRate = new Map();
  items.forEach((it, i) => {
    const bp = Math.round(Number(it.gstRate) * 100); // rate in basis points: 18% -> 1800
    byRate.set(bp, (byRate.get(bp) || 0) + lines[i].amountPaise);
  });

  const groups = [...byRate.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bp, taxablePaise]) => {
      if (interstate) {
        return { rate: bp / 100, taxablePaise, cgstPaise: 0, sgstPaise: 0, igstPaise: Math.round((taxablePaise * bp) / 10000) };
      }
      const half = Math.round((taxablePaise * bp) / 20000);
      return { rate: bp / 100, taxablePaise, cgstPaise: half, sgstPaise: half, igstPaise: 0 };
    });

  const sum = (k) => groups.reduce((s, g) => s + g[k], 0);
  const taxablePaise = sum("taxablePaise");
  const cgstPaise = sum("cgstPaise");
  const sgstPaise = sum("sgstPaise");
  const igstPaise = sum("igstPaise");
  const totalPaise = taxablePaise + cgstPaise + sgstPaise + igstPaise;
  const grandPaise = Math.round(totalPaise / 100) * 100; // rounded to the nearest rupee
  return { lines, groups, taxablePaise, cgstPaise, sgstPaise, igstPaise, totalPaise, grandPaise, roundOffPaise: grandPaise - totalPaise };
}

module.exports = { STATES, GST_RATES, isStateCode, validateGstin, financialYear, calcInvoice };