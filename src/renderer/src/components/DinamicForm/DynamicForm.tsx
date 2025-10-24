"use client"

import type React from "react"
import { useState, useEffect } from "react"
import "./DinamicForm.scss"
import { ChevronDown, ChevronRight } from "lucide-react"

export interface FormField {
  key: string
  label: string
  type: "text" | "number" | "select" | "checkbox" | "textarea"
  placeholder?: string
  options?: { label: string; value: string | number }[]
  value?: any
  colSpan?: number
  required?: boolean
}

interface DynamicFormProps {
  schema: FormField[]
  mode: "view" | "edit" | "create"
  title?: string
  onChange?: (key: string, value: any) => void
}

const DynamicForm: React.FC<DynamicFormProps> = ({ schema, mode, title, onChange }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [values, setValues] = useState(schema.reduce((acc, field) => ({ ...acc, [field.key]: field.value ?? "" }), {}))

  useEffect(() => {
    const newValues = schema.reduce((acc, field) => ({ ...acc, [field.key]: field.value ?? "" }), {})
    setValues(newValues)
  }, [schema])

  const formatNumber = (num: any) => {
    if (num === "" || isNaN(num)) return ""
    return Number(num).toLocaleString("en-US")
  }

  const handleChange = (key: string, value: any) => {
    const updated = { ...values, [key]: value }
    setValues(updated)
    onChange?.(key, value)
  }

  return (
    <div className={`dynamic-form ${collapsed ? "collapsed" : ""} mode-${mode}`}>
      <div className="dynamic-form__header" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        <h2>
          {title || "Formulario"}
          <span className={`mode mode--${mode}`}>
            {mode === "create" ? "Creando" : mode === "edit" ? "Editando" : "Vista"}
          </span>
        </h2>
      </div>

      {!collapsed && (
        <form className="dynamic-form__grid">
          {schema.map((field,i) => (
            <div
              key={`${field.key}-${i}`}
              className={`form-field form-field--${field.type}`}
              style={{ gridColumn: `span ${field.colSpan || 1}` }}
            >
              <label>
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>

              {mode === "view" ? (
                <div
                  className={`form-field__view-value ${
                    field.type === "checkbox" ? (values[field.key] ? "checkbox-true" : "checkbox-false") : ""
                  }`}
                >
                  {field.type === "checkbox"
                    ? values[field.key]
                      ? "Sí"
                      : "No"
                    : field.type === "number"
                      ? values[field.key] !== ""
                        ? formatNumber(values[field.key])
                        : ""
                      : values[field.key] || ""}
                </div>
              ) : field.type === "textarea" ? (
                <textarea
                  placeholder={field.placeholder}
                  value={values[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              ) : field.type === "select" ? (
                <select value={values[field.key]} onChange={(e) => handleChange(field.key, e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={!!values[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.checked)}
                />
              ) : (
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={field.type === "number" ? values[field.key] : values[field.key]}
                  onChange={(e) =>
                    handleChange(field.key, field.type === "number" ? e.target.value.replace(/,/g, "") : e.target.value)
                  }
                />
              )}
            </div>
          ))}
        </form>
      )}
    </div>
  )
}

export default DynamicForm
