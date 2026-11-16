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

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  let out = "";
  for (const byte of new Uint8Array(digest)) out += byte.toString(16).padStart(2, "0");
  return out;
}

/** Fetch a puzzle and solve it. Resolves to the token, or rejects. */
export async function solveAltcha(intakeUrl: string): Promise<string> {
  const response = await fetch(`${intakeUrl}/intake/challenge`, { method: "POST", credentials: "omit" });
  if (!response.ok) throw new Error(`challenge ${response.status}`);
  const c = (await response.json()) as Challenge;
  if (c.algorithm !== "SHA-256") throw new Error("algorithm");

  for (let n = 0; n <= c.maxnumber; n++) {
    if ((await sha256Hex(c.salt + n)) === c.challenge) {
      const payload = { algorithm: c.algorithm, challenge: c.challenge, number: n, salt: c.salt, signature: c.signature };
      return btoa(JSON.stringify(payload));
    }
  }
  throw new Error("unsolved");
}
