// Test setup: point the DB layer at a throwaway SQLite file BEFORE lib/db is
// imported. ES modules evaluate imports in source order, so a test file that does
//   import './_setup'
//   import { ... } from '../../lib/intel'
// gets LEADS_DB_PATH set here before lib/db.ts reads it. Never touches production.

import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const dbPath = path.join(os.tmpdir(), `intel-test-${process.pid}-${Date.now()}.db`);
process.env.LEADS_DB_PATH = dbPath;
process.env.SMS_ENABLED = "false";

// Clean up the temp DB (and WAL/SHM sidecars) when the test process exits.
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
