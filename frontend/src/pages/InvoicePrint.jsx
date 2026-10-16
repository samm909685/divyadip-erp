import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { api } from "../services/api";
import { amountInWords, dmy, inr, stateName } from "../utils/gstCalc";

/*
  The printable tax invoice (A4). Press Print, then choose "Save as PDF" to keep a PDF copy.
  Styles are written inline so the printed page always looks the same.
*/

const B = "1px solid #000";
const th = { border: B, padding: "4px 6px", fontWeight: 700, textAlign: "left", fontSize: 11 };
const td = { borderLeft: B, borderRight: B, padding: "3px 6px", verticalAlign: "top", fontSize: 12 };
const qtyFmt = (q) => Number(q).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

const Row = ({ label, value }) => (
  <div style={{ display: "flex", padding: "1px 0" }}>
    <span style={{ width: 118 }}>{label}</span>
    <span>: {value}</span>
  </div>
);

const Party = ({ title, p }) => (
  <div style={{ padding: "4px 8px", minHeight: 78 }}>
    <div style={{ fontWeight: 700 }}>{title} :</div>
    <div style={{ fontWeight: 700 }}>{p.name}</div>
    <div>{p.address}</div>
    <div style={{ marginTop: 6 }}>GSTIN / UIN : {p.gstin || "Unregistered"}</div>
  </div>
);

const InvoicePrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inv, setInv] = useState(null);
  const [error, setError] = useState("");
  const [copyLabel, setCopyLabel] = useState("Original Copy");

  useEffect(() => {
    api.getInvoice(id).then(setInv).catch((e) => setError(e.message));
  }, [id]);

  if (error || !inv) {
    return (
      <div className="!p-8">
        <p className={`text-sm ${error ? "font-medium text-red-600" : "text-slate-500"}`}>{error || "Loading invoice…"}</p>
        <button type="button" onClick={() => navigate("/gst-billing")} className="!mt-4 rounded-xl border border-slate-200 bg-white !px-4 !py-2 text-sm font-medium text-slate-700">
          Back to GST Billing
        </button>
      </div>
    );
  }

  const s = inv.seller;
  const cancelled = inv.status === "cancelled";
  const units = [...new Set(inv.items.map((i) => i.unit))];
  const totalQty = inv.items.reduce((sum, i) => sum + i.qty, 0);
  const fillerHeight = Math.max(0, 9 - inv.items.length) * 24;

  // One line per tax per rate, like the sample invoice
  const taxLines = inv.groups.flatMap((g) =>
    inv.interstate
      ? [{ label: "Add : IGST", rate: g.rate, amount: g.igst }]
      : [
          { label: "Add : CGST", rate: g.rate / 2, amount: g.cgst },
          { label: "Add : SGST", rate: g.rate / 2, amount: g.sgst },
        ]
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <style>{`
        @page { size: A4; margin: 0; }
        .sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          .no-print { display: none !important; }
          body, .page-bg { background: #fff !important; }
          .sheet-wrap { padding: 0 !important; }
          .sheet { box-shadow: none !important; }
        }
      `}</style>

      {/* Toolbar (not printed) */}
      <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "10px 16px", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
        <button type="button" onClick={() => navigate("/gst-billing")} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <select value={copyLabel} onChange={(e) => setCopyLabel(e.target.value)} className="rounded-xl border border-slate-200 bg-white text-sm text-slate-700" style={{ padding: "8px 12px" }}>
          {["Original Copy", "Duplicate Copy", "Triplicate Copy", "No label"].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-orange-600 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700"
          style={{ padding: "9px 18px" }}
        >
          <Printer className="h-4 w-4" /> Print
        </button>
        <span className="text-xs text-slate-500">To keep a PDF, press Print and choose “Save as PDF”.</span>
      </div>

      <div className="sheet-wrap page-bg" style={{ display: "flex", justifyContent: "center", padding: 16 }}>
        <div
          className="sheet"
          style={{
            position: "relative",
            width: "210mm",
            minHeight: "297mm",
            boxSizing: "border-box",
            padding: "8mm",
            background: "#fff",
            color: "#000",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 12,
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
          }}
        >
          {cancelled && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 2 }}>
              <span style={{ fontSize: 96, fontWeight: 800, color: "rgba(220,38,38,0.22)", transform: "rotate(-30deg)", letterSpacing: 6 }}>CANCELLED</span>
            </div>
          )}

          <div style={{ border: B }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", fontWeight: 700 }}>
              <span>GSTIN : {s.gstin}</span>
              <span style={{ fontStyle: "italic", fontWeight: 400, fontSize: 11 }}>{copyLabel === "No label" ? "" : copyLabel}</span>
            </div>
            <div style={{ textAlign: "center", padding: "0 8px 6px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>TAX INVOICE</div>
              <div style={{ fontWeight: 800, fontSize: 22, lineHeight: 1.2 }}>{s.name}</div>
              <div>{s.address}</div>
              {(s.phone || s.email) && (
                <div>
                  {s.phone ? `Mobile No : ${s.phone}` : ""}
                  {s.phone && s.email ? "  |  " : ""}
                  {s.email ? `Email : ${s.email}` : ""}
                </div>
              )}
            </div>

            {/* Invoice details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: B }}>
              <div style={{ padding: "4px 8px", borderRight: B }}>
                <Row label="Invoice No." value={inv.invoiceNo} />
                <Row label="Dated" value={dmy(inv.date)} />
                <Row label="Place of Supply" value={`${stateName(inv.placeOfSupply)} (${inv.placeOfSupply})`} />
                <Row label="Reverse Charge" value={inv.reverseCharge} />
              </div>
              <div style={{ padding: "4px 8px" }}>
                <Row label="GR/RR No." value={inv.grRrNo} />
                <Row label="Transport" value={inv.transport} />
                <Row label="Vehicle No." value={inv.vehicleNo} />
                <Row label="Station" value={inv.station} />
              </div>
            </div>

            {/* Parties */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: B }}>
              <div style={{ borderRight: B }}>
                <Party title="Billed to" p={inv.bill} />
              </div>
              <Party title="Shipped to" p={inv.ship} />
            </div>

            {/* Items */}
            <table style={{ width: "100%", borderCollapse: "collapse", borderTop: B }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: "6%" }}>S.N.</th>
                  <th style={{ ...th, width: "36%" }}>Description of Goods</th>
                  <th style={{ ...th, width: "12%" }}>HSN/SAC Code</th>
                  <th style={{ ...th, width: "10%", textAlign: "right" }}>Qty.</th>
                  <th style={{ ...th, width: "8%" }}>Unit</th>
                  <th style={{ ...th, width: "12%", textAlign: "right" }}>Price</th>
                  <th style={{ ...th, width: "16%", textAlign: "right" }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {inv.items.map((it, i) => (
                  <tr key={i}>
                    <td style={td}>{i + 1}.</td>
                    <td style={td}>{it.description}</td>
                    <td style={td}>{it.hsn}</td>
                    <td style={{ ...td, textAlign: "right" }}>{qtyFmt(it.qty)}</td>
                    <td style={td}>{it.unit}</td>
                    <td style={{ ...td, textAlign: "right" }}>{inr(it.rate)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{inr(it.amount)}</td>
                  </tr>
                ))}
                <tr>
                  {[0, 1, 2, 3, 4, 5, 6].map((c) => (
                    <td key={c} style={{ ...td, height: fillerHeight }} />
                  ))}
                </tr>
              </tbody>
            </table>

            {/* Taxable value and tax lines */}
            <div style={{ borderTop: B, padding: "4px 8px" }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span style={{ width: 110, textAlign: "right", fontWeight: 700 }}>{inr(inv.taxable)}</span>
              </div>
              {taxLines.map((t, i) => (
                <div key={i} style={{ display: "flex" }}>
                  <span style={{ flex: 1, textAlign: "right", fontStyle: "italic" }}>{t.label}</span>
                  <span style={{ width: 110, textAlign: "center" }}>@ {t.rate.toFixed(2)} %</span>
                  <span style={{ width: 110, textAlign: "right" }}>{inr(t.amount)}</span>
                </div>
              ))}
              {inv.roundOff !== 0 && (
                <div style={{ display: "flex" }}>
                  <span style={{ flex: 1, textAlign: "right", fontStyle: "italic" }}>Round off</span>
                  <span style={{ width: 110 }} />
                  <span style={{ width: 110, textAlign: "right" }}>{inv.roundOff > 0 ? "" : "-"}{inr(Math.abs(inv.roundOff))}</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", borderTop: B, padding: "4px 8px", fontWeight: 700, fontSize: 13 }}>
              <span style={{ flex: 1, textAlign: "right" }}>Grand Total</span>
              <span style={{ width: 150, textAlign: "center" }}>
                {qtyFmt(totalQty)} {units.length === 1 ? units[0] : ""}
              </span>
              <span style={{ width: 130, textAlign: "right" }}>₹ {inr(inv.grand)}</span>
            </div>

            {/* Tax summary */}
            <table style={{ borderCollapse: "collapse", margin: "6px 8px", fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={th}>Tax Rate</th>
                  <th style={{ ...th, textAlign: "right" }}>Taxable Amt.</th>
                  {inv.interstate ? (
                    <th style={{ ...th, textAlign: "right" }}>IGST Amt.</th>
                  ) : (
                    <>
                      <th style={{ ...th, textAlign: "right" }}>CGST Amt.</th>
                      <th style={{ ...th, textAlign: "right" }}>SGST Amt.</th>
                    </>
                  )}
                  <th style={{ ...th, textAlign: "right" }}>Total Tax</th>
                </tr>
              </thead>
              <tbody>
                {inv.groups.map((g, i) => (
                  <tr key={i}>
                    <td style={{ ...td, border: B }}>{g.rate}%</td>
                    <td style={{ ...td, border: B, textAlign: "right" }}>{inr(g.taxable)}</td>
                    {inv.interstate ? (
                      <td style={{ ...td, border: B, textAlign: "right" }}>{inr(g.igst)}</td>
                    ) : (
                      <>
                        <td style={{ ...td, border: B, textAlign: "right" }}>{inr(g.cgst)}</td>
                        <td style={{ ...td, border: B, textAlign: "right" }}>{inr(g.sgst)}</td>
                      </>
                    )}
                    <td style={{ ...td, border: B, textAlign: "right" }}>{inr(g.cgst + g.sgst + g.igst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: B, padding: "5px 8px", fontWeight: 700, fontSize: 13 }}>{amountInWords(Math.round(inv.grand * 100))}</div>

            {s.bankDetails && (
              <div style={{ borderTop: B, padding: "5px 8px", whiteSpace: "pre-wrap" }}>
                <b>Bank Details :</b> {s.bankDetails}
              </div>
            )}

            {/* Terms and signatures */}
            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", borderTop: B }}>
              <div style={{ padding: "5px 8px", borderRight: B, fontSize: 11, whiteSpace: "pre-wrap" }}>
                <b>Terms &amp; Conditions</b>
                {"\n"}
                {s.terms}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "5px 8px", borderBottom: B, minHeight: 44, fontWeight: 700, fontSize: 11 }}>Receiver&apos;s Signature :</div>
                <div style={{ padding: "5px 8px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "right", minHeight: 80 }}>
                  <span style={{ fontWeight: 700 }}>For {s.name}</span>
                  <span style={{ fontWeight: 700 }}>Authorised Signatory</span>
                </div>
              </div>
            </div>
          </div>

          {cancelled && (
            <p style={{ marginTop: 8, fontSize: 11 }}>
              This invoice was cancelled{inv.cancelReason ? `: ${inv.cancelReason}` : ""}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoicePrint;