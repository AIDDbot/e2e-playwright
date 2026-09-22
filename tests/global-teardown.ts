import { rmSync } from "node:fs";

const SQLITE_COMPANION_SUFFIXES = ["", "-wal", "-shm"];

const removeDatabase = (dbPath: string): void => {
  for (const suffix of SQLITE_COMPANION_SUFFIXES) {
    rmSync(`${dbPath}${suffix}`, { force: true });
  }
};

// Deletes the per-run database created by playwright.config.ts
export default function globalTeardown(): void {
  const dbPath = process.env["E2E_DB_PATH"];
  if (!dbPath) {
    return;
  }
  try {
    removeDatabase(dbPath);
  } catch {
    // Global teardown runs before the web servers stop, so on Windows the back
    // still holds the file open; retry once the runner has killed it
    process.once("exit", () => {
      try {
        removeDatabase(dbPath);
      } catch (error) {
        console.warn(`Could not remove the E2E database ${dbPath}:`, error);
      }
    });
  }
}
