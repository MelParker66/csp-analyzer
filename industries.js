(function () {
    var INDUSTRY_LABELS = {
        food: "Food",
        cpg: "CPG",
        energy: "Energy",
        semis: "SEMI\u2019s",
        tech: "Tech",
        industrials: "Industrials",
        financials: "Financials"
    };

    var INDUSTRY_ORDER = [
        "food",
        "cpg",
        "energy",
        "semis",
        "tech",
        "industrials",
        "financials"
    ];

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function getMergedIndustries() {
        var merged = {};
        var core = typeof industries !== "undefined" ? industries : {};
        var user = typeof userIndustries !== "undefined" ? userIndustries : {};
        var keys = {};

        Object.keys(core).forEach(function (key) {
            keys[key] = true;
        });
        Object.keys(user).forEach(function (key) {
            keys[key] = true;
        });

        Object.keys(keys).forEach(function (key) {
            merged[key] = (core[key] || []).concat(user[key] || []);
        });

        return merged;
    }

    function getIndustryLabel(key) {
        if (INDUSTRY_LABELS[key]) {
            return INDUSTRY_LABELS[key];
        }
        return key
            .split("-")
            .map(function (part) {
                return part.charAt(0).toUpperCase() + part.slice(1);
            })
            .join(" ");
    }

    function getIndustryOrder() {
        var merged = getMergedIndustries();
        var userKeys = Object.keys(typeof userIndustries !== "undefined" ? userIndustries : {})
            .filter(function (key) {
                return INDUSTRY_ORDER.indexOf(key) === -1;
            })
            .sort();

        return INDUSTRY_ORDER.concat(userKeys).filter(function (key) {
            return merged[key];
        });
    }

    function slugifyIndustryKey(name) {
        return String(name)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function renderIndustryPage(key, stocks) {
        var rows = (stocks || [])
            .map(function (stock) {
                return (
                    '<div class="industry-row">' +
                    '<span class="symbol">' +
                    escapeHtml(stock.symbol) +
                    "</span>" +
                    '<span class="name">' +
                    escapeHtml(stock.name) +
                    "</span>" +
                    "</div>"
                );
            })
            .join("");

        return (
            '<div id="industry-page-' +
            key +
            '" class="industry-page playbook-page" data-industry="' +
            key +
            '" hidden>' +
            '<div class="playbook-page-inner industry-page-inner">' +
            "<h1>" +
            escapeHtml(getIndustryLabel(key).toUpperCase()) +
            "</h1>" +
            '<p class="industry-description">' +
            "Use this page as a reference when exploring industries. " +
            "Pick no more than 1\u20132 names per industry to stay diversified. " +
            "Use your trading platform to build your watchlist and perform due diligence. " +
            "Use the CSP Analyzer to evaluate each trade and keep your ladder balanced." +
            "</p>" +
            '<div class="industry-list">' +
            rows +
            "</div></div></div>"
        );
    }

    function isIndustryId(key) {
        return Boolean(key && getMergedIndustries()[key]);
    }

    function parseIndustryRoute() {
        var pathMatch = window.location.pathname.match(/\/industries\/([^/]+)\/?$/);
        if (pathMatch) {
            return { id: decodeURIComponent(pathMatch[1]).toLowerCase() };
        }

        var hash = window.location.hash.replace(/^#/, "");
        var hashMatch = hash.match(/^\/?industries\/([^/]+)\/?$/);
        if (hashMatch) {
            return { id: decodeURIComponent(hashMatch[1]).toLowerCase() };
        }

        return null;
    }

    function navigateToIndustry(id, options) {
        if (!isIndustryId(id)) return;

        options = options || {};
        var url = "/industries/" + encodeURIComponent(id);
        var state = { panel: "industries", industryId: id };

        if (options.replace) {
            history.replaceState(state, "", url);
        } else {
            history.pushState(state, "", url);
        }
    }

    function showIndustryPage(key, options) {
        options = options || {};
        if (!isIndustryId(key)) return;

        document.querySelectorAll(".industry-page").forEach(function (page) {
            var active = page.getAttribute("data-industry") === key;
            page.classList.toggle("industry-page-active", active);
            page.classList.toggle("playbook-page-active", active);
            page.hidden = !active;
        });

        document.querySelectorAll(".sidebar-submenu-link[data-industry]").forEach(function (link) {
            link.classList.toggle(
                "sidebar-submenu-link-active",
                link.getAttribute("data-industry") === key
            );
        });

        var section = document.querySelector(".sidebar-section[data-industries-menu]");
        if (section && !section.classList.contains("open")) {
            section.classList.add("open");
            var header = section.querySelector(".sidebar-item");
            if (header) {
                header.setAttribute("aria-expanded", "true");
            }
            updateIndustriesMenuChevron(section);
        }

        if (options.updateUrl !== false) {
            navigateToIndustry(key, options);
        }
    }

    function updateIndustriesMenuChevron(section) {
        var chevron = section.querySelector(".sidebar-chevron");
        if (chevron) {
            chevron.textContent = section.classList.contains("open") ? "\u25BE" : "\u25B8";
        }
    }

    function populateIndustrySelect() {
        var select = document.getElementById("add-ticker-industry");
        if (!select) return;

        var activeKey = select.value;
        select.innerHTML = "";

        getIndustryOrder().forEach(function (key) {
            var option = document.createElement("option");
            option.value = key;
            option.textContent = getIndustryLabel(key);
            select.appendChild(option);
        });

        if (activeKey && isIndustryId(activeKey)) {
            select.value = activeKey;
        }
    }

    function rebuildIndustriesUI(activeKey) {
        var submenu = document.querySelector(".sidebar-submenu[data-industries-nav]");
        var pagesContainer = document.getElementById("industries-pages");
        if (!submenu || !pagesContainer || typeof industries === "undefined") {
            return;
        }

        var mergedIndustries = getMergedIndustries();
        submenu.innerHTML = "";
        pagesContainer.innerHTML = "";

        getIndustryOrder().forEach(function (key) {
            var label = getIndustryLabel(key);
            var stocks = mergedIndustries[key] || [];

            var link = document.createElement("button");
            link.type = "button";
            link.className = "sidebar-submenu-link";
            link.setAttribute("data-industry", key);
            link.textContent = label;
            link.addEventListener("click", function () {
                showIndustryPage(key);
            });
            submenu.appendChild(link);

            pagesContainer.insertAdjacentHTML("beforeend", renderIndustryPage(key, stocks));
        });

        populateIndustrySelect();

        if (activeKey && isIndustryId(activeKey)) {
            showIndustryPage(activeKey, { updateUrl: false });
        }
    }

    function initIndustryForms() {
        var addIndustryForm = document.getElementById("add-industry-form");
        var addTickerForm = document.getElementById("add-ticker-form");

        if (addIndustryForm) {
            addIndustryForm.addEventListener("submit", function (event) {
                event.preventDefault();
                var nameInput = document.getElementById("add-industry-name");
                var name = nameInput ? nameInput.value.trim() : "";
                var key = slugifyIndustryKey(name);

                if (!key || typeof userIndustries === "undefined") {
                    return;
                }

                if (typeof industries !== "undefined" && industries[key]) {
                    rebuildIndustriesUI(key);
                    showIndustryPage(key);
                    if (nameInput) nameInput.value = "";
                    return;
                }

                if (!userIndustries[key]) {
                    userIndustries[key] = [];
                }

                if (typeof saveUserIndustries === "function") {
                    saveUserIndustries();
                }

                rebuildIndustriesUI(key);
                showIndustryPage(key);

                if (nameInput) {
                    nameInput.value = "";
                }
            });
        }

        if (addTickerForm) {
            addTickerForm.addEventListener("submit", function (event) {
                event.preventDefault();
                var industrySelect = document.getElementById("add-ticker-industry");
                var symbolInput = document.getElementById("add-ticker-symbol");
                var nameInput = document.getElementById("add-ticker-name");
                var industryKey = industrySelect ? industrySelect.value : "";
                var symbol = symbolInput ? symbolInput.value.trim().toUpperCase() : "";
                var companyName = nameInput ? nameInput.value.trim() : "";

                if (!industryKey || !symbol || !companyName || typeof userIndustries === "undefined") {
                    return;
                }

                if (!userIndustries[industryKey]) {
                    userIndustries[industryKey] = [];
                }

                var merged = getMergedIndustries()[industryKey] || [];
                var exists = merged.some(function (stock) {
                    return stock.symbol.toUpperCase() === symbol;
                });

                if (exists) {
                    return;
                }

                userIndustries[industryKey].push({
                    symbol: symbol,
                    name: companyName
                });

                if (typeof saveUserIndustries === "function") {
                    saveUserIndustries();
                }

                rebuildIndustriesUI(industryKey);
                showIndustryPage(industryKey);

                if (symbolInput) symbolInput.value = "";
                if (nameInput) nameInput.value = "";
            });
        }
    }

    function initIndustriesMenu() {
        var section = document.querySelector(".sidebar-section[data-industries-menu]");
        if (!section || typeof industries === "undefined") {
            return;
        }

        rebuildIndustriesUI();

        var header = section.querySelector(".sidebar-item");
        if (header) {
            header.addEventListener("click", function () {
                section.classList.toggle("open");
                header.setAttribute(
                    "aria-expanded",
                    section.classList.contains("open") ? "true" : "false"
                );
                updateIndustriesMenuChevron(section);
            });
        }

        updateIndustriesMenuChevron(section);
        initIndustryForms();
    }

    function bootstrapIndustryRoute() {
        var route = parseIndustryRoute();
        if (!route || !isIndustryId(route.id)) {
            return false;
        }

        if (typeof window.showAppPanel === "function") {
            window.showAppPanel("industries");
        }
        return true;
    }

    function initIndustryRouting() {
        window.addEventListener("popstate", function () {
            var route = parseIndustryRoute();
            if (route && isIndustryId(route.id)) {
                if (typeof window.showAppPanel === "function") {
                    window.showAppPanel("industries");
                }
                showIndustryPage(route.id, { updateUrl: false });
                return;
            }

            if (typeof window.showAppPanel === "function") {
                window.showAppPanel("playbook");
            }
        });
    }

    window.showIndustryPage = showIndustryPage;
    window.parseIndustryRoute = parseIndustryRoute;
    window.bootstrapIndustryRoute = bootstrapIndustryRoute;
    window.getMergedIndustries = getMergedIndustries;
    initIndustriesMenu();
    initIndustryRouting();
})();
