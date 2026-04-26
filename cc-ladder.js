// Covered Calls ladder — full-width page, summary bar, selection (no capital / CSP deps).

const CC_ROWS = 5;

/** @type {(null | CcSelectionEntry)[]} */
const ccSelectedByRow = new Array(CC_ROWS).fill(null);

/** @type {Record<string, number | null>} */
const ccSelectedRowIndexByKey = {};

/** @type {Record<string, { data: CcAnalyzedRow[]; expDate: string; dte: number; resultsId: string }>} */
const ccAnalysisCache = {};

/**
 * @typedef {object} CcInputRow
 * @property {string} ticker
 * @property {string | null} expDate
 * @property {number} dte
 * @property {number} contracts
 * @property {number} sharesOwned
 * @property {number} costBasis
 * @property {number} strike
 * @property {number} bid
 * @property {number} ask
 * @property {number} probITM
 * @property {number} delta
 */

/**
 * @typedef {CcInputRow & {
 *   premium: number;
 *   breakeven: number;
 *   returnPct: number;
 *   annualized: number;
 *   upsideIfCalled: number;
 *   totalProfitIfCalled: number;
 *   effectiveSalePrice: number;
 *   dollarReturn: number;
 *   upsideDollars: number;
 *   totalProfitDollars: number;
 *   probOTM: number;
 *   capitalRequired: number;
 * }} CcAnalyzedRow
 */

/**
 * @typedef {object} CcSelectionEntry
 * @property {string} ticker
 * @property {number} dollarReturn
 * @property {number} upsideDollars
 * @property {number} totalProfitDollars
 * @property {number} probOTM
 * @property {number} delta
 * @property {number} dte
 * @property {number} costBasisWeighted
 * @property {CcAnalyzedRow} analysis
 */

function rowCcKey(rowIndex) {
    return `cc-${rowIndex}`;
}

