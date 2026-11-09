// Frees a dev port before `pnpm dev`, on Windows, macOS and Linux.
// Always exits 0, so a missing tool can never block the dev server.
import { execSync } from "node:child_process";

const port = process.argv[2] ?? "3000";
const isWindows = process.platform === "win32";

function run(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return ""; // lsof and netstat exit non-zero when nothing matches.
  }
}

function listeningPids() {
  if (!isWindows) return run(`lsof -ti tcp:${port} -sTCP:LISTEN`).split(/\s+/).filter(Boolean);
  // Columns: Proto, Local Address, Foreign Address, State, PID.
  return run("netstat -ano")
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .filter(([proto, local, , state]) => proto === "TCP" && state === "LISTENING" && local.endsWith(`:${port}`))
    .map((columns) => columns[4]);
}

for (const pid of new Set(listeningPids())) {
  if (isWindows) run(`taskkill /PID ${pid} /T /F`);
  else run(`kill -9 ${pid}`);
}
