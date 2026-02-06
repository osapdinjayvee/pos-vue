/**
 * Crypto Utility for PIN/Password Hashing
 * Uses bcryptjs for browser-compatible hashing
 */

import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * Hash a PIN or password using bcrypt
 * @param plaintext The plain text PIN or password to hash
 * @returns The bcrypt hash string
 */
export async function hashPin(plaintext: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS)
  return bcrypt.hash(plaintext, salt)
}

/**
 * Verify a PIN or password against a bcrypt hash
 * @param plaintext The plain text PIN or password to verify
 * @param hash The bcrypt hash to compare against
 * @returns True if the plaintext matches the hash
 */
export async function verifyPin(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash)
}

/**
 * Hash a PIN synchronously (useful for seeding)
 * @param plaintext The plain text PIN to hash
 * @returns The bcrypt hash string
 */
export function hashPinSync(plaintext: string): string {
  const salt = bcrypt.genSaltSync(SALT_ROUNDS)
  return bcrypt.hashSync(plaintext, salt)
}

/**
 * Verify a PIN synchronously
 * @param plaintext The plain text PIN to verify
 * @param hash The bcrypt hash to compare against
 * @returns True if the plaintext matches the hash
 */
export function verifyPinSync(plaintext: string, hash: string): boolean {
  return bcrypt.compareSync(plaintext, hash)
}

/**
 * Validate that a PIN meets requirements (4-6 numeric digits)
 * @param pin The PIN to validate
 * @returns True if the PIN is valid
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

/**
 * Validate that a password meets minimum requirements
 * @param password The password to validate
 * @returns True if the password is valid
 */
export function isValidPassword(password: string): boolean {
  // Minimum 8 characters, at least one letter and one number
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)
}

/**
 * Generate a random PIN (for testing/development)
 * @param length The length of the PIN (4-6)
 * @returns A random numeric PIN
 */
export function generateRandomPin(length: number = 4): string {
  if (length < 4 || length > 6) {
    throw new Error('PIN length must be between 4 and 6')
  }

  let pin = ''
  for (let i = 0; i < length; i++) {
    pin += Math.floor(Math.random() * 10).toString()
  }
  return pin
}
