# HYR Constructora & Soldadura — Sistema de Gestión

> **Este README es "AI-first": está escrito para que un agente de IA (o un dev nuevo)
> entienda y modifique el proyecto con el mínimo contexto posible.** Léelo entero antes
> de tocar nada. Las secciones **⚠️ Gotchas** y **Replicabilidad** condensan los errores
> que ya ocurrieron una vez; respétalas para que no se repitan.

Sistema full-stack de gestión para una empresa colombiana de construcción y soldadura:
personal, nómina colombiana (cumplimiento DIAN/PILA), proyectos, asignaciones, gastos,
ingresos, facturación y reportes.

---

## 1. TL;DR para la IA

- **Backend:** Express + PostgreSQL en `backend/` (puerto **3001**).
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui en `frontend/` (puerto **3002** en prod, **3000** en dev).
- **DB:** PostgreSQL, base `hyr_construction`. **Fuente de verdad del esquema:** `backend/database/schema.sql`.
- **Setup:** `cd backend && npm install && npm run setup` (esquema) o `npm run setup -- --seed` (esquema + demo).
- **Producción:** procesos PM2 `hyr-backend` y `hyr-frontend`; Caddy enruta `hyr.moonhellal.com/api/*` → 3001 y el resto → 3002.
- **Errores de API:** todos pasan por `backend/utils/http.js`, que mapea códigos de PostgreSQL a HTTP. Un 500 casi siempre = problema de BD (tabla/columna/función), no de lógica.

---

## 2. Topología de despliegue

```
Internet
   │  https://hyr.moonhellal.com
   ▼
Caddy  (/srv/caddy/Caddyfile)
   ├── /api/*  → reverse_proxy localhost:3001   (hyr-backend, Express)
   └── /*      → reverse_proxy localhost:3002   (hyr-frontend, Next.js)
                          │
                          ▼
                  PostgreSQL  (localhost:5432, base hyr_construction)
```

- **PM2** corre como usuario `ubuntu`. Dos procesos: `hyr-backend` y `hyr-frontend`.
  ```bash
  sudo -u ubuntu HOME=/home/ubuntu pm2 list
  sudo -u ubuntu HOME=/home/ubuntu pm2 restart hyr-backend     # aplicar cambios de backend
  sudo -u ubuntu HOME=/home/ubuntu pm2 logs hyr-backend --err --lines 50
  sudo -u ubuntu HOME=/home/ubuntu pm2 save                    # tras cambios de procesos
  ```
- En **producción la API es same-origin** (`/api` vía Caddy), así que CORS no interviene.
  En **dev** el frontend (`:3000`) llama directo a `http://<host>:3001/api` → CORS sí aplica
  (lista blanca en `backend/server.js`).
- Salud del backend: `GET /health` → `{status, database}` (verifica la conexión a PostgreSQL).

---

## 3. Mapa del repositorio

```
hyr/
├── README.md                  # este archivo (contexto AI-first)
├── backend/                   # API Express
│   ├── server.js              # entrypoint: middlewares, CORS, rate-limit, montaje de rutas
│   ├── setup-db.js            # `npm run setup`: aplica schema.sql (+ seeds con --seed)
│   ├── .env.example           # plantilla de config (copiar a .env)
│   ├── routes/                # un archivo por dominio (clients, projects, personnel, payroll…)
│   ├── database/
│   │   ├── schema.sql         # ⭐ FUENTE DE VERDAD del esquema (hace DROP SCHEMA public CASCADE)
│   │   ├── seeds.sql          # datos demo con UUIDs fijos (se aplica con `--seed`)
│   │   ├── connection.js      # Pool pg desde variables de entorno
│   │   └── _deprecated/       # esquemas/migraciones viejas — NO son la fuente de verdad
│   ├── utils/
│   │   ├── http.js            # ⭐ sendError(): mapea errores pg → HTTP (evita 500 genéricos)
│   │   ├── payroll-colombia-2025.js   # motor de nómina colombiana 2025
│   │   ├── payroll-config-loader.js   # carga tasas desde annual_payroll_settings
│   │   └── pdf-generators/, excel-generators/   # exportaciones
│   ├── config/
│   │   ├── payroll-2025.js     # tasas de referencia (salud, pensión, ARL, FSP, Ley 114-1…)
│   │   └── tax/2025.json, 2026.json
│   └── __tests__/             # jest (motor de nómina). `npm test`
└── frontend/                  # Next.js 15 App Router
    └── src/
        ├── app/<dominio>/      # páginas por dominio (payroll, personnel, projects, …)
        ├── components/<dominio>/  # componentes UI por dominio + components/ui (shadcn)
        ├── lib/
        │   ├── appConfig.ts    # ⭐ resuelve la URL del backend (ver §6)
        │   ├── api/            # cliente de API por dominio
        │   └── hooks/
        └── store/             # estado global (Zustand)
```

