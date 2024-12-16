import CryptoJS from 'crypto-js'

// Type definitions
interface WotsAddr {
  [key: string]: number[]
}

// Extend prototypes safely in TypeScript
declare global {
  interface String {
    hexToByteArray(): number[]
    toBytes(): number[]
  }
  interface Array<T> {
    toASCII(): string
    pushArray(arr: T[]): void
  }
}

// Prototype extensions
if (typeof String.prototype.hexToByteArray !== 'function') {
  String.prototype.hexToByteArray = function(this: string): number[] {
    const result: number[] = []
    for (let i = 0; i < this.length; i += 2) {
      result.push(parseInt(this.substr(i, 2), 16))
    }
    return result
  }
}

if (typeof String.prototype.toBytes !== 'function') {
  String.prototype.toBytes = function(this: string): number[] {
    const return_bytes: number[] = []
    for (let i = 0; i < this.length; i++) {
      return_bytes.push(this.charCodeAt(i))
    }
    return return_bytes
  }
}

if (typeof Array.prototype.toASCII !== 'function') {
  Array.prototype.toASCII = function(this: number[]): string {
    return this.map(byte => String.fromCharCode(byte)).join('')
  }
}

if (typeof Array.prototype.pushArray !== 'function') {
  Array.prototype.pushArray = function<T>(this: T[], arr: T[]): void {
    this.push.apply(this, arr)
  }
}

// Constants
const PARAMSN = 32
const WOTSW = 16
const WOTSLOGW = 4
const WOTSLEN1 = (8 * PARAMSN / WOTSLOGW)
const WOTSLEN2 = 3
const WOTSLEN = WOTSLEN1 + WOTSLEN2

const XMSS_HASH_PADDING_F = 0
const XMSS_HASH_PADDING_PRF = 3

// Add type declarations for sha256
declare global {
  interface Sha256Function extends Function {
    h?: number[]
    k?: number[]
  }
}

export const sha256: Sha256Function = function(r: string): number[] {
  return CryptoJS.SHA256(r).toString().hexToByteArray()
}

// Core WOTS functions
export function wots_public_key_gen(seed: number[], pub_seed: number[], addr_bytes: number[]): number[] {
  const addr = bytes_to_addr(addr_bytes)
  const private_key = expand_seed(seed)
  const cache_pk: number[] = []
  
  for (let i = 0; i < WOTSLEN; i++) {
    set_chain_addr(i, addr)
    const priv_key_portion = private_key.slice(i * PARAMSN, PARAMSN + i * PARAMSN)
    const array_to_push = gen_chain(priv_key_portion, 0, WOTSW - 1, pub_seed, addr)
    cache_pk.pushArray(array_to_push)
  }
  return cache_pk
}

export function wots_sign(msg: number[], seed: number[], pub_seed: number[], addr_bytes: number[]): number[] {
  const addr = bytes_to_addr(addr_bytes)
  const lengths = chain_lenghts(msg)
  const signature: number[] = []
  const private_key = expand_seed(seed)

  for (let i = 0; i < WOTSLEN; i++) {
    set_chain_addr(i, addr)
    const priv_key_portion = private_key.slice(i * PARAMSN, PARAMSN + i * PARAMSN)
    const array_to_push = gen_chain(priv_key_portion, 0, lengths[i], pub_seed, addr)
    signature.pushArray(array_to_push)
  }
  return signature
}

export function wots_publickey_from_sig(sig: number[], msg: number[], pub_seed: number[], addr_bytes: number[]): number[] {
  const addr = bytes_to_addr(addr_bytes)
  const lengths = chain_lenghts(msg)
  const public_key: number[] = []
  
  for (let i = 0; i < WOTSLEN; i++) {
    set_chain_addr(i, addr)
    const signature_portion = sig.slice(i * PARAMSN, PARAMSN + i * PARAMSN)
    public_key.pushArray(gen_chain(signature_portion, lengths[i], WOTSW - 1 - lengths[i], pub_seed, addr))
  }
  return public_key
}

// Helper functions
function expand_seed(seed: number[]): number[] {
  const out_seeds: number[] = []
  for (let i = 0; i < WOTSLEN; i++) {
    const ctr = ull_to_bytes(PARAMSN, [i])
    out_seeds.pushArray(prf(ctr, seed))
  }
  return out_seeds
}

export function ull_to_bytes(outlen: number, input: number[]): number[] {
  const out_array: number[] = []
  for (let i = outlen - 1; i >= 0; i--) {
    const to_push = input[i]
    out_array.push(to_push === undefined ? 0 : to_push)
  }
  return out_array
}

