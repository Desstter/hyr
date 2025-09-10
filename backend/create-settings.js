// =====================================================
// SCRIPT DE INICIALIZACIÓN VIA API - CONFIGURACIONES POR DEFECTO
// Crear configuraciones base usando la API REST
// =====================================================

const http = require('http');

function makeApiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function createDefaultSettings() {
  console.log('🚀 Creando configuraciones por defecto via API...');

  const defaultSettings = [
    {
      key: 'business_profile',
      value: {
        name: "HYR Constructora & Soldadura",
        contact: "Administrador",
        email: "contacto@hyr-constructora.com",
        phone: "+57 314 567-8901",
        address: "Calle 45 No. 23-67, Sector Industrial\nBarranquilla, Atlántico, Colombia",
        currency: "COP",
        taxId: "901.234.567-8",
        website: "www.hyr-constructora.com"
      },
      category: 'company',
      description: 'Información del perfil empresarial'
    },
    {
      key: 'dian_settings',
      value: {
        resolutionNumber: "000000000042",
        resolutionValidUntil: "2025-12-31",
        environment: "2",
        xmlType: "103"
      },
      category: 'compliance',
      description: 'Configuraciones DIAN para facturación electrónica'
    },
    {
      key: 'theme_settings',
      value: {
        mode: "light",
        language: "es",
        dateFormat: "dd/MM/yyyy",
        timeFormat: "HH:mm",
        primaryColor: "#3b82f6"
      },
      category: 'ui',
      description: 'Configuraciones de tema y interfaz'
    },
    {
      key: 'app_preferences',
      value: {
        notifications: true,
        emailAlerts: true,
        autoBackup: true,
        defaultCurrency: "COP",
        backupFrequency: "daily",
        reportLanguage: "es"
      },
      category: 'general',
      description: 'Preferencias generales de la aplicación'
    },
    {
      key: 'notification_settings',
      value: {
        emailEnabled: true,
        pushEnabled: true,
        payrollReminders: true,
        projectDeadlines: true,
        expenseAlerts: true,
        budgetWarnings: true
      },
      category: 'notifications',
      description: 'Configuraciones de notificaciones'
    },
    {
      key: 'payroll_settings',
      value: {
        salarioMinimo: 1160000,
        auxilioTransporte: 162000,
        factorPrestacional: 1.58,
        arlClase: "I",
        arlTarifa: 0.522
      },
      category: 'payroll',
      description: 'Configuraciones de nómina colombiana'
    }
  ];

  for (const setting of defaultSettings) {
    try {
      console.log(`📝 Creando configuración: ${setting.key}`);
      
      const result = await makeApiRequest('POST', '/settings', {
        key: setting.key,
        value: setting.value,
        category: setting.category,
        description: setting.description
      });
      
      console.log(`✅ ${setting.key}: ${result.message}`);
      
    } catch (error) {
      if (error.message.includes('ya existe')) {
        console.log(`⏭️  ${setting.key}: Ya existe`);
      } else {
        console.error(`❌ Error en ${setting.key}:`, error.message);
      }
    }
  }

  // Verificar configuraciones creadas
  try {
    const allSettings = await makeApiRequest('GET', '/settings');
    console.log('\n📋 Configuraciones en base de datos:');
    Object.keys(allSettings).forEach(key => {
      const setting = allSettings[key];
      console.log(`   ${setting.category}/${key}`);
    });
    console.log('\n🎉 Inicialización completada exitosamente!');
  } catch (error) {
    console.error('❌ Error al verificar configuraciones:', error.message);
  }
}

// Ejecutar
createDefaultSettings()
  .then(() => {
    console.log('✨ Script ejecutado correctamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });