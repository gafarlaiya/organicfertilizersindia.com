// Tiny zero-dependency static file server for Hostinger Node.js web app hosting.
// Serves the site files from this folder. No npm packages required.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

// Files that must never be served
const BLOCKED = new Set(["server.js", "package.json", "package-lock.json"]);

http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  } catch (e) {
    res.writeHead(400); return res.end("Bad request");
  }
  if (urlPath.endsWith("/")) urlPath += "index.html";

  const file = path.normalize(path.join(ROOT, urlPath));
  const rel = path.relative(ROOT, file);
  if (rel.startsWith("..") || path.isAbsolute(rel) ||
      rel.split(path.sep).some(p => p.startsWith(".")) ||
      BLOCKED.has(rel) || rel.startsWith("tools" + path.sep)) {
    res.writeHead(404); return res.end("Not found");
  }

  const tryFiles = [file, file + ".html", path.join(file, "index.html")];
  (function next(i) {
    if (i >= tryFiles.length) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end('<h1>Page not found</h1><p><a href="/">Go to homepage</a></p>');
    }
    fs.stat(tryFiles[i], (err, st) => {
      if (err || !st.isFile()) return next(i + 1);
      const ext = path.extname(tryFiles[i]).toLowerCase();
      res.writeHead(200, {
        "Content-Type": TYPES[ext] || "application/octet-stream",
        "Cache-Control": ext === ".html" || ext === ".json" ? "no-cache" : "public, max-age=86400",
      });
      fs.createReadStream(tryFiles[i]).pipe(res);
    });
  })(0);
}).listen(PORT, () => console.log("Organic Fertilizers India running on port " + PORT));
