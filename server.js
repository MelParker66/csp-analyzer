/**
 * Serves CSPmodel static files.
 * Run: node server.js  (default port 5500)
 */
const express = require("express");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 5500;
const ROOT = __dirname;
const APP_HTML = path.join(ROOT, "ladder-high-volume.html");

app.use(express.static(ROOT));

app.get("/industries/:id", (_req, res) => {
    res.sendFile(APP_HTML);
});

app.listen(PORT, () => {
    console.log(`CSPmodel: http://localhost:${PORT}/ladder-high-volume.html`);
    console.log(`Industries: http://localhost:${PORT}/industries/food`);
});