function prf(input: number[], key: number[]): number[] {
  const buf: number[] = []
  buf.pushArray(ull_to_bytes(PARAMSN, [XMSS_HASH_PADDING_PRF]))
  buf.pushArray(byte_copy(key, PARAMSN))
  buf.pushArray(byte_copy(input, 32))
  return sha256(buf.toASCII())
}

function t_hash(input: number[], pub_seed: number[], addr: WotsAddr): number[] {
  const buf = ull_to_bytes(PARAMSN, [XMSS_HASH_PADDING_F])
  
  set_key_and_mask(0, addr)
  const addr_as_bytes = addr_to_bytes(addr)
  buf.pushArray(prf(addr_as_bytes, pub_seed))
  
  set_key_and_mask(1, addr)
  const bitmask = prf(addr_to_bytes(addr), pub_seed)
  
  const XOR_bitmask_input: number[] = []
  for (let i = 0; i < PARAMSN; i++) {
    XOR_bitmask_input.push(input[i] ^ bitmask[i])
  }
  buf.pushArray(XOR_bitmask_input)
  return sha256(buf.toASCII())
}

export function byte_copy(source: number[], num_bytes: number): number[] {
  const output: number[] = []
  for (let i = 0; i < num_bytes; i++) {
    output.push(source[i] === undefined ? 0 : source[i])
  }
  return output
}

function gen_chain(input: number[], start: number, steps: number, pub_seed: number[], addr: WotsAddr): number[] {
  const out = byte_copy(input, PARAMSN)
  for (let i = start; i < (start + steps) && i < WOTSW; i++) {
    set_hash_addr(i, addr)
    const hash_result = t_hash(out, pub_seed, addr)
    out.splice(0, out.length, ...hash_result)
  }
  return out
}

function base_w(outlen: number, input: number[]): number[] {
  let in_ = 0
  let out = 0
  let total: number
  let bits = 0
  const output: number[] = []
  
  for (let consumed = 0; consumed < outlen; consumed++) {
    if (bits === 0) {
      total = input[in_]
      in_++
      bits += 8
    }
    bits -= WOTSLOGW
    output[out] = (total! >> bits) & (WOTSW - 1)
    out++
  }
  return output
}

function wots_checksum(msg_base_w: number[]): number[] {
  let csum = 0
  for (let i = 0; i < WOTSLEN1; i++) {
    csum += WOTSW - 1 - msg_base_w[i]
  }
  csum = csum << (8 - ((WOTSLEN2 * WOTSLOGW) % 8))
  const csum_bytes = ull_to_bytes(Math.round((WOTSLEN2 * WOTSLOGW + 7) / 8), from_int_to_byte_array(csum))
  return base_w(WOTSLEN2, csum_bytes)
}

function chain_lenghts(msg: number[]): number[] {
  const lengths = base_w(WOTSLEN1, msg)
  lengths.pushArray(wots_checksum(lengths))
  return lengths
}

// Address manipulation functions
function set_chain_addr(chain_address: number, addr: WotsAddr): void {
  addr["5"] = [0, 0, 0, chain_address]
}

function set_hash_addr(hash: number, addr: WotsAddr): void {
  addr["6"] = [0, 0, 0, hash]
}

function set_key_and_mask(key_and_mask: number, addr: WotsAddr): void {
  addr["7"] = [0, 0, 0, key_and_mask]
}

export function from_int_to_byte_array(long: number): number[] {
  const byteArray = [0, 0, 0, 0, 0, 0, 0, 0]
  for (let index = 0; index < byteArray.length; index++) {
    const byte = long & 0xff
    byteArray[index] = byte
    long = (long - byte) / 256
  }
  return byteArray
}

function addr_to_bytes(addr: WotsAddr): number[] {
  const out_bytes: number[] = []
  for (let i = 0; i < 8; i++) {
    if (addr[i.toString()] === undefined) {
      addr[i.toString()] = [0, 0, 0, 0]
    }
    out_bytes.pushArray(addr[i.toString()])
  }
  return out_bytes
}

function bytes_to_addr(addr_bytes: number[]): WotsAddr {
  const out_addr: WotsAddr = {
    "0": [0, 0, 0, 0], "1": [0, 0, 0, 0], "2": [0, 0, 0, 0], "3": [0, 0, 0, 0],
    "4": [0, 0, 0, 0], "5": [0, 0, 0, 0], "6": [0, 0, 0, 0], "7": [0, 0, 0, 0]
  }
  for (let i = 0; i < 8; i++) {
    out_addr[i.toString()] = ull_to_bytes(4, addr_bytes.slice(i * 4, i * 4 + 4))
  }
  return out_addr
}
