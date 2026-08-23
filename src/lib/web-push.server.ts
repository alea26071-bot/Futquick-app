// Web Push (VAPID + aes128gcm) implemented with WebCrypto — Worker compatible.

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm as BufferSource, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

const enc = new TextEncoder();

async function importVapidSigningKey(privateD: string, publicRaw: Uint8Array): Promise<CryptoKey> {
  const x = bytesToB64url(publicRaw.subarray(1, 33));
  const y = bytesToB64url(publicRaw.subarray(33, 65));
  return crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: privateD, x, y, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function buildVapidHeader(endpoint: string): Promise<string> {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"] ?? "mailto:contato@futquick.app";
  if (!publicKey || !privateKey) throw new Error("VAPID keys missing");

  const audience = new URL(endpoint).origin;
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64url(
    enc.encode(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })),
  );
  const unsigned = `${header}.${payload}`;
  const key = await importVapidSigningKey(privateKey, b64urlToBytes(publicKey));
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned) as BufferSource),
  );
  return `vapid t=${unsigned}.${bytesToB64url(sig)}, k=${publicKey}`;
}

async function encryptPayload(sub: PushSubscriptionRecord, payload: string) {
  const clientPub = b64urlToBytes(sub.p256dh);
  const authSecret = b64urlToBytes(sub.auth);

  const serverKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPub = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));
  const clientPubKey = await crypto.subtle.importKey(
    "raw",
    clientPub as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: clientPubKey }, serverKeys.privateKey, 256),
  );

  const prk = await hkdf(
    authSecret,
    shared,
    concat(enc.encode("WebPush: info\0"), clientPub, serverPub),
    32,
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, prk, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, prk, enc.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek as BufferSource, "AES-GCM", false, ["encrypt"]);
  const plaintext = concat(enc.encode(payload), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, aesKey, plaintext as BufferSource),
  );

  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return concat(salt, rs, new Uint8Array([serverPub.length]), serverPub, ciphertext);
}

export type PushMessage = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

/** Sends one web push. Returns "gone" when the subscription must be deleted. */
export async function sendWebPush(
  sub: PushSubscriptionRecord,
  message: PushMessage,
): Promise<"ok" | "gone" | "error"> {
  try {
    const body = await encryptPayload(sub, JSON.stringify(message));
    const authorization = await buildVapidHeader(sub.endpoint);
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "high",
      },
      body: body as BodyInit,
    });
    if (res.status === 404 || res.status === 410) return "gone";
    if (!res.ok) {
      console.error("[push] failed", res.status, await res.text().catch(() => ""));
      return "error";
    }
    return "ok";
  } catch (e) {
    console.error("[push] error", e);
    return "error";
  }
}
