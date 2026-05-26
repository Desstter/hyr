-- =====================================================
-- SEEDS (DATOS DE PRUEBA) - HYR CONSTRUCTORA & SOLDADURA
-- Se ejecuta DESPUÉS de schema.sql vía `npm run setup`.
-- Usa UUIDs válidos y fijos para que las FKs sean estables.
-- =====================================================

-- =====================================================
-- 1. CLIENTES
-- =====================================================
INSERT INTO clients (id, name, contact_name, phone, email, address, qualifies_law_114_1, is_juridica) VALUES
('a0000000-0000-0000-0000-000000000001', 'Ecopetrol S.A.', 'Ing. Carlos Mendoza', '+57 310 234-5678', 'cmendoza@ecopetrol.com.co', 'Carrera 13 No. 36-24, Bogotá', true, true),
('a0000000-0000-0000-0000-000000000002', 'Constructora Bolívar', 'Arq. María Rodríguez', '+57 300 876-5432', 'mrodriguez@bolivar.com.co', 'Calle 72 No. 10-34, Medellín', true, true),
('a0000000-0000-0000-0000-000000000003', 'Taller Hernández Ltda', 'José Hernández', '+57 318 654-3210', 'jhernandez@tallerhernandez.co', 'Carrera 50 No. 12-15, Barranquilla', false, true),
('a0000000-0000-0000-0000-000000000004', 'Industrias Metálicas del Caribe', 'Ing. Ana López', '+57 315 789-1234', 'alopez@metalcaribe.com', 'Zona Industrial Mamonal, Cartagena', true, true);

-- =====================================================
-- 2. EMPLEADOS (salary_base / daily_rate poblados)
-- =====================================================
INSERT INTO personnel (
    id, name, document_type, document_number, phone, email, address,
    position, department, hire_date, status,
    salary_type, hourly_rate, monthly_salary, salary_base, daily_rate, arl_risk_class,
    emergency_contact, emergency_phone, bank_account
) VALUES
('b0000000-0000-0000-0000-000000000001', 'Miguel Ángel Vargas', 'CC', '80123456', '+57 301 234-5678', 'mvargas@hyr.com.co', 'Soacha, Cundinamarca',
 'soldador', 'soldadura', '2022-03-15', 'active', 'hourly', 18000, NULL, 3456000, 144000, 'V', 'Carmen Vargas', '+57 302 345-6789', '1234567890'),
('b0000000-0000-0000-0000-000000000002', 'Carlos Andrés Ruiz', 'CC', '79234567', '+57 310 876-5432', 'cruiz@hyr.com.co', 'Funza, Cundinamarca',
 'soldador', 'soldadura', '2021-08-10', 'active', 'hourly', 20000, NULL, 3840000, 160000, 'V', 'Lucía Ruiz', '+57 311 987-6543', '2345678901'),
('b0000000-0000-0000-0000-000000000003', 'Pedro Luis Martínez', 'CC', '85345678', '+57 318 654-3210', 'pmartinez@hyr.com.co', 'Bogotá, Cundinamarca',
 'operario', 'construccion', '2023-01-20', 'active', 'hourly', 15000, NULL, 2880000, 120000, 'IV', 'Rosa Martínez', '+57 319 876-5432', '3456789012'),
('b0000000-0000-0000-0000-000000000004', 'Luis Fernando Gómez', 'CC', '82456789', '+57 315 789-1234', 'lfgomez@hyr.com.co', 'Madrid, Cundinamarca',
 'operario', 'construccion', '2022-11-05', 'active', 'hourly', 14500, NULL, 2784000, 116000, 'IV', 'María Gómez', '+57 316 234-5678', '4567890123'),
('b0000000-0000-0000-0000-000000000005', 'Roberto Jiménez Silva', 'CC', '75567890', '+57 300 345-6789', 'rjimenez@hyr.com.co', 'Bogotá, Cundinamarca',
 'supervisor', 'construccion', '2020-05-12', 'active', 'monthly', NULL, 3500000, 3500000, 145833, 'IV', 'Sandra Jiménez', '+57 301 456-7890', '5678901234'),