---

## 4. Base de datos

- **Una sola fuente de verdad: `backend/database/schema.sql`.** Todo cambio de esquema
  (tablas, columnas, índices, funciones, vistas, constraints) se hace **ahí**. Las carpetas
  `database/_deprecated/` y los `run-*-migration.js` sueltos son historia, **no** se usan.
- `schema.sql` es **destructivo e idempotente**: empieza con `DROP SCHEMA public CASCADE`.
  Reconstruye todo desde cero. **Nunca lo ejecutes contra una base con datos reales sin backup.**
- ~27 tablas. Las críticas para que la API no devuelva 500: `personnel`, `projects`,
  `clients`, `time_entries`, `payroll_periods`, `payroll_details`, **`project_assignments`**.
- **IDs:** UUID (`gen_random_uuid()`) en las tablas de negocio.
- **Columnas GENERATED** (no aceptan valor en INSERT — Postgres las calcula):
  - `payroll_details`: `total_income`, `total_deductions`, `net_pay`, `total_employer_cost`
  - `projects`: `budget_total`, `spent_total`
  - `time_entries`: `regular_pay`, `overtime_pay`, `total_pay`
- **Tasas de nómina NO viven en triggers.** Se calculan en la capa de aplicación
  (`utils/payroll-colombia-2025.js` + tabla `annual_payroll_settings`). El esquema solo
  guarda estructura, integridad y totales derivados.
- **Permisos en prod:** las tablas son del rol `postgres` y se conceden a `hyruser` vía
  *default privileges* (`ALTER DEFAULT PRIVILEGES … GRANT ALL ON TABLES TO hyruser`), de modo
  que las tablas nuevas creadas por `postgres` ya quedan accesibles para la app.

---

## 5. Backend: convenciones

- **Una ruta por dominio** en `routes/`, montadas en `server.js` bajo `/api/<dominio>`.
- **Manejo de errores:** los handlers hacen `try/catch` y llaman `sendError(res, error)`
  de `utils/http.js`, que traduce el código de PostgreSQL a un HTTP correcto
  (`23505`→409, `23503`/`23502`/`23514`→400, etc.). Si ves un **500** en logs, busca el
  `error:` de pg justo encima: suele ser *relation does not exist*, *column … does not exist*
  o *function result type mismatch* → es un desajuste **esquema ↔ código**, se arregla en `schema.sql`.
- **Consultas SQL parametrizadas** (`$1, $2, …`) vía el `Pool` de `database/connection.js` (`db.query`).
- **Tests:** `npm test` (jest, foco en el motor de nómina).
- **Lint:** `npm run lint` (eslint 9).

---

## 6. Frontend: cómo encuentra al backend

`src/lib/appConfig.ts` resuelve la base URL del API:
- **dev** (`NODE_ENV=development`): `http://<window.location.hostname>:3001/api` (llamada directa al backend).
- **prod:** usa `api.baseUrl` de `public/appconfig.json` = `"/api"`, **same-origin**, y es
  **Caddy** quien enruta `/api/*` al backend. (No hay `rewrites` en `next.config.ts`; el proxy lo hace Caddy.)

> Si replicas el frontend en otro entorno **sin** un proxy que mande `/api/*` al backend,
> debes proveerlo (Caddy/nginx) o añadir un `rewrites()` en `next.config.ts`.

Build de producción (Next 15 con Turbopack): `npm run build && npm run start` (puerto 3002).

---

## 7. Setup / Replicación (probado, sin errores)

