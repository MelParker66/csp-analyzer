/**
 * Serves CSPmodel static files and POST /api/export-ladder for Excel download.
 * Run: node server.js  (default port 5500)
 */
const path = require("path");
const express = require("express");
const XLSX = require("xlsx");

const app = express();
const PORT = Number(process.env.PORT) || 5500;
const ROOT = __dirname;

app.use(express.json({ limit: "2mb" }));
app.use(express.static(ROOT));

function formatProbOtmCell(probOtm) {
    if (probOtm == null || probOtm === "") return "";
    const n = Number(probOtm);
    if (Number.isFinite(n)) return n;
    return String(probOtm);
}

app.post("/api/export-ladder", (req, res) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (rows.length === 0) {
        res.status(400).json({ error: "No rows to export." });
        return;
    }

    const header = [
        "Ticker",
        "Expiration",
        "Strike",
        "Premium",
        "ReturnPercent",
        "AnnualizedReturn",
        "Prob OTM",
        "Delta",
        "CapitalRequired",
        "DollarReturn"
    ];

    const sheetData = [header];
    for (const r of rows) {
        sheetData.push([
            r.ticker != null ? String(r.ticker) : "",
            r.expiration != null ? String(r.expiration) : "",
            r.strike != null ? r.strike : "",
            r.premium != null ? r.premium : "",
            r.returnPercent != null ? r.returnPercent : "",
            r.annualizedReturn != null ? r.annualizedReturn : "",
            formatProbOtmCell(r.probOtm),
            r.delta != null ? r.delta : "",
            r.capitalRequired != null ? r.capitalRequired : "",
            r.dollarReturn != null ? r.dollarReturn : ""
        ]);
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), "Ladder Export");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="csp-ladder-export.xlsx"');
    res.send(buffer);
});

app.listen(PORT, () => {
    console.log(`CSPmodel: http://localhost:${PORT}/ladder-high-volume.html`);
    console.log(`Export API: POST http://localhost:${PORT}/api/export-ladder`);
});
