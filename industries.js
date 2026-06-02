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
            escapeHtml(key.toUpperCase()) +
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
        return Boolean(key && INDUSTRY_LABELS[key]);
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

    function initIndustriesMenu() {
        var section = document.querySelector(".sidebar-section[data-industries-menu]");
        var submenu = document.querySelector(".sidebar-submenu[data-industries-nav]");
        var pagesContainer = document.getElementById("industries-pages");
        if (!section || !submenu || !pagesContainer || typeof industries === "undefined") {
            return;
        }

        INDUSTRY_ORDER.forEach(function (key) {
            var label = INDUSTRY_LABELS[key];
            var stocks = industries[key] || [];

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
    initIndustriesMenu();
    initIndustryRouting();
})();
