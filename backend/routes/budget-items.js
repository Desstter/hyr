const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');

// =====================================================
// BUDGET ITEMS API ROUTES
// Gestión de items detallados del presupuesto
// =====================================================

// GET /api/budget-items/:projectId - Obtener items de presupuesto por proyecto
router.get('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const result = await db.query(`
      SELECT 
        id,
        project_id,
        category,
        description,
        quantity,
        unit_cost,
        total_cost,
        currency,
        created_at,
        updated_at
      FROM budget_items 
      WHERE project_id = $1
      ORDER BY category, created_at
    `, [projectId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching budget items:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener items del presupuesto: ' + error.message
    });
  }
});

// POST /api/budget-items - Crear nuevo item de presupuesto
router.post('/', async (req, res) => {
  const { project_id, category, description, quantity = 1, unit_cost, currency = 'COP' } = req.body;
  
  // Validación básica
  if (!project_id || !category || !description || unit_cost === undefined) {
    return res.status(400).json({
      success: false,
      error: 'project_id, category, description y unit_cost son requeridos'
    });
  }
  
  try {
    const result = await db.query(`
      INSERT INTO budget_items (project_id, category, description, quantity, unit_cost, currency)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [project_id, category, description, quantity, unit_cost, currency]);
    
    // Actualizar presupuesto del proyecto basado en categoría
    await updateProjectBudget(project_id, category);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Item de presupuesto creado exitosamente'
    });
  } catch (error) {
    console.error('Error creating budget item:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear item del presupuesto: ' + error.message
    });
  }
});

// PUT /api/budget-items/:id - Actualizar item de presupuesto
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { category, description, quantity, unit_cost, currency } = req.body;
  
  try {
    // Primero obtener el item actual para saber el proyecto
    const currentItem = await db.query('SELECT project_id, category FROM budget_items WHERE id = $1', [id]);
    if (currentItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item de presupuesto no encontrado'
      });
    }
    
    const oldCategory = currentItem.rows[0].category;
    const projectId = currentItem.rows[0].project_id;
    
    const result = await db.query(`
      UPDATE budget_items 
      SET category = $1, description = $2, quantity = $3, unit_cost = $4, 
          currency = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [category, description, quantity, unit_cost, currency, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item de presupuesto no encontrado'
      });
    }
    
    // Actualizar presupuesto del proyecto para ambas categorías (antigua y nueva)
    await updateProjectBudget(projectId, oldCategory);
    if (oldCategory !== category) {
      await updateProjectBudget(projectId, category);
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Item de presupuesto actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error updating budget item:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar item del presupuesto: ' + error.message
    });
  }
});

// DELETE /api/budget-items/:id - Eliminar item de presupuesto
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Obtener info del item antes de eliminarlo
    const itemInfo = await db.query('SELECT project_id, category FROM budget_items WHERE id = $1', [id]);
    if (itemInfo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item de presupuesto no encontrado'
      });
    }
    
    const { project_id: projectId, category } = itemInfo.rows[0];
    
    const result = await db.query('DELETE FROM budget_items WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item de presupuesto no encontrado'
      });
    }
    
    // Actualizar presupuesto del proyecto
    await updateProjectBudget(projectId, category);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Item de presupuesto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting budget item:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar item del presupuesto: ' + error.message
    });
  }
});

// GET /api/budget-items/project/:projectId/summary - Resumen del presupuesto por proyecto
router.get('/project/:projectId/summary', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const result = await db.query(`
      SELECT 
        category,
        COUNT(*) as item_count,
        SUM(total_cost) as category_total
      FROM budget_items 
      WHERE project_id = $1
      GROUP BY category
      ORDER BY category
    `, [projectId]);
    
    const summary = {
      materials: 0,
      labor: 0,
      equipment: 0,
      overhead: 0,
      total: 0
    };
    
    result.rows.forEach(row => {
      const category = row.category === 'misc' ? 'overhead' : row.category;
      summary[category] = parseFloat(row.category_total) || 0;
      summary.total += parseFloat(row.category_total) || 0;
    });
    
    res.json({
      success: true,
      data: {
        summary,
        details: result.rows
      }
    });
  } catch (error) {
    console.error('Error getting budget summary:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener resumen del presupuesto: ' + error.message
    });
  }
});

// =====================================================
// FUNCIÓN HELPER: Actualizar presupuesto del proyecto
// =====================================================
async function updateProjectBudget(projectId, category) {
  try {
    // Calcular el total de la categoría desde budget_items
    const categoryColumn = category === 'misc' ? 'budget_overhead' : `budget_${category}`;
    
    const totalResult = await db.query(`
      SELECT COALESCE(SUM(total_cost), 0) as total 
      FROM budget_items 
      WHERE project_id = $1 AND category = $2
    `, [projectId, category]);
    
    const total = parseFloat(totalResult.rows[0].total) || 0;
    
    // Actualizar la columna correspondiente en projects
    await db.query(`
      UPDATE projects 
      SET ${categoryColumn} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [total, projectId]);
    
    console.log(`Updated project ${projectId} ${categoryColumn} to ${total}`);
  } catch (error) {
    console.error('Error updating project budget:', error);
    throw error;
  }
}

module.exports = router;