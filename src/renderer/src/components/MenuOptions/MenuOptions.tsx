"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import "./MenuOptions.scss"

interface Option {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  private?: { modulo: string; accion: string }
  variant?: "default" | "danger" | "warning"
  divider?: boolean
}

interface OptionsMenuProps {
  options: Option[]
  permisos?: { modulo: string; accion: string; descripcion?: string }[]
  align?: "left" | "right"
}

export const OptionsMenu: React.FC<OptionsMenuProps> = ({ options, permisos = [], align = "right" }) => {
  const [open, setOpen] = useState(false)
  const [openUpwards, setOpenUpwards] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
  }, [permisos, options])

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const dropdownHeight = 200

      const shouldOpenUpwards = spaceBelow < dropdownHeight && spaceAbove > spaceBelow
      setOpenUpwards(shouldOpenUpwards)

      let left = rect.right - 180 // Ancho mínimo del dropdown
      if (align === "left") {
        left = rect.left
      }

      const top = shouldOpenUpwards ? rect.top - dropdownHeight : rect.bottom + 4

      setDropdownPosition({ top, left })
    }
  }, [open, align])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const canViewOption = (option: Option): boolean => {
    if (!option.private) {
      return true
    }

    const hasPermission = permisos.some(
      (perm) => perm.modulo === option.private?.modulo && perm.accion === option.private?.accion,
    )


    return hasPermission
  }

  const visibleOptions = options.filter(canViewOption)

  if (visibleOptions.length === 0) {
    return null
  }

  return (
    <div className="options-menu" ref={containerRef}>
      <button
        ref={triggerRef}
        className="options-menu__trigger"
        onClick={() => {
          setOpen(!open)
        }}
        aria-label="Abrir menú de opciones"
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="3" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="13" r="1.5" fill="currentColor" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: openUpwards ? 5 : -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: openUpwards ? 5 : -5 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`options-menu__dropdown ${openUpwards ? "options-menu__dropdown--upwards" : ""} ${
              align === "left" ? "options-menu__dropdown--left" : ""
            }`}
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            {visibleOptions.map((opt, i) => (
              <React.Fragment key={i}>
                {opt.divider && <div className="options-menu__divider" />}
                <button
                  className={`options-menu__item ${opt.variant ? `options-menu__item--${opt.variant}` : ""}`}
                  onClick={() => {
                    opt.onClick()
                    setOpen(false)
                  }}
                >
                  {opt.icon && <span className="options-menu__icon">{opt.icon}</span>}
                  <span className="options-menu__label">{opt.label}</span>
                </button>
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default OptionsMenu
