// CSP Ladder Builder — four independent rungs; depends on csp-shared.js

const selectedRungs = {
    rung1: null,
    rung2: null,
    rung3: null,
    rung4: null
};

window.selectedRungs = selectedRungs;

const selectedRowIndexByRung = {
    rung1: null,
    rung2: null,
    rung3: null,
    rung4: null
};

const ladderAnalysisCache = {};

function refreshLadderRungTable(rungKey) {
    const c = ladderAnalysisCache[rungKey];
    const id = parseInt(String(rungKey).replace(/\D/g, ""), 10);
    const resultsEl = document.getElementById(`ladder-results-${id}`);
    if (!c || !resultsEl) return;
    renderTable(c.data, c.expDate, c.dte, resultsEl, {
        rungKey,
        selectedRowIndex: selectedRowIndexByRung[rungKey]
    });
}

function selectRung(rungId, rowData, rowIndex) {
    const ticker =
        rowData.ticker != null && String(rowData.ticker).trim() !== ""
            ? String(rowData.ticker).trim()
            : "";
    selectedRungs[rungId] = {
        ticker,
        dollarReturn: rowData.dollarReturn,
        capitalRequired: rowData.capitalRequired,
        probOTM: rowData.probOTM,
        dte: rowData.dte,
        analysis: rowData
    };
    selectedRowIndexByRung[rungId] =
        typeof rowIndex === "number" && Number.isFinite(rowIndex) ? rowIndex : null;
    updateLadderSummary();
    refreshLadderRungTable(rungId);
}

window.selectRung = selectRung;

function deselectRung(rungId) {
    selectedRungs[rungId] = null;
    selectedRowIndexByRung[rungId] = null;
    updateLadderSummary();
    refreshLadderRungTable(rungId);
}

window.deselectRung = deselectRung;

function updateLadderSummary() {
    const mount = document.getElementById("ladder-summary");
    if (!mount) return;

    let totalDollarReturn = 0;
    let totalCapitalRequired = 0;
    let sumProbOTM = 0;
    let count = 0;

    for (const key of ["rung1", "rung2", "rung3", "rung4"]) {
        const entry = selectedRungs[key];
        if (entry == null) continue;
        totalDollarReturn += entry.dollarReturn;
        totalCapitalRequired += entry.capitalRequired;
        sumProbOTM += entry.probOTM;
        count += 1;
    }

    const averageProbOTM = count > 0 ? sumProbOTM / count : 0;

    const ladderReturn =
        totalCapitalRequired > 0 ? totalDollarReturn / totalCapitalRequired : 0;

    const dteList = Object.values(selectedRungs)
        .filter(r => r && r.dte !== undefined)
        .map(r => r.dte);
    const maxDTE = dteList.length > 0 ? Math.max(...dteList) : 0;

    const annualizedReturn =
        ladderReturn > 0 && maxDTE > 0 ? ladderReturn * (365 / maxDTE) : 0;

    const dollarStr = totalDollarReturn.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
    const capStr = totalCapitalRequired.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
    const avgStr = `${averageProbOTM.toFixed(2)}%`;

    mount.innerHTML = `
        <section class="card ladder-summary-card">
            <h2 class="card-title ladder-summary-title">Ladder Summary</h2>
            <hr class="ladder-summary-rule" />
            <p class="ladder-summary-line"><strong>Total Dollar Return:</strong> ${dollarStr}</p>
            <p class="ladder-summary-line"><strong>Total Capital Required:</strong> ${capStr}</p>
            <p class="ladder-summary-line"><strong>Average Prob OTM:</strong> ${avgStr}</p>
            <div class="ladder-summary-line">
                Ladder Return: ${(ladderReturn * 100).toFixed(3)}%
            </div>
            <div class="ladder-summary-line">
                Annualized Return: ${(annualizedReturn * 100).toFixed(2)}%
            </div>
        </section>
    `;
}

window.updateLadderSummary = updateLadderSummary;

