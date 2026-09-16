/** Cache IndexedDB de mídias da Semit TV — reprodução local, sync só do que mudou. */

const DB_NAME = 'painel-semit-tv-cache'
const DB_VERSION = 1
const STORE = 'media_blobs'

type MediaRecord = {
  url: string
  blob: Blob
  size: number
  updatedAt: number
}

export type CacheProgress = {
  current: number
  total: number
  fileLabel: string
  bytesLoaded: number
  bytesTotal: number
  percent: number
  detail: string
}

let dbPromise: Promise<IDBDatabase | null> | null = null
const memoryUrls = new Map<string, string>()
const downloadQueue = new Set<string>()

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'url' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
  return dbPromise
}

function normalizeKey(url: string): string {
  return url.replace(/^\//, '')
}

export async function getCachedBlobUrl(url: string): Promise<string | null> {
  const key = normalizeKey(url)
  if (memoryUrls.has(key)) return memoryUrls.get(key) || null

  const db = await openDb()
  if (!db) return null

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => {
        const row = req.result as MediaRecord | undefined
        if (!row?.blob) {
          resolve(null)
          return
        }
        const blobUrl = URL.createObjectURL(row.blob)
        memoryUrls.set(key, blobUrl)
        resolve(blobUrl)
      }
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function saveBlob(url: string, blob: Blob): Promise<void> {
  const db = await openDb()
  if (!db) return
  const key = normalizeKey(url)
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({
        url: key,
        blob,
        size: blob.size,
        updatedAt: Date.now(),
      } satisfies MediaRecord)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
  const prev = memoryUrls.get(key)
  if (prev) URL.revokeObjectURL(prev)
  memoryUrls.set(key, URL.createObjectURL(blob))
}

async function readBlobWithProgress(
  res: Response,
  onBytes?: (loaded: number, total: number) => void,
): Promise<Blob> {
  const total = Number(res.headers.get('content-length') || 0)
  if (!res.body || !onBytes) return res.blob()

  const reader = res.body.getReader()
  const chunks: Blob[] = []
  let loaded = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(new Blob([new Uint8Array(value)]))
      loaded += value.byteLength
      onBytes(loaded, total)
    }
  }
  return new Blob(chunks, { type: res.headers.get('content-type') || 'video/mp4' })
}

export async function downloadAndCache(
  url: string,
  onBytes?: (loaded: number, total: number) => void,
): Promise<string | null> {
  const key = normalizeKey(url)
  const existing = await getCachedBlobUrl(key)
  if (existing) return existing
  if (downloadQueue.has(key)) return null
  downloadQueue.add(key)
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await readBlobWithProgress(res, onBytes)
    await saveBlob(key, blob)
    return memoryUrls.get(key) || null
  } catch {
    return null
  } finally {
    downloadQueue.delete(key)
  }
}

export async function dropCachedUrl(url: string): Promise<void> {
  const key = normalizeKey(url)
  const prev = memoryUrls.get(key)
  if (prev) {
    URL.revokeObjectURL(prev)
    memoryUrls.delete(key)
  }
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}
export async function getPlayableUrl(
  remoteUrl: string,
  onBytes?: (loaded: number, total: number) => void,
): Promise<string> {
  const cached = await getCachedBlobUrl(remoteUrl)
  if (cached) return cached
  const downloaded = await downloadAndCache(remoteUrl, onBytes)
  return downloaded || remoteUrl
}

function shortName(url: string): string {
  try {
    const path = new URL(url, 'http://local.invalid').pathname
    return path.split('/').filter(Boolean).pop() || 'arquivo'
  } catch {
    return 'arquivo'
  }
}

/** Baixa em segundo plano o que falta; remove do cache o que saiu da playlist. */
export async function syncPlaylistCache(
  remoteUrls: string[],
  onProgress?: (progress: CacheProgress) => void,
): Promise<void> {
  const keys = remoteUrls.map(normalizeKey)
  const wanted = new Set(keys)
  const total = Math.max(remoteUrls.length, 1)

  const db = await openDb()
  if (db) {
    const stored: string[] = await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).getAllKeys()
        req.onsuccess = () => resolve((req.result as string[]) || [])
        req.onerror = () => resolve([])
      } catch {
        resolve([])
      }
    })
    const toDelete = stored.filter((k) => !wanted.has(normalizeKey(String(k))))
    if (toDelete.length) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE, 'readwrite')
          const store = tx.objectStore(STORE)
          for (const k of toDelete) {
            store.delete(k)
            const mem = memoryUrls.get(k)
            if (mem) {
              URL.revokeObjectURL(mem)
              memoryUrls.delete(k)
            }
          }
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
        } catch {
          resolve()
        }
      })
    }
  }

  for (let i = 0; i < remoteUrls.length; i += 1) {
    const url = remoteUrls[i]
    const key = normalizeKey(url)
    const label = shortName(url)
    const report = (bytesLoaded: number, bytesTotal: number, cached: boolean) => {
      const filePart = bytesTotal > 0 ? bytesLoaded / bytesTotal : cached ? 1 : 0
      const percent = Math.min(99, Math.round(((i + filePart) / total) * 100))
      onProgress?.({
        current: i + 1,
        total,
        fileLabel: label,
        bytesLoaded,
        bytesTotal,
        percent,
        detail: cached
          ? `Arquivo ${i + 1} de ${total} já está no aparelho`
          : `Baixando ${i + 1} de ${total}: ${label}`,
      })
    }

    if (memoryUrls.has(key) || (await getCachedBlobUrl(key))) {
      report(1, 1, true)
      continue
    }
    report(0, 0, false)
    await downloadAndCache(url, (loaded, totalBytes) => report(loaded, totalBytes, false))
  }

  onProgress?.({
    current: remoteUrls.length,
    total,
    fileLabel: '',
    bytesLoaded: 1,
    bytesTotal: 1,
    percent: 100,
    detail: 'Programação baixada. Preparando o primeiro quadro…',
  })
}
