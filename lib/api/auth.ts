import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiKey } from "@/types/database";

export const KEY_PREFIX = "crm_live_";

/**
 * Mints a key. The plaintext is returned once and never stored - only its
 * SHA-256 hash goes to the database, so a database leak does not hand anyone
 * working credentials.
 *
 * Plain SHA-256 rather than bcrypt/argon2 is deliberate: this is a 256-bit
 * random secret, not a human-chosen password, so there is no dictionary to
 * attack and the slow-hash cost would buy nothing per request.
 */
export function generateApiKey() {
  const secret = randomBytes(32).toString("base64url");
  const key = `${KEY_PREFIX}${secret}`;
  return {
    key,
    keyHash: hashApiKey(key),
    keyPrefix: key.slice(0, KEY_PREFIX.length + 6),
  };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export type AuthedKey = Pick<ApiKey, "id" | "name" | "scopes">;

export type AuthResult =
  | { ok: true; key: AuthedKey }
  | { ok: false; response: NextResponse };

function unauthorized(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
  );
}

/**
 * Authenticates a request from one of your other websites.
 *
 * Looks the key up by hash - an indexed equality match, not a scan - then does
 * a constant-time compare so a timing signal cannot leak the stored hash.
 */
export async function authenticateRequest(
  request: NextRequest,
  requiredScope: "read" | "checkout",
): Promise<AuthResult> {
  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : request.headers.get("x-api-key")?.trim();

  if (!presented) {
    return { ok: false, response: unauthorized("Missing API key") };
  }

  const presentedHash = hashApiKey(presented);
  const supabase = createAdminClient();

  const { data: key } = await supabase
    .from("api_keys")
    .select("id, name, scopes, key_hash, revoked_at")
    .eq("key_hash", presentedHash)
    .maybeSingle();

  if (!key || key.revoked_at) {
    return { ok: false, response: unauthorized("Invalid API key") };
  }

  const a = Buffer.from(key.key_hash, "hex");
  const b = Buffer.from(presentedHash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, response: unauthorized("Invalid API key") };
  }

  if (!key.scopes.includes(requiredScope)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `This key lacks the "${requiredScope}" scope` },
        { status: 403 },
      ),
    };
  }

  // Best-effort last-used stamp; never block the request on it.
  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id)
    .then(undefined, () => {});

  return { ok: true, key: { id: key.id, name: key.name, scopes: key.scopes } };
}

/** Other sites call these from browsers, so preflight has to work. */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

export function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...CORS_HEADERS, ...init?.headers },
  });
}

export function preflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
