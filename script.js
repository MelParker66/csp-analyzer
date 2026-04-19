// -----------------------------
// Manual PUT candidates (1–10 rows) — two independent panels
// Depends on csp-shared.js (analyzeCSP, renderTable, escapeHtml)
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

    const analyzed = analyzeCSP(parsed.rows, dte).map(a => ({ ...a, expDate }));
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

    const analyzed = analyzeCSP(parsed.rows, dte2).map(a => ({ ...a, expDate: expDate2 }));
    renderTable(analyzed, expDate2, dte2, results2);
}

candidatesBody.appendChild(createCandidateRow(candidatesBody, addRowBtn));
updateAddButtonState(candidatesBody, addRowBtn);

candidatesBody2.appendChild(createCandidateRow(candidatesBody2, addRowBtn2));
updateAddButtonState(candidatesBody2, addRowBtn2);
