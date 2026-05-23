// Call Ladder (covered calls) — 5 fixed rows; reuses csp-shared analyzeCSP

const CALL_LADDER_ROW_COUNT = 5;

const selectedCallRows = {
    rung1: Array.from({ length: CALL_LADDER_ROW_COUNT }, () => null)
};

window.selectedCallRows = selectedCallRows;

const selectedCallRowIndexByKey = {};
const callAnalysisCacheByKey = {};

function callRowKey(rungId, rowIndex) {
    return `call-rung${rungId}-row${rowIndex}`;
}

function parseCallRowKey(key) {
    const m = /^call-rung(\d+)-row(\d+)$/.exec(String(key));
    if (!m) return null;
    const rungId = parseInt(m[1], 10);
    const rowIndex = parseInt(m[2], 10);
    if (!Number.isFinite(rungId) || !Number.isFinite(rowIndex)) return null;
    return { rungId, rowIndex };
}

function augmentCallAnalysisSharesDisplay(resultsEl, sharesOwned) {
    const block = resultsEl.querySelector(".csp-ladder-analysis-block");
    if (!block) return;
    block.querySelectorAll("[data-call-shares-line]").forEach(el => el.remove());
    const firstDetail = block.querySelector(".rec-detail");
    if (!firstDetail) return;
    const p = document.createElement("p");
    p.className = "rec-detail";
    p.setAttribute("data-call-shares-line", "1");
    p.innerHTML = `<strong>Shares Owned:</strong> ${escapeHtml(String(sharesOwned))}`;
    firstDetail.insertAdjacentElement("afterend", p);
}

function renderCallLadderAnalysisTable(resultsEl, data, expDate, dte, tableOptions) {
    renderTable(data, expDate, dte, resultsEl, {
        ...tableOptions,
        hideCapitalColumn: true,
        selectRungVariant: "call"
    });
    const row0 = data[0];
    if (row0 && Number.isFinite(row0.sharesOwned) && row0.sharesOwned >= 0) {
        augmentCallAnalysisSharesDisplay(resultsEl, row0.sharesOwned);
    }
}

function refreshCallRowResults(key) {
    const c = callAnalysisCacheByKey[key];
    if (!c) return;
    const resultsEl = document.getElementById(c.resultsId);
    if (!resultsEl) return;
    renderCallLadderAnalysisTable(resultsEl, c.data, c.expDate, c.dte, {
        rungKey: key,
        selectedRowIndex: selectedCallRowIndexByKey[key]
    });
}

function selectCallRung(key, rowData, rowIndex) {
    const parsed = parseCallRowKey(key);
    if (!parsed) return;

    const rungKeyName = `rung${parsed.rungId}`;
    const bucket = selectedCallRows[rungKeyName];
    if (!Array.isArray(bucket) || bucket[parsed.rowIndex] === undefined) return;

    const ticker =
        rowData.ticker != null && String(rowData.ticker).trim() !== ""
            ? String(rowData.ticker).trim()
            : "";

    const sharesOwned =
        Number.isFinite(rowData.sharesOwned) && rowData.sharesOwned >= 0
            ? rowData.sharesOwned
            : 0;
    const dollarReturn =
        Number.isFinite(rowData.premium) && sharesOwned > 0
            ? rowData.premium * sharesOwned
            : Number.isFinite(rowData.dollarReturn)
              ? rowData.dollarReturn
              : 0;

    bucket[parsed.rowIndex] = {
        ticker,
        dollarReturn,
        capitalRequired: rowData.capitalRequired,
        probOTM: rowData.probOTM,
        delta: rowData.delta,
        dte: rowData.dte,
        analysis: rowData
    };

    selectedCallRowIndexByKey[key] =
        typeof rowIndex === "number" && Number.isFinite(rowIndex) ? rowIndex : null;

    refreshCallRowResults(key);
}

window.selectCallRung = selectCallRung;

function deselectCallRung(key) {
    const parsed = parseCallRowKey(key);
    if (!parsed) return;

    const rungKeyName = `rung${parsed.rungId}`;
    const bucket = selectedCallRows[rungKeyName];
    if (!Array.isArray(bucket) || bucket[parsed.rowIndex] === undefined) return;

    bucket[parsed.rowIndex] = null;
    selectedCallRowIndexByKey[key] = null;

    refreshCallRowResults(key);
}

window.deselectCallRung = deselectCallRung;

(function () {
    const RUNG = { id: 1 };
    const ROWS = CALL_LADDER_ROW_COUNT;

    function readRow(rowEl) {
        const ticker = rowEl.querySelector(".ladder-inp-ticker")?.value?.trim() ?? "";
        const expDate = rowEl.querySelector(".ladder-inp-exp")?.value ?? "";
        const dte = parseInt(rowEl.querySelector(".ladder-inp-dte")?.value, 10);
        const sharesOwned = parseInt(rowEl.querySelector(".call-inp-shares")?.value, 10);
        const strike = parseFloat(rowEl.querySelector(".ladder-inp-strike")?.value);
        const bid = parseFloat(rowEl.querySelector(".ladder-inp-bid")?.value);
        const ask = parseFloat(rowEl.querySelector(".ladder-inp-ask")?.value);
        const probITM = parseFloat(rowEl.querySelector(".ladder-inp-prob-itm")?.value);
        const delta = parseFloat(rowEl.querySelector(".ladder-inp-delta")?.value);

        const raw = [
            ticker,
            rowEl.querySelector(".ladder-inp-exp")?.value?.trim() ?? "",
            rowEl.querySelector(".ladder-inp-dte")?.value?.trim() ?? "",
            rowEl.querySelector(".call-inp-shares")?.value?.trim() ?? "",
            rowEl.querySelector(".ladder-inp-strike")?.value?.trim() ?? "",
            rowEl.querySelector(".ladder-inp-bid")?.value?.trim() ?? "",
            rowEl.querySelector(".ladder-inp-ask")?.value?.trim() ?? "",
            rowEl.querySelector(".ladder-inp-prob-itm")?.value?.trim() ?? "",
            rowEl.querySelector(".ladder-inp-delta")?.value?.trim() ?? ""
        ];
        const allEmpty = raw.every(s => s === "");
        if (allEmpty) return { empty: true };

        if (
            !Number.isFinite(dte) ||
            !Number.isFinite(sharesOwned) ||
            sharesOwned < 0 ||
            !Number.isFinite(strike) ||
            !Number.isFinite(bid) ||
            !Number.isFinite(ask) ||
            !Number.isFinite(probITM) ||
            !Number.isFinite(delta)
        ) {
            return {
                error:
                    "Each non-empty row must have DTE, Shares Owned, Strike, Bid, Ask, Prob ITM, and Delta filled with valid numbers."
            };
        }

        if (strike <= 0) return { error: "Strike must be greater than zero." };
        if (sharesOwned <= 0) return { error: "Shares Owned must be greater than zero." };

        return {
            row: {
                ticker,
                strike,
                bid,
                ask,
                sharesOwned,
                probITM,
                delta,
                dte,
                expDate: expDate || null
            }
        };
    }

    function wireRowHandlers(stackEl, rung, rowIndex) {
        const rowEl = stackEl.querySelector(
            `.ladder-input-row[data-row-index="${CSS.escape(String(rowIndex))}"]`
        );
        if (!rowEl) return;

        const rowDomId = `call-row-${rowIndex}`;
        if (!rowEl.id) rowEl.id = rowDomId;

        function getOrCreateInlineResultsEl() {
            const mountId = `call-analysis-row-${rowIndex}`;
            let mount = document.getElementById(mountId);
            if (!mount) {
                const rowElement = document.getElementById(rowDomId) ?? rowEl;
                rowElement.insertAdjacentHTML(
                    "afterend",
                    `<div id="${escapeHtml(mountId)}" class="csp-analysis-card"></div>`
                );
                mount = document.getElementById(mountId);
            }
            return mount;
        }

        rowEl.querySelector(".ladder-analyze").addEventListener("click", () => {
            const resultsEl = getOrCreateInlineResultsEl();
            if (!resultsEl) return;

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

            if (analyzed[0] && Number.isFinite(parsed.row.sharesOwned)) {
                const sharesOwned = parsed.row.sharesOwned;
                const premium = analyzed[0].premium;
                analyzed[0].sharesOwned = sharesOwned;
                analyzed[0].capitalRequired = sharesOwned * 100;
                analyzed[0].dollarReturn = premium * sharesOwned;
            }

            const key = callRowKey(rung.id, rowIndex);
            callAnalysisCacheByKey[key] = {
                data: analyzed,
                expDate: parsed.row.expDate || "",
                dte: parsed.row.dte,
                resultsId: resultsEl.id
            };

            const currentlySelected = selectedCallRowIndexByKey[key] === 0;
            selectedCallRowIndexByKey[key] = currentlySelected ? 0 : null;

            renderCallLadderAnalysisTable(resultsEl, analyzed, parsed.row.expDate || "", parsed.row.dte, {
                rungKey: key,
                selectedRowIndex: selectedCallRowIndexByKey[key]
            });

            if (currentlySelected && analyzed[0]) {
                selectCallRung(key, analyzed[0], 0);
            }
        });
    }

    function init() {
        const root = document.getElementById("call-ladder-root");
        if (!root) return;

        const stack = document.getElementById("call-stack-rung1");
        if (!stack) return;

        for (let i = 0; i < ROWS; i += 1) {
            wireRowHandlers(stack, RUNG, i);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