function parseCcKey(key) {
    const m = /^cc-(\d+)$/.exec(String(key));
    if (!m) return null;
    const rowIndex = parseInt(m[1], 10);
    return Number.isFinite(rowIndex) ? rowIndex : null;
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatMoney(amount) {
    return Number(amount).toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
}

/**
 * @param {HTMLElement} rowEl
 * @returns {{ empty: true } | { error: string } | { row: CcInputRow }}
 */
function readRow(rowEl) {
    const ticker = rowEl.querySelector(".cc-inp-ticker")?.value?.trim() ?? "";
    const expDate = rowEl.querySelector(".cc-inp-exp")?.value ?? "";
    const dte = parseInt(rowEl.querySelector(".cc-inp-dte")?.value, 10);
    const contracts = parseInt(rowEl.querySelector(".cc-inp-contracts")?.value, 10) || 1;
    const sharesOwned = parseInt(rowEl.querySelector(".cc-inp-shares")?.value, 10);
    const costBasis = parseFloat(rowEl.querySelector(".cc-inp-cost-basis")?.value);
    const strike = parseFloat(rowEl.querySelector(".cc-inp-strike")?.value);
    const bid = parseFloat(rowEl.querySelector(".cc-inp-bid")?.value);
    const ask = parseFloat(rowEl.querySelector(".cc-inp-ask")?.value);
    const probITM = parseFloat(rowEl.querySelector(".cc-inp-prob-itm")?.value);
    const delta = parseFloat(rowEl.querySelector(".cc-inp-delta")?.value);

    const raw = [
        ticker,
        rowEl.querySelector(".cc-inp-exp")?.value?.trim() ?? "",
        rowEl.querySelector(".cc-inp-dte")?.value?.trim() ?? "",
        rowEl.querySelector(".cc-inp-shares")?.value?.trim() ?? "",
        rowEl.querySelector(".cc-inp-cost-basis")?.value?.trim() ?? "",
        rowEl.querySelector(".cc-inp-strike")?.value?.trim() ?? "",
        rowEl.querySelector(".cc-inp-bid")?.value?.trim() ?? "",
        rowEl.querySelector(".cc-inp-ask")?.value?.trim() ?? "",
        rowEl.querySelector(".cc-inp-prob-itm")?.value?.trim() ?? "",
        rowEl.querySelector(".cc-inp-delta")?.value?.trim() ?? ""
    ];
    const allEmpty = raw.every(s => s === "");
    if (allEmpty) return { empty: true };

    if (
        !Number.isFinite(dte) ||
        dte <= 0 ||
        !Number.isFinite(sharesOwned) ||
        sharesOwned < 0 ||
        !Number.isFinite(costBasis) ||
        costBasis <= 0 ||
        !Number.isFinite(strike) ||
        !Number.isFinite(bid) ||
        !Number.isFinite(ask) ||
        !Number.isFinite(probITM) ||
        !Number.isFinite(delta)
    ) {
        return {
            error:
                "Each non-empty row must have positive DTE, non-negative Shares Owned, positive Cost Basis, Strike, Bid, Ask, Prob ITM, and Delta filled with valid numbers."
        };
    }

    if (!Number.isFinite(contracts) || contracts < 1) {
        return { error: "Contracts must be at least 1." };
    }

    return {
        row: {
            ticker,
            expDate: expDate && String(expDate).trim() ? String(expDate).trim() : null,
            dte,
            contracts,
            sharesOwned,
            costBasis,
            strike,
            bid,
            ask,
            probITM,
            delta
        }
    };
}

/**
 * @param {CcInputRow} row
 * @returns {CcAnalyzedRow[]}
 */
function analyzeCC(row) {
    const premium = (row.bid + row.ask) / 2;
    const breakeven = row.costBasis - premium;
    const returnPct = premium / row.costBasis;
    const annualized = returnPct * (365 / row.dte);
    const upsideIfCalled = row.strike - row.costBasis;
    const totalProfitIfCalled = premium + upsideIfCalled;
    const effectiveSalePrice = row.costBasis - premium;
    const dollarReturn = premium * 100 * row.contracts;
    const upsideDollars = upsideIfCalled * 100 * row.contracts;
    const totalProfitDollars = totalProfitIfCalled * 100 * row.contracts;
    const probOTM = 100 - row.probITM;

    /** @type {CcAnalyzedRow} */
    const out = {
        ...row,
        premium,
        breakeven,
        returnPct,
        annualized,
        upsideIfCalled,
        totalProfitIfCalled,
        effectiveSalePrice,
        dollarReturn,
        upsideDollars,
        totalProfitDollars,
        probOTM,
        capitalRequired: 0
    };
    return [out];
}

/**
 * @param {HTMLElement} resultsEl
 * @param {CcAnalyzedRow[]} data
 * @param {{ rungKey?: string; selectedRowIndex?: number | null }} [options]
 */
function renderCCAnalysisTable(resultsEl, data, options) {
    if (!resultsEl || !Array.isArray(data) || data.length === 0) {
        if (resultsEl) {
            resultsEl.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml("No analysis rows to display.")}</p></div>`;
        }
        return;
    }

    const rid = resultsEl.id || "cc-results";
    const rungKey = options && options.rungKey;
    const selectedRowIndex =
        options && options.selectedRowIndex !== undefined ? options.selectedRowIndex : null;

    const row = data[0];
    const hasSelect = Boolean(rungKey);
    const detailColspan = hasSelect ? 11 : 10;

    const expLine =
        row.expDate && String(row.expDate).trim()
            ? `<p class="analysis-intro"><strong>Expiration:</strong> ${escapeHtml(String(row.expDate).trim())}</p>`
            : "";

    const selectHeader = hasSelect ? `<th class="analysis-th-select"></th>` : "";

    let html = `
        <section class="card">
            <h2 class="card-title">CC Analysis</h2>
            ${expLine}
            <table class="analysis-table">
                <thead>
                    <tr>
                        <th>Strike</th>
                        <th>Premium</th>
                        <th>Return %</th>
                        <th>Breakeven</th>
                        <th>Upside If Called</th>
                        <th>Total Profit If Called</th>
                        <th>Prob OTM</th>
                        <th>Delta</th>
                        <th>Capital Required</th>
                        <th></th>
                        ${selectHeader}
                    </tr>
                </thead>
                <tbody>
    `;

    const i = 0;
    const detailId = `${rid}-cc-detail-${i}`;
    const rowSelected = hasSelect && selectedRowIndex === i;
    const selectCell = hasSelect
        ? rowSelected
            ? `<td class="analysis-td-select">
                <button type="button" class="btn btn-secondary cc-deselect-btn">Deselect</button>
            </td>`
            : `<td class="analysis-td-select">
                <button type="button" class="btn cc-select-btn" data-row-index="${i}">Select</button>
            </td>`
        : "";

    const formatMoneyFixed2 = n =>
        "$" +
        Number(n).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    const rowClass = `analysis-data-row${rowSelected ? " csp-selected-row" : ""}`;
    html += `
            <tr class="${rowClass}">
                <td>${escapeHtml(String(row.strike))}</td>
                <td>${row.premium.toFixed(2)}</td>
                <td>${(row.returnPct * 100).toFixed(2)}%</td>
                <td>${row.breakeven.toFixed(2)}</td>
                <td>${row.upsideIfCalled.toFixed(2)}</td>
                <td>${row.totalProfitIfCalled.toFixed(2)}</td>
                <td>${row.probOTM.toFixed(2)}%</td>
                <td>${Number.isFinite(row.delta) ? row.delta.toFixed(3) : escapeHtml(String(row.delta))}</td>
                <td>${formatMoneyFixed2(row.capitalRequired)}</td>
                <td>
                    <button type="button" class="btn cc-show-details-btn" data-detail-target="${detailId}" aria-expanded="false" aria-controls="${detailId}">Show Details</button>
                </td>
                ${selectCell}
            </tr>
            <tr id="${detailId}" class="csp-detail-row" hidden>
                <td colspan="${detailColspan}">
                    <section class="card recommended-csp csp-row-detail-box">
                        <div class="csp-ladder-analysis-block">
                            <p class="rec-detail"><strong>Contracts:</strong> ${escapeHtml(String(row.contracts))}</p>
                            <p class="rec-detail"><strong>Shares Owned:</strong> ${escapeHtml(String(row.sharesOwned))}</p>
                            <p class="rec-detail"><strong>Cost Basis:</strong> $${row.costBasis.toFixed(2)}</p>
                            <p class="rec-detail"><strong>Dollar Return:</strong> ${formatMoney(row.dollarReturn)}</p>
                            <p class="rec-detail"><strong>Upside Dollars:</strong> ${formatMoney(row.upsideDollars)}</p>
                            <p class="rec-detail"><strong>Total Profit Dollars:</strong> ${formatMoney(row.totalProfitDollars)}</p>
                            <p class="rec-detail"><strong>Effective Sale Price:</strong> $${row.effectiveSalePrice.toFixed(2)}</p>
                            <p class="rec-detail"><strong>Expiration Date:</strong> ${row.expDate ? escapeHtml(String(row.expDate)) : "—"}</p>
                            <p class="rec-detail"><strong>DTE:</strong> ${escapeHtml(String(row.dte))}</p>
                        </div>
                    </section>
                </td>
            </tr>
    `;

    html += `
                </tbody>
            </table>
        </section>
    `;

    resultsEl.innerHTML = html;

    resultsEl.querySelectorAll(".cc-show-details-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-detail-target");
            const detailRow = targetId ? resultsEl.querySelector(`#${CSS.escape(targetId)}`) : null;
            if (!detailRow) return;
            detailRow.hidden = !detailRow.hidden;
            btn.setAttribute("aria-expanded", detailRow.hidden ? "false" : "true");
        });
    });

    if (rungKey && typeof window.selectRung === "function") {
        resultsEl.querySelectorAll(".cc-select-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.getAttribute("data-row-index"), 10);
                if (!Number.isFinite(idx) || data[idx] === undefined) return;
                window.selectRung(rungKey, data[idx], idx);
            });
        });
        resultsEl.querySelectorAll(".cc-deselect-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                if (typeof window.deselectRung === "function") window.deselectRung(rungKey);
            });
        });
    }
}

