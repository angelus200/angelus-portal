import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { clerkMiddleware } from "@clerk/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { authMiddleware } from "./auth-middleware";
import { serveStatic, setupVite } from "./vite";
import { handleStripeWebhook } from "../webhooks/stripe";
import interestCalculationRouter from "../routers/interest-calculation.router";
import uploadRouter from "../upload-router";
import kycUploadRouter from "../kyc-upload-router";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Validate ENV variables
  console.log('[Server] Environment check:', {
    hasClerkPublishableKey: !!ENV.clerkPublishableKey,
    hasClerkSecretKey: !!ENV.clerkSecretKey,
    hasDatabaseUrl: !!ENV.databaseUrl,
    clerkPublishableKeyPrefix: ENV.clerkPublishableKey?.substring(0, 8),
    nodeEnv: process.env.NODE_ENV
  });

  if (!ENV.clerkPublishableKey || !ENV.clerkSecretKey) {
    console.error('[Server] CRITICAL: Clerk keys not configured!');
  }

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Clerk Middleware - Must be before auth middleware
  app.use(clerkMiddleware({
    publishableKey: ENV.clerkPublishableKey,
    secretKey: ENV.clerkSecretKey,
  }));

  // Authentication Middleware - Authentifiziert Benutzer für alle Routes
  app.use(authMiddleware);
  
  // Interest Calculation API
  app.use("/api", interestCalculationRouter);

  // File Upload & Serving
  app.use("/api", uploadRouter);

  // KYC-Dokumente (verschlüsselt at rest, Admin-Download im Stream)
  app.use("/api", kycUploadRouter);
  
  // Stripe webhook - must be before express.json() to access raw body
  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    await handleStripeWebhook(req, res);
  });
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
