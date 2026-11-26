/*
 * Wire protocol for sending photos from one device to another (SPEC V45-V49).
 * Everything received here comes from another device and is treated as
 * untrusted: shapes, sizes and types are checked before anything is kept.
 */

export const PROTOCOL_VERSION = 1
export const CHUNK_BYTES = 64 * 1024
export const MAX_FILE_BYTES = 40 * 1024 * 1024
export const MAX_FILES = 60
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const ID_PREFIX = 'ig-'
const ID_BODY = /^[a-z0-9]{24}$/
const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** A one-time address for a receiving device. Unguessable: about 124 bits. */
export function newTransferId(
  random: (bytes: Uint8Array<ArrayBuffer>) => void = fillRandom
): string {
  const bytes = new Uint8Array(24)
  random(bytes)
  let body = ''
  // 252 is the largest multiple of 36 under 256; reject above it to avoid bias.
  for (let i = 0; body.length < 24; i = (i + 1) % bytes.length) {
    if (i === 0 && body.length > 0) random(bytes)
    if (bytes[i] < 252) body += ID_ALPHABET[bytes[i] % 36]
  }
  return ID_PREFIX + body
}

function fillRandom(bytes: Uint8Array<ArrayBuffer>) {
  crypto.getRandomValues(bytes)
}

export function isTransferId(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(ID_PREFIX) && ID_BODY.test(value.slice(3))
}

const HASH_KEY = '#send='

/** Link the sending device opens. `base` is the app's own address without a hash. */
export function sendUrl(base: string, id: string): string {
  return `${base.split('#')[0]}${HASH_KEY}${id}`
}

/** The transfer id in a location hash, or null when the hash is not a valid send link. */
export function parseSendHash(hash: string): string | null {
  if (!hash.startsWith(HASH_KEY)) return null
  const id = hash.slice(HASH_KEY.length)
  return isTransferId(id) ? id : null
}

/* ---------- Messages ---------- */

export type SenderMessage =
  | { t: 'hello'; v: number; count: number }
  | { t: 'file'; id: number; name: string; type: string; size: number }
  | { t: 'chunk'; id: number; i: number; data: ArrayBuffer }
  | { t: 'end'; id: number }
  | { t: 'done' }

export type ReceiverMessage =
  | { t: 'ready'; v: number }
  | { t: 'ack'; id: number; ok: boolean; reason?: RejectReason }
  | { t: 'bye'; accepted: number; rejected: number }

export type RejectReason = 'type' | 'size' | 'limit' | 'corrupt' | 'storage'

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0

function toArrayBuffer(value: unknown): ArrayBuffer | null {
  if (value instanceof ArrayBuffer) return value
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
  }
  return null
}

/** Validate something received from a sender. Returns null for anything malformed. */
export function parseSenderMessage(data: unknown): SenderMessage | null {
  if (!isRecord(data)) return null
  switch (data.t) {
    case 'hello':
      return isCount(data.v) && isCount(data.count)
        ? { t: 'hello', v: data.v, count: data.count }
        : null
    case 'file':
      return isCount(data.id) &&
        typeof data.name === 'string' &&
        typeof data.type === 'string' &&
        isCount(data.size)
        ? { t: 'file', id: data.id, name: data.name, type: data.type, size: data.size }
        : null
    case 'chunk': {
      const buffer = toArrayBuffer(data.data)
      return isCount(data.id) && isCount(data.i) && buffer
        ? { t: 'chunk', id: data.id, i: data.i, data: buffer }
        : null
    }
    case 'end':
      return isCount(data.id) ? { t: 'end', id: data.id } : null
    case 'done':
      return { t: 'done' }
    default:
      return null
  }
}

export function parseReceiverMessage(data: unknown): ReceiverMessage | null {
  if (!isRecord(data)) return null
  switch (data.t) {
    case 'ready':
      return isCount(data.v) ? { t: 'ready', v: data.v } : null
    case 'ack':
      return isCount(data.id) && typeof data.ok === 'boolean'
        ? { t: 'ack', id: data.id, ok: data.ok, reason: data.reason as RejectReason | undefined }
        : null
    case 'bye':
      return isCount(data.accepted) && isCount(data.rejected)
        ? { t: 'bye', accepted: data.accepted, rejected: data.rejected }
        : null
    default:
      return null
  }
}

export const chunkCount = (size: number) => Math.max(1, Math.ceil(size / CHUNK_BYTES))

/** Keep a file name harmless: no path parts, no control characters, bounded length. */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const clean = [...base]
    .filter((ch) => {
      const code = ch.charCodeAt(0)
      return code > 31 && code !== 127
    })
    .join('')
    .trim()
    .slice(0, 120)
  return clean || 'photo'
}

/** Why a file announced by a sender cannot be accepted, or null when it can. */
export function rejectAnnounced(
  file: { type: string; size: number },
  alreadyAccepted: number
): RejectReason | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return 'type'
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) return 'size'
  if (alreadyAccepted >= MAX_FILES) return 'limit'
  return null
}

/**
 * Collects the chunks of one incoming file. Chunks must arrive in order and
 * may never add up to more than the announced size.
 */
export class FileAssembler {
  private parts: ArrayBuffer[] = []
  private received = 0
  private failed = false
  readonly name: string
  readonly type: string
  readonly size: number

  constructor(file: { name: string; type: string; size: number }) {
    this.name = file.name
    this.type = file.type
    this.size = file.size
  }

  /** Add the next chunk. Returns false, and poisons the file, on any inconsistency. */
  add(index: number, data: ArrayBuffer): boolean {
    if (this.failed) return false
    const expected = this.parts.length
    if (index !== expected || data.byteLength === 0 || data.byteLength > CHUNK_BYTES) {
      this.failed = true
    } else if (this.received + data.byteLength > this.size) {
      this.failed = true
    } else {
      this.parts.push(data)
      this.received += data.byteLength
    }
    if (this.failed) this.parts = []
    return !this.failed
  }

  /** The finished file, or null when bytes are missing or the file was poisoned. */
  finish(): File | null {
    if (this.failed || this.received !== this.size) return null
    return new File(this.parts, safeFileName(this.name), { type: this.type })
  }
}

export const REJECT_TEXT: Record<RejectReason, string> = {
  type: 'not a JPG, PNG or WEBP',
  size: 'larger than 40 MB',
  limit: `more than ${MAX_FILES} photos at once`,
  corrupt: 'damaged on the way',
  storage: 'could not be saved on the other device',
}