function exportLadderToExcel() {
    const keys = ["rung1", "rung2", "rung3", "rung4"];
    const selected = keys.map(k => selectedRungs[k]).filter(e => e != null);
    if (selected.length === 0) {
        alert("Select at least one rung before exporting.");
        return;
    }
    if (typeof XLSX === "undefined") {
        alert("Excel library failed to load. Please refresh the page.");
        return;
    }

    const sheet1Headers = ["Ticker", "Expiration", "DTE", "Strike", "Bid", "Ask", "Prob ITM", "Delta"];
    const sheet1Data = [sheet1Headers];
    const analysisRows = [];

    for (const entry of selected) {
        const a = entry.analysis;
        const t = entry.ticker !== undefined && entry.ticker !== "" ? entry.ticker : a.ticker ?? "";
        const dteVal = a.dteUsed != null ? a.dteUsed : a.dte;
        sheet1Data.push([
            t,
            a.expDate ?? "",
            dteVal,
            a.strike,
            a.bid,
            a.ask,
            a.probITM,
            a.delta
        ]);

        analysisRows.push(["Ticker", t]);
        analysisRows.push(["Expiration", a.expDate ?? ""]);
        analysisRows.push(["Strike", a.strike]);
        analysisRows.push(["Premium", a.premium]);
        analysisRows.push(["Return %", a.returnPct]);
        analysisRows.push(["Breakeven", a.breakeven]);
        analysisRows.push(["Prob OTM", a.probOTM]);
        analysisRows.push(["Delta", a.delta]);
        analysisRows.push(["Capital Required", a.capitalRequired]);
        analysisRows.push(["Dollar Return", a.dollarReturn]);
        analysisRows.push([]);
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet1Data), "Selected Rungs");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(analysisRows), "Analysis");
    XLSX.writeFile(wb, "csp-ladder-export.xlsx");
}

window.exportLadderToExcel = exportLadderToExcel;

