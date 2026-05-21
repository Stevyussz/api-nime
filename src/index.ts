import "dotenv/config";
import { rateLimit } from "express-rate-limit";
import morgan from "morgan";
import cors from "cors";
import { clientCache, getCacheStats } from "@middlewares/cache.js";
import appConfig from "@configs/app.config.js";
import express from "express";
import errorHandler from "@middlewares/errorHandler.js";
import otakudesuRouter from "@routes/otakudesu.routes.js";
import samehadakuRouter from "@routes/samehadaku.routes.js";
import kuramanimeRouter from "@routes/kuramanime.routes.js";
import animesailRouter from "@routes/animesail.routes.js";
import setPayload from "@helpers/setPayload.js";
import { pathToFileURL } from "url";

const { PORT } = appConfig;
const app = express();

// CORS — restrict ke FRONTEND_URL jika di-set, fallback ke semua origin (dev)
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(morgan("dev"));

// Rate limiting: 120 req/min per IP
app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: "Terlalu banyak request, coba lagi nanti.",
  })
);

// Client cache: 1 menit
app.use(clientCache(1));

// Root endpoint — API info
app.get("/", (req, res) => {
  const routes: IRouteData[] = [
    { method: "GET", path: "/otakudesu", description: "Otakudesu", pathParams: [], queryParams: [] },
    { method: "GET", path: "/kuramanime", description: "Kuramanime", pathParams: [], queryParams: [] },
    { method: "GET", path: "/animesail", description: "AnimeSail", pathParams: [], queryParams: [] },
    { method: "GET", path: "/samehadaku", description: "Samehadaku", pathParams: [], queryParams: [] },
  ];
  res.json(setPayload(res, { data: { routes } }));
});

// Cache stats endpoint (useful for monitoring)
app.get("/cache/stats", (_req, res) => {
  res.json({ ...getCacheStats(), timestamp: new Date().toISOString() });
});

// Provider routers
app.use("/otakudesu", otakudesuRouter);
app.use("/kuramanime", kuramanimeRouter);
app.use("/samehadaku", samehadakuRouter);
app.use("/animesail", animesailRouter);

// Global error handler
app.use(errorHandler);

// Export for Vercel serverless
export default app;

// Start local server only when run directly (not via Vercel/import)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}
