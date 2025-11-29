export const API_CONFIG = {
  TIMEOUT: 5000, // 总超时时间 5 秒
  SINGLE_REQUEST_TIMEOUT: 2000, // 单个请求超时时间 2 秒
  RETRY_COUNT: 1, // 每个代理只重试 1 次
  RETRY_DELAY: 300, // 重试延迟 300ms
} as const

export const FILE_TYPES = {
  JSON: 'application/json',
  JSON_EXTENSION: '.json',
} as const

