# Sistema de Control de Versiones e Historial - Estado Actual

## ✅ Infraestructura Existente

### 1. Base de Datos
- **`document_history`**: Tabla para snapshots completos del documento
  - Guarda el estado completo de todos los bloques
  - Registra tipo de acción (import_replace, import_merge, restore, bulk_edit)
  - Incluye metadata adicional
  
- **`block_versions`**: Tabla para versiones individuales de bloques
  - Permite guardar múltiples versiones de un mismo bloque
  - Marca versiones activas/inactivas
  - Útil para comparación y restauración granular

### 2. Funcionalidad Implementada
- ✅ **HistorySection.tsx**: Panel de historial con:
  - Lista de eventos cronológicos
  - Botón de restauración por snapshot
  - Contador de bloques por versión
  - Confirmación antes de restaurar
  
- ✅ **Restauración automática**: Crea backup antes de restaurar
- ✅ **API completa**: `listDocumentHistory`, `restoreDocumentFromHistory`

## ⚠️ Puntos de Mejora Recomendados

### 1. Auto-guardado de Snapshots
**Actualmente**: Los snapshots solo se crean en operaciones de importación.
**Recomendación**: Crear snapshots automáticos:
- Cada X minutos de edición activa
- Antes de operaciones destructivas (merge, delete)
- Al cerrar el documento

### 2. Visualización de Diferencias
**Falta**: No hay forma de ver qué cambió entre versiones.
**Recomendación**: Añadir vista diff que muestre:
- Bloques añadidos (verde)
- Bloques eliminados (rojo)
- Bloques modificados (amarillo)

### 3. Recuperación Selectiva
**Falta**: Solo se puede restaurar el documento completo.
**Recomendación**: Permitir:
- Restaurar bloques individuales
- Copiar texto de versiones antiguas sin restaurar
- Comparar versión actual vs histórica lado a lado

### 4. Retención y Limpieza
**Falta**: No hay política de retención.
**Recomendación**: Implementar:
- Límite de snapshots por documento (ej: últimos 50)
- Limpieza automática de snapshots antiguos
- Opción de marcar snapshots como "importantes" para no borrar

## 🎯 Próximos Pasos Sugeridos

1. **Inmediato**: Añadir snapshot automático antes de `db reset` o migraciones
2. **Corto plazo**: Implementar auto-guardado cada 5 minutos
3. **Medio plazo**: Vista diff y recuperación selectiva
4. **Largo plazo**: Sistema de branching para experimentación segura
