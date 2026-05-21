/**
 * Structured logger for CLI output.
 */

import { colors } from "./colors.js";

export const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✅${colors.reset}  ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
  error: (msg: string) => console.log(`${colors.red}❌${colors.reset}  ${msg}`),
  help: (msg: string) => console.log(`  ${colors.cyan}${msg}${colors.reset}`),
  header: (msg: string) => console.log(`\n${colors.bright}${msg}${colors.reset}\n`),
};
