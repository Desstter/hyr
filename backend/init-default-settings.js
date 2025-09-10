// =====================================================
// SCRIPT DE INICIALIZACIÓN - CONFIGURACIONES POR DEFECTO
// Crear configuraciones base para HYR Constructora
// =====================================================

const { db } = require('./database/connection');

async function initializeDefaultSettings() {
  console.log('🚀 Inicializando configuraciones por defecto...');

  try {
    // Verificar si la tabla settings existe
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'general',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Configuraciones por defecto
    const defaultSettings = [
      {
        key: 'business_profile',
        value: JSON.stringify({
          name: "HYR Constructora & Soldadura",
          contact: "Administrador",
          email: "contacto@hyr-constructora.com",
          phone: "+57 314 567-8901",
          address: "Calle 45 No. 23-67, Sector Industrial\nBarranquilla, Atlántico, Colombia",
          currency: "COP",
          taxId: "901.234.567-8",
          website: "www.hyr-constructora.com"
        }),
        category: 'company',
        description: 'Información del perfil empresarial'
      },
      {
        key: 'dian_settings',
        value: JSON.stringify({
          resolutionNumber: "000000000042",
          resolutionValidUntil: "2025-12-31",
          environment: "2",
          xmlType: "103"
        }),
        category: 'compliance',
        description: 'Configuraciones DIAN para facturación electrónica'
      },
      {
        key: 'theme_settings',
        value: JSON.stringify({
          mode: "light",
          language: "es",
          dateFormat: "dd/MM/yyyy",
          timeFormat: "HH:mm",
          primaryColor: "#3b82f6"
        }),
        category: 'ui',
        description: 'Configuraciones de tema y interfaz'
      },
      {
        key: 'app_preferences',
        value: JSON.stringify({
          notifications: true,
          emailAlerts: true,
          autoBackup: true,
          defaultCurrency: "COP",
          backupFrequency: "daily",
          reportLanguage: "es"
        }),
        category: 'general',
        description: 'Preferencias generales de la aplicación'
      },
      {
        key: 'notification_settings',
        value: JSON.stringify({
          emailEnabled: true,
          pushEnabled: true,
          payrollReminders: true,
          projectDeadlines: true,
          expenseAlerts: true,
          budgetWarnings: true
        }),
        category: 'notifications',
        description: 'Configuraciones de notificaciones'
      },
      {
        key: 'payroll_settings',
        value: JSON.stringify({
          salarioMinimo: 1160000,
          auxilioTransporte: 162000,
          factorPrestacional: 1.58,
          arlClase: "I",
          arlTarifa: 0.522
        }),
        category: 'payroll',
        description: 'Configuraciones de nómina colombiana'
      }
    ];

    // Insertar configuraciones
    for (const setting of defaultSettings) {
      try {
        // Verificar si ya existe
        const existing = await db.query(
          'SELECT id FROM settings WHERE key = $1',
          [setting.key]
        );

        if (existing.rows.length === 0) {
          await db.query(
            `INSERT INTO settings (key, value, category, description) 
             VALUES ($1, $2, $3, $4)`,
            [setting.key, setting.value, setting.category, setting.description]
          );
          console.log(`✅ Configuración '${setting.key}' creada`);
        } else {
          console.log(`⏭️  Configuración '${setting.key}' ya existe`);
        }
      } catch (error) {
        console.error(`❌ Error al crear '${setting.key}':`, error.message);
      }
    }

    // Verificar configuraciones creadas
    const result = await db.query('SELECT key, category FROM settings ORDER BY category, key');
    console.log('\n📋 Configuraciones en base de datos:');
    result.rows.forEach(row => {
      console.log(`   ${row.category}/${row.key}`);
    });

    console.log('\n🎉 Inicialización completada exitosamente!');
    
  } catch (error) {
    console.error('💥 Error en inicialización:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initializeDefaultSettings()
    .then(() => {
      console.log('✨ Script ejecutado correctamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { initializeDefaultSettings };