('b0000000-0000-0000-0000-000000000006', 'Diana Patricia Morales', 'CC', '52678901', '+57 312 456-7890', 'dmorales@hyr.com.co', 'Bogotá, Cundinamarca',
 'administrador', 'administracion', '2021-02-01', 'active', 'monthly', NULL, 2800000, 2800000, 116667, 'I', 'Carlos Morales', '+57 313 567-8901', '6789012345'),
('b0000000-0000-0000-0000-000000000007', 'Jhon Jaider Torres', 'CC', '90789012', '+57 320 567-8901', 'jtorres@hyr.com.co', 'Bogotá, Cundinamarca',
 'ayudante', 'construccion', '2023-06-15', 'active', 'hourly', 12000, NULL, 2304000, 96000, 'IV', 'Carmen Torres', '+57 321 678-9012', '7890123456');

-- =====================================================
-- 3. PROYECTOS
-- =====================================================
INSERT INTO projects (
    id, name, client_id, description,
    budget_materials, budget_labor, budget_equipment, budget_overhead,
    start_date, estimated_end_date, status, progress, expected_income
) VALUES
('c0000000-0000-0000-0000-000000000001', 'Tanque de Almacenamiento 5000 BBL', 'a0000000-0000-0000-0000-000000000001',
 'Construcción y soldadura de tanque vertical para crudo, 5000 barriles.',
 85000000, 45000000, 25000000, 15000000, '2024-07-01', '2024-12-15', 'in_progress', 35, 200000000),
('c0000000-0000-0000-0000-000000000002', 'Casa Campestre Familia Rodríguez', 'a0000000-0000-0000-0000-000000000002',
 'Estructura metálica para casa campestre de 180m².',
 25000000, 18000000, 8000000, 4000000, '2024-08-15', '2024-11-30', 'in_progress', 60, 65000000),
('c0000000-0000-0000-0000-000000000003', 'Reparación Maquinaria Pesada', 'a0000000-0000-0000-0000-000000000003',
 'Reparación y reforzamiento de chasis de retroexcavadora.',
 12000000, 8000000, 3000000, 2000000, '2024-09-01', '2024-10-15', 'in_progress', 75, 30000000),
('c0000000-0000-0000-0000-000000000004', 'Estructura Metálica Bodega Industrial', 'a0000000-0000-0000-0000-000000000004',
 'Fabricación e instalación de estructura metálica para bodega de 800m².',
 40000000, 28000000, 12000000, 8000000, '2024-06-01', '2024-10-30', 'in_progress', 80, 105000000);

-- =====================================================
-- 4. REGISTRO DE HORAS (Septiembre 2024)
-- =====================================================
INSERT INTO time_entries (personnel_id, project_id, work_date, hours_worked, overtime_hours, hourly_rate) VALUES
('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2024-09-02', 8.0, 0,   18000),
('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2024-09-03', 8.0, 2.0, 18000),
('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2024-09-04', 8.0, 0,   18000),
('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2024-09-05', 8.0, 1.5, 18000),
('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', '2024-09-02', 8.0, 0,   20000),
('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', '2024-09-03', 8.0, 0,   20000),
('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', '2024-09-04', 8.0, 3.0, 20000),
('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', '2024-09-02', 8.0, 0,   15000),
('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', '2024-09-03', 8.0, 2.0, 15000),
('b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', '2024-09-04', 8.0, 2.0, 14500),
('b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', '2024-09-05', 8.0, 0,   14500),
('b0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000003', '2024-09-02', 8.0, 0,   12000),
('b0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000004', '2024-09-05', 8.0, 2.0, 12000);

