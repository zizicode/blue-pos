# Metodología de Uso del Sistema POS
## Guía de Flujos de Trabajo

---

## 📋 Índice

1. [Configuración Inicial](#1-configuración-inicial)
2. [Gestión de Usuarios y Permisos](#2-gestión-de-usuarios-y-permisos)
3. [Configuración de Catálogos](#3-configuración-de-catálogos)
4. [Gestión de Proveedores](#4-gestión-de-proveedores)
5. [Gestión de Productos e Inventario](#5-gestión-de-productos-e-inventario)
6. [Proceso de Compras](#6-proceso-de-compras)
7. [Gestión de Clientes](#7-gestión-de-clientes)
8. [Proceso de Ventas](#8-proceso-de-ventas)
9. [Gestión de Caja](#9-gestión-de-caja)
10. [Cuentas por Cobrar](#10-cuentas-por-cobrar)
11. [Devoluciones](#11-devoluciones)
12. [Reportes y Análisis](#12-reportes-y-análisis)

---

## 1. Configuración Inicial

### Objetivo
Preparar el sistema para su uso operativo por primera vez.

### Flujo de Trabajo

\`\`\`
INICIO
  ↓
[Instalar Base de Datos]
  ├─ Ejecutar: schema_completo.sql
  ├─ Ejecutar: datos_iniciales.sql
  ├─ Ejecutar: triggers.sql
  └─ Ejecutar: vistas.sql
  ↓
[Acceder al Sistema]
  ├─ Usuario: admin
  └─ Password: admin123
  ↓
[Configurar Parámetros del Negocio]
  ├─ Nombre del negocio
  ├─ Moneda y símbolo
  ├─ Formato de folios
  ├─ Políticas de stock
  └─ Políticas de crédito
  ↓
[Verificar Datos Iniciales]
  ├─ Roles creados ✓
  ├─ Permisos asignados ✓
  ├─ Almacén principal ✓
  ├─ Caja principal ✓
  └─ Cliente general ✓
  ↓
FIN
\`\`\`

### Pantallas UI Necesarias

1. **Pantalla de Login**
   - Campo: Usuario
   - Campo: Contraseña
   - Botón: Iniciar Sesión

2. **Pantalla de Configuración General**
   - Sección: Información del Negocio
   - Sección: Configuración de Moneda
   - Sección: Formatos y Folios
   - Sección: Políticas Operativas
   - Botón: Guardar Configuración

---

## 2. Gestión de Usuarios y Permisos

### Objetivo
Crear y administrar usuarios del sistema con roles y permisos específicos.

### Flujo de Trabajo

\`\`\`
INICIO
  ↓
[Crear Nuevo Usuario]
  ├─ Ingresar datos personales
  │  ├─ Nombre completo
  │  ├─ Email
  │  ├─ Usuario (login)
  │  └─ Contraseña
  ├─ Asignar rol
  │  ├─ Administrador (acceso total)
  │  ├─ Gerente (gestión operativa)
  │  ├─ Cajero (ventas y caja)
  │  └─ Almacenista (inventario)
  └─ Activar usuario
  ↓
[Sistema Asigna Permisos Automáticamente]
  └─ Según el rol seleccionado
  ↓
[Usuario Puede Acceder]
  └─ Con sus credenciales
  ↓
FIN
\`\`\`

### Roles y Permisos por Defecto

| Rol | Módulos Accesibles | Acciones Permitidas |
|-----|-------------------|---------------------|
| **Administrador** | Todos | Todas |
| **Gerente** | Productos, Ventas, Compras, Inventario, Clientes, Reportes | Crear, Leer, Actualizar, Cancelar |
| **Cajero** | Ventas, Caja, Productos (solo lectura), Clientes (básico) | Crear ventas, Gestionar caja, Ver productos |
| **Almacenista** | Inventario, Compras, Productos | Gestionar inventario, Registrar compras, Ajustes |

### Pantallas UI Necesarias

1. **Lista de Usuarios**
   - Tabla con usuarios activos
   - Filtros: Rol, Estado
   - Botón: Nuevo Usuario

2. **Formulario de Usuario**
   - Campos de información personal
   - Selector de rol
   - Toggle: Activo/Inactivo
   - Botones: Guardar, Cancelar

3. **Gestión de Roles y Permisos** (Administrador)
   - Lista de roles
   - Matriz de permisos por módulo
   - Checkboxes para asignar/quitar permisos

---

## 3. Configuración de Catálogos

### Objetivo
Configurar los catálogos básicos necesarios para la operación.

### Flujo de Trabajo

\`\`\`
INICIO
  ↓
[Configurar Categorías de Productos]
  ├─ Crear categorías principales
  ├─ Agregar descripción
  └─ Activar/Desactivar según necesidad
  ↓
[Configurar Unidades de Medida]
  ├─ Revisar unidades predefinidas
  └─ Agregar unidades personalizadas si es necesario
  ↓
[Configurar Métodos de Pago]
  ├─ Revisar métodos predefinidos
  ├─ Activar/Desactivar según aceptación
  └─ Definir orden de aparición
  ↓
[Configurar Almacenes] (Opcional)
  ├─ Si maneja múltiples sucursales
  ├─ Crear almacenes adicionales
  └─ Definir almacén principal
  ↓
FIN
\`\`\`

### Pantallas UI Necesarias

1. **Gestión de Categorías**
   - Lista de categorías
   - Formulario: Nombre, Descripción, Estado
   - Botones: Nueva, Editar, Activar/Desactivar

2. **Gestión de Unidades de Medida**
   - Lista de unidades
   - Formulario: Nombre, Abreviatura
   - Botón: Nueva Unidad

3. **Gestión de Métodos de Pago**
   - Lista ordenable de métodos
   - Toggle: Activo/Inactivo
   - Checkbox: Requiere referencia
   - Drag & drop para ordenar

4. **Gestión de Almacenes**
   - Lista de almacenes
   - Formulario: Nombre, Dirección, Teléfono
   - Radio button: Almacén principal
   - Botones: Nuevo, Editar

---

## 4. Gestión de Proveedores

### Objetivo
Registrar y mantener información de proveedores.

### Flujo de Trabajo

\`\`\`
INICIO
  ↓
[Registrar Nuevo Proveedor]
  ├─ Datos básicos
  │  ├─ Nombre o razón social
  │  ├─ Contacto principal
  │  └─ Teléfono
  ├─ Datos adicionales
  │  ├─ Email
  │  ├─ Dirección
  │  └─ RFC (opcional)
  └─ Condiciones comerciales
     ├─ Días de crédito
     └─ Notas especiales
  ↓
[Guardar Proveedor]
  ↓
[Proveedor Disponible para Compras]
  └─ Aparece en selector de compras
  ↓
FIN
\`\`\`

### Pantallas UI Necesarias

1. **Lista de Proveedores**
   - Tabla con proveedores activos
   - Búsqueda por nombre
   - Filtro: Activos/Inactivos
   - Botón: Nuevo Proveedor

2. **Formulario de Proveedor**
   - Sección: Información General
   - Sección: Contacto
   - Sección: Condiciones Comerciales
   - Botones: Guardar, Cancelar

3. **Detalle de Proveedor**
   - Información completa
   - Historial de compras
   - Productos asociados
   - Botón: Editar

---

## 5. Gestión de Productos e Inventario

### Objetivo
Registrar productos y controlar el inventario.

### Flujo de Trabajo Principal

\`\`\`
INICIO
  ↓
[Registrar Nuevo Producto]
  ├─ Información básica
  │  ├─ Código único (manual o automático)
  │  ├─ Código de barras (opcional)
  │  ├─ Nombre del producto
  │  └─ Descripción
  ├─ Clasificación
  │  ├─ Categoría
  │  ├─ Unidad de medida
  │  └─ Proveedor principal
  ├─ Precios
  │  ├─ Precio de compra
  │  └─ Precio de venta
  ├─ Inventario
  │  ├─ Stock inicial
  │  └─ Stock mínimo (para alertas)
  └─ Multimedia (opcional)
     └─ Imagen del producto
  ↓
[Guardar Producto]
  ↓
[Sistema Registra Movimiento Inicial]
  └─ Si stock inicial > 0
  ↓
[Producto Disponible para Venta]
  ↓
FIN
\`\`\`

### Flujo de Ajuste de Inventario

\`\`\`
INICIO
  ↓
[Seleccionar Producto]
  ↓
[Elegir Tipo de Ajuste]
  ├─ Entrada (aumentar stock)
  ├─ Salida (disminuir stock)
  └─ Ajuste (corrección)
  ↓
[Ingresar Cantidad]
  ↓
[Especificar Motivo]
  ├─ Merma
  ├─ Robo
  ├─ Corrección de inventario
  └─ Otro
  ↓
[Confirmar Ajuste]
  ↓
[Sistema Actualiza]
  ├─ Stock del producto
  ├─ Stock por almacén (si aplica)
  └─ Registra movimiento en historial
  ↓
FIN
\`\`\`

### Flujo de Transferencia entre Almacenes

\`\`\`
INICIO
  ↓
[Crear Nueva Transferencia]
  ├─ Seleccionar almacén origen
  ├─ Seleccionar almacén destino
  └─ Generar folio
  ↓
[Agregar Productos]
  ├─ Buscar producto
  ├─ Verificar stock en origen
  └─ Ingresar cantidad a transferir
  ↓
[Revisar Transferencia]
  └─ Lista de productos y cantidades
  ↓
[Confirmar Transferencia]
  ↓
[Sistema Procesa]
  ├─ Estado: "Pendiente"
  ├─ Descuenta stock de origen
  └─ Genera documento
  ↓
[Recepción en Destino]
  ├─ Verificar productos recibidos
  └─ Confirmar recepción
  ↓
[Sistema Actualiza]
  ├─ Estado: "Completada"
  ├─ Aumenta stock en destino
  └─ Registra movimientos
  ↓
FIN
\`\`\`

### Pantallas UI Necesarias

1. **Lista de Productos**
   - Tabla con productos activos
   - Búsqueda: Código, Nombre, Código de barras
   - Filtros: Categoría, Stock bajo, Activos
   - Indicador visual: Stock bajo (rojo)
   - Botón: Nuevo Producto

2. **Formulario de Producto**
   - Tabs: Información General, Precios, Inventario, Multimedia
   - Generador automático de código
   - Lector de código de barras
   - Calculadora de margen de utilidad
   - Botones: Guardar, Cancelar

3. **Detalle de Producto**
   - Información completa
   - Stock actual por almacén
   - Historial de movimientos
   - Gráfica de ventas
   - Botones: Editar, Ajustar Stock

4. **Ajuste de Inventario**
   - Buscador de producto
   - Selector: Tipo de ajuste
   - Campo: Cantidad
   - Campo: Motivo
   - Botones: Confirmar, Cancelar

5. **Transferencias entre Almacenes**
   - Lista de transferencias (Pendientes, Completadas)
   - Formulario de nueva transferencia
   - Selector: Almacén origen/destino
   - Tabla de productos a transferir
   - Botones: Agregar Producto, Confirmar, Cancelar

6. **Dashboard de Inventario**
   - Tarjetas: Total productos, Valor inventario, Productos bajo stock
   - Alertas de stock mínimo
   - Productos más vendidos
   - Productos sin movimiento

---

## 6. Proceso de Compras

### Objetivo
Registrar entradas de mercancía de proveedores.

### Flujo de Trabajo

\`\`\`
INICIO
  ↓
[Iniciar Nueva Compra]
  ├─ Generar folio automático
  ├─ Seleccionar proveedor
  ├─ Seleccionar almacén destino
  └─ Fecha de compra
  ↓
[Agregar Productos]
  ├─ Buscar producto existente
  │  ├─ Por código
  │  ├─ Por nombre
  │  └─ Por código de barras
  ├─ O crear producto nuevo
  ├─ Ingresar cantidad
  └─ Ingresar precio de compra
  ↓
[Sistema Calcula]
  ├─ Subtotal por producto
  └─ Total de la compra
  ↓
[Revisar Compra]
  └─ Lista de productos y totales
  ↓
[Agregar Notas] (Opcional)
  └─ Observaciones de la compra
  ↓
[Confirmar Compra]
  ↓
[Sistema Procesa]
  ├─ Guarda la compra
  ├─ Actualiza stock de productos
  ├─ Actualiza stock por almacén
  ├─ Registra movimientos de inventario
  └─ Actualiza precio de compra del producto
  ↓
[Compra Completada]
  └─ Generar reporte/ticket
  ↓
FIN
\`\`\`

### Pantallas UI Necesarias

1. **Lista de Compras**
   - Tabla de compras registradas
   - Filtros: Fecha, Proveedor, Estado
   - Búsqueda por folio
   - Botón: Nueva Compra

2. **Formulario de Compra**
   - Header: Folio, Fecha, Proveedor, Almacén
   - Buscador de productos
   - Tabla de productos agregados
     - Columnas: Producto, Cantidad, Precio, Subtotal
     - Acciones: Editar, Eliminar
   - Resumen: Total de la compra
   - Campo: Notas
   - Botones: Agregar Producto, Guardar, Cancelar

3. **Detalle de Compra**
   - Información completa
   - Lista de productos comprados
   - Total de la compra
   - Botón: Imprimir, Cancelar (si aplica)

---

## 7. Gestión de Clientes

### Objetivo
Registrar y administrar información de clientes.

### Flujo de Trabajo

\`\`\`
INICIO
  ↓
[Registrar Nuevo Cliente]
  ├─ Datos básicos
  │  ├─ Nombre completo
  │  └─ Teléfono
  ├─ Datos adicionales (opcional)
  │  ├─ Email
  │  ├─ Dirección
  │  └─ RFC
  ├─ Tipo de cliente
  │  ├─ General
  │  ├─ Mayorista
  │  └─ VIP
  └─ Configuración de crédito (opcional)
     └─ Límite de crédito
  ↓
[Guardar Cliente]
  ↓
[Cliente Disponible]
  └─ Para asignar en ventas
  ↓
FIN
\`\`\`

### Pantallas UI Necesarias

1. **Lista de Clientes**
   - Tabla de clientes activos
   - Búsqueda: Nombre, Teléfono
   - Filtros: Tipo, Con crédito, Con deuda
   - Indicador: Clientes con saldo pendiente
   - Botón: Nuevo Cliente

2. **Formulario de Cliente**
   - Sección: Información Personal
   - Sección: Contacto
   - Sección: Configuración de Crédito
   - Selector: Tipo de cliente
   - Botones: Guardar, Cancelar

3. **Detalle de Cliente**
   - Información completa
   - Historial de compras
   - Cuentas por cobrar
   - Estadísticas: Total comprado, Frecuencia
   - Botones: Editar, Ver Historial

---

## 8. Proceso de Ventas

### Objetivo
Realizar ventas de productos a clientes.

### Flujo de Trabajo Principal (Venta de Contado)

\`\`\`
INICIO
  ↓
[Abrir Punto de Venta]
  ├─ Verificar turno de caja abierto
  └─ Generar folio automático
  ↓
[Seleccionar Cliente] (Opcional)
  ├─ Cliente general (por defecto)
  └─ O buscar cliente específico
  ↓
[Agregar Productos]
  ├─ Escanear código de barras
  ├─ O buscar por código/nombre
  ├─ Ingresar cantidad
  └─ Aplicar descuento (si tiene permiso)
     ├─ Por porcentaje
     └─ Por monto fijo
  ↓
[Sistema Calcula]
  ├─ Subtotal por producto
  ├─ Descuentos aplicados
  └─ Total de la venta
  ↓
[Revisar Venta]
  └─ Lista de productos y total
  ↓
[Procesar Pago]
  ├─ Seleccionar método(s) de pago
  │  ├─ Efectivo
  │  ├─ Tarjeta
  │  ├─ Transferencia
  │  └─ Mixto (varios métodos)
  ├─ Ingresar monto por método
  └─ Ingresar referencia (si aplica)
  ↓
[Sistema Calcula Cambio]
  └─ Si pago en efectivo
  ↓
[Confirmar Venta]
  ↓
[Sistema Procesa]
  ├─ Guarda la venta
  ├─ Descuenta stock de productos
  ├─ Registra movimientos de inventario
  ├─ Registra pagos
  ├─ Registra movimiento en caja
  └─ Genera ticket
  ↓
[Imprimir Ticket] (Automático o manual)
  ↓
[Venta Completada]
  ↓
FIN
\`\`\`

### Flujo de Venta a Crédito

\`\`\`
INICIO
  ↓
[Iniciar Venta]
  ↓
[Seleccionar Cliente]
  └─ OBLIGATORIO para venta a crédito
  ↓
[Verificar Límite de Crédito]
  ├─ Saldo actual del cliente
  ├─ Límite de crédito disponible
  └─ ¿Tiene crédito disponible?
     ├─ SÍ → Continuar
     └─ NO → Mostrar alerta, no permitir
  ↓
[Agregar Productos]
  └─ (Igual que venta de contado)
  ↓
[Seleccionar Tipo: CRÉDITO]
  ↓
[Confirmar Venta]
  ↓
[Sistema Procesa]
  ├─ Guarda la venta
  ├─ Descuenta stock
  ├─ Crea cuenta por cobrar
  ├─ Actualiza saldo del cliente
  ├─ Define fecha de vencimiento
  └─ Genera documento
  ↓
[Venta a Crédito Completada]
  ↓
FIN
\`\`\`

### Pantallas UI Necesarias

1. **Punto de Venta (POS)**
   - Layout de dos columnas:
     - Izquierda: Buscador y catálogo de productos
     - Derecha: Carrito de compra
   - Buscador con lector de código de barras
   - Selector de cliente
   - Tabla de productos en carrito
     - Columnas: Producto, Cantidad, Precio, Descuento, Subtotal
     - Acciones: Editar cantidad, Eliminar
   - Panel de totales
     - Subtotal
     - Descuento total
     - Total a pagar
   - Selector: Tipo de venta (Contado/Crédito)
   - Botones: Cobrar, Cancelar, Suspender

2. **Modal de Pago**
   - Total a pagar (destacado)
   - Selector de métodos de pago
   - Campos por método:
     - Efectivo: Monto recibido, Cambio
     - Tarjeta: Monto, Referencia
     - Transferencia: Monto, Referencia
   - Botón: Confirmar Pago

3. **Lista de Ventas**
   - Tabla de ventas realizadas
   - Filtros: Fecha, Cliente, Usuario, Estado, Tipo
   - Búsqueda por folio
   - Botón: Nueva Venta

4. **Detalle de Venta**
   - Información completa
   - Lista de productos vendidos
   - Métodos de pago utilizados
   - Botones: Imprimir, Devolver, Cancelar (si tiene permiso)

5. **Ticket de Venta**
   - Diseño para impresión térmica
   - Header: Logo, Nombre del negocio
   - Folio y fecha
   - Lista de productos
   - Totales
   - Métodos de pago
   - Footer: Mensaje de agradecimiento

---

## 9. Gestión de Caja

### Objetivo
Controlar el efectivo y movimientos de caja durante el turno.

### Flujo de Apertura de Caja

\`\`\`
INICIO
  ↓
[Iniciar Turno]
  ├─ Seleccionar caja
  └─ Usuario actual
  ↓
[Contar Efectivo Inicial]
  └─ Ingresar monto inicial
  ↓
[Confirmar Apertura]
  ↓
[Sistema Registra]
  ├─ Fecha y hora de apertura
  ├─ Usuario responsable
  ├─ Monto inicial
  └─ Estado: "Abierto"
  ↓
[Caja Lista para Operar]
  └─ Permitir ventas
  ↓
FIN
\`\`\`

### Flujo de Movimientos de Caja

\`\`\`
INICIO
  ↓
[Registrar Movimiento]
  ├─ Tipo de movimiento
  │  ├─ Entrada (ingreso adicional)
  │  └─ Salida (gasto, retiro)
  ├─ Monto
  ├─ Método de pago
  ├─ Concepto/Motivo
  └─ Referencia (opcional)
  ↓
[Confirmar Movimiento]
  ↓
[Sistema Registra]
  └─ Asociado al turno actual
  ↓
FIN
\`\`\`

### Flujo de Cierre de Caja

\`\`\`
INICIO
  ↓
[Iniciar Cierre]
  └─ Verificar turno abierto
  ↓
[Sistema Calcula Monto Esperado]
  ├─ Monto inicial
  ├─ + Ventas en efectivo
  ├─ + Entradas adicionales
  └─ - Salidas registradas
  ↓
[Contar Efectivo Real]
  └─ Ingresar monto final contado
  ↓
[Sistema Calcula Diferencia]
  └─ Monto real - Monto esperado
  ↓
[Mostrar Resumen]
  ├─ Monto inicial
  ├─ Total ventas
  ├─ Total entradas
  ├─ Total salidas
  ├─ Monto esperado
  ├─ Monto real
  └─ Diferencia (sobrante/faltante)
  ↓
[Agregar Notas] (Opcional)
  └─ Explicar diferencias
  ↓
[Confirmar Cierre]
  ↓
[Sistema Registra]
  ├─ Fecha y hora de cierre
  ├─ Monto final
  ├─ Diferencia
  └─ Estado: "Cerrado"
  ↓
[Generar Reporte de Cierre]
  └─ Imprimir o exportar
  ↓
FIN
\`\`\`

### Pantallas UI Necesarias

1. **Dashboard de Caja**
   - Estado actual: Abierta/Cerrada
   - Información del turno actual
   - Resumen en tiempo real:
     - Monto inicial
     - Ventas del turno
     - Entradas/Salidas
     - Monto actual esperado
   - Botones: Abrir Caja, Cerrar Caja, Registrar Movimiento

2. **Modal de Apertura de Caja**
   - Selector: Caja
   - Usuario: (automático)
   - Campo: Monto inicial
   - Botones: Confirmar, Cancelar

3. **Modal de Movimiento de Caja**
   - Selector: Tipo (Entrada/Salida)
   - Campo: Monto
   - Selector: Método de pago
   - Campo: Concepto
   - Campo: Referencia
   - Botones: Guardar, Cancelar

4. **Modal de Cierre de Caja**
   - Resumen del turno
   - Campo: Monto final contado
   - Cálculo automático de diferencia
   - Indicador visual: Sobrante (verde) / Faltante (rojo)
   - Campo: Notas
   - Botones: Confirmar Cierre, Cancelar

5. **Historial de Turnos**
   - Tabla de turnos cerrados
   - Filtros: Fecha, Usuario, Caja
   - Columnas: Fecha, Usuario, Monto inicial, Monto final, Diferencia
   - Acción: Ver Detalle

6. **Reporte de Cierre de Caja**
   - Diseño para impresión
   - Información del turno
   - Desglose de movimientos
   - Resumen de ventas por método de pago
   - Totales y diferencias

---

## 10. Cuentas por Cobrar

### Objetivo
Gestionar créditos otorgados a clientes y registrar abonos.

### Flujo de Consulta de Cuentas

\`\`\`
INICIO
  ↓
[Acceder a Cuentas por Cobrar]
  ↓
[Ver Lista de Cuentas]
  ├─ Filtrar por estado
  │  ├─ Pendientes
  │  ├─ Vencidas
  │  └─ Pagadas
  ├─ Filtrar por cliente
  └─ Ordenar por fecha de vencimiento
  ↓
[Seleccionar Cuenta]
  ↓
[Ver Detalle]
  ├─ Información del cliente
  ├─ Venta asociada
  ├─ Monto total
  ├─ Monto pagado
  ├─ Saldo pendiente
  ├─ Fecha de vencimiento
  ├─ Días vencidos (si aplica)
  └─ Historial de abonos
  ↓
FIN
\`\`\`

### Flujo de Registro de Abono

\`\`\`
INICIO
  ↓
[Seleccionar Cuenta por Cobrar]
  ↓
[Iniciar Registro de Abono]
  ├─ Ver saldo pendiente
  └─ Ingresar monto del abono
  ↓
[Validar Monto]
  └─ No debe exceder saldo pendiente
  ↓
[Seleccionar Método de Pago]
  ├─ Efectivo
  ├─ Tarjeta
  ├─ Transferencia
  └─ Cheque
  ↓
[Ingresar Referencia] (Si aplica)
  ↓
[Confirmar Abono]
  ↓
[Sistema Procesa]
  ├─ Registra el abono
  ├─ Actualiza monto pagado
  ├─ Actualiza saldo pendiente
  ├─ Actualiza saldo del cliente
  ├─ Cambia estado si está pagada
  └─ Registra movimiento en caja (si es efectivo)
  ↓
[Generar Comprobante]
  └─ Recibo de abono
  ↓
FIN
\`\`\`

### Pantallas UI Necesarias

1. **Lista de Cuentas por Cobrar**
   - Tabla de cuentas
   - Filtros: Estado, Cliente, Fecha de vencimiento
   - Indicadores visuales:
     - Verde: Al corriente
     - Amarillo: Próximo a vencer
     - Rojo: Vencida
   - Columnas: Cliente, Folio venta, Monto total, Pagado, Saldo, Vencimiento, Días vencidos
   - Acción: Registrar Abono, Ver Detalle

2. **Detalle de Cuenta por Cobrar**
   - Información del cliente
   - Datos de la venta
   - Resumen financiero
   - Historial de abonos (tabla)
   - Botón: Registrar Abono

3. **Modal de Registro de Abono**
   - Información de la cuenta
   - Saldo pendiente (destacado)
   - Campo: Monto del abono
   - Selector: Método de pago
   - Campo: Referencia
   - Botones: Confirmar, Cancelar

4. **Recibo de Abono**
   - Diseño para impresión
   - Información del cliente
   - Folio de venta asociada
   - Monto del abono
   - Saldo restante
   - Método de pago

5. **Dashboard de Cuentas por Cobrar**
   - Tarjetas resumen:
     - Total por cobrar
     - Cuentas vencidas
     - Cuentas por vencer
   - Gráfica: Evolución de cuentas por cobrar
   - Lista: Clientes con mayor deuda
   - Alertas: Cuentas próximas a vencer

---

## 11. Devoluciones

### Objetivo
Procesar devoluciones de productos vendidos.

### Flujo de Trabajo

\`\`\`
INICIO
  ↓
[Iniciar Devolución]
  ├─ Buscar venta original
  │  ├─ Por folio
  │  ├─ Por cliente
  │  └─ Por fecha
  └─ Verificar que sea devolvible
  ↓
[Seleccionar Productos a Devolver]
  ├─ Ver productos de la venta
  ├─ Seleccionar producto(s)
  └─ Ingresar cantidad a devolver
     └─ No puede exceder cantidad vendida
  ↓
[Especificar Motivo]
  ├─ Producto defectuoso
  ├─ Error en la venta
  ├─ Cliente insatisfecho
  └─ Otro
  ↓
[Sistema Calcula Total a Devolver]
  └─ Basado en precio original
  ↓
[Revisar Devolución]
  └─ Lista de productos y total
  ↓
[Confirmar Devolución]
  ↓
[Sistema Procesa]
  ├─ Registra la devolución
  ├─ Devuelve stock a inventario
  ├─ Registra movimientos de inventario
  ├─ Genera nota de crédito
  └─ Registra salida de efectivo en caja
  ↓
[Procesar Reembolso]
  ├─ Efectivo
  ├─ Nota de crédito
  └─ Devolución a tarjeta
  ↓
[Generar Comprobante]
  └─ Ticket de devolución
  ↓
FIN
\`\`\`

### Pantallas UI Necesarias

1. **Lista de Devoluciones**
   - Tabla de devoluciones registradas
   - Filtros: Fecha, Cliente, Estado
   - Búsqueda por folio
   - Botón: Nueva Devolución

2. **Formulario de Devolución**
   - Buscador de venta original
   - Información de la venta
   - Tabla de productos vendidos
     - Checkbox: Seleccionar para devolver
     - Campo: Cantidad a devolver
   - Campo: Motivo de devolución
   - Resumen: Total a devolver
   - Botones: Confirmar, Cancelar

3. **Detalle de Devolución**
   - Información completa
   - Venta original asociada
   - Productos devueltos
   - Total devuelto
   - Botón: Imprimir

4. **Ticket de Devolución**
   - Diseño para impresión
   - Folio de devolución
   - Referencia a venta original
   - Productos devueltos
   - Total devuelto
   - Motivo

---

## 12. Reportes y Análisis

### Objetivo
Generar reportes para análisis y toma de decisiones.

### Reportes Principales

#### 12.1 Reporte de Ventas

\`\`\`
PARÁMETROS
  ├─ Rango de fechas
  ├─ Usuario/Vendedor
  ├─ Cliente
  └─ Tipo de venta
  ↓
INFORMACIÓN MOSTRADA
  ├─ Total de ventas
  ├─ Número de transacciones
  ├─ Ticket promedio
  ├─ Ventas por método de pago
  ├─ Ventas por categoría
  ├─ Productos más vendidos
  └─ Gráficas de tendencias
\`\`\`

#### 12.2 Reporte de Inventario

\`\`\`
INFORMACIÓN MOSTRADA
  ├─ Valor total del inventario
  ├─ Productos con stock bajo
  ├─ Productos sin movimiento
  ├─ Productos más vendidos
  ├─ Rotación de inventario
  └─ Inventario por categoría
\`\`\`

#### 12.3 Reporte de Cuentas por Cobrar

\`\`\`
INFORMACIÓN MOSTRADA
  ├─ Total por cobrar
  ├─ Cuentas vencidas
  ├─ Cuentas por vencer
  ├─ Clientes con mayor deuda
  ├─ Antigüedad de saldos
  └─ Historial de cobros
\`\`\`

#### 12.4 Reporte Financiero

\`\`\`
PARÁMETROS
  └─ Rango de fechas
  ↓
INFORMACIÓN MOSTRADA
  ├─ Ingresos totales
  ├─ Ventas de contado
  ├─ Ventas a crédito
  ├─ Abonos recibidos
  ├─ Devoluciones
  ├─ Gastos (salidas de caja)
  ├─ Utilidad bruta
  └─ Gráficas de flujo de efectivo
\`\`\`

### Pantallas UI Necesarias

1. **Dashboard Principal**
   - Tarjetas de métricas clave:
     - Ventas del día
     - Ventas del mes
     - Productos con stock bajo
     - Cuentas por cobrar vencidas
   - Gráficas:
     - Ventas de los últimos 7 días
     - Productos más vendidos
     - Ventas por categoría
   - Accesos rápidos a reportes

2. **Módulo de Reportes**
   - Menú lateral con tipos de reportes
   - Filtros dinámicos según reporte
   - Visualización de datos:
     - Tablas
     - Gráficas
     - Tarjetas de resumen
   - Botones: Exportar (PDF, Excel), Imprimir

3. **Reporte de Ventas**
   - Filtros: Fecha, Usuario, Cliente, Tipo
   - Resumen ejecutivo
   - Tabla detallada de ventas
   - Gráficas de tendencias
   - Desglose por método de pago

4. **Reporte de Inventario**
   - Filtros: Categoría, Almacén
   - Valor total del inventario
   - Tabla de productos
   - Alertas de stock bajo
   - Productos sin movimiento

5. **Reporte de Cuentas por Cobrar**
   - Filtros: Cliente, Estado, Fecha
   - Resumen de cuentas
   - Tabla de cuentas pendientes
   - Antigüedad de saldos
   - Clientes con mayor deuda

---

## 📊 Resumen de Flujos por Rol

### Administrador
- Configuración inicial del sistema
- Gestión de usuarios y permisos
- Configuración de catálogos
- Acceso a todos los módulos
- Generación de reportes completos

### Gerente
- Gestión de productos e inventario
- Registro de compras
- Supervisión de ventas
- Gestión de clientes y proveedores
- Reportes operativos y financieros

### Cajero
- Apertura y cierre de caja
- Realización de ventas
- Registro de abonos
- Procesamiento de devoluciones
- Consulta de productos y clientes

### Almacenista
- Gestión de inventario
- Registro de compras
- Ajustes de stock
- Transferencias entre almacenes
- Reportes de inventario

---

## 🎨 Consideraciones de Diseño UI

### Principios Generales
1. **Simplicidad**: Interfaces limpias y fáciles de usar
2. **Velocidad**: Minimizar clics para tareas frecuentes
3. **Feedback visual**: Confirmaciones y alertas claras
4. **Responsive**: Adaptable a diferentes dispositivos
5. **Accesibilidad**: Atajos de teclado para operaciones rápidas

### Componentes Clave
- **Buscadores inteligentes**: Autocompletado, búsqueda por múltiples criterios
- **Tablas dinámicas**: Ordenamiento, filtrado, paginación
- **Modales**: Para acciones rápidas sin cambiar de pantalla
- **Notificaciones**: Toast para confirmaciones y alertas
- **Indicadores visuales**: Colores para estados (stock bajo, cuentas vencidas)

### Flujo de Navegación
\`\`\`
Dashboard Principal
  ├─ Ventas
  │  ├─ Punto de Venta (POS)
  │  ├─ Lista de Ventas
  │  └─ Devoluciones
  ├─ Inventario
  │  ├─ Productos
  │  ├─ Categorías
  │  ├─ Ajustes
  │  └─ Transferencias
  ├─ Compras
  │  ├─ Nueva Compra
  │  └─ Historial
  ├─ Clientes
  │  ├─ Lista de Clientes
  │  └─ Cuentas por Cobrar
  ├─ Caja
  │  ├─ Turno Actual
  │  └─ Historial de Turnos
  ├─ Reportes
  │  ├─ Ventas
  │  ├─ Inventario
  │  ├─ Financiero
  │  └─ Cuentas por Cobrar
  └─ Configuración
     ├─ Usuarios
     ├─ Catálogos
     ├─ Proveedores
     └─ Sistema
\`\`\`

---

Esta metodología proporciona una guía completa para diseñar la interfaz de usuario del sistema POS, con flujos de trabajo claros y detallados para cada módulo operativo.