```bash
# --- Backend ---
cd backend
cp .env.example .env           # y edita credenciales de tu PostgreSQL
npm install

# Crea la base (si no existe) y aplica el esquema:
#   createdb hyr_construction          # como superusuario/owner
npm run setup                  # solo esquema (recomendado en producción)
npm run setup -- --seed        # esquema + datos de demostración

npm run dev                    # dev en :3001   (o `node server.js` / PM2 en prod)

# --- Frontend ---
cd ../frontend
npm install
npm run dev                    # dev en :3000
# prod: npm run build && npm run start   (:3002)
```

**Requisitos:** Node.js 18+, PostgreSQL 13+ (probado en 16). `gen_random_uuid()` es nativo en PG13+.

`npm run setup` valida al final que las tablas críticas existan y aborta con error claro si falta alguna.

---

## 8. ⚠️ Gotchas (errores que YA ocurrieron — no repetir)

1. **`project_assignments` debe estar en `schema.sql`.** Vivió un tiempo solo en una migración
   `_deprecated/`, así que las instalaciones nuevas no la creaban → la API devolvía **500
   "relation \"project_assignments\" does not exist"** en casi todo (projects, personnel,
   time-entries, assignments). Hoy está en `schema.sql`. Si agregas una tabla, **agrégala ahí**.
2. **Funciones `RETURNS TABLE` deben castear las columnas calculadas** al tipo declarado.
   `get_personnel_availability()` fallaba con *"structure of query does not match function
   result type"* porque un `CASE` devolvía `text` y la firma decía `VARCHAR(50)`. Castea:
   `(CASE … END)::VARCHAR(50)`, `SUM(...)::DECIMAL(4,2)`.
3. **`.gitignore` llegó a ignorar `backend/setup-db.js` y `.env.example`** → el repo no era
   replicable (faltaba el script de setup). Los secretos van en `.env` (ignorado); los
   **scripts de setup y las plantillas `.env.example` SÍ se commitean**.
4. **Columnas GENERATED**: nunca las incluyas en un `INSERT`. Si importas datos de un dump
   viejo, quítalas de la lista de columnas (ver §4).
5. **Restaurar dumps antiguos** (p. ej. los de `export-database.js`) es frágil: pueden faltar
   `CREATE SEQUENCE`, traer columnas GENERATED, IDs string donde hoy hay UUID, JSON inválido
   (`[object Object]`) o violar constraints nuevos. **Backup/restore canónico = `pg_dump`/`pg_restore`**,
   no el script casero. Para una carga de datos sobre un esquema ya creado, usa
   `SET session_replication_role = replica;` dentro de la transacción para desactivar FKs/triggers,
   y luego limpia huérfanos.

---

## 9. Operación en producción (resumen)

```bash
# Reiniciar backend tras cambios de código:
sudo -u ubuntu HOME=/home/ubuntu pm2 restart hyr-backend

# Ver errores recientes:
sudo -u ubuntu HOME=/home/ubuntu pm2 logs hyr-backend --err --lines 50

# Backup de la base:
pg_dump -Fc hyr_construction > hyr_$(date +%F).dump
# Restore:
pg_restore -d hyr_construction --clean --if-exists hyr_YYYY-MM-DD.dump
```

---

## 10. Módulos funcionales

- **Personal** (`personnel`, `contractors`) y **asignaciones** (`project_assignments`): empleados,
  roles, asignación a proyectos, control de asistencia (llegada/salida, tardanzas, horas nocturnas).
- **Nómina colombiana 2025**: prestaciones sociales, PILA, recargos (extra 25%, nocturno 35%,
  dominical/festivo 75%), FSP, Ley 114-1, deducciones. Motor en `utils/payroll-colombia-2025.js`.
- **Proyectos**: clientes, presupuesto (`budget_items`), ingresos (`project_incomes`), gastos (`expenses`).
- **Cumplimiento**: documentos DIAN de nómina electrónica, PILA (CSV), facturación electrónica.
- **Reportes y exportación**: PDF (`pdfkit`) y Excel (`xlsx`).
- **Configuración dinámica**: tolerancias, horas legales y parámetros de nómina desde la UI (`settings`).
