// Call Ladder Export — read-only view of window.selectedCallRows

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

    function collectSelectedCallExportRows() {
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
                    ticker:
                        entry.ticker != null && String(entry.ticker).trim() !== ""
                            ? String(entry.ticker).trim()
                            : a.ticker != null
                              ? String(a.ticker)
                              : "",
                    expiration: a.expDate != null ? String(a.expDate) : "",
                    strike: toNum(a.strike),
                    premium: toNum(a.premium),
                    returnPercent: toNum(a.returnPct),
                    annualizedReturn: toNum(a.annualized),
                    probOtm,
                    delta: toNum(a.delta),
                    dollarReturn: toNum(entry.dollarReturn)
                });
            }
        }
        return rows;
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

    function renderCallExportTable(wrap) {
        if (!wrap) return;
        const data = collectSelectedCallExportRows();

        if (data.length === 0) {
            wrap.innerHTML =
                '<p class="results-empty ladder-export-empty">No rows selected. Select trades on the Call Ladder tab, then return here.</p>';
            return;
        }

        let body = "";
        for (const r of data) {
            body += `
                <tr>
                    <td>${escapeHtml(r.ticker)}</td>
                    <td>${escapeHtml(r.expiration)}</td>
                    <td>${r.strike != null ? escapeHtml(String(r.strike)) : "—"}</td>
                    <td>${r.premium != null ? escapeHtml("$" + r.premium.toFixed(2)) : "—"}</td>
                    <td>${r.returnPercent != null ? escapeHtml(r.returnPercent.toFixed(2)) + "%" : "—"}</td>
                    <td>${r.annualizedReturn != null ? escapeHtml(r.annualizedReturn.toFixed(2)) + "%" : "—"}</td>
                    <td>${formatProbOtmDisplay(r.probOtm)}</td>
                    <td>${r.delta != null ? escapeHtml(String(r.delta)) : "—"}</td>
                    <td>${r.dollarReturn != null ? escapeHtml(formatMoney2(r.dollarReturn)) : "—"}</td>
                </tr>`;
        }

        wrap.innerHTML = `
            <table class="analysis-table ladder-export-table">
                <thead>
                    <tr>
                        <th>Ticker</th>
                        <th>Expiration</th>
                        <th>Strike</th>
                        <th>Premium</th>
                        <th>ReturnPercent</th>
                        <th>AnnualizedReturn</th>
                        <th>Prob OTM</th>
                        <th>Delta</th>
                        <th>DollarReturn</th>
                    </tr>
                </thead>
                <tbody>${body}</tbody>
            </table>`;
    }

    window.renderCallLadderExportTable = renderCallExportTable;

    function init() {
        const wrap = document.getElementById("call-ladder-export-table-wrap");
        if (wrap) renderCallExportTable(wrap);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
