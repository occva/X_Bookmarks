const API_ORIGIN = 'https://x-bookmarks.8954660.workers.dev'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      const targetURL = new URL(url.pathname + url.search, API_ORIGIN)
      const proxiedRequest = new Request(targetURL.toString(), request)
      return fetch(proxiedRequest)
    }

    return env.ASSETS.fetch(request)
  },
}
