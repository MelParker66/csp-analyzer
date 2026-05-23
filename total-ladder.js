// Total Ladder — combined read-only view of CSP puts and covered calls

(function () {
    function toNum(v) {
        if (v === null || v === undefined || !Number.isFinite(Number(v))) return null;
        return Number(v);
    }

    function formatProbOtmDisplay(probOtm) {
        if (probOtm == null || probOtm === "") return "—";
        const n = Number(probOtm);
        if (Number.isFinite(n)) return escapeHtml(n.toFixed(2)) + "%";
        return escapeHtml(String(probOtm));
    }

    function formatPct(n) {
        if (!Number.isFinite(n)) return "—";
        return escapeHtml(n.toFixed(2)) + "%";
    }

    function formatMoney2(n) {
        if (!Number.isFinite(n)) return "—";
        return (
            "$" +
            n.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })
        );
    }

    function typeBadge(type) {
        const label = type === "PUT" ? "PUT" : "CALL";
        const mod = type === "PUT" ? "put" : "call";
        return `<span class="total-ladder-type-badge total-ladder-type-badge--${mod}">${escapeHtml(label)}</span>`;
    }

    /** Read CSP export-shaped rows from window.selectedRows (no mutation). */
    function collectPutRows() {
        const sr = window.selectedRows;
        if (!sr || typeof sr !== "object") return [];

        const rungKeys = Object.keys(sr).sort((a, b) => {
            const na = parseInt(String(a).replace(/\D/g, ""), 10) || 0;
            const nb = parseInt(String(b).replace(/\D/g, ""), 10) || 0;
            return na - nb;
        });

        const rows = [];
        for (const rungKey of rungKeys) {
            const bucket = sr[rungKey];
            if (!Array.isArray(bucket)) continue;
            for (let i = 0; i < bucket.length; i += 1) {
                const entry = bucket[i];
                if (!entry || !entry.analysis) continue;
                const a = entry.analysis;
                const probOtm =
                    entry.probOtm != null && String(entry.probOtm).trim() !== ""
                        ? entry.probOtm
                        : entry.probOTM != null
                          ? entry.probOTM
                          : a.probOTM != null
                            ? a.probOTM
                            : null;
                const returnPercent = toNum(a.returnPct);
                const dollarReturn = toNum(entry.dollarReturn);
                rows.push({
                    type: "PUT",
                    ticker:
                        entry.ticker != null && String(entry.ticker).trim() !== ""
                            ? String(entry.ticker).trim()
                            : a.ticker != null
                              ? String(a.ticker)
                              : "",
                    expiration: a.expDate != null ? String(a.expDate) : "",
                    delta: toNum(a.delta),
                    probOtm,
                    analyzedReturn: returnPercent,
                    totalProfit: dollarReturn
                });
            }
        }
        return rows;
    }

    /** Read Call export-shaped rows from window.selectedCallRows (no mutation). */
    function collectCallRows() {
        const sr = window.selectedCallRows;
        if (!sr || typeof sr !== "object") return [];

        const rungKeys = Object.keys(sr).sort((a, b) => {
            const na = parseInt(String(a).replace(/\D/g, ""), 10) || 0;
            const nb = parseInt(String(b).replace(/\D/g, ""), 10) || 0;
            return na - nb;
        });

        const rows = [];
        for (const rungKey of rungKeys) {
            const bucket = sr[rungKey];
            if (!Array.isArray(bucket)) continue;
            for (let i = 0; i < bucket.length; i += 1) {
                const entry = bucket[i];
                if (!entry || !entry.analysis) continue;
                const a = entry.analysis;
                const probOtm =
                    entry.probOtm != null && String(entry.probOtm).trim() !== ""
                        ? entry.probOtm
                        : entry.probOTM != null
                          ? entry.probOTM
                          : a.probOTM != null
                            ? a.probOTM
                            : null;
                rows.push({
                    type: "CALL",
                    ticker:
                        entry.ticker != null && String(entry.ticker).trim() !== ""
                            ? String(entry.ticker).trim()
                            : a.ticker != null
                              ? String(a.ticker)
                              : "",
                    expiration: a.expDate != null ? String(a.expDate) : "",
                    delta: toNum(a.delta),
                    probOtm,
                    analyzedReturn: toNum(a.totalReturnPercent),
                    totalProfit: toNum(a.totalProfit)
                });
            }
        }
        return rows;
    }

    function collectTotalLadderRows() {
        return [...collectPutRows(), ...collectCallRows()];
    }

    function renderTotalLadderTable(wrap) {
        if (!wrap) return;
        const data = collectTotalLadderRows();

        if (data.length === 0) {
            wrap.innerHTML =
                '<p class="results-empty ladder-export-empty">No rows selected. Select trades on the CSP Ladder and Call Ladder tabs, then return here.</p>';
            return;
        }

        let body = "";
        for (const r of data) {
            body += `
                <tr>
                    <td>${typeBadge(r.type)}</td>
                    <td>${escapeHtml(r.ticker)}</td>
                    <td>${escapeHtml(r.expiration)}</td>
                    <td>${r.delta != null ? escapeHtml(String(r.delta)) : "—"}</td>
                    <td>${formatProbOtmDisplay(r.probOtm)}</td>
                    <td>${r.analyzedReturn != null ? formatPct(r.analyzedReturn) : "—"}</td>
                    <td>${r.totalProfit != null ? escapeHtml(formatMoney2(r.totalProfit)) : "—"}</td>
                </tr>`;
        }

        wrap.innerHTML = `
            <table class="analysis-table ladder-export-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Ticker</th>
                        <th>Expiration</th>
                        <th>Delta</th>
                        <th>Prob OTM</th>
                        <th>Analyzed Return</th>
                        <th>Total Profit</th>
                    </tr>
                </thead>
                <tbody>${body}</tbody>
            </table>`;
    }

    window.renderTotalLadderTable = renderTotalLadderTable;

    function init() {
        const wrap = document.getElementById("total-ladder-table-wrap");
        if (wrap) renderTotalLadderTable(wrap);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
