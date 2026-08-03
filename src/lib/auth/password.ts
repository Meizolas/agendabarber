import { hash, verify, type Options } from '@node-rs/argon2'

const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} satisfies Options

export function hashPassword(password: string) {
  return hash(password, ARGON2_OPTIONS)
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password)
}
