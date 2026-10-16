import { useEffect } from 'react'

// Prints collapsed <details> in full: opens the closed ones inside ref before printing and closes
// them again after. Used by Experience (its older roles) and Skills ("Earlier experience").
export default function usePrintOpen(ref) {
  useEffect(() => {
    let opened = []
    const before = () => {
      opened = [...(ref.current?.querySelectorAll('details:not([open])') ?? [])]
      opened.forEach((d) => (d.open = true))
    }
    const after = () => {
      opened.forEach((d) => (d.open = false))
      opened = []
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [ref])
}
