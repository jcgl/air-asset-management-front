import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 8080;

const apiTarget =
  process.env.API_TARGET ||
  'https://generator-manager-gydsehh4b3f6a2av.westcentralus-01.azurewebsites.net';

// Forward /api/* to the backend (native fetch, Node 18+).
app.use('/api', async (req, res) => {
  const targetUrl = apiTarget + req.originalUrl;
  try {
    const headers = { ...req.headers };
    delete headers.host;

    const init = { method: req.method, headers };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      init.body = Buffer.concat(chunks);
    }

    const upstream = await fetch(targetUrl, init);
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') res.setHeader(key, value);
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    res.send(body);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Bad gateway', detail: String(err) });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('/*splat', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
