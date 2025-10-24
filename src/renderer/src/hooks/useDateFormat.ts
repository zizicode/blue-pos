import { useState, useEffect, useMemo } from 'react';

// ============================================
// TIPOS Y ENUMS
// ============================================

/**
 * Formatos disponibles para las fechas
 */
export type DateFormat =
  | 'date'              // 26/12/2025
  | 'datetime'          // 26/12/2025 - 15:00
  | 'time'              // 15:00
  | 'time-seconds'      // 15:00:45
  | 'full'              // Sábado 25 de agosto 2025
  | 'relative'          // hoy 15:25, ayer 15:25, hace 2 días
  | 'relative-short'    // hace un momento, hace 5 min, hace 2h
  | 'iso'               // 2025-08-25T15:00:00.000Z
  | 'custom';           // Formato personalizado

/**
 * Opciones de configuración del hook
 */
export interface UseDateFormatOptions {
  format?: DateFormat;
  customFormat?: string;
  locale?: string;
  autoUpdate?: boolean;
  updateInterval?: number; // en milisegundos
  timezone?: string;
}

/**
 * Resultado del hook con todos los formatos disponibles
 */
export interface FormattedDate {
  // Formatos predefinidos
  date: string;                    // 26/12/2025
  datetime: string;                // 26/12/2025 - 15:00
  time: string;                    // 15:00
  timeWithSeconds: string;         // 15:00:45
  full: string;                    // Sábado 25 de agosto 2025
  relative: string;                // hoy 15:25, ayer 15:25
  relativeShort: string;           // hace un momento, hace 5 min
  iso: string;                     // 2025-08-25T15:00:00.000Z
  
  // Información adicional
  timestamp: number;               // Timestamp original
  dateObject: Date;                // Objeto Date
  isToday: boolean;
  isYesterday: boolean;
  isTomorrow: boolean;
  isThisWeek: boolean;
  isThisMonth: boolean;
  isThisYear: boolean;
  
  // Métodos útiles
  format: (format: DateFormat) => string;
  customFormat: (format: string) => string;
}

// ============================================
// CONSTANTES
// ============================================

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Agrega cero a la izquierda si es necesario
 */
const padZero = (num: number): string => num.toString().padStart(2, '0');

/**
 * Obtiene el inicio del día para una fecha
 */
const getStartOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

/**
 * Verifica si dos fechas son del mismo día
 */
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Formatea la fecha en formato DD/MM/YYYY
 */
