/**
 * tron-signing.ts
 *
 * Raw TRON transaction building + secp256k1 signing without TronWeb.
 * Uses TronGrid REST API to build transactions and `elliptic` (already
 * in node_modules as a TronWeb transitive dependency) for signing.
 *
 * This completely bypasses TronWeb's "Invalid private key" validation.
 */

import axios from 'axios';
import { ec as EC } from 'elliptic';
const ec = new EC('secp256k1');

// ─── Address helpers ────────────────────────────────────────────────────────

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Decode a TRON base58check address to a Buffer.
 * TRON addresses are 25 bytes: 0x41 (1) + address (20) + checksum (4).
 */
function base58Decode(str: string): Buffer {
  let n = BigInt(0);
  for (const ch of str) {
    const digit = BASE58_ALPHABET.indexOf(ch);
    if (digit < 0) throw new Error(`Invalid base58 character: ${ch}`);
    n = n * BigInt(58) + BigInt(digit);
  }
  // 25 bytes = 50 hex chars
  return Buffer.from(n.toString(16).padStart(50, '0'), 'hex');
}

/**
 * Convert a TRON base58 address to its 32-byte ABI-padded hex form.
 * ABI encoding of address: 12 zero bytes + 20-byte address = 32 bytes.
 * The 20 bytes come from the decoded address minus the 0x41 prefix.
 */
function tronAddressToAbi32(address: string): string {
  const decoded = base58Decode(address); // 25 bytes
  const addr20 = decoded.slice(1, 21);   // bytes 1-20 (skip 0x41, skip checksum)
  return '000000000000000000000000' + Buffer.from(addr20).toString('hex');
}

// ─── ABI encoding ───────────────────────────────────────────────────────────

/**
 * ABI-encode parameters for ERC-20/TRC-20 transfer(address,uint256).
 * Returns 128-char hex string (two 32-byte params).
 */
function encodeTransferParams(toAddress: string, amountSun: number | bigint): string {
  const addrParam   = tronAddressToAbi32(toAddress);                          // 64 hex chars
  const amountParam = BigInt(amountSun).toString(16).padStart(64, '0');       // 64 hex chars
  return addrParam + amountParam;
}

// ─── Signing ────────────────────────────────────────────────────────────────

/**
 * Sign a TRON transaction using secp256k1.
 * txID is already the SHA-256 hash of raw_data_hex — no re-hashing needed.
 * Returns 65-byte signature as hex: r (32) + s (32) + v (1).
 */
export function signTronTx(txID: string, privateKeyHex: string): string {
  const keyPair = ec.keyFromPrivate(privateKeyHex, 'hex');
  const msgHash = Buffer.from(txID, 'hex');
  const sig     = keyPair.sign(msgHash, { canonical: true });

  const r = sig.r.toString('hex').padStart(64, '0');
  const s = sig.s.toString('hex').padStart(64, '0');
  const v = (sig.recoveryParam as number).toString(16).padStart(2, '0');

  return r + s + v;
}

// ─── Transaction pipelines ──────────────────────────────────────────────────

/**
 * Build, sign, and broadcast a USDT TRC-20 transfer.
 *
 *  1. POST /wallet/triggersmartcontract → unsigned transaction
 *  2. Sign txID with secp256k1
 *  3. POST /wallet/broadcasttransaction → txID on success
 *
 * No TronWeb involved — no "Invalid private key" errors possible.
 */
export async function sendUsdtRaw(
  fromAddress:   string,
  toAddress:     string,
  amountSun:     number,
  privateKeyHex: string,
  usdtContract:  string,
  baseUrl:       string,
  apiKey:        string
): Promise<string> {
  // 1. Build
  const { data: buildData } = await axios.post(
    `${baseUrl}/wallet/triggersmartcontract`,
    {
      owner_address:     fromAddress,
      contract_address:  usdtContract,
      function_selector: 'transfer(address,uint256)',
      parameter:         encodeTransferParams(toAddress, amountSun),
      fee_limit:         50_000_000,
      call_value:        0,
      visible:           true,
    },
    { headers: { 'TRON-PRO-API-KEY': apiKey }, timeout: 15_000 }
  );

  const tx = buildData?.transaction;
  if (!tx?.txID) {
    throw new Error(`triggersmartcontract failed: ${JSON.stringify(buildData)}`);
  }

  // 2. Sign
  const signature = signTronTx(tx.txID, privateKeyHex);
  const signedTx  = { ...tx, signature: [signature] };

  // 3. Broadcast
  const { data: bcast } = await axios.post(
    `${baseUrl}/wallet/broadcasttransaction`,
    signedTx,
    { headers: { 'TRON-PRO-API-KEY': apiKey }, timeout: 15_000 }
  );

  if (!bcast?.result) {
    throw new Error(`USDT broadcast failed: ${JSON.stringify(bcast)}`);
  }

  return tx.txID as string;
}

/**
 * Build, sign, and broadcast a TRX transfer.
 *
 *  1. POST /wallet/createtransaction → unsigned transaction
 *  2. Sign txID with secp256k1
 *  3. POST /wallet/broadcasttransaction → txID on success
 */
export async function sendTrxRaw(
  fromAddress:   string,
  toAddress:     string,
  amountSun:     number,
  privateKeyHex: string,
  baseUrl:       string,
  apiKey:        string
): Promise<string> {
  // 1. Build
  const { data: tx } = await axios.post(
    `${baseUrl}/wallet/createtransaction`,
    {
      owner_address: fromAddress,
      to_address:    toAddress,
      amount:        amountSun,
      visible:       true,
    },
    { headers: { 'TRON-PRO-API-KEY': apiKey }, timeout: 15_000 }
  );

  if (!tx?.txID) {
    throw new Error(`createtransaction failed: ${JSON.stringify(tx)}`);
  }

  // 2. Sign
  const signature = signTronTx(tx.txID, privateKeyHex);
  const signedTx  = { ...tx, signature: [signature] };

  // 3. Broadcast
  const { data: bcast } = await axios.post(
    `${baseUrl}/wallet/broadcasttransaction`,
    signedTx,
    { headers: { 'TRON-PRO-API-KEY': apiKey }, timeout: 15_000 }
  );

  if (!bcast?.result) {
    throw new Error(`TRX broadcast failed: ${JSON.stringify(bcast)}`);
  }

  return tx.txID as string;
}
