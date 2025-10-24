import { useEffect, useState } from "react"
import { Venta } from "@renderer/type/pos.types"
import { type TurnoActivo } from "@renderer/modules/app/Caja/TurnosCaja/TurnosCaja"

export function useVentasStats(ventas: Venta[] = [], turno?: TurnoActivo | null) {
  const toNumber = (x: any) => Number(x) || 0

  const [stats, setStats] = useState({
    totalTurno: {
      totalEntrada: 0,
      totalSalida: 0,
      totalDevoluciones: 0,
      totalAbono: 0,
      totalActualCaja: 0,
      totalVentas: 0
    },
    totalDia: 0,
    totalMes: 0,
    totalAyer: 0,
    facturasHoy: 0,
    promedioVenta: 0,
    variacion: 0,
  })

  useEffect(() => {
    // --- Si no hay ventas aún, resetea ---
    if (!ventas.length) {
      setStats(prev => ({
        ...prev,
        totalDia: 0,
        totalMes: 0,
        totalAyer: 0,
        facturasHoy: 0,
        promedioVenta: 0,
        variacion: 0,
        totalTurno: { totalEntrada: 0, totalSalida: 0, totalDevoluciones: 0, totalAbono: 0, totalActualCaja: 0 , totalVentas: 0}
      }))
      return
    }

    const hoy = new Date()
    const fechaHoy = hoy.toLocaleDateString('en-CA')
    const mesActual = hoy.getMonth()
    const añoActual = hoy.getFullYear()

    // --- Ventas del día ---
    const ventasHoy = ventas.filter(v => {
      const f = v.fecha ? new Date(v.fecha).toLocaleDateString('en-CA') : ''
      return f === fechaHoy
    })
    const totalDia = ventasHoy.reduce((sum, v) => sum + toNumber(v.total), 0)
    const facturasHoy = ventasHoy.length
    const promedioVenta = facturasHoy ? totalDia / facturasHoy : 0

    // --- Ventas del mes ---
    const ventasMes = ventas.filter(v => {
      const f = new Date(v.fecha)
      return f.getMonth() === mesActual && f.getFullYear() === añoActual
    })
    const totalMes = ventasMes.reduce((sum, v) => sum + toNumber(v.total), 0)

    // --- Ventas de ayer ---
    const ayer = new Date()
    ayer.setDate(ayer.getDate() - 1)
    const fechaAyer = ayer.toLocaleDateString('en-CA')

    const ventasAyer = ventas.filter(v => {
      const f = v.fecha ? new Date(v.fecha).toLocaleDateString('en-CA') : ''
      return f === fechaAyer
    })
    const totalAyer = ventasAyer.reduce((sum, v) => sum + toNumber(v.total), 0)

    const diferencia = totalDia - totalAyer
    const variacion = totalAyer ? (diferencia / totalAyer) * 100 : 0

    // --- Movimientos del turno ---
    const totalTurno = turno
      ? turno.movimientos.reduce(
          (acc, mov) => {
            const monto = Number(mov.monto) || 0
            if (mov.tipo === "entrada") acc.totalEntrada += monto
            if (mov.tipo === "venta") acc.totalEntrada += monto
            if (mov.tipo === "salida") acc.totalSalida += monto
            if (mov.tipo === "devolucion") acc.totalDevoluciones += monto
            if (mov.tipo === "abono") acc.totalAbono += monto
            return acc
          },
          { totalEntrada: 0, totalSalida: 0, totalDevoluciones: 0, totalAbono: 0}
        )
      : { totalEntrada: 0, totalSalida: 0, totalDevoluciones: 0, totalAbono: 0 }

    const totalActualCaja =
      toNumber(turno?.monto_inicial) +
      totalTurno.totalEntrada +
      totalTurno.totalAbono -
      (totalTurno.totalSalida + totalTurno.totalDevoluciones)

    const totalVentas = turno?.movimientos.reduce((acc, m) => m.tipo === 'venta' ? acc + Number(m.monto) : acc, 0) ?? 0

    setStats({
      totalTurno: { ...totalTurno, totalVentas, totalActualCaja },
      totalDia,
      totalMes,
      totalAyer,
      facturasHoy,
      promedioVenta,
      variacion: Number(variacion.toFixed(1)),
    })
  }, [ventas, turno]) 

  return stats
}
