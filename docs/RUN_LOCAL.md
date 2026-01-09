# Run Local

## Prerequisites
- Node.js & npm
- Docker (for Supabase)
- Supabase CLI (`npm install -g supabase`)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start Supabase**
   ```bash
   npx supabase start
   ```

3. **Environment Variables**
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

4. **Start Web App**
   ```bash
   npm run dev
   ```

5. **Access App**
   Open [http://localhost:3000/documents](http://localhost:3000/documents)

## Database Management
- **Reset DB**: `npx supabase db reset`
- **Studio**: [http://127.0.0.1:54323](http://127.0.0.1:54323)