function refreshCcRowResults(key) {
    const c = ccAnalysisCache[key];
    if (!c) return;
    const resultsEl = document.getElementById(c.resultsId);
    if (!resultsEl) return;
    renderCCAnalysisTable(resultsEl, c.data, {
        rungKey: key,
        selectedRowIndex: ccSelectedRowIndexByKey[key] ?? null
    });
}

/**
 * @param {string} key
 * @param {CcAnalyzedRow} rowData
 * @param {number | null} rowIndex
 */
function selectRung(key, rowData, rowIndex) {
    const ladderRowIndex = parseCcKey(key);
    if (ladderRowIndex === null || ladderRowIndex < 0 || ladderRowIndex >= CC_ROWS) return;

    const ticker =
        rowData.ticker != null && String(rowData.ticker).trim() !== ""
            ? String(rowData.ticker).trim()
            : "";

    const costBasisWeighted = rowData.costBasis * 100 * rowData.contracts;

    ccSelectedByRow[ladderRowIndex] = {
        ticker,
        dollarReturn: rowData.dollarReturn,
        upsideDollars: rowData.upsideDollars,
        totalProfitDollars: rowData.totalProfitDollars,
        probOTM: rowData.probOTM,
        delta: rowData.delta,
        dte: rowData.dte,
        costBasisWeighted,
        analysis: rowData
    };

    ccSelectedRowIndexByKey[key] =
        typeof rowIndex === "number" && Number.isFinite(rowIndex) ? rowIndex : null;

    updateSummary();
    refreshCcRowResults(key);
}

window.selectRung = selectRung;

/**
 * @param {string} key
 */
