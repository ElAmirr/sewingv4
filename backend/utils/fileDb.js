import fs from "fs";
import path from "path";
import { getDataDir } from "./config.js";
import { acquireLock, releaseLock } from "./fileLock.js";

function getFilePath(file) {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, file);
}

export async function readData(file) {
  const filePath = getFilePath(file);
  await acquireLock();
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content || "[]");
  } finally {
    releaseLock();
  }
}

export async function writeData(file, data) {
  const filePath = getFilePath(file);
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await acquireLock();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } finally {
    releaseLock();
  }
}
