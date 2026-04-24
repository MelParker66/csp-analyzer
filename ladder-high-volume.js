// CSP Ladder – High Volume (single rung, 10 fixed rows); depends on csp-shared.js

const selectedRows = {
    rung1: [null, null, null, null, null, null, null, null, null, null]
};

window.selectedRows = selectedRows;

const selectedRowIndexByKey = {};
const analysisCacheByKey = {};

function rowKey(rungId, rowIndex) {
    return `rung${rungId}-row${rowIndex}`;
}

function parseRowKey(key) {
    const m = /^rung(\d+)-row(\d+)$/.exec(String(key));
    if (!m) return null;
    const rungId = parseInt(m[1], 10);
    const rowIndex = parseInt(m[2], 10);
    if (!Number.isFinite(rungId) || !Number.isFinite(rowIndex)) return null;
    return { rungId, rowIndex };
}

function refreshRowResults(key) {
    const c = analysisCacheByKey[key];
    if (!c) return;
    const resultsEl = document.getElementById(c.resultsId);
    if (!resultsEl) return;
    renderTable(c.data, c.expDate, c.dte, resultsEl, {
        rungKey: key,
        selectedRowIndex: selectedRowIndexByKey[key]
    });
}

function selectRung(key, rowData, rowIndex) {
    const parsed = parseRowKey(key);
    if (!parsed) return;

    const rungKeyName = `rung${parsed.rungId}`;
    const bucket = selectedRows[rungKeyName];
    if (!Array.isArray(bucket) || bucket[parsed.rowIndex] === undefined) return;

    const ticker =
        rowData.ticker != null && String(rowData.ticker).trim() !== ""
            ? String(rowData.ticker).trim()
            : "";

    bucket[parsed.rowIndex] = {
        ticker,
        dollarReturn: rowData.dollarReturn,
        capitalRequired: rowData.capitalRequired,
        probOTM: rowData.probOTM,
        delta: rowData.delta,
        dte: rowData.dte,
        analysis: rowData
    };

    selectedRowIndexByKey[key] =
        typeof rowIndex === "number" && Number.isFinite(rowIndex) ? rowIndex : null;

    updateHighVolumeSummary();
    refreshRowResults(key);
}

window.selectRung = selectRung;

function deselectRung(key) {
    const parsed = parseRowKey(key);
    if (!parsed) return;

    const rungKeyName = `rung${parsed.rungId}`;
    const bucket = selectedRows[rungKeyName];
    if (!Array.isArray(bucket) || bucket[parsed.rowIndex] === undefined) return;

    bucket[parsed.rowIndex] = null;
    selectedRowIndexByKey[key] = null;

    updateHighVolumeSummary();
    refreshRowResults(key);
}

window.deselectRung = deselectRung;

