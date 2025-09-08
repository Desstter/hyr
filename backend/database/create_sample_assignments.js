const { Pool } = require('pg');

async function createSampleAssignments() {
  const db = new Pool({
    host: 'localhost',
    database: 'hyr_construction',
    user: 'postgres',
    password: 'LilHell76&0',
    port: 5432,
  });
  
  try {
    // Obtener empleados y proyectos
    const personnel = await db.query('SELECT id, name, position, department FROM personnel WHERE status = \'active\'');
    const projects = await db.query('SELECT id, name FROM projects WHERE status IN (\'planned\', \'in_progress\')');
    
    console.log(`👥 Empleados activos: ${personnel.rows.length}`);
    console.log(`🏗️ Proyectos activos: ${projects.rows.length}`);
    
    if (personnel.rows.length === 0 || projects.rows.length === 0) {
      console.log('⚠️ No hay empleados o proyectos para asignar');
      return;
    }
    
    // Mostrar empleados disponibles
    console.log('\n👥 Empleados disponibles:');
    personnel.rows.forEach(emp => {
      console.log(`  • ${emp.name} - ${emp.position} (${emp.department})`);
    });
    
    // Mostrar proyectos disponibles
    console.log('\n🏗️ Proyectos disponibles:');
    projects.rows.forEach(proj => {
      console.log(`  • ${proj.name}`);
    });
    
    // Crear asignaciones lógicas
    let assignmentCount = 0;
    
    // Asignar cada empleado a proyectos rotativamente
    for (let i = 0; i < personnel.rows.length; i++) {
      const employee = personnel.rows[i];
      
      // Cada empleado a 1-2 proyectos
      const projectsToAssign = Math.min(2, projects.rows.length);
      
      for (let j = 0; j < projectsToAssign; j++) {
        const projectIndex = (i + j) % projects.rows.length;
        const project = projects.rows[projectIndex];
        
        try {
          await db.query(`
            INSERT INTO project_assignments (
              personnel_id, project_id, start_date, role, 
              expected_hours_per_day, is_primary_project, 
              status, notes, created_by
            ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, 'active', $6, 'sistema_inicial')
            ON CONFLICT (personnel_id, project_id, start_date) DO NOTHING
          `, [
            employee.id,
            project.id,
            employee.position,
            j === 0 ? 6.0 : 2.0, // Primer proyecto 6h, segundo 2h
            j === 0, // Primer proyecto es primario
            `Asignación inicial - ${employee.position}`
          ]);
          
          console.log(`✅ Asignado: ${employee.name} → ${project.name} (${j === 0 ? '6h' : '2h'})`);
          assignmentCount++;
          
        } catch (err) {
          if (!err.message.includes('duplicate key')) {
            console.log(`⚠️ Error asignando ${employee.name}: ${err.message}`);
          }
        }
      }
    }
    
    // Verificar resultado final
    const result = await db.query('SELECT COUNT(*) FROM project_assignments WHERE status = \'active\'');
    console.log(`\n✅ Total asignaciones creadas: ${result.rows[0].count}`);
    
    // Mostrar resumen por empleado
    const summary = await db.query(`
      SELECT 
        p.name as empleado,
        p.position,
        COUNT(pa.id) as proyectos,
        SUM(pa.expected_hours_per_day) as horas_totales,
        STRING_AGG(pr.name, ', ') as proyectos_nombres
      FROM personnel p
      LEFT JOIN project_assignments pa ON p.id = pa.personnel_id AND pa.status = 'active'
      LEFT JOIN projects pr ON pa.project_id = pr.id
      WHERE p.status = 'active'
      GROUP BY p.id, p.name, p.position
      ORDER BY horas_totales DESC NULLS LAST
    `);
    
    console.log('\n📊 Resumen de asignaciones:');
    summary.rows.forEach(row => {
      const horas = row.horas_totales || 0;
      const proyectos = row.proyectos || 0;
      const nombres = row.proyectos_nombres || 'Sin asignaciones';
      console.log(`  • ${row.empleado} (${row.position}): ${proyectos} proyecto(s), ${horas}h/día`);
      console.log(`    Proyectos: ${nombres}`);
    });
    
    // Probar función de disponibilidad
    console.log('\n🎯 Probando función get_personnel_availability():');
    try {
      const availability = await db.query('SELECT * FROM get_personnel_availability()');
      availability.rows.forEach(row => {
        console.log(`  • ${row.personnel_name}: ${row.availability_status} (${row.total_assigned_hours}h/día, ${row.projects_count} proyectos)`);
      });
    } catch (err) {
      console.log('⚠️ Error probando función de disponibilidad:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    await db.end();
  }
}

// Ejecutar
createSampleAssignments().then(() => {
  console.log('\n🎉 Proceso completado');
}).catch(err => {
  console.error('💥 Error fatal:', err);
});