Quick Start
Get started with the Arcium TypeScript SDK for encrypted Solana computations

Introduction
Arcium is a decentralized confidential computing network that enables secure processing of encrypted data through Multi-Party Computation (MPC) on Solana. Unlike traditional computation that requires data to be decrypted, Arcium allows computations to run on fully encrypted data, maintaining privacy throughout the entire process.

The SDK provides client-side libraries for interacting with encrypted Solana programs and the Arcium network. The SDK works seamlessly with Anchor and Solana's existing tooling.

Whether you're building private DeFi applications, secure AI systems, or confidential gaming experiences, the Arcium TypeScript SDK gives you the tools to process sensitive data without compromising its confidentiality.

Installation
Install the Arcium client SDK for encryption, PDA helpers, and computation management:

npm
pnpm
yarn
bun

npm install @arcium-hq/client
Overview
This guide will walk you through the complete flow of using the Arcium TypeScript SDK to submit and process encrypted computations:

Setup: Configure your Anchor provider and Arcium cluster connection
Encrypt: Establish encryption keys and encrypt your computation inputs
Submit: Send encrypted computations to the Arcium network
Monitor: Track computation finalization on-chain
Decrypt: Retrieve and decrypt computation results
Prerequisites

Complete the Arcium Installation Guide to set up your development environment. This Quick Start guide assumes you have a Solana program with Arcium integration and are familiar with Arcium and Solana concepts.

Setup Anchor Provider
Configure your Anchor provider and get your MXE program ID. This establishes the connection to Solana and identifies your encrypted computation program.


import * as anchor from "@coral-xyz/anchor";
// Initialize Anchor provider from environment variables
anchor.setProvider(anchor.AnchorProvider.env());
const provider = anchor.getProvider();
// Your MXE program ID
const programId = new anchor.web3.PublicKey("YourProgramIdHere");
Configure Cluster Account
Get the Arcium cluster account address. The cluster account represents a group of ARX nodes that will execute your encrypted computations.


import { getClusterAccAddress, getArciumEnv } from "@arcium-hq/client";
// For localnet: null (reads ARCIUM_CLUSTER_PUBKEY from environment)
// For devnet/testnet: your cluster offset (see callout below)
const CLUSTER_OFFSET: number | null = null;
const clusterAccount =
  CLUSTER_OFFSET !== null
    ? getClusterAccAddress(CLUSTER_OFFSET)
    : getArciumEnv().arciumClusterPubkey;
Getting started:

For local testing (recommended): Leave CLUSTER_OFFSET = null

Set ARCIUM_CLUSTER_PUBKEY in your .env file
Requires running a local ARX node
For devnet/testnet: Set your cluster offset

Get your cluster offset from the deployment guide
Example: const CLUSTER_OFFSET = 1078779259; (v0.3.0 devnet)
Most developers start with local testing before moving to deployed networks.

Generate Keys and Derive Shared Secret
Perform x25519 key exchange with the MXE to derive a shared secret. This shared secret enables you to encrypt data that the MXE can then compute on.


import * as anchor from "@coral-xyz/anchor";
import { x25519, getMXEPublicKey, RescueCipher } from "@arcium-hq/client";
import { PublicKey } from "@solana/web3.js";
// Generate client keypair for encryption/decryption
// Note: In production, consider deriving this from your user keypair using signed message-based derivation
const clientPrivateKey = x25519.utils.randomSecretKey();
const clientPublicKey = x25519.getPublicKey(clientPrivateKey);
// Fetch MXE public key with retry logic
// → Expand "Helper Functions" accordion below for full implementation
const mxePublicKey = await getMXEPublicKeyWithRetry(
  provider as anchor.AnchorProvider,
  programId
);
// Derive shared secret and create cipher instance
const sharedSecret = x25519.getSharedSecret(clientPrivateKey, mxePublicKey);
const cipher = new RescueCipher(sharedSecret);
Important

Security: Keep clientPrivateKey in memory until decryption completes. Never log or persist private keys.

Local Testing: ARX nodes generate MXE keys on startup, so getMXEPublicKey may initially return null. The getMXEPublicKeyWithRetry helper function below handles this with configurable retry logic (default: 20 retries × 500ms).

Helper Functions
getMXEPublicKeyWithRetry() - Retry Logic for Local Testing
This helper implements retry logic for fetching the MXE public key, which is essential for local testing since ARX nodes generate keys on startup.


