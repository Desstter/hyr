-- =====================================================
-- SEEDS EMPRESARIALES - HYR CONSTRUCTORA & SOLDADURA
-- Datos realistas para empresa constructora/soldadura colombiana
-- =====================================================

-- Limpiar datos existentes
DELETE FROM payroll_details;
DELETE FROM payroll_periods;
DELETE FROM time_entries;
DELETE FROM expenses;
DELETE FROM projects;
DELETE FROM personnel;
DELETE FROM clients;

-- =====================================================
-- 1. CLIENTES REALISTAS COLOMBIA
-- =====================================================

INSERT INTO clients (id, name, contact_name, phone, email, address) VALUES
('client-001', 'Ecopetrol S.A.', 'Ing. Carlos Mendoza', '+57 310 234-5678', 'cmendoza@ecopetrol.com.co', 'Carrera 13 No. 36-24, Bogotá, Colombia'),
('client-002', 'Constructora Bolívar', 'Arq. María Rodríguez', '+57 300 876-5432', 'mrodriguez@bolivar.com.co', 'Calle 72 No. 10-34, Medellín, Antioquia'),
('client-003', 'Taller Hernández Ltda', 'Sr. José Hernández', '+57 318 654-3210', 'jhernandez@tallerhernandez.co', 'Carrera 50 No. 12-15, Barranquilla, Atlántico'),
('client-004', 'Industrias Metálicas del Caribe', 'Ing. Ana López', '+57 315 789-1234', 'alopez@metalcaribe.com', 'Zona Industrial Mamonal, Cartagena, Bolívar');

-- =====================================================
-- 2. EMPLEADOS TÍPICOS CONSTRUCTORA/SOLDADURA
-- =====================================================

INSERT INTO personnel (
    id, name, document_type, document_number, phone, email, address,
    position, department, hire_date, status,
    salary_type, hourly_rate, monthly_salary, arl_risk_class,
    emergency_contact, emergency_phone, bank_account
) VALUES
-- Soldadores especializados
('pers-001', 'Miguel Ángel Vargas', 'CC', '80123456', '+57 301 234-5678', 'mvargas@hyr.com.co', 'Carrera 15 No. 23-45, Soacha, Cundinamarca', 
 'soldador', 'soldadura', '2022-03-15', 'active', 
 'hourly', 18000, null, 'V', 'Carmen Vargas', '+57 302 345-6789', '1234567890'),

('pers-002', 'Carlos Andrés Ruiz', 'CC', '79234567', '+57 310 876-5432', 'cruiz@hyr.com.co', 'Calle 8 No. 12-34, Funza, Cundinamarca',
 'soldador', 'soldadura', '2021-08-10', 'active',
 'hourly', 20000, null, 'V', 'Lucía Ruiz', '+57 311 987-6543', '2345678901'),

-- Operarios construcción
('pers-003', 'Pedro Luis Martínez', 'CC', '85345678', '+57 318 654-3210', 'pmartinez@hyr.com.co', 'Carrera 45 No. 67-89, Bogotá, Cundinamarca',
 'operario', 'construccion', '2023-01-20', 'active',
 'hourly', 15000, null, 'IV', 'Rosa Martínez', '+57 319 876-5432', '3456789012'),

('pers-004', 'Luis Fernando Gómez', 'CC', '82456789', '+57 315 789-1234', 'lfgomez@hyr.com.co', 'Calle 23 No. 15-67, Madrid, Cundinamarca',
 'operario', 'construccion', '2022-11-05', 'active',
 'hourly', 14500, null, 'IV', 'María Gómez', '+57 316 234-5678', '4567890123'),

-- Supervisor/Capataz
('pers-005', 'Roberto Jiménez Silva', 'CC', '75567890', '+57 300 345-6789', 'rjimenez@hyr.com.co', 'Carrera 7 No. 45-23, Bogotá, Cundinamarca',
 'supervisor', 'construccion', '2020-05-12', 'active',
 'monthly', null, 3500000, 'IV', 'Sandra Jiménez', '+57 301 456-7890', '5678901234'),

-- Administración
('pers-006', 'Diana Patricia Morales', 'CC', '52678901', '+57 312 456-7890', 'dmorales@hyr.com.co', 'Carrera 11 No. 93-45, Bogotá, Cundinamarca',
 'administrador', 'administracion', '2021-02-01', 'active',
 'monthly', null, 2800000, 'I', 'Carlos Morales', '+57 313 567-8901', '6789012345'),

