import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { profile } from '../data.js'
import { helpFor, setHelpOff, watchMailto } from './mailtoCheck.js'

export const SUBJECT = 'Hello from your profile site'

// The chooser's links. The address is encoded in web URLs; mailto keeps it readable (RFC 6068 allows "@").
// Outlook on the web has two compose deep links (FUNC-023), one per kind of account: outlook.live.com for
// personal Outlook.com / Hotmail mailboxes ("Outlook.com"), and outlook.office.com for Microsoft 365 work
// or school mailboxes ("Outlook (work)"). Both are offered, since neither opens a draft for the other.
// Spaces are encoded as %20, never "+" (a signed-out sign-in redirect can turn "+" into "++").
export const emailLinks = (email = profile.email, subject = SUBJECT) => {
  const to = encodeURIComponent(email)
  const su = encodeURIComponent(subject)
  return {
    mailto: `mailto:${email}?subject=${su}`,
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}`,
    outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${su}`,
    outlookWork: `https://outlook.office.com/mail/deeplink/compose?to=${to}&subject=${su}`,
  }
}

// FUNC-021: the menu is shown in the top layer (the Popover API), so no ancestor clips it: not Contact's or
// the brief's .card (overflow: hidden), nor the profile dialog (overflow: auto); a popover opened after a
// modal <dialog> is also drawn above it. Browsers without popovers get a portal to <body> (or to the open
// <dialog>, since everything outside a modal dialog is inert) instead. Either way it's position: fixed,
// placed from the button's rectangle: below it, or above when there's no room below, kept 8px inside the
// viewport, and never taller than the viewport (it scrolls inside: UI-014).
export const hasPopover = () => typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function'
const GAP = 6
const EDGE = 8
export function placeMenu(menu, button) {
  if (!menu || !button) return
  const vw = document.documentElement.clientWidth || window.innerWidth
  const vh = window.innerHeight
  const b = button.getBoundingClientRect()
  const { width, height } = menu.getBoundingClientRect()
  let top = b.bottom + GAP
  if (top + height > vh - EDGE) top = b.top - GAP - height >= EDGE ? b.top - GAP - height : Math.max(EDGE, vh - EDGE - height)
  const left = Math.max(EDGE, Math.min(b.left, vw - EDGE - width))
  menu.style.top = `${Math.round(top)}px`
  menu.style.left = `${Math.round(left)}px`
}
const FOCUSABLE = 'a[href], button'

// Clipboard API fallback (older browsers, non-secure contexts): copy from a hidden textarea.
function legacyCopy(text, host) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.readOnly = true
  ta.className = 'sr-only'
  host.appendChild(ta)
  ta.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  ta.remove()
  return ok
}

