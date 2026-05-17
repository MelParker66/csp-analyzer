/**
 * Serves CSPmodel static files.
 * Run: node server.js  (default port 5500)
 */
const express = require("express");

const app = express();
const PORT = Number(process.env.PORT) || 5500;
const ROOT = __dirname;

app.use(express.static(ROOT));

app.listen(PORT, () => {
    console.log(`CSPmodel: http://localhost:${PORT}/ladder-high-volume.html`);
});
