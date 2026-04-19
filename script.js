// -----------------------------
// Manual PUT candidates (1–10 rows) — two independent panels
// -----------------------------
const MAX_ROWS = 10;

const results = document.getElementById("results");
const results2 = document.getElementById("results2");
const candidatesBody = document.getElementById("candidatesBody");
const candidatesBody2 = document.getElementById("candidatesBody2");
const addRowBtn = document.getElementById("addRowBtn");
const addRowBtn2 = document.getElementById("addRowBtn2");
const analyzeBtn = document.getElementById("analyzeBtn");
const analyzeBtn2 = document.getElementById("analyzeBtn2");

function createCandidateRow(candidatesBodyEl, addRowBtnEl) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><input type="number" class="inp-strike" step="any" placeholder="0" /></td>
        <td><input type="number" class="inp-bid" step="any" placeholder="0" /></td>
        <td><input type="number" class="inp-ask" step="any" placeholder="0" /></td>
        <td><input type="number" class="inp-prob-itm" step="any" placeholder="0" /></td>
        <td><input type="number" class="inp-delta" step="any" placeholder="0" /></td>
        <td><button type="button" class="remove-row" title="Remove row">Remove</button></td>
    `;
    tr.querySelector(".remove-row").addEventListener("click", () => {
        if (candidatesBodyEl.querySelectorAll("tr").length <= 1) return;
        tr.remove();
        updateAddButtonState(candidatesBodyEl, addRowBtnEl);
    });
    return tr;
}

function updateAddButtonState(candidatesBodyEl, addRowBtnEl) {
    const n = candidatesBodyEl.querySelectorAll("tr").length;
    addRowBtnEl.disabled = n >= MAX_ROWS;
}

addRowBtn.addEventListener("click", () => {
    if (candidatesBody.querySelectorAll("tr").length >= MAX_ROWS) return;
    candidatesBody.appendChild(createCandidateRow(candidatesBody, addRowBtn));
    updateAddButtonState(candidatesBody, addRowBtn);
});

addRowBtn2.addEventListener("click", () => {
    if (candidatesBody2.querySelectorAll("tr").length >= MAX_ROWS) return;
    candidatesBody2.appendChild(createCandidateRow(candidatesBody2, addRowBtn2));
    updateAddButtonState(candidatesBody2, addRowBtn2);
});

analyzeBtn.addEventListener("click", runAnalysis);
analyzeBtn2.addEventListener("click", runAnalysis2);

function readCandidateRowsFrom(tbody) {
    const rows = [];
    for (const tr of tbody.querySelectorAll("tr")) {
        const strike = parseFloat(tr.querySelector(".inp-strike").value);
        const bid = parseFloat(tr.querySelector(".inp-bid").value);
        const ask = parseFloat(tr.querySelector(".inp-ask").value);
        const probITM = parseFloat(tr.querySelector(".inp-prob-itm").value);
        const delta = parseFloat(tr.querySelector(".inp-delta").value);

        const raw = [
            tr.querySelector(".inp-strike").value.trim(),
            tr.querySelector(".inp-bid").value.trim(),
            tr.querySelector(".inp-ask").value.trim(),
            tr.querySelector(".inp-prob-itm").value.trim(),
            tr.querySelector(".inp-delta").value.trim()
        ];
        const allEmpty = raw.every(s => s === "");
        if (allEmpty) continue;

        const allValid =
            Number.isFinite(strike) &&
            Number.isFinite(bid) &&
            Number.isFinite(ask) &&
            Number.isFinite(delta) &&
            Number.isFinite(probITM);

        if (!allValid) {
            return { error: "Each non-empty row must have Strike, Bid, Ask, Prob ITM, and Delta filled with valid numbers." };
        }

        if (strike <= 0) {
            return { error: "Strike must be greater than zero." };
        }

        rows.push({ strike, bid, ask, probITM, delta });
    }
    return { rows };
}

function runAnalysis() {
    const expDate = document.getElementById("expDate").value;
    const dte = parseInt(document.getElementById("dte").value, 10);

    if (!Number.isFinite(dte) || dte < 1) {
        results.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml("Please enter a valid DTE (at least 1 day).")}</p></div>`;
        return;
    }

    const parsed = readCandidateRowsFrom(candidatesBody);
    if (parsed.error) {
        results.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml(parsed.error)}</p></div>`;
        return;
    }

    if (parsed.rows.length === 0) {
        results.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml("Enter at least one complete PUT candidate row.")}</p></div>`;
        return;
    }

    const analyzed = analyzeCSP(parsed.rows, dte);
    renderTable(analyzed, expDate, dte, results);
}

