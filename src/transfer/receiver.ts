import type { DataConnection, Peer } from 'peerjs'
import {
  FileAssembler,
  newTransferId,
  parseSenderMessage,
  PROTOCOL_VERSION,
  rejectAnnounced,
  sendUrl,
} from './protocol'
import type { ReceiverMessage, RejectReason } from './protocol'

/*
 * Receiving side of a device-to-device transfer (SPEC V45-V49). The device
 * shows a QR code carrying a one-time address; a phone that opens it connects
 * and streams photos over an encrypted WebRTC data channel.
 */

export type ReceiverState =
  | { status: 'connecting' }
  | { status: 'ready'; url: string }
  | { status: 'receiving'; url: string; done: number; total: number }
  | { status: 'finished'; url: string; accepted: number; rejected: number }
  | { status: 'error'; message: string }

export interface Receiver {
  close: () => void
}

interface Handlers {
  onState: (state: ReceiverState) => void
  /** Store one received photo. Resolves false when it could not be kept. */
  onFile: (file: File) => Promise<boolean>
}

const errorText = (type: string | undefined) =>
  type === 'network' ||
  type === 'server-error' ||
  type === 'socket-error' ||
  type === 'socket-closed'
    ? 'Could not reach the connection service. Check your internet connection and try again.'
    : type === 'browser-incompatible'
      ? 'This browser cannot receive photos from another device.'
      : 'The connection could not be set up. Close this window and try again.'

/** Start listening for a sender. `base` is this app's address, without a hash. */
export async function startReceiver(base: string, handlers: Handlers): Promise<Receiver> {
  handlers.onState({ status: 'connecting' })
  let closed = false
  let peer: Peer | null = null

  const close = () => {
    closed = true
    peer?.destroy()
    peer = null
  }

  try {
    const { Peer: PeerClass } = await import('peerjs')
    if (closed) return { close }
    const id = newTransferId()
    const url = sendUrl(base, id)
    peer = new PeerClass(id)

    peer.on('open', () => {
      if (!closed) handlers.onState({ status: 'ready', url })
    })
    peer.on('error', (error) => {
      // A failed attempt by one sender must not take the receiver down.
      if (closed || error.type === 'peer-unavailable') return
      console.error('Receiver error', error)
      handlers.onState({ status: 'error', message: errorText(error.type) })
    })
    peer.on('disconnected', () => {
      if (!closed) peer?.reconnect()
    })
    peer.on('connection', (connection) => {
      if (closed) {
        connection.close()
        return
      }
      serve(connection, url, handlers, () => closed)
    })
  } catch (error) {
    console.error('Receiver could not start', error)
    handlers.onState({ status: 'error', message: errorText(undefined) })
  }

  return { close }
}

function serve(
  connection: DataConnection,
  url: string,
  handlers: Handlers,
  isClosed: () => boolean
) {
  let total = 0
  let done = 0
  let accepted = 0
  let rejected = 0
  let current: { id: number; assembler: FileAssembler } | null = null
  // Files are stored one after another, in arrival order.
  let queue: Promise<void> = Promise.resolve()

  const send = (message: ReceiverMessage) => {
    if (connection.open) void connection.send(message)
  }
  const refuse = (id: number, reason: RejectReason) => {
    rejected++
    done++
    send({ t: 'ack', id, ok: false, reason })
  }
  const report = () => {
    if (!isClosed()) handlers.onState({ status: 'receiving', url, done, total })
  }

  connection.on('open', () => send({ t: 'ready', v: PROTOCOL_VERSION }))

  connection.on('data', (raw) => {
    if (isClosed()) return
    const message = parseSenderMessage(raw)
    if (!message) return

    switch (message.t) {
      case 'hello':
        total = message.count
        report()
        break

      case 'file': {
        current = null
        const reason = rejectAnnounced(message, accepted)
        if (reason) refuse(message.id, reason)
        else current = { id: message.id, assembler: new FileAssembler(message) }
        report()
        break
      }

      case 'chunk':
        if (current?.id === message.id && !current.assembler.add(message.i, message.data)) {
          refuse(message.id, 'corrupt')
          current = null
          report()
        }
        break

      case 'end': {
        if (current?.id !== message.id) break
        const { id, assembler } = current
        current = null
        const file = assembler.finish()
        if (!file) {
          refuse(id, 'corrupt')
          report()
          break
        }
        queue = queue.then(async () => {
          const stored = await handlers.onFile(file).catch(() => false)
          if (stored) {
            accepted++
            done++
            send({ t: 'ack', id, ok: true })
          } else {
            refuse(id, 'storage')
          }
          report()
        })
        break
      }

      case 'done':
        void queue.then(() => {
          send({ t: 'bye', accepted, rejected })
          if (!isClosed()) handlers.onState({ status: 'finished', url, accepted, rejected })
        })
        break
    }
  })

  connection.on('error', (error) => console.error('Transfer connection error', error))
}
