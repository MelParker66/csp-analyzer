// Shared CSP analysis + results rendering (used by index and Ladder Builder)

function analyzeCSP(rows, fallbackDte) {
    return rows.map(r => {
        const dte = Number.isFinite(r.dte) ? r.dte : fallbackDte;
        const premium = (r.bid + r.ask) / 2;
        const returnPct = (premium / r.strike) * 100;
        const breakeven = r.strike - premium;
        const probOTM = 100 - r.probITM;
        const dollarReturn = premium * 100;
        const capitalRequired = r.strike * 100;
        const annualized = (returnPct / dte) * 365;

        return {
            ...r,
            premium,
            returnPct,
            breakeven,
            probOTM,
            dollarReturn,
            capitalRequired,
            annualized,
            dteUsed: dte,
            expDate: r.expDate !== undefined ? r.expDate : null
        };
    });
}

function formatMoney(amount) {
    return amount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
}

/** e.g. $12,345.00 — used for ladder capital display / sidebar */
function formatMoneyFixed2(amount) {
    return (
        "$" +
        Number(amount).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    );
}

function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function renderCspDetailBox(row, fallbackExp, fallbackDte, detailOpts) {
    const ladderBlock = detailOpts && detailOpts.ladderDetailBlock;
    const exp = row.expDate != null && String(row.expDate).trim()
        ? String(row.expDate).trim()
        : (fallbackExp && String(fallbackExp).trim() ? String(fallbackExp).trim() : "");
    const dteVal = row.dteUsed != null ? row.dteUsed : fallbackDte;

    const dollarReturn = row.dollarReturn.toFixed(2);
    const expDisp = exp
        ? `<p class="rec-detail"><strong>Expiration Date:</strong> ${escapeHtml(exp)}</p>`
        : `<p class="rec-detail"><strong>Expiration Date:</strong> —</p>`;

    const capReqLadder = `<p class="rec-detail"><strong>Capital Required:</strong> ${formatMoneyFixed2(row.capitalRequired)}</p>`;
    const capReqDefault = `<p class="rec-detail"><strong>Capital Required:</strong> ${formatMoney(row.capitalRequired)}</p>`;

    const inner = `
                    ${ladderBlock ? capReqLadder : ""}
                    <p class="rec-detail"><strong>Strike:</strong> ${row.strike}</p>
                    <p class="rec-detail"><strong>Premium:</strong> $${row.premium.toFixed(2)}</p>
                    <p class="rec-detail"><strong>Return %:</strong> ${row.returnPct.toFixed(2)}%</p>
                    <p class="rec-detail"><strong>Dollar Return:</strong> $${dollarReturn}</p>
                    ${ladderBlock ? "" : capReqDefault}
                    <p class="rec-detail"><strong>Annualized Return:</strong> ${row.annualized.toFixed(2)}%</p>
                    <p class="rec-detail"><strong>Prob OTM:</strong> ${row.probOTM.toFixed(2)}%</p>
                    <p class="rec-detail"><strong>Breakeven:</strong> $${row.breakeven.toFixed(2)}</p>
                    ${expDisp}
                    <p class="rec-detail"><strong>DTE:</strong> ${dteVal}</p>
    `;

    return `
                <section class="card recommended-csp csp-row-detail-box">
                    ${ladderBlock ? `<div class="csp-ladder-analysis-block">${inner}</div>` : inner}
                </section>
    `;
}

