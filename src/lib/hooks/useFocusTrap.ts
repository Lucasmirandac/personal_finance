import { RefObject, useEffect, useRef } from "react"

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  )
}

export function useFocusTrap(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
) {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const container = containerRef.current
    if (!container) return

    const focusable = getFocusableElements(container)
    const first = focusable[0]

    if (first) {
      first.focus()
    } else {
      container.setAttribute("tabindex", "-1")
      container.focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return

      const currentFocusable = getFocusableElements(container)
      if (currentFocusable.length === 0) {
        event.preventDefault()
        return
      }

      const firstEl = currentFocusable[0]
      const lastEl = currentFocusable[currentFocusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === firstEl || active === container) {
          event.preventDefault()
          lastEl.focus()
        }
        return
      }

      if (active === lastEl) {
        event.preventDefault()
        firstEl.focus()
      }
    }

    container.addEventListener("keydown", handleKeyDown)

    return () => {
      container.removeEventListener("keydown", handleKeyDown)
      if (container.getAttribute("tabindex") === "-1") {
        container.removeAttribute("tabindex")
      }
      previousFocusRef.current?.focus()
    }
  }, [open, containerRef])
}
