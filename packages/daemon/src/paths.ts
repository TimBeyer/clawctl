import { join } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".config", "clawctl");

export const DAEMON_PID_PATH = join(CONFIG_DIR, "daemon.pid");
export const DAEMON_SOCKET_PATH = join(CONFIG_DIR, "daemon.sock");
export const DAEMON_CONFIG_PATH = join(CONFIG_DIR, "daemon.json");
export const DAEMON_LOG_DIR = join(CONFIG_DIR, "logs");
export const DAEMON_LOG_PATH = join(DAEMON_LOG_DIR, "daemon.log");
export const DAEMON_STDOUT_PATH = join(DAEMON_LOG_DIR, "daemon.stdout.log");
export const DAEMON_STDERR_PATH = join(DAEMON_LOG_DIR, "daemon.stderr.log");
