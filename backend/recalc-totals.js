// =====================================================
// RECÁLCULO DE TOTALES DENORMALIZADOS
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================
// Repara projects.spent_* y projects.total_income recalculándolos desde sus
// fuentes (expenses, project_incomes). Los triggers los mantienen al día, pero
// este script permite reparar cualquier drift (p.ej. tras cargas masivas o si
// un trigger estuvo deshabilitado).
//
//   node recalc-totals.js
// =====================================================

require('dotenv').config();
const { db } = require('./database/connection');

async function main() {
    try {
        const spent = await db.query(`
            UPDATE projects p SET
                spent_materials = COALESCE(e.materials, 0),
                spent_labor     = COALESCE(e.labor, 0),
                spent_equipment = COALESCE(e.equipment, 0),
                spent_overhead  = COALESCE(e.overhead, 0),
                total_income    = COALESCE(i.income, 0),
                updated_at = CURRENT_TIMESTAMP
            FROM (SELECT id FROM projects) base
            LEFT JOIN LATERAL (
                SELECT
                    SUM(amount) FILTER (WHERE category = 'materials') AS materials,
                    SUM(amount) FILTER (WHERE category = 'labor') AS labor,
                    SUM(amount) FILTER (WHERE category = 'equipment') AS equipment,
                    SUM(amount) FILTER (WHERE category IN ('overhead','services')) AS overhead
                FROM expenses WHERE project_id = base.id
            ) e ON true
            LEFT JOIN LATERAL (
                SELECT SUM(amount) AS income FROM project_incomes WHERE project_id = base.id
            ) i ON true
            WHERE p.id = base.id
            RETURNING p.id
        `);
        console.log(`✅ Totales recalculados en ${spent.rowCount} proyectos`);
        process.exitCode = 0;
    } catch (err) {
        console.error('❌ Error recalculando totales:', err.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

main();
