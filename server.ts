import express from "express";
import compression from "compression";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Enable Gzip/Brotli response compression for high performance & fast page loads
  app.use(
    compression({
      level: 6,
      threshold: 512, // Compress payloads >= 512 bytes
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) return false;
        return compression.filter(req, res);
      },
    })
  );

  // 2. Performance & Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 3. Development vs Production Setup
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");

    // Static Assets Browser Caching (1 Year max-age with immutable flag)
    app.use(
      express.static(distPath, {
        maxAge: "1y",
        immutable: true,
        setHeaders: (res, filePath) => {
          if (
            filePath.endsWith(".html") ||
            filePath.endsWith(".xml") ||
            filePath.endsWith(".txt")
          ) {
            res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
          } else {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      })
    );

    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // Development mode using Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
