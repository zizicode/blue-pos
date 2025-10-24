// DataTable.tsx
import React, { useState, useMemo } from 'react';
import './DataTableSimple.scss'; // Importa el archivo SCSS

// Interfaces
interface Column {
  label: string;
  key: string;
  render?: (item: any) => React.ReactNode;
}

interface Button {
  label: string | React.ReactNode;
  action: (item: any) => void;
}

interface TableProps {
  data: any[];
  columns: Column[];
  buttons?: Button[];
}

// Componente principal
const DataTableSimple: React.FC<TableProps> = ({ data, columns, buttons = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;

  // Filtrar datos por búsqueda
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(item =>
      columns.some(col => {
        const value = item[col.key];
        return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns]);

  // Ordenar datos
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortOrder]);

  // Paginación
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="data-table-container">
      <div className="data-table-search">
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="data-table-search-input"
        />
      </div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead className="data-table-head">
            <tr>
              {columns.map((col, index) => (
                <th
                  key={index}
                  onClick={() => handleSort(col.key)}
                  className="data-table-header"
                >
                  {col.label} {sortKey === col.key && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              ))}
              {buttons.length > 0 && (
                <th className="data-table-header">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="data-table-body">
            {paginatedData.map((item, index) => (
              <tr key={index} className="data-table-row">
                {columns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    className="data-table-cell"
                  >
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
                {buttons.length > 0 && (
                  <td
                    className="data-table-cell data-table-actions"
                  >
                    {buttons.map((btn, btnIndex) => (
                      <button
                        key={btnIndex}
                        onClick={() => btn.action(item)}
                        className={`data-table-action-button data-table-action-button--${btnIndex === 0 ? 'primary' : btnIndex === 1 ? 'success' : 'warning'}`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="data-table-pagination">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="data-table-pagination-button"
        >
          Anterior
        </button>
        <span className="data-table-page-info">
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="data-table-pagination-button"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default DataTableSimple;