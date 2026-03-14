import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to find the settings file
function getSettingsPath() {
    // Priority 1: Next to the executable (production)
    // In Electron production, process.type exists. 
    // We can check process.resourcesPath or specific relative paths.

    // When running as compiled executable, process.execPath is the exe.
    // We often want settings.json to be in the same folder as the exe for portability, 
    // or in a known userdata location.

    // For this request: "file dynamic... inside a file"
    // Let's look for settings.json in the application root.

    // Production: process.resourcesPath/../settings.json (folder with exe)
    // or process.resourcesPath/settings.json

    // Let's try to find it in the same directory as the executable first (if packed)
    // or project root (if dev).

    // Electron typically sets process.resourcesPath.
    const appRoot = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);

    const possibleSettings = [
        path.join(appRoot, "settings.json"), // Next to .exe
        path.join(appRoot, "resources", "settings.json"), // Valid for many electron-builder configs
        process.resourcesPath ? path.join(process.resourcesPath, "settings.json") : null, // In resources (if defined)
        path.join(__dirname, "../../settings.json"), // Dev: backend/utils/../../settings.json
        path.join(process.cwd(), "settings.json") // Fallback
    ].filter(Boolean);

    for (const p of possibleSettings) {
        if (fs.existsSync(p)) return p;
    }

    return null;
}

let cachedSettings = null;
let cachedDataPath = null;

function loadSettings() {
    if (cachedSettings) return cachedSettings;

    const settingsPath = getSettingsPath();
    if (!settingsPath) {
        console.log("[Config] No settings.json found, using defaults");
        cachedSettings = {};
        return cachedSettings;
    }

    try {
        console.log(`[Config] Reading settings: ${settingsPath}`);
        const content = fs.readFileSync(settingsPath, "utf-8");
        cachedSettings = JSON.parse(content);
        console.log(`[Config] Loaded Settings:`, cachedSettings);
    } catch (err) {
        console.error("[Config] Error reading settings.json:", err);
        cachedSettings = {};
    }

    return cachedSettings;
}

// Function to resolve data directory
export function getDataDir() {
    if (cachedDataPath) return cachedDataPath;

    const settings = loadSettings();
    const settingsPath = getSettingsPath();

    // Default to internal data folder if no settings found
    let dataPath = path.join(__dirname, "../data");

    if (settings.dataFolderPath && settingsPath) {
        // If path is absolute, use it. If relative, resolve relative to settings file.
        if (path.isAbsolute(settings.dataFolderPath)) {
            dataPath = settings.dataFolderPath;
        } else {
            dataPath = path.resolve(path.dirname(settingsPath), settings.dataFolderPath);
        }
    }

    cachedDataPath = dataPath;
    console.log(`[Config] Final Data Path: ${cachedDataPath} (Exists: ${fs.existsSync(cachedDataPath)})`);
    return cachedDataPath;
}

export function getMachineName() {
    const settings = loadSettings();
    return settings.machineName || "";
}
