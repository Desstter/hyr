// =====================================================
// EXPORTADOR DE BASE DE DATOS - HYR CONSTRUCTORA & SOLDADURA
// Genera un dump SQL completo sin requerir pg_dump
// =====================================================

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de conexión
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hyr_construction',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '5432')
});

async function exportDatabase() {
    const client = await pool.connect();
    let sqlDump = '';

    try {
        console.log('🔄 Iniciando exportación de base de datos...');

        // Encabezado del archivo
        sqlDump += `-- =====================================================\n`;
        sqlDump += `-- DUMP BASE DE DATOS: ${process.env.DB_NAME || 'hyr_construction'}\n`;
        sqlDump += `-- Fecha: ${new Date().toISOString()}\n`;
        sqlDump += `-- Generado por: export-database.js\n`;
        sqlDump += `-- =====================================================\n\n`;
        sqlDump += `SET statement_timeout = 0;\n`;
        sqlDump += `SET lock_timeout = 0;\n`;
        sqlDump += `SET client_encoding = 'UTF8';\n`;
        sqlDump += `SET standard_conforming_strings = on;\n\n`;

        // Obtener todas las tablas (excluyendo tablas del sistema)
        const tablesResult = await client.query(`
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        `);

        console.log(`📋 Encontradas ${tablesResult.rows.length} tablas`);

        // Procesar cada tabla
        for (const { tablename } of tablesResult.rows) {
            console.log(`   📦 Exportando tabla: ${tablename}...`);

            sqlDump += `\n-- =====================================================\n`;
            sqlDump += `-- Tabla: ${tablename}\n`;
            sqlDump += `-- =====================================================\n\n`;

            // Obtener estructura de la tabla (DDL)
            const ddlResult = await client.query(`
                SELECT
                    'CREATE TABLE ' || quote_ident(table_name) || ' (' ||
                    string_agg(
                        quote_ident(column_name) || ' ' ||
                        column_type ||
                        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END ||
                        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
                        ', '
                    ) || ');' as create_statement
                FROM (
                    SELECT
                        c.table_name,
                        c.column_name,
                        CASE
                            WHEN c.data_type = 'character varying' THEN 'VARCHAR(' || c.character_maximum_length || ')'
                            WHEN c.data_type = 'character' THEN 'CHAR(' || c.character_maximum_length || ')'
                            WHEN c.data_type = 'numeric' THEN 'NUMERIC(' || c.numeric_precision || ',' || c.numeric_scale || ')'
                            WHEN c.data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
                            WHEN c.data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
                            ELSE UPPER(c.data_type)
                        END as column_type,
                        c.column_default,
                        c.is_nullable,
                        c.ordinal_position
                    FROM information_schema.columns c
                    WHERE c.table_name = $1
                    AND c.table_schema = 'public'
                    ORDER BY c.ordinal_position
                ) cols
                GROUP BY table_name
            `, [tablename]);

            if (ddlResult.rows.length > 0) {
                sqlDump += `-- Estructura\n`;
                sqlDump += `DROP TABLE IF EXISTS ${tablename} CASCADE;\n`;
                sqlDump += ddlResult.rows[0].create_statement + '\n\n';
            }

            // Obtener datos de la tabla
            const dataResult = await client.query(`SELECT * FROM ${tablename}`);

            if (dataResult.rows.length > 0) {
                sqlDump += `-- Datos (${dataResult.rows.length} registros)\n`;

                // Obtener nombres de columnas
                const columns = Object.keys(dataResult.rows[0]);
                const columnsList = columns.map(c => `"${c}"`).join(', ');

                for (const row of dataResult.rows) {
                    const values = columns.map(col => {
                        const val = row[col];
                        if (val === null) return 'NULL';
                        if (typeof val === 'number') return val;
                        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                        if (val instanceof Date) return `'${val.toISOString()}'`;
                        // Escapar comillas simples y convertir a string
                        const escaped = String(val).replace(/'/g, "''");
                        return `'${escaped}'`;
                    }).join(', ');

                    sqlDump += `INSERT INTO ${tablename} (${columnsList}) VALUES (${values});\n`;
                }
                sqlDump += '\n';
            }

            // Obtener constraints (primary keys, foreign keys)
            const constraintsResult = await client.query(`
                SELECT conname, pg_get_constraintdef(oid) as condef
                FROM pg_constraint
                WHERE conrelid = $1::regclass
                AND contype IN ('p', 'f', 'u')
            `, [tablename]);

            if (constraintsResult.rows.length > 0) {
                sqlDump += `-- Constraints\n`;
                for (const { conname, condef } of constraintsResult.rows) {
                    sqlDump += `ALTER TABLE ${tablename} ADD CONSTRAINT ${conname} ${condef};\n`;
                }
                sqlDump += '\n';
            }

            // Obtener índices (excluyendo los generados automáticamente por constraints)
            const indexesResult = await client.query(`
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = $1
                AND schemaname = 'public'
                AND indexname NOT IN (
                    SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass
                )
            `, [tablename]);

            if (indexesResult.rows.length > 0) {
                sqlDump += `-- Índices\n`;
                for (const { indexdef } of indexesResult.rows) {
                    sqlDump += `${indexdef};\n`;
                }
                sqlDump += '\n';
            }
        }

        // Obtener secuencias y actualizar sus valores
        const sequencesResult = await client.query(`
            SELECT sequence_name
            FROM information_schema.sequences
            WHERE sequence_schema = 'public'
        `);

        if (sequencesResult.rows.length > 0) {
            sqlDump += `\n-- =====================================================\n`;
            sqlDump += `-- Secuencias\n`;
            sqlDump += `-- =====================================================\n\n`;

            for (const { sequence_name } of sequencesResult.rows) {
                const seqValue = await client.query(`SELECT last_value FROM ${sequence_name}`);
                sqlDump += `SELECT setval('${sequence_name}', ${seqValue.rows[0].last_value}, true);\n`;
            }
        }

        // Guardar archivo
        const outputPath = path.join(__dirname, 'hyr_database_backup.sql');
        fs.writeFileSync(outputPath, sqlDump, 'utf8');

        console.log('\n✅ Exportación completada exitosamente');
        console.log(`📁 Archivo guardado en: ${outputPath}`);
        console.log(`📊 Tamaño: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

    } catch (error) {
        console.error('❌ Error durante la exportación:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar exportación
exportDatabase()
    .then(() => {
        console.log('\n🎉 Proceso completado');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Error fatal:', error);
        process.exit(1);
    });