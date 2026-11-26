/** Minimal promise helpers over IndexedDB. */

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted', 'AbortError'))
  })
}

export function openDatabase(
  name: string,
  version: number,
  upgrade: (db: IDBDatabase, oldVersion: number) => void
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version)
    request.onupgradeneeded = (event) => upgrade(request.result, event.oldVersion)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new DOMException('Database is blocked', 'AbortError'))
  })
}

/**
 * Open a database only if it already exists. A plain `open` would create it;
 * here the creating upgrade is aborted so nothing is left behind.
 */
export function openExistingDatabase(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    let created = false
    const request = indexedDB.open(name)
    request.onupgradeneeded = (event) => {
      if (event.oldVersion === 0) {
        created = true
        request.transaction?.abort()
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => (created ? resolve(null) : reject(request.error))
  })
}

export async function getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return requestToPromise(db.transaction(store, 'readonly').objectStore(store).getAll())
}

export async function getOne<T>(
  db: IDBDatabase,
  store: string,
  key: IDBValidKey
): Promise<T | undefined> {
  return requestToPromise(db.transaction(store, 'readonly').objectStore(store).get(key))
}

export async function putAll<T>(db: IDBDatabase, store: string, values: readonly T[]) {
  const tx = db.transaction(store, 'readwrite')
  for (const value of values) tx.objectStore(store).put(value)
  await transactionDone(tx)
}

export async function deleteOne(db: IDBDatabase, store: string, key: IDBValidKey) {
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).delete(key)
  await transactionDone(tx)
}

export async function countAll(db: IDBDatabase, store: string): Promise<number> {
  return requestToPromise(db.transaction(store, 'readonly').objectStore(store).count())
}