import * as anchor from "@coral-xyz/anchor";
import { getMXEPublicKey } from "@arcium-hq/client";
import { PublicKey } from "@solana/web3.js";
async function getMXEPublicKeyWithRetry(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  maxRetries: number = 20,
  retryDelayMs: number = 500
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mxePublicKey = await getMXEPublicKey(provider, programId);
      if (mxePublicKey) {
        return mxePublicKey;
      }
    } catch (error) {
      console.log(`Attempt ${attempt} failed to fetch MXE public key:`, error);
    }
    if (attempt < maxRetries) {
      console.log(
        `Retrying in ${retryDelayMs}ms... (attempt ${attempt}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  throw new Error(
    `Failed to fetch MXE public key after ${maxRetries} attempts`
  );
}
Parameters:

provider: Your Anchor provider instance
programId: Your MXE program ID
maxRetries: Maximum retry attempts (default: 20)
retryDelayMs: Delay between retries in milliseconds (default: 500ms)
Returns: The MXE x25519 public key as Uint8Array

Usage: Called once during initialization to establish encryption keys. For production deployments with stable nodes, retries may not be needed.

Encrypt Input Data
Encrypt your computation inputs using the cipher from Step 3. Your sensitive data will remain encrypted throughout the entire computation process.


import { randomBytes } from "crypto";
import * as anchor from "@coral-xyz/anchor";
import { deserializeLE } from "@arcium-hq/client";
// Prepare your computation inputs
const inputs = [BigInt(42), BigInt(100)];
// Generate a 16-byte nonce (required)
const nonce = randomBytes(16); // Must be exactly 16 bytes
// Encrypt inputs - returns number[][] where each element is a 32-byte ciphertext
const ciphertext = cipher.encrypt(inputs, nonce);
// Generate computation offset and convert nonce to BN for transaction
const computationOffset = new anchor.BN(randomBytes(8), "hex");
const nonceBN = new anchor.BN(deserializeLE(nonce).toString());
Input values must be < 2^252 (Curve25519 scalar field limit)
encrypt() returns number[][] where each element is a 32-byte ciphertext
computationOffset is a unique 8-byte identifier to track each computation on-chain (must be unique per computation) - generate a random value as shown above
Set Up Event Listener
Load your Anchor program and set up the event listener before submitting the transaction. This ensures you can receive the encrypted computation results when they're ready.


import * as anchor from "@coral-xyz/anchor";
// Load your Anchor program
const program = new anchor.Program(
  YourProgramIdl, // Your program's IDL
  programId,
  provider
);
// Type-safe event listener helper
// → Expand "Helper Functions" accordion below for full implementation
type Event = anchor.IdlEvents<typeof program.idl>;
// Set up event listener BEFORE submitting transaction
const resultEventPromise = awaitEvent("yourResultEvent");
The awaitEvent helper creates a Promise that resolves when your event is emitted. Set up the listener before transaction submission to avoid race conditions. The helper automatically cleans up the listener and provides full type safety from your program's IDL.

Helper Functions
awaitEvent() - Type-Safe Event Listener
Submit Computation Transaction
Submit the encrypted computation for execution. The Arcium network will process your encrypted data without ever decrypting it.


import * as anchor from "@coral-xyz/anchor";
import {
  getComputationAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
} from "@arcium-hq/client";
// From previous steps:
// - provider, programId (Step 1)
// - clusterAccount (Step 2)
// - clusterOffset (Step 2)
// - clientPublicKey (Step 3)
// - computationOffset, ciphertext, nonceBN (Step 4)
// - program, resultEventPromise (Step 5)
// Get computation definition offset for your encrypted instruction
// The instruction name must match the function name in your Rust MXE program
// (e.g., if your function is `add_together`, use "add_together")
const compDefOffset = getCompDefAccOffset("your_instruction_name");
const compDefIndex = Buffer.from(compDefOffset).readUInt32LE();
// Submit the computation transaction
const signature = await program.methods
  .yourComputationMethod(
    computationOffset,
    Array.from(ciphertext[0]),
    Array.from(ciphertext[1]),
    Array.from(clientPublicKey),
    nonceBN
  )
  .accountsPartial({
    computationAccount: getComputationAccAddress(clusterOffset, computationOffset),
    clusterAccount,
    mxeAccount: getMXEAccAddress(programId),
    mempoolAccount: getMempoolAccAddress(clusterOffset),
    executingPool: getExecutingPoolAccAddress(clusterOffset),
    compDefAccount: getCompDefAccAddress(programId, compDefIndex),
    // ... your program-specific accounts
  })
  .rpc({ skipPreflight: true, commitment: "confirmed" });
console.log("Computation submitted:", signature);
Replace yourComputationMethod with your program's instruction name (must match your MXE function name) - Add your program-specific accounts to accountsPartial alongside required Arcium accounts - clientPublicKey is required for ECDH key exchange: we fetch the MXE public key using getMXEPublicKey, and send clientPublicKey to the MXE so it can derive the same shared secret. See encryption documentation for more details
Await Computation Finalization
Wait for the computation to finalize on-chain. This confirms that the MPC nodes have completed processing your encrypted computation.


import * as anchor from "@coral-xyz/anchor";
import { awaitComputationFinalization } from "@arcium-hq/client";
// Wait for computation finalization
const finalizationSignature = await awaitComputationFinalization(
  provider as anchor.AnchorProvider,
  computationOffset,
  programId,
  "confirmed"
);
console.log("Computation finalized:", finalizationSignature);
Decrypt Results
After finalization completes, retrieve the event and decrypt the result. Use the same cipher instance from Step 3 to decrypt the encrypted computation output.


import * as anchor from "@coral-xyz/anchor";
// Await the event (listener was set up in Step 5)
const resultEvent = await resultEventPromise;
// Decrypt the result using the cipher and event nonce
const [decryptedResult] = cipher.decrypt(
  [resultEvent.encryptedResult],
  new Uint8Array(resultEvent.nonce)
);
console.log("Decrypted result:", decryptedResult);
Event structure: The resultEvent structure shown here (encryptedResult, nonce) is a generic example. Your actual event structure depends on your program's implementation and IDL definition.

Nonce handling: The MXE includes the nonce used for encryption in the result event. Always use the nonce from the event for decryption.

If your event doesn't include a nonce field, use the supplied nonce + 1 for decryption (the MXE increments the nonce when encrypting results).

Complete Example
For a complete working example showing all steps together, see the Hello World guide which includes a full test file demonstrating the entire flow from encryption to decryption.

You can also explore the example programs repository:

arcium-hq/examples

26

What's Next
Explore the API
Client API Reference: Detailed docs for encryption, PDA helpers, and encrypted instruction management.
Dive Deeper
Arcium Developer Docs: Framework internals, encrypted instruction design, deployment, and lifecycle.

************************************

Arcium TypeScript SDK - API Reference
This documentation provides comprehensive API reference for the Arcium TypeScript SDK packages. These SDKs enable developers to interact with encrypted Solana programs and the Arcium network.

Looking for more information about the Arcium network?
To learn more about Arcium:

Arcium Documentation - Learn about network architecture, encrypted computation concepts, and platform overview
Developer Documentation - Technical guides, tutorials, and best practices
API Reference Overview
This API reference covers the following TypeScript SDK packages:

Available SDK Packages
📦 Client SDK (@arcium-hq/client)
The Client SDK provides functionality for interacting with encrypted Solana programs on the Arcium network.

Browse API Documentation → Complete API reference for the Client SDK
NPM Package
npm
pnpm
yarn
bun

npm install @arcium-hq/client
Key Features:
Handle encryption/decryption operations
Fetch Arcium network PDAs
Track computation status and results
📖 Reader SDK (@arcium-hq/reader)
The Reader SDK enables fetching and monitoring on-chain data from Arcium network programs.

Browse API Documentation → Complete API reference for the Reader SDK
NPM Package
npm
pnpm
yarn
bun

npm install @arcium-hq/reader
Key Features:
Query computation states and results
Fetch network account addresses (nodes, clusters, MXEs)
Subscribe to real-time computation updates
Monitor cluster and MXE status
Getting Started
For implementation guides and tutorials on using these SDKs:

Visit the Arcium Developer Documentation
Check out code examples
Join the community for support and discussions

*********************

@arcium-hq/client
Classes
Class	Description
Aes128Cipher	AES-128 cipher in Counter (CTR) mode, using SHA3-256 to derive the key from a shared secret. See: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf (Section 6.5) for details on CTR mode.
Aes192Cipher	AES-192 cipher in Counter (CTR) mode, using SHA3-256 to derive the key from a shared secret. See: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf (Section 6.5) for details on CTR mode.
Aes256Cipher	AES-256 cipher in Counter (CTR) mode, using SHA3-256 to derive the key from a shared secret. See: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf (Section 6.5) for details on CTR mode.
ArcisModule	-
ArcisType	-
Matrix	Matrix class over FpField. Data is row-major.
RescueCipher	The Rescue cipher in Counter (CTR) mode, with a fixed block size m = 5. See: https://tosc.iacr.org/index.php/ToSC/article/view/8695/8287
RescueDesc	Description and parameters for the Rescue cipher or hash function, including round constants, MDS matrix, and key schedule. See: https://tosc.iacr.org/index.php/ToSC/article/view/8695/8287
RescuePrimeHash	The Rescue-Prime hash function, as described in https://eprint.iacr.org/2020/1143.pdf, offering 256 bits of security against collision, preimage and second-preimage attacks for any field of size at least 102 bits. We use the sponge construction with fixed rate = 7 and capacity = 5 (i.e., m = 12), and truncate the output to 5 field elements.
Interfaces
Interface	Description
MempoolPriorityFeeStats	Statistics about priority fees for computations in a mempool.
Type Aliases
Type Alias	Description
ArciumIdlType	Program IDL in camelCase format in order to be used in JS/TS.
ArciumLocalEnv	Structure representing the local Arcium environment variables required for local development or testing.
ComputationErrorType	Represents possible error messages that can occur during computation processing or transaction handling.
ComputationReference	Reference to a computation in a mempool or executing pool. Contains the computation offset and priority fee information.
ExecutingPoolAccount	Represents an executing pool account of any size (tiny, small, medium, or large). Executing pools manage parallel computation execution with account locking. Each size supports different maximum parallel computations: - Tiny: 1 parallel computation - Small: 3 parallel computations - Medium: 10 parallel computations - Large: 100 parallel computations
FpField	Field type for Curve25519 base field.
MempoolAccount	Represents a mempool account of any size (tiny, small, medium, or large). Mempools store pending computations prioritized by fee, with a time-to-live of 180 slots. Each size supports different maximum heap capacities: - Tiny: 1 computation - Small: 3 computations - Medium: 10 computations - Large: 100 computations
Variables
Variable	Description
arcisEd25519	Ed25519 curve instance using SHA3-512 for hashing, suitable for MPC (ArcisEd25519 signature scheme). This is essentially Ed25519 but with SHA3-512 instead of SHA-512 for lower multiplicative depth. See: https://datatracker.ietf.org/doc/html/rfc8032#section-5.1
ARCIUM_ADDR	The deployed address of the Arcium program, as specified in the IDL.
ARCIUM_IDL	The Anchor-generated IDL JSON object for the Arcium program.
CURVE25519_BASE_FIELD	Curve25519 base field as an IField instance.
CURVE25519_SCALAR_FIELD_MODULUS	Scalar field prime modulus for Curve25519: 2^252 + 27742317777372353535851937790883648493
x25519	ECDH using curve25519 aka x25519.
Functions
Function	Description
awaitComputationFinalization	Waits for the finalization of a computation by listening for the finalizeComputationEvent. Resolves with the transaction signature once the computation is finalized.
buildFinalizeCompDefTx	Builds a transaction to finalize a computation definition.
deserializeLE	Deserializes a little-endian Uint8Array to a bigint.
finalizeKeyRecoveryExecution	Finalizes key recovery execution after the submission threshold is met. This queues the key_recovery_final MPC computation on the backup cluster.
generateRandomFieldElem	Generates a random value within the field bound by q.
getArciumAccountBaseSeed	Returns the base seed for an Arcium account, given its name.
getArciumEnv	Reads local Arcium environment information from environment variables. Only available in Node.js and when testing locally.
getArciumProgram	Returns an Anchor program instance for the Arcium program.
getArciumProgramId	Returns the public key of the deployed Arcium program on Solana.
getArxNodeAccAddress	Derives the ArxNode account address for a given offset.
getClockAccAddress	Derives the clock account address.
getClusterAccAddress	Derives the cluster account address for a given offset.
getCompDefAccAddress	Derives the computation definition account address for a given MXE program ID and offset.
getCompDefAccOffset	Computes the offset for a computation definition account, based on the circuit name.
getComputationAccAddress	Derives the computation account address for a given cluster and computation offset.
getComputationsInMempool	Returns all computation references in the mempool for a given account. Only non-stake computations are included.
getExecutingPoolAccAddress	Derives the executing pool account address for a given cluster.
getExecutingPoolAccInfo	Fetches and decodes the executing pool account info for any pool size.
getFeePoolAccAddress	Derives the fee pool account address.
getMempoolAccAddress	Derives the mempool account address for a given cluster.
getMempoolAccInfo	Fetches and decodes the mempool account info for any mempool account size.
getMempoolPriorityFeeStats	Calculates priority fee statistics for computations in a mempool.
getMXEAccAddress	Derives the MXE account address for a given MXE program ID.
getMXEArcisEd25519VerifyingKey	Fetches and extracts the MXE arcis ed25519 verifying key from the MXE account.
getMXEPublicKey	Fetches and extracts the MXE x25519 public key from the MXE account.
getMxeRecoveryAccAddress	Derives the MXE recovery account address for a key recovery session.
getRecoveryPeersAccAddress	Derives the recovery peers account address for a given MXE program ID.
initKeyRecoveryExecution	Initializes key recovery execution by creating the MxeRecoveryAccount and registering the key_recovery_final computation definition on the backup MXE. This is split into two parts due to Solana's 10KB per-instruction allocation limit.
initMxePart1	Initializes an MXE (part 1). Due to Solana's 10KB per-instruction allocation limit, this only partially allocates recovery_peers_acc. Call initMxePart2 afterwards to finish allocation and add keygen to mempool.
initMxePart2	Finishes MXE initialization (part 2). Reallocates recovery_peers_acc to full size, initializes recovery_peers, and adds the keygen computation to the mempool.
isNullRef	Checks if a computation reference is null (all zeros).
positiveModulo	Computes the positive modulo of a over m.
queueKeyRecoveryInit	-
randMatrix	-
recoverMxe	Sets an MXE to Recovery status, initiating the key recovery process.
serializeLE	Serializes a bigint to a little-endian Uint8Array of the specified length.
sha256	Computes the SHA-256 hash of an array of Uint8Arrays.
submitKeyRecoveryShare	Submits a re-encrypted key recovery share from a recovery peer. Recovery peers must decrypt shares using their X25519 private key and re-encrypt them for the backup MXE before submission.
toVec	-
uploadCircuit	Uploads a circuit to the blockchain, splitting it into multiple accounts if necessary.


***********************************

@arcium-hq/client
/
Classes
Aes128Cipher
AES-128 cipher in Counter (CTR) mode, using SHA3-256 to derive the key from a shared secret. See: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf (Section 6.5) for details on CTR mode.

Extends
AesCtrCipher
Constructors
Constructor
new Aes128Cipher(sharedSecret): Aes128Cipher

Constructs an AES-128 cipher instance using a shared secret. The key is derived using SHA3-256.

Parameters
Parameter	Type	Description
sharedSecret	Uint8Array	The shared secret to derive the AES key from.
Returns
Aes128Cipher

Overrides
AesCtrCipher.constructor

Properties
Property	Modifier	Type	Inherited from
key	protected	Uint8Array	AesCtrCipher.key
Methods
decrypt()
decrypt(ciphertext, nonce): Uint8Array

Decrypts the ciphertext array in Counter (CTR) mode.

Parameters
Parameter	Type	Description
ciphertext	Uint8Array	The data to decrypt.
nonce	Uint8Array	An 8-byte nonce for CTR mode.
Returns
Uint8Array

The decrypted plaintext as a Uint8Array.

Throws
Error if the nonce is not 8 bytes long.

Inherited from
AesCtrCipher.decrypt

encrypt()
encrypt(plaintext, nonce): Uint8Array

Encrypts the plaintext array in Counter (CTR) mode.

Parameters
Parameter	Type	Description
plaintext	Uint8Array	The data to encrypt.
nonce	Uint8Array	An 8-byte nonce for CTR mode.
Returns
Uint8Array

The encrypted ciphertext as a Uint8Array.

Throws
Error if the nonce is not 8 bytes long.

Inherited from
AesCtrCipher.encrypt

********************************************

@arcium-hq/client
/
Classes
Aes192Cipher
AES-192 cipher in Counter (CTR) mode, using SHA3-256 to derive the key from a shared secret. See: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf (Section 6.5) for details on CTR mode.

Extends
AesCtrCipher
Constructors
Constructor
new Aes192Cipher(sharedSecret): Aes192Cipher

Constructs an AES-192 cipher instance using a shared secret. The key is derived using SHA3-256.

Parameters
Parameter	Type	Description
sharedSecret	Uint8Array	The shared secret to derive the AES key from.
Returns
Aes192Cipher

Overrides
AesCtrCipher.constructor

Properties
Property	Modifier	Type	Inherited from
key	protected	Uint8Array	AesCtrCipher.key
Methods
decrypt()
decrypt(ciphertext, nonce): Uint8Array

Decrypts the ciphertext array in Counter (CTR) mode.

Parameters
Parameter	Type	Description
ciphertext	Uint8Array	The data to decrypt.
nonce	Uint8Array	An 8-byte nonce for CTR mode.
Returns
Uint8Array

The decrypted plaintext as a Uint8Array.

Throws
Error if the nonce is not 8 bytes long.

Inherited from
AesCtrCipher.decrypt

encrypt()
encrypt(plaintext, nonce): Uint8Array

Encrypts the plaintext array in Counter (CTR) mode.

Parameters
Parameter	Type	Description
plaintext	Uint8Array	The data to encrypt.
nonce	Uint8Array	An 8-byte nonce for CTR mode.
Returns
Uint8Array

The encrypted ciphertext as a Uint8Array.

Throws
Error if the nonce is not 8 bytes long.

Inherited from
AesCtrCipher.encrypt

************************************************

@arcium-hq/client
/
Classes
Aes256Cipher
AES-256 cipher in Counter (CTR) mode, using SHA3-256 to derive the key from a shared secret. See: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf (Section 6.5) for details on CTR mode.

Extends
AesCtrCipher
Constructors
Constructor
new Aes256Cipher(sharedSecret): Aes256Cipher

Constructs an AES-256 cipher instance using a shared secret. The key is derived using SHA3-256.

Parameters
Parameter	Type	Description
sharedSecret	Uint8Array	The shared secret to derive the AES key from.
Returns
Aes256Cipher

Overrides
AesCtrCipher.constructor

Properties
Property	Modifier	Type	Inherited from
key	protected	Uint8Array	AesCtrCipher.key
Methods
decrypt()
decrypt(ciphertext, nonce): Uint8Array

Decrypts the ciphertext array in Counter (CTR) mode.

Parameters
Parameter	Type	Description
ciphertext	Uint8Array	The data to decrypt.
nonce	Uint8Array	An 8-byte nonce for CTR mode.
Returns
Uint8Array

The decrypted plaintext as a Uint8Array.

Throws
Error if the nonce is not 8 bytes long.

Inherited from
AesCtrCipher.decrypt

encrypt()
encrypt(plaintext, nonce): Uint8Array

Encrypts the plaintext array in Counter (CTR) mode.

Parameters
Parameter	Type	Description
plaintext	Uint8Array	The data to encrypt.
nonce	Uint8Array	An 8-byte nonce for CTR mode.
Returns
Uint8Array

The encrypted ciphertext as a Uint8Array.

Throws
Error if the nonce is not 8 bytes long.

Inherited from
AesCtrCipher.encrypt

*****************************************

@arcium-hq/client
/
Classes
ArcisModule
Constructors
Constructor
new ArcisModule(types): ArcisModule

Parameters
Parameter	Type
types	{[typeName: string]: ArcisType; }
Returns
ArcisModule

Properties
Property	Type
types	object
Methods
fromJson()
static fromJson(json): ArcisModule

Parameters
Parameter	Type
json	unknown
Returns
ArcisModule

loadFromFile()
static loadFromFile(path): ArcisModule

Parameters
Parameter	Type
path	string
Returns
ArcisModule

********************************************

@arcium-hq/client
/
Classes
ArcisType
Constructors
Constructor
new ArcisType(name, fields): ArcisType

Parameters
Parameter	Type
name	string
fields	ArcisValueField[]
Returns
ArcisType

Properties
Property	Type
fields	ArcisValueField[]
name	string
Methods
pack()
pack(rawData): bigint[]

Parameters
Parameter	Type
rawData	unknown[]
Returns
bigint[]

unpack()
unpack(packed): (number | bigint | boolean | Uint8Array<ArrayBufferLike>)[]

Parameters
Parameter	Type
packed	bigint[]
Returns
(number | bigint | boolean | Uint8Array<ArrayBufferLike>)[]

fromJson()
static fromJson(name, json): ArcisType

Parameters
Parameter	Type
name	string
json	unknown
Returns
ArcisType

**************************************

@arcium-hq/client
/
Classes
Matrix
Matrix class over FpField. Data is row-major.

Constructors
Constructor
new Matrix(field, data): Matrix

Parameters
Parameter	Type
field	FpField
data	readonly bigint[][]
Returns
Matrix

Properties
Property	Type
data	readonly bigint[][]
field	FpField
Methods
add()
add(rhs, ct): Matrix

Element-wise addition between this and rhs.

Parameters
Parameter	Type	Default value
rhs	Matrix	undefined
ct	boolean	false
Returns
Matrix

det()
det(): bigint

computs the determinant using gaus elimination matches the determinant implementation in arcis

Returns
bigint

is_square()
is_square(): boolean

Returns
boolean

matMul()
matMul(rhs): Matrix

Matrix multiplication between this and rhs.

Parameters
Parameter	Type
rhs	Matrix
Returns
Matrix

pow()
pow(e): Matrix

Raises each element of this to the power e.

Parameters
Parameter	Type
e	bigint
Returns
Matrix

sub()
sub(rhs, ct): Matrix

Element-wise subtraction between this and rhs.

Parameters
Parameter	Type	Default value
rhs	Matrix	undefined
ct	boolean	false
Returns
Matrix

*********************************************************

@arcium-hq/client
/
Classes
RescueCipher
The Rescue cipher in Counter (CTR) mode, with a fixed block size m = 5. See: https://tosc.iacr.org/index.php/ToSC/article/view/8695/8287

Constructors
Constructor
new RescueCipher(sharedSecret): RescueCipher

Constructs a RescueCipher instance using a shared secret. The key is derived using RescuePrimeHash and used to initialize the RescueDesc.

Parameters
Parameter	Type	Description
sharedSecret	Uint8Array	The shared secret to derive the cipher key from.
Returns
RescueCipher

Properties
Property	Type
desc	RescueDesc
Methods
decrypt()
decrypt(ciphertext, nonce): bigint[]

Deserializes and decrypts the ciphertext vector in Counter (CTR) mode.

Parameters
Parameter	Type	Description
ciphertext	number[][]	The array of arrays of numbers (each 32 bytes) to decrypt.
nonce	Uint8Array	A 16-byte nonce for CTR mode.
Returns
bigint[]

The decrypted plaintext as an array of bigints.

decrypt_raw()
decrypt_raw(ciphertext, nonce): bigint[]

Decrypts the ciphertext vector in Counter (CTR) mode (raw, expects bigints).

Parameters
Parameter	Type	Description
ciphertext	bigint[]	The array of ciphertext bigints to decrypt.
nonce	Uint8Array	A 16-byte nonce for CTR mode.
Returns
bigint[]

The decrypted plaintext as an array of bigints.

Throws
Error if the nonce is not 16 bytes long.

encrypt()
encrypt(plaintext, nonce): number[][]

Encrypts the plaintext vector in Counter (CTR) mode and serializes each block.

Parameters
Parameter	Type	Description
plaintext	bigint[]	The array of plaintext bigints to encrypt.
nonce	Uint8Array	A 16-byte nonce for CTR mode.
Returns
number[][]

The ciphertext as an array of arrays of numbers (each 32 bytes).

encrypt_raw()
encrypt_raw(plaintext, nonce): bigint[]

Encrypts the plaintext vector in Counter (CTR) mode (raw, returns bigints).

Parameters
Parameter	Type	Description
plaintext	bigint[]	The array of plaintext bigints to encrypt.
nonce	Uint8Array	A 16-byte nonce for CTR mode.
Returns
bigint[]

The ciphertext as an array of bigints.

Throws
Error if the nonce is not 16 bytes long.

**********************************************************************

@arcium-hq/client
/
Classes
RescueDesc
Description and parameters for the Rescue cipher or hash function, including round constants, MDS matrix, and key schedule. See: https://tosc.iacr.org/index.php/ToSC/article/view/8695/8287

Constructors
Constructor
new RescueDesc(field, mode): RescueDesc

Constructs a RescueDesc for a given field and mode (cipher or hash). Initializes round constants, MDS matrix, and key schedule.

Parameters
Parameter	Type	Description
field	FpField	The field to use (e.g., CURVE25519_BASE_FIELD).
mode	RescueMode	The mode: block cipher or hash function.
Returns
RescueDesc

Properties
Property	Type
alpha	bigint
alphaInverse	bigint
field	FpField
m	number
mdsMat	Matrix
mdsMatInverse	Matrix
mode	RescueMode
nRounds	number
roundKeys	Matrix[]
Methods
permute()
permute(state): Matrix

Applies the Rescue permutation to a state matrix.

Parameters
Parameter	Type	Description
state	Matrix	The input state matrix.
Returns
Matrix

The permuted state matrix.

permuteInverse()
permuteInverse(state): Matrix

Applies the inverse Rescue permutation to a state matrix.

Parameters
Parameter	Type	Description
state	Matrix	The input state matrix.
Returns
Matrix

The inverse-permuted state matrix.

sampleConstants()
sampleConstants(nRounds): Matrix[]

Samples round constants for the Rescue permutation, using SHAKE256.

Parameters
Parameter	Type	Description
nRounds	number	The number of rounds.
Returns
Matrix[]

An array of round constant matrices.

******************************************************

@arcium-hq/client
/
Classes
RescuePrimeHash
The Rescue-Prime hash function, as described in https://eprint.iacr.org/2020/1143.pdf, offering 256 bits of security against collision, preimage and second-preimage attacks for any field of size at least 102 bits. We use the sponge construction with fixed rate = 7 and capacity = 5 (i.e., m = 12), and truncate the output to 5 field elements.

Constructors
Constructor
new RescuePrimeHash(): RescuePrimeHash

Constructs a RescuePrimeHash instance with rate = 7 and capacity = 5.

Returns
RescuePrimeHash

Properties
Property	Type
desc	RescueDesc
digestLength	number
rate	number
Methods
digest()
digest(message): bigint[]

Computes the Rescue-Prime hash of a message, with padding as described in Algorithm 2 of the paper.

Parameters
Parameter	Type	Description
message	bigint[]	The input message as an array of bigints.
Returns
bigint[]

The hash output as an array of bigints (length = digestLength).

*****************************************************************

@arcium-hq/client
/
Functions
awaitComputationFinalization
awaitComputationFinalization(provider, computationOffset, mxeProgramId, commitment): Promise<string>

Waits for the finalization of a computation by listening for the finalizeComputationEvent. Resolves with the transaction signature once the computation is finalized.

Parameters
Parameter	Type	Default value	Description
provider	AnchorProvider	undefined	The Anchor provider to use for event listening.
computationOffset	BN	undefined	The offset of the computation to wait for.
mxeProgramId	PublicKey	undefined	The public key of the MXE program.
commitment	Finality	'confirmed'	(Optional) The desired finality/commitment level (default: 'confirmed').
Returns
Promise<string>

The transaction signature of the finalization event.

*****************************************************************

@arcium-hq/client
/
Functions
buildFinalizeCompDefTx
buildFinalizeCompDefTx(provider, compDefOffset, mxeProgramId): Promise<Transaction>

Builds a transaction to finalize a computation definition.

Parameters
Parameter	Type	Description
provider	AnchorProvider	The Anchor provider to use for transactions.
compDefOffset	number	The offset of the computation definition.
mxeProgramId	PublicKey	The public key of the MXE program.
Returns
Promise<Transaction>

The transaction to finalize the computation definition.

*****************************************************************


@arcium-hq/client
/
Functions
deserializeLE
deserializeLE(bytes): bigint

Deserializes a little-endian Uint8Array to a bigint.

Parameters
Parameter	Type	Description
bytes	Uint8Array	The Uint8Array to deserialize.
Returns
bigint

The deserialized bigint value.

******************************************************************

@arcium-hq/client
/
Functions
finalizeKeyRecoveryExecution
finalizeKeyRecoveryExecution(provider, originalMxeProgramId, backupMxeProgramId, clusterOffset, keyRecoveryFinalOffset): Promise<string>

Finalizes key recovery execution after the submission threshold is met. This queues the key_recovery_final MPC computation on the backup cluster.

Parameters
Parameter	Type	Description
provider	AnchorProvider	The Anchor provider to use for transactions.
originalMxeProgramId	PublicKey	The public key of the original MXE program being recovered.
backupMxeProgramId	PublicKey	The public key of the backup MXE program.
clusterOffset	number	The cluster offset where the backup MXE is deployed.
keyRecoveryFinalOffset	BN	The computation offset for the key_recovery_final computation.
Returns
Promise<string>

The transaction signature.

******************************************************************

@arcium-hq/client
/
Functions
generateRandomFieldElem
generateRandomFieldElem(q): bigint

Generates a random value within the field bound by q.

Parameters
Parameter	Type	Description
q	bigint	The upper bound (exclusive) for the random value.
Returns
bigint

A random bigint value between 0 and q-1.

******************************************************************


@arcium-hq/client
/
Functions
getArciumAccountBaseSeed
getArciumAccountBaseSeed(accName): Uint8Array

Returns the base seed for an Arcium account, given its name.

Parameters
Parameter	Type	Description
accName	string	The name of the account.
Returns
Uint8Array

The base seed as a Uint8Array.

*******************************************************************

@arcium-hq/client
/
Functions
getArciumEnv
getArciumEnv(): ArciumLocalEnv

Reads local Arcium environment information from environment variables. Only available in Node.js and when testing locally.

Returns
ArciumLocalEnv

The local Arcium environment configuration.

Throws
Error if called in a browser or if required environment variables are missing or invalid.

********************************************************************

@arcium-hq/client
/
Functions
getArciumProgram
getArciumProgram(provider): Program<ArciumIdlType>

Returns an Anchor program instance for the Arcium program.

Parameters
Parameter	Type	Description
provider	AnchorProvider	The Anchor provider to use.
Returns
Program<ArciumIdlType>

The Anchor program instance for Arcium.


******************************************************************

@arcium-hq/client
/
Functions
getArciumProgramId
getArciumProgramId(): PublicKey

Returns the public key of the deployed Arcium program on Solana.

Returns
PublicKey

The Arcium program's public key.

*******************************************************************

@arcium-hq/client
/
Functions
getArxNodeAccAddress
getArxNodeAccAddress(nodeOffset): PublicKey

Derives the ArxNode account address for a given offset.

Parameters
Parameter	Type	Description
nodeOffset	number	The ArxNode offset as a number.
Returns
PublicKey

The derived ArxNode account public key.

*******************************************************************

@arcium-hq/client
/
Functions
getClockAccAddress
getClockAccAddress(): PublicKey

Derives the clock account address.

Returns
PublicKey

The derived clock account public key.


********************************************************************

@arcium-hq/client
/
Functions
getClusterAccAddress
getClusterAccAddress(clusterOffset): PublicKey

Derives the cluster account address for a given offset.

Parameters
Parameter	Type	Description
clusterOffset	number	The cluster offset as a number.
Returns
PublicKey

The derived cluster account public key.

********************************************************************

@arcium-hq/client
/
Functions
getCompDefAccAddress
getCompDefAccAddress(mxeProgramId, compDefOffset): PublicKey

Derives the computation definition account address for a given MXE program ID and offset.

Parameters
Parameter	Type	Description
mxeProgramId	PublicKey	The public key of the MXE program.
compDefOffset	number	The computation definition offset as a number.
Returns
PublicKey

The derived computation definition account public key.

*********************************************************************

@arcium-hq/client
/
Functions
getCompDefAccOffset
getCompDefAccOffset(circuitName): Uint8Array

Computes the offset for a computation definition account, based on the circuit name.

Parameters
Parameter	Type	Description
circuitName	string	The name of the circuit.
Returns
Uint8Array

The offset as a 4-byte Uint8Array.

**********************************************************************

@arcium-hq/client
/
Functions
getComputationAccAddress
getComputationAccAddress(clusterOffset, computationOffset): PublicKey

Derives the computation account address for a given cluster and computation offset.

Parameters
Parameter	Type	Description
clusterOffset	number	The offset of the cluster this computation will be executed by.
computationOffset	BN	The computation offset as an anchor.BN.
Returns
PublicKey

The derived computation account public key.

**********************************************************************
@arcium-hq/client
/
Functions
getComputationsInMempool
getComputationsInMempool(arciumProgram, address): Promise<ComputationReference[][]>

Returns all computation references in the mempool for a given account. Only non-stake computations are included.

Parameters
Parameter	Type	Description
arciumProgram	Program<ArciumIdlType>	The Anchor program instance.
address	PublicKey	The public key of the mempool account.
Returns
Promise<ComputationReference[][]>

Array of ComputationReference objects.

**********************************************************************

@arcium-hq/client
/
Functions
getExecutingPoolAccAddress
getExecutingPoolAccAddress(clusterOffset): PublicKey

Derives the executing pool account address for a given cluster.

Parameters
Parameter	Type	Description
clusterOffset	number	The offset of the cluster.
Returns
PublicKey

The derived executing pool account public key.

**********************************************************************

@arcium-hq/client
/
Functions
getExecutingPoolAccInfo
getExecutingPoolAccInfo(provider, executingPoolAccPubkey): Promise<ExecutingPoolAccount>

Fetches and decodes the executing pool account info for any pool size.

Parameters
Parameter	Type	Description
provider	AnchorProvider	The Anchor provider to use for fetching accounts.
executingPoolAccPubkey	PublicKey	The public key of the executing pool account.
Returns
Promise<ExecutingPoolAccount>

The decoded executing pool account info.

Throws
Error if the account cannot be fetched or the discriminator is unknown.

**********************************************************************

@arcium-hq/client
/
Functions
getFeePoolAccAddress
getFeePoolAccAddress(): PublicKey

Derives the fee pool account address.

Returns
PublicKey

The derived fee pool account public key.

**********************************************************************

@arcium-hq/client
/
Functions
getMempoolAccAddress
getMempoolAccAddress(clusterOffset): PublicKey

Derives the mempool account address for a given cluster.

Parameters
Parameter	Type	Description
clusterOffset	number	The offset of the cluster.
Returns
PublicKey

The derived mempool account public key.

**********************************************************************

@arcium-hq/client
/
Functions
getMempoolAccInfo
getMempoolAccInfo(provider, mempoolAccPubkey): Promise<MempoolAccount>

Fetches and decodes the mempool account info for any mempool account size.

Parameters
Parameter	Type	Description
provider	AnchorProvider	The Anchor provider to use for fetching accounts.
mempoolAccPubkey	PublicKey	The public key of the mempool account.
Returns
Promise<MempoolAccount>

The decoded mempool account info.

Throws
Error if the account cannot be fetched or the discriminator is unknown.

**********************************************************************

@arcium-hq/client
/
Functions
getMempoolPriorityFeeStats
getMempoolPriorityFeeStats(arciumProgram, mempoolAddress): Promise<MempoolPriorityFeeStats>

Calculates priority fee statistics for computations in a mempool.

Parameters
Parameter	Type	Description
arciumProgram	Program<ArciumIdlType>	The Anchor program instance.
mempoolAddress	PublicKey	The public key of the mempool account.
Returns
Promise<MempoolPriorityFeeStats>

Priority fee statistics (mean, median, min, max, count).

**********************************************************************

@arcium-hq/client
/
Functions
getMXEAccAddress
getMXEAccAddress(mxeProgramId): PublicKey

Derives the MXE account address for a given MXE program ID.

Parameters
Parameter	Type	Description
mxeProgramId	PublicKey	The public key of the MXE program.
Returns
PublicKey

The derived MXE account public key.

**********************************************************************

@arcium-hq/client
/
Functions
getMXEArcisEd25519VerifyingKey
getMXEArcisEd25519VerifyingKey(provider, mxeProgramId): Promise<Uint8Array<ArrayBufferLike> | null>

Fetches and extracts the MXE arcis ed25519 verifying key from the MXE account.

Parameters
Parameter	Type	Description
provider	AnchorProvider	The Anchor provider to use for fetching accounts.
mxeProgramId	PublicKey	The public key of the MXE program.
Returns
Promise<Uint8Array<ArrayBufferLike> | null>

The MXE's arcis ed25519 verifying key as a Uint8Array, or null if not set.

**********************************************************************

@arcium-hq/client
/
Functions
getMXEPublicKey
getMXEPublicKey(provider, mxeProgramId): Promise<Uint8Array<ArrayBufferLike> | null>

Fetches and extracts the MXE x25519 public key from the MXE account.

Parameters
Parameter	Type	Description
provider	AnchorProvider	The Anchor provider to use for fetching accounts.
mxeProgramId	PublicKey	The public key of the MXE program.
Returns
Promise<Uint8Array<ArrayBufferLike> | null>

The MXE's x25519 public key as a Uint8Array, or null if not set.

**********************************************************************

@arcium-hq/client
/
Functions
getMxeRecoveryAccAddress
getMxeRecoveryAccAddress(backupMxeProgramId, originalMxeProgramId): PublicKey

Derives the MXE recovery account address for a key recovery session.

Parameters
Parameter	Type	Description
backupMxeProgramId	PublicKey	The public key of the backup MXE program that will take over.
originalMxeProgramId	PublicKey	The public key of the original MXE program being recovered.
Returns
PublicKey

The derived MXE recovery account public key.

**********************************************************************

@arcium-hq/client
/
Functions
getRecoveryPeersAccAddress
getRecoveryPeersAccAddress(mxeProgramId): PublicKey

Derives the recovery peers account address for a given MXE program ID.

Parameters
Parameter	Type	Description
mxeProgramId	PublicKey	The public key of the MXE program.
Returns
PublicKey

The derived recovery peers account public key.


**********************************************************************

@arcium-hq/client
/
Functions
initKeyRecoveryExecution
initKeyRecoveryExecution(provider, originalMxeProgramId, backupMxeProgramId): Promise<string>

Initializes key recovery execution by creating the MxeRecoveryAccount and registering the key_recovery_final computation definition on the backup MXE. This is split into two parts due to Solana's 10KB per-instruction allocation limit.

Parameters
Parameter	Type	Description
provider	AnchorProvider	The Anchor provider to use for transactions.
originalMxeProgramId	PublicKey	The public key of the original MXE program being recovered.
backupMxeProgramId	PublicKey	The public key of the backup MXE program that will take over.
Returns
Promise<string>

The transaction signature from part2.


**********************************************************************
@arcium-hq/client
/
Functions
initMxePart1
initMxePart1(provider, mxeProgramId): Promise<string>

Initializes an MXE (part 1). Due to Solana's 10KB per-instruction allocation limit, this only partially allocates recovery_peers_acc. Call initMxePart2 afterwards to finish allocation and add keygen to mempool.

Parameters
Parameter	Type	Description
provider	AnchorProvider	The Anchor provider to use for transactions.
mxeProgramId	PublicKey	The public key to use as the MXE program ID.
Returns
Promise<string>

The transaction signature.

**********************************************************************
@arcium-hq/client
/
Functions
initMxePart2
initMxePart2(provider, clusterOffset, mxeProgramId, recoveryPeers, keygenOffset, keyRecoveryInitOffset, mxeAuthority?): Promise<string>

Finishes MXE initialization (part 2). Reallocates recovery_peers_acc to full size, initializes recovery_peers, and adds the keygen computation to the mempool.

Parameters
Parameter	Type	Description
provider	AnchorProvider	The Anchor provider to use for transactions.
clusterOffset	number	The cluster offset to associate with the MXE.
mxeProgramId	PublicKey	The public key to use as the MXE program ID.
recoveryPeers	number[]	Array of 100 node offsets for recovery peers (0 for unused slots).
keygenOffset	BN	The computation offset for the keygen computation.
keyRecoveryInitOffset	BN	The computation offset for the key_recovery_init computation.
mxeAuthority?	PublicKey	Optional authority for the MXE (defaults to provider.publicKey).
Returns
Promise<string>

The transaction signature.


**********************************************************************
@arcium-hq/client
/
Functions
isNullRef
isNullRef(ref): boolean

Checks if a computation reference is null (all zeros).

Parameters
Parameter	Type	Description
ref	{ accs: object[]; computationOffset: BN; priorityFee: BN; }	The computation reference to check
ref.accs	object[]	-
ref.computationOffset	BN	-
ref.priorityFee	BN	-
Returns
boolean

true if the reference is null, false otherwise

**********************************************************************

@arcium-hq/client
/
Functions
positiveModulo
positiveModulo(a, m): bigint

Computes the positive modulo of a over m.

Parameters
Parameter	Type	Description
a	bigint	The dividend.
m	bigint	The modulus.
Returns
bigint

The positive remainder of a mod m.


**********************************************************************

@arcium-hq/client
/
Functions
queueKeyRecoveryInit
queueKeyRecoveryInit(provider, clusterOffset, mxeProgramId, confirmOptions?): Promise<string[]>

Parameters
Parameter	Type
provider	AnchorProvider
clusterOffset	number
mxeProgramId	PublicKey
confirmOptions?	ConfirmOptions
Returns
Promise<string[]>

**********************************************************************

@arcium-hq/client
/
Functions
randMatrix
randMatrix(field, nrows, ncols): Matrix

Parameters
Parameter	Type
field	FpField
nrows	number
ncols	number
Returns
Matrix

**********************************************************************
@arcium-hq/client
/
Functions
recoverMxe
recoverMxe(provider, mxeProgramId): Promise<string>

Sets an MXE to Recovery status, initiating the key recovery process.

Parameters
Parameter	Type	Description
provider	AnchorProvider	The Anchor provider to use for transactions.
mxeProgramId	PublicKey	The public key of the MXE program to recover.
Returns
Promise<string>

The transaction signature.

**********************************************************************

@arcium-hq/client
/
Functions
serializeLE
serializeLE(val, lengthInBytes): Uint8Array

Serializes a bigint to a little-endian Uint8Array of the specified length.

Parameters
Parameter	Type	Description
val	bigint	The bigint value to serialize.
lengthInBytes	number	The desired length of the output array.
Returns
Uint8Array

The serialized value as a Uint8Array.

Throws
Error if the value is too large for the specified length.

**********************************************************************

@arcium-hq/client
/
Functions
sha256
sha256(byteArrays): Buffer

Computes the SHA-256 hash of an array of Uint8Arrays.

Parameters
Parameter	Type	Description
byteArrays	Uint8Array<ArrayBufferLike>[]	The arrays to hash.
Returns
Buffer

The SHA-256 hash as a Buffer.

**********************************************************************
@arcium-hq/client
/
Functions
submitKeyRecoveryShare
submitKeyRecoveryShare(provider, originalMxeProgramId, backupMxeProgramId, nodeOffset, peerIndex, share): Promise<string>

Submits a re-encrypted key recovery share from a recovery peer. Recovery peers must decrypt shares using their X25519 private key and re-encrypt them for the backup MXE before submission.

Parameters
Parameter	Type	Description
provider	AnchorProvider	The Anchor provider to use for transactions.
originalMxeProgramId	PublicKey	The public key of the original MXE program being recovered.
backupMxeProgramId	PublicKey	The public key of the backup MXE program.
nodeOffset	number	The ARX node offset of the recovery peer.
peerIndex	number	The index of this peer in the recovery peers list.
share	Uint8Array<ArrayBufferLike>[] | number[][]	The re-encrypted share: 5 field elements of 32 bytes each (160 bytes total).
Returns
Promise<string>

The transaction signature.

**********************************************************************

@arcium-hq/client
/
Functions
toVec
toVec(data): bigint[][]

Parameters
Parameter	Type
data	bigint[]
Returns
bigint[][]

**********************************************************************

@arcium-hq/client
/
Functions
uploadCircuit
uploadCircuit(provider, circuitName, mxeProgramId, rawCircuit, logging, chunkSize): Promise<string[]>

Uploads a circuit to the blockchain, splitting it into multiple accounts if necessary.

Parameters
Parameter	Type	Default value	Description
provider	AnchorProvider	undefined	The Anchor provider to use for transactions.
circuitName	string	undefined	The name of the circuit.
mxeProgramId	PublicKey	undefined	The public key of the MXE program.
rawCircuit	Uint8Array	undefined	The raw circuit data as a Uint8Array.
logging	boolean	true	Whether to log progress (default: true).
chunkSize	number	500	The number of upload transactions to send in parallel (default: 500).
Returns
Promise<string[]>

An array of transaction signatures for all upload and finalize transactions.

**********************************************************************

@arcium-hq/client
/
Interfaces
MempoolPriorityFeeStats
Statistics about priority fees for computations in a mempool.

Properties
Property	Type	Description
count	number	The total number of computations in the mempool.
max	BN	The highest priority fee in the mempool.
mean	BN	The average priority fee across all computations.
median	BN	The middle value of priority fees when sorted.
min	BN	The lowest priority fee in the mempool.

**********************************************************************

@arcium-hq/client
/
Type aliases
ArciumIdlType
ArciumIdlType = object

Program IDL in camelCase format in order to be used in JS/TS.

Note that this is only a type helper and is not the actual IDL. The original IDL can be found at target/idl/arcium.json.

Properties
accounts
accounts: [{ discriminator: [2, 207, 122, 223, 93, 97, 231, 199]; name: "arxNode"; }, { discriminator: [152, 171, 158, 195, 75, 61, 51, 8]; name: "clockAccount"; }, { discriminator: [236, 225, 118, 228, 173, 106, 18, 60]; name: "cluster"; }, { discriminator: [136, 34, 167, 71, 41, 174, 103, 77]; name: "computationAccount"; }, { discriminator: [245, 176, 217, 221, 253, 104, 172, 200]; name: "computationDefinitionAccount"; }, { discriminator: [226, 70, 57, 224, 38, 233, 59, 136]; name: "computationDefinitionRaw"; }, { discriminator: [132, 11, 106, 171, 253, 138, 56, 78]; name: "failureClaimAccountHeader"; }, { discriminator: [172, 38, 77, 146, 148, 5, 51, 242]; name: "feePool"; }, { discriminator: [147, 145, 148, 170, 30, 13, 43, 216]; name: "largeExecPool"; }, { discriminator: [16, 168, 90, 235, 249, 207, 73, 223]; name: "largeMempool"; }, { discriminator: [103, 26, 85, 250, 179, 159, 17, 117]; name: "mxeAccount"; }, { discriminator: [97, 117, 128, 202, 213, 76, 5, 163]; name: "mediumExecPool"; }, { discriminator: [10, 249, 58, 39, 255, 231, 199, 168]; name: "mediumMempool"; }, { discriminator: [35, 240, 187, 131, 211, 114, 166, 11]; name: "mxeRecoveryAccount"; }, { discriminator: [219, 31, 188, 145, 69, 139, 204, 117]; name: "operator"; }, { discriminator: [139, 236, 177, 95, 22, 74, 232, 5]; name: "recoveryPeersAccount"; }, { discriminator: [37, 147, 249, 253, 217, 136, 3, 87]; name: "smallExecPool"; }, { discriminator: [123, 153, 151, 118, 126, 71, 73, 92]; name: "smallMempool"; }, { discriminator: [80, 245, 5, 90, 154, 189, 190, 172]; name: "tinyExecPool"; }, { discriminator: [176, 33, 67, 108, 73, 135, 110, 166]; name: "tinyMempool"; }]

address
address: "BpaW2ZmCJnDwizWY8eM34JtVqp2kRgnmQcedSVc9USdP"

errors
errors: [{ code: 6000; msg: "The given authority is invalid"; name: "invalidAuthority"; }, { code: 6001; msg: "The MXE keys are already set, i.e. all the nodes of the MXE cluster already agreed on the MXE keys"; name: "mxeKeysAlreadySet"; }, { code: 6002; msg: "The MXE keys are not set, i.e. not all the nodes of the MXE cluster agreed on the MXE keys"; name: "mxeKeysNotSet"; }, { code: 6003; msg: "An invalid MXE account has been supplied"; name: "invalidMxe"; }, { code: 6004; msg: "The cluster is already set"; name: "clusterAlreadySet"; }, { code: 6005; msg: "The cluster is not set"; name: "clusterNotSet"; }, { code: 6006; msg: "An invalid cluster account has been supplied"; name: "invalidCluster"; }, { code: 6007; msg: "An invalid computation definition account has been supplied"; name: "invalidComputationDefinition"; }, { code: 6008; msg: "Couldn't find a mempool ID for the computation"; name: "cantFindMempoolId"; }, { code: 6100; msg: "Mempool discriminator is invalid"; name: "invalidMempoolDiscriminator"; }, { code: 6101; msg: "Mempool size is invalid"; name: "invalidMempoolSize"; }, { code: 6102; msg: "Execpool discriminator is invalid"; name: "invalidExecpoolDiscriminator"; }, { code: 6103; msg: "Max parallelism reached"; name: "maxParallelismReached"; }, { code: 6200; msg: "Computation offset is invalid"; name: "invalidComputationOffset"; }, { code: 6201; msg: "Callback accounts are invalid"; name: "invalidCallbackAccs"; }, { code: 6202; msg: "Callback accounts length is invalid"; name: "invalidCallbackAccsLen"; }, { code: 6203; msg: "The computation is already initialized"; name: "alreadyInitializedComputation"; }, { code: 6204; msg: "Callback computation already called"; name: "alreadyCallbackedComputation"; }, { code: 6205; msg: "Callback tx is invalid"; name: "invalidCallbackTx"; }, { code: 6206; msg: "Computation status is invalid"; name: "invalidComputationStatus"; }, { code: 6207; msg: "Computation is invalid"; name: "invalidComputation"; }, { code: 6208; msg: "Computation authority is invalid"; name: "invalidComputationAuthority"; }, { code: 6209; msg: "Callback instructions are invalid"; name: "invalidCallbackInstructions"; }, { code: 6210; msg: "Computation has not expired from mempool yet"; name: "computationNotExpired"; }, { code: 6300; msg: "Computation definition is not completed"; name: "computationDefinitionNotCompleted"; }, { code: 6301; msg: "Arguments supplied are invalid"; name: "invalidArguments"; }, { code: 6302; msg: "Circuit source is invalid"; name: "invalidCircuitSource"; }, { code: 6303; msg: "Computation definition already completed"; name: "computationDefinitionAlreadyCompleted"; }, { code: 6304; msg: "CU amount exceeds maximum limit"; name: "invalidCuAmount"; }, { code: 6305; msg: "Offset is invalid"; name: "invalidOffset"; }, { code: 6400; msg: "Node is invalid"; name: "invalidNode"; }, { code: 6401; msg: "Maximum number of nodes in the cluster has been reached"; name: "maxClusterMembershipReached"; }, { code: 6402; msg: "The node already exists in the cluster"; name: "nodeAlreadyExists"; }, { code: 6403; msg: "Node authority is invalid"; name: "invalidNodeAuthority"; }, { code: 6404; msg: "Node is not inactive"; name: "nodeNotInactive"; }, { code: 6405; msg: "Node is not active"; name: "nodeNotActive"; }, { code: 6406; msg: "Cluster membership is invalid"; name: "invalidClusterMembership"; }, { code: 6407; msg: "Node is in an active cluster"; name: "nodeInActiveCluster"; }, { code: 6408; msg: "Node config is invalid"; name: "invalidNodeConfig"; }, { code: 6409; msg: "Unauthorized to create node on mainnet"; name: "unauthorizedNodeCreation"; }, { code: 6410; msg: "Node offset is invalid"; name: "invalidNodeOffset"; }, { code: 6500; msg: "Cluster is full"; name: "clusterFull"; }, { code: 6501; msg: "Cluster deactivation epoch is invalid"; name: "invalidDeactivationEpoch"; }, { code: 6502; msg: "Cluster maximum size is invalid"; name: "invalidMaxSize"; }, { code: 6503; msg: "Cluster authority is invalid"; name: "invalidClusterAuthority"; }, { code: 6504; msg: "Cluster fee proposal is invalid"; name: "invalidFeeProposal"; }, { code: 6505; msg: "Cluster state is invalid"; name: "invalidClusterState"; }, { code: 6506; msg: "Cluster vote is invalid"; name: "invalidVote"; }, { code: 6507; msg: "Cluster is not ready"; name: "clusterNotReady"; }, { code: 6600; msg: "Borsh serialization failed"; name: "serializationFailed"; }, { code: 6601; msg: "Borsh deserialization failed"; name: "deserializationFailed"; }, { code: 6602; msg: "Heap is full"; name: "heapFull"; }, { code: 6603; msg: "Current slot is before the last updated slot"; name: "invalidSlot"; }, { code: 6604; msg: "Epoch is infinity"; name: "epochIsInfinity"; }, { code: 6605; msg: "Timestamp is invalid"; name: "invalidTimestamp"; }, { code: 6606; msg: "Epoch is invalid"; name: "invalidEpoch"; }, { code: 6607; msg: "Epoch overflowed"; name: "epochOverflow"; }, { code: 6608; msg: "Lighthouse program ID is invalid"; name: "invalidLighthouseProgramId"; }, { code: 6609; msg: "Extra instruction found in transaction"; name: "extraInstructionFound"; }, { code: 6610; msg: "Invalid number of Lighthouse program instructions"; name: "invalidLighthouseInstructionCount"; }, { code: 6611; msg: "Invalid BLS signature"; name: "invalidSignature"; }, { code: 6612; msg: "Value already set"; name: "valueAlreadySet"; }, { code: 6613; msg: "Invalid value setter index"; name: "invalidValueSetterIndex"; }, { code: 6614; msg: "Not all nodes have voted for the BLS public key"; name: "notAllNodesVotedForBlsPublicKey"; }, { code: 6615; msg: "Keyshares index out of bounds"; name: "keysharesIndexOutOfBounds"; }, { code: 6616; msg: "Recovery key material not set"; name: "recoveryKeyMaterialNotSet"; }, { code: 6617; msg: "Recovery already finalized"; name: "recoveryInitAlreadyFinalized"; }, { code: 6618; msg: "Invalid number of recovery peers"; name: "invalidRecoveryPeersCount"; }, { code: 6619; msg: "BLS public key is zero"; name: "blsPublicKeyZero"; }, { code: 6620; msg: "MXE is not in recovery state"; name: "mxeNotInRecoveryState"; }, { code: 6621; msg: "MXE is already in recovery state"; name: "mxeAlreadyInRecovery"; }, { code: 6622; msg: "Backup MXE keygen is not complete"; name: "backupKeygenNotComplete"; }, { code: 6623; msg: "Authority mismatch between original and backup MXE"; name: "recoveryAuthorityMismatch"; }, { code: 6624; msg: "Recovery peers account not initialized"; name: "recoveryPeersNotInitialized"; }, { code: 6625; msg: "Invalid peer offset for recovery share submission"; name: "invalidRecoveryPeerOffset"; }, { code: 6626; msg: "Signer is not a valid recovery peer"; name: "notRecoveryPeer"; }, { code: 6627; msg: "Recovery execution already finalized"; name: "recoveryExecutionAlreadyFinalized"; }, { code: 6628; msg: "Recovery threshold not met"; name: "recoveryThresholdNotMet"; }, { code: 6629; msg: "Recovery execution not finalized"; name: "recoveryExecutionNotFinalized"; }, { code: 6630; msg: "Previous computation did not fail, cannot requeue"; name: "recoveryComputationNotFailed"; }, { code: 6631; msg: "Cannot close recovery with active computation"; name: "recoveryActiveComputationExists"; }, { code: 6632; msg: "Callback requires successful execution status"; name: "recoveryExecutionNotSuccess"; }, { code: 6633; msg: "Backup MXE cluster is not set"; name: "backupClusterNotSet"; }]

events
events: [{ discriminator: [155, 213, 238, 159, 240, 76, 167, 19]; name: "callbackComputationEvent"; }, { discriminator: [143, 97, 229, 166, 72, 218, 87, 145]; name: "claimFailureEvent"; }, { discriminator: [27, 75, 117, 221, 191, 213, 253, 249]; name: "finalizeComputationEvent"; }, { discriminator: [132, 26, 138, 201, 214, 29, 244, 167]; name: "finalizeFailureDataEvent"; }, { discriminator: [17, 51, 124, 226, 70, 97, 58, 186]; name: "initComputationEvent"; }, { discriminator: [118, 53, 33, 169, 32, 14, 197, 147]; name: "queueComputationEvent"; }]

instructions
instructions: [{ accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "arxNodeAcc"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; writable: true; }]; args: [{ name: "nodeOffset"; type: "u32"; }]; discriminator: [15, 203, 48, 186, 243, 85, 60, 115]; name: "activateArx"; }, { accounts: [{ name: "authority"; signer: true; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "id"; }]; }; writable: true; }, { name: "clock"; pda: { seeds: [{ kind: "const"; value: [67, 108, 111, 99, 107, 65, 99, 99, 111, 117, 110, 116]; }]; }; writable: true; }]; args: [{ name: "clusterId"; type: "u32"; }]; discriminator: [228, 170, 10, 172, 246, 96, 63, 154]; name: "activateCluster"; }, { accounts: [{ name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "clock"; pda: { seeds: [{ kind: "const"; value: [67, 108, 111, 99, 107, 65, 99, 99, 111, 117, 110, 116]; }]; }; writable: true; }]; args: [{ name: "clusterOffset"; type: "u32"; }]; discriminator: [172, 203, 90, 207, 128, 221, 229, 246]; name: "bumpEpochCluster"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "node"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; }, { name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }]; }; writable: true; }, { name: "comp"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }, { kind: "arg"; path: "compOffset"; }]; }; writable: true; }, { name: "mempool"; pda: { seeds: [{ kind: "const"; value: [77, 101, 109, 112, 111, 111, 108]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }]; }; writable: true; }, { name: "executingPool"; pda: { seeds: [{ kind: "const"; value: [69, 120, 101, 99, 112, 111, 111, 108]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }]; }; writable: true; }, { name: "compDefAcc"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }, { kind: "arg"; path: "compDefOffset"; }]; }; }, { address: "Sysvar1nstructions1111111111111111111111111"; name: "instructionsSysvar"; }]; args: [{ name: "compOffset"; type: "u64"; }, { name: "nodeOffset"; type: "u32"; }, { name: "compDefOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }, { name: "executionStatus"; type: { defined: { name: "executionStatus"; }; }; }, { name: "callbackTransactionIndex"; type: "u8"; }]; discriminator: [11, 224, 42, 236, 0, 154, 74, 163]; name: "callbackComputation"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "comp"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "clusterOffset"; }, { kind: "arg"; path: "compOffset"; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "compOffset"; type: "u64"; }, { name: "clusterOffset"; type: "u32"; }]; discriminator: [215, 218, 1, 166, 81, 218, 16, 151]; name: "claimComputationRent"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "failureAcc"; pda: { seeds: [{ kind: "const"; value: [70, 97, 105, 108, 117, 114, 101, 67, 108, 97, 105, 109, 65, 99, 99, 111, 117, 110, 116, 72, 101, 97, 100, 101, 114]; }, { kind: "arg"; path: "mxeProgram"; }, { kind: "arg"; path: "compOffset"; }]; }; writable: true; }]; args: [{ name: "compOffset"; type: "u64"; }, { name: "nodeOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }, { name: "chunk"; type: "bytes"; }, { name: "failureClaimOffset"; type: "u32"; }]; discriminator: [92, 52, 184, 203, 76, 221, 128, 69]; name: "claimFailureAppend"; }, { accounts: [{ name: "signer"; signer: true; }, { name: "failureAcc"; pda: { seeds: [{ kind: "const"; value: [70, 97, 105, 108, 117, 114, 101, 67, 108, 97, 105, 109, 65, 99, 99, 111, 117, 110, 116, 72, 101, 97, 100, 101, 114]; }, { kind: "arg"; path: "mxeProgram"; }, { kind: "arg"; path: "compOffset"; }]; }; writable: true; }, { name: "executingPool"; pda: { seeds: [{ kind: "const"; value: [69, 120, 101, 99, 112, 111, 111, 108]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }]; }; writable: true; }, { name: "mempool"; pda: { seeds: [{ kind: "const"; value: [77, 101, 109, 112, 111, 111, 108]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }]; }; writable: true; }, { name: "comp"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }, { kind: "arg"; path: "compOffset"; }]; }; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }]; }; writable: true; }, { name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; }]; args: [{ name: "compOffset"; type: "u64"; }, { name: "nodeOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }]; discriminator: [192, 133, 215, 19, 76, 107, 111, 217]; name: "claimFailureFinalize"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "nodeAcc"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; }, { name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; }, { name: "compAcc"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }, { kind: "arg"; path: "compOffset"; }]; }; }, { name: "compDefAcc"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }, { account: "computationAccount"; kind: "account"; path: "comp_acc.computation_definition_offset"; }]; }; }, { name: "failureAcc"; pda: { seeds: [{ kind: "const"; value: [70, 97, 105, 108, 117, 114, 101, 67, 108, 97, 105, 109, 65, 99, 99, 111, 117, 110, 116, 72, 101, 97, 100, 101, 114]; }, { kind: "arg"; path: "mxeProgram"; }, { kind: "arg"; path: "compOffset"; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "compOffset"; type: "u64"; }, { name: "nodeOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }]; discriminator: [204, 106, 245, 73, 212, 136, 61, 99]; name: "claimFailureInit"; }, { accounts: [{ name: "authority"; signer: true; writable: true; }, { name: "originalMxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "originalMxeProgram"; }]; }; }, { name: "backupMxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "backupMxeProgram"; }]; }; writable: true; }, { name: "mxeRecoveryAccount"; pda: { seeds: [{ kind: "const"; value: [109, 120, 101, 95, 114, 101, 99, 111, 118, 101, 114, 121]; }, { kind: "account"; path: "backupMxeProgram"; }, { kind: "account"; path: "originalMxeProgram"; }]; }; writable: true; }, { name: "keyRecoveryFinalizeCompDef"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "account"; path: "backupMxeProgram"; }, { kind: "const"; value: [3, 0, 0, 0]; }]; }; writable: true; }, { name: "originalMxeProgram"; }, { name: "backupMxeProgram"; }]; args: [{ name: "originalMxeProgram"; type: "pubkey"; }, { name: "backupMxeProgram"; type: "pubkey"; }]; discriminator: [249, 127, 56, 116, 125, 136, 84, 184]; docs: ["Closes all recovery-related accounts."]; name: "closeKeyRecovery"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "arxNodeAcc"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; writable: true; }, { name: "clock"; pda: { seeds: [{ kind: "const"; value: [67, 108, 111, 99, 107, 65, 99, 99, 111, 117, 110, 116]; }]; }; writable: true; }, { name: "clusterAcc"; optional: true; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "account"; path: "arxNodeAcc"; }]; }; }]; args: [{ name: "nodeOffset"; type: "u32"; }]; discriminator: [117, 244, 137, 148, 25, 190, 175, 164]; name: "deactivateArx"; }, { accounts: [{ name: "authority"; signer: true; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "id"; }]; }; writable: true; }, { name: "clock"; pda: { seeds: [{ kind: "const"; value: [67, 108, 111, 99, 107, 65, 99, 99, 111, 117, 110, 116]; }]; }; writable: true; }]; args: [{ name: "clusterId"; type: "u32"; }, { name: "deactivationEpoch"; type: { defined: { name: "epoch"; }; }; }]; discriminator: [13, 42, 182, 159, 184, 10, 212, 178]; name: "deactivateCluster"; }, { accounts: [{ name: "tinyMempool"; }, { name: "tinyExecpool"; }, { name: "smallMempool"; }, { name: "smallExecpool"; }, { name: "mediumMempool"; }, { name: "mediumExecpool"; }, { name: "largeMempool"; }, { name: "largeExecpool"; }]; args: []; discriminator: [57, 4, 200, 151, 58, 19, 120, 9]; docs: ["Only present so the mempool and execpool accounts are actually included in the idl, since we", "don't explicitly declare them in the accounts section of the other instructions."]; name: "dummyInstruction"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "compDefAcc"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }, { kind: "arg"; path: "compOffset"; }]; }; }, { name: "compDefRaw"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 82, 97, 119]; }, { kind: "account"; path: "compDefAcc"; }, { kind: "arg"; path: "rawCircuitIndex"; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "compOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }, { name: "rawCircuitIndex"; type: "u8"; }]; discriminator: [92, 195, 192, 21, 193, 242, 135, 194]; name: "embiggenRawCircuitAcc"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "node"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; }, { name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; }, { name: "recoveryPeersAcc"; pda: { seeds: [{ kind: "const"; value: [82, 101, 99, 111, 118, 101, 114, 121, 80, 101, 101, 114, 115, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }]; }; }]; args: [{ name: "nodeOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }, { name: "keysharesOffset"; type: "u32"; }, { name: "keyshares"; type: { vec: { array: [{ array: ["u8", 32]; }, 5]; }; }; }]; discriminator: [236, 31, 169, 50, 185, 38, 47, 187]; name: "extendRecoveryKeyshares"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "compDefAcc"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }, { kind: "arg"; path: "compOffset"; }]; }; writable: true; }]; args: [{ name: "compOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }]; discriminator: [174, 66, 159, 51, 199, 243, 219, 38]; name: "finalizeComputationDefinition"; }, { accounts: [{ name: "signer"; signer: true; }, { name: "originalMxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "originalMxeProgram"; }]; }; writable: true; }, { name: "backupMxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "backupMxeProgram"; }]; }; writable: true; }, { name: "mxeRecoveryAccount"; pda: { seeds: [{ kind: "const"; value: [109, 120, 101, 95, 114, 101, 99, 111, 118, 101, 114, 121]; }, { kind: "account"; path: "backupMxeProgram"; }, { kind: "account"; path: "originalMxeProgram"; }]; }; }, { name: "computation"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "clusterOffset"; }, { kind: "arg"; path: "compOffset"; }]; }; writable: true; }, { name: "compDef"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "account"; path: "backupMxeProgram"; }, { kind: "const"; value: [3, 0, 0, 0]; }]; }; }, { name: "node"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; }, { name: "executingPool"; pda: { seeds: [{ kind: "const"; value: [69, 120, 101, 99, 112, 111, 111, 108]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "mempool"; pda: { seeds: [{ kind: "const"; value: [77, 101, 109, 112, 111, 111, 108]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "originalMxeProgram"; }, { name: "backupMxeProgram"; }]; args: [{ name: "originalMxeProgram"; type: "pubkey"; }, { name: "backupMxeProgram"; type: "pubkey"; }, { name: "clusterOffset"; type: "u32"; }, { name: "compOffset"; type: "u64"; }, { name: "nodeOffset"; type: "u32"; }, { name: "executionStatus"; type: { defined: { name: "executionStatus"; }; }; }, { name: "callbackTransactionIndex"; type: "u8"; }]; discriminator: [143, 63, 33, 26, 66, 235, 94, 31]; docs: ["Callback for key_recovery_finalize computation."]; name: "finalizeKeyRecoveryCallback"; }, { accounts: [{ name: "authority"; signer: true; writable: true; }, { name: "payer"; signer: true; writable: true; }, { name: "originalMxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "originalMxeProgram"; }]; }; }, { name: "backupMxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "backupMxeProgram"; }]; }; }, { name: "recoveryPeersAcc"; pda: { seeds: [{ kind: "const"; value: [82, 101, 99, 111, 118, 101, 114, 121, 80, 101, 101, 114, 115, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "originalMxeProgram"; }]; }; }, { name: "mxeRecoveryAccount"; pda: { seeds: [{ kind: "const"; value: [109, 120, 101, 95, 114, 101, 99, 111, 118, 101, 114, 121]; }, { kind: "account"; path: "backupMxeProgram"; }, { kind: "account"; path: "originalMxeProgram"; }]; }; writable: true; }, { name: "keyRecoveryFinalizeCompDef"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "account"; path: "backupMxeProgram"; }, { kind: "const"; value: [3, 0, 0, 0]; }]; }; }, { name: "keyRecoveryFinalizeComputation"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "clusterOffset"; }, { kind: "account"; path: "mxeRecoveryAccount"; }]; }; writable: true; }, { name: "executingPool"; pda: { seeds: [{ kind: "const"; value: [69, 120, 101, 99, 112, 111, 111, 108]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "mempool"; pda: { seeds: [{ kind: "const"; value: [77, 101, 109, 112, 111, 111, 108]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "poolAccount"; pda: { seeds: [{ kind: "const"; value: [70, 101, 101, 80, 111, 111, 108]; }]; }; writable: true; }, { name: "originalMxeProgram"; }, { name: "backupMxeProgram"; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "originalMxeProgram"; type: "pubkey"; }, { name: "backupMxeProgram"; type: "pubkey"; }, { name: "clusterOffset"; type: "u32"; }]; discriminator: [211, 40, 223, 121, 15, 169, 2, 59]; docs: ["Finalizes the key recovery execution after threshold is met and queues the computation."]; name: "finalizeKeyRecoveryExecution"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "node"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; }, { name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; }, { name: "recoveryPeersAcc"; pda: { seeds: [{ kind: "const"; value: [82, 101, 99, 111, 118, 101, 114, 121, 80, 101, 101, 114, 115, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }]; }; }, { name: "comp"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }, { kind: "arg"; path: "computationOffset"; }]; }; }]; args: [{ name: "nodeOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }, { name: "computationOffset"; type: "u64"; }]; discriminator: [205, 57, 149, 12, 12, 176, 188, 74]; name: "finalizeKeyRecoverySharesUpload"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; writable: true; }, { name: "cluster"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "mxeProgram"; type: "pubkey"; }]; discriminator: [108, 137, 125, 95, 202, 237, 190, 158]; name: "finalizeMxeKeys"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "mempool"; pda: { seeds: [{ kind: "const"; value: [77, 101, 109, 112, 111, 111, 108]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "clusterOffset"; type: "u32"; }]; discriminator: [19, 165, 166, 25, 174, 122, 166, 250]; name: "increaseMempoolSize"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "clock"; pda: { seeds: [{ kind: "const"; value: [67, 108, 111, 99, 107, 65, 99, 99, 111, 117, 110, 116]; }]; }; writable: true; }, { name: "feePool"; pda: { seeds: [{ kind: "const"; value: [70, 101, 101, 80, 111, 111, 108]; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "startEpochTimestamp"; type: { defined: { name: "timestamp"; }; }; }]; discriminator: [220, 59, 207, 236, 108, 250, 47, 100]; name: "init"; }, { accounts: [{ name: "operatorSigner"; signer: true; writable: true; }, { name: "operatorAcc"; pda: { seeds: [{ kind: "const"; value: [79, 112, 101, 114, 97, 116, 111, 114]; }, { kind: "account"; path: "operatorSigner"; }]; }; writable: true; }, { name: "arxNodeAcc"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "nodeOffset"; type: "u32"; }, { name: "config"; type: { defined: { name: "arxNodeConfig"; }; }; }, { name: "cuCapacityClaim"; type: "u64"; }, { name: "blsPubkey"; type: { defined: { name: "bn254g2blsPublicKey"; }; }; }, { name: "metadata"; type: { defined: { name: "nodeMetadata"; }; }; }, { name: "x25519Pubkey"; type: { array: ["u8", 32]; }; }]; discriminator: [55, 177, 212, 125, 72, 118, 148, 232]; name: "initArxNode"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "id"; }]; }; writable: true; }, { name: "authority"; }, { docs: ["function"]; name: "mempool"; pda: { seeds: [{ kind: "const"; value: [77, 101, 109, 112, 111, 111, 108]; }, { kind: "arg"; path: "id"; }]; }; writable: true; }, { name: "execpool"; pda: { seeds: [{ kind: "const"; value: [69, 120, 101, 99, 112, 111, 111, 108]; }, { kind: "arg"; path: "id"; }]; }; writable: true; }, { name: "poolAccount"; pda: { seeds: [{ kind: "const"; value: [70, 101, 101, 80, 111, 111, 108]; }]; }; }, { name: "clock"; pda: { seeds: [{ kind: "const"; value: [67, 108, 111, 99, 107, 65, 99, 99, 111, 117, 110, 116]; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "clusterId"; type: "u32"; }, { name: "mempoolSize"; type: { defined: { name: "mempoolSize"; }; }; }, { name: "clusterSize"; type: "u16"; }, { name: "cuPrice"; type: "u64"; }, { name: "tdInfo"; type: { option: { defined: { name: "nodeMetadata"; }; }; }; }]; discriminator: [144, 230, 5, 18, 93, 71, 133, 187]; name: "initCluster"; }, { accounts: [{ docs: ["Signer of the transaction."]; name: "signer"; signer: true; writable: true; }, { name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; writable: true; }, { name: "compDefAcc"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }, { kind: "arg"; path: "compOffset"; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; docs: ["System program account."]; name: "systemProgram"; }]; args: [{ name: "compOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }, { name: "computationDefinition"; type: { defined: { name: "computationDefinitionMeta"; }; }; }, { name: "circuitSourceOverride"; type: { option: { defined: { name: "circuitSource"; }; }; }; }, { name: "cuAmount"; type: "u64"; }, { name: "finalizationAuthority"; type: { option: "pubkey"; }; }]; discriminator: [45, 185, 155, 17, 97, 77, 230, 73]; docs: ["Initializes a computation definition."]; name: "initComputationDefinition"; }, { accounts: [{ name: "payer"; signer: true; writable: true; }, { name: "originalMxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "originalMxeProgram"; }]; }; }, { docs: ["Full allocation happens in init_key_recovery_execution_part2."]; name: "mxeRecoveryAccount"; pda: { seeds: [{ kind: "const"; value: [109, 120, 101, 95, 114, 101, 99, 111, 118, 101, 114, 121]; }, { kind: "account"; path: "backupMxeProgram"; }, { kind: "account"; path: "originalMxeProgram"; }]; }; writable: true; }, { name: "originalMxeProgram"; }, { name: "backupMxeProgram"; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "originalMxeProgram"; type: "pubkey"; }, { name: "backupMxeProgram"; type: "pubkey"; }]; discriminator: [73, 228, 114, 224, 181, 108, 251, 224]; docs: ["Part 1 of key recovery execution initialization.", "Creates the MxeRecoveryAccount with partial size due to Solana's 10KB limit.", "Call init_key_recovery_execution_part2 afterwards."]; name: "initKeyRecoveryExecutionPart1"; }, { accounts: [{ name: "authority"; signer: true; writable: true; }, { name: "payer"; signer: true; writable: true; }, { name: "originalMxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "originalMxeProgram"; }]; }; }, { name: "backupMxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "backupMxeProgram"; }]; }; writable: true; }, { name: "recoveryPeersAcc"; pda: { seeds: [{ kind: "const"; value: [82, 101, 99, 111, 118, 101, 114, 121, 80, 101, 101, 114, 115, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "originalMxeProgram"; }]; }; }, { name: "mxeRecoveryAccount"; pda: { seeds: [{ kind: "const"; value: [109, 120, 101, 95, 114, 101, 99, 111, 118, 101, 114, 121]; }, { kind: "account"; path: "backupMxeProgram"; }, { kind: "account"; path: "originalMxeProgram"; }]; }; writable: true; }, { docs: ["The computation definition account for MxeKeyRecoveryFinalize (on backup MXE)"]; name: "keyRecoveryFinalizeCompDef"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "account"; path: "backupMxeProgram"; }, { kind: "const"; value: [3, 0, 0, 0]; }]; }; writable: true; }, { name: "originalMxeProgram"; }, { name: "backupMxeProgram"; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "originalMxeProgram"; type: "pubkey"; }, { name: "backupMxeProgram"; type: "pubkey"; }]; discriminator: [181, 38, 231, 178, 21, 239, 196, 158]; docs: ["Part 2 of key recovery execution initialization.", "Finishes allocating MxeRecoveryAccount and creates the computation definition."]; name: "initKeyRecoveryExecutionPart2"; }, { accounts: [{ docs: ["Signer of the transaction."]; name: "signer"; signer: true; writable: true; }, { docs: ["Full allocation happens in init_mxe_part2."]; name: "recoveryPeersAcc"; pda: { seeds: [{ kind: "const"; value: [82, 101, 99, 111, 118, 101, 114, 121, 80, 101, 101, 114, 115, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "account"; path: "mxeProgram"; }]; }; writable: true; }, { docs: ["constraint in tests because setting it would require us to deploy a program each time."]; name: "mxeProgram"; }, { address: "11111111111111111111111111111111"; docs: ["System program account."]; name: "systemProgram"; }]; args: []; discriminator: [134, 126, 69, 42, 180, 144, 202, 165]; docs: ["Initializes a MPC Execution Environment (part 1).", "Due to Solana's 10KB per-instruction allocation limit, this only partially", "allocates recovery_peers_acc. Call init_mxe_part2 afterwards to finish", "allocation and add keygen to mempool."]; name: "initMxePart1"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { docs: ["Cluster to add to the MXE."]; name: "cluster"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "clusterOffset"; }]; }; }, { docs: ["MXE account to initialize."]; name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "account"; path: "mxeProgram"; }]; }; writable: true; }, { name: "recoveryPeersAcc"; pda: { seeds: [{ kind: "const"; value: [82, 101, 99, 111, 118, 101, 114, 121, 80, 101, 101, 114, 115, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; writable: true; }, { name: "executingPool"; pda: { seeds: [{ kind: "const"; value: [69, 120, 101, 99, 112, 111, 111, 108]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "mempool"; pda: { seeds: [{ kind: "const"; value: [77, 101, 109, 112, 111, 111, 108]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "mxeKeygenComputationDefinition"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "account"; path: "mxeProgram"; }, { kind: "const"; value: [1, 0, 0, 0]; }]; }; writable: true; }, { name: "mxeKeygenComputation"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "clusterOffset"; }, { kind: "arg"; path: "keygenOffset"; }]; }; writable: true; }, { name: "keyRecoveryInitComputation"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "clusterOffset"; }, { kind: "arg"; path: "keyRecoveryInitOffset"; }]; }; writable: true; }, { name: "mxeAuthority"; optional: true; }, { docs: ["constraint in tests because setting it would require us to deploy a program each time."]; name: "mxeProgram"; }, { name: "poolAccount"; pda: { seeds: [{ kind: "const"; value: [70, 101, 101, 80, 111, 111, 108]; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "clusterOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }, { name: "recoveryPeers"; type: { array: ["u32", 100]; }; }, { name: "keygenOffset"; type: "u64"; }, { name: "keyRecoveryInitOffset"; type: "u64"; }]; discriminator: [70, 121, 251, 59, 255, 152, 202, 136]; docs: ["Finishes MXE initialization (part 2).", "Reallocates recovery_peers_acc to full size, initializes recovery_peers,", "and adds the keygen computation to the mempool."]; name: "initMxePart2"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "operatorAcc"; pda: { seeds: [{ kind: "const"; value: [79, 112, 101, 114, 97, 116, 111, 114]; }, { kind: "account"; path: "signer"; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "meta"; type: { defined: { name: "operatorMeta"; }; }; }]; discriminator: [132, 210, 12, 91, 159, 94, 35, 54]; name: "initOperator"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "compDefAcc"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }, { kind: "arg"; path: "compOffset"; }]; }; }, { name: "compDefRaw"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 82, 97, 119]; }, { kind: "account"; path: "compDefAcc"; }, { kind: "arg"; path: "rawCircuitIndex"; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "compOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }, { name: "rawCircuitIndex"; type: "u8"; }]; discriminator: [16, 228, 193, 228, 93, 231, 58, 4]; name: "initRawCircuitAcc"; }, { accounts: [{ name: "nodeAuthority"; signer: true; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "arxNodeAcc"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "clusterId"; type: "u32"; }, { name: "nodeBump"; type: "u32"; }, { name: "join"; type: "bool"; }]; discriminator: [150, 167, 124, 239, 108, 128, 31, 162]; name: "joinCluster"; }, { accounts: [{ name: "authority"; signer: true; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "id"; }]; }; writable: true; }, { name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "clusterOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }]; discriminator: [225, 222, 68, 9, 96, 160, 126, 211]; name: "leaveMxe"; }, { accounts: [{ name: "nodeAuthority"; signer: true; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "arxNodeAcc"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; }]; args: [{ name: "clusterOffset"; type: "u32"; }, { name: "nodeOffset"; type: "u32"; }, { name: "proposedFee"; type: "u64"; }]; discriminator: [103, 204, 172, 134, 248, 252, 27, 170]; name: "proposeFee"; }, { accounts: [{ name: "clusterAuthority"; signer: true; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "arxNodeAcc"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; writable: true; }, { name: "clock"; pda: { seeds: [{ kind: "const"; value: [67, 108, 111, 99, 107, 65, 99, 99, 111, 117, 110, 116]; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "clusterId"; type: "u32"; }, { name: "nodeBump"; type: "u32"; }]; discriminator: [148, 228, 222, 211, 161, 128, 118, 175]; name: "proposeJoinCluster"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { docs: ["This is ok-ish though, as we're just reading the bump to verify the PDA."]; name: "signSeed"; pda: { program: { kind: "arg"; path: "mxeProgram"; }; seeds: [{ kind: "const"; value: [83, 105, 103, 110, 101, 114, 65, 99, 99, 111, 117, 110, 116]; }]; }; signer: true; }, { name: "comp"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "cluster_index.map_or(mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? , | i |\nmxe.fallback_clusters [i as usize])"; }, { kind: "arg"; path: "computationOffset"; }]; }; writable: true; }, { name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; }, { name: "executingPool"; pda: { seeds: [{ kind: "const"; value: [69, 120, 101, 99, 112, 111, 111, 108]; }, { kind: "arg"; path: "cluster_index.map_or(mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? , | i |\nmxe.fallback_clusters [i as usize])"; }]; }; writable: true; }, { name: "mempool"; pda: { seeds: [{ kind: "const"; value: [77, 101, 109, 112, 111, 111, 108]; }, { kind: "arg"; path: "cluster_index.map_or(mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? , | i |\nmxe.fallback_clusters [i as usize])"; }]; }; writable: true; }, { name: "compDefAcc"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }, { kind: "arg"; path: "computationDefinitionOffset"; }]; }; }, { name: "cluster"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "cluster_index.map_or(mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? , | i |\nmxe.fallback_clusters [i as usize])"; }]; }; writable: true; }, { name: "poolAccount"; pda: { seeds: [{ kind: "const"; value: [70, 101, 101, 80, 111, 111, 108]; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }, { name: "clock"; pda: { seeds: [{ kind: "const"; value: [67, 108, 111, 99, 107, 65, 99, 99, 111, 117, 110, 116]; }]; }; writable: true; }]; args: [{ name: "compOffset"; type: "u64"; }, { name: "computationDefinitionOffset"; type: "u32"; }, { name: "clusterIndex"; type: { option: "u16"; }; }, { name: "args"; type: { defined: { name: "argumentList"; }; }; }, { name: "mxeProgram"; type: "pubkey"; }, { name: "callbackUrl"; type: { option: "string"; }; }, { name: "customCallbackInstructions"; type: { vec: { defined: { name: "callbackInstruction"; }; }; }; }, { name: "callbackTransactionsRequired"; type: "u8"; }, { name: "outputDeliveryFee"; type: "u64"; }, { name: "cuPriceMicro"; type: "u64"; }]; discriminator: [1, 149, 103, 13, 102, 227, 93, 164]; docs: ["Queues a computation.", "cu_price_micro: The priority price of a CU, in thousandths of lamports. Used", "to calculate the priority fee and rounded down."]; name: "queueComputation"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; writable: true; }, { name: "recoveryPeersAcc"; pda: { seeds: [{ kind: "const"; value: [82, 101, 99, 111, 118, 101, 114, 121, 80, 101, 101, 114, 115, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; }, { name: "executingPool"; pda: { seeds: [{ kind: "const"; value: [69, 120, 101, 99, 112, 111, 111, 108]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "mempool"; pda: { seeds: [{ kind: "const"; value: [77, 101, 109, 112, 111, 111, 108]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "keyRecoveryInitComputationDefinition"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "account"; path: "mxeProgram"; }, { kind: "const"; value: [2, 0, 0, 0]; }]; }; writable: true; }, { name: "keyRecoveryInitComputation"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "clusterOffset"; }, { account: "mxeAccount"; kind: "account"; path: "mxe.key_recovery_init_offset"; }]; }; writable: true; }, { name: "mxeProgram"; }, { name: "poolAccount"; pda: { seeds: [{ kind: "const"; value: [70, 101, 101, 80, 111, 111, 108]; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "clusterOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }]; discriminator: [76, 132, 32, 81, 11, 163, 98, 82]; docs: ["Queues the key recovery init computation for the MXE.", "Can only be called once after MXE keys are set."]; name: "queueKeyRecoveryInit"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "failureAcc"; pda: { seeds: [{ kind: "const"; value: [70, 97, 105, 108, 117, 114, 101, 67, 108, 97, 105, 109, 65, 99, 99, 111, 117, 110, 116, 72, 101, 97, 100, 101, 114]; }, { kind: "arg"; path: "mxeProgram"; }, { kind: "arg"; path: "compOffset"; }]; }; writable: true; }]; args: [{ name: "compOffset"; type: "u64"; }, { name: "nodeOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }]; discriminator: [159, 99, 116, 180, 42, 9, 202, 219]; name: "reclaimFailureRent"; }, { accounts: [{ name: "authority"; signer: true; writable: true; }, { name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; writable: true; }, { name: "mxeProgram"; }]; args: [{ name: "mxeProgram"; type: "pubkey"; }]; discriminator: [65, 99, 9, 69, 97, 38, 105, 253]; docs: ["Sets an MXE to the Recovery state, enabling the recovery process to begin."]; name: "recoverMxe"; }, { accounts: [{ name: "authority"; signer: true; writable: true; }, { name: "payer"; signer: true; writable: true; }, { name: "originalMxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "originalMxeProgram"; }]; }; }, { name: "backupMxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "backupMxeProgram"; }]; }; }, { name: "mxeRecoveryAccount"; pda: { seeds: [{ kind: "const"; value: [109, 120, 101, 95, 114, 101, 99, 111, 118, 101, 114, 121]; }, { kind: "account"; path: "backupMxeProgram"; }, { kind: "account"; path: "originalMxeProgram"; }]; }; writable: true; }, { name: "keyRecoveryFinalizeCompDef"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "account"; path: "backupMxeProgram"; }, { kind: "const"; value: [3, 0, 0, 0]; }]; }; }, { docs: ["The previous failed computation account"]; name: "previousComputation"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "clusterOffset"; }, { kind: "account"; path: "mxeRecoveryAccount"; }]; }; }, { name: "newComputation"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "clusterOffset"; }, { kind: "arg"; path: "newKeyRecoveryFinalizeOffset"; }]; }; writable: true; }, { name: "executingPool"; pda: { seeds: [{ kind: "const"; value: [69, 120, 101, 99, 112, 111, 111, 108]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "mempool"; pda: { seeds: [{ kind: "const"; value: [77, 101, 109, 112, 111, 111, 108]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "poolAccount"; pda: { seeds: [{ kind: "const"; value: [70, 101, 101, 80, 111, 111, 108]; }]; }; writable: true; }, { name: "originalMxeProgram"; }, { name: "backupMxeProgram"; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "originalMxeProgram"; type: "pubkey"; }, { name: "backupMxeProgram"; type: "pubkey"; }, { name: "clusterOffset"; type: "u32"; }, { name: "newKeyRecoveryFinalizeOffset"; type: "u64"; }]; discriminator: [131, 109, 226, 183, 90, 203, 17, 191]; docs: ["Re-queues the key_recovery_finalize computation after a failed execution."]; name: "requeueKeyRecoveryFinalize"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "account"; path: "mxeProgram"; }]; }; }, { name: "executingPool"; pda: { seeds: [{ kind: "const"; value: [69, 120, 101, 99, 112, 111, 111, 108]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "mempool"; pda: { seeds: [{ kind: "const"; value: [77, 101, 109, 112, 111, 111, 108]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "cluster"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "clusterOffset"; }]; }; }, { name: "mxeKeygenComputation"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "clusterOffset"; }, { account: "mxeAccount"; kind: "account"; path: "mxe.keygen_offset"; }]; }; writable: true; }, { name: "mxeProgram"; }]; args: [{ name: "clusterOffset"; type: "u32"; }]; discriminator: [90, 98, 117, 181, 88, 71, 135, 30]; docs: ["Re-queues the MXE keygen computation if it has expired from the mempool.", "This allows retrying the keygen if it wasn't processed in time."]; name: "requeueMxeKeygen"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "arxNodeAcc"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; writable: true; }]; args: [{ name: "nodeOffset"; type: "u32"; }, { name: "config"; type: { defined: { name: "arxNodeConfig"; }; }; }]; discriminator: [163, 75, 176, 148, 145, 196, 238, 234]; name: "setArxNodeConfig"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "arxNodeAcc"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; writable: true; }]; args: [{ name: "nodeOffset"; type: "u32"; }, { name: "meta"; type: { defined: { name: "nodeMetadata"; }; }; }]; discriminator: [176, 88, 44, 90, 127, 151, 62, 80]; name: "setArxNodeMetadata"; }, { accounts: [{ docs: ["Signer of the transaction."]; name: "signer"; signer: true; writable: true; }, { docs: ["MXE account to set the cluster for."]; name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "account"; path: "mxeProgram"; }]; }; }, { docs: ["Cluster to set for the MXE."]; name: "cluster"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "clusterOffset"; }]; }; }, { name: "mxeProgram"; }]; args: [{ name: "clusterOffset"; type: "u32"; }]; discriminator: [140, 96, 38, 83, 225, 128, 25, 176]; name: "setCluster"; }, { accounts: [{ name: "currentAuthority"; signer: true; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "id"; }]; }; writable: true; }]; args: [{ name: "clusterId"; type: "u32"; }, { name: "newAuthority"; type: { option: "pubkey"; }; }]; discriminator: [94, 172, 32, 75, 38, 40, 31, 106]; name: "setClusterAuthority"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "node"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; }, { name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }]; }; writable: true; }]; args: [{ name: "nodeOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }, { name: "mxeX25519Pubkey"; type: { array: ["u8", 32]; }; }, { name: "mxeEd25519VerifyingKey"; type: { array: ["u8", 32]; }; }, { name: "mxeElgamalPubkey"; type: { array: ["u8", 32]; }; }, { name: "mxePubkeyValidityProof"; type: { array: ["u8", 64]; }; }]; discriminator: [156, 205, 125, 215, 134, 88, 62, 144]; name: "setMxeKeys"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "node"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; }, { name: "mxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; writable: true; }, { name: "recoveryPeersAcc"; pda: { seeds: [{ kind: "const"; value: [82, 101, 99, 111, 118, 101, 114, 121, 80, 101, 101, 114, 115, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }]; }; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { account: "mxeAccount"; kind: "account"; path: "mxe.cluster.ok_or(ArciumError :: ClusterNotSet) ? "; }]; }; writable: true; }]; args: [{ name: "nodeOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }, { name: "nonce"; type: { array: ["u8", 16]; }; }, { name: "encryptedMxeKeys"; type: { array: [{ array: ["u8", 32]; }, 13]; }; }, { name: "keyMaterialHash"; type: { array: ["u8", 32]; }; }, { name: "blsSig"; type: { array: ["u8", 64]; }; }]; discriminator: [49, 89, 116, 64, 81, 250, 112, 64]; name: "setMxeRecoveryKeysInit"; }, { accounts: [{ name: "nodeAuthority"; signer: true; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "arxNodeAcc"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; }]; args: [{ name: "clusterId"; type: "u32"; }, { name: "nodeBump"; type: "u32"; }, { name: "aggregatedBlsPubkey"; type: { defined: { name: "bn254g2blsPublicKey"; }; }; }]; discriminator: [192, 135, 47, 120, 63, 18, 232, 164]; name: "submitAggregatedBlsPubkey"; }, { accounts: [{ name: "nodeSigner"; signer: true; writable: true; }, { name: "node"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; }, { name: "originalMxe"; pda: { seeds: [{ kind: "const"; value: [77, 88, 69, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "originalMxeProgram"; }]; }; }, { name: "recoveryPeersAcc"; pda: { seeds: [{ kind: "const"; value: [82, 101, 99, 111, 118, 101, 114, 121, 80, 101, 101, 114, 115, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "originalMxeProgram"; }]; }; }, { name: "mxeRecoveryAccount"; pda: { seeds: [{ kind: "const"; value: [109, 120, 101, 95, 114, 101, 99, 111, 118, 101, 114, 121]; }, { kind: "account"; path: "backupMxeProgram"; }, { kind: "account"; path: "originalMxeProgram"; }]; }; writable: true; }, { name: "originalMxeProgram"; }, { name: "backupMxeProgram"; }]; args: [{ name: "originalMxeProgram"; type: "pubkey"; }, { name: "backupMxeProgram"; type: "pubkey"; }, { name: "nodeOffset"; type: "u32"; }, { name: "peerIndex"; type: "u32"; }, { name: "share"; type: { array: [{ array: ["u8", 32]; }, 5]; }; }]; discriminator: [108, 74, 123, 253, 76, 98, 190, 164]; docs: ["Submits a recovery share from a recovery peer.", "Each share contains RESCUE_KEY_COUNT (5) field elements of 32 bytes each."]; name: "submitKeyRecoveryShare"; }, { accounts: [{ name: "clock"; pda: { seeds: [{ kind: "const"; value: [67, 108, 111, 99, 107, 65, 99, 99, 111, 117, 110, 116]; }]; }; writable: true; }]; args: []; discriminator: [47, 73, 68, 127, 116, 74, 89, 62]; name: "updateCurrentEpochIdempotent"; }, { accounts: [{ name: "signer"; signer: true; writable: true; }, { name: "compDefAcc"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 65, 99, 99, 111, 117, 110, 116]; }, { kind: "arg"; path: "mxeProgram"; }, { kind: "arg"; path: "compOffset"; }]; }; }, { name: "compDefRaw"; pda: { seeds: [{ kind: "const"; value: [67, 111, 109, 112, 117, 116, 97, 116, 105, 111, 110, 68, 101, 102, 105, 110, 105, 116, 105, 111, 110, 82, 97, 119]; }, { kind: "account"; path: "compDefAcc"; }, { kind: "arg"; path: "rawCircuitIndex"; }]; }; writable: true; }, { address: "11111111111111111111111111111111"; name: "systemProgram"; }]; args: [{ name: "compOffset"; type: "u32"; }, { name: "mxeProgram"; type: "pubkey"; }, { name: "rawCircuitIndex"; type: "u8"; }, { name: "uploadData"; type: { array: ["u8", 814]; }; }, { name: "offset"; type: "u32"; }]; discriminator: [86, 238, 214, 111, 30, 23, 168, 100]; name: "uploadCircuit"; }, { accounts: [{ name: "nodeAuthority"; signer: true; writable: true; }, { name: "clusterAcc"; pda: { seeds: [{ kind: "const"; value: [67, 108, 117, 115, 116, 101, 114]; }, { kind: "arg"; path: "clusterOffset"; }]; }; writable: true; }, { name: "arxNodeAcc"; pda: { seeds: [{ kind: "const"; value: [65, 114, 120, 78, 111, 100, 101]; }, { kind: "arg"; path: "nodeOffset"; }]; }; }]; args: [{ name: "clusterOffset"; type: "u32"; }, { name: "nodeOffset"; type: "u32"; }, { name: "feeVote"; type: "u64"; }]; discriminator: [39, 118, 79, 185, 118, 12, 71, 84]; name: "voteFee"; }]

metadata
metadata: object

Name	Type
description	"The Arcium program"
name	"arcium"
spec	"0.1.0"
version	"0.6.0-alpha"
types
types: [{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }, { name: "noSignature"; }, { name: "invalidSignature"; }, { name: "primitiveError"; }, { name: "invalidBatchLength"; }, { name: "quadraticNonResidue"; }, { name: "bitConversionError"; }, { name: "channelClosed"; }, { name: "timeoutElapsed"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }, { name: "activation"; type: { fields: [{ docs: ["epoch for the cluster was activated. Epoch::INFINITY if inactive."]; name: "activationEpoch"; type: { defined: { name: "epoch"; }; }; }, { docs: ["epoch for the cluster to be deactivated. Epoch::INFINITY if none."]; name: "deactivationEpoch"; type: { defined: { name: "epoch"; }; }; }]; kind: "struct"; }; }, { docs: ["Container for arguments that separates small inline values from large indexed data"]; name: "argumentList"; type: { fields: [{ name: "args"; type: { vec: { defined: { name: "argumentRef"; }; }; }; }, { name: "byteArrays"; type: { vec: { array: ["u8", 32]; }; }; }, { name: "plaintextNumbers"; type: { vec: "u64"; }; }, { name: "values128Bit"; type: { vec: "u128"; }; }, { name: "accounts"; type: { vec: { defined: { name: "accountArgument"; }; }; }; }]; kind: "struct"; }; }, { docs: ["A reference to an argument - stores small values that don't affect alignment inline and large", "values as indices."]; name: "argumentRef"; type: { kind: "enum"; variants: [{ fields: ["bool"]; name: "plaintextBool"; }, { fields: ["u8"]; name: "plaintextU8"; }, { fields: ["i8"]; name: "plaintextI8"; }, { fields: ["u8"]; name: "plaintextU16"; }, { fields: ["u8"]; name: "plaintextU32"; }, { fields: ["u8"]; name: "plaintextU64"; }, { fields: ["u8"]; name: "plaintextU128"; }, { fields: ["u8"]; name: "plaintextFloat"; }, { fields: ["u8"]; name: "encryptedBool"; }, { fields: ["u8"]; name: "encryptedU8"; }, { fields: ["u8"]; name: "encryptedU16"; }, { fields: ["u8"]; name: "encryptedU32"; }, { fields: ["u8"]; name: "encryptedU64"; }, { fields: ["u8"]; name: "encryptedU128"; }, { fields: ["u8"]; name: "encryptedFloat"; }, { fields: ["u8"]; name: "x25519Pubkey"; }, { fields: ["u8"]; name: "arcisEd25519Signature"; }, { fields: ["u8"]; name: "account"; }, { fields: ["u8"]; name: "plaintextI16"; }, { fields: ["u8"]; name: "plaintextI32"; }, { fields: ["u8"]; name: "plaintextI64"; }, { fields: ["u8"]; name: "plaintextI128"; }, { fields: ["u8"]; name: "encryptedI8"; }, { fields: ["u8"]; name: "encryptedI16"; }, { fields: ["u8"]; name: "encryptedI32"; }, { fields: ["u8"]; name: "encryptedI64"; }, { fields: ["u8"]; name: "encryptedI128"; }, { fields: ["u8"]; name: "plaintextPoint"; }]; }; }, { name: "arxNode"; type: { fields: [{ docs: ["X25519 public key for usage when being a key recovery peer. MUST BE AT byte index 8 - 40"]; name: "x25519Pubkey"; type: { array: ["u8", 32]; }; }, { name: "primaryStakingAccount"; type: "pubkey"; }, { name: "metadata"; type: { defined: { name: "nodeMetadata"; }; }; }, { name: "config"; type: { defined: { name: "arxNodeConfig"; }; }; }, { docs: ["The offsets of the cluster the node is a member of."]; name: "clusterMembership"; type: { defined: { name: "clusterMembership"; }; }; }, { name: "cuCapacityClaim"; type: "u64"; }, { name: "isActive"; type: "bool"; }, { docs: ["BLS public key for this node (64 bytes compressed G2 point for alt-bn128)"]; name: "blsPubkey"; type: { defined: { name: "bn254g2blsPublicKey"; }; }; }, { name: "bump"; type: "u8"; }]; kind: "struct"; }; }, { name: "arxNodeConfig"; type: { fields: [{ docs: ["Admin key for node management operations"]; name: "authority"; type: "pubkey"; }, { docs: ["Key used to sign computation callbacks - separated for operational security"]; name: "callbackAuthority"; type: "pubkey"; }]; kind: "struct"; }; }, { name: "bn254g2blsPublicKey"; type: { fields: [{ array: ["u8", 64]; }]; kind: "struct"; }; }, { docs: ["A callback account to be provided to a computation.", "We don't specify signer, since node operators can't sign."]; name: "callbackAccount"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "isWritable"; type: "bool"; }]; kind: "struct"; }; }, { name: "callbackComputationEvent"; type: { fields: [{ name: "computationOffset"; type: "u64"; }, { name: "mxeProgramId"; type: "pubkey"; }]; kind: "struct"; }; }, { docs: ["A custom callback instruction with its own program ID and discriminator."]; name: "callbackInstruction"; type: { fields: [{ name: "programId"; type: "pubkey"; }, { name: "discriminator"; type: "bytes"; }, { name: "accounts"; type: { vec: { defined: { name: "callbackAccount"; }; }; }; }]; kind: "struct"; }; }, { name: "circuitSource"; type: { kind: "enum"; variants: [{ fields: [{ defined: { name: "localCircuitSource"; }; }]; name: "local"; }, { fields: [{ defined: { name: "onChainCircuitSource"; }; }]; name: "onChain"; }, { fields: [{ defined: { name: "offChainCircuitSource"; }; }]; name: "offChain"; }]; }; }, { name: "claimFailureEvent"; type: { fields: [{ name: "computationOffset"; type: "u64"; }, { name: "mxeProgramId"; type: "pubkey"; }]; kind: "struct"; }; }, { docs: ["An account storing the current network epoch"]; name: "clockAccount"; type: { fields: [{ name: "startEpoch"; type: { defined: { name: "epoch"; }; }; }, { name: "currentEpoch"; type: { defined: { name: "epoch"; }; }; }, { name: "startEpochTimestamp"; type: { defined: { name: "timestamp"; }; }; }, { name: "bump"; type: "u8"; }]; kind: "struct"; }; }, { name: "cluster"; type: { fields: [{ name: "tdInfo"; type: { option: { defined: { name: "nodeMetadata"; }; }; }; }, { name: "authority"; type: { option: "pubkey"; }; }, { name: "clusterSize"; type: "u16"; }, { name: "activation"; type: { defined: { name: "activation"; }; }; }, { name: "maxCapacity"; type: "u64"; }, { docs: ["The price of compute units in this cluster."]; name: "cuPrice"; type: "u64"; }, { docs: ["The proposals for the cu price proposals in the next epoch.", "Index 0 is always the current price, we allow `MAX_FEE_PROPS` at most."]; name: "cuPriceProposals"; type: { array: ["u64", 32]; }; }, { docs: ["The epoch this cluster was last updated.", "Used to determine if the cluster needs to be updated."]; name: "lastUpdatedEpoch"; type: { defined: { name: "epoch"; }; }; }, { name: "nodes"; type: { vec: { defined: { name: "nodeRef"; }; }; }; }, { name: "pendingNodes"; type: { vec: "u32"; }; }, { docs: ["BLS public key for the cluster (64 bytes compressed G2 point for alt-bn128)", "Set only when all nodes have submitted and agreed on the aggregated pubkey"]; name: "blsPublicKey"; type: { defined: { generics: [{ kind: "type"; type: { defined: ...; }; }]; name: "setUnset"; }; }; }, { name: "bump"; type: "u8"; }]; kind: "struct"; }; }, { name: "clusterMembership"; type: { kind: "enum"; variants: [{ name: "inactive"; }, { fields: ["u32"]; name: "active"; }, { fields: ["u32"]; name: "proposed"; }]; }; }, { docs: ["A computation execution call to a [super::mxe::ComputationDefinitionAccount]."]; name: "computationAccount"; type: { fields: [{ name: "payer"; type: "pubkey"; }, { docs: ["The program ID of the MXE that this computation is associated with."]; name: "mxeProgramId"; type: "pubkey"; }, { docs: ["The offset of the corresponding [super::mxe::ComputationDefinitionAccount]."]; name: "computationDefinitionOffset"; type: "u32"; }, { docs: ["The execution fee for the execution."]; name: "executionFee"; type: { defined: { name: "executionFee"; }; }; }, { name: "slot"; type: "u64"; }, { name: "slotCounter"; type: "u16"; }, { name: "status"; type: { defined: { name: "computationStatus"; }; }; }, { docs: ["The MXE's cluster to be used for execution.", "", "# Notes", "", "- [None] represents the default cluster,", "- [Some] specifies the index of the fallback cluster."]; name: "clusterIndex"; type: { option: "u16"; }; }, { name: "arguments"; type: { defined: { name: "argumentList"; }; }; }, { name: "callbackUrl"; type: { option: "string"; }; }, { name: "customCallbackInstructions"; type: { vec: { defined: { name: "callbackInstruction"; }; }; }; }, { name: "callbackTransactionsRequired"; type: "u8"; }, { name: "callbackTransactionsSubmittedBm"; type: "u16"; }, { name: "bump"; type: "u8"; }]; kind: "struct"; }; }, { docs: ["An account representing a [ComputationDefinition] in a MXE."]; name: "computationDefinitionAccount"; type: { fields: [{ docs: ["The authority that is allowed to finalize the computation. If set to None, anyone can."]; name: "finalizationAuthority"; type: { option: "pubkey"; }; }, { docs: ["The amount of CUs this computation will use."]; name: "cuAmount"; type: "u64"; }, { docs: ["The interface of the computation to execute."]; name: "definition"; type: { defined: { name: "computationDefinitionMeta"; }; }; }, { docs: ["Where to fetch the actual raw circuit to execute."]; name: "circuitSource"; type: { defined: { name: "circuitSource"; }; }; }, { name: "bump"; type: "u8"; }]; kind: "struct"; }; }, { docs: ["A computation definition for execution in a MXE."]; name: "computationDefinitionMeta"; type: { fields: [{ name: "circuitLen"; type: "u32"; }, { name: "signature"; type: { defined: { name: "computationSignature"; }; }; }]; kind: "struct"; }; }, { name: "computationDefinitionRaw"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "bump"; type: "u8"; }, { docs: ["The length here is meaningless."]; name: "compiledCircuit"; type: { array: ["u8", 0]; }; }]; kind: "struct"; }; }, { name: "computationReference"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "computationOffset"; type: "u64"; }, { name: "priorityFee"; type: "u64"; }, { name: "accs"; type: { array: [{ defined: { name: "acccountAccessInfo"; }; }, 12]; }; }]; kind: "struct"; }; }, { docs: ["The signature of a computation defined in a [ComputationDefinition]."]; name: "computationSignature"; type: { fields: [{ docs: ["The input parameters of the computation."]; name: "parameters"; type: { vec: { defined: { name: "parameter"; }; }; }; }, { docs: ["The output(s) of the computation."]; name: "outputs"; type: { vec: { defined: { name: "output"; }; }; }; }]; kind: "struct"; }; }, { name: "computationStatus"; type: { kind: "enum"; variants: [{ name: "queued"; }, { name: "finalized"; }]; }; }, { docs: ["The network epoch"]; name: "epoch"; type: { fields: ["u64"]; kind: "struct"; }; }, { generics: [{ kind: "const"; name: "maxParrallelComputations"; type: "usize"; }]; name: "executingPool"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "bump"; type: "u8"; }, { name: "padding"; type: { array: ["u8", 7]; }; }, { name: "counter"; type: "u64"; }, { name: "execpoolIndex"; type: { array: ["u64", { generic: "maxParrallelComputations"; }]; }; }, { name: "currentlyExecuting"; type: { array: [{ defined: { name: "computationReference"; }; }, { generic: "maxParrallelComputations"; }]; }; }]; kind: "struct"; }; }, { name: "executionFailure"; type: { kind: "enum"; variants: [{ name: "serialization"; }, { name: "router"; }, { name: "circuit"; }, { name: "inputs"; }, { name: "protocolInit"; }, { name: "protocolRun"; }, { fields: [{ defined: { name: "abortReason"; }; }]; name: "abort"; }]; }; }, { name: "executionFee"; type: { fields: [{ docs: ["The base fee for the computation."]; name: "baseFee"; type: "u64"; }, { docs: ["The additional fee to enforce priortized execution in the mempool."]; name: "priorityFee"; type: "u64"; }, { docs: ["A fee for output delivery fees (i.e. tx fees)."]; name: "outputDeliveryFee"; type: "u64"; }]; kind: "struct"; }; }, { name: "executionStatus"; type: { kind: "enum"; variants: [{ name: "success"; }, { fields: [{ defined: { name: "executionFailure"; }; }, { array: ["u8", 32]; }]; name: "failure"; }]; }; }, { name: "failureClaimAccountHeader"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "bump"; type: "u8"; }, { name: "isComplete"; type: "bool"; }, { name: "padding"; type: { array: ["u8", 6]; }; }, { name: "challengeEndSlot"; type: "u64"; }, { name: "poster"; type: "pubkey"; }]; kind: "struct"; }; }, { name: "feePool"; type: { fields: [{ name: "bump"; type: "u8"; }]; kind: "struct"; }; }, { name: "finalizeComputationEvent"; type: { fields: [{ name: "computationOffset"; type: "u64"; }, { name: "mxeProgramId"; type: "pubkey"; }]; kind: "struct"; }; }, { name: "finalizeFailureDataEvent"; type: { fields: [{ name: "computationOffset"; type: "u64"; }, { name: "mxeProgramId"; type: "pubkey"; }]; kind: "struct"; }; }, { name: "initComputationEvent"; type: { fields: [{ name: "computationOffset"; type: "u64"; }, { name: "mxeProgramId"; type: "pubkey"; }]; kind: "struct"; }; }, { name: "largeExecPool"; repr: { kind: "transparent"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "inner"; type: { defined: { generics: [{ kind: "const"; value: "100"; }]; name: "executingPool"; }; }; }]; kind: "struct"; }; }, { name: "largeMempool"; repr: { kind: "transparent"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "inner"; type: { defined: { name: "largeMempoolInner"; }; }; }]; kind: "struct"; }; }, { name: "largeMempoolInner"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "lastUpdatedSlot"; type: "u64"; }, { name: "slotCounter"; type: "u16"; }, { name: "bump"; type: "u8"; }, { name: "padding"; type: { array: ["u8", 5]; }; }, { name: "computations"; type: { defined: { name: "largeMempoolInnerBuffer"; }; }; }]; kind: "struct"; }; }, { name: "largeMempoolInnerBuffer"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "elems"; type: { array: [{ defined: { name: "largeMempoolInnerBufferHeap"; }; }, 180]; }; }, { docs: ["Bit array tracking which slots are valid (1 = valid, 0 = stale)", "1 bit per slot, packed into bytes. For $buffer_length=180, this is 23 bytes."]; name: "validBits"; type: { array: ["u8", 23]; }; }, { name: "startIndex"; type: "u8"; }, { name: "length"; type: "u8"; }, { name: "padding"; type: { array: ["u8", 7]; }; }]; kind: "struct"; }; }, { name: "largeMempoolInnerBufferHeap"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "entries"; type: { array: [{ defined: { name: "computationReference"; }; }, 100]; }; }, { name: "count"; type: "u16"; }, { name: "padding"; type: { array: ["u8", 6]; }; }]; kind: "struct"; }; }, { name: "localCircuitSource"; type: { kind: "enum"; variants: [{ name: "mxeKeygen"; }, { name: "mxeKeyRecoveryInit"; }, { name: "mxeKeyRecoveryFinalize"; }]; }; }, { docs: ["A MPC Execution Environment."]; name: "mxeAccount"; type: { fields: [{ docs: ["The cluster executing the MXE."]; name: "cluster"; type: { option: "u32"; }; }, { docs: ["The offset used for the keygen computation account.", "Stored so requeue_mxe_keygen can find the computation account."]; name: "keygenOffset"; type: "u64"; }, { docs: ["The offset used for the key recovery init computation account.", "Stored so queue_key_recovery_init can find the computation account."]; name: "keyRecoveryInitOffset"; type: "u64"; }, { docs: ["The program ID of the program that this MXE is associated with. Needed so that when we", "index this account offchain we can find out what program it is associated with."]; name: "mxeProgramId"; type: "pubkey"; }, { docs: ["The management authority of the MXE."]; name: "authority"; type: { option: "pubkey"; }; }, { docs: ["The utility pubkeys, consisting of", "- x25519 pubkey (32 bytes), used for key exchange", "- ed25519 verifying key (32 bytes), used for signature verification", "- ElGamal pubkey (32 bytes), used for c-spl", "- ElGamal pubkey validity proof (64 bytes), used for c-spl"]; name: "utilityPubkeys"; type: { defined: { generics: [{ kind: "type"; type: { defined: ...; }; }]; name: "setUnset"; }; }; }, { docs: ["Fallback clusters that can execute this MXE as an alternative to the", "[MXEAccount::cluster]. There can be a maximum of [MAX_FALLBACK_CLUSTERS]", "fallback clusters."]; name: "fallbackClusters"; type: { vec: "u32"; }; }, { docs: ["The clusters that have rejected this MXE."]; name: "rejectedClusters"; type: { vec: "u32"; }; }, { docs: ["The offsets of all [ComputationDefinitionAccount]s of this MXE."]; name: "computationDefinitions"; type: { vec: "u32"; }; }, { docs: ["The status of this MXE (Active or Recovery)."]; name: "status"; type: { defined: { name: "mxeStatus"; }; }; }, { name: "bump"; type: "u8"; }]; kind: "struct"; }; }, { name: "mediumExecPool"; repr: { kind: "transparent"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "inner"; type: { defined: { generics: [{ kind: "const"; value: "10"; }]; name: "executingPool"; }; }; }]; kind: "struct"; }; }, { name: "mediumMempool"; repr: { kind: "transparent"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "inner"; type: { defined: { name: "mediumMempoolInner"; }; }; }]; kind: "struct"; }; }, { name: "mediumMempoolInner"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "lastUpdatedSlot"; type: "u64"; }, { name: "slotCounter"; type: "u16"; }, { name: "bump"; type: "u8"; }, { name: "padding"; type: { array: ["u8", 5]; }; }, { name: "computations"; type: { defined: { name: "mediumMempoolInnerBuffer"; }; }; }]; kind: "struct"; }; }, { name: "mediumMempoolInnerBuffer"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "elems"; type: { array: [{ defined: { name: "mediumMempoolInnerBufferHeap"; }; }, 180]; }; }, { docs: ["Bit array tracking which slots are valid (1 = valid, 0 = stale)", "1 bit per slot, packed into bytes. For $buffer_length=180, this is 23 bytes."]; name: "validBits"; type: { array: ["u8", 23]; }; }, { name: "startIndex"; type: "u8"; }, { name: "length"; type: "u8"; }, { name: "padding"; type: { array: ["u8", 7]; }; }]; kind: "struct"; }; }, { name: "mediumMempoolInnerBufferHeap"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "entries"; type: { array: [{ defined: { name: "computationReference"; }; }, 10]; }; }, { name: "count"; type: "u16"; }, { name: "padding"; type: { array: ["u8", 6]; }; }]; kind: "struct"; }; }, { name: "mempoolSize"; type: { kind: "enum"; variants: [{ name: "tiny"; }, { name: "small"; }, { name: "medium"; }, { name: "large"; }]; }; }, { docs: ["Account for tracking key recovery execution state.", "PDA seeds: ["mxe_recovery", backup_mxe_pubkey, original_mxe_pubkey]"]; name: "mxeRecoveryAccount"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ docs: ["Bitmap tracking which peers have uploaded their shares.", "Bit index corresponds to the index in the original MXE's recovery_peers array."]; name: "bitmap"; type: { array: ["u8", 13]; }; }, { docs: ["The shares submitted by recovery peers. Each peer submits RESCUE_KEY_COUNT (5) field", "elements. Each field element is 32 bytes. Zeros indicate not yet uploaded."]; name: "shares"; type: { array: [{ array: [{ array: ...; }, 5]; }, 100]; }; }, { docs: ["Whether the recovery has been finalized (threshold met and marked ready)."]; name: "isFinalized"; type: "u8"; }, { docs: ["Padding for u64 alignment (need 5 bytes to align key_recovery_final_offset at 8-byte", "boundary)"]; name: "padding1"; type: { array: ["u8", 2]; }; }, { docs: ["The computation offset for the queued key_recovery_finalize circuit."]; name: "keyRecoveryFinalizeOffset"; type: "u64"; }, { docs: ["Padding to ensure struct size is multiple of 8 (for zero_copy alignment after bump field)"]; name: "padding2"; type: { array: ["u8", 7]; }; }, { name: "originalMxePubkey"; type: "pubkey"; }, { name: "backupMxePubkey"; type: "pubkey"; }, { name: "bump"; type: "u8"; }]; kind: "struct"; }; }, { docs: ["The status of an MXE."]; name: "mxeStatus"; type: { kind: "enum"; variants: [{ name: "active"; }, { name: "recovery"; }]; }; }, { docs: ["location as [ISO 3166-1 alpha-2](https://www.iso.org/iso-3166-country-codes.html) country code"]; name: "nodeMetadata"; type: { fields: [{ docs: ["[Ipv4Addr], represented by it's 4 octects"]; name: "ip"; type: { array: ["u8", 4]; }; }, { docs: ["Needed for MPC protocol"]; name: "peerId"; type: { array: ["u8", 32]; }; }, { name: "location"; type: "u8"; }]; kind: "struct"; }; }, { docs: ["A reference to a node in the cluster.", "The offset is to derive the Node Account.", "The current_total_rewards is the total rewards the node has received so far in the current", "epoch."]; name: "nodeRef"; type: { fields: [{ name: "offset"; type: "u32"; }, { docs: ["Current total rewards the node has received in the current epoch in lamports."]; name: "currentTotalRewards"; type: "u64"; }, { name: "vote"; type: "u8"; }]; kind: "struct"; }; }, { name: "offChainCircuitSource"; type: { fields: [{ name: "source"; type: "string"; }, { name: "hash"; type: { array: ["u8", 32]; }; }]; kind: "struct"; }; }, { name: "onChainCircuitSource"; type: { fields: [{ docs: ["Specifies if the circuit for this computation has been fully uploaded,", "as this can take multiple transactions due to the circuit size."]; name: "isCompleted"; type: "bool"; }, { docs: ["The authority that is allowed to upload the circuit."]; name: "uploadAuth"; type: "pubkey"; }]; kind: "struct"; }; }, { name: "operator"; type: { fields: [{ name: "nodeOffsets"; type: { vec: "u32"; }; }, { name: "meta"; type: { defined: { name: "operatorMeta"; }; }; }, { name: "bump"; type: "u8"; }]; kind: "struct"; }; }, { docs: ["location as [ISO 3166-1 alpha-2](https://www.iso.org/iso-3166-country-codes.html) country code"]; name: "operatorMeta"; type: { fields: [{ docs: ["URL should point to a JSON containing the following fields:", "- `name`: String, the name of the operator", "- `description`: String, a description of the operator", "- `icon`: String, a URL to an icon representing the operator", "- `url`: String, a URL to the operator's website"]; name: "url"; type: "string"; }, { name: "location"; type: "u8"; }]; kind: "struct"; }; }, { docs: ["An output of a computation.", "We currently don't support encrypted outputs yet since encrypted values are passed via", "data objects."]; name: "output"; type: { kind: "enum"; variants: [{ name: "plaintextBool"; }, { name: "plaintextU8"; }, { name: "plaintextU16"; }, { name: "plaintextU32"; }, { name: "plaintextU64"; }, { name: "plaintextU128"; }, { name: "ciphertext"; }, { name: "arcisX25519Pubkey"; }, { name: "plaintextFloat"; }, { name: "plaintextPoint"; }, { name: "plaintextI8"; }, { name: "plaintextI16"; }, { name: "plaintextI32"; }, { name: "plaintextI64"; }, { name: "plaintextI128"; }]; }; }, { docs: ["A parameter of a computation.", "We differentiate between plaintext and encrypted parameters and data objects.", "Plaintext parameters are directly provided as their value.", "Encrypted parameters are provided as an offchain reference to the data.", "Data objects are provided as a reference to the data object account."]; name: "parameter"; type: { kind: "enum"; variants: [{ name: "plaintextBool"; }, { name: "plaintextU8"; }, { name: "plaintextU16"; }, { name: "plaintextU32"; }, { name: "plaintextU64"; }, { name: "plaintextU128"; }, { name: "ciphertext"; }, { name: "arcisX25519Pubkey"; }, { name: "arcisSignature"; }, { name: "plaintextFloat"; }, { name: "plaintextI8"; }, { name: "plaintextI16"; }, { name: "plaintextI32"; }, { name: "plaintextI64"; }, { name: "plaintextI128"; }, { name: "plaintextPoint"; }]; }; }, { name: "queueComputationEvent"; type: { fields: [{ name: "computationOffset"; type: "u64"; }, { name: "mxeProgramId"; type: "pubkey"; }]; kind: "struct"; }; }, { name: "recoveryKeyMaterial"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "nonce"; type: { array: ["u8", 16]; }; }, { name: "encryptedMxeKeys"; type: { array: [{ array: ["u8", 32]; }, 13]; }; }, { name: "keyMaterialHash"; type: { array: ["u8", 32]; }; }, { name: "recoveryKeyshares"; type: { array: [{ array: [{ array: ...; }, 5]; }, 100]; }; }, { name: "blsSig"; type: { array: ["u8", 64]; }; }, { name: "status"; type: "u8"; }]; kind: "struct"; }; }, { name: "recoveryPeersAccount"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ docs: ["The offsets of nodes in our key recovery cluster. 0 means null in this context.", "DO NOT PUT ANYTHING BEFORE THE RECOVERY_PEERS FIELD, IT'S EXPECTED TO BE AT OFFSET 8."]; name: "recoveryPeers"; type: { array: ["u32", 100]; }; }, { name: "recoveryKeyMaterial"; type: { defined: { name: "recoveryKeyMaterial"; }; }; }, { name: "padding"; type: { array: ["u8", 2]; }; }, { name: "bump"; type: "u8"; }]; kind: "struct"; }; }, { docs: ["Utility struct to store a value that needs to be set by a certain number of participants (keys", "in our case). Once all participants have set the value, the value is considered set and we only", "store it once."]; generics: [{ kind: "type"; name: "t"; }]; name: "setUnset"; type: { kind: "enum"; variants: [{ fields: [{ generic: "t"; }]; name: "set"; }, { fields: [{ generic: "t"; }, { vec: "bool"; }]; name: "unset"; }]; }; }, { name: "smallExecPool"; repr: { kind: "transparent"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "inner"; type: { defined: { generics: [{ kind: "const"; value: "3"; }]; name: "executingPool"; }; }; }]; kind: "struct"; }; }, { name: "smallMempool"; repr: { kind: "transparent"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "inner"; type: { defined: { name: "smallMempoolInner"; }; }; }]; kind: "struct"; }; }, { name: "smallMempoolInner"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "lastUpdatedSlot"; type: "u64"; }, { name: "slotCounter"; type: "u16"; }, { name: "bump"; type: "u8"; }, { name: "padding"; type: { array: ["u8", 5]; }; }, { name: "computations"; type: { defined: { name: "smallMempoolInnerBuffer"; }; }; }]; kind: "struct"; }; }, { name: "smallMempoolInnerBuffer"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "elems"; type: { array: [{ defined: { name: "smallMempoolInnerBufferHeap"; }; }, 180]; }; }, { docs: ["Bit array tracking which slots are valid (1 = valid, 0 = stale)", "1 bit per slot, packed into bytes. For $buffer_length=180, this is 23 bytes."]; name: "validBits"; type: { array: ["u8", 23]; }; }, { name: "startIndex"; type: "u8"; }, { name: "length"; type: "u8"; }, { name: "padding"; type: { array: ["u8", 7]; }; }]; kind: "struct"; }; }, { name: "smallMempoolInnerBufferHeap"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "entries"; type: { array: [{ defined: { name: "computationReference"; }; }, 3]; }; }, { name: "count"; type: "u16"; }, { name: "padding"; type: { array: ["u8", 6]; }; }]; kind: "struct"; }; }, { name: "timestamp"; type: { fields: [{ name: "timestamp"; type: "u64"; }]; kind: "struct"; }; }, { name: "tinyExecPool"; repr: { kind: "transparent"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "inner"; type: { defined: { generics: [{ kind: "const"; value: "1"; }]; name: "executingPool"; }; }; }]; kind: "struct"; }; }, { name: "tinyMempool"; repr: { kind: "transparent"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "inner"; type: { defined: { name: "tinyMempoolInner"; }; }; }]; kind: "struct"; }; }, { name: "tinyMempoolInner"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "lastUpdatedSlot"; type: "u64"; }, { name: "slotCounter"; type: "u16"; }, { name: "bump"; type: "u8"; }, { name: "padding"; type: { array: ["u8", 5]; }; }, { name: "computations"; type: { defined: { name: "tinyMempoolInnerBuffer"; }; }; }]; kind: "struct"; }; }, { name: "tinyMempoolInnerBuffer"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "elems"; type: { array: [{ defined: { name: "tinyMempoolInnerBufferHeap"; }; }, 180]; }; }, { docs: ["Bit array tracking which slots are valid (1 = valid, 0 = stale)", "1 bit per slot, packed into bytes. For $buffer_length=180, this is 23 bytes."]; name: "validBits"; type: { array: ["u8", 23]; }; }, { name: "startIndex"; type: "u8"; }, { name: "length"; type: "u8"; }, { name: "padding"; type: { array: ["u8", 7]; }; }]; kind: "struct"; }; }, { name: "tinyMempoolInnerBufferHeap"; repr: { kind: "c"; }; serialization: "bytemuckunsafe"; type: { fields: [{ name: "entries"; type: { array: [{ defined: { name: "computationReference"; }; }, 1]; }; }, { name: "count"; type: "u16"; }, { name: "padding"; type: { array: ["u8", 6]; }; }]; kind: "struct"; }; }, { name: "utilityPubkeys"; type: { fields: [{ name: "x25519Pubkey"; type: { array: ["u8", 32]; }; }, { name: "ed25519VerifyingKey"; type: { array: ["u8", 32]; }; }, { name: "elgamalPubkey"; type: { array: ["u8", 32]; }; }, { name: "pubkeyValidityProof"; type: { array: ["u8", 64]; }; }]; kind: "struct"; }; }]

**********************************************************************
@arcium-hq/client
/
Type aliases
ArciumLocalEnv
ArciumLocalEnv = object

Structure representing the local Arcium environment variables required for local development or testing.

Properties
arciumClusterOffset
arciumClusterOffset: number

**********************************************************************

@arcium-hq/client
/
Type aliases
ComputationErrorType
ComputationErrorType = `Transaction ${string} not found` | "Transaction inner instructions not found" | `Transaction failed with error: ${string}` | "No log messages found" | "No queue computation instruction found" | `Invalid computation offset: ${string}` | "Computation not found in executing pool, might have already executed" | `Error fetching transactions: ${string}` | `Instruction at index ${number} not found` | "Account keys or program ID index not found" | `No Program ID found for instruction at index ${number}` | "Max retries reached while searching for transaction"

Represents possible error messages that can occur during computation processing or transaction handling.

**********************************************************************

@arcium-hq/client
/
Type aliases
ComputationReference
ComputationReference = anchor.IdlTypes<ArciumIdlType>["computationReference"]

Reference to a computation in a mempool or executing pool. Contains the computation offset and priority fee information.

Type Structure

{
  computationDefinitionOffset: number;
  computationOffset: BN;
  priorityFee: BN;
}
Note: BN is the Anchor's BigNumber type.
**********************************************************************

ExecutingPoolAccount
ExecutingPoolAccount = anchor.IdlTypes<ArciumIdlType>["tinyExecPool"] | anchor.IdlTypes<ArciumIdlType>["smallExecPool"] | anchor.IdlTypes<ArciumIdlType>["mediumExecPool"] | anchor.IdlTypes<ArciumIdlType>["largeExecPool"]

Represents an executing pool account of any size (tiny, small, medium, or large). Executing pools manage parallel computation execution with account locking. Each size supports different maximum parallel computations:

Tiny: 1 parallel computation
Small: 3 parallel computations
Medium: 10 parallel computations
Large: 100 parallel computations

**********************************************************************

@arcium-hq/client
/
Type aliases
FpField
FpField = IField<bigint>

Field type for Curve25519 base field.


**********************************************************************
@arcium-hq/client
/
Type aliases
MempoolAccount
MempoolAccount = anchor.IdlTypes<ArciumIdlType>["tinyMempool"] | anchor.IdlTypes<ArciumIdlType>["smallMempool"] | anchor.IdlTypes<ArciumIdlType>["mediumMempool"] | anchor.IdlTypes<ArciumIdlType>["largeMempool"]

Represents a mempool account of any size (tiny, small, medium, or large). Mempools store pending computations prioritized by fee, with a time-to-live of 180 slots. Each size supports different maximum heap capacities:

Tiny: 1 computation
Small: 3 computations
Medium: 10 computations
Large: 100 computations

**********************************************************************

@arcium-hq/client
/
Variables
arcisEd25519
const arcisEd25519: CurveFn

Ed25519 curve instance using SHA3-512 for hashing, suitable for MPC (ArcisEd25519 signature scheme). This is essentially Ed25519 but with SHA3-512 instead of SHA-512 for lower multiplicative depth. See: https://datatracker.ietf.org/doc/html/rfc8032#section-5.1


**********************************************************************

@arcium-hq/client
/
Variables
ARCIUM_ADDR
const ARCIUM_ADDR: "BpaW2ZmCJnDwizWY8eM34JtVqp2kRgnmQcedSVc9USdP" = ARCIUM_IDL.address

The deployed address of the Arcium program, as specified in the IDL.


**********************************************************************

@arcium-hq/client
/
Variables
ARCIUM_IDL
const ARCIUM_IDL: ArciumIdlType

The Anchor-generated IDL JSON object for the Arcium program.


**********************************************************************

@arcium-hq/client
/
Variables
CURVE25519_BASE_FIELD
const CURVE25519_BASE_FIELD: FpField = ed25519.CURVE.Fp

Curve25519 base field as an IField instance.


**********************************************************************

@arcium-hq/client
/
Variables
CURVE25519_SCALAR_FIELD_MODULUS
const CURVE25519_SCALAR_FIELD_MODULUS: bigint = ed25519.CURVE.n

Scalar field prime modulus for Curve25519: 2^252 + 27742317777372353535851937790883648493


**********************************************************************

@arcium-hq/client
/
Variables
x25519
const x25519: XCurveFn

ECDH using curve25519 aka x25519.

Example

import { x25519 } from '@noble/curves/ed25519';
const priv = 'a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac4';
const pub = 'e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4c';
x25519.getSharedSecret(priv, pub) === x25519.scalarMult(priv, pub); // aliases
x25519.getPublicKey(priv) === x25519.scalarMultBase(priv);
x25519.getPublicKey(x25519.utils.randomSecretKey());


**********************************************************************
@arcium-hq/reader
Type Aliases
Type Alias	Description
ArciumEvent	All events emitted by the Arcium program, keyed by event name.
ArciumEventData	Data structure for any Arcium event, as parsed from logs.
ArciumEventName	Capitalized event names, matching the format as emitted by the program.
ArciumInstructionName	Valid instruction names from the Arcium IDL.
ArciumTypes	Arcium IDL types derived from the Arcium program interface.
ArxNodeAccount	ArxNode account data structure for individual computation nodes.
CallbackComputationIx	Callback computation instruction type from the Arcium IDL.
ClusterAccount	Cluster account data structure containing node information.
ComputationAccount	Computation account data structure tracking computation state.
ComputationDefinitionAccount	Computation definition account containing circuit configuration.
ComputationReference	Reference to a computation in a mempool or executing pool.
ComputationStatus	Status values for a computation, as defined by the Arcium protocol.
Connection	Solana Connection type alias for convenience.
MXEAccount	MXE (Multi-party eXecution Environment) account data structure.
MxeRecoveryAccount	MXE recovery account data structure tracking key recovery session state.
Program	Anchor Program type alias with generic IDL support.
PublicKey	Solana PublicKey type alias for convenience.
QueueComputationIx	Queue computation instruction type from the Arcium IDL.
RecoveryPeersAccount	Recovery peers account data structure containing recovery peers information.
Functions
Function	Description
getArciumProgram	Returns an Anchor program instance for the Arcium program.
getArxNodeAccAddress	Derives the ArxNode account address for a given offset.
getArxNodeAccAddresses	Returns all ArxNode account addresses.
getArxNodeAccInfo	Fetches and parses a given ArxNode account.
getClockAccAddress	Derives the clock account address.
getClusterAccAddress	Derives the cluster account address for a given offset.
getClusterAccAddresses	Returns all Cluster account addresses.
getClusterAccInfo	Fetches and parses a given Cluster account.
getCompDefAccAddress	Derives the computation definition account address for a given MXE program ID and offset.
getCompDefAccInfo	Fetches and parses a given ComputationDefinition account.
getComputationAccAddress	Derives the computation account address for a given cluster and computation offset.
getComputationAccInfo	Fetches and parses a given Computation account.
getComputationOffset	Gets the computation offset from a transaction.
getComputationsInMempool	Returns all computation references in the mempool for a given account. Only non-stake computations are included.
getExecutingPoolAccAddress	Derives the executing pool account address for a given cluster.
getFeePoolAccAddress	Derives the fee pool account address.
getMempoolAccAddress	Derives the mempool account address for a given cluster.
getMempoolPriorityFeeStats	Calculates priority fee statistics for computations in a mempool.
getMXEAccAddress	Derives the MXE account address for a given MXE program ID.
getMXEAccAddresses	Returns all MXE account addresses.
getMXEAccInfo	Fetches and parses a given MXE account.
getMxeRecoveryAccInfo	Fetches and parses a given MxeRecovery account.
getRecoveryPeersAccInfo	Fetches and parses a given RecoveryPeers account.
subscribeComputations	Subscribes to computation-related events for a given MXE program ID.
unsubscribeComputations	Unsubscribes from computation-related events using the subscription ID.

**********************************************************************

@arcium-hq/reader
/
Functions
getArciumProgram
getArciumProgram(provider): Program<Arcium>

Returns an Anchor program instance for the Arcium program.

Parameters
Parameter	Type	Description
provider	AnchorProvider	The Anchor provider to use.
Returns
Program<Arcium>

The Anchor program instance for Arcium.

**********************************************************************

@arcium-hq/reader
/
Functions
getArxNodeAccAddress
getArxNodeAccAddress(nodeOffset): PublicKey

Derives the ArxNode account address for a given offset.

Parameters
Parameter	Type	Description
nodeOffset	number	The ArxNode offset as a number.
Returns
PublicKey

The derived ArxNode account public key.

**********************************************************************
@arcium-hq/reader
/
Functions
getArxNodeAccAddresses
getArxNodeAccAddresses(conn): Promise<PublicKey[]>

Returns all ArxNode account addresses.

Parameters
Parameter	Type	Description
conn	Connection	The Solana connection object.
Returns
Promise<PublicKey[]>

Array of ArxNode account public keys.
**********************************************************************
@arcium-hq/reader
/
Functions
getArxNodeAccInfo
getArxNodeAccInfo(arciumProgram, address, commitment?): Promise<{ blsPubkey: { 0: number[]; }; bump: number; clusterMembership: DecodeEnum<{ kind: "enum"; variants: [{ name: "inactive"; }, { fields: ["u32"]; name: "active"; }, { fields: ["u32"]; name: "proposed"; }]; }, DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], EmptyDefined>>>; config: { authority: PublicKey; callbackAuthority: PublicKey; }; cuCapacityClaim: BN; isActive: boolean; metadata: { ip: number[]; location: number; peerId: number[]; }; primaryStakingAccount: PublicKey; x25519Pubkey: number[]; }>

Fetches and parses a given ArxNode account.

Parameters
Parameter	Type	Description
arciumProgram	Program<Arcium>	The Anchor program instance.
address	PublicKey	The public key of the ArxNode account.
commitment?	Commitment	(Optional) RPC commitment level.
Returns
Promise<{ blsPubkey: { 0: number[]; }; bump: number; clusterMembership: DecodeEnum<{ kind: "enum"; variants: [{ name: "inactive"; }, { fields: ["u32"]; name: "active"; }, { fields: ["u32"]; name: "proposed"; }]; }, DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], EmptyDefined>>>; config: { authority: PublicKey; callbackAuthority: PublicKey; }; cuCapacityClaim: BN; isActive: boolean; metadata: { ip: number[]; location: number; peerId: number[]; }; primaryStakingAccount: PublicKey; x25519Pubkey: number[]; }>

The ArxNodeAccount object.

**********************************************************************
@arcium-hq/reader
/
Functions
getClockAccAddress
getClockAccAddress(): PublicKey

Derives the clock account address.

Returns
PublicKey

The derived clock account public key.
**********************************************************************
@arcium-hq/reader
/
Functions
getClusterAccAddress
getClusterAccAddress(clusterOffset): PublicKey

Derives the cluster account address for a given offset.

Parameters
Parameter	Type	Description
clusterOffset	number	The cluster offset as a number.
Returns
PublicKey

The derived cluster account public key.
**********************************************************************
@arcium-hq/reader
/
Functions
getClusterAccAddresses
getClusterAccAddresses(conn): Promise<PublicKey[]>

Returns all Cluster account addresses.

Parameters
Parameter	Type	Description
conn	Connection	The Solana connection object.
Returns
Promise<PublicKey[]>

Array of Cluster account public keys.

**********************************************************************
@arcium-hq/reader
/
Functions
getClusterAccInfo
getClusterAccInfo(arciumProgram, address, commitment?): Promise<{ activation: { activationEpoch: { 0: BN; }; deactivationEpoch: { 0: BN; }; }; authority: PublicKey | null; blsPublicKey: DecodeEnum<{ kind: "enum"; variants: [{ fields: [{ generic: "t"; }]; name: "set"; }, { fields: [{ generic: "t"; }, { vec: "bool"; }]; name: "unset"; }]; }, DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], EmptyDefined>>>; bump: number; clusterSize: number; cuPrice: BN; cuPriceProposals: BN[]; lastUpdatedEpoch: { 0: BN; }; maxCapacity: BN; nodes: object[]; pendingNodes: number[]; tdInfo: { ip: number[]; location: number; peerId: number[]; } | null; }>

Fetches and parses a given Cluster account.

Parameters
Parameter	Type	Description
arciumProgram	Program<Arcium>	The Anchor program instance.
address	PublicKey	The public key of the Cluster account.
commitment?	Commitment	(Optional) RPC commitment level.
Returns
Promise<{ activation: { activationEpoch: { 0: BN; }; deactivationEpoch: { 0: BN; }; }; authority: PublicKey | null; blsPublicKey: DecodeEnum<{ kind: "enum"; variants: [{ fields: [{ generic: "t"; }]; name: "set"; }, { fields: [{ generic: "t"; }, { vec: "bool"; }]; name: "unset"; }]; }, DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], EmptyDefined>>>; bump: number; clusterSize: number; cuPrice: BN; cuPriceProposals: BN[]; lastUpdatedEpoch: { 0: BN; }; maxCapacity: BN; nodes: object[]; pendingNodes: number[]; tdInfo: { ip: number[]; location: number; peerId: number[]; } | null; }>

The ClusterAccount object.
**********************************************************************
@arcium-hq/reader
/
Functions
getCompDefAccAddress
getCompDefAccAddress(mxeProgramId, compDefOffset): PublicKey

Derives the computation definition account address for a given MXE program ID and offset.

Parameters
Parameter	Type	Description
mxeProgramId	PublicKey	The public key of the MXE program.
compDefOffset	number	The computation definition offset as a number.
Returns
PublicKey

The derived computation definition account public key.
**********************************************************************
@arcium-hq/reader
/
Functions
getCompDefAccInfo
getCompDefAccInfo(arciumProgram, address, commitment?): Promise<ComputationDefinitionAccount>

Fetches and parses a given ComputationDefinition account.

Parameters
Parameter	Type	Description
arciumProgram	Program<Arcium>	The Anchor program instance.
address	PublicKey	The public key of the ComputationDefinition account.
commitment?	Commitment	(Optional) RPC commitment level.
Returns
Promise<ComputationDefinitionAccount>

The ComputationDefinitionAccount object.

**********************************************************************

@arcium-hq/reader
/
Functions
getComputationAccAddress
getComputationAccAddress(clusterOffset, computationOffset): PublicKey

Derives the computation account address for a given cluster and computation offset.

Parameters
Parameter	Type	Description
clusterOffset	number	The offset of the cluster this computation will be executed by.
computationOffset	BN	The computation offset as an anchor.BN.
Returns
PublicKey

The derived computation account public key.

**********************************************************************

@arcium-hq/reader
/
Functions
getComputationAccInfo
getComputationAccInfo(arciumProgram, address, commitment?): Promise<ComputationAccount>

Fetches and parses a given Computation account.

Parameters
Parameter	Type	Description
arciumProgram	Program<Arcium>	The Anchor program instance.
address	PublicKey	The public key of the Computation account.
commitment?	Commitment	(Optional) RPC commitment level.
Returns
Promise<ComputationAccount>

The Computation object.

**********************************************************************
@arcium-hq/reader
/
Functions
getComputationOffset
getComputationOffset(tx): BN | undefined

Gets the computation offset from a transaction.

Parameters
Parameter	Type	Description
tx	VersionedTransactionResponse	The transaction to get the computation offset from.
Returns
BN | undefined

The computation offset if one is found, otherwise undefined.

Throws
Error if multiple computation offsets are found in the transaction.
**********************************************************************

@arcium-hq/reader
/
Functions
getComputationsInMempool
getComputationsInMempool(arciumProgram, address): Promise<ComputationReference[][]>

Returns all computation references in the mempool for a given account. Only non-stake computations are included.

Parameters
Parameter	Type	Description
arciumProgram	Program<Arcium>	The Anchor program instance.
address	PublicKey	The public key of the mempool account.
Returns
Promise<ComputationReference[][]>

Array of ComputationReference objects.

**********************************************************************

@arcium-hq/reader
/
Functions
getExecutingPoolAccAddress
getExecutingPoolAccAddress(clusterOffset): PublicKey

Derives the executing pool account address for a given cluster.

Parameters
Parameter	Type	Description
clusterOffset	number	The offset of the cluster.
Returns
PublicKey

The derived executing pool account public key.

**********************************************************************

@arcium-hq/reader
/
Functions
getFeePoolAccAddress
getFeePoolAccAddress(): PublicKey

Derives the fee pool account address.

Returns
PublicKey

The derived fee pool account public key.

**********************************************************************

@arcium-hq/reader
/
Functions
getMempoolAccAddress
getMempoolAccAddress(clusterOffset): PublicKey

Derives the mempool account address for a given cluster.

Parameters
Parameter	Type	Description
clusterOffset	number	The offset of the cluster.
Returns
PublicKey

The derived mempool account public key.

**********************************************************************

@arcium-hq/reader
/
Functions
getMempoolPriorityFeeStats
getMempoolPriorityFeeStats(arciumProgram, mempoolAddress): Promise<MempoolPriorityFeeStats>

Calculates priority fee statistics for computations in a mempool.

Parameters
Parameter	Type	Description
arciumProgram	Program<Arcium>	The Anchor program instance.
mempoolAddress	PublicKey	The public key of the mempool account.
Returns
Promise<MempoolPriorityFeeStats>

Priority fee statistics (mean, median, min, max, count).

**********************************************************************

@arcium-hq/reader
/
Functions
getMXEAccAddress
getMXEAccAddress(mxeProgramId): PublicKey

Derives the MXE account address for a given MXE program ID.

Parameters
Parameter	Type	Description
mxeProgramId	PublicKey	The public key of the MXE program.
Returns
PublicKey

The derived MXE account public key.

**********************************************************************
@arcium-hq/reader
/
Functions
getMXEAccAddresses
getMXEAccAddresses(conn): Promise<PublicKey[]>

Returns all MXE account addresses.

Parameters
Parameter	Type	Description
conn	Connection	The Solana connection object.
Returns
Promise<PublicKey[]>

Array of MXE account public keys.

**********************************************************************
@arcium-hq/reader
/
Functions
getMXEAccInfo
getMXEAccInfo(arciumProgram, address, commitment?): Promise<{ authority: PublicKey | null; bump: number; cluster: number | null; computationDefinitions: number[]; fallbackClusters: number[]; keygenOffset: BN; keyRecoveryInitOffset: BN; mxeProgramId: PublicKey; rejectedClusters: number[]; status: DecodeEnum<{ kind: "enum"; variants: [{ name: "active"; }, { name: "recovery"; }]; }, DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], EmptyDefined>>>; utilityPubkeys: DecodeEnum<{ kind: "enum"; variants: [{ fields: [{ generic: "t"; }]; name: "set"; }, { fields: [{ generic: "t"; }, { vec: "bool"; }]; name: "unset"; }]; }, DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], EmptyDefined>>>; }>

Fetches and parses a given MXE account.

Parameters
Parameter	Type	Description
arciumProgram	Program<Arcium>	The Anchor program instance.
address	PublicKey	The public key of the MXE account.
commitment?	Commitment	(Optional) RPC commitment level.
Returns
Promise<{ authority: PublicKey | null; bump: number; cluster: number | null; computationDefinitions: number[]; fallbackClusters: number[]; keygenOffset: BN; keyRecoveryInitOffset: BN; mxeProgramId: PublicKey; rejectedClusters: number[]; status: DecodeEnum<{ kind: "enum"; variants: [{ name: "active"; }, { name: "recovery"; }]; }, DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], EmptyDefined>>>; utilityPubkeys: DecodeEnum<{ kind: "enum"; variants: [{ fields: [{ generic: "t"; }]; name: "set"; }, { fields: [{ generic: "t"; }, { vec: "bool"; }]; name: "unset"; }]; }, DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], DecodedHelper<[{ name: "abortReason"; type: { kind: "enum"; variants: [{ name: "invalidMac"; }, { name: "expectedSentShare"; }, { name: "expectedFieldElement"; }, { name: "expectedAbort"; }, { name: "malformedData"; }, { name: "computationFailed"; }, { name: "internalError"; }, { name: "preprocessingStreamError"; }, { name: "divisionByZero"; }]; }; }, { name: "acccountAccessInfo"; repr: { kind: "c"; }; serialization: "bytemuck"; type: { fields: [{ name: "inner"; type: "u16"; }]; kind: "struct"; }; }, { name: "accountArgument"; type: { fields: [{ name: "pubkey"; type: "pubkey"; }, { name: "offset"; type: "u32"; }, { name: "length"; type: "u32"; }]; kind: "struct"; }; }], EmptyDefined>>>; }>

The MXEAccount object.


**********************************************************************
@arcium-hq/reader
/
Functions
getMxeRecoveryAccInfo
getMxeRecoveryAccInfo(arciumProgram, address, commitment?): Promise<{ backupMxePubkey: PublicKey; bitmap: number[]; bump: number; isFinalized: number; keyRecoveryFinalizeOffset: BN; originalMxePubkey: PublicKey; padding1: number[]; padding2: number[]; shares: number[][][]; }>

Fetches and parses a given MxeRecovery account.

Parameters
Parameter	Type	Description
arciumProgram	Program<Arcium>	The Anchor program instance.
address	PublicKey	The public key of the MxeRecovery account.
commitment?	Commitment	(Optional) RPC commitment level.
Returns
Promise<{ backupMxePubkey: PublicKey; bitmap: number[]; bump: number; isFinalized: number; keyRecoveryFinalizeOffset: BN; originalMxePubkey: PublicKey; padding1: number[]; padding2: number[]; shares: number[][][]; }>

The MxeRecoveryAccount object.

**********************************************************************
@arcium-hq/reader
/
Functions
getRecoveryPeersAccInfo
getRecoveryPeersAccInfo(arciumProgram, address, commitment?): Promise<{ bump: number; padding: number[]; recoveryKeyMaterial: { blsSig: number[]; encryptedMxeKeys: number[][]; keyMaterialHash: number[]; nonce: number[]; recoveryKeyshares: number[][][]; status: number; }; recoveryPeers: number[]; }>

Fetches and parses a given RecoveryPeers account.

Parameters
Parameter	Type	Description
arciumProgram	Program<Arcium>	The Anchor program instance.
address	PublicKey	The public key of the RecoveryPeers account.
commitment?	Commitment	(Optional) RPC commitment level.
Returns
Promise<{ bump: number; padding: number[]; recoveryKeyMaterial: { blsSig: number[]; encryptedMxeKeys: number[][]; keyMaterialHash: number[]; nonce: number[]; recoveryKeyshares: number[][][]; status: number; }; recoveryPeers: number[]; }>

The RecoveryPeersAccount object.

**********************************************************************
@arcium-hq/reader
/
Functions
subscribeComputations
subscribeComputations(conn, mxeProgramId, callback): Promise<number>

Subscribes to computation-related events for a given MXE program ID.

Parameters
Parameter	Type	Description
conn	Connection	The Solana connection object.
mxeProgramId	PublicKey	The public key of the MXE program.
callback	(event, name) => void	Callback function to handle each computation event and its name.
Returns
Promise<number>

The subscription ID for the logs listener.

**********************************************************************
@arcium-hq/reader
/
Functions
unsubscribeComputations
unsubscribeComputations(conn, subscriptionId): Promise<void>

Unsubscribes from computation-related events using the subscription ID.

Parameters
Parameter	Type	Description
conn	Connection	The Solana connection object.
subscriptionId	number	The subscription ID returned by subscribeComputations.
Returns
Promise<void>

**********************************************************************
@arcium-hq/reader
/
Type aliases
ArciumEvent
ArciumEvent = anchor.IdlEvents<ArciumIdlType>

All events emitted by the Arcium program, keyed by event name.

**********************************************************************
@arcium-hq/reader
/
Type aliases
ArciumEventData
ArciumEventData = ArciumEvent[keyof ArciumEvent]

Data structure for any Arcium event, as parsed from logs.


**********************************************************************
@arcium-hq/reader
/
Type aliases
ArciumEventName
ArciumEventName = Capitalize<keyof ArciumEvent>

Capitalized event names, matching the format as emitted by the program.


**********************************************************************
@arcium-hq/reader
/
Type aliases
ArciumInstructionName
ArciumInstructionName = ArciumIdlType["instructions"][number]["name"]

Valid instruction names from the Arcium IDL.


**********************************************************************
@arcium-hq/reader
/
Type aliases
ArciumTypes
ArciumTypes = anchor.IdlTypes<ArciumIdlType>

Arcium IDL types derived from the Arcium program interface.


**********************************************************************
@arcium-hq/reader
/
Type aliases
ArxNodeAccount
ArxNodeAccount = ArciumTypes["arxNode"]

ArxNode account data structure for individual computation nodes.

Type Structure

{
  bump: number;
  clusterMemberships: number[];
  config: {
    allowedAuthorities: PublicKey[];
    maxClusterMemberships: number;
    supportedProtocols: "CERBERUS" | "MANTICORE";
  };
  cuCapacityClaim: BN;
  encryptionPubkey: number[];
  isActive: boolean;
  metadata: {
    ip: number[];
    location: number;
    peerId: number[];
  };
  primaryStakingAccount: PublicKey;
  proposedClusterMemberships: number[];
  reliability: {
    cheating: BN;
    nonParticipation: BN;
    successfulComputations: BN;
  };
  specs: {
    keyManagementTee: {
      modelName: string;
      identity: PublicKey;
      codeHash: number[];
      measurement: number[];
      timestamp: BN;
      attestation: number[];
      signature: number[];
      certificate: number[];
    } | null;
    mxeProcessors: number;
  };
}
Note: BN is the Anchor's BigNumber type.
**********************************************************************
@arcium-hq/reader
/
Type aliases
CallbackComputationIx
CallbackComputationIx = ArciumIdlType["instructions"]["3"]

Callback computation instruction type from the Arcium IDL.


**********************************************************************
@arcium-hq/reader
/
Type aliases
ClusterAccount
ClusterAccount = ArciumTypes["cluster"]

Cluster account data structure containing node information.

Type Structure

{
  activation: {
    activationEpoch: number;
    deactivationEpoch: number;
  };
  authority: PublicKey | null;
  bump: number;
  compositionRules: {
    keyManagementTeeModel: string | null;
    maxProtocolParticipants: number | null;
    minProtocolParticipants: number | null;
    supportedProtocols: ("CERBERUS" | "MANTICORE")[] | null;
  } | null;
  cuPrice: BN;
  cuPriceProposals: BN[];
  lastUpdatedEpoch: number;
  maxCapacity: BN;
  maxSize: number;
  mxes: PublicKey[];
  nodes: {
    epochJoined: number;
    nodePda: PublicKey;
  }[];
  pendingNodes: {
    epochJoined: number;
    nodePda: PublicKey;
  }[];
}
Note: BN is the Anchor's BigNumber type.
**********************************************************************
@arcium-hq/reader
/
Type aliases
ComputationAccount
ComputationAccount = ArciumTypes["computationAccount"]

Computation account data structure tracking computation state.

Type Structure

{
  arguments: "PlaintextBool" | "PlaintextU8" | "PlaintextU16" | "PlaintextU32" | "PlaintextU64" | "PlaintextU128" | "PlaintextFloat" | "EncryptedBool" | "EncryptedU8" | "EncryptedU16" | "EncryptedU32" | "EncryptedU64" | "EncryptedU128" | "EncryptedFloat" | "ArcisPubkey" | "ArcisSignature" | "Account" | "ManticoreAlgo" | "InputDataset";
  bump: number;
  callbackAccs: object[];
  callbackUrl: string | null;
  clusterIndex: number | null;
  computationDefinitionOffset: number;
  executionFee: {
    baseFee: BN;
    inputDeliveryFee: BN;
    outputDeliveryFee: BN;
    priorityFee: BN;
  };
  payer: PublicKey;
  slot: BN;
  slotCounter: number;
  status: "queued" | "executed" | "finalized";
}
Note: BN is the Anchor's BigNumber type.
**********************************************************************
@arcium-hq/reader
/
Type aliases
ComputationDefinitionAccount
ComputationDefinitionAccount = ArciumTypes["computationDefinitionAccount"]

Computation definition account containing circuit configuration.

Type Structure

{
  bump: number;
  circuitSource: {
    Local: {
      MxeKeygen: {};
    } | OnChain: { 
      isCompleted: boolean;
      uploadAuth: PublicKey;
    } | OffChain: {
      source: string;
      hash: number[];
    }
  };
  cuAmount: BN;
  definition: {
    callbackDiscriminator: number[];
    circuitLen: number;
    signature: {
      outputs: "PlaintextBool" | "PlaintextU8" | "PlaintextU16" | "PlaintextU32" | "PlaintextU64" | "PlaintextU128" | "Ciphertext" | "ArcisPubkey" | "PlaintextFloat";
      parameters: "PlaintextBool" | "PlaintextU8" | "PlaintextU16" | "PlaintextU32" | "PlaintextU64" | "PlaintextU128" | "Ciphertext" | "ArcisPubkey" | "PlaintextFloat";
    };
  };
  finalizationAuthority: PublicKey | null;
  finalizeDuringCallback: boolean;
}
Note: BN is the Anchor's BigNumber type.
**********************************************************************
@arcium-hq/reader
/
Type aliases
ComputationReference
ComputationReference = ArciumTypes["computationReference"]

Reference to a computation in a mempool or executing pool.

Type Structure

{
  computationDefinitionOffset: number;
  computationOffset: BN;
  priorityFee: BN;
}
Note: BN is the Anchor's BigNumber type.
**********************************************************************
@arcium-hq/reader
/
Type aliases
ComputationStatus
ComputationStatus = "queued" | "executing" | "executed" | "finalized" | "failed"

Status values for a computation, as defined by the Arcium protocol.


**********************************************************************
@arcium-hq/reader
/
Type aliases
Connection
Connection = anchor.web3.Connection

Solana Connection type alias for convenience.

**********************************************************************
@arcium-hq/reader
/
Type aliases
MXEAccount
MXEAccount = ArciumTypes["mxeAccount"]

MXE (Multi-party eXecution Environment) account data structure.

Type Structure

{
  authority: PublicKey | null;
  bump: number;
  cluster: number;
  computationDefinitions: number[];
  fallbackClusters: number[];
  x25519Pubkey: {
    Set: number[];
  } | {
    Unset: [number[], boolean[]];
  };
}
Note: BN is the Anchor's BigNumber type.

**********************************************************************

@arcium-hq/reader
/
Type aliases
MxeRecoveryAccount
MxeRecoveryAccount = ArciumTypes["mxeRecoveryAccount"]

MXE recovery account data structure tracking key recovery session state.


**********************************************************************
@arcium-hq/reader
/
Type aliases
Program
Program<T> = anchor.Program<T>

Anchor Program type alias with generic IDL support.

Type Parameters
Type Parameter
T extends anchor.Idl

**********************************************************************
@arcium-hq/reader
/
Type aliases
PublicKey
PublicKey = anchor.web3.PublicKey

Solana PublicKey type alias for convenience.


**********************************************************************
@arcium-hq/reader
/
Type aliases
QueueComputationIx
QueueComputationIx = ArciumIdlType["instructions"]["34"]

Queue computation instruction type from the Arcium IDL.


**********************************************************************
@arcium-hq/reader
/
Type aliases
RecoveryPeersAccount
RecoveryPeersAccount = ArciumTypes["recoveryPeersAccount"]

Recovery peers account data structure containing recovery peers information.

**********************************************************************


**********************************************************************

**********************************************************************