-- Ayudante
('pers-007', 'Jhon Jaider Torres', 'CC', '90789012', '+57 320 567-8901', 'jtorres@hyr.com.co', 'Calle 32 Sur No. 12-45, Bogotá, Cundinamarca',
 'ayudante', 'construccion', '2023-06-15', 'active',
 'hourly', 12000, null, 'IV', 'Carmen Torres', '+57 321 678-9012', '7890123456');

-- =====================================================
-- 3. PROYECTOS ACTIVOS REALISTAS
-- =====================================================

INSERT INTO projects (
    id, name, client_id, description,
    budget_materials, budget_labor, budget_equipment, budget_overhead,
    start_date, estimated_end_date, status, progress
) VALUES
-- Proyecto industrial grande (Ecopetrol)
('proj-001', 'Tanque de Almacenamiento 5000 BBL', 'client-001', 
 'Construcción y soldadura de tanque de almacenamiento vertical para crudo, capacidad 5000 barriles, incluye estructura, soldadura especializada y pruebas hidrostáticas.',
 85000000, 45000000, 25000000, 15000000, '2024-07-01', '2024-12-15', 'in_progress', 35),

-- Proyecto residencial (Constructora Bolívar)  
('proj-002', 'Casa Campestre Familia Rodríguez', 'client-002',
 'Estructura metálica para casa campestre de 180m², incluye soldadura de vigas, columnas, escaleras y barandas decorativas.',
 25000000, 18000000, 8000000, 4000000, '2024-08-15', '2024-11-30', 'in_progress', 60),

-- Proyecto reparación (Taller Hernández)
('proj-003', 'Reparación Maquinaria Pesada', 'client-003',
 'Reparación y reforzamiento de chasis de retroexcavadora, soldadura estructural y fabricación de piezas de repuesto.',
 12000000, 8000000, 3000000, 2000000, '2024-09-01', '2024-10-15', 'in_progress', 75),

-- Proyecto estructura metálica (Industrias Metálicas)
('proj-004', 'Estructura Metálica Bodega Industrial', 'client-004',
 'Fabricación e instalación de estructura metálica para bodega de 800m², incluye columnas, vigas, correas y cubierta.',
 40000000, 28000000, 12000000, 8000000, '2024-06-01', '2024-10-30', 'in_progress', 80);

-- =====================================================
-- 4. REGISTRO DE HORAS SEPTIEMBRE 2024
-- =====================================================

-- Semana 1 de Septiembre (2-6 Sep)
INSERT INTO time_entries (personnel_id, project_id, work_date, hours_worked, overtime_hours, hourly_rate) VALUES
-- Miguel (Soldador) - Proyecto Tanque Ecopetrol
('pers-001', 'proj-001', '2024-09-02', 8.0, 0, 18000),
('pers-001', 'proj-001', '2024-09-03', 8.0, 2.0, 18000),
('pers-001', 'proj-001', '2024-09-04', 8.0, 0, 18000),
('pers-001', 'proj-001', '2024-09-05', 8.0, 1.5, 18000),
('pers-001', 'proj-001', '2024-09-06', 8.0, 0, 18000),

-- Carlos (Soldador) - Proyecto Casa Campestre
('pers-002', 'proj-002', '2024-09-02', 8.0, 0, 20000),
('pers-002', 'proj-002', '2024-09-03', 8.0, 0, 20000),
('pers-002', 'proj-002', '2024-09-04', 8.0, 3.0, 20000),
('pers-002', 'proj-002', '2024-09-05', 8.0, 0, 20000),
('pers-002', 'proj-002', '2024-09-06', 8.0, 1.0, 20000),

-- Pedro (Operario) - Proyecto Tanque Ecopetrol
('pers-003', 'proj-001', '2024-09-02', 8.0, 0, 15000),
('pers-003', 'proj-001', '2024-09-03', 8.0, 2.0, 15000),
('pers-003', 'proj-001', '2024-09-04', 8.0, 0, 15000),
('pers-003', 'proj-001', '2024-09-05', 8.0, 1.5, 15000),
('pers-003', 'proj-001', '2024-09-06', 8.0, 0, 15000),

-- Luis (Operario) - Proyecto Casa Campestre
('pers-004', 'proj-002', '2024-09-02', 8.0, 0, 14500),
('pers-004', 'proj-002', '2024-09-03', 8.0, 0, 14500),
('pers-004', 'proj-002', '2024-09-04', 8.0, 2.0, 14500),
('pers-004', 'proj-002', '2024-09-05', 8.0, 0, 14500),
('pers-004', 'proj-002', '2024-09-06', 8.0, 0, 14500),

