// utils/formatNumber.ts
export function formatNumber(value: number | string, decimals: number = 2) {
    const num = Number(value)
  
    if (isNaN(num)) return '0.00'
  
    return num.toLocaleString('es-DO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }
  