import express from 'express';
import path    from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const port = 8000;

/* Serve each static directory that the browser needs to fetch. */
app.use('/src', express.static(path.join(__dirname, 'src')));   /* OrbitControls.js */
app.use('/js',  express.static(path.join(__dirname, 'js')));    /* ES module components */

/* Serve root-level static assets (style.css, any future top-level files). */
app.use(express.static(__dirname, { index: false }));

/* Explicit GET '/' always delivers the main HTML page. */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Bowling Alley server listening on http://localhost:${port}`);
});
