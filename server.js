const express = require("express");
const XLSX = require("xlsx");

const app = express();
const PORT = process.env.PORT || 3000;
const root = __dirname;

app.use(express.json({ limit: "1mb" }));

app.post("/api/export-ladder", (req, res) => {
    const body = req.body;
    const rows = body && Array.isArray(body.rows) ? body.rows : null;
    if (!rows) {
        res.status(400).json({ error: "Request body must be a JSON object with a rows array." });
        return;
    }

    const headers = [
        "Ticker",
        "Expiration",
        "Strike",
        "Premium",
        "ReturnPercent",
        "AnnualizedReturn",
        "ProbOTM",
        "Delta",
        "CapitalRequired"
    ];

    const aoa = [headers];

    for (const r of rows) {
        if (!r || typeof r !== "object") continue;
        const ticker = r.ticker != null ? String(r.ticker) : "";
        const expiration = r.expiration != null ? String(r.expiration) : "";
        const strike = toNum(r.strike);
        const premium = toNum(r.premium);
        const returnPercent = toNum(r.returnPercent != null ? r.returnPercent : r.returnPct);
        const annualizedReturn = toNum(
            r.annualizedReturn != null ? r.annualizedReturn : r.annualized
        );
        const probOTM = toNum(r.probOTM);
        const delta = toNum(r.delta);
        const capitalRequired = toNum(r.capitalRequired);

        aoa.push([
            ticker,
            expiration,
            strike,
            premium,
            returnPercent,
            annualizedReturn,
            probOTM,
            delta,
            capitalRequired
        ]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, "Ladder");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = "csp-ladder-export.xlsx";
    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buf);
});

function toNum(v) {
    if (v === null || v === undefined || v === "") return "";
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[$,%\s]/g, ""));
    return Number.isFinite(n) ? n : "";
}

app.use(express.static(root));

app.listen(PORT, () => {
    console.log(`CSP model server at http://localhost:${PORT}/ (static + POST /api/export-ladder)`);
});