function renderTable(data, expDate, dte, resultsEl, tableOptions) {
    if (data.length === 0) {
        resultsEl.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml("No candidate rows to analyze.")}</p></div>`;
        return;
    }

    const rid = resultsEl.id || "results";
    const rungKey = tableOptions && tableOptions.rungKey;
    const selectedRowIndex =
        tableOptions && tableOptions.selectedRowIndex !== undefined
            ? tableOptions.selectedRowIndex
            : null;
    const analyzerPanel = tableOptions && tableOptions.analyzerPanel;
    const selectedIndices = tableOptions && tableOptions.selectedIndices;

    const hasSelectColumn = Boolean(rungKey || analyzerPanel);
    const ladderCapCol = Boolean(rungKey);
    const detailColspan = ladderCapCol ? 9 : hasSelectColumn ? 8 : 7;

    const expLine = expDate && String(expDate).trim()
        ? `<p class="analysis-intro"><strong>Expiration:</strong> ${escapeHtml(String(expDate).trim())}</p>`
        : "";

    const ladderCapHeader = ladderCapCol ? `<th class="analysis-th-capital-req">Capital Required</th>` : "";
    const selectHeader = hasSelectColumn ? `<th class="analysis-th-select"></th>` : "";

    let html = `
        <section class="card">
            <h2 class="card-title">CSP Analysis</h2>
            ${expLine}
            <table class="analysis-table">
                <thead>
                    <tr>
                        <th>Strike</th>
                        <th>Premium</th>
                        <th>Return %</th>
                        <th>Breakeven</th>
                        <th>Prob OTM</th>
                        <th>Delta</th>
                        ${ladderCapHeader}
                        <th></th>
                        ${selectHeader}
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach((row, i) => {
        const detailId = `${rid}-csp-detail-${i}`;
        let selectCell = "";
        let rowSelected = false;

        if (rungKey) {
            rowSelected = selectedRowIndex === i;
            selectCell = rowSelected
                ? `<td class="analysis-td-select">
                    <button type="button" class="btn btn-secondary ladder-deselect-btn">Deselect</button>
                </td>`
                : `<td class="analysis-td-select">
                    <button type="button" class="btn ladder-select-btn" data-row-index="${i}">Select</button>
                </td>`;
        } else if (analyzerPanel && selectedIndices) {
            rowSelected = typeof selectedIndices.has === "function" && selectedIndices.has(i);
            selectCell = rowSelected
                ? `<td class="analysis-td-select">
                    <button type="button" class="btn btn-secondary analyzer-deselect-btn" data-row-index="${i}">Deselect</button>
                </td>`
                : `<td class="analysis-td-select">
                    <button type="button" class="btn analyzer-select-btn" data-row-index="${i}">Select</button>
                </td>`;
        }

        const ladderCapCell = ladderCapCol
            ? `<td class="analysis-td-capital-req">${formatMoneyFixed2(row.capitalRequired)}</td>`
            : "";

        const rowClass = `analysis-data-row${rowSelected ? " csp-selected-row" : ""}`;
        html += `
            <tr class="${rowClass}">
                <td>${row.strike}</td>
                <td>${row.premium.toFixed(2)}</td>
                <td>${row.returnPct.toFixed(2)}%</td>
                <td>${row.breakeven.toFixed(2)}</td>
                <td>${row.probOTM.toFixed(2)}%</td>
                <td>${row.delta}</td>
                ${ladderCapCell}
                <td>
                    <button type="button" class="btn show-row-details-btn" data-detail-target="${detailId}" aria-expanded="false" aria-controls="${detailId}">Show Details</button>
                </td>
                ${selectCell}
            </tr>
            <tr id="${detailId}" class="csp-detail-row" hidden>
                <td colspan="${detailColspan}">
                    ${renderCspDetailBox(row, expDate, dte, ladderCapCol ? { ladderDetailBlock: true } : undefined)}
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </section>
    `;

    resultsEl.innerHTML = html;

    resultsEl.querySelectorAll(".show-row-details-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-detail-target");
            const detailRow = targetId ? resultsEl.querySelector(`#${CSS.escape(targetId)}`) : null;
            if (!detailRow) return;
            detailRow.hidden = !detailRow.hidden;
            btn.setAttribute("aria-expanded", detailRow.hidden ? "false" : "true");
        });
    });

    if (rungKey && typeof window.selectRung === "function") {
        resultsEl.querySelectorAll(".ladder-select-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.getAttribute("data-row-index"), 10);
                if (!Number.isFinite(idx) || data[idx] === undefined) return;
                window.selectRung(rungKey, data[idx], idx);
            });
        });
        resultsEl.querySelectorAll(".ladder-deselect-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                if (typeof window.deselectRung === "function") window.deselectRung(rungKey);
            });
        });
    }

    if (analyzerPanel && typeof window.selectAnalyzerRow === "function") {
        resultsEl.querySelectorAll(".analyzer-select-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.getAttribute("data-row-index"), 10);
                if (!Number.isFinite(idx) || data[idx] === undefined) return;
                window.selectAnalyzerRow(analyzerPanel, idx, data[idx]);
            });
        });
        resultsEl.querySelectorAll(".analyzer-deselect-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.getAttribute("data-row-index"), 10);
                if (!Number.isFinite(idx)) return;
                if (typeof window.deselectAnalyzerRow === "function") {
                    window.deselectAnalyzerRow(analyzerPanel, idx);
                }
            });
        });
    }
}
