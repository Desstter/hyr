// =====================================================
// API ROUTES - SETTINGS (CONFIGURACIONES)
// Gestión de configuraciones del sistema
// =====================================================

const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');

// =====================================================
// GET - Obtener todas las configuraciones
// =====================================================
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        
        let query = 'SELECT * FROM settings';
        let params = [];
        
        if (category) {
            query += ' WHERE category = $1';
            params.push(category);
        }
        
        query += ' ORDER BY category, key';
        
        const result = await db.query(query, params);
        
        // Convertir a formato key-value para facilidad de uso
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = {
                value: row.value,
                category: row.category,
                description: row.description,
                updated_at: row.updated_at
            };
        });
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ 
            error: 'Error al obtener configuraciones',
            details: error.message 
        });
    }
});

// =====================================================
// GET - Obtener configuración específica por key
// =====================================================
router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        
        const result = await db.query(
            'SELECT * FROM settings WHERE key = $1',
            [key]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: `Configuración '${key}' no encontrada` 
            });
        }
        
        const setting = result.rows[0];
        res.json({
            key: setting.key,
            value: setting.value,
            category: setting.category,
            description: setting.description,
            updated_at: setting.updated_at
        });
    } catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({ 
            error: 'Error al obtener configuración',
            details: error.message 
        });
    }
});

// =====================================================
// PUT - Actualizar configuración específica
// =====================================================
router.put('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value, description } = req.body;
        
        if (!value) {
            return res.status(400).json({ 
                error: 'El campo value es requerido' 
            });
        }
        
        // Verificar que la configuración existe
        const existingResult = await db.query(
            'SELECT id FROM settings WHERE key = $1',
            [key]
        );
        
        if (existingResult.rows.length === 0) {
            return res.status(404).json({ 
                error: `Configuración '${key}' no encontrada` 
            });
        }
        
        // Actualizar configuración
        let query = 'UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP';
        let params = [value];
        
        if (description) {
            query += ', description = $2';
            params.push(description);
        }
        
        query += ' WHERE key = $' + (params.length + 1) + ' RETURNING *';
        params.push(key);
        
        const result = await db.query(query, params);
        const updated = result.rows[0];
        
        res.json({
            success: true,
            message: `Configuración '${key}' actualizada exitosamente`,
            data: {
                key: updated.key,
                value: updated.value,
                category: updated.category,
                description: updated.description,
                updated_at: updated.updated_at
            }
        });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ 
            error: 'Error al actualizar configuración',
            details: error.message 
        });
    }
});

// =====================================================
// POST - Crear nueva configuración
// =====================================================
router.post('/', async (req, res) => {
    try {
        const { key, value, category = 'general', description } = req.body;
        
        if (!key || !value) {
            return res.status(400).json({ 
                error: 'Los campos key y value son requeridos' 
            });
        }
        
        // Verificar que la configuración no existe
        const existingResult = await db.query(
            'SELECT id FROM settings WHERE key = $1',
            [key]
        );
        
        if (existingResult.rows.length > 0) {
            return res.status(409).json({ 
                error: `Configuración '${key}' ya existe. Use PUT para actualizar.` 
            });
        }
        
        const result = await db.query(
            `INSERT INTO settings (key, value, category, description) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [key, value, category, description]
        );
        
        const created = result.rows[0];
        
        res.status(201).json({
            success: true,
            message: `Configuración '${key}' creada exitosamente`,
            data: {
                key: created.key,
                value: created.value,
                category: created.category,
                description: created.description,
                created_at: created.created_at
            }
        });
    } catch (error) {
        console.error('Error creating setting:', error);
        res.status(500).json({ 
            error: 'Error al crear configuración',
            details: error.message 
        });
    }
});

// =====================================================
// DELETE - Eliminar configuración
// =====================================================
router.delete('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        
        const result = await db.query(
            'DELETE FROM settings WHERE key = $1 RETURNING key',
            [key]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: `Configuración '${key}' no encontrada` 
            });
        }
        
        res.json({
            success: true,
            message: `Configuración '${key}' eliminada exitosamente`
        });
    } catch (error) {
        console.error('Error deleting setting:', error);
        res.status(500).json({ 
            error: 'Error al eliminar configuración',
            details: error.message 
        });
    }
});

// =====================================================
// POST - Actualización masiva de configuraciones
// =====================================================
router.post('/bulk-update', async (req, res) => {
    try {
        const { settings } = req.body;
        
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ 
                error: 'Se requiere un objeto settings con las configuraciones a actualizar' 
            });
        }
        
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');
            
            const updated = [];
            
            for (const [key, value] of Object.entries(settings)) {
                const result = await client.query(
                    `UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP 
                     WHERE key = $2 RETURNING key, value, updated_at`,
                    [value, key]
                );
                
                if (result.rows.length > 0) {
                    updated.push(result.rows[0]);
                }
            }
            
            await client.query('COMMIT');
            
            res.json({
                success: true,
                message: `${updated.length} configuraciones actualizadas exitosamente`,
                data: updated
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error bulk updating settings:', error);
        res.status(500).json({ 
            error: 'Error al actualizar configuraciones masivamente',
            details: error.message 
        });
    }
});

// =====================================================
// GET - Obtener configuraciones por categoría
// =====================================================
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        
        const result = await db.query(
            'SELECT * FROM settings WHERE category = $1 ORDER BY key',
            [category]
        );
        
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        
        res.json({
            category,
            settings,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching settings by category:', error);
        res.status(500).json({ 
            error: 'Error al obtener configuraciones por categoría',
            details: error.message 
        });
    }
});

// =====================================================
// GET - Resetear configuraciones a valores por defecto
// =====================================================
router.post('/reset/:key', async (req, res) => {
    try {
        const { key } = req.params;
        
        // Definir valores por defecto para cada configuración
        const defaults = {
            business_profile: {
                name: "HYR Constructora & Soldadura",
                contact: "Ing. Roberto Herrera",
                email: "contacto@hyr-constructora.com",
                phone: "+57 314 567-8901",
                address: "Calle 45 No. 23-67, Sector Industrial\nBarranquilla, Atlántico, Colombia",
                currency: "COP (Peso Colombiano)",
                taxId: "901.234.567-8",
                website: "www.hyr-constructora.com"
            },
            theme_settings: {
                mode: "light",
                language: "es",
                dateFormat: "dd/MM/yyyy",
                timeFormat: "HH:mm",
                primaryColor: "#3b82f6"
            },
            app_preferences: {
                notifications: true,
                emailAlerts: true,
                autoBackup: true,
                defaultCurrency: "COP",
                backupFrequency: "daily",
                reportLanguage: "es"
            }
        };
        
        if (!defaults[key]) {
            return res.status(400).json({ 
                error: `No hay valores por defecto definidos para '${key}'` 
            });
        }
        
        const result = await db.query(
            `UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE key = $2 RETURNING *`,
            [JSON.stringify(defaults[key]), key]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: `Configuración '${key}' no encontrada` 
            });
        }
        
        const reset = result.rows[0];
        
        res.json({
            success: true,
            message: `Configuración '${key}' restablecida a valores por defecto`,
            data: {
                key: reset.key,
                value: reset.value,
                updated_at: reset.updated_at
            }
        });
    } catch (error) {
        console.error('Error resetting setting:', error);
        res.status(500).json({ 
            error: 'Error al restablecer configuración',
            details: error.message 
        });
    }
});

module.exports = router;