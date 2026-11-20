import { randomBytes } from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { validateRequestOrigin } from "./csrf.ts";
import type { Dependencies } from "./dependencies.ts";
import { errorHandler, sendErrorPage } from "./errors.ts";
import { createAccountRouter } from "./routes/account.ts";
import { createAdminRouter } from "./routes/admin.ts";
import { createApiRouter } from "./routes/api.ts";
import { createArchiveRouter } from "./routes/archive.ts";
import { createAssistantRouter } from "./routes/assistant.ts";
import { createAuthRouter } from "./routes/auth.ts";
import { createPasskeyRouter } from "./routes/passkey.ts";
import { createCartRouter } from "./routes/cart.ts";
import { createCheckoutRouter } from "./routes/checkout.ts";
import { createFilesRouter } from "./routes/files.ts";
import { createImagePreviewRouter } from "./routes/imagePreview.ts";
import { createOrdersRouter } from "./routes/orders.ts";
import { createPawPalRouter } from "./routes/pawpal.ts";
import { createProductsRouter } from "./routes/products.ts";
import { createStorefrontRouter } from "./routes/storefront.ts";
import { createSupportRouter } from "./routes/support.ts";
import { migrateSensitiveDataAtRest } from "./storage/migrations.ts";

export function createApp(deps: Dependencies): express.Express {
  migrateSensitiveDataAtRest(deps.db, deps.keyring);
  const app = express();

  app.use((_req, res, next) => {
    res.locals.cspNonce = randomBytes(16).toString("base64");
    next();
  });
  app.use(
      helmet({
          contentSecurityPolicy: {
              directives: {
                  scriptSrc: ["'self'", (_req, res) => {
                      const nonce = (res as express.Response).locals.cspNonce;
                      return nonce? `'nonce-${nonce}'` : "'self'";
                  }],
                  styleSrc: ["'self'"],
                  frameSrc: ["'self'"],
                  upgradeInsecureRequests: [],
              },
          },
          referrerPolicy: {
              policy: "strict-origin-when-cross-origin",
          },
          xFrameOptions: {
              action: "sameorigin",
          },
          strictTransportSecurity: false,
      })
  );

  const corsTargetFiles = new Set(["/shipping-widget.css", "/shipping-widget.js"]);
  app.use((req, res, next) => {
      if (corsTargetFiles.has(req.path)) {
          return helmet.crossOriginResourcePolicy({
              policy: "cross-origin",
          })(req, res, next);
      }
      next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, app: "bearly-secure" });
  });
  app.use(express.static("public"));
  app.use(
    "/vendor/simplewebauthn",
    express.static("node_modules/@simplewebauthn/browser/dist/bundle"),
  );

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(createPawPalRouter(deps));
  app.use(validateRequestOrigin(deps.appOrigin));
  app.use("/api", (req, res, next) => {
    if (req.method === "GET" && req.path.startsWith("/api/products")) {
      return cors({
        origin: "*",
        methods: ["GET"],
        allowedHeaders: [],
        credentials: false,
      })(req, res, next);
    }
    return cors({
      origin: deps.appOrigin,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: false,
    })(req, res, next);
  });
  app.use(createApiRouter(deps));

  app.use(createArchiveRouter(deps));
  app.use(createAssistantRouter(deps));
  app.use(createImagePreviewRouter(deps));

  app.use(createAuthRouter(deps));
  app.use(createPasskeyRouter(deps));
  app.use(createAccountRouter(deps));
  app.use(createCartRouter(deps));
  app.use(createCheckoutRouter(deps));
  app.use(createFilesRouter(deps));
  app.use(createOrdersRouter(deps));
  app.use(createProductsRouter(deps));
  app.use(createSupportRouter(deps));
  app.use(createAdminRouter(deps));
  app.use(createStorefrontRouter(deps));

  app.use((_req, res) => {
    sendErrorPage(
      res,
      404,
      "Page Not Found",
      "We couldn't find the page you requested.",
    );
  });
  app.use(errorHandler);

  return app;
}
