# Backup Scripts

Scripts para crear y restaurar backups de la base de datos antes de migraciones.

## Uso

### Crear Backup

```bash
# Asegúrate de tener las variables de entorno configuradas
# Opción 1: Usando .env.local
node scripts/backup-before-migration.ts

# Opción 2: Pasando variables directamente
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_aqui \
node scripts/backup-before-migration.ts
```

### Variables de Entorno Requeridas

- `NEXT_PUBLIC_SUPABASE_URL`: URL de tu instancia de Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima de Supabase

**⚠️ IMPORTANTE**: Nunca incluyas claves reales en el código fuente. Usa siempre variables de entorno.

### Desarrollo Local

Para desarrollo local con Supabase local, copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Luego edita `.env.local` con tus credenciales locales.

## Archivos Generados

Los backups se guardan en `backups/backup_YYYY-MM-DD-HH-MM-SS.json`

## Seguridad

- ✅ Los archivos `.env*` están en `.gitignore`
- ✅ Solo `.env.example` se incluye en el repositorio
- ✅ Las claves deben pasarse por variables de entorno
