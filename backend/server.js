import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { getMachineName } from "./utils/config.js";
import { initScheduler } from "./utils/scheduler.js"; // Import scheduler

import operatorRoutes from "./routes/operatorRoutes.js";
import machineRoutes from "./routes/machineRoutes.js";
import needleLogsRoutes from "./routes/needleLogsRoutes.js";

dotenv.config();

// Initialize Scheduler
initScheduler();

const app = express();

app.use(cors({
  origin: "*", // OK for LAN
}));
app.use(express.json());

// API routes
app.use("/operators", operatorRoutes);
app.use("/machines", machineRoutes);
app.use("/logs", needleLogsRoutes);

app.get("/config", (req, res) => {
  const machineName = getMachineName();
  res.json({ machineName });
});

// ===== FRONTEND DIST SERVING =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// path to frontend/dist
let frontendDistPath = path.join(__dirname, "../frontend/dist");

if (!fs.existsSync(frontendDistPath)) {
  // Fallback for production build
  frontendDistPath = path.join(process.resourcesPath, "frontend/dist");
}

if (!fs.existsSync(frontendDistPath)) {
  // Second fallback for another common production location
  frontendDistPath = path.join(process.resourcesPath, "app/frontend/dist");
}

console.log(`Frontend assets path: ${frontendDistPath}`);

// Serve static files
app.use(express.static(frontendDistPath));

// React router support
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

// =================================

app.listen(5000, "0.0.0.0", () => {
  console.log("Backend running on http://0.0.0.0:5000");
});
