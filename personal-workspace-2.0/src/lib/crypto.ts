// 私密想法加密：PBKDF2 派生密钥 + AES-GCM 加密，密钥只存在于设备内存。

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(u8: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) {
    s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedBlob {
  salt: string;
  iv: string;
  data: string;
}

export async function encryptText(password: string, plaintext: string): Promise<EncryptedBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(ct)) };
}

export async function decryptText(password: string, blob: EncryptedBlob): Promise<string> {
  const key = await deriveKey(password, fromB64(blob.salt));
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(blob.iv) },
    key,
    fromB64(blob.data) as BufferSource
  );
  return dec.decode(pt);
}

export const PRIVATE_PIN = '201128';

export async function makeVaultMarker(password: string): Promise<EncryptedBlob> {
  return encryptText(password, 'pw-vault-ok');
}

export async function verifyVault(password: string, marker: EncryptedBlob): Promise<boolean> {
  try {
    const text = await decryptText(password, marker);
    return text === 'pw-vault-ok';
  } catch {
    return false;
  }
}

const VAULT_LS = 'pw-vault-unlocked';

export function vaultUnlocked(): boolean {
  return sessionStorage.getItem(VAULT_LS) === '1';
}

export function setVaultUnlocked(v: boolean): void {
  if (v) sessionStorage.setItem(VAULT_LS, '1');
  else sessionStorage.removeItem(VAULT_LS);
}
