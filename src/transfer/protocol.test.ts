import { describe, expect, it } from 'vitest'
import {
  CHUNK_BYTES,
  chunkCount,
  FileAssembler,
  isTransferId,
  MAX_FILE_BYTES,
  MAX_FILES,
  newTransferId,
  parseReceiverMessage,
  parseSenderMessage,
  parseSendHash,
  rejectAnnounced,
  safeFileName,
  sendUrl,
} from './protocol'

const bytes = (n: number, fill = 7) => new Uint8Array(n).fill(fill).buffer

describe('transfer ids (V46)', () => {
  it('makes distinct, well-formed ids', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newTransferId()))
    expect(ids.size).toBe(200)
    for (const id of ids) expect(isTransferId(id)).toBe(true)
  })

  it('rejects anything that is not an id', () => {
    for (const bad of ['', 'ig-short', 'ig-' + 'A'.repeat(24), 'xx-' + 'a'.repeat(24), 42, null]) {
      expect(isTransferId(bad)).toBe(false)
    }
  })

  it('round-trips through the send link', () => {
    const id = newTransferId()
    const url = sendUrl('https://example.test/app/#old', id)
    expect(url).toBe(`https://example.test/app/#send=${id}`)
    expect(parseSendHash(new URL(url).hash)).toBe(id)
  })

  it('ignores hashes that are not send links', () => {
    expect(parseSendHash('')).toBeNull()
    expect(parseSendHash('#mobile')).toBeNull()
    expect(parseSendHash('#send=<script>')).toBeNull()
    expect(parseSendHash('#send=ig-' + 'a'.repeat(23))).toBeNull()
  })
})

describe('message validation (V48)', () => {
  it('accepts well-formed sender messages', () => {
    expect(parseSenderMessage({ t: 'hello', v: 1, count: 3 })).toEqual({
      t: 'hello',
      v: 1,
      count: 3,
    })
    expect(
      parseSenderMessage({ t: 'file', id: 0, name: 'a.jpg', type: 'image/jpeg', size: 10 })
    ).toEqual({
      t: 'file',
      id: 0,
      name: 'a.jpg',
      type: 'image/jpeg',
      size: 10,
    })
    expect(parseSenderMessage({ t: 'end', id: 2 })).toEqual({ t: 'end', id: 2 })
    expect(parseSenderMessage({ t: 'done' })).toEqual({ t: 'done' })
  })

  it('turns typed arrays into array buffers for chunks', () => {
    const view = new Uint8Array([1, 2, 3, 4]).subarray(1, 3)
    const message = parseSenderMessage({ t: 'chunk', id: 0, i: 0, data: view })
    expect(message?.t).toBe('chunk')
    if (message?.t === 'chunk') expect([...new Uint8Array(message.data)]).toEqual([2, 3])
  })

  it('rejects malformed input', () => {
    const bad = [
      null,
      'hello',
      42,
      {},
      { t: 'nope' },
      { t: 'hello', v: '1', count: 1 },
      { t: 'file', id: -1, name: 'a', type: 'image/png', size: 1 },
      { t: 'file', id: 0, name: 5, type: 'image/png', size: 1 },
      { t: 'chunk', id: 0, i: 0, data: 'text' },
      { t: 'chunk', id: 0.5, i: 0, data: bytes(1) },
    ]
    for (const item of bad) expect(parseSenderMessage(item)).toBeNull()
  })

  it('validates receiver messages', () => {
    expect(parseReceiverMessage({ t: 'ack', id: 1, ok: false, reason: 'type' })).toEqual({
      t: 'ack',
      id: 1,
      ok: false,
      reason: 'type',
    })
    expect(parseReceiverMessage({ t: 'bye', accepted: 2, rejected: 1 })).toEqual({
      t: 'bye',
      accepted: 2,
      rejected: 1,
    })
    expect(parseReceiverMessage({ t: 'ack', id: 1, ok: 'yes' })).toBeNull()
    expect(parseReceiverMessage(undefined)).toBeNull()
  })
})

describe('what a receiver accepts (V48)', () => {
  it('takes JPG, PNG and WEBP within the size limit', () => {
    expect(rejectAnnounced({ type: 'image/jpeg', size: 1000 }, 0)).toBeNull()
    expect(rejectAnnounced({ type: 'image/webp', size: MAX_FILE_BYTES }, 5)).toBeNull()
  })

  it('refuses other types, empty or oversized files, and too many files', () => {
    expect(rejectAnnounced({ type: 'image/svg+xml', size: 10 }, 0)).toBe('type')
    expect(rejectAnnounced({ type: 'text/html', size: 10 }, 0)).toBe('type')
    expect(rejectAnnounced({ type: 'image/png', size: 0 }, 0)).toBe('size')
    expect(rejectAnnounced({ type: 'image/png', size: MAX_FILE_BYTES + 1 }, 0)).toBe('size')
    expect(rejectAnnounced({ type: 'image/png', size: 10 }, MAX_FILES)).toBe('limit')
  })

  it('strips paths and control characters from names', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd')
    expect(safeFileName('C:\\Users\\me\\beach.jpg')).toBe('beach.jpg')
    expect(safeFileName('a\u0000b\n.png')).toBe('ab.png')
    expect(safeFileName('   ')).toBe('photo')
    expect(safeFileName('x'.repeat(500))).toHaveLength(120)
  })
})

describe('file assembly (V48)', () => {
  it('counts chunks', () => {
    expect(chunkCount(1)).toBe(1)
    expect(chunkCount(CHUNK_BYTES)).toBe(1)
    expect(chunkCount(CHUNK_BYTES + 1)).toBe(2)
  })

  it('rebuilds a file from ordered chunks', async () => {
    const size = CHUNK_BYTES + 100
    const assembler = new FileAssembler({ name: 'a.png', type: 'image/png', size })
    expect(assembler.add(0, bytes(CHUNK_BYTES, 1))).toBe(true)
    expect(assembler.add(1, bytes(100, 2))).toBe(true)
    const file = assembler.finish()
    expect(file).not.toBeNull()
    expect(file?.name).toBe('a.png')
    expect(file?.type).toBe('image/png')
    expect(file?.size).toBe(size)
    const data = new Uint8Array(await (file as File).arrayBuffer())
    expect(data[0]).toBe(1)
    expect(data[size - 1]).toBe(2)
  })

  it('refuses chunks out of order', () => {
    const assembler = new FileAssembler({ name: 'a.png', type: 'image/png', size: 200 })
    expect(assembler.add(1, bytes(100))).toBe(false)
    expect(assembler.add(0, bytes(100))).toBe(false)
    expect(assembler.finish()).toBeNull()
  })

  it('refuses more bytes than announced, and oversized chunks', () => {
    const small = new FileAssembler({ name: 'a.png', type: 'image/png', size: 50 })
    expect(small.add(0, bytes(51))).toBe(false)
    const big = new FileAssembler({ name: 'a.png', type: 'image/png', size: CHUNK_BYTES * 3 })
    expect(big.add(0, bytes(CHUNK_BYTES + 1))).toBe(false)
  })

  it('does not finish a file with bytes missing', () => {
    const assembler = new FileAssembler({ name: 'a.png', type: 'image/png', size: 300 })
    assembler.add(0, bytes(100))
    expect(assembler.finish()).toBeNull()
  })
})
