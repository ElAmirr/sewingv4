import { readData, writeData } from "../utils/fileDb.js";
import { generateSessionId, parseSessionId, getSessionFilePath, getActiveSessions } from "../utils/sessionUtils.js";
import { getTunisiaISO } from "../utils/timeHelper.js";
import { loadSchedule, getShiftForDate } from "../utils/scheduleHelper.js";

// ---------------- Controllers ----------------

export const getActiveOperators = async (req, res) => {
  try {
    const active = await getActiveSessions();
    res.json(active);
  } catch (err) {
    console.error("getActiveOperators error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const loginOperator = async (req, res) => {
  const badge_code =
    req.body?.badge_code ?? req.body?.badge ?? req.body?.badgeCode ?? req.body?.badgeId;

  const rawMachineId =
    req.body?.machine_id ?? req.body?.machineId ?? req.body?.machine ?? req.body?.machineId;

  const machine_id = rawMachineId ? Number(rawMachineId) : NaN;

  if (!badge_code || !Number.isFinite(machine_id)) {
    return res.status(400).json({
      message: "Badge and valid machine_id are required",
      received: req.body,
    });
  }

  // Determine shift using schedule.json (dynamic, day-aware)
  const schedule = loadSchedule();
  const shift = getShiftForDate(new Date(), schedule);

  try {
    const operators = await readData("operators.json");
    const operator = operators.find(op => op.badge === badge_code);

    if (!operator) {
      return res.status(401).json({ message: "Invalid badge" });
    }

    const sessionFile = getSessionFilePath(machine_id);
    let sessions = await readData(sessionFile);

    // check if machine is already in an active session (on this machine only)
    const activeSession = sessions.find(
      s => s.machine_id === machine_id && !s.ended_at
    );
    if (activeSession) {
      // Return existing session if it's the same operator, else block
      if (activeSession.operator_id === operator.operator_id) {
        return res.json({
          operator,
          machine_id,
          shift: activeSession.shift,
          session_id: activeSession.session_id,
        });
      }
      return res.status(409).json({ message: "Machine already in use" });
    }

    // create new session
    const session_id = generateSessionId(machine_id);
    const newSession = {
      session_id,
      machine_id,
      operator_id: operator.operator_id,
      badge: operator.badge,
      shift,
      started_at: getTunisiaISO(),
      last_heartbeat: getTunisiaISO(),
      ended_at: null,
    };
    sessions.push(newSession);

    await writeData(sessionFile, sessions);

    return res.json({
      operator,
      machine_id,
      shift,
      session_id,
    });
  } catch (err) {
    console.error("loginOperator error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const logoutOperator = async (req, res) => {
  const { session_id, machine_id, operator_id } = req.body;

  if (!session_id && !machine_id && !operator_id) {
    return res.status(400).json({ message: "session_id or machine_id/operator_id required" });
  }

  try {
    let targetFile = null;
    let targetSessions = [];
    let sessionToUpdate = null;

    if (session_id) {
      const info = parseSessionId(session_id);
      if (info) {
        targetFile = getSessionFilePath(info.machineId, info.dateISO);
        targetSessions = await readData(targetFile);
        sessionToUpdate = targetSessions.find(s => s.session_id === session_id && !s.ended_at);
      }
    } else {
      // Fallback for old sessions or missing IDs (global search if needed, but here we enforce id)
      return res.status(400).json({ message: "session_id is required for reliable logout" });
    }

    if (sessionToUpdate) {
      sessionToUpdate.ended_at = getTunisiaISO();
      await writeData(targetFile, targetSessions);
      return res.json({ success: true, message: "Logged out successfully" });
    }

    res.json({ success: false, message: "No active session found" });
  } catch (err) {
    console.error("logoutOperator error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const validateSession = async (req, res) => {
  const { session_id } = req.params;

  if (!session_id) {
    return res.status(400).json({ valid: false, message: "session_id required" });
  }

  try {
    const info = parseSessionId(session_id);
    if (!info) {
      // Check legacy global file for compatibility during migration
      const legacySessions = await readData("machine_sessions.json");
      const legacySession = legacySessions.find(s => String(s.session_id) === String(session_id));
      if (legacySession && !legacySession.ended_at) return res.json({ valid: true });
      return res.json({ valid: false, message: "Invalid session format or session not found" });
    }

    const sessionFile = getSessionFilePath(info.machineId, info.dateISO);
    const sessions = await readData(sessionFile);
    const session = sessions.find(s => s.session_id === session_id);

    if (!session || session.ended_at) {
      return res.json({ valid: false, message: "Session ended or not found" });
    }

    return res.json({ valid: true });
  } catch (err) {
    console.error("validateSession error:", err);
    res.status(500).json({ valid: false, message: "Server error" });
  }
};

