// Ladder Export tab: read-only view of window.selectedRows

(function () {
    function toNum(v) {
        if (v === null || v === undefined || !Number.isFinite(Number(v))) return null;
        return Number(v);
    }

    function collectSelectedExportRows() {
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
                rows.push({
                    ticker: entry.ticker != null && String(entry.ticker).trim() !== "" ? String(entry.ticker).trim() : (a.ticker != null ? String(a.ticker) : ""),
                    expiration: a.expDate != null ? String(a.expDate) : "",
                    strike: toNum(a.strike),
                    premium: toNum(a.premium),
                    returnPercent: toNum(a.returnPct),
                    annualizedReturn: toNum(a.annualized),
                    probOTM: toNum(a.probOTM),
                    delta: toNum(a.delta),
                    capitalRequired: toNum(entry.capitalRequired)
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

    function renderExportTable(wrap) {
        if (!wrap) return;
        const data = collectSelectedExportRows();

        if (data.length === 0) {
            wrap.innerHTML =
                '<p class="results-empty ladder-export-empty">No rows selected. Select trades on the Ladder tab, then return here.</p>';
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
                    <td>${r.probOTM != null ? escapeHtml(r.probOTM.toFixed(2)) + "%" : "—"}</td>
                    <td>${r.delta != null ? escapeHtml(String(r.delta)) : "—"}</td>
                    <td>${r.capitalRequired != null ? escapeHtml(formatMoney2(r.capitalRequired)) : "—"}</td>
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
                        <th>ProbOTM</th>
                        <th>Delta</th>
                        <th>CapitalRequired</th>
                    </tr>
                </thead>
                <tbody>${body}</tbody>
            </table>`;
    }

    function wireTabs() {
        const tabLadder = document.getElementById("ladder-subtab-ladder");
        const tabExport = document.getElementById("ladder-subtab-export");
        const panelLadder = document.getElementById("ladder-tab-panel-ladder");
        const panelExport = document.getElementById("ladder-tab-panel-export");
        const wrap = document.getElementById("ladder-export-table-wrap");

        if (!tabLadder || !tabExport || !panelLadder || !panelExport || !wrap) return;

        function showLadder() {
            tabLadder.setAttribute("aria-selected", "true");
            tabExport.setAttribute("aria-selected", "false");
            tabLadder.classList.add("ladder-subtab-active");
            tabExport.classList.remove("ladder-subtab-active");
            panelLadder.hidden = false;
            panelExport.hidden = true;
        }

        function showExport() {
            tabLadder.setAttribute("aria-selected", "false");
            tabExport.setAttribute("aria-selected", "true");
            tabLadder.classList.remove("ladder-subtab-active");
            tabExport.classList.add("ladder-subtab-active");
            panelLadder.hidden = true;
            panelExport.hidden = false;
            renderExportTable(wrap);
        }

        tabLadder.addEventListener("click", showLadder);
        tabExport.addEventListener("click", showExport);
    }

    function init() {
        wireTabs();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
