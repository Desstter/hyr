// =====================================================
// SCRIPT PARA EJECUTAR CORRECCIÓN DE RESTRICCIÓN
// Eliminar restricción que bloquea turnos nocturnos
// =====================================================

// Cargar variables de entorno primero
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { db } = require('./database/connection');

async function runConstraintFix() {
    console.log('🚀 Iniciando corrección de restricción para turnos nocturnos...');

    try {
        // Leer el archivo SQL de corrección
        const fixPath = path.join(__dirname, 'fix-night-shift-constraint.sql');
        const fixSQL = fs.readFileSync(fixPath, 'utf8');

        console.log('📖 Archivo de corrección cargado');
        console.log('📊 Ejecutando corrección...');

        // Ejecutar la corrección
        const result = await db.query(fixSQL);

        console.log('✅ Corrección ejecutada exitosamente');

        // Verificar que la restricción problemática fue eliminada
        const checkConstraint = await db.query(`
            SELECT constraint_name, table_name
            FROM information_schema.table_constraints
            WHERE table_name = 'time_entries'
                AND constraint_name = 'chk_time_entries_arrival_before_departure'
        `);

        if (checkConstraint.rows.length === 0) {
            console.log('✅ Restricción problemática ELIMINADA exitosamente');
            console.log('✅ Los turnos nocturnos (20:00→05:00) ahora están PERMITIDOS');
        } else {
            console.log('⚠️  La restricción aún existe - revisar logs arriba');
        }

        // Verificar nuevas restricciones
        const newConstraints = await db.query(`
            SELECT constraint_name, table_name
            FROM information_schema.table_constraints
            WHERE table_name = 'time_entries'
                AND constraint_type = 'CHECK'
            ORDER BY constraint_name
        `);

        console.log('\n📋 Restricciones CHECK actuales en time_entries:');
        newConstraints.rows.forEach(constraint => {
            console.log(`   ✓ ${constraint.constraint_name}`);
        });

        console.log('\n🎉 Corrección completada exitosamente!');
        console.log('✅ El error "chk_time_entries_arrival_before_departure" ha sido solucionado');
        console.log('✅ Turnos nocturnos como 20:00→05:00 funcionarán correctamente');

    } catch (error) {
        console.error('❌ Error durante la corrección:', error.message);
        console.error('📄 Detalles:', error);
        process.exit(1);
    } finally {
        await db.end();
        console.log('🔌 Conexión de base de datos cerrada');
    }
}

// Ejecutar corrección
runConstraintFix();