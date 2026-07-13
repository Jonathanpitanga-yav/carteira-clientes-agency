"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  themes: Theme[]
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  themes: ["light", "dark", "system"],
})

export function ThemeProvider({
  children,
  storageKey = "theme",
  attribute = "class",
}: {
  children: React.ReactNode
  storageKey?: string
  attribute?: string
}) {
  const [theme, setThemeState] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  const apply = useCallback(
    (t: Theme) => {
      const resolved =
        t === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : t

      const root = document.documentElement
      if (attribute === "class") {
        root.classList.remove("light", "dark")
        root.classList.add(resolved)
        root.style.colorScheme = resolved
      } else {
        root.setAttribute(attribute, resolved)
      }
    },
    [attribute],
  )

  const setTheme = useCallback(
    (t: Theme) => {
      localStorage.setItem(storageKey, t)
      apply(t)
      setThemeState(t)
    },
    [storageKey, apply],
  )

  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme | null
    const initial = stored || "dark"
    setThemeState(initial)
    setMounted(true)

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      setThemeState((prev) => {
        if (prev === "system") apply("system")
        return prev
      })
    }
    media.addEventListener("change", handler)
    return () => media.removeEventListener("change", handler)
  }, [storageKey, apply])

  return (
    <ThemeContext.Provider
      value={{
        theme: mounted ? theme : "dark",
        setTheme,
        themes: ["light", "dark", "system"],
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
