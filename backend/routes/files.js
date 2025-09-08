// =====================================================
// FILES API - SISTEMA DESCARGAS UNIVERSAL HYR
// Manejo centralizado de todas las descargas del sistema
// =====================================================

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { db } = require('../database/connection');

// Directorio base para exports
const EXPORTS_BASE_DIR = path.join(__dirname, '..', 'exports');

// Tipos de archivos soportados
const SUPPORTED_FILE_TYPES = {
  'pila': {
    dir: 'pila',
    mimeType: 'text/csv',
    extension: 'csv'
  },
  'payroll': {
    dir: 'payroll',
    mimeType: 'application/pdf',
    extension: 'pdf'
  },
  'reports': {
    dir: 'reports',
    mimeType: 'application/pdf',
    extension: 'pdf'
  },
  'invoices': {
    dir: 'invoices',
    mimeType: 'application/pdf',
    extension: 'pdf'
  },
  'certificates': {
    dir: 'certificates',
    mimeType: 'application/pdf',
    extension: 'pdf'
  },
  'budgets': {
    dir: 'budgets',
    mimeType: 'application/pdf',
    extension: 'pdf'
  }
};

// =====================================================
// ENDPOINTS DE DESCARGA
// =====================================================

/**
 * GET /api/files/download/:type/:filename
 * Descarga universal de archivos por tipo
 */
