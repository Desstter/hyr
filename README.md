# HYR Constructora & Soldadura — Sistema de Gestión

Sistema de gestión integral full-stack para **HYR Constructora & Soldadura**, con módulo de nómina colombiana (DIAN/PILA compliance), control de personal, proyectos y gastos.

## Stack

**Frontend:** Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui · Zustand · React Hook Form

**Backend:** Express.js · PostgreSQL · Node.js

## Features

- **Gestión de Personal** — empleados, contratistas, asignaciones y control de asistencia con registro de llegada/salida
- **Nómina Colombiana** — cálculo automático de prestaciones sociales, PILA, horas extra (25% recargo), descuentos por tardanza y separación de salario base vs precio por día
- **Gestión de Proyectos** — clientes, presupuestos, ítems de presupuesto y calendario
- **Control de Gastos** — seguimiento y reportes de gastos por proyecto
- **Reportes** — exportación a PDF y datos
- **Configuración Dinámica** — tolerancias de tardanza, horas legales y parámetros de nómina configurables desde la UI

## Setup

```bash
# Backend
cd backend
npm install
npm run setup    # Inicializar esquema de base de datos
npm run dev      # Puerto 3001

# Frontend
cd frontend
npm install
npm run dev      # Puerto 3000
```

**Requisitos:** Node.js 18+, PostgreSQL

Configura las variables de entorno en `backend/.env` con las credenciales de tu base de datos.

## Arquitectura

```
hyr/
├── frontend/           # Next.js 15 App Router
│   └── src/
│       ├── app/        # Páginas y layouts
│       ├── components/ # Componentes por dominio (nómina, personal, gastos…)
│       ├── lib/        # API client, hooks, configuración
│       └── store/      # Zustand global state
└── backend/            # Express.js API
    ├── routes/         # Endpoints por dominio
    ├── database/       # Schema, migraciones y conexión
    └── utils/          # Cálculos de nómina colombiana
```
