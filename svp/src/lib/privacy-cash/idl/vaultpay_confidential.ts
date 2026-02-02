// src/lib/privacy-cash/idl/vaultpay_confidential.ts
// Generated TypeScript types for VaultPay Confidential IDL
//
// NOTE: This is a stub IDL for development. The actual IDL is generated
// by `anchor build` in the vaultpay_confidential directory.

// Using 'any' for flexibility with different Anchor IDL versions
export type VaultpayConfidential = Record<string, unknown>;

export const IDL = {
  version: "0.1.0",
  name: "vaultpay_confidential",
  instructions: [
    {
      name: "initializeEscrow",
      discriminator: [1, 2, 3, 4, 5, 6, 7, 8],
      accounts: [
        { name: "escrow", isMut: true, isSigner: false },
        { name: "owner", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "confidentialTransfer",
      discriminator: [2, 3, 4, 5, 6, 7, 8, 9],
      accounts: [
        { name: "sender", isMut: true, isSigner: true },
        { name: "senderEscrow", isMut: true, isSigner: false },
        { name: "recipient", isMut: true, isSigner: false },
        { name: "recipientEscrow", isMut: true, isSigner: false },
        { name: "arciumMxe", isMut: false, isSigner: false },
        { name: "clock", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "amountLamports", type: "u64" },
        { name: "encryptedPayload", type: "bytes" },
      ],
    },
    {
      name: "deposit",
      discriminator: [3, 4, 5, 6, 7, 8, 9, 10],
      accounts: [
        { name: "owner", isMut: true, isSigner: true },
        { name: "escrow", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
    {
      name: "withdraw",
      discriminator: [4, 5, 6, 7, 8, 9, 10, 11],
      accounts: [
        { name: "owner", isMut: true, isSigner: true },
        { name: "escrow", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
  ],
  accounts: [
    {
      name: "Escrow",
      discriminator: [5, 6, 7, 8, 9, 10, 11, 12],
      type: {
        kind: "struct",
        fields: [
          { name: "owner", type: "publicKey" },
          { name: "balance", type: "u64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  errors: [],
  metadata: {
    address: "ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ",
  },
  address: "ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ",
};
