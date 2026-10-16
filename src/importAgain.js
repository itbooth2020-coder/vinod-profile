// FUNC-014. Browsers remember a failed module request for the life of the page: importing the same
// chunk again fails at once, without a new request. importAgain(load) tries load(), then, after a
// short wait, the same chunk under a fresh URL (?retry=…). The chunk's own dependencies still resolve
// to their usual URLs, so if one of those failed, only a page reload recovers (Retry offers it).
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export const importAgain = (load) =>
  load().catch((err) => {
    const url = String(err?.message || '').match(/https?:\/\/\S+?\.js\b/)?.[0]
    return wait(800).then(() => (url ? import(/* @vite-ignore */ `${url}?retry=${Date.now()}`) : load()))
  })
