import bcrypt from "bcryptjs";

/**
 * Password hashing helpers. bcryptjs is pure JS (no native build step).
 * Hashes are stored in the database; plaintext passwords are never logged
 * or persisted.
 */

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
