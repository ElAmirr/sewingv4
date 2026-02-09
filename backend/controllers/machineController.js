import { readData } from "../utils/fileDb.js";

// ================= CONTROLLER =================

/**
 * GET all machines
 * Used by frontend to list machines
 */
export const getMachines = async (req, res) => {
  try {
    console.log("GET /machines - fetching machines");
    const machines = await readData("machines.json");
    res.json(machines);
  } catch (err) {
    console.error("getMachines error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};
