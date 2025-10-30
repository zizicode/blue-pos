export function formatDate(fechaEntrada: string | number | Date): string {
    if (!fechaEntrada) return "";
  
    const fecha = new Date(fechaEntrada);
    if (isNaN(fecha.getTime())) return "";
  
    const dia = fecha.getDate();
    let mes = fecha.toLocaleString("es-ES", { month: "long" });
    mes = mes.charAt(0).toUpperCase() + mes.slice(1); // capitalizar
    const año = fecha.getFullYear();
  
    return `${dia} ${mes} ${año}`;
  }
  