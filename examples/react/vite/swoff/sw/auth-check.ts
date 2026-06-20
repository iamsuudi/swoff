import type { Response } from "../sw/swoff.d";

/** 
 * Custom auth failure check for the Service Worker.
 * 
 * The SW calls this for every network response. Return true when the
 * response indicates the user's session is no longer valid (e.g.
 * status 401, or a custom error body on 200).
 * 
 * Runs inside the service worker — no DOM, no IndexedDB, no fetch.
 * Must clone response before reading the body if body is needed.
 * 
 * Examples:
 *   // Default: 401 status
 *   return response.status === 401;
 * 
 *   // Custom header
 *   return response.headers.get("X-Auth-Status") === "expired";
 * 
 *   // JSON body (must clone first)
 *   const data = await response.clone().json();
 *   return data.error === "unauthorized";
 */
export async function isAuthFailureResponse(response: Response): Promise<boolean> {
  return response.status === 401;
}
