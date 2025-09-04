// =====================================================
// FACTURACIÓN ELECTRÓNICA - SISTEMA UBL 2.1 DIAN
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================

const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');
const { dianAuditLogger, logAuditEvent } = require('../middleware/audit-logger');
const { generateCUFE, generateInvoiceNumber, simulateDIANValidation } = require('../utils/dian-ids');
const { loadTaxConfig, getVATRate, getICARate } = require('../utils/tax-loader');

// =====================================================
// CREACIÓN Y GESTIÓN DE FACTURAS
// =====================================================

/**
 * POST /api/invoicing/invoices
 * Crea nueva factura electrónica con cálculos automáticos
 */
router.post('/invoices', dianAuditLogger('electronic_invoices'), async (req, res) => {
    try {
        const {
            client_name,
            client_nit,
            city,
            items = [],
            year = new Date().getFullYear(),
            notes,
            due_days = 30
        } = req.body;
        
        // Validaciones básicas
        if (!client_name || !city || !items.length) {
            return res.status(400).json({
                error: 'Campos requeridos: client_name, city, items (array no vacío)'
            });
        }
        
        // Validar estructura de items
        for (const item of items) {
            if (!item.description || !item.quantity || !item.unit_price) {
                return res.status(400).json({
                    error: 'Cada item debe tener: description, quantity, unit_price'
                });
            }
        }
        
        // Obtener configuración empresarial
        const companyResult = await db.query('SELECT * FROM company_settings LIMIT 1');
        if (companyResult.rows.length === 0) {
            return res.status(500).json({
                error: 'Configuración empresarial no encontrada. Configure primero la empresa.'
            });
        }
        const companyConfig = companyResult.rows[0];
        
        // Cargar configuración tributaria
        const taxConfig = loadTaxConfig(year);
        
        // Calcular subtotal
        const subtotal = items.reduce((sum, item) => {
            return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
        }, 0);
        
        // Calcular IVA (19% por defecto para construcción)
        const vatRate = getVATRate(year, '19');
        const vatAmount = subtotal * vatRate;
        
        // Calcular ReteICA (si aplica)
        let reteicaAmount = 0;
        try {
            const icaConfig = getICARate(year, city, 'CONSTRUCCION');
            reteicaAmount = subtotal * icaConfig.retention_rate;
        } catch (icaError) {
            console.log(`ℹ️ No se encontró configuración ICA para ${city}, usando 0`);
        }
        
        // Total factura
        const totalAmount = subtotal + vatAmount - reteicaAmount;
        
        // Generar número de factura secuencial
        const lastInvoiceResult = await db.query(`
            SELECT invoice_number FROM electronic_invoices
            WHERE invoice_number LIKE 'SETT%'
            ORDER BY created_at DESC
            LIMIT 1
        `);
        
        let nextSequence = 1;
        if (lastInvoiceResult.rows.length > 0) {
            const lastNumber = lastInvoiceResult.rows[0].invoice_number;
            const lastSequence = parseInt(lastNumber.replace('SETT', ''));
            nextSequence = lastSequence + 1;
        }
        
        const invoiceNumber = generateInvoiceNumber('SETT', nextSequence);
        
        // Generar CUFE
        const issueDate = new Date().toISOString();
        const cufe = generateCUFE({
            invoiceNumber,
            issueDate,
            totalAmount,
            supplierNIT: companyConfig.nit,
            customerNIT: client_nit || '22222222222222'
        });
        
        // Generar XML UBL stub
        const xmlContent = generateUBLXML({
            invoiceNumber,
            cufe,
            issueDate,
            dueDate: new Date(Date.now() + due_days * 24 * 60 * 60 * 1000).toISOString(),
            supplier: companyConfig,
            customer: { name: client_name, nit: client_nit, city },
            items,
            subtotal,
            vatAmount,
            reteicaAmount,
            totalAmount
        });
        
        // Simular validación DIAN
        const dianResponse = simulateDIANValidation('CUFE');
        
        // Guardar factura en base de datos
        const result = await db.query(`
            INSERT INTO electronic_invoices (
                invoice_number, client_name, client_nit, city,
                subtotal, vat_amount, reteica_amount, total_amount,
                cufe, xml_ubl_content, dian_validation_status, line_items
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            invoiceNumber, client_name, client_nit, city,
            subtotal, vatAmount, reteicaAmount, totalAmount,
            cufe, xmlContent, dianResponse.status, JSON.stringify(items)
        ]);
        
        const invoice = result.rows[0];
        
        // Log auditoría
        await logAuditEvent({
            actor: 'USER',
            eventType: 'CREATE',
            refTable: 'electronic_invoices',
            refId: invoice.id,
            payload: {
                action: 'invoice_created',
                invoice_number: invoiceNumber,
                client_name,
                total_amount: totalAmount,
                cufe,
                dian_status: dianResponse.status
            }
        });
        
        res.status(201).json({
            success: true,
            message: 'Factura electrónica creada exitosamente',
            data: {
                ...invoice,
                calculations: {
                    subtotal,
                    vat_rate: vatRate,
                    vat_amount: vatAmount,
                    reteica_amount: reteicaAmount,
                    total_amount: totalAmount
                },
                dian_response: dianResponse
            }
        });
        
    } catch (error) {
        console.error('❌ Error creando factura electrónica:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/invoicing/invoices/:id
 * Obtiene detalle de factura específica incluyendo XML
 */
router.get('/invoices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT * FROM electronic_invoices WHERE id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Factura no encontrada'
            });
        }
        
        const invoice = result.rows[0];
        
        res.json({
            success: true,
            data: {
                ...invoice,
                line_items: JSON.parse(invoice.line_items || '[]')
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo factura:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/invoicing/invoices
 * Lista facturas con filtros opcionales
 */
router.get('/invoices', async (req, res) => {
    try {
        const {
            client_name,
            city,
            status,
            date_from,
            date_to,
            limit = 50,
            offset = 0
        } = req.query;
        
        let query = `
            SELECT 
                id, invoice_number, client_name, client_nit, city,
                subtotal, vat_amount, reteica_amount, total_amount,
                cufe, dian_validation_status, created_at
            FROM electronic_invoices
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 0;
        
        if (client_name) {
            params.push(`%${client_name}%`);
            query += ` AND client_name ILIKE $${++paramCount}`;
        }
        
        if (city) {
            params.push(city);
            query += ` AND city = $${++paramCount}`;
        }
        
        if (status) {
            params.push(status);
            query += ` AND dian_validation_status = $${++paramCount}`;
        }
        
        if (date_from) {
            params.push(date_from);
            query += ` AND created_at >= $${++paramCount}`;
        }
        
        if (date_to) {
            params.push(date_to);
            query += ` AND created_at <= $${++paramCount}`;
        }
        
        query += ` ORDER BY created_at DESC`;
        
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
        const countResult = await db.query(`
            SELECT COUNT(*) as total FROM electronic_invoices WHERE 1=1
            ${client_name ? `AND client_name ILIKE '%${client_name}%'` : ''}
            ${city ? `AND city = '${city}'` : ''}
            ${status ? `AND dian_validation_status = '${status}'` : ''}
        `);
        
        res.json({
            success: true,
            data: {
                invoices: result.rows,
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
        
    } catch (error) {
        console.error('❌ Error listando facturas:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * POST /api/invoicing/invoices/:id/resend-dian
 * Reenvía factura a DIAN (simulado)
 */
router.post('/invoices/:id/resend-dian', dianAuditLogger('electronic_invoices'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que existe la factura
        const invoice = await db.query('SELECT * FROM electronic_invoices WHERE id = $1', [id]);
        if (invoice.rows.length === 0) {
            return res.status(404).json({ error: 'Factura no encontrada' });
        }
        
        // Simular nuevo envío a DIAN
        const dianResponse = simulateDIANValidation('CUFE');
        
        // Actualizar estado
        await db.query(`
            UPDATE electronic_invoices 
            SET dian_validation_status = $1 
            WHERE id = $2
        `, [dianResponse.status, id]);
        
        await logAuditEvent({
            actor: 'USER',
            eventType: 'UPDATE',
            refTable: 'electronic_invoices',
            refId: id,
            payload: {
                action: 'invoice_resent_to_dian',
                previous_status: invoice.rows[0].dian_validation_status,
                new_status: dianResponse.status
            }
        });
        
        res.json({
            success: true,
            message: 'Factura reenviada a DIAN exitosamente',
            data: dianResponse
        });
        
    } catch (error) {
        console.error('❌ Error reenviando factura a DIAN:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// =====================================================
// UTILIDADES XML UBL
// =====================================================

/**
 * Genera XML UBL 2.1 stub para factura electrónica
 * @param {Object} invoiceData - Datos de la factura
 * @returns {string} XML UBL generado
 */
function generateUBLXML(invoiceData) {
    const {
        invoiceNumber,
        cufe,
        issueDate,
        dueDate,
        supplier,
        customer,
        items,
        subtotal,
        vatAmount,
        reteicaAmount,
        totalAmount
    } = invoiceData;
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
    <UBLVersionID>2.1</UBLVersionID>
    <CustomizationID>DIAN 2.1</CustomizationID>
    <ID>${invoiceNumber}</ID>
    <UUID>${cufe}</UUID>
    <IssueDate>${issueDate.split('T')[0]}</IssueDate>
    <DueDate>${dueDate.split('T')[0]}</DueDate>
    <InvoiceTypeCode>1</InvoiceTypeCode>
    <DocumentCurrencyCode>COP</DocumentCurrencyCode>
    
    <!-- Proveedor -->
    <AccountingSupplierParty>
        <Party>
            <PartyName>
                <Name>${supplier.company_name}</Name>
            </PartyName>
            <PartyTaxScheme>
                <RegistrationName>${supplier.company_name}</RegistrationName>
                <CompanyID>${supplier.nit}</CompanyID>
                <TaxScheme>
                    <ID>01</ID>
                    <Name>IVA</Name>
                </TaxScheme>
            </PartyTaxScheme>
        </Party>
    </AccountingSupplierParty>
    
    <!-- Cliente -->
    <AccountingCustomerParty>
        <Party>
            <PartyName>
                <Name>${customer.name}</Name>
            </PartyName>
            <PartyTaxScheme>
                <RegistrationName>${customer.name}</RegistrationName>
                <CompanyID>${customer.nit || '22222222222222'}</CompanyID>
            </PartyTaxScheme>
        </Party>
    </AccountingCustomerParty>
    
    <!-- Totales legales -->
    <LegalMonetaryTotal>
        <LineExtensionAmount currencyID="COP">${subtotal.toFixed(2)}</LineExtensionAmount>
        <TaxExclusiveAmount currencyID="COP">${subtotal.toFixed(2)}</TaxExclusiveAmount>
        <TaxInclusiveAmount currencyID="COP">${(subtotal + vatAmount).toFixed(2)}</TaxInclusiveAmount>
        <PayableAmount currencyID="COP">${totalAmount.toFixed(2)}</PayableAmount>
    </LegalMonetaryTotal>
    
    <!-- Items de factura -->
    ${items.map((item, index) => `
    <InvoiceLine>
        <ID>${index + 1}</ID>
        <InvoicedQuantity unitCode="NIU">${item.quantity}</InvoicedQuantity>
        <LineExtensionAmount currencyID="COP">${(item.quantity * item.unit_price).toFixed(2)}</LineExtensionAmount>
        <Item>
            <Description>${item.description}</Description>
        </Item>
        <Price>
            <PriceAmount currencyID="COP">${item.unit_price.toFixed(2)}</PriceAmount>
        </Price>
    </InvoiceLine>`).join('')}
    
    <!-- Impuestos -->
    <TaxTotal>
        <TaxAmount currencyID="COP">${vatAmount.toFixed(2)}</TaxAmount>
        <TaxSubtotal>
            <TaxableAmount currencyID="COP">${subtotal.toFixed(2)}</TaxableAmount>
            <TaxAmount currencyID="COP">${vatAmount.toFixed(2)}</TaxAmount>
            <TaxCategory>
                <Percent>19.00</Percent>
                <TaxScheme>
                    <ID>01</ID>
                    <Name>IVA</Name>
                </TaxScheme>
            </TaxCategory>
        </TaxSubtotal>
    </TaxTotal>
    
    <!-- Retenciones -->
    ${reteicaAmount > 0 ? `
    <WithholdingTaxTotal>
        <TaxAmount currencyID="COP">${reteicaAmount.toFixed(2)}</TaxAmount>
        <TaxSubtotal>
            <TaxableAmount currencyID="COP">${subtotal.toFixed(2)}</TaxableAmount>
            <TaxAmount currencyID="COP">${reteicaAmount.toFixed(2)}</TaxAmount>
            <TaxCategory>
                <TaxScheme>
                    <ID>07</ID>
                    <Name>ReteICA</Name>
                </TaxScheme>
            </TaxCategory>
        </TaxSubtotal>
    </WithholdingTaxTotal>` : ''}
    
</Invoice>`;
    
    return xml;
}

module.exports = router;