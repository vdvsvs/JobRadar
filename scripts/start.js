import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function start() {
  // Start Vite dev server for renderer
  const vite = spawn("npx", ["vite", "--port", "5173"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
  });

  // Wait for Vite to start
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Start Electron
  const electron = spawn(
    "npx",
    ["electron", path.join(__dirname, "out/main/index.js")],
    {
      cwd: __dirname,
      stdio: "inherit",
      shell: true,
    },
  );

  electron.on("exit", () => {
    vite.kill();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    electron.kill();
    vite.kill();
    process.exit(0);
  });
}

start().catch(console.error);
