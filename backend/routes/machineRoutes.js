import express from "express";
import { getMachines } from "../controllers/machineController.js";

const router = express.Router();

router.get("/", getMachines);

export default router;
