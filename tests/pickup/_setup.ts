// Point the DB layer at a throwaway SQLite file BEFORE lib/db is imported, so the
// migration (including the new pickup columns) runs against a temp DB and never
// touches production. Mirrors tests/intel/_setup.ts.

import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const dbPath = path.join(os.tmpdir(), `pickup-test-${process.pid}-${Date.now()}.db`);
process.env.LEADS_DB_PATH = dbPath;
process.env.SMS_ENABLED = "false";

process.on("exit", () => {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(dbPath + suffix);
    } catch {
      /* already gone */
    }
  }
});

export {};
