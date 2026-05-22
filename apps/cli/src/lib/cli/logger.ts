/**
 * Structured logger for CLI output.
 */

import { colors } from "./colors.js";

export const log = {
  info: (msg: string) => console.log(`${colors.blue}${msg}${colors.reset}`),
  success: (msg: string) =>
    console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warn: (msg: string) =>
    console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  help: (msg: string) => console.log(`  ${colors.cyan}${msg}${colors.reset}`),
  header: (msg: string) => console.log(`${colors.bright}${msg}${colors.reset}`),
};
