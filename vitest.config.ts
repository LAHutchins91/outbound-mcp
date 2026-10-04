import os from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";

const dataFile = path.join(os.tmpdir(), "outbound-vitest", ".outbound", "outbound.json");

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    env: {
      OUTBOUND_DATA_FILE: dataFile,
      APP_BASE_URL: "http://127.0.0.1:3000",
      SUPABASE_URL: "https://outbound.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key"
    }
  }
});