const formatDate = (date: Date): string => {
  const day = padZero(date.getDate());
  const month = padZero(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Formatea la hora en formato HH:MM
 */
const formatTime = (date: Date): string => {
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());
  return `${hours}:${minutes}`;
};

/**
 * Formatea la hora en formato HH:MM:SS
 */
const formatTimeWithSeconds = (date: Date): string => {
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());
  const seconds = padZero(date.getSeconds());
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Formatea la fecha completa: "Sábado 25 de agosto 2025"
 */
const formatFull = (date: Date): string => {
  const dayName = DAYS_ES[date.getDay()];
  const day = date.getDate();
  const month = MONTHS_ES[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName} ${day} de ${month} ${year}`;
};

/**
 * Formatea la fecha de forma relativa: "hoy 15:25", "ayer 15:25"
 */
const formatRelative = (date: Date, now: Date): string => {
  const time = formatTime(date);
  
  if (isSameDay(date, now)) {
    return `hoy ${time}`;
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return `ayer ${time}`;
  }
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(date, tomorrow)) {
    return `mañana ${time}`;
  }
  
  const diffDays = Math.floor((now.getTime() - date.getTime()) / DAY);
  
  if (diffDays > 0 && diffDays <= 7) {
    return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  }
  
  if (diffDays < 0 && diffDays >= -7) {
    return `en ${Math.abs(diffDays)} día${Math.abs(diffDays) > 1 ? 's' : ''}`;
  }
  
  return formatDate(date);
};

/**
 * Formatea la fecha de forma relativa corta: "hace un momento", "hace 5 min"
 */
const formatRelativeShort = (date: Date, now: Date): string => {
  const diff = now.getTime() - date.getTime();
  const absDiff = Math.abs(diff);
  const isFuture = diff < 0;
  
  // Menos de 1 minuto
  if (absDiff < MINUTE) {
    return isFuture ? 'en un momento' : 'hace un momento';
  }
  
  // Menos de 1 hora
  if (absDiff < HOUR) {
    const minutes = Math.floor(absDiff / MINUTE);
    return isFuture 
      ? `en ${minutes} min`
      : `hace ${minutes} min`;
  }
  
  // Menos de 1 día
  if (absDiff < DAY) {
    const hours = Math.floor(absDiff / HOUR);
    return isFuture
      ? `en ${hours}h`
      : `hace ${hours}h`;
  }
  
  // Menos de 1 semana
  if (absDiff < WEEK) {
    const days = Math.floor(absDiff / DAY);
    return isFuture
      ? `en ${days}d`
      : `hace ${days}d`;
  }
  
  // Más de 1 semana
  const weeks = Math.floor(absDiff / WEEK);
  return isFuture
    ? `en ${weeks} semana${weeks > 1 ? 's' : ''}`
    : `hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
};

/**
 * Formatea según el patrón personalizado
 */
const formatCustom = (date: Date, pattern: string): string => {
  const tokens: Record<string, string> = {
    'YYYY': date.getFullYear().toString(),
    'YY': date.getFullYear().toString().slice(-2),
    'MM': padZero(date.getMonth() + 1),
    'M': (date.getMonth() + 1).toString(),
    'DD': padZero(date.getDate()),
    'D': date.getDate().toString(),
    'HH': padZero(date.getHours()),
    'H': date.getHours().toString(),
    'mm': padZero(date.getMinutes()),
    'm': date.getMinutes().toString(),
    'ss': padZero(date.getSeconds()),
    's': date.getSeconds().toString(),
    'dddd': DAYS_ES[date.getDay()],
    'ddd': DAYS_ES[date.getDay()].slice(0, 3),
    'MMMM': MONTHS_ES[date.getMonth()],
    'MMM': MONTHS_ES[date.getMonth()].slice(0, 3),
  };
  
  let result = pattern;
  Object.entries(tokens).forEach(([token, value]) => {
    result = result.replace(new RegExp(token, 'g'), value);
  });
  
  return result;
};

// ============================================
// HOOK PRINCIPAL
// ============================================

/**
 * Hook para formatear fechas con actualización automática
 * 
 * @example
 * ```tsx
 * const fecha = useDateFormat(timestamp, { 
 *   format: 'relative',
 *   autoUpdate: true 
 * });
 * 
 * return <span>{fecha.relative}</span>
 * ```
 */
export const useDateFormat = (
  timestamp: number | string | Date,
  options: UseDateFormatOptions = {}
): FormattedDate => {
  const {
    autoUpdate = false,
    updateInterval = 1000,
  } = options;

  const [now, setNow] = useState(() => new Date());

  // Convertir timestamp a Date
  const date = useMemo(() => {
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    return new Date(timestamp);
  }, [timestamp]);

  // Actualización automática
  useEffect(() => {
    if (!autoUpdate) return;

    const interval = setInterval(() => {
      setNow(new Date());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [autoUpdate, updateInterval]);

  // Calcular información de la fecha
  const today = useMemo(() => getStartOfDay(now), [now]);
  const isToday = useMemo(() => isSameDay(date, now), [date, now]);
  const isYesterday = useMemo(() => {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(date, yesterday);
  }, [date, today]);
  const isTomorrow = useMemo(() => {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameDay(date, tomorrow);
  }, [date, today]);
  const isThisWeek = useMemo(() => {
    const diff = now.getTime() - date.getTime();
    return Math.abs(diff) < WEEK;
  }, [date, now]);
  const isThisMonth = useMemo(() => {
    return date.getMonth() === now.getMonth() && 
           date.getFullYear() === now.getFullYear();
  }, [date, now]);
  const isThisYear = useMemo(() => {
    return date.getFullYear() === now.getFullYear();
  }, [date, now]);

  // Generar todos los formatos
  const formatted = useMemo((): FormattedDate => {
    const result: FormattedDate = {
      date: formatDate(date),
      datetime: `${formatDate(date)} - ${formatTime(date)}`,
      time: formatTime(date),
      timeWithSeconds: formatTimeWithSeconds(date),
      full: formatFull(date),
      relative: formatRelative(date, now),
      relativeShort: formatRelativeShort(date, now),
      iso: date.toISOString(),
      
      timestamp: date.getTime(),
      dateObject: date,
      isToday,
      isYesterday,
      isTomorrow,
      isThisWeek,
      isThisMonth,
      isThisYear,
      
      format: (fmt: DateFormat) => {
        switch (fmt) {
          case 'date': return result.date;
          case 'datetime': return result.datetime;
          case 'time': return result.time;
          case 'time-seconds': return result.timeWithSeconds;
          case 'full': return result.full;
          case 'relative': return result.relative;
          case 'relative-short': return result.relativeShort;
          case 'iso': return result.iso;
          default: return result.date;
        }
      },
      
      customFormat: (pattern: string) => formatCustom(date, pattern),
    };
    
    return result;
  }, [date, now, isToday, isYesterday, isTomorrow, isThisWeek, isThisMonth, isThisYear]);

  return formatted;
};