router.get('/download/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    // Validar tipo de archivo
    if (!SUPPORTED_FILE_TYPES[type]) {
      return res.status(400).json({
        error: `Tipo de archivo no soportado: ${type}`,
        supportedTypes: Object.keys(SUPPORTED_FILE_TYPES)
      });
    }
    
    const fileConfig = SUPPORTED_FILE_TYPES[type];
    const filePath = path.join(EXPORTS_BASE_DIR, fileConfig.dir, filename);
    
    // Verificar que el archivo existe
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        error: `Archivo no encontrado: ${filename}`,
        path: `/${fileConfig.dir}/${filename}`
      });
    }
    
    // Obtener información del archivo
    const fileStats = await fs.stat(filePath);
    const fileContent = await fs.readFile(filePath);
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', fileConfig.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileStats.size);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Para CSVs, agregar BOM para Excel
    if (fileConfig.mimeType === 'text/csv') {
      const BOM = Buffer.from('\uFEFF', 'utf8');
      res.send(Buffer.concat([BOM, fileContent]));
    } else {
      res.send(fileContent);
    }
    
    // Log de descarga
    console.log(`📥 Archivo descargado: ${type}/${filename} (${fileStats.size} bytes)`);
    
  } catch (error) {
    console.error('❌ Error descargando archivo:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * GET /api/files/list/:type
 * Lista archivos disponibles por tipo
 */
router.get('/list/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    if (!SUPPORTED_FILE_TYPES[type]) {
      return res.status(400).json({
        error: `Tipo de archivo no soportado: ${type}`,
        supportedTypes: Object.keys(SUPPORTED_FILE_TYPES)
      });
    }
    
    const fileConfig = SUPPORTED_FILE_TYPES[type];
    const dirPath = path.join(EXPORTS_BASE_DIR, fileConfig.dir);
    
    // Crear directorio si no existe
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Ignorar si ya existe
    }
    
    // Leer archivos del directorio
    let files = await fs.readdir(dirPath);
    
    // Filtrar solo archivos con la extensión correcta
    files = files.filter(file => file.endsWith(`.${fileConfig.extension}`));
    
    // Obtener información detallada de cada archivo
    const filesWithInfo = await Promise.all(
      files.slice(offset, offset + parseInt(limit)).map(async (filename) => {
        const filePath = path.join(dirPath, filename);
        const stats = await fs.stat(filePath);
        
        return {
          filename,
          type,
          size: stats.size,
          created_at: stats.birthtime.toISOString(),
          modified_at: stats.mtime.toISOString(),
          download_url: `/api/files/download/${type}/${filename}`,
          mime_type: fileConfig.mimeType
        };
      })
    );
    
    // Ordenar por fecha de creación descendente
    filesWithInfo.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({
      success: true,
      data: {
        files: filesWithInfo,
        total: files.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        type,
        directory: fileConfig.dir
      }
    });
    
  } catch (error) {
    console.error('❌ Error listando archivos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * DELETE /api/files/:type/:filename
 * Elimina un archivo específico
 */
router.delete('/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    if (!SUPPORTED_FILE_TYPES[type]) {
      return res.status(400).json({
        error: `Tipo de archivo no soportado: ${type}`,
        supportedTypes: Object.keys(SUPPORTED_FILE_TYPES)
      });
    }
    
    const fileConfig = SUPPORTED_FILE_TYPES[type];
    const filePath = path.join(EXPORTS_BASE_DIR, fileConfig.dir, filename);
    
    // Verificar que el archivo existe
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        error: `Archivo no encontrado: ${filename}`
      });
    }
    
    // Eliminar archivo
    await fs.unlink(filePath);
    
    res.json({
      success: true,
      message: `Archivo ${filename} eliminado exitosamente`,
      filename,
      type
    });
    
    console.log(`🗑️ Archivo eliminado: ${type}/${filename}`);
    
  } catch (error) {
    console.error('❌ Error eliminando archivo:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * POST /api/files/cleanup/:type
 * Limpia archivos antiguos por tipo
 */
router.post('/cleanup/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { days_old = 30 } = req.body;
    
    if (!SUPPORTED_FILE_TYPES[type]) {
      return res.status(400).json({
        error: `Tipo de archivo no soportado: ${type}`,
        supportedTypes: Object.keys(SUPPORTED_FILE_TYPES)
      });
    }
    
    const fileConfig = SUPPORTED_FILE_TYPES[type];
    const dirPath = path.join(EXPORTS_BASE_DIR, fileConfig.dir);
    
    // Fecha límite
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days_old);
    
    const files = await fs.readdir(dirPath);
    let deletedCount = 0;
    const deletedFiles = [];
    
    for (const filename of files) {
      if (!filename.endsWith(`.${fileConfig.extension}`)) continue;
      
      const filePath = path.join(dirPath, filename);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        deletedCount++;
        deletedFiles.push(filename);
      }
    }
    
    res.json({
      success: true,
      message: `Limpieza completada para ${type}`,
      deleted_count: deletedCount,
      deleted_files: deletedFiles,
      cutoff_date: cutoffDate.toISOString(),
      days_old
    });
    
    console.log(`🧹 Limpieza ${type}: ${deletedCount} archivos eliminados`);
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * GET /api/files/info
 * Información del sistema de archivos
 */
router.get('/info', async (req, res) => {
  try {
    const info = {
      base_directory: EXPORTS_BASE_DIR,
      supported_types: SUPPORTED_FILE_TYPES,
      endpoints: {
        download: '/api/files/download/:type/:filename',
        list: '/api/files/list/:type',
        delete: '/api/files/:type/:filename',
        cleanup: '/api/files/cleanup/:type'
      }
    };
    
    // Obtener estadísticas por tipo
    const stats = {};
    
    for (const [type, config] of Object.entries(SUPPORTED_FILE_TYPES)) {
      try {
        const dirPath = path.join(EXPORTS_BASE_DIR, config.dir);
        const files = await fs.readdir(dirPath);
        const validFiles = files.filter(file => file.endsWith(`.${config.extension}`));
        
        let totalSize = 0;
        for (const filename of validFiles) {
          const filePath = path.join(dirPath, filename);
          const stat = await fs.stat(filePath);
          totalSize += stat.size;
        }
        
        stats[type] = {
          count: validFiles.length,
          total_size: totalSize,
          directory: config.dir
        };
      } catch (error) {
        stats[type] = {
          count: 0,
          total_size: 0,
          directory: config.dir,
          error: 'Directory not accessible'
        };
      }
    }
    
    res.json({
      success: true,
      data: {
        ...info,
        statistics: stats,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo info del sistema:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// =====================================================
// UTILIDADES INTERNAS
// =====================================================

/**
 * Crear directorios necesarios al inicializar
 */
async function initializeDirectories() {
  try {
    await fs.mkdir(EXPORTS_BASE_DIR, { recursive: true });
    
    for (const config of Object.values(SUPPORTED_FILE_TYPES)) {
      const dirPath = path.join(EXPORTS_BASE_DIR, config.dir);
      await fs.mkdir(dirPath, { recursive: true });
    }
    
    console.log('📁 Directorios de exports inicializados');
  } catch (error) {
    console.error('❌ Error inicializando directorios:', error);
  }
}

// Inicializar directorios al cargar el módulo
initializeDirectories();

module.exports = router;