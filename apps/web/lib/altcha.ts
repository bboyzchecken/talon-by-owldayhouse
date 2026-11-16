// The ALTCHA bot check, browser side (apps/api/cmd/intake/altcha.go has the
// server and the reasoning). Fetch a signed puzzle from the intake, find the
// number whose SHA-256 matches, and hand back the answer to send with the
// form. Nothing here talks to anyone but our own intake.

interface Challenge {
  algorithm: string;
  challenge: string;
  maxnumber: number;
  salt: string;
  signature: string;
}

/**
 * Why a solve failed. The form says something different for each: a visitor
 * who cannot reach us at all needs LINE or Messenger, not "try again".
 *
 *   unreachable — the request never arrived (offline, DNS, blocked, CORS)
 *   unavailable — the intake answered, but not with a puzzle (404 means it is
 *                 configured for Turnstile while this build expects ALTCHA)
 *   unsolved    — a puzzle we could not solve; a bug on one side or the other
 */
export type AltchaFailure = "unreachable" | "unavailable" | "unsolved";

export class AltchaError extends Error {
  readonly reason: AltchaFailure;

  constructor(reason: AltchaFailure, detail?: string) {
    super(detail ? `${reason}: ${detail}` : reason);
    this.name = "AltchaError";
    this.reason = reason;
  }
}

const encoder = new TextEncoder();

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  let out = "";
  for (const byte of new Uint8Array(digest)) out += byte.toString(16).padStart(2, "0");
  return out;
}

/** Fetch a puzzle and solve it. Resolves to the token, or rejects with AltchaError. */
export async function solveAltcha(intakeUrl: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${intakeUrl}/intake/challenge`, { method: "POST", credentials: "omit" });
  } catch {
    // fetch() rejects for the network and for CORS alike; from here they are
    // the same thing — the intake is not answering this browser.
    throw new AltchaError("unreachable");
  }
  if (!response.ok) throw new AltchaError("unavailable", String(response.status));

  let c: Challenge;
  try {
    c = (await response.json()) as Challenge;
  } catch {
    throw new AltchaError("unavailable", "not json");
  }
  if (c.algorithm !== "SHA-256" || !c.challenge || !c.salt) throw new AltchaError("unavailable", "shape");

  for (let n = 0; n <= c.maxnumber; n++) {
    if ((await sha256Hex(c.salt + n)) === c.challenge) {
      const payload = { algorithm: c.algorithm, challenge: c.challenge, number: n, salt: c.salt, signature: c.signature };
      return btoa(JSON.stringify(payload));
    }
  }
  throw new AltchaError("unsolved");
}