/** Parse currency-style input to a non-negative number (no $, commas). */
function parseCapitalInvestInput(raw) {
    if (raw == null) return 0;
    const s = String(raw).replace(/[$,\s]/g, "").trim();
    if (s === "" || s === ".") return 0;
    const n = parseFloat(s);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatCapitalInvestField(invEl) {
    if (!invEl) return;
    const n = parseCapitalInvestInput(invEl.value);
    invEl.value = formatMoneyFixed2(n);
}

function countSelectedTrades() {
    let count = 0;
    for (const bucket of Object.values(selectedRows)) {
        for (const entry of bucket) {
            if (entry != null) count += 1;
        }
    }
    return count;
}

function computeCapitalUsed() {
    let used = 0;
    for (const bucket of Object.values(selectedRows)) {
        for (const entry of bucket) {
            if (entry != null && Number.isFinite(entry.capitalRequired)) used += entry.capitalRequired;
        }
    }
    return used;
}

function updateCapitalInvestPanel() {
    const usedEl = document.getElementById("capital-used-display");
    const remEl = document.getElementById("capital-remaining-display");
    const invEl = document.getElementById("capital-to-invest");
    const tradesEl = document.getElementById("trades-selected-display");
    const depEl = document.getElementById("deployment-pct-display");
    if (!usedEl || !remEl || !invEl || !tradesEl || !depEl) return;

    const capitalUsed = computeCapitalUsed();
    const capitalToInvest = parseCapitalInvestInput(invEl.value);
    const capitalRemaining = capitalToInvest - capitalUsed;
    const tradesSelected = countSelectedTrades();
    const deploymentPct = capitalToInvest > 0 ? capitalUsed / capitalToInvest : 0;

    usedEl.textContent = formatMoneyFixed2(capitalUsed);
    remEl.textContent = formatMoneyFixed2(capitalRemaining);
    tradesEl.textContent = `${tradesSelected}/10`;
    depEl.textContent = `${(deploymentPct * 100).toFixed(1)}%`;
}

function wireCapitalInvestInput() {
    const invEl = document.getElementById("capital-to-invest");
    if (!invEl) return;
    invEl.addEventListener("blur", () => {
        formatCapitalInvestField(invEl);
        updateCapitalInvestPanel();
        updateHighVolumeSummary();
    });
    invEl.addEventListener("input", () => {
        updateCapitalInvestPanel();
        updateHighVolumeSummary();
    });
}

function updateHighVolumeSummary() {
    const mount = document.getElementById("ladder-summary");
    if (!mount) return;

    let totalDollarReturn = 0;
    let totalCapitalRequired = 0;
    let sumProbOTM = 0;
    let sumDelta = 0;
    let count = 0;
    let maxDTE = 0;

    for (const bucket of Object.values(selectedRows)) {
        for (const entry of bucket) {
            if (entry == null) continue;
            totalDollarReturn += entry.dollarReturn;
            totalCapitalRequired += entry.capitalRequired;
            sumProbOTM += entry.probOTM;
            sumDelta += entry.delta;
            count += 1;
            if (Number.isFinite(entry.dte)) maxDTE = Math.max(maxDTE, entry.dte);
        }
    }

    const averageProbOTM = count > 0 ? sumProbOTM / count : 0;
    const averageDelta = count > 0 ? sumDelta / count : 0;

    const ladderReturn =
        totalCapitalRequired > 0 ? totalDollarReturn / totalCapitalRequired : 0;
    const annualizedReturn =
        ladderReturn > 0 && maxDTE > 0 ? ladderReturn * (365 / maxDTE) : 0;

    const invEl = document.getElementById("capital-to-invest");
    const capitalToInvest = invEl ? parseCapitalInvestInput(invEl.value) : 0;
    const capitalUsed = totalCapitalRequired;
    const deploymentPct = capitalToInvest > 0 ? capitalUsed / capitalToInvest : 0;

    const dollarStr = totalDollarReturn.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
    const capStr = totalCapitalRequired.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });

    mount.innerHTML = `
        <section class="card ladder-summary-card">
            <h2 class="card-title ladder-summary-title">Summary</h2>
            <hr class="ladder-summary-rule" />
            <p class="ladder-summary-line"><strong>Total Capital Required:</strong> ${capStr}</p>
            <p class="ladder-summary-line"><strong>Total Dollar Return:</strong> ${dollarStr}</p>
            <p class="ladder-summary-line"><strong>Average Prob OTM:</strong> ${averageProbOTM.toFixed(2)}%</p>
            <p class="ladder-summary-line"><strong>Average Delta:</strong> ${averageDelta.toFixed(3)}</p>
            <p class="ladder-summary-line"><strong>Ladder Return %:</strong> ${(ladderReturn * 100).toFixed(3)}%</p>
            <p class="ladder-summary-line"><strong>Annualized Return %:</strong> ${(annualizedReturn * 100).toFixed(2)}%</p>
            <p class="ladder-summary-line"><strong>Number of Trades Selected:</strong> ${count}</p>
            <p class="ladder-summary-line"><strong>Capital Deployment %:</strong> ${(deploymentPct * 100).toFixed(1)}%</p>
        </section>
    `;

    updateCapitalInvestPanel();
}

