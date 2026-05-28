export function statusLine(msg: string) {
  if (process.stdout.isTTY) {
    const cols = process.stdout.columns || 80;
    process.stdout.write(`\r${" ".repeat(cols - 1)}\r  ${msg}`);
  } else {
    console.log(`  ${msg}`);
  }
}

export function clearStatusLine() {
  if (process.stdout.isTTY) {
    const cols = process.stdout.columns || 80;
    process.stdout.write(`\r${" ".repeat(cols - 1)}\r`);
  }
}

export function ttyStatus(onStatus?: (msg: string) => void): (msg: string) => void {
  if (onStatus) return onStatus;
  return statusLine;
}
