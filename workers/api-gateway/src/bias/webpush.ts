// Web Push sender for Cloudflare Workers (Web Crypto only, no Node deps).
//
// Implements:
//   - VAPID JWT signing (ECDSA P-256, ES256, RFC 8292)
//   - Payload encryption (aes128gcm content-encoding, RFC 8291)
//   - Push request (HTTP POST with Authorization + Encryption headers)
//
// The entire flow runs inside the isolate so adding a subscription and
// sending a push never leave Cloudflare's edge.
//
// Reference implementations followed:
//   - https://datatracker.ietf.org/doc/html/rfc8291 (aes128gcm)
//   - https://datatracker.ietf.org/doc/html/rfc8292 (VAPID)
//   - https://developer.mozilla.org/en-US/docs/Web/API/Push_API

export interface PushSubscription {
  endpoint: string;
  p256dh: string;   // base64url (client public key, raw P-256)
  auth: string;     // base64url (16-byte auth secret)
}

export interface VapidKeys {
  publicKeyB64: string;    // raw P-256, base64url
  privateKeyB64: string;   // JWK `d` value, base64url
  subject: string;         // mailto: or https:
}

export interface PushSendResult {
  ok: boolean;
  status?: number;
  /** True iff endpoint is 404/410 (subscription no longer exists). */
  gone?: boolean;
  error?: string;
}

/** Send one web push notification. Returns success + whether the
 *  subscription should be deleted (404/410 → gone). */
export async function sendWebPush(
  sub: PushSubscription,
  payload: string,
  vapid: VapidKeys,
  ttlSeconds = 1800,
): Promise<PushSendResult> {
  try {
    const url = new URL(sub.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const authToken = await signVapidJwt(audience, vapid);
    const { ciphertext, salt, serverPublicKey } = await encryptPayload(
      payload,
      sub.p256dh,
      sub.auth,
    );

    const headers: Record<string, string> = {
      'Authorization': `vapid t=${authToken}, k=${vapid.publicKeyB64}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': String(ttlSeconds),
      'Urgency': 'high',
    };

    // The aes128gcm content-encoding packs salt + record-size + server pubkey
    // into a header prefix before the ciphertext. Assemble the final body.
    const saltBytes = b64urlDecode(salt);
    const serverKeyBytes = b64urlDecode(serverPublicKey);
    const body = assembleAes128GcmBody(saltBytes, serverKeyBytes, ciphertext);

    const res = await fetch(sub.endpoint, { method: 'POST', headers, body });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        status: res.status,
        gone: res.status === 404 || res.status === 410,
        error: `${res.status} ${res.statusText} ${text.slice(0, 200)}`,
      };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown push error' };
  }
}

// ── VAPID JWT signing ─────────────────────────────────────────

async function signVapidJwt(audience: string, vapid: VapidKeys): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { typ: 'JWT', alg: 'ES256' };
  const claims = {
    aud: audience,
    exp: nowSec + 12 * 3600,  // 12h, the VAPID spec max
    sub: vapid.subject,
  };
  const headerB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const claimsB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const signingInput = `${headerB64}.${claimsB64}`;

  // Import the private key as JWK. Cloudflare's subtle.importKey requires
  // both d and the matching public point (x,y) to import a P-256 key.
  const pub = b64urlDecode(vapid.publicKeyB64);
  // raw EC public key is 65 bytes: 0x04 | X(32) | Y(32)
  if (pub[0] !== 0x04 || pub.length !== 65) throw new Error('invalid VAPID public key format');
  const x = b64urlEncode(pub.slice(1, 33));
  const y = b64urlEncode(pub.slice(33, 65));

  const jwk: JsonWebKey = { kty: 'EC', crv: 'P-256', x, y, d: vapid.privateKeyB64, ext: true };
  const key = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign'],
  );

  const sigDer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );
  // Web Crypto returns raw 64-byte R||S — JWS needs this exact format.
  return `${signingInput}.${b64urlEncode(new Uint8Array(sigDer))}`;
}

// ── aes128gcm payload encryption (RFC 8291) ──────────────────

async function encryptPayload(
  payload: string,
  clientPublicB64: string,
  clientAuthB64: string,
): Promise<{ ciphertext: Uint8Array; salt: string; serverPublicKey: string }> {
  const payloadBytes = new TextEncoder().encode(payload);
  const clientPub = b64urlDecode(clientPublicB64);
  const clientAuth = b64urlDecode(clientAuthB64);

  // Ephemeral ECDH P-256 keypair (one per push request)
  const serverKp = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  ) as CryptoKeyPair;
  const serverPubRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKp.publicKey) as ArrayBuffer,
  );

  // Import client's public key for deriveBits
  const clientKey = await crypto.subtle.importKey(
    'raw', clientPub as BufferSource,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, [],
  );

  // Shared ECDH secret. Cloudflare's workers-types spells the ECDH
  // counterparty key as `$public` rather than `public`; runtime accepts
  // either, so cast to any for cross-env portability.
  // Cloudflare's workers-types rename ECDH `public` → `$public`; runtime
  // accepts either. Typed any to stay compatible across lib versions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ecdhParams: any = { name: 'ECDH', public: clientKey };
  const sharedBits = await crypto.subtle.deriveBits(
    ecdhParams,
    serverKp.privateKey,
    256,
  );
  const sharedSecret = new Uint8Array(sharedBits);

  // Derive PRK_key via HKDF-SHA256 over the auth secret
  // info = "WebPush: info\0" || client_public || server_public
  const info = concat(
    new TextEncoder().encode('WebPush: info\0'),
    clientPub,
    serverPubRaw,
  );
  const prkKey = await hkdf(sharedSecret, clientAuth, info, 32);

  // Random 16-byte salt for this push
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive Content-Encryption Key (CEK) and nonce from prkKey
  const cek = await hkdf(prkKey, salt, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(prkKey, salt, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

  // Record = payload || 0x02 || padding(0)  (single-record, minimal padding)
  const record = new Uint8Array(payloadBytes.length + 1);
  record.set(payloadBytes, 0);
  record[payloadBytes.length] = 0x02;  // final record delimiter

  const cekKey = await crypto.subtle.importKey(
    'raw', cek,
    { name: 'AES-GCM', length: 128 },
    false, ['encrypt'],
  );
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    cekKey,
    record,
  ));

  return {
    ciphertext,
    salt: b64urlEncode(salt),
    serverPublicKey: b64urlEncode(serverPubRaw),
  };
}

/** aes128gcm body format (RFC 8188 §2.1):
 *    salt (16) | rs:uint32 (4) | idlen:uint8 (1) | keyid (idlen bytes) | ciphertext
 *  For Web Push, keyid = server_public_key (65 bytes). rs = 4096 default. */
function assembleAes128GcmBody(
  salt: Uint8Array,
  serverPublicKey: Uint8Array,
  ciphertext: Uint8Array,
): Uint8Array {
  const rs = 4096;
  const header = new Uint8Array(21 + serverPublicKey.length);
  header.set(salt, 0);
  // record size (big-endian uint32)
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = serverPublicKey.length;
  header.set(serverPublicKey, 21);

  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header, 0);
  body.set(ciphertext, header.length);
  return body;
}

// ── HKDF + base64url helpers ─────────────────────────────────

async function hkdf(
  key: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey('raw', key as BufferSource, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: info as BufferSource },
    baseKey,
    length * 8,
  );
  return new Uint8Array(bits);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
