/**
 * NodePIN — Encryption Module
 * AES-256-GCM encryption for SSH credentials using Web Crypto API.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 100_000;
const SALT = 'nodepin-v2-salt-fixed';

/**
 * Derive an AES-256 key from the ENCRYPTION_KEY env var using PBKDF2.
 */
async function deriveKey(encryptionKey) {
  const encoder = new TextEncoder();

  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(encryptionKey),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string. Returns { ciphertext, iv, tag } as hex strings.
 */
export async function encrypt(plaintext, encryptionKey) {
  const key = await deriveKey(encryptionKey);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // AES-GCM appends the 16-byte auth tag to the ciphertext
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  const buf = new Uint8Array(encrypted);
  // Split ciphertext and tag (last 16 bytes = tag)
  const ciphertextBytes = buf.slice(0, buf.length - 16);
  const tagBytes = buf.slice(buf.length - 16);

  return {
    ciphertext: toHex(ciphertextBytes),
    iv: toHex(iv),
    tag: toHex(tagBytes)
  };
}

/**
 * Decrypt a ciphertext string. Accepts { ciphertext, iv, tag } as hex strings.
 */
export async function decrypt({ ciphertext, iv, tag }, encryptionKey) {
  const key = await deriveKey(encryptionKey);

  // Reconstruct the combined buffer (ciphertext + tag)
  const ctBytes = fromHex(ciphertext);
  const tagBytes = fromHex(tag);
  const combined = new Uint8Array(ctBytes.length + tagBytes.length);
  combined.set(ctBytes);
  combined.set(tagBytes, ctBytes.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: fromHex(iv) },
    key,
    combined
  );

  return new TextDecoder().decode(decrypted);
}

// ── Helpers ──

function toHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
