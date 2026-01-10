# Supabase Cloud Setup - Quick Commands

## Si prefieres hacerlo manualmente:

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
cd "c:\Dev\DOCNEX AI\DOCNEX_INICIO"

# 1. Login (se abrirá el navegador)
npx supabase login

# 2. Vincular proyecto (reemplaza XXX con tu Project Reference ID)
npx supabase link --project-ref XXX

# 3. Aplicar migraciones
npx supabase db push
```

## Dónde encontrar el Project Reference ID:

1. Ve al dashboard: https://supabase.com/dashboard
2. Abre tu proyecto
3. Ve a **Settings** → **General**
4. Copia el **Reference ID** (algo como `abcdefghijklmn`)

## Si algo falla:

- Te pedirá la **Database Password** (la que creaste al crear el proyecto)
- Si dice "already linked", ejecuta solo: `npx supabase db push`
