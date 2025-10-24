"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, TableIcon, Inbox, X } from "lucide-react"
import "./DataTable.scss"

export interface DataTableColumn {
  key: string
  label: string
  render?: (value: any, row: any) => React.ReactNode
}

export interface ActionButton {
  label: string
  icon?: React.ReactNode
  onClick: (selectedItems: any[]) => void
  variant?: "primary" | "secondary" | "danger" | "success"
  permission?: {
    modulo: string
    accion: string
  }
  showWhen?: "single" | "multiple" | "any" // Controla cuándo mostrar el botón
}

export interface DataTableProps<T = any> {
  data: T[]
  columns: DataTableColumn[]
  title?: string
  icon?: React.ReactNode
  itemsPerPage?: number
  creationDateColumn?: string
  renderCell?: (key: string, value: any, row: T) => React.ReactNode
  actionButtons?: React.ReactNode
  // Nuevas props para selección
  selectable?: boolean
  rowKey?: string // Clave única para identificar cada fila (ej: "id")
  actionButtonsWithSelection?: ActionButton[]
  userPermissions?: Array<{ modulo: string; accion: string }> // Permisos del usuario
  onSelectionChange?: (selectedItems: T[]) => void
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  title = "Tabla de Datos",
  icon,
  itemsPerPage = 5,
  creationDateColumn = "createdAt",
  renderCell,
  actionButtons,
  selectable = false,
  rowKey = "id",
  actionButtonsWithSelection = [],
  userPermissions = [],
  onSelectionChange,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [sortColumn, setSortColumn] = useState<string | null>(null) // Nueva: columna para ordenar
  const [selectedRows, setSelectedRows] = useState<Set<any>>(new Set())


  // Filter data based on search term (solo en columnas con datos string)
  const filteredData = useMemo(() => {
    if (!searchTerm) return data

    return data.filter((row) => {
      return columns.some((column) => {
        const value = row[column.key]
        if (value === null || value === undefined || typeof value !== 'string') return false
        return value.toLowerCase().includes(searchTerm.toLowerCase())
      })
    })
  }, [data, columns, searchTerm])

  // Sort data by selected column or creation date
  const sortedData = useMemo(() => {
    let dataToSort = [...filteredData]

    if (sortColumn) {
      // Ordenar por la columna seleccionada
      dataToSort.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]

        // Manejar null/undefined
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return sortOrder === "asc" ? -1 : 1
        if (bVal == null) return sortOrder === "asc" ? 1 : -1

        // Si son strings, usar localeCompare
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
        }

        // Si son numbers, comparar numéricamente
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === "asc" ? aVal - bVal : bVal - aVal
        }

