// "Open mail app" support for EmailButton.jsx. A page can't ask whether anything handles mailto: links,
// so watchMailto uses the usual heuristic: a mail app (or the browser's "Open …?" prompt) takes focus
// or hides the page within a moment; if nothing does, assume no handler and explain how to set one.
// A handler that opens silently, without taking focus, can still give a false positive. That's
// acceptable: the notice doesn't block anything and offers Gmail, Outlook and Copy right there.

export const MAILTO_WAIT_MS = 1500
const OFF_KEY = 'mailto-help-off'

// 'windows' | 'mac' | 'ios' | 'android' | 'chromeos' | 'linux' | 'other'
export function platformOf(nav = navigator) {
  const p = nav.userAgentData?.platform || nav.userAgent || ''
  if (/android/i.test(p)) return 'android'
  if (/iphone|ipad|ipod|\bios\b/i.test(p)) return 'ios'
  if (/mac/i.test(p)) return nav.maxTouchPoints > 1 ? 'ios' : 'mac' // iPadOS reports a Mac
  if (/win/i.test(p)) return 'windows'
  if (/cros|chrome ?os/i.test(p)) return 'chromeos'
  if (/linux/i.test(p)) return 'linux'
  return 'other'
}

// Desktop Chrome or Edge (they can register Gmail as the mailto handler).
export function isChromium(nav = navigator) {
  const brands = nav.userAgentData?.brands
  if (brands) return brands.some((b) => /Google Chrome|Microsoft Edge|Chromium/.test(b.brand))
  return /Chrome\/|Edg\//.test(nav.userAgent || '') && !/OPR\/|Firefox\//.test(nav.userAgent || '')
}

export const STEPS = {
  windows: 'On Windows: open Settings, then Apps, then Default apps, search for "MAILTO", and pick Outlook or Mail (or Chrome or Edge, with Gmail allowed as the handler).',
  mac: 'On a Mac: open the Mail app, then Settings, then General, and choose your app under "Default email reader".',
  ios: 'On iPhone or iPad: open Settings, then Apps, then Default Apps, then Email, and choose your email app.',
  android: 'On Android: open Settings, then Apps, then Default apps, and choose your email app.',
  other: 'Set a default email app in your system settings (often under "Default applications"), or use one of the options below.',
}
STEPS.chromeos = STEPS.other
STEPS.linux = STEPS.other

export const CHROMIUM_TIP = 'In Chrome or Edge you can also open Gmail, click the handler icon at the right of the address bar, and choose Allow.'

// Steps for this device: the OS line, plus the Chrome/Edge tip on desktops.
export function helpFor(nav = navigator) {
  const os = platformOf(nav)
  const steps = [STEPS[os]]
  if (isChromium(nav) && os !== 'ios' && os !== 'android') steps.push(CHROMIUM_TIP)
  return { os, steps }
}

// "Don't show this again". Storage can throw (blocked cookies, private modes): then the choice isn't saved,
// but it still holds for the rest of the visit (TEST-009).
let offThisVisit = false
export function helpOff() {
  if (offThisVisit) return true
  try {
    return localStorage.getItem(OFF_KEY) === '1'
  } catch {
    return false
  }
}
export function setHelpOff() {
  offThisVisit = true
  try {
    localStorage.setItem(OFF_KEY, '1')
  } catch {
    /* not saved: this visit only */
  }
}
/** Tests only: forget the in-memory choice (localStorage is cleared separately). */
export function resetHelpOff() {
  offThisVisit = false
}

// Call when a mailto: link is activated. Calls onNoHandler after `ms` unless the page blurs, hides or
// unloads first; then it calls onHandled instead (something took over: a mail app or the browser's
// prompt). Returns a cancel function, after which neither is called. Skips (never calls back) when the
// page didn't have focus at click time (blur can't tell us anything then), or when the click wasn't a
// user gesture (a browser won't launch a handler for it anyway). When the visitor turned the notice off,
// only onHandled can be called.
export function watchMailto(onNoHandler, { onHandled = () => {}, win = window, doc = document, nav = navigator, ms = MAILTO_WAIT_MS } = {}) {
  const noop = () => {}
  if (!doc.hasFocus()) return noop
  if (nav.userActivation && !nav.userActivation.hasBeenActive) return noop
  const notify = !helpOff()
  let timer = 0
  const handled = () => {
    cancel()
    onHandled()
  }
  const onVis = () => doc.visibilityState === 'hidden' && handled()
  function cancel() {
    clearTimeout(timer)
    win.removeEventListener('blur', handled)
    win.removeEventListener('pagehide', handled)
    doc.removeEventListener('visibilitychange', onVis)
  }
  win.addEventListener('blur', handled)
  win.addEventListener('pagehide', handled)
  doc.addEventListener('visibilitychange', onVis)
  timer = setTimeout(() => {
    cancel()
    // Belt and braces: a handler that took focus without a blur event reaching us.
    if (doc.visibilityState === 'hidden' || !doc.hasFocus()) return onHandled()
    if (notify) onNoHandler()
  }, ms)
  return cancel
}
