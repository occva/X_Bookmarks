interface LocalFileItem {
  name: string
  url: string
}

interface UploadResponse {
  folderTimestamp: string
  files: LocalFileItem[]
}

interface LatestResponse {
  folderTimestamp: string | null
  files: LocalFileItem[]
}

const LOCAL_FILE_API = {
  UPLOAD: '/api/local-files/upload',
  LATEST: '/api/local-files/latest',
} as const

const REQUEST_TIMEOUT = 8000
const LOCAL_FILE_API_ENABLED = import.meta.env.DEV

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timer)
  }
}

export async function saveUploadedJSONFiles(files: File[]): Promise<{ folderTimestamp: string; urls: string[] }> {
  if (!LOCAL_FILE_API_ENABLED) {
    return { folderTimestamp: '', urls: [] }
  }

  if (files.length === 0) {
    throw new Error('没有可保存的文件')
  }

  const payloadFiles = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      content: await file.text(),
    }))
  )

  const response = await fetchWithTimeout(LOCAL_FILE_API.UPLOAD, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files: payloadFiles }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `本地保存失败（HTTP ${response.status}）`)
  }

  const data = (await response.json()) as UploadResponse
  if (!data.folderTimestamp || !Array.isArray(data.files)) {
    throw new Error('本地保存返回格式错误')
  }

  const urls = data.files.map((item) => item.url).filter((url) => typeof url === 'string' && url.length > 0)
  if (urls.length === 0) {
    throw new Error('本地保存后未返回可用文件 URL')
  }

  return {
    folderTimestamp: data.folderTimestamp,
    urls,
  }
}

export async function getLatestSavedJSONFileURLs(): Promise<string[]> {
  if (!LOCAL_FILE_API_ENABLED) {
    return []
  }

  const response = await fetchWithTimeout(LOCAL_FILE_API.LATEST, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`获取最新本地文件失败（HTTP ${response.status}）`)
  }

  const data = (await response.json()) as LatestResponse
  if (!Array.isArray(data.files)) {
    return []
  }

  return data.files.map((item) => item.url).filter((url) => typeof url === 'string' && url.length > 0)
}
