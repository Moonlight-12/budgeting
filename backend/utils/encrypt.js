const crypto = require("crypto");

// Derive a 32-byte key from ENCRYPTION_KEY env var (required; must be separate from JWT_SECRET)
function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY env var is required in production");
    }
    // Development fallback only — never share with JWT_SECRET in production
    console.warn("[encrypt] WARNING: ENCRYPTION_KEY not set, using JWT_SECRET as fallback. Set ENCRYPTION_KEY in production.");
    const fallback = process.env.JWT_SECRET;
    if (!fallback) throw new Error("No encryption key configured");
    return crypto.createHash("sha256").update("enc:" + fallback).digest();
  }
  return crypto.createHash("sha256").update(raw).digest();
}

function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(ciphertext) {
  if (!ciphertext) return ciphertext;
  // If it doesn't look like an encrypted value, return as-is (migration fallback)
  if (!ciphertext.includes(":")) return ciphertext;
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) return ciphertext;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    return decipher.update(Buffer.from(encryptedHex, "hex"), undefined, "utf8") + decipher.final("utf8");
  } catch {
    // Decryption failed — value was stored unencrypted (one-time migration)
    return ciphertext;
  }
}

module.exports = { encrypt, decrypt };
