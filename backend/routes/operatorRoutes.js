import express from "express";
import { loginOperator, logoutOperator, validateSession, getActiveOperators } from "../controllers/operatorController.js";

const router = express.Router();

router.get("/active", getActiveOperators);
router.post("/login", loginOperator);
router.post("/logout", logoutOperator);
router.get("/validate/:session_id", validateSession);

export default router;
