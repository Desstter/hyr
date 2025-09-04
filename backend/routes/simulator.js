const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');

// =====================================================
// COST SIMULATOR API - ESTIMACIONES DE PROYECTOS
// =====================================================

// Configuración de templates de costos
const COST_TEMPLATES = {
  construction: {
    name: 'Construcción General',
    categories: {
      materials: {
        concrete: { name: 'Concreto', unit: 'm3', cost_per_unit: 320000 },
        steel: { name: 'Acero de refuerzo', unit: 'ton', cost_per_unit: 3200000 },
        brick: { name: 'Ladrillo', unit: 'und', cost_per_unit: 350 },
        sand: { name: 'Arena', unit: 'm3', cost_per_unit: 45000 },
        gravel: { name: 'Grava', unit: 'm3', cost_per_unit: 55000 },
        cement: { name: 'Cemento', unit: 'bulto', cost_per_unit: 18000 }
      },
      labor: {
        mason: { name: 'Maestro de obra', unit: 'hora', cost_per_unit: 22000 },
        helper: { name: 'Ayudante', unit: 'hora', cost_per_unit: 15000 },
        supervisor: { name: 'Supervisor', unit: 'hora', cost_per_unit: 35000 }
      },
      equipment: {
        mixer: { name: 'Mezcladora', unit: 'día', cost_per_unit: 85000 },
        crane: { name: 'Grúa', unit: 'día', cost_per_unit: 450000 },
        tools: { name: 'Herramientas menores', unit: 'mes', cost_per_unit: 180000 }
      }
    }
  },
  welding: {
    name: 'Soldadura Especializada',
    categories: {
      materials: {
        steel_plate: { name: 'Lámina de acero', unit: 'kg', cost_per_unit: 3500 },
        electrode: { name: 'Electrodo E6013', unit: 'kg', cost_per_unit: 12000 },
        gas: { name: 'Gas protección', unit: 'm3', cost_per_unit: 15000 },
        primer: { name: 'Primer anticorrosivo', unit: 'galon', cost_per_unit: 85000 }
      },
      labor: {
        welder_certified: { name: 'Soldador certificado', unit: 'hora', cost_per_unit: 25000 },
        welder_helper: { name: 'Ayudante soldador', unit: 'hora', cost_per_unit: 18000 },
        inspector: { name: 'Inspector soldadura', unit: 'hora', cost_per_unit: 45000 }
      },
      equipment: {
        welding_machine: { name: 'Máquina soldar', unit: 'día', cost_per_unit: 120000 },
        grinder: { name: 'Pulidora', unit: 'día', cost_per_unit: 25000 },
        crane_welding: { name: 'Grúa soldadura', unit: 'día', cost_per_unit: 380000 }
      }
    }
  }
};

// Factores de cálculo
const CALCULATION_FACTORS = {
  labor_benefit_factor: 1.58, // Factor prestacional colombiano
  overhead_percentage: 0.15,  // 15% gastos generales
  profit_margin: 0.20,        // 20% utilidad esperada
  contingency: 0.10           // 10% contingencias
};

