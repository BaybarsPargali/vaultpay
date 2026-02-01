export interface VaultPaySignInMessageInput {
  wallet: string;
  nonce: string;
  issuedAt: string;
}

export function buildVaultPaySignInMessage(input: VaultPaySignInMessageInput): string {
  const { wallet, nonce, issuedAt } = input;
  return [
    'VaultPay Sign-In',
    '',
    'Sign this message to authenticate with VaultPay.',
    'This signature is free and does not submit a transaction.',
    '',
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}