-- =====================================================
-- 5. GASTOS DIRECTOS (materiales/equipo/overhead)
-- Nota: los gastos 'labor' se crean automáticamente por trigger desde time_entries
-- =====================================================
INSERT INTO expenses (project_id, date, category, subcategory, vendor, description, amount, invoice_number) VALUES
('c0000000-0000-0000-0000-000000000001', '2024-07-05', 'materials', 'acero', 'Aceros de Colombia', 'Lámina A36 6mm - 15 unidades', 18750000, 'AC-001234'),
('c0000000-0000-0000-0000-000000000001', '2024-07-10', 'materials', 'soldadura', 'West Arco', 'Electrodo 7018 1/8" - 200 kg', 2400000, 'SWA-5678'),
('c0000000-0000-0000-0000-000000000001', '2024-07-15', 'equipment', 'alquiler', 'Grúas Bogotá', 'Alquiler grúa 25 ton - 5 días', 3750000, 'GB-9012'),
('c0000000-0000-0000-0000-000000000002', '2024-08-20', 'materials', 'acero', 'Siderúrgica Nacional', 'Viga IPE 200 x 6m - 20 unidades', 6800000, 'SN-7890'),
('c0000000-0000-0000-0000-000000000003', '2024-09-02', 'materials', 'repuestos', 'Repuestos JCB', 'Pin principal chasis - 2 unidades', 1800000, 'JCB-6789'),
('c0000000-0000-0000-0000-000000000004', '2024-06-15', 'materials', 'acero', 'Ternium Colombia', 'Columna HEB 300 x 12m - 24 unidades', 28800000, 'TC-5678'),
('c0000000-0000-0000-0000-000000000004', '2024-07-15', 'overhead', 'transporte', 'Transportes Andinos', 'Flete estructura Bogotá-Cartagena', 4200000, 'TA-3456');

-- Gastos operativos sin proyecto
INSERT INTO expenses (date, category, subcategory, vendor, description, amount, invoice_number) VALUES
('2024-09-01', 'overhead', 'servicios', 'Enel Codensa', 'Energía eléctrica taller - Agosto 2024', 850000, 'EC-789012'),
('2024-09-05', 'overhead', 'seguros', 'Sura Seguros', 'Póliza todo riesgo maquinaria - Q3', 2400000, 'SU-901234');

-- =====================================================
-- 6. INGRESOS POR PROYECTO
-- =====================================================
INSERT INTO project_incomes (project_id, amount, date, concept, payment_method, invoice_number) VALUES
('c0000000-0000-0000-0000-000000000001', 60000000, '2024-07-15', 'Anticipo 30% contrato', 'transfer', 'FV-001'),
('c0000000-0000-0000-0000-000000000002', 32500000, '2024-08-20', 'Pago avance 50%', 'transfer', 'FV-002'),
('c0000000-0000-0000-0000-000000000004', 52500000, '2024-06-20', 'Anticipo bodega', 'transfer', 'FV-003');

-- =====================================================
-- 7. PERÍODO DE NÓMINA (listo para procesar)
-- =====================================================
INSERT INTO payroll_periods (id, year, month, period_type, start_date, end_date, status) VALUES
('d0000000-0000-0000-0000-000000000001', 2024, 9, 'monthly', '2024-09-01', '2024-09-30', 'draft');

-- =====================================================
-- 8. CONTRATISTAS
-- =====================================================
INSERT INTO contractors (name, document_number, obligated_to_invoice) VALUES
('Taller Especializado SAS', '987654321', false),
('Proveedor Materiales Ltda', '123456789', true);

SELECT 'SEEDS CARGADOS' AS status,
       (SELECT COUNT(*) FROM clients) AS clientes,
       (SELECT COUNT(*) FROM personnel) AS empleados,
       (SELECT COUNT(*) FROM projects) AS proyectos,
       (SELECT COUNT(*) FROM time_entries) AS horas,
       (SELECT COUNT(*) FROM expenses) AS gastos,
       (SELECT COUNT(*) FROM project_incomes) AS ingresos;
