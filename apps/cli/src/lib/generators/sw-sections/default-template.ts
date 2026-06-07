/**
 * Default SW template with placeholder markers.
 * Placeholders are replaced during generation with feature-specific code.
 */

export function getDefaultTemplate(): string {
  return `let CACHE_NAME = "";
let ASSETS_TO_CACHE = [];

// [[CACHE_NAME]]
// [[ASSETS_LIST]]
// [[AUTO_SKIP_WAITING]]

const CACHE_NAME_RUNTIME = "swoff-runtime";
const CACHE_NAME_RUNTIME_HTML = "swoff-runtime-html";

// [[INSTALL_HANDLER]]
// [[ACTIVATE_HANDLER]]
// [[MESSAGE_HANDLER]]
// [[FETCH_HANDLER]]
// [[TAG_MANAGEMENT]]
// [[PUSH_HANDLERS]]
// [[SERVER_PUSH_HANDLER]]`;
}