function deselectRung(key) {
    const ladderRowIndex = parseCcKey(key);
    if (ladderRowIndex === null || ladderRowIndex < 0 || ladderRowIndex >= CC_ROWS) return;

    ccSelectedByRow[ladderRowIndex] = null;
    ccSelectedRowIndexByKey[key] = null;

    updateSummary();
    refreshCcRowResults(key);
}

window.deselectRung = deselectRung;

function updateSummary() {
    const mount = document.getElementById("cc-summary");
    if (!mount) return;

    let totalDollarReturn = 0;
    let totalUpside = 0;
    let totalProfit = 0;
    let sumProbOTM = 0;
    let sumDelta = 0;
    let costBasisWeighted = 0;
    let count = 0;
    let maxDTE = 0;

    for (const entry of ccSelectedByRow) {
        if (entry == null) continue;
        totalDollarReturn += entry.dollarReturn;
        totalUpside += entry.upsideDollars;
        totalProfit += entry.totalProfitDollars;
        sumProbOTM += entry.probOTM;
        sumDelta += entry.delta;
        costBasisWeighted += entry.costBasisWeighted;
        count += 1;
        if (Number.isFinite(entry.dte)) maxDTE = Math.max(maxDTE, entry.dte);
    }

    const averageProbOTM = count > 0 ? sumProbOTM / count : 0;
    const averageDelta = count > 0 ? sumDelta / count : 0;

    const periodReturn = costBasisWeighted > 0 ? totalProfit / costBasisWeighted : 0;
    const annualizedReturn =
        periodReturn > 0 && maxDTE > 0 ? periodReturn * (365 / maxDTE) : 0;

    const dollarStr = totalDollarReturn.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
    const upsideStr = totalUpside.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
    const profitStr = totalProfit.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });

    const stat = (label, value) => `
        <div class="cc-summary-item">
            <span class="cc-summary-label">${escapeHtml(label)}</span>
            <span class="cc-summary-value">${value}</span>
        </div>
    `;

    mount.innerHTML = `
        ${stat("Total Dollar Return", dollarStr)}
        ${stat("Total Upside If Called", upsideStr)}
        ${stat("Total Profit If Called", profitStr)}
        ${stat("Average Prob OTM", `${averageProbOTM.toFixed(2)}%`)}
        ${stat("Average Delta", averageDelta.toFixed(3))}
        ${stat("Number of Trades Selected", String(count))}
        ${stat("Annualized Return %", `${(annualizedReturn * 100).toFixed(2)}%`)}
    `;
}

(function () {
    function wireRowHandlers(stackEl, rowIndex) {
        const rowEl = stackEl.querySelector(`.cc-row[data-row-index="${CSS.escape(String(rowIndex))}"]`);
        if (!rowEl) return;

        const resultsEl = document.getElementById(`cc-results-row-${rowIndex}`);
        if (!resultsEl) return;

        const key = rowCcKey(rowIndex);

        rowEl.querySelector(".cc-add-row")?.addEventListener("click", () => {
            const nextIndex = rowIndex + 1;
            const nextRowEl = stackEl.querySelector(
                `.cc-row[data-row-index="${CSS.escape(String(nextIndex))}"]`
            );
            if (!nextRowEl) {
                alert("This ladder is already at its maximum row count.");
                return;
            }
            nextRowEl.scrollIntoView({ behavior: "smooth", block: "center" });
            nextRowEl.querySelector(".cc-inp-ticker")?.focus();
        });

        rowEl.querySelector(".cc-analyze")?.addEventListener("click", () => {
            const parsed = readRow(rowEl);
            if (parsed.empty) {
                resultsEl.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml("Enter a complete row to analyze.")}</p></div>`;
                return;
            }
            if ("error" in parsed) {
                resultsEl.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml(parsed.error)}</p></div>`;
                return;
            }
            if (!("row" in parsed)) return;

            const analyzed = analyzeCC(parsed.row);

            ccAnalysisCache[key] = {
                data: analyzed,
                expDate: parsed.row.expDate || "",
                dte: parsed.row.dte,
                resultsId: resultsEl.id
            };

            const currentlySelected = ccSelectedByRow[rowIndex] != null;
            ccSelectedRowIndexByKey[key] = currentlySelected ? 0 : null;

            renderCCAnalysisTable(resultsEl, analyzed, {
                rungKey: key,
                selectedRowIndex: ccSelectedRowIndexByKey[key]
            });

            if (currentlySelected && analyzed[0]) {
                selectRung(key, analyzed[0], 0);
            } else {
                updateSummary();
            }
        });
    }

    function init() {
        const stack = document.getElementById("cc-stack");
        if (!stack) return;

        for (let i = 0; i < CC_ROWS; i += 1) {
            wireRowHandlers(stack, i);
        }

        updateSummary();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