// =====================================================
// GET /api/simulator/templates
// Obtener templates disponibles
// =====================================================
router.get('/templates', (req, res) => {
  try {
    const templates = Object.keys(COST_TEMPLATES).map(key => ({
      id: key,
      ...COST_TEMPLATES[key]
    }));
    
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// POST /api/simulator/calculate
// Calcular estimación de costos
// =====================================================
router.post('/calculate', (req, res) => {
  try {
    const { 
      template_type, 
      items, 
      project_duration_days = 30,
      apply_benefits = true 
    } = req.body;

    if (!COST_TEMPLATES[template_type]) {
      return res.status(400).json({ 
        error: 'Tipo de template no válido' 
      });
    }

    let totalMaterials = 0;
    let totalLabor = 0;
    let totalEquipment = 0;
    let itemDetails = [];

    // Calcular costos por item
    items.forEach(item => {
      const { category, subcategory, quantity = 1 } = item;
      const template = COST_TEMPLATES[template_type];
      
      if (template.categories[category] && template.categories[category][subcategory]) {
        const itemTemplate = template.categories[category][subcategory];
        const itemCost = quantity * itemTemplate.cost_per_unit;
        
        itemDetails.push({
          ...item,
          name: itemTemplate.name,
          unit: itemTemplate.unit,
          cost_per_unit: itemTemplate.cost_per_unit,
          total_cost: itemCost
        });

        // Sumar por categoría
        switch (category) {
          case 'materials':
            totalMaterials += itemCost;
            break;
          case 'labor':
            if (apply_benefits) {
              totalLabor += itemCost * CALCULATION_FACTORS.labor_benefit_factor;
            } else {
              totalLabor += itemCost;
            }
            break;
          case 'equipment':
            totalEquipment += itemCost;
            break;
        }
      }
    });

    // Calcular gastos generales
    const subtotal = totalMaterials + totalLabor + totalEquipment;
    const overhead = subtotal * CALCULATION_FACTORS.overhead_percentage;
    
    // Total sin utilidad ni contingencias
    const totalBeforeMargin = subtotal + overhead;
    
    // Agregar utilidad y contingencias
    const profit = totalBeforeMargin * CALCULATION_FACTORS.profit_margin;
    const contingency = totalBeforeMargin * CALCULATION_FACTORS.contingency;
    
    // Total final
    const totalProject = totalBeforeMargin + profit + contingency;

    const estimation = {
      project_info: {
        template_type,
        duration_days: project_duration_days,
        items_count: items.length,
        created_at: new Date().toISOString()
      },
      cost_breakdown: {
        materials: totalMaterials,
        labor: totalLabor,
        equipment: totalEquipment,
        overhead: overhead,
        subtotal: totalBeforeMargin,
        profit: profit,
        contingency: contingency,
        total: totalProject
      },
      items_detail: itemDetails,
      calculation_factors: {
        ...CALCULATION_FACTORS,
        benefits_applied: apply_benefits
      },
      summary: {
        cost_per_day: Math.round(totalProject / project_duration_days),
        materials_percentage: Math.round((totalMaterials / totalProject) * 100),
        labor_percentage: Math.round((totalLabor / totalProject) * 100),
        equipment_percentage: Math.round((totalEquipment / totalProject) * 100)
      }
    };

    res.json(estimation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// POST /api/simulator/save-estimation
// Guardar estimación para referencia futura
// =====================================================
router.post('/save-estimation', async (req, res) => {
  try {
    const {
      project_name,
      client_name,
      template_type,
      estimation_data,
      notes
    } = req.body;

    // Insertar en tabla de estimaciones (si existe)
    // Para simplicidad, devolvemos la estimación guardada
    const saved_estimation = {
      id: Date.now().toString(), // ID temporal
      project_name,
      client_name,
      template_type,
      estimation_data,
      notes,
      created_at: new Date().toISOString(),
      status: 'draft'
    };

    res.json(saved_estimation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// GET /api/simulator/presets/:template_type
// Obtener configuraciones predefinidas por tipo
// =====================================================
router.get('/presets/:template_type', (req, res) => {
  try {
    const { template_type } = req.params;
    
    if (!COST_TEMPLATES[template_type]) {
      return res.status(404).json({ 
        error: 'Tipo de template no encontrado' 
      });
    }

    // Configuraciones predefinidas comunes
    const presets = {
      construction: [
        {
          name: 'Casa Pequeña (80m²)',
          items: [
            { category: 'materials', subcategory: 'concrete', quantity: 12 },
            { category: 'materials', subcategory: 'steel', quantity: 2 },
            { category: 'materials', subcategory: 'brick', quantity: 8000 },
            { category: 'labor', subcategory: 'mason', quantity: 200 },
            { category: 'labor', subcategory: 'helper', quantity: 300 },
            { category: 'equipment', subcategory: 'mixer', quantity: 15 }
          ]
        },
        {
          name: 'Bodega Industrial (200m²)',
          items: [
            { category: 'materials', subcategory: 'concrete', quantity: 35 },
            { category: 'materials', subcategory: 'steel', quantity: 8 },
            { category: 'labor', subcategory: 'mason', quantity: 400 },
            { category: 'labor', subcategory: 'supervisor', quantity: 100 },
            { category: 'equipment', subcategory: 'crane', quantity: 10 }
          ]
        }
      ],
      welding: [
        {
          name: 'Tanque 1000L',
          items: [
            { category: 'materials', subcategory: 'steel_plate', quantity: 500 },
            { category: 'materials', subcategory: 'electrode', quantity: 15 },
            { category: 'labor', subcategory: 'welder_certified', quantity: 80 },
            { category: 'labor', subcategory: 'inspector', quantity: 8 },
            { category: 'equipment', subcategory: 'welding_machine', quantity: 10 }
          ]
        },
        {
          name: 'Estructura Metálica 10ton',
          items: [
            { category: 'materials', subcategory: 'steel_plate', quantity: 10000 },
            { category: 'materials', subcategory: 'electrode', quantity: 80 },
            { category: 'labor', subcategory: 'welder_certified', quantity: 300 },
            { category: 'labor', subcategory: 'welder_helper', quantity: 200 },
            { category: 'equipment', subcategory: 'crane_welding', quantity: 15 }
          ]
        }
      ]
    };

    res.json(presets[template_type] || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// POST /api/simulator/create-project-from-estimation
// Crear proyecto real basado en estimación
// =====================================================
router.post('/create-project-from-estimation', async (req, res) => {
  try {
    const {
      estimation_id,
      project_name,
      client_id,
      description,
      start_date,
      estimated_end_date
    } = req.body;

    // Esta funcionalidad requiere integración con la tabla projects
    // Por ahora retornamos un mock
    const project_preview = {
      id: 'preview_' + Date.now(),
      name: project_name,
      client_id,
      description,
      start_date,
      estimated_end_date,
      status: 'planned',
      created_from_estimation: true,
      estimation_reference: estimation_id
    };

    res.json({ 
      message: 'Vista previa de proyecto creado',
      project: project_preview 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;