(function () {
    const RUNGS = [
        { id: 1, title: "Rung 1: 1–7 DTE", dteMin: 1, dteMax: 7 },
        { id: 2, title: "Rung 2: 10–15 DTE", dteMin: 10, dteMax: 15 },
        { id: 3, title: "Rung 3: 18–25 DTE", dteMin: 18, dteMax: 25 },
        { id: 4, title: "Rung 4: 25–35 DTE", dteMin: 25, dteMax: 35 }
    ];

    function rungKeyFor(id) {
        return `rung${id}`;
    }

    function createInputRow(rung, isFirst) {
        const row = document.createElement("div");
        row.className = "ladder-input-row";
        row.innerHTML = `
            <label class="ladder-field"><span class="ladder-field-label">Ticker</span>
                <input type="text" class="ladder-inp-ticker" placeholder="e.g. AAPL" autocomplete="off" />
            </label>
            <label class="ladder-field"><span class="ladder-field-label">Expiration</span>
                <input type="date" class="ladder-inp-exp" />
            </label>
            <label class="ladder-field"><span class="ladder-field-label">DTE</span>
                <input type="number" class="ladder-inp-dte" min="1" step="1" placeholder="${rung.dteMin}–${rung.dteMax}" />
            </label>
            <label class="ladder-field"><span class="ladder-field-label">Strike</span>
                <input type="number" class="ladder-inp-strike" step="any" />
            </label>
            <label class="ladder-field"><span class="ladder-field-label">Bid</span>
                <input type="number" class="ladder-inp-bid" step="any" />
            </label>
            <label class="ladder-field"><span class="ladder-field-label">Ask</span>
                <input type="number" class="ladder-inp-ask" step="any" />
            </label>
            <label class="ladder-field"><span class="ladder-field-label">Prob ITM</span>
                <input type="number" class="ladder-inp-prob-itm" step="any" />
            </label>
            <label class="ladder-field"><span class="ladder-field-label">Delta</span>
                <input type="number" class="ladder-inp-delta" step="any" />
            </label>
            <div class="ladder-row-actions">
                ${
                    isFirst
                        ? `<button type="button" class="btn ladder-add-row">Add Row</button>
                           <button type="button" class="btn ladder-analyze">Analyze</button>`
                        : `<button type="button" class="btn btn-secondary ladder-remove-row">Remove</button>`
                }
            </div>
        `;
        return row;
    }

    function readRowsFromStack(stackEl, rung) {
        const out = [];
        for (const rowEl of stackEl.querySelectorAll(".ladder-input-row")) {
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
            if (allEmpty) continue;

            if (
                !Number.isFinite(dte) ||
                dte < 1 ||
                !Number.isFinite(strike) ||
                !Number.isFinite(bid) ||
                !Number.isFinite(ask) ||
                !Number.isFinite(probITM) ||
                !Number.isFinite(delta)
            ) {
                return {
                    error:
                        "Each non-empty row must have DTE, Strike, Bid, Ask, Prob ITM, and Delta filled with valid numbers."
                };
            }

            if (strike <= 0) {
                return { error: "Strike must be greater than zero." };
            }

            if (dte < rung.dteMin || dte > rung.dteMax) {
                return {
                    error: `${rung.title} — DTE must be between ${rung.dteMin} and ${rung.dteMax} (got ${dte}).`
                };
            }

            out.push({
                ticker,
                strike,
                bid,
                ask,
                probITM,
                delta,
                dte,
                expDate: expDate || null
            });
        }
        return { rows: out };
    }

    function wireRung(sectionEl, rung) {
        const stack = sectionEl.querySelector(".ladder-input-stack");
        const resultsEl = sectionEl.querySelector(".ladder-results");
        const rk = rungKeyFor(rung.id);

        const firstRow = stack.querySelector(".ladder-input-row");

        firstRow.querySelector(".ladder-add-row").addEventListener("click", () => {
            const nr = createInputRow(rung, false);
            stack.appendChild(nr);
            nr.querySelector(".ladder-remove-row").addEventListener("click", () => {
                nr.remove();
            });
        });

        firstRow.querySelector(".ladder-analyze").addEventListener("click", () => {
            const parsed = readRowsFromStack(stack, rung);
            if (parsed.error) {
                resultsEl.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml(parsed.error)}</p></div>`;
                return;
            }
            if (parsed.rows.length === 0) {
                resultsEl.innerHTML = `<div class="card"><p class="results-empty">${escapeHtml("Enter at least one complete row for this rung.")}</p></div>`;
                return;
            }

            const fallbackDte = parsed.rows[0].dte;
            const analyzed = analyzeCSP(parsed.rows, fallbackDte).map((a, i) => ({
                ...a,
                expDate: parsed.rows[i].expDate
            }));

            const primaryExp =
                parsed.rows.length && parsed.rows[0].expDate
                    ? parsed.rows[0].expDate
                    : "";
            const primaryDte = fallbackDte;

            selectedRungs[rk] = null;
            selectedRowIndexByRung[rk] = null;
            ladderAnalysisCache[rk] = {
                data: analyzed,
                expDate: primaryExp,
                dte: primaryDte
            };
            updateLadderSummary();

            renderTable(analyzed, primaryExp, primaryDte, resultsEl, {
                rungKey: rk,
                selectedRowIndex: null
            });
        });
    }

    function init() {
        const root = document.getElementById("ladder-root");
        if (!root) return;

        for (const rung of RUNGS) {
            const section = document.createElement("section");
            section.className = "card ladder-rung";
            section.setAttribute("data-rung-id", String(rung.id));
            section.innerHTML = `
                <h2 class="card-title ladder-rung-title">${escapeHtml(rung.title)}</h2>
                <p class="ladder-rung-hint">DTE for each row should fall within ${rung.dteMin}–${rung.dteMax} days.</p>
                <div class="ladder-input-stack"></div>
                <div class="ladder-results" id="ladder-results-${rung.id}"></div>
            `;
            const stack = section.querySelector(".ladder-input-stack");
            stack.appendChild(createInputRow(rung, true));
            root.appendChild(section);
            wireRung(section, rung);
        }

        updateLadderSummary();

        const exportBtn = document.getElementById("ladder-export-excel");
        if (exportBtn) {
            exportBtn.addEventListener("click", exportLadderToExcel);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
