import express from "express";
import { loginOperator, logoutOperator } from "../controllers/operatorController.js";

const router = express.Router();

router.post("/login", loginOperator);
router.post("/logout", logoutOperator);

export default router;