(function () {
    const RUNG = { id: 1 };
    const ROWS = 10;

    function readRow(rowEl) {
        const ticker = rowEl.querySelector(".ladder-inp-ticker")?.value?.trim() ?? "";
        const expDate = rowEl.querySelector(".ladder-inp-exp")?.value ?? "";
        const dte = parseInt(rowEl.querySelector(".ladder-inp-dte")?.value, 10);
        const strike = parseFloat(rowEl.querySelector(".ladder-inp-strike")?.value);
        const bid = parseFloat(rowEl.querySelector(".ladder-inp-bid")?.value);
        const ask = parseFloat(rowEl.querySelector(".ladder-inp-ask")?.value);
        const probITM = parseFloat(rowEl.querySelector(".ladder-inp-prob-itm")?.value);
        const delta = parseFloat(rowEl.querySelector(".ladder-inp-delta")?.value);

        const raw = [
            ticker,
            rowEl.querySelector(".ladder-inp-exp")?.value?.trim() ?? "",
            rowEl.querySelector(".ladder-inp-dte")?.value?.trim() ?? "",
            rowEl.querySelector(".ladder-inp-strike")?.value?.trim() ?? "",
            rowEl.querySelector(".ladder-inp-bid")?.value?.trim() ?? "",
            rowEl.querySelector(".ladder-inp-ask")?.value?.trim() ?? "",
            rowEl.querySelector(".ladder-inp-prob-itm")?.value?.trim() ?? "",
            rowEl.querySelector(".ladder-inp-delta")?.value?.trim() ?? ""
        ];
        const allEmpty = raw.every(s => s === "");
        if (allEmpty) return { empty: true };

        if (!Number.isFinite(dte) || !Number.isFinite(strike) || !Number.isFinite(bid) || !Number.isFinite(ask) || !Number.isFinite(probITM) || !Number.isFinite(delta)) {
            return {
                error:
                    "Each non-empty row must have DTE, Strike, Bid, Ask, Prob ITM, and Delta filled with valid numbers."
            };
        }

        if (strike <= 0) return { error: "Strike must be greater than zero." };

        return {
            row: {
                ticker,
                strike,
                bid,
                ask,
                probITM,
                delta,
                dte,
                expDate: expDate || null
            }
        };
    }

    function wireRowHandlers(stackEl, rung, rowIndex) {
        const rowEl = stackEl.querySelector(`.ladder-input-row[data-row-index="${CSS.escape(String(rowIndex))}"]`);
        const resultsEl = document.getElementById(`hv-results-rung${rung.id}-row${rowIndex}`);
        if (!rowEl || !resultsEl) return;

        rowEl.querySelector(".ladder-add-row").addEventListener("click", () => {
            const nextIndex = rowIndex + 1;
            const nextRowEl = stackEl.querySelector(
                `.ladder-input-row[data-row-index="${CSS.escape(String(nextIndex))}"]`
            );
            if (!nextRowEl) {
                alert("This rung is already at its maximum row count.");
                return;
            }
            nextRowEl.scrollIntoView({ behavior: "smooth", block: "center" });
            nextRowEl.querySelector(".ladder-inp-ticker")?.focus();
        });

        rowEl.querySelector(".ladder-analyze").addEventListener("click", () => {
            const parsed = readRow(rowEl);
            if (parsed.empty) {
                resultsEl.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml("Enter a complete row to analyze.")}</p></div>`;
                return;
            }
            if (parsed.error) {
                resultsEl.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml(parsed.error)}</p></div>`;
                return;
            }

            const analyzed = analyzeCSP([parsed.row], parsed.row.dte).map(a => ({
                ...a,
                expDate: parsed.row.expDate
            }));

            // Ensure the high-volume requirement is enforced here too:
            // Capital Required per row = strike * 100
            if (analyzed[0] && Number.isFinite(parsed.row.strike)) {
                analyzed[0].capitalRequired = parsed.row.strike * 100;
            }

            const key = rowKey(rung.id, rowIndex);
            analysisCacheByKey[key] = {
                data: analyzed,
                expDate: parsed.row.expDate || "",
                dte: parsed.row.dte,
                resultsId: resultsEl.id
            };

            // If this row was previously selected, keep selection; otherwise reset selection state.
            const currentlySelected = selectedRowIndexByKey[key] === 0;
            selectedRowIndexByKey[key] = currentlySelected ? 0 : null;

            renderTable(analyzed, parsed.row.expDate || "", parsed.row.dte, resultsEl, {
                rungKey: key,
                selectedRowIndex: selectedRowIndexByKey[key]
            });

            updateHighVolumeSummary();
        });
    }

    function init() {
        const root = document.getElementById("ladder-root");
        if (!root) return;

        const stack = document.getElementById("hv-stack-rung1");
        if (!stack) return;

        for (let i = 0; i < ROWS; i += 1) {
            wireRowHandlers(stack, RUNG, i);
        }

        wireCapitalInvestInput();
        formatCapitalInvestField(document.getElementById("capital-to-invest"));

        updateHighVolumeSummary();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

