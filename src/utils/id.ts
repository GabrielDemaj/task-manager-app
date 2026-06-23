import * as Crypto from 'expo-crypto';

/** Generates an RFC-4122 v4 UUID via the Expo Crypto module. */
export function createId(): string {
  return Crypto.randomUUID();
}
