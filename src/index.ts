import "dotenv/config";
import { rateLimit } from "express-rate-limit";
import morgan from "morgan";
import cors from "cors";
import { clientCache } from "@middlewares/cache.js";
import appConfig from "@configs/app.config.js";
import express from "express";
import errorHandler from "@middlewares/errorHandler.js";
import otakudesuRouter from "@routes/otakudesu.routes.js";
import samehadakuRouter from "@routes/samehadaku.routes.js";
import kuramanimeRouter from "@routes/kuramanime.routes.js";
import animesailRouter from "@routes/animesail.routes.js";
import setPayload from "@helpers/setPayload.js";

const { PORT } = appConfig;
const app = express();

app.use(cors()); // Allow all for now to prevent dev issues, or restrict to process.env.FRONTEND_URL
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later",
  })
);

app.use(clientCache(1));

app.get("/", (req, res) => {
  const routes: IRouteData[] = [
    {
      method: "GET",
      path: "/otakudesu",
      description: "Otakudesu",
      pathParams: [],
      queryParams: [],
    },
    {
      method: "GET",
      path: "/kuramanime",
      description: "Kuramanime",
      pathParams: [],
      queryParams: [],
    },
    {
      method: "GET",
      path: "/animesail",
      description: "AnimeSail",
      pathParams: [],
      queryParams: [],
    },
    {
      method: "GET",
      path: "/samehadaku",
      description: "Samehadaku",
      pathParams: [],
      queryParams: [],
    },
  ];

  res.json(
    setPayload(res, {
      data: { routes },
    })
  );
});

app.use("/otakudesu", otakudesuRouter);
app.use("/kuramanime", kuramanimeRouter);
app.use("/samehadaku", samehadakuRouter);
app.use("/animesail", animesailRouter);

app.use(errorHandler);

// Export for Vercel
export default app;

// Start server only if run directly
import { pathToFileURL } from "url";


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(PORT, () => {
    console.log(`server is running on http://localhost:${PORT}`);
  });
}
