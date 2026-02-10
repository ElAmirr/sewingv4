import { readData, writeData } from "../utils/fileDb.js";
import fs from "fs";
import path from "path";
import { getDataDir } from "../utils/config.js";

// ================= HELPERS =================
function getMachineLogPath(machineId, date = null) {
  const d = date || new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `machine_${machineId}/${d}.json`;
}

function nowISO() {
  return new Date().toISOString();
}

// ================= CONTROLLERS =================

/**
 * POST - operator logs needle change
 */
export const createNeedleLog = async (req, res) => {
  const {
    machine_id,
    operator_id,
    color,
    status,
    cycle_start_time,
    cycle_end_time
  } = req.body;

  if (!machine_id || !color || !status || !cycle_start_time || !cycle_end_time) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const logFile = getMachineLogPath(machine_id);
    const logs = await readData(logFile);

    // Use Date.now() for unique IDs across daily files
    const log_id = Date.now();

    const newLog = {
      log_id,
      machine_id,
      operator_id: operator_id || null,
      color,
      status,
      operator_press_time: nowISO(),
      cycle_start_time,
      cycle_end_time,
      supervisor_id: null,
      supervisor_badge: null,
      supervisor_confirmation: null,
      supervisor_scan_time: null,
      updated_at: null
    };

    logs.push(newLog);
    await writeData(logFile, logs);

    res.json({ message: "Needle change logged", log_id });
  } catch (err) {
    console.error("createNeedleLog error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST - supervisor confirms needle change
 */
export const confirmNeedleChange = async (req, res) => {
  const { log_id, supervisor_badge, validation, machine_id } = req.body;

  if (!supervisor_badge || !validation || !log_id || !machine_id) {
    return res.status(400).json({ message: "Missing required data (badge, validation, log_id, machine_id)" });
  }

  try {
    const supervisors = await readData("supervisors.json");
    const supervisor = supervisors.find(s => s.badge === supervisor_badge);
    if (!supervisor) return res.status(404).json({ message: "Supervisor not found" });

    // Since logs are daily, we search files in the machine folder to find the log_id
    const dataDir = getDataDir();
    const machineDir = path.join(dataDir, `machine_${machine_id}`);

    if (!fs.existsSync(machineDir)) {
      return res.status(404).json({ message: "No logs found for this machine" });
    }

    // Sort files descending (YYYY-MM-DD) to find today's logs first
    const files = fs.readdirSync(machineDir)
      .filter(f => f.endsWith(".json"))
      .sort((a, b) => b.localeCompare(a));

    let foundLog = null;
    let targetFile = null;
    let fileLogs = [];

    // Search for the log_id across all daily files for this machine
    for (const file of files) {
      const relPath = `machine_${machine_id}/${file}`;
      fileLogs = await readData(relPath);
      // Use == to handle string/number comparison if log_id comes as string
      foundLog = fileLogs.find(l => l.log_id == log_id);
      if (foundLog) {
        targetFile = relPath;
        break;
      }
    }

    if (!foundLog) return res.status(404).json({ message: "Log not found" });

    foundLog.supervisor_id = supervisor.supervisor_id;
    foundLog.supervisor_badge = supervisor_badge;
    foundLog.supervisor_confirmation = validation; // CONFIRMED / NOT_CONFIRMED
    foundLog.supervisor_scan_time = nowISO();
    foundLog.updated_at = nowISO();

    await writeData(targetFile, fileLogs);
    res.json({ message: "Supervisor validation saved" });
  } catch (err) {
    console.error("confirmNeedleChange error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET - latest needle log per machine
 */
export const getLatestLogByMachine = async (req, res) => {
  const { machineId } = req.params;

  try {
    const dataDir = getDataDir();
    const machineDir = path.join(dataDir, `machine_${machineId}`);

    if (!fs.existsSync(machineDir)) return res.json(null);

    const files = fs.readdirSync(machineDir).filter(f => f.endsWith(".json")).sort().reverse();
    if (files.length === 0) return res.json(null);

    // Get the most recent daily file (assuming lexicographical sort works for YYYY-MM-DD)
    const latestFile = `machine_${machineId}/${files[0]}`;
    const logs = await readData(latestFile);

    if (!logs.length) return res.json(null);

    const latest = logs.sort((a, b) => new Date(b.operator_press_time) - new Date(a.operator_press_time))[0];
    res.json(latest);
  } catch (err) {
    console.error("getLatestLogByMachine error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
