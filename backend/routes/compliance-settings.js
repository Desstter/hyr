// =====================================================
// COMPLIANCE SETTINGS - CONFIGURACIÓN EMPRESARIAL Y TRIBUTARIA
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================

const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');
const { auditLogger, logAuditEvent, taxAuditLogger } = require('../middleware/audit-logger');
const { loadTaxConfig, getAvailableYears, reloadTaxConfig } = require('../utils/tax-loader');

// =====================================================
// CONFIGURACIÓN EMPRESARIAL
// =====================================================

/**
 * GET /api/settings/company
 * Obtiene configuración empresarial actual
 */
router.get('/company', auditLogger('READ', 'company_settings'), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                id,
                company_name,
                nit,
                dv,
                ciiu,
                address,
                phone,
                email,
                dian_invoice_resolution,
                dian_payroll_resolution,
                created_at,
                updated_at
            FROM company_settings
            ORDER BY created_at DESC
            LIMIT 1
        `);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Configuración empresarial no encontrada' 
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo configuración empresarial:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

/**
 * POST /api/settings/company
 * Actualiza configuración empresarial
 */
router.post('/company', auditLogger('UPDATE', 'company_settings'), async (req, res) => {
    try {
        const {
            company_name,
            nit,
            dv,
            ciiu,
            address,
            phone,
            email,
            dian_invoice_resolution,
            dian_payroll_resolution
        } = req.body;
        
        // Validaciones básicas
        if (!company_name || !nit || !ciiu) {
            return res.status(400).json({
                error: 'Campos requeridos: company_name, nit, ciiu'
            });
        }
        
        // Verificar si existe configuración
        const existingConfig = await db.query('SELECT id FROM company_settings LIMIT 1');
        
        let query, params;
        
        if (existingConfig.rows.length === 0) {
            // Crear nueva configuración
            query = `
                INSERT INTO company_settings (
                    company_name, nit, dv, ciiu, address, phone, email,
                    dian_invoice_resolution, dian_payroll_resolution
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;
            params = [
                company_name, nit, dv, ciiu, address, phone, email,
                JSON.stringify(dian_invoice_resolution),
                JSON.stringify(dian_payroll_resolution)
            ];
        } else {
            // Actualizar configuración existente
            query = `
                UPDATE company_settings SET
                    company_name = $1,
                    nit = $2,
                    dv = $3,
                    ciiu = $4,
                    address = $5,
                    phone = $6,
                    email = $7,
                    dian_invoice_resolution = $8,
                    dian_payroll_resolution = $9,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $10
                RETURNING *
            `;
            params = [
                company_name, nit, dv, ciiu, address, phone, email,
                JSON.stringify(dian_invoice_resolution),
                JSON.stringify(dian_payroll_resolution),
                existingConfig.rows[0].id
            ];
        }
        
        const result = await db.query(query, params);
        
        // Log evento de auditoría
        await logAuditEvent({
            actor: 'USER',
            eventType: existingConfig.rows.length === 0 ? 'CREATE' : 'UPDATE',
            refTable: 'company_settings',
            refId: result.rows[0].id,
            payload: { 
                action: 'company_settings_updated',
                changes: { company_name, nit, ciiu }
            }
        });
        
        res.json({
            success: true,
            message: 'Configuración empresarial actualizada exitosamente',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error actualizando configuración empresarial:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// =====================================================
// CONFIGURACIÓN TRIBUTARIA
// =====================================================

/**
 * GET /api/tax/:year
 * Obtiene configuración tributaria para un año específico
 */
router.get('/:year', taxAuditLogger(), async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        
        // Validar año
        if (isNaN(year) || year < 2020 || year > 2030) {
            return res.status(400).json({
                error: 'Año inválido. Debe estar entre 2020 y 2030'
            });
        }
        
        // Intentar cargar desde archivo JSON primero
        try {
            const taxConfig = loadTaxConfig(year);
            res.json({
                success: true,
                source: 'file',
                data: taxConfig
            });
            return;
        } catch (fileError) {
            console.log(`ℹ️ Archivo de configuración ${year} no encontrado, buscando en DB`);
        }
        
        // Buscar en base de datos
        const result = await db.query(`
            SELECT * FROM tax_tables WHERE year = $1
        `, [year]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: `Configuración tributaria no encontrada para el año ${year}`,
                available_years: getAvailableYears()
            });
        }
        
        res.json({
            success: true,
            source: 'database',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo configuración tributaria:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

/**
 * POST /api/tax/:year
 * Actualiza/crea configuración tributaria para un año
 */
router.post('/:year', taxAuditLogger(), async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        const {
            uvt_value,
            vat_rates,
            ica,
            withholding_tax
        } = req.body;
        
        // Validaciones
        if (isNaN(year) || year < 2020 || year > 2030) {
            return res.status(400).json({
                error: 'Año inválido'
            });
        }
        
        if (!uvt_value || uvt_value <= 0) {
            return res.status(400).json({
                error: 'uvt_value es requerido y debe ser mayor a 0'
            });
        }
        
        // Verificar si ya existe configuración para el año
        const existingConfig = await db.query(
            'SELECT year FROM tax_tables WHERE year = $1', 
            [year]
        );
        
        let query, params;
        
        if (existingConfig.rows.length === 0) {
            // Crear nueva configuración
            query = `
                INSERT INTO tax_tables (year, uvt_value, vat_rates, ica, withholding_tax)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            params = [
                year,
                uvt_value,
                JSON.stringify(vat_rates),
                JSON.stringify(ica),
                JSON.stringify(withholding_tax)
            ];
        } else {
            // Actualizar configuración existente
            query = `
                UPDATE tax_tables SET
                    uvt_value = $2,
                    vat_rates = $3,
                    ica = $4,
                    withholding_tax = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE year = $1
                RETURNING *
            `;
            params = [
                year,
                uvt_value,
                JSON.stringify(vat_rates),
                JSON.stringify(ica),
                JSON.stringify(withholding_tax)
            ];
        }
        
        const result = await db.query(query, params);
        
        // Log evento de auditoría
        await logAuditEvent({
            actor: 'USER',
            eventType: existingConfig.rows.length === 0 ? 'CREATE' : 'UPDATE',
            refTable: 'tax_tables',
            refId: year.toString(),
            payload: { 
                action: 'tax_configuration_updated',
                year,
                uvt_value
            }
        });
        
        // Recargar configuración en cache si existe archivo
        try {
            reloadTaxConfig(year);
        } catch (reloadError) {
            console.log(`ℹ️ No se pudo recargar cache para año ${year}`);
        }
        
        res.json({
            success: true,
            message: `Configuración tributaria ${year} ${existingConfig.rows.length === 0 ? 'creada' : 'actualizada'} exitosamente`,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error actualizando configuración tributaria:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

/**
 * GET /api/tax/years/available
 * Lista años disponibles de configuración tributaria
 */
router.get('/years/available', async (req, res) => {
    try {
        // Años desde archivos JSON
        const fileYears = getAvailableYears();
        
        // Años desde base de datos
        const dbResult = await db.query(`
            SELECT year FROM tax_tables ORDER BY year DESC
        `);
        const dbYears = dbResult.rows.map(row => row.year);
        
        // Combinar y eliminar duplicados
        const allYears = [...new Set([...fileYears, ...dbYears])].sort((a, b) => b - a);
        
        res.json({
            success: true,
            data: {
                available_years: allYears,
                file_years: fileYears,
                database_years: dbYears,
                current_year: new Date().getFullYear()
            }
        });
        
    } catch (error) {
        console.error('❌ Error listando años disponibles:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

module.exports = router;