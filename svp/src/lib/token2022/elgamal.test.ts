/**
 * Tests for ElGamal encryption functions
 */

import { describe, it, expect } from 'vitest';
import {
  generateElGamalKeypair,
  encryptAmount,
  decryptAmount,
  serializeElGamalPubKey,
  deserializeElGamalPubKey,
  serializeElGamalKeypair,
  deserializeElGamalKeypair,
  encryptSecretKey,
  decryptSecretKey,
} from './elgamal';

describe('ElGamal Key Generation', () => {
  it('generates a valid keypair', () => {
    const keypair = generateElGamalKeypair();
    
    expect(keypair.secretKey).toBeInstanceOf(Uint8Array);
    expect(keypair.secretKey.length).toBe(32);
    expect(keypair.publicKey.bytes).toBeInstanceOf(Uint8Array);
    expect(keypair.publicKey.bytes.length).toBe(32);
  });

  it('generates unique keypairs each time', () => {
    const keypair1 = generateElGamalKeypair();
    const keypair2 = generateElGamalKeypair();
    
    expect(keypair1.secretKey).not.toEqual(keypair2.secretKey);
    expect(keypair1.publicKey.bytes).not.toEqual(keypair2.publicKey.bytes);
  });
});

describe('ElGamal Serialization', () => {
  it('serializes and deserializes public key correctly', () => {
    const keypair = generateElGamalKeypair();
    const serialized = serializeElGamalPubKey(keypair.publicKey);
    const deserialized = deserializeElGamalPubKey(serialized);
    
    expect(serialized).toMatch(/^[A-Za-z0-9+/=]+$/); // Valid base64
    // Compare as arrays to handle Buffer vs Uint8Array
    expect(Array.from(deserialized.bytes)).toEqual(Array.from(keypair.publicKey.bytes));
  });

  it('serializes and deserializes keypair correctly', () => {
    const keypair = generateElGamalKeypair();
    const serialized = serializeElGamalKeypair(keypair);
    const deserialized = deserializeElGamalKeypair(serialized);
    
    expect(serialized.publicKey).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(serialized.secretKey).toMatch(/^[A-Za-z0-9+/=]+$/);
    // Compare as arrays to handle Buffer vs Uint8Array
    expect(Array.from(deserialized.publicKey.bytes)).toEqual(Array.from(keypair.publicKey.bytes));
    expect(Array.from(deserialized.secretKey)).toEqual(Array.from(keypair.secretKey));
  });
});

describe('ElGamal Encryption/Decryption', () => {
  it('encrypts and decrypts an amount correctly', () => {
    const senderKeypair = generateElGamalKeypair();
    const recipientKeypair = generateElGamalKeypair();
    const amount = BigInt(1000000000); // 1 SOL in lamports
    
    const ciphertext = encryptAmount(amount, recipientKeypair.publicKey, senderKeypair.secretKey);
    
    expect(ciphertext.commitment).toBeInstanceOf(Uint8Array);
    expect(ciphertext.handle).toBeInstanceOf(Uint8Array);
    expect(ciphertext.commitment.length).toBe(32);
    expect(ciphertext.handle.length).toBe(32);
  });

  it('produces different ciphertexts for same amount', () => {
    const senderKeypair = generateElGamalKeypair();
    const recipientKeypair = generateElGamalKeypair();
    const amount = BigInt(1000000);
    
    const ciphertext1 = encryptAmount(amount, recipientKeypair.publicKey, senderKeypair.secretKey);
    const ciphertext2 = encryptAmount(amount, recipientKeypair.publicKey, senderKeypair.secretKey);
    
    // Handles should be different due to random ephemeral keys
    expect(ciphertext1.handle).not.toEqual(ciphertext2.handle);
  });
});

describe('AES-GCM Secret Key Encryption', () => {
  it('encrypts and decrypts secret key correctly', async () => {
    const keypair = generateElGamalKeypair();
    const encryptionKey = new Uint8Array(32);
    crypto.getRandomValues(encryptionKey);
    
    const encrypted = await encryptSecretKey(keypair.secretKey, encryptionKey);
    const decrypted = await decryptSecretKey(encrypted, encryptionKey);
    
    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/); // Valid base64
    expect(encrypted.length).toBeGreaterThan(keypair.secretKey.length); // Includes nonce + tag
    expect(decrypted).toEqual(keypair.secretKey);
  });

  it('produces different ciphertexts for same key', async () => {
    const keypair = generateElGamalKeypair();
    const encryptionKey = new Uint8Array(32);
    crypto.getRandomValues(encryptionKey);
    
    const encrypted1 = await encryptSecretKey(keypair.secretKey, encryptionKey);
    const encrypted2 = await encryptSecretKey(keypair.secretKey, encryptionKey);
    
    // Should be different due to random nonce
    expect(encrypted1).not.toEqual(encrypted2);
    
    // Both should decrypt to same value
    const decrypted1 = await decryptSecretKey(encrypted1, encryptionKey);
    const decrypted2 = await decryptSecretKey(encrypted2, encryptionKey);
    expect(decrypted1).toEqual(decrypted2);
  });

  it('fails to decrypt with wrong key', async () => {
    const keypair = generateElGamalKeypair();
    const encryptionKey1 = new Uint8Array(32);
    const encryptionKey2 = new Uint8Array(32);
    crypto.getRandomValues(encryptionKey1);
    crypto.getRandomValues(encryptionKey2);
    
    const encrypted = await encryptSecretKey(keypair.secretKey, encryptionKey1);
    
    // Should throw when decrypting with wrong key (AES-GCM auth check)
    await expect(decryptSecretKey(encrypted, encryptionKey2)).rejects.toThrow();
  });

  it('handles empty encryption key gracefully', async () => {
    const keypair = generateElGamalKeypair();
    const emptyKey = new Uint8Array(0);
    
    // Should still work - SHA-256 will hash to 32 bytes
    const encrypted = await encryptSecretKey(keypair.secretKey, emptyKey);
    const decrypted = await decryptSecretKey(encrypted, emptyKey);
    
    expect(decrypted).toEqual(keypair.secretKey);
  });
});