-- Jhon (Ayudante) - Proyectos varios
('pers-007', 'proj-003', '2024-09-02', 8.0, 0, 12000),
('pers-007', 'proj-003', '2024-09-03', 8.0, 1.0, 12000),
('pers-007', 'proj-004', '2024-09-04', 8.0, 0, 12000),
('pers-007', 'proj-004', '2024-09-05', 8.0, 2.0, 12000),
('pers-007', 'proj-004', '2024-09-06', 8.0, 0, 12000);

-- Semana 2 de Septiembre (9-13 Sep)
INSERT INTO time_entries (personnel_id, project_id, work_date, hours_worked, overtime_hours, hourly_rate) VALUES
-- Continuar patrones similares para más realismo
('pers-001', 'proj-001', '2024-09-09', 8.0, 1.0, 18000),
('pers-001', 'proj-001', '2024-09-10', 8.0, 0, 18000),
('pers-001', 'proj-001', '2024-09-11', 8.0, 2.5, 18000),
('pers-001', 'proj-001', '2024-09-12', 8.0, 0, 18000),
('pers-001', 'proj-001', '2024-09-13', 8.0, 1.0, 18000),

('pers-002', 'proj-002', '2024-09-09', 8.0, 0, 20000),
('pers-002', 'proj-002', '2024-09-10', 8.0, 2.0, 20000),
('pers-002', 'proj-002', '2024-09-11', 8.0, 0, 20000),
('pers-002', 'proj-002', '2024-09-12', 8.0, 1.5, 20000),
('pers-002', 'proj-002', '2024-09-13', 8.0, 0, 20000),

('pers-003', 'proj-001', '2024-09-09', 8.0, 1.0, 15000),
('pers-003', 'proj-001', '2024-09-10', 8.0, 0, 15000),
('pers-003', 'proj-001', '2024-09-11', 8.0, 2.5, 15000),
('pers-003', 'proj-001', '2024-09-12', 8.0, 0, 15000),
('pers-003', 'proj-001', '2024-09-13', 8.0, 1.0, 15000),

('pers-004', 'proj-002', '2024-09-09', 8.0, 0, 14500),
('pers-004', 'proj-002', '2024-09-10', 8.0, 1.0, 14500),
('pers-004', 'proj-002', '2024-09-11', 8.0, 0, 14500),
('pers-004', 'proj-002', '2024-09-12', 8.0, 2.0, 14500),
('pers-004', 'proj-002', '2024-09-13', 8.0, 0, 14500);

-- =====================================================
-- 5. GASTOS REALISTAS POR PROYECTO
-- =====================================================

-- Proyecto Tanque Ecopetrol - Materiales especializados
INSERT INTO expenses (project_id, date, category, subcategory, vendor, description, amount, invoice_number) VALUES
('proj-001', '2024-07-05', 'materials', 'acero', 'Aceros de Colombia', 'Lámina A36 de 6mm x 2.44m x 12.19m - 15 unidades', 18750000, 'AC-001234'),
('proj-001', '2024-07-10', 'materials', 'soldadura', 'Soldaduras West Arco', 'Electrodo 7018 1/8" x 14" - 200 kg', 2400000, 'SWA-5678'),
('proj-001', '2024-07-15', 'equipment', 'alquiler_equipo', 'Grúas Bogotá', 'Alquiler grúa 25 ton - 5 días', 3750000, 'GB-9012'),
('proj-001', '2024-08-01', 'materials', 'acero', 'Aceros de Colombia', 'Tubería API 5L Gr.B 6" x 0.25" - 50m', 8500000, 'AC-001789'),
('proj-001', '2024-08-10', 'overhead', 'pruebas', 'Inspecol Ltda', 'Pruebas radiográficas soldaduras - 120 puntos', 4200000, 'INS-3456'),

-- Proyecto Casa Campestre - Materiales construcción
('proj-002', '2024-08-20', 'materials', 'acero', 'Siderúrgica Nacional', 'Viga IPE 200 x 6m - 20 unidades', 6800000, 'SN-7890'),
('proj-002', '2024-08-22', 'materials', 'soldadura', 'Lincoln Electric', 'Electrodo 6013 3/32" - 50 kg', 450000, 'LE-2345'),
('proj-002', '2024-08-25', 'materials', 'acero', 'Siderúrgica Nacional', 'Varilla corrugada #4 x 12m - 100 unidades', 2100000, 'SN-8901'),
('proj-002', '2024-09-01', 'equipment', 'herramientas', 'Ferreterías Unión', 'Disco de corte 7" x 1/8" - 50 unidades', 175000, 'FU-4567'),

