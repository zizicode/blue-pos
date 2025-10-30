import { useEffect, useState } from "react"
import { useApi } from "@renderer/services/useApi"
import { Venta } from "@renderer/type/pos.types"
import { MovimientoCaja } from "@renderer/type/cashier.type"
import { CuentaPorCobrar } from "@renderer/type/accounts.type"
import { type TurnoActivo } from "@renderer/modules/app/Caja/TurnosCaja/TurnosCaja"

export function useVentasStats(ventas: Venta[] = [], turno?: TurnoActivo | null) {
  const {call} = useApi()
  const toNumber = (x: any) => Number(x) || 0

  const [stats, setStats] = useState({
    totalTurno: {
      totalEntrada: 0,
      totalSalida: 0,
      totalDevoluciones: 0,
      totalAbono: 0,
      totalActualCaja: 0,
      totalVentasContado: 0,
      totalVentasCredito: 0,
      totalPendienteCredito: 0,
    },
    totalDia: 0,
    totalMes: 0,
    totalAyer: 0,
    facturasHoy: 0,
    promedioVenta: 0,
    variacion: 0,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // === 1️⃣ Obtener movimientos de caja ===
        const { success, data: movimientos = [] } = await call("movimientosCaja", "getAll") as {
          success: boolean
          data: MovimientoCaja[]
        }

        if (!success || !Array.isArray(movimientos)) return

        // === 2️⃣ Filtrar solo movimientos de EFECTIVO (id = 1) ===
        const movimientosEfectivo = movimientos.filter(m => m.metodo_pago_id === 1)

        // === 3️⃣ Movimientos correspondientes al turno actual ===
        const movimientosTurno = turno
          ? movimientosEfectivo.filter(m => m.turno_id === turno.id)
          : movimientosEfectivo

        // === 4️⃣ Calcular totales por tipo de movimiento ===
        const totalTurno = movimientosTurno.reduce(
          (acc, mov) => {
            const monto = toNumber(mov.monto)
            switch (mov.tipo) {
              case "entrada":
              case "venta":
                acc.totalEntrada += monto
                break
              case "salida":
                acc.totalSalida += monto
                break
              case "devolucion":
                acc.totalDevoluciones += monto
                break
              case "abono":
                acc.totalAbono += monto
                break
            }
            return acc
          },
          { totalEntrada: 0, totalSalida: 0, totalDevoluciones: 0, totalAbono: 0 }
        )

        // === 5️⃣ Calcular efectivo actual en caja ===
        const totalActualCaja =
          toNumber(turno?.monto_inicial) +
          totalTurno.totalEntrada +
          totalTurno.totalAbono -
          (totalTurno.totalSalida + totalTurno.totalDevoluciones)

        // === 6️⃣ Calcular totales de ventas (solo estadísticas) ===
        const hoy = new Date()
        const fechaHoy = hoy.toLocaleDateString("en-CA")
        const mesActual = hoy.getMonth()
        const añoActual = hoy.getFullYear()

        const ventasContado = ventas.filter(v => v.tipo_venta === "contado")
        const ventasCredito = ventas.filter(v => v.tipo_venta === "credito")

        const totalVentasContado = ventasContado.reduce((s, v) => s + toNumber(v.total), 0)
        const totalVentasCredito = ventasCredito.reduce((s, v) => s + toNumber(v.total), 0)

        // === 7️⃣ Traer cuentas por cobrar para calcular pendientes ===
        const { data: cuentas = [] } = await call("cuentasPorCobrar", "getAll") as {
          data: CuentaPorCobrar[]
        }
        const totalPendienteCredito = cuentas.reduce(
          (s, c) => s + toNumber(c.saldo_pendiente),
          0
        )

        // === 8️⃣ Ventas del día (solo contado) ===
        const ventasHoy = ventasContado.filter(v => {
          const f = v.fecha ? new Date(v.fecha).toLocaleDateString("en-CA") : ""
          return f === fechaHoy
        })
        const totalDia = ventasHoy.reduce((sum, v) => sum + toNumber(v.total), 0)
        const facturasHoy = ventasHoy.length
        const promedioVenta = facturasHoy ? totalDia / facturasHoy : 0

        // === 9️⃣ Ventas del mes ===
        const ventasMes = ventasContado.filter(v => {
          const f = new Date(v.fecha)
          return f.getMonth() === mesActual && f.getFullYear() === añoActual
        })
        const totalMes = ventasMes.reduce((sum, v) => sum + toNumber(v.total), 0)

        // === 🔟 Ventas de ayer ===
        const ayer = new Date()
        ayer.setDate(ayer.getDate() - 1)
        const fechaAyer = ayer.toLocaleDateString("en-CA")

        const ventasAyer = ventasContado.filter(v => {
          const f = v.fecha ? new Date(v.fecha).toLocaleDateString("en-CA") : ""
          return f === fechaAyer
        })
        const totalAyer = ventasAyer.reduce((sum, v) => sum + toNumber(v.total), 0)

        const diferencia = totalDia - totalAyer
        const variacion = totalAyer ? (diferencia / totalAyer) * 100 : 0

        // === ✅ Actualizar estado final ===
        setStats({
          totalTurno: {
            ...totalTurno,
            totalActualCaja,
            totalVentasContado,
            totalVentasCredito,
            totalPendienteCredito,
          },
          totalDia,
          totalMes,
          totalAyer,
          facturasHoy,
          promedioVenta,
          variacion: Number(variacion.toFixed(1)),
        })
      } catch (error) {
        console.error("Error en useVentasStats:", error)
      }
    }

    fetchData()
  }, [ventas, turno])

  return stats
}
