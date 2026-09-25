// Serveur statique minimal pour consulter les maquettes (pas de dépendance).
// Usage : node design/serve.mjs  →  http://localhost:5199/
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(fileURLToPath(new URL('.', import.meta.url)), 'screens');
const port = Number(process.env.PORT) || 5199;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

async function sommaire() {
  const canvas = JSON.parse(await readFile(join(racine, 'canvas.json'), 'utf8'));
  const liens = canvas.order
    .map((f) => `<li><a href="/${f}">${canvas.boards[f]?.title ?? f}</a> <code>${f}</code></li>`)
    .join('');
  return `<!doctype html><meta charset="utf-8"><title>Maquettes Arrivée</title>
<style>body{font-family:system-ui;background:#0A0C0B;color:#EEF2EF;padding:32px}a{color:#2EE58F}code{color:#8C9A92;font-size:12px}li{margin:6px 0}</style>
<h1>${canvas.title}</h1><ol>${liens}</ol>`;
}

createServer(async (req, res) => {
  const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    if (chemin === '/') {
      res.writeHead(200, { 'content-type': types['.html'] });
      return res.end(await sommaire());
    }
    const fichier = normalize(join(racine, chemin));
    if (!fichier.startsWith(racine)) throw new Error('hors racine');
    const contenu = await readFile(fichier);
    res.writeHead(200, { 'content-type': types[extname(fichier)] ?? 'application/octet-stream' });
    res.end(contenu);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Introuvable : ${chemin}\n\n${(await readdir(racine)).join('\n')}`);
  }
}).listen(port, () => console.log(`Maquettes sur http://localhost:${port}/`));