function runAnalysis2() {
    const expDate2 = document.getElementById("expDate2").value;
    const dte2 = parseInt(document.getElementById("dte2").value, 10);

    if (!Number.isFinite(dte2) || dte2 < 1) {
        results2.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml("Please enter a valid DTE (at least 1 day).")}</p></div>`;
        return;
    }

    const parsed = readCandidateRowsFrom(candidatesBody2);
    if (parsed.error) {
        results2.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml(parsed.error)}</p></div>`;
        return;
    }

    if (parsed.rows.length === 0) {
        results2.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml("Enter at least one complete PUT candidate row.")}</p></div>`;
        return;
    }

    const analyzed = analyzeCSP(parsed.rows, dte2);
    renderTable(analyzed, expDate2, dte2, results2);
}

// -----------------------------
// CSP Math (shared)
// -----------------------------
function analyzeCSP(rows, dte) {
    return rows.map(r => {
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
            annualized
        };
    });
}

function formatMoney(amount) {
    return amount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
}

function renderCspDetailBox(row, expDate, dte) {
    const dollarReturn = row.dollarReturn.toFixed(2);
    const expDisp = expDate && String(expDate).trim()
        ? `<p class="rec-detail"><strong>Expiration Date:</strong> ${escapeHtml(String(expDate).trim())}</p>`
        : `<p class="rec-detail"><strong>Expiration Date:</strong> —</p>`;

    return `
                <section class="card recommended-csp csp-row-detail-box">
                    <p class="rec-detail"><strong>Strike:</strong> ${row.strike}</p>
                    <p class="rec-detail"><strong>Premium:</strong> $${row.premium.toFixed(2)}</p>
                    <p class="rec-detail"><strong>Return %:</strong> ${row.returnPct.toFixed(2)}%</p>
                    <p class="rec-detail"><strong>Dollar Return:</strong> $${dollarReturn}</p>
                    <p class="rec-detail"><strong>Capital Required:</strong> ${formatMoney(row.capitalRequired)}</p>
                    <p class="rec-detail"><strong>Annualized Return:</strong> ${row.annualized.toFixed(2)}%</p>
                    <p class="rec-detail"><strong>Prob OTM:</strong> ${row.probOTM.toFixed(2)}%</p>
                    <p class="rec-detail"><strong>Breakeven:</strong> $${row.breakeven.toFixed(2)}</p>
                    ${expDisp}
                    <p class="rec-detail"><strong>DTE:</strong> ${dte}</p>
                </section>
    `;
}

// -----------------------------
// Render Results Table (shared; targets panel via resultsEl)
// -----------------------------
function renderTable(data, expDate, dte, resultsEl) {
    if (data.length === 0) {
        resultsEl.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml("No candidate rows to analyze.")}</p></div>`;
        return;
    }

    const rid = resultsEl.id || "results";

    const expLine = expDate && String(expDate).trim()
        ? `<p class="analysis-intro"><strong>Expiration:</strong> ${escapeHtml(String(expDate).trim())}</p>`
        : "";

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
                        <th></th>
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach((row, i) => {
        const detailId = `${rid}-csp-detail-${i}`;
        html += `
            <tr class="analysis-data-row">
                <td>${row.strike}</td>
                <td>${row.premium.toFixed(2)}</td>
                <td>${row.returnPct.toFixed(2)}%</td>
                <td>${row.breakeven.toFixed(2)}</td>
                <td>${row.probOTM.toFixed(2)}%</td>
                <td>${row.delta}</td>
                <td>
                    <button type="button" class="btn show-row-details-btn" data-detail-target="${detailId}" aria-expanded="false" aria-controls="${detailId}">Show Details</button>
                </td>
            </tr>
            <tr id="${detailId}" class="csp-detail-row" hidden>
                <td colspan="7">
                    ${renderCspDetailBox(row, expDate, dte)}
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
}

function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

candidatesBody.appendChild(createCandidateRow(candidatesBody, addRowBtn));
updateAddButtonState(candidatesBody, addRowBtn);

candidatesBody2.appendChild(createCandidateRow(candidatesBody2, addRowBtn2));
updateAddButtonState(candidatesBody2, addRowBtn2);