// The Email buttons (Hero, Brief, ProfileDialog, Contact). A plain mailto: link does nothing on desktops
// without a mail app, so after hydration the link becomes a disclosure button that opens a small chooser:
// the mail app, Gmail, Outlook on the web, or copy the address. The prerendered HTML (no JavaScript, or
// data-app="failed") keeps the plain mailto: link, which is the first render here too, so hydration matches.
// If "Open mail app" seems to open nothing (mailtoCheck.js), the menu turns into a notice explaining how to
// set an email app, with the other choices still there; if something took over (the page lost focus), the
// menu closes (UX-020).
export default function EmailButton({ label = 'Email', className = 'btn btn--primary' }) {
  const email = profile.email
  const links = emailLinks(email)
  const id = useId()
  const menuId = `${id}-menu`
  const [enhanced, setEnhanced] = useState(false)
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState(null) // { os, steps } while the no-handler notice shows
  const [status, setStatus] = useState('')
  const [host, setHost] = useState(null) // the portal target, without the Popover API
  const wrapRef = useRef(null)
  const anchorRef = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const noticeRef = useRef(null)
  const addrRef = useRef(null)
  const refocus = useRef(false)
  const stopWatch = useRef(() => {})
  const shown = useRef(false) // showPopover() was called
  const popover = enhanced && hasPopover()

  useEffect(() => {
    // Keep focus if the visitor had already tabbed to the link before hydration.
    refocus.current = anchorRef.current != null && document.activeElement === anchorRef.current
    setEnhanced(true)
    return () => stopWatch.current()
  }, [])

  useLayoutEffect(() => {
    if (enhanced && refocus.current) {
      refocus.current = false
      buttonRef.current?.focus()
    }
    if (enhanced && !hasPopover()) setHost(buttonRef.current?.closest('dialog') || document.body)
  }, [enhanced])

  // The menu is inside the wrapper, except when portalled (no Popover API).
  const inside = (el) => Boolean(el && (wrapRef.current?.contains(el) || menuRef.current?.contains(el)))

  // Closing also cancels a pending "Open mail app" check (TEST-008), so a closed chooser never comes back
  // as the notice.
  const close = (focus = true) => {
    stopWatch.current()
    setOpen(false)
    setNotice(null)
    if (focus) buttonRef.current?.focus()
  }

  // Show or hide the popover, and keep the menu next to the button while the page or a container scrolls,
  // or the window resizes (FUNC-021).
  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    if (!open) {
      if (shown.current) {
        shown.current = false
        try { menu.hidePopover() } catch { /* already hidden */ }
      }
      return
    }
    if (menu.hasAttribute('popover') && !shown.current) {
      try {
        menu.showPopover()
        shown.current = true
      } catch { /* already showing, or detached */ }
    }
    const place = () => placeMenu(menu, buttonRef.current)
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true) // capture: the dialog's or any container's scroll too
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, notice, status, host])

  // The notice takes focus, so screen readers read it.
  useEffect(() => {
    if (notice) noticeRef.current?.focus()
  }, [notice])

  useEffect(() => {
    if (!open) return
    // Capture phase, and marked handled: Brief's Escape handler (which leaves brief mode) skips handled
    // events, and a modal dialog around the button stays open.
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      close()
    }
    // On click, not pointerdown: the browser moves focus on mousedown, which would undo the refocus.
    const onClick = (e) => {
      if (inside(e.target)) return
      // Return focus to the button unless the click landed on something that takes focus itself.
      const focusable = e.target instanceof Element && e.target.closest('a[href], button, input, select, textarea, summary, [tabindex]')
      close(!focusable)
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('click', onClick)
    }
  }, [open])

  if (!enhanced) {
    return <a ref={anchorRef} className={className} href={`mailto:${email}`}>{label}</a>
  }

  const toggle = () => {
    stopWatch.current()
    setStatus('')
    setNotice(null)
    setOpen((o) => !o)
  }

  // Tabbing out of the menu closes it (focus has already moved on, so it isn't pulled back).
  const onBlur = (e) => {
    if (open && e.relatedTarget && !inside(e.relatedTarget)) close(false)
  }

  // A portalled menu (no Popover API) isn't next to the button in the Tab order: Tab from the button
  // goes into the menu, Shift+Tab from its first item back to the button, and Tab past its last item
  // closes it. In the top layer the menu already follows the button in the DOM.
  const onButtonKey = (e) => {
    if (popover || !open || e.key !== 'Tab' || e.shiftKey) return
    const first = menuRef.current?.querySelector(FOCUSABLE)
    if (!first) return
    e.preventDefault()
    first.focus()
  }
  const onMenuKey = (e) => {
    if (popover || e.key !== 'Tab') return
    const items = [...(menuRef.current?.querySelectorAll(FOCUSABLE) || [])]
    const i = items.indexOf(document.activeElement)
    if (e.shiftKey && i <= 0) {
      e.preventDefault()
      buttonRef.current?.focus()
    } else if (!e.shiftKey && i === items.length - 1) {
      e.preventDefault()
      close()
    }
  }

  // No notice if something took over (UX-020): then the menu closes, and focus is on the button when the
  // visitor comes back.
  const openMailApp = () => {
    stopWatch.current()
    stopWatch.current = watchMailto(
      () => {
        setStatus('')
        setOpen(true)
        setNotice(helpFor())
      },
      { onHandled: () => close() },
    )
  }

  // Gmail, Outlook and Copy are choices too: no "no email app" notice after them.
  const pickWeb = () => {
    stopWatch.current()
    close(false)
  }

  const copy = async () => {
    stopWatch.current()
    let ok = false
    try {
      await navigator.clipboard.writeText(email)
      ok = true
    } catch {
      ok = legacyCopy(email, wrapRef.current)
    }
    if (ok) return setStatus(`Copied ${email}`)
    // Nothing could copy: select the address so the visitor can copy it.
    const sel = window.getSelection?.()
    if (sel && addrRef.current) sel.selectAllChildren(addrRef.current)
    setStatus('Address selected. Press Ctrl+C (Command+C on a Mac) to copy it.')
  }

  const dontShow = () => {
    setHelpOff()
    close()
  }

  const webChoices = (
    <>
      <li>
        <a className="email__item" href={links.gmail} target="_blank" rel="noopener noreferrer" onClick={pickWeb}>
          Gmail<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span>
        </a>
      </li>
      <li>
        <a className="email__item" href={links.outlook} target="_blank" rel="noopener noreferrer" onClick={pickWeb}>
          Outlook.com<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span>
        </a>
      </li>
      <li>
        <a className="email__item" href={links.outlookWork} target="_blank" rel="noopener noreferrer" onClick={pickWeb}>
          Outlook (work)<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span>
        </a>
      </li>
      <li><button type="button" className="email__item" onClick={copy}>Copy address</button></li>
    </>
  )

  const menu = (
    <div
      id={menuId}
      ref={menuRef}
      className={`email__menu${notice ? ' email__menu--notice' : ''}`}
      hidden={!open}
      popover={popover ? 'manual' : undefined}
      onKeyDown={onMenuKey}
    >
      {notice ? (
        <div ref={noticeRef} className="email__notice" role="alertdialog" aria-labelledby={`${id}-nt`} aria-describedby={`${id}-nd`} tabIndex={-1}>
          <p className="email__ntitle" id={`${id}-nt`}>Didn&rsquo;t open?</p>
          <div id={`${id}-nd`}>
            <p>If no email app opened, your device may not have one set for email links.</p>
            {notice.steps.map((s) => <p key={s} className="email__step">{s}</p>)}
          </div>
          <p className="email__addr" ref={addrRef}>{email}</p>
          <ul className="email__list" aria-label="Other ways to email">{webChoices}</ul>
          <p className="email__status" role="status" aria-live="polite">{status}</p>
          <div className="email__nactions">
            <button type="button" className="email__link" onClick={dontShow}>Don&rsquo;t show this again</button>
            <button type="button" className="btn" onClick={() => close()}>Close</button>
          </div>
        </div>
      ) : (
        <>
          <p className="email__addr" ref={addrRef}>{email}</p>
          <ul className="email__list" aria-label="Ways to email">
            <li><a className="email__item" href={links.mailto} onClick={openMailApp}>Open mail app</a></li>
            {webChoices}
          </ul>
          <p className="email__status" role="status" aria-live="polite">{status}</p>
        </>
      )}
    </div>
  )

  return (
    <span className="email" ref={wrapRef} onBlur={onBlur}>
      <button ref={buttonRef} type="button" className={className} aria-expanded={open} aria-controls={menuId} onClick={toggle} onKeyDown={onButtonKey}>
        {label}
      </button>
      {popover || !host ? menu : createPortal(menu, host)}
    </span>
  )
}
