import express from "express";
import {
  createNeedleLog,
  getLatestLogByMachine,
  confirmNeedleChange
} from "../controllers/needleLogsController.js";

const router = express.Router();

router.post("/", createNeedleLog);
router.get("/:machineId", getLatestLogByMachine);
router.post("/confirm", confirmNeedleChange); // ✅ NEW

export default router;
