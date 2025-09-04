// =====================================================
// AUDIT LOGGER - MIDDLEWARE PARA AUDITORÍA DE OPERACIONES
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================

const { db } = require('../database/connection');

/**
 * Middleware para logging automático de auditoría
 * Se aplica a rutas que requieren trazabilidad
 * 
 * @param {string} eventType - Tipo de evento (CREATE, UPDATE, DELETE, PROCESS)
 * @param {string} refTable - Tabla de referencia
 */
function auditLogger(eventType, refTable) {
    return async (req, res, next) => {
        // Wrapper del método json para capturar respuesta
        const originalJson = res.json;
        
        res.json = function(data) {
            // Llamar al método original
            const result = originalJson.call(this, data);
            
            // Registrar evento de auditoría de forma asíncrona
            setImmediate(async () => {
                try {
                    await logAuditEvent({
                        actor: req.user?.name || req.ip || 'ANONYMOUS',
                        eventType,
                        refTable,
                        refId: data?.id || req.params?.id,
                        payload: {
                            method: req.method,
                            url: req.originalUrl,
                            userAgent: req.get('User-Agent'),
                            body: sanitizeData(req.body),
                            params: req.params,
                            query: req.query,
                            response: sanitizeResponse(data),
                            timestamp: new Date().toISOString()
                        }
                    });
                } catch (error) {
                    console.error('❌ Error en auditoría:', error.message);
                }
            });
            
            return result;
        };
        
        next();
    };
}

/**
 * Función directa para logging de eventos de auditoría
 * 
 * @param {Object} eventData - Datos del evento
 * @param {string} eventData.actor - Usuario/sistema que ejecuta
 * @param {string} eventData.eventType - Tipo de evento
 * @param {string} eventData.refTable - Tabla afectada
 * @param {string} eventData.refId - ID del registro afectado
 * @param {Object} eventData.payload - Datos adicionales
 */
async function logAuditEvent(eventData) {
    try {
        const {
            actor = 'SYSTEM',
            eventType,
            refTable,
            refId = null,
            payload = {}
        } = eventData;
        
        // Validar datos requeridos
        if (!eventType || !refTable) {
            throw new Error('eventType y refTable son requeridos para auditoría');
        }
        
        const result = await db.query(`
            INSERT INTO audit_events (actor, event_type, ref_table, ref_id, payload)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, created_at
        `, [actor, eventType, refTable, refId, JSON.stringify(payload)]);
        
        console.log(`📋 Evento auditado: ${eventType} en ${refTable} por ${actor}`);
        
        return result.rows[0];
        
    } catch (error) {
        // No fallar la operación principal por error de auditoría
        console.error('❌ Error registrando evento de auditoría:', error.message);
        return null;
    }
}

/**
 * Sanitiza datos sensibles antes de almacenar en auditoría
 * @param {Object} data - Datos a sanitizar
 * @returns {Object} Datos sanitizados
 */
function sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sensitive = ['password', 'token', 'secret', 'key', 'nit', 'document_number'];
    const sanitized = { ...data };
    
    for (const key in sanitized) {
        if (sensitive.some(s => key.toLowerCase().includes(s))) {
            sanitized[key] = '***SANITIZED***';
        }
    }
    
    return sanitized;
}

/**
 * Sanitiza respuestas para auditoría
 * @param {Object} response - Respuesta a sanitizar
 * @returns {Object} Respuesta sanitizada
 */
function sanitizeResponse(response) {
    if (!response || typeof response !== 'object') return response;
    
    // Limitar tamaño de respuesta en auditoría
    const stringified = JSON.stringify(response);
    if (stringified.length > 5000) {
        return {
            message: 'Respuesta truncada por tamaño',
            size: stringified.length,
            summary: response.message || response.id || 'Sin resumen disponible'
        };
    }
    
    return sanitizeData(response);
}

/**
 * Middleware específico para operaciones DIAN
 * Registra eventos relacionados con facturación y nómina electrónica
 */
function dianAuditLogger(documentType) {
    return auditLogger('DIAN_OPERATION', documentType);
}

/**
 * Middleware para operaciones PILA
 */
function pilaAuditLogger() {
    return auditLogger('PILA_OPERATION', 'pila_submissions');
}

/**
 * Middleware para operaciones fiscales
 */
function taxAuditLogger() {
    return auditLogger('TAX_OPERATION', 'tax_tables');
}

/**
 * Obtiene eventos de auditoría con filtros
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Array} Eventos de auditoría
 */
async function getAuditEvents(filters = {}) {
    try {
        const {
            refTable,
            eventType,
            actor,
            dateFrom,
            dateTo,
            limit = 100,
            offset = 0
        } = filters;
        
        let query = `
            SELECT 
                id,
                actor,
                event_type,
                ref_table,
                ref_id,
                payload,
                created_at
            FROM audit_events
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 0;
        
        if (refTable) {
            params.push(refTable);
            query += ` AND ref_table = $${++paramCount}`;
        }
        
        if (eventType) {
            params.push(eventType);
            query += ` AND event_type = $${++paramCount}`;
        }
        
        if (actor) {
            params.push(`%${actor}%`);
            query += ` AND actor ILIKE $${++paramCount}`;
        }
        
        if (dateFrom) {
            params.push(dateFrom);
            query += ` AND created_at >= $${++paramCount}`;
        }
        
        if (dateTo) {
            params.push(dateTo);
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
        return result.rows;
        
    } catch (error) {
        console.error('❌ Error obteniendo eventos de auditoría:', error.message);
        throw error;
    }
}

/**
 * Obtiene estadísticas de auditoría
 * @param {number} days - Días hacia atrás para estadísticas
 * @returns {Object} Estadísticas de eventos
 */
async function getAuditStats(days = 30) {
    try {
        const result = await db.query(`
            SELECT 
                event_type,
                ref_table,
                COUNT(*) as count,
                COUNT(DISTINCT actor) as unique_actors,
                MAX(created_at) as last_event
            FROM audit_events
            WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY event_type, ref_table
            ORDER BY count DESC
        `);
        
        return result.rows;
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas de auditoría:', error.message);
        throw error;
    }
}

/**
 * Limpia eventos de auditoría antiguos
 * @param {number} daysToKeep - Días a mantener
 * @returns {number} Número de registros eliminados
 */
async function cleanupOldAuditEvents(daysToKeep = 90) {
    try {
        const result = await db.query(`
            DELETE FROM audit_events
            WHERE created_at < CURRENT_DATE - INTERVAL '${daysToKeep} days'
        `);
        
        const deletedCount = result.rowCount;
        console.log(`🧹 Limpieza auditoría: ${deletedCount} eventos eliminados (>${daysToKeep} días)`);
        
        return deletedCount;
        
    } catch (error) {
        console.error('❌ Error en limpieza de auditoría:', error.message);
        throw error;
    }
}

module.exports = {
    auditLogger,
    dianAuditLogger,
    pilaAuditLogger,
    taxAuditLogger,
    logAuditEvent,
    getAuditEvents,
    getAuditStats,
    cleanupOldAuditEvents
};