-- Proyecto Reparación Maquinaria
('proj-003', '2024-09-02', 'materials', 'repuestos', 'Repuestos JCB', 'Pin principal chasis - 2 unidades', 1800000, 'JCB-6789'),
('proj-003', '2024-09-03', 'materials', 'soldadura', 'Soldaduras West Arco', 'Alambre MIG ER70S-6 0.9mm - 20kg', 380000, 'SWA-7890'),
('proj-003', '2024-09-05', 'equipment', 'alquiler_equipo', 'Maquinaria Temporal', 'Soldadora MIG 350A - 10 días', 850000, 'MT-1234'),

-- Proyecto Estructura Metálica Bodega
('proj-004', '2024-06-15', 'materials', 'acero', 'Ternium Colombia', 'Columna HEB 300 x 12m - 24 unidades', 28800000, 'TC-5678'),
('proj-004', '2024-06-20', 'materials', 'acero', 'Ternium Colombia', 'Viga IPE 400 x 15m - 18 unidades', 32400000, 'TC-6789'),
('proj-004', '2024-07-01', 'materials', 'soldadura', 'Lincoln Electric', 'Alambre flux-core E71T-1 1.2mm - 100kg', 1800000, 'LE-9012'),
('proj-004', '2024-07-15', 'overhead', 'transporte', 'Transportes Andinos', 'Flete estructura metálica Bogotá-Cartagena', 4200000, 'TA-3456');

-- =====================================================
-- 6. PERÍODO DE NÓMINA SEPTIEMBRE 2024
-- =====================================================

INSERT INTO payroll_periods (id, year, month, period_type, start_date, end_date, status) VALUES
('period-202409', 2024, 9, 'monthly', '2024-09-01', '2024-09-30', 'draft');

-- =====================================================
-- 7. GASTOS OPERATIVOS ADICIONALES
-- =====================================================

INSERT INTO expenses (date, category, subcategory, vendor, description, amount, invoice_number) VALUES
-- Gastos administrativos
('2024-09-01', 'overhead', 'servicios', 'Enel Codensa', 'Energía eléctrica taller - Agosto 2024', 850000, 'EC-789012'),
('2024-09-03', 'overhead', 'servicios', 'Claro Colombia', 'Telefonía e internet - Septiembre 2024', 320000, 'CL-345678'),
('2024-09-05', 'overhead', 'seguros', 'Sura Seguros', 'Póliza todo riesgo maquinaria - Trimestre 3', 2400000, 'SU-901234'),
('2024-09-10', 'overhead', 'combustible', 'Terpel', 'ACPM camión soldadura móvil - 200 galones', 1600000, 'TP-567890'),
('2024-09-15', 'equipment', 'mantenimiento', 'Servitec Soldadura', 'Mantenimiento preventivo soldadoras - 5 equipos', 1250000, 'SS-123456'),

-- Materiales generales
('2024-09-08', 'materials', 'consumibles', 'Indura Colombia', 'Oxígeno industrial - 10 cilindros', 280000, 'IN-678901'),
('2024-09-12', 'materials', 'consumibles', 'Indura Colombia', 'Acetileno - 8 cilindros', 480000, 'IN-789012'),
('2024-09-18', 'materials', 'epp', 'Protección Industrial', 'Cascos, guantes, gafas soldadura - Kit 10 empleados', 420000, 'PI-234567');

-- =====================================================
-- RESUMEN DE DATOS INSERTADOS
-- =====================================================
-- ✓ 4 Clientes empresariales colombianos
-- ✓ 7 Empleados con perfiles típicos constructora/soldadura
-- ✓ 4 Proyectos activos con presupuestos realistas
-- ✓ 45+ registros de horas de septiembre 2024
-- ✓ 20+ gastos detallados por proyecto y operativos
-- ✓ 1 período de nómina listo para procesar

SELECT 'SEEDS CARGADOS EXITOSAMENTE' as status,
       (SELECT COUNT(*) FROM clients) as clientes,
       (SELECT COUNT(*) FROM personnel) as empleados,
       (SELECT COUNT(*) FROM projects) as proyectos,
       (SELECT COUNT(*) FROM time_entries) as registros_horas,
       (SELECT COUNT(*) FROM expenses) as gastos;