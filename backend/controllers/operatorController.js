import { readData, writeData } from "../utils/fileDb.js";

// ---------------- Controllers ----------------

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

  // Determine shift
  const hour = new Date().getHours();
  const shift =
    hour >= 6 && hour < 14 ? "Shift1" :
      hour >= 14 && hour < 22 ? "Shift2" :
        "Shift3";

  try {
    const operators = await readData("operators.json");
    const operator = operators.find(op => op.badge === badge_code);

    if (!operator) {
      return res.status(401).json({ message: "Invalid badge" });
    }

    let sessions = await readData("machine_sessions.json");

    // check if machine is already in an active session
    const activeSession = sessions.find(
      s => s.machine_id === machine_id && !s.ended_at
    );
    if (activeSession) {
      return res.status(409).json({ message: "Machine already in use" });
    }

    // delete old ended sessions for this machine
    sessions = sessions.filter(
      s => !(s.machine_id === machine_id && s.ended_at)
    );

    // create new session
    const session_id = sessions.length ? sessions[sessions.length - 1].session_id + 1 : 1;
    const newSession = {
      session_id,
      machine_id,
      operator_id: operator.operator_id,
      badge: operator.badge,
      shift,
      started_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      ended_at: null,
    };
    sessions.push(newSession);

    await writeData("machine_sessions.json", sessions);

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
    let sessions = await readData("machine_sessions.json");

    const now = new Date().toISOString();

    let updated = false;

    if (session_id) {
      const session = sessions.find(s => Number(s.session_id) === Number(session_id) && !s.ended_at);
      if (session) {
        session.ended_at = now;
        updated = true;
      }
    } else if (machine_id && operator_id) {
      const session = sessions.find(
        s => Number(s.machine_id) === Number(machine_id) &&
          Number(s.operator_id) === Number(operator_id) &&
          !s.ended_at
      );
      if (session) {
        session.ended_at = now;
        updated = true;
      }
    } else if (machine_id) {
      const session = sessions.find(s => Number(s.machine_id) === Number(machine_id) && !s.ended_at);
      if (session) {
        session.ended_at = now;
        updated = true;
      }
    }

    if (updated) await writeData("machine_sessions.json", sessions);

    res.json({ success: updated, message: updated ? "Logged out successfully" : "No active session found" });
  } catch (err) {
    console.error("logoutOperator error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
