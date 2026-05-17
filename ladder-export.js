// Ladder Export tab: read-only view of window.selectedRows + Excel export via /api/export-ladder

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
                    capitalRequired: toNum(entry.capitalRequired),
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

    function computeExportSummary(data) {
        if (!data.length) return null;

        let totalCapital = 0;
        let totalDollarReturn = 0;
        let sumDelta = 0;
        let sumProbOtm = 0;
        let sumAnnualizedReturn = 0;
        let countDelta = 0;
        let countProbOtm = 0;
        let countAnnualized = 0;

        for (const row of data) {
            if (row.capitalRequired != null) totalCapital += row.capitalRequired;
            if (row.dollarReturn != null) totalDollarReturn += row.dollarReturn;

            if (row.delta != null) {
                sumDelta += row.delta;
                countDelta += 1;
            }

            const probOtmNum = toNum(row.probOtm);
            if (probOtmNum != null) {
                sumProbOtm += probOtmNum;
                countProbOtm += 1;
            }

            if (row.annualizedReturn != null) {
                sumAnnualizedReturn += row.annualizedReturn;
                countAnnualized += 1;
            }
        }

        return {
            totalCapital,
            totalDollarReturn,
            avgDelta: countDelta > 0 ? sumDelta / countDelta : 0,
            avgProbOtm: countProbOtm > 0 ? sumProbOtm / countProbOtm : 0,
            avgAnnualizedReturn: countAnnualized > 0 ? sumAnnualizedReturn / countAnnualized : 0
        };
    }

    function renderExportSummary(mount, data) {
        if (!mount) return;

        if (!data.length) {
            mount.innerHTML = "";
            return;
        }

        const s = computeExportSummary(data);
        if (!s) {
            mount.innerHTML = "";
            return;
        }

        const capStr = s.totalCapital.toLocaleString("en-US", {
            style: "currency",
            currency: "USD"
        });
        const dollarStr = s.totalDollarReturn.toLocaleString("en-US", {
            style: "currency",
            currency: "USD"
        });

        mount.innerHTML = `
            <section class="card ladder-summary-card ladder-export-summary-card">
                <h2 class="card-title ladder-summary-title">Export Summary</h2>
                <hr class="ladder-summary-rule" />
                <div class="summary-row ladder-summary-line">
                    <span class="summary-label"><strong>Total Capital Required:</strong></span>
                    <span class="summary-value">${escapeHtml(capStr)}</span>
                </div>
                <div class="summary-row ladder-summary-line">
                    <span class="summary-label"><strong>Total Dollar Return:</strong></span>
                    <span class="summary-value">${escapeHtml(dollarStr)}</span>
                </div>
                <div class="summary-row ladder-summary-line">
                    <span class="summary-label"><strong>Average Delta:</strong></span>
                    <span class="summary-value">${escapeHtml(s.avgDelta.toFixed(3))}</span>
                </div>
                <div class="summary-row ladder-summary-line">
                    <span class="summary-label"><strong>Average Prob OTM:</strong></span>
                    <span class="summary-value">${escapeHtml(s.avgProbOtm.toFixed(2))}%</span>
                </div>
                <div class="summary-row ladder-summary-line">
                    <span class="summary-label"><strong>Average Annualized Return:</strong></span>
                    <span class="summary-value">${escapeHtml(s.avgAnnualizedReturn.toFixed(2))}%</span>
                </div>
            </section>`;
    }

    function renderExportTable(wrap) {
        if (!wrap) return;
        const data = collectSelectedExportRows();
        const summaryMount = document.getElementById("ladder-export-summary-mount");

        if (data.length === 0) {
            wrap.innerHTML =
                '<p class="results-empty ladder-export-empty">No rows selected. Select trades on the Ladder tab, then return here.</p>';
            renderExportSummary(summaryMount, data);
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
                    <td>${r.capitalRequired != null ? escapeHtml(formatMoney2(r.capitalRequired)) : "—"}</td>
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
                        <th>CapitalRequired</th>
                        <th>DollarReturn</th>
                    </tr>
                </thead>
                <tbody>${body}</tbody>
            </table>`;

        renderExportSummary(summaryMount, data);
    }

    function exportLadderToExcel() {
        const data = collectSelectedExportRows();
        if (data.length === 0) {
            alert("Select at least one trade on the Ladder tab before exporting.");
            return;
        }

        fetch("/api/export-ladder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows: data })
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error("Export request failed");
                }
                return res.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "csp-ladder-export.xlsx";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            })
            .catch(() => {
                alert("Export failed. Start the app with node server.js (not http-server) so /api/export-ladder is available.");
            });
    }

    window.exportLadderToExcel = exportLadderToExcel;
    window.renderLadderExportTable = renderExportTable;

    function wireTabs() {
        const tabLadder = document.getElementById("ladder-subtab-ladder");
        const tabExport = document.getElementById("ladder-subtab-export");
        const panelLadder = document.getElementById("ladder-tab-panel-ladder");
        const panelExport = document.getElementById("ladder-tab-panel-export");
        const wrap = document.getElementById("ladder-export-table-wrap");
        const exportBtn = document.getElementById("export-panel-export-btn");

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

        if (exportBtn) {
            exportBtn.addEventListener("click", () => {
                renderExportTable(wrap);
                exportLadderToExcel();
            });
        }
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
