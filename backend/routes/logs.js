import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

// Helper to read JSON safely
function readJSON(file) {
  const filePath = path.join("data", file);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// GET all logs (with JOIN-like enrichment)
router.get("/", (req, res) => {
  try {
    const logs = readJSON("needle_change_logs.json");
    const machines = readJSON("machines.json");
    const supervisors = readJSON("supervisors.json");

    const result = logs
      .map(log => {
        const machine = machines.find(
          m => m.machine_id === log.machine_id
        );

        const supervisor = supervisors.find(
          s => s.badge === log.supervisor_badge
        );

        return {
          ...log,
          machine_name: machine ? machine.code : null,
          supervisor_name: supervisor ? supervisor.name : null
        };
      })
      .sort((a, b) => b.log_id - a.log_id); // DESC order

    res.json(result);
  } catch (err) {
    console.error("❌ logs GET error:", err);
    res.status(500).json({ error: "Failed to read logs" });
  }
});

export default router;