        // Para otros tipos, convertir a string y comparar
        const aStr = String(aVal)
        const bStr = String(bVal)
        return sortOrder === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
      })
    } else if (creationDateColumn) {
      // Ordenar por fecha de creación si no hay columna seleccionada
      dataToSort.sort((a, b) => {
        const dateA = new Date(a[creationDateColumn]).getTime()
        const dateB = new Date(b[creationDateColumn]).getTime()
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA
      })
    }

    return dataToSort
  }, [filteredData, sortColumn, sortOrder, creationDateColumn])

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = sortedData.slice(startIndex, endIndex)

  // Get selected items as array
  const selectedItems = useMemo(() => {
    return data.filter((row) => selectedRows.has(row[rowKey]))
  }, [data, selectedRows, rowKey])

  // Check if all current page rows are selected
  const isAllPageSelected = useMemo(() => {
    if (paginatedData.length === 0) return false
    return paginatedData.every((row) => selectedRows.has(row[rowKey]))
  }, [paginatedData, selectedRows, rowKey])

  // Check if some (but not all) rows are selected
  const isSomeSelected = useMemo(() => {
    return selectedRows.size > 0 && !isAllPageSelected
  }, [selectedRows, isAllPageSelected])

  // Check user permission
  const hasPermission = (permission?: { modulo: string; accion: string }) => {
    if (!permission) return true
    return userPermissions.some(
      (p) => p.modulo === permission.modulo && p.accion === permission.accion
    )
  }

  // Filter action buttons based on selection and permissions
  const filteredActionButtons = useMemo(() => {
    const selectedCount = selectedRows.size

    return actionButtonsWithSelection.filter((button) => {
      // Check permissions
      if (!hasPermission(button.permission)) return false

      // Check showWhen condition
      if (button.showWhen === "single" && selectedCount !== 1) return false
      if (button.showWhen === "multiple" && selectedCount <= 1) return false
      if (button.showWhen === "any" && selectedCount === 0) return false

      return true
    })
  }, [selectedRows, actionButtonsWithSelection, userPermissions])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const toggleSortOrder = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(columnKey)
      setSortOrder("asc")
    }
  }

  const handleSelectAll = () => {
    if (isAllPageSelected) {
      // Deselect all from current page
      const newSelected = new Set(selectedRows)
      paginatedData.forEach((row) => {
        newSelected.delete(row[rowKey])
      })
      setSelectedRows(newSelected)
    } else {
      // Select all from current page
      const newSelected = new Set(selectedRows)
      paginatedData.forEach((row) => {
        newSelected.add(row[rowKey])
      })
      setSelectedRows(newSelected)
    }
  }

  const handleSelectRow = (rowId: any) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId)
    } else {
      newSelected.add(rowId)
    }
    setSelectedRows(newSelected)
  }

  const handleClearSelection = () => {
    setSelectedRows(new Set())
  }

  useEffect(() => {
    handleClearSelection()
  },[data])

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedItems)
    }
  }, [selectedItems, onSelectionChange])

  const isDataEmpty = data.length === 0

  return (
    <div className="data-table">
      {/* Header */}
      <div className="data-table__header">
        <div className="data-table__title-section">
          <div className="data-table__default-icon">
            {icon || <TableIcon size={20} />}
          </div>
          <h2 className="data-table__title">{title}</h2>
        </div>

        <div className="data-table__controls">
          {/* Search */}
          <div className="data-table__search">
            <Search className="data-table__search-icon" size={16} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="data-table__search-input"
            />
          </div>

          {actionButtons && <div className="data-table__actions">{actionButtons}</div>}
        </div>
      </div>

      {/* Action Bar (shown when items are selected) */}
      {selectable && selectedRows.size > 0 && (
        <div className="data-table__action-bar">
          <div className="data-table__action-info">
            <span className="data-table__action-count">
              {selectedRows.size} {selectedRows.size === 1 ? "elemento" : "elementos"} seleccionado
              {selectedRows.size !== 1 ? "s" : ""}
            </span>
            <button
              onClick={handleClearSelection}
              className="data-table__action-clear"
              title="Limpiar selección"
            >
              <X size={14} />
            </button>
          </div>

          <div className="data-table__action-buttons">
            {filteredActionButtons.map((button, index) => (
              <button
                key={index}
                onClick={() => button.onClick(selectedItems)}
                className={`data-table__action-btn data-table__action-btn--${button.variant || "primary"}`}
              >
                {button.icon && <span className="data-table__action-btn-icon">{button.icon}</span>}
                {button.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isDataEmpty ? (
        <div className="data-table__empty-state">
          <div className="data-table__empty-icon">
            <Inbox size={48} />
          </div>
          <p className="data-table__empty-text">No hay datos para mostrar</p>
        </div>
      ) : (
        <>
          {/* Table Container */}
          <div className="data-table__container">
            <table className="data-table__table">
              <thead className="data-table__thead">
                <tr>
                  {/* Checkbox column */}
                  {selectable && (
                    <th className="data-table__th data-table__th--checkbox">
                      <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = isSomeSelected
                          }
                        }}
                        onChange={handleSelectAll}
                        className="data-table__checkbox"
                      />
                    </th>
                  )}

                  {columns.map((col) => (
                    <th key={col.key} className="data-table__th">
                      <div className="data-table__th-content">
                        <span>{col.label}</span>
                        <button onClick={() => toggleSortOrder(col.key)} className="data-table__sort-button">
                          <ArrowUpDown size={14} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="data-table__tbody">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (selectable ? 1 : 0)} className="data-table__empty-state">
                      <div className="data-table__empty-icon">
                        <Inbox size={48} />
                      </div>
                      <p className="data-table__empty-text">No se encontraron resultados</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, rowIndex) => {
                    const isSelected = selectedRows.has(row[rowKey])
                    return (
                      <tr
                        key={rowIndex}
                        className={`data-table__tr ${isSelected ? "data-table__tr--selected" : ""}`}
                      >
                        {/* Checkbox cell */}
                        {selectable && (
                          <td className="data-table__td data-table__td--checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(row[rowKey])}
                              className="data-table__checkbox"
                            />
                          </td>
                        )}

                        {columns.map((col) => (
                          <td key={col.key} className="data-table__td">
                            {col.render
                              ? col.render(row[col.key], row)
                              : renderCell
                                ? renderCell(col.key, row[col.key], row)
                                : row[col.key]}
                          </td>
                        ))}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with Pagination */}
          <div className="data-table__footer">
            <div className="data-table__info">
              Mostrando {startIndex + 1} - {Math.min(endIndex, sortedData.length)} de {sortedData.length} items
            </div>

            <div className="data-table__pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="data-table__pagination-button"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="data-table__pagination-pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`data-table__pagination-page ${
                      currentPage === page ? "data-table__pagination-page--active" : ""
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="data-table__pagination-button"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
