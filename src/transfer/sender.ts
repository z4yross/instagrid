import type { DataConnection, Peer } from 'peerjs'
import { CHUNK_BYTES, parseReceiverMessage, PROTOCOL_VERSION, safeFileName } from './protocol'
import type { RejectReason, SenderMessage } from './protocol'

/* Sending side of a device-to-device transfer (SPEC V45-V49). */

export interface SendProgress {
  /** Files fully handled (accepted or refused) by the other device. */
  done: number
  total: number
}

export interface SendResult {
  accepted: number
  refused: { name: string; reason: RejectReason }[]
}

export class TransferError extends Error {}

const CONNECT_TIMEOUT_MS = 25_000
const ACK_TIMEOUT_MS = 60_000
/** Pause sending while this much is still queued on the channel. */
const BUFFER_HIGH_WATER = 1024 * 1024

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function connect(peer: Peer, id: string): Promise<DataConnection> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new TransferError('The other device did not answer. Is its window still open?')),
      CONNECT_TIMEOUT_MS
    )
    const fail = (message: string) => {
      clearTimeout(timer)
      reject(new TransferError(message))
    }

    peer.on('error', (error) => {
      if (error.type === 'peer-unavailable') {
        fail(
          'The other device is not waiting any more. Open "From phone" there and scan the new code.'
        )
      } else if (error.type === 'browser-incompatible') {
        fail('This browser cannot send photos to another device.')
      } else {
        fail(
          'Could not reach the connection service. Check your internet connection and try again.'
        )
      }
    })

    peer.on('open', () => {
      const connection = peer.connect(id, { reliable: true })
      connection.on('error', () => fail('The connection to the other device failed.'))
      // The receiver says it is ready before any photo is sent.
      connection.on('data', function onReady(raw) {
        const message = parseReceiverMessage(raw)
        if (message?.t !== 'ready') return
        connection.off('data', onReady)
        clearTimeout(timer)
        if (message.v !== PROTOCOL_VERSION) {
          fail('The two devices run different versions. Reload the page on both and try again.')
        } else {
          resolve(connection)
        }
      })
    })
  })
}

/** Send photos to the device waiting at `id`. Rejects with TransferError on failure. */
export async function sendFiles(
  id: string,
  files: readonly File[],
  onProgress: (progress: SendProgress) => void
): Promise<SendResult> {
  const { Peer: PeerClass } = await import('peerjs')
  const peer = new PeerClass()
  const result: SendResult = { accepted: 0, refused: [] }
  const total = files.length
  onProgress({ done: 0, total })

  try {
    const connection = await connect(peer, id)
    const send = (message: SenderMessage) => connection.send(message)

    // Acks arrive out of band; each file waits for its own.
    const pending = new Map<number, (ack: { ok: boolean; reason?: RejectReason }) => void>()
    let closedEarly = false
    connection.on('data', (raw) => {
      const message = parseReceiverMessage(raw)
      if (message?.t === 'ack') pending.get(message.id)?.(message)
    })
    connection.on('close', () => {
      closedEarly = true
      for (const settle of pending.values()) settle({ ok: false, reason: 'corrupt' })
    })

    await send({ t: 'hello', v: PROTOCOL_VERSION, count: total })

    for (const [index, file] of files.entries()) {
      if (closedEarly) throw new TransferError('The other device closed the connection.')
      const name = safeFileName(file.name)

      const ack = new Promise<{ ok: boolean; reason?: RejectReason }>((resolve) => {
        const timer = setTimeout(() => resolve({ ok: false, reason: 'corrupt' }), ACK_TIMEOUT_MS)
        pending.set(index, (value) => {
          clearTimeout(timer)
          resolve(value)
        })
      })

      await send({ t: 'file', id: index, name, type: file.type, size: file.size })
      const buffer = await file.arrayBuffer()
      for (let offset = 0, i = 0; offset < buffer.byteLength; offset += CHUNK_BYTES, i++) {
        while (connection.dataChannel.bufferedAmount > BUFFER_HIGH_WATER) await wait(20)
        await send({ t: 'chunk', id: index, i, data: buffer.slice(offset, offset + CHUNK_BYTES) })
      }
      await send({ t: 'end', id: index })

      const outcome = await ack
      pending.delete(index)
      if (outcome.ok) result.accepted++
      else result.refused.push({ name, reason: outcome.reason ?? 'corrupt' })
      onProgress({ done: index + 1, total })
    }

    await send({ t: 'done' })
    // Let the last messages leave before the connection closes.
    await wait(300)
    return result
  } finally {
    peer.destroy()
  }
}
