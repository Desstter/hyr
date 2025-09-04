// =====================================================
// CONTRATISTAS Y DOCUMENTO SOPORTE DIAN
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================

const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');
const { dianAuditLogger, logAuditEvent } = require('../middleware/audit-logger');
const { generateDocumentSupportNumber, simulateDIANValidation } = require('../utils/dian-ids');
const { calculateWithholdingTax, loadTaxConfig } = require('../utils/tax-loader');

// =====================================================
// GESTIÓN DE CONTRATISTAS
// =====================================================

/**
 * GET /api/contractors
 * Lista todos los contratistas
 */
router.get('/', async (req, res) => {
    try {
        const { obligated_to_invoice, search, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                c.id, c.name, c.document_type, c.document_number, c.email, c.phone,
                c.obligated_to_invoice, c.created_at,
                COALESCE(COUNT(ds.id), 0) as document_support_count,
                COALESCE(SUM(ds.total_amount), 0) as total_payments
            FROM contractors c
            LEFT JOIN document_support ds ON c.id = ds.contractor_id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 0;
        
        if (obligated_to_invoice !== undefined) {
            params.push(obligated_to_invoice === 'true');
            query += ` AND c.obligated_to_invoice = $${++paramCount}`;
        }
        
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (c.name ILIKE $${++paramCount} OR c.document_number ILIKE $${paramCount})`;
        }
        
        query += ` GROUP BY c.id, c.name, c.document_type, c.document_number, c.email, c.phone, c.obligated_to_invoice, c.created_at
                   ORDER BY c.name`;
        
        if (limit) {
            params.push(limit);
            query += ` LIMIT $${++paramCount}`;
        }
        
        if (offset) {
            params.push(offset);
            query += ` OFFSET $${++paramCount}`;
        }
        
        const result = await db.query(query, params);
        
        // Obtener conteo total
        const countQuery = `
            SELECT COUNT(*) as total FROM contractors WHERE 1=1
            ${obligated_to_invoice !== undefined ? `AND obligated_to_invoice = ${obligated_to_invoice === 'true'}` : ''}
            ${search ? `AND (name ILIKE '%${search}%' OR document_number ILIKE '%${search}%')` : ''}
        `;
        const countResult = await db.query(countQuery);
        
        res.json({
            success: true,
            data: {
                contractors: result.rows,
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
        
    } catch (error) {
        console.error('❌ Error listando contratistas:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * POST /api/contractors
 * Crea nuevo contratista
 */
router.post('/', dianAuditLogger('contractors'), async (req, res) => {
    try {
        const {
            name,
            document_type = 'CC',
            document_number,
            email,
            phone,
            address,
            obligated_to_invoice = false
        } = req.body;
        
        // Validaciones
        if (!name || !document_number) {
            return res.status(400).json({
                error: 'Campos requeridos: name, document_number'
            });
        }
        
        // Verificar si ya existe el documento
        const existingContractor = await db.query(`
            SELECT id FROM contractors WHERE document_number = $1
        `, [document_number]);
        
        if (existingContractor.rows.length > 0) {
            return res.status(409).json({
                error: 'Ya existe un contratista con este número de documento'
            });
        }
        
        const result = await db.query(`
            INSERT INTO contractors (
                name, document_type, document_number, email, phone, 
                address, obligated_to_invoice
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [name, document_type, document_number, email, phone, address, obligated_to_invoice]);
        
        const contractor = result.rows[0];
        
        // Log auditoría
        await logAuditEvent({
            actor: 'USER',
            eventType: 'CREATE',
            refTable: 'contractors',
            refId: contractor.id,
            payload: {
                action: 'contractor_created',
                name,
                document_number,
                obligated_to_invoice
            }
        });
        
        res.status(201).json({
            success: true,
            message: 'Contratista creado exitosamente',
            data: contractor
        });
        
    } catch (error) {
        console.error('❌ Error creando contratista:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * PUT /api/contractors/:id
 * Actualiza contratista existente
 */
router.put('/:id', dianAuditLogger('contractors'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            document_type,
            document_number,
            email,
            phone,
            address,
            obligated_to_invoice
        } = req.body;
        
        // Verificar que existe el contratista
        const existingContractor = await db.query('SELECT * FROM contractors WHERE id = $1', [id]);
        if (existingContractor.rows.length === 0) {
            return res.status(404).json({ error: 'Contratista no encontrado' });
        }
        
        // Verificar documento único si cambió
        if (document_number && document_number !== existingContractor.rows[0].document_number) {
            const duplicateCheck = await db.query(`
                SELECT id FROM contractors WHERE document_number = $1 AND id != $2
            `, [document_number, id]);
            
            if (duplicateCheck.rows.length > 0) {
                return res.status(409).json({
                    error: 'Ya existe otro contratista con este número de documento'
                });
            }
        }
        
        const result = await db.query(`
            UPDATE contractors SET
                name = COALESCE($1, name),
                document_type = COALESCE($2, document_type),
                document_number = COALESCE($3, document_number),
                email = COALESCE($4, email),
                phone = COALESCE($5, phone),
                address = COALESCE($6, address),
                obligated_to_invoice = COALESCE($7, obligated_to_invoice)
            WHERE id = $8
            RETURNING *
        `, [name, document_type, document_number, email, phone, address, obligated_to_invoice, id]);
        
        await logAuditEvent({
            actor: 'USER',
            eventType: 'UPDATE',
            refTable: 'contractors',
            refId: id,
            payload: {
                action: 'contractor_updated',
                changes: { name, document_number, obligated_to_invoice }
            }
        });
        
        res.json({
            success: true,
            message: 'Contratista actualizado exitosamente',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error actualizando contratista:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/contractors/:id
 * Obtiene detalle de contratista específico
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                c.*,
                COUNT(ds.id) as document_support_count,
                COALESCE(SUM(ds.total_amount), 0) as total_payments
            FROM contractors c
            LEFT JOIN document_support ds ON c.id = ds.contractor_id
            WHERE c.id = $1
            GROUP BY c.id
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contratista no encontrado' });
        }
        
        // Obtener documentos soporte recientes
        const documentsResult = await db.query(`
            SELECT id, ds_number, concept, base_amount, total_amount, dian_status, created_at
            FROM document_support
            WHERE contractor_id = $1
            ORDER BY created_at DESC
            LIMIT 10
        `, [id]);
        
        res.json({
            success: true,
            data: {
                contractor: result.rows[0],
                recent_documents: documentsResult.rows
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo contratista:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// =====================================================
// DOCUMENTO SOPORTE DIAN
// =====================================================

/**
 * POST /api/document-support
 * Crea documento soporte para compras a no obligados a facturar
 */
router.post('/document-support', dianAuditLogger('document_support'), async (req, res) => {
    try {
        const {
            contractor_id,
            concept,
            base_amount,
            year = new Date().getFullYear(),
            service_type = 'general',
            apply_withholding = true
        } = req.body;
        
        // Validaciones
        if (!contractor_id || !concept || !base_amount) {
            return res.status(400).json({
                error: 'Campos requeridos: contractor_id, concept, base_amount'
            });
        }
        
        if (base_amount <= 0) {
            return res.status(400).json({
                error: 'base_amount debe ser mayor a 0'
            });
        }
        
        // Verificar que existe el contratista
        const contractorResult = await db.query('SELECT * FROM contractors WHERE id = $1', [contractor_id]);
        if (contractorResult.rows.length === 0) {
            return res.status(404).json({ error: 'Contratista no encontrado' });
        }
        
        const contractor = contractorResult.rows[0];
        
        // Verificar que NO esté obligado a facturar
        if (contractor.obligated_to_invoice) {
            return res.status(400).json({
                error: 'El contratista está obligado a facturar. No puede generar documento soporte.'
            });
        }
        
        // Obtener último número de documento soporte
        const lastDocResult = await db.query(`
            SELECT ds_number FROM document_support
            WHERE ds_number LIKE 'DS-HYR-${year}-%'
            ORDER BY created_at DESC
            LIMIT 1
        `);
        
        let nextSequence = 1;
        if (lastDocResult.rows.length > 0) {
            const lastNumber = lastDocResult.rows[0].ds_number;
            const lastSequence = parseInt(lastNumber.split('-')[3]);
            nextSequence = lastSequence + 1;
        }
        
        const dsNumber = generateDocumentSupportNumber(year, nextSequence);
        
        // Cargar configuración tributaria
        const taxConfig = loadTaxConfig(year);
        
        // Calcular retenciones
        const withholdings = {};
        let totalWithholdings = 0;
        
        if (apply_withholding) {
            // Retención en la fuente por servicios
            const withholdingCalc = calculateWithholdingTax(year, base_amount, service_type);
            if (withholdingCalc.applies) {
                withholdings.retencion_fuente = {
                    rate: withholdingCalc.rate,
                    amount: withholdingCalc.amount,
                    concept: service_type,
                    description: withholdingCalc.description
                };
                totalWithholdings += withholdingCalc.amount;
            }
            
            // Para construcción, aplicar también seguridad social sobre 40% si aplica
            if (service_type === 'construction' && base_amount > (4 * taxConfig.uvt)) {
                const socialSecurityBase = base_amount * 0.40; // 40% del valor
                const healthContribution = socialSecurityBase * 0.125; // 12.5% salud
                const pensionContribution = socialSecurityBase * 0.16; // 16% pensión
                
                withholdings.seguridad_social = {
                    base: socialSecurityBase,
                    health: Math.round(healthContribution),
                    pension: Math.round(pensionContribution),
                    total: Math.round(healthContribution + pensionContribution)
                };
                
                totalWithholdings += withholdings.seguridad_social.total;
            }
        }
        
        const totalAmount = base_amount - totalWithholdings;
        
        // Simular validación DIAN
        const dianResponse = simulateDIANValidation('DS');
        
        // Guardar documento soporte
        const result = await db.query(`
            INSERT INTO document_support (
                ds_number, contractor_id, concept, base_amount, 
                withholdings, total_amount, dian_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [
            dsNumber, contractor_id, concept, base_amount,
            JSON.stringify(withholdings), totalAmount, dianResponse.status
        ]);
        
        const documentSupport = result.rows[0];
        
        // Log auditoría
        await logAuditEvent({
            actor: 'USER',
            eventType: 'CREATE',
            refTable: 'document_support',
            refId: documentSupport.id,
            payload: {
                action: 'document_support_created',
                ds_number: dsNumber,
                contractor_name: contractor.name,
                concept,
                base_amount,
                withholdings_amount: totalWithholdings,
                total_amount: totalAmount,
                dian_status: dianResponse.status
            }
        });
        
        res.status(201).json({
            success: true,
            message: 'Documento soporte creado exitosamente',
            data: {
                ...documentSupport,
                contractor: {
                    name: contractor.name,
                    document_number: contractor.document_number
                },
                withholdings: JSON.parse(documentSupport.withholdings),
                calculations: {
                    base_amount,
                    total_withholdings: totalWithholdings,
                    net_amount: totalAmount,
                    withholding_percentage: totalWithholdings > 0 ? (totalWithholdings / base_amount * 100).toFixed(2) : 0
                },
                dian_response: dianResponse
            }
        });
        
    } catch (error) {
        console.error('❌ Error creando documento soporte:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/document-support
 * Lista documentos soporte con filtros
 */
router.get('/document-support', async (req, res) => {
    try {
        const { contractor_id, status, year, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                ds.id, ds.ds_number, ds.concept, ds.base_amount, ds.total_amount,
                ds.dian_status, ds.created_at,
                c.name as contractor_name, c.document_number as contractor_document
            FROM document_support ds
            JOIN contractors c ON ds.contractor_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 0;
        
        if (contractor_id) {
            params.push(contractor_id);
            query += ` AND ds.contractor_id = $${++paramCount}`;
        }
        
        if (status) {
            params.push(status);
            query += ` AND ds.dian_status = $${++paramCount}`;
        }
        
        if (year) {
            params.push(`DS-HYR-${year}-%`);
            query += ` AND ds.ds_number LIKE $${++paramCount}`;
        }
        
        query += ` ORDER BY ds.created_at DESC`;
        
        if (limit) {
            params.push(limit);
            query += ` LIMIT $${++paramCount}`;
        }
        
        if (offset) {
            params.push(offset);
            query += ` OFFSET $${++paramCount}`;
        }
        
        const result = await db.query(query, params);
        
        res.json({
            success: true,
            data: {
                documents: result.rows,
                total: result.rows.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error listando documentos soporte:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/document-support/:id
 * Obtiene detalle completo de documento soporte
 */
router.get('/document-support/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                ds.*,
                c.name as contractor_name,
                c.document_type as contractor_document_type,
                c.document_number as contractor_document_number,
                c.email as contractor_email,
                c.phone as contractor_phone
            FROM document_support ds
            JOIN contractors c ON ds.contractor_id = c.id
            WHERE ds.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Documento soporte no encontrado' });
        }
        
        const document = result.rows[0];
        
        res.json({
            success: true,
            data: {
                ...document,
                withholdings: JSON.parse(document.withholdings || '{}')
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo documento soporte:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

module.exports = router;