-- =====================================================
-- DUMP BASE DE DATOS: hyr_construction
-- Fecha: 2025-09-30T05:26:30.721Z
-- Generado por: export-database.js
-- =====================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;


-- =====================================================
-- Tabla: annual_payroll_settings
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS annual_payroll_settings CASCADE;
CREATE TABLE annual_payroll_settings (id INTEGER DEFAULT nextval('annual_payroll_settings_id_seq'::regclass) NOT NULL, year INTEGER NOT NULL, smmlv NUMERIC(10,2) NOT NULL, auxilio_transporte NUMERIC(10,2) NOT NULL, auxilio_conectividad NUMERIC(10,2) DEFAULT 0, uvt NUMERIC(10,2) NOT NULL, config_json JSONB, effective_date DATE DEFAULT CURRENT_DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Constraints
ALTER TABLE annual_payroll_settings ADD CONSTRAINT annual_payroll_settings_pkey PRIMARY KEY (id);
ALTER TABLE annual_payroll_settings ADD CONSTRAINT annual_payroll_settings_year_key UNIQUE (year);


-- =====================================================
-- Tabla: audit_events
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS audit_events CASCADE;
CREATE TABLE audit_events (id UUID DEFAULT gen_random_uuid() NOT NULL, actor VARCHAR(100) DEFAULT 'SYSTEM'::character varying, event_type VARCHAR(50) NOT NULL, ref_table VARCHAR(50) NOT NULL, ref_id UUID, payload JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Datos (31 registros)
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('f78b550e-0ce0-4d75-9456-ade16d7327d3', '192.168.50.120', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-26T17:41:33.902Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('64e2e0c8-32ee-48f0-9650-24dd50fea5b0', '192.168.50.120', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-26T17:41:33.917Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('03697fa6-db21-4ea2-9512-1a80d199b5b9', '192.168.50.120', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-26T19:55:44.067Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('bdd6622a-9164-481d-80f3-a63fb98b7463', '192.168.50.120', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-26T19:55:44.081Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('cd768ee5-62be-4eba-aa85-b004e9da28ef', '192.168.1.103', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-26T23:04:01.011Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('648e2bcc-7eed-41b2-b4a6-c0d5d88fa4ff', '192.168.1.103', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-26T23:04:01.064Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('3bf2997a-ebfc-4ac7-95fd-935bdc0052c0', '192.168.1.103', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-26T23:04:31.068Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('b54ff028-4eca-400e-9801-a78999539458', '192.168.1.103', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-26T23:05:00.622Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('8bc41234-7d4d-41cf-b92e-fe039986e427', '192.168.1.103', 'DIAN_OPERATION', 'dian_payroll_documents', NULL, '[object Object]', '2025-09-26T23:05:32.225Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('d70eb732-3a96-4a9f-8217-a31a1792a495', '192.168.1.103', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-27T05:44:06.365Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('9fbf0de7-7059-4555-b36b-1ab11e2be60b', '192.168.1.103', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-27T05:44:06.388Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('db149446-d984-4025-a70a-e71636ee6d75', '192.168.1.103', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-27T05:44:09.438Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('9a7f7e44-21d1-4aff-83dd-ff30bfb64e98', '192.168.1.103', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-27T05:44:09.448Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('4b3a14c3-1bb6-4ef6-b742-666cf9f4517b', '192.168.1.103', 'DIAN_OPERATION', 'dian_payroll_documents', NULL, '[object Object]', '2025-09-27T05:44:15.685Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('f7e55568-153e-4743-b1fc-389b60bd499d', '192.168.1.103', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-27T05:45:01.690Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('5f2d4412-5ef4-4a15-8a62-c2e476365ed8', '192.168.1.103', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-27T05:45:01.714Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('0921bcc8-6ca5-45f5-a645-9a9d0b0b772b', 'USER', 'CREATE', 'dian_payroll_documents', '7b71dc26-80c1-4fc3-b08e-c75a72c038ba', '[object Object]', '2025-09-28T09:15:45.565Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('11628769-6cc7-40e7-b586-c194d01c46b4', 'USER', 'CREATE', 'dian_payroll_documents', '62be4cd7-57bc-445e-8945-8f659e54dda5', '[object Object]', '2025-09-28T09:15:45.578Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('5f26f5b8-02bf-4fc0-8c93-7fd2c341033b', 'USER', 'CREATE', 'dian_payroll_documents', '847e9959-3fb3-49bb-aaf4-89384c26530f', '[object Object]', '2025-09-28T09:15:45.583Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('ab974070-1bf2-48b3-b95c-e56ab2f20fab', 'USER', 'CREATE', 'dian_payroll_documents', '5f80faa4-b1f2-4e1e-9b19-b28933669799', '[object Object]', '2025-09-28T09:15:45.588Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('5d55e1b5-6ffb-4189-88c5-319e16979e7b', 'USER', 'CREATE', 'dian_payroll_documents', '68017615-114c-443e-91fa-55e01fb94e30', '[object Object]', '2025-09-28T09:15:45.592Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('399c5b97-9999-44ef-89c8-ad16e901c945', 'USER', 'CREATE', 'dian_payroll_documents', 'b7600fc3-92db-44d8-94e9-7e5eaf5794ec', '[object Object]', '2025-09-28T09:15:45.596Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('e72b5a62-c87e-46be-adde-7efd279b03c0', 'USER', 'CREATE', 'dian_payroll_documents', 'c1c158eb-ba19-4152-8ca7-5c63187c7ecb', '[object Object]', '2025-09-28T09:15:45.599Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('f44845af-5f9d-4c15-841d-a973449433a1', 'USER', 'CREATE', 'dian_payroll_documents', '026b3334-f16a-4e87-8159-4234cea5509f', '[object Object]', '2025-09-28T09:15:45.604Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('cd8818e9-f547-42d5-bf2c-0608b680bcd9', 'USER', 'CREATE', 'dian_payroll_documents', '5d9e82c9-0447-45a2-9c7d-4e2976068a0d', '[object Object]', '2025-09-28T09:15:45.607Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('62f1f791-22fd-45d7-a0b3-ea0930ca1996', 'USER', 'CREATE', 'dian_payroll_documents', 'f56a4d2d-e523-42f4-8110-44aa3d5802c2', '[object Object]', '2025-09-28T09:15:45.612Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('e44d5e10-553d-4dac-8ba2-a948af643534', 'USER', 'CREATE', 'dian_payroll_documents', 'ce8ad688-5a08-4ca1-bffb-768f311fb449', '[object Object]', '2025-09-28T09:15:45.617Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('5d6ac283-4063-4d7c-bcd7-e42555d0ab4d', 'USER', 'CREATE', 'dian_payroll_documents', '74f3fac5-ce1b-48bd-b38b-24d5fb5d30cd', '[object Object]', '2025-09-28T09:15:45.622Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('308de1e0-6f54-460e-9b2f-7474d9c04bb9', '192.168.1.103', 'DIAN_OPERATION', 'dian_payroll_documents', NULL, '[object Object]', '2025-09-28T09:15:45.627Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('f797052d-e05e-4768-b6be-cd22828a6d94', '192.168.1.103', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-28T09:38:09.434Z');
INSERT INTO audit_events ("id", "actor", "event_type", "ref_table", "ref_id", "payload", "created_at") VALUES ('c99dbf45-17a4-486c-82a6-9585a9930217', '192.168.1.103', 'READ', 'compliance_dashboard', NULL, '[object Object]', '2025-09-28T09:38:09.457Z');

-- Constraints
ALTER TABLE audit_events ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);

-- Índices
CREATE INDEX idx_audit_events_table ON public.audit_events USING btree (ref_table);
CREATE INDEX idx_audit_events_date ON public.audit_events USING btree (created_at);
CREATE INDEX idx_audit_events_type ON public.audit_events USING btree (event_type);


-- =====================================================
-- Tabla: calendar_events
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS calendar_events CASCADE;
CREATE TABLE calendar_events (id UUID DEFAULT gen_random_uuid() NOT NULL, title VARCHAR(255) NOT NULL, description TEXT, event_date DATE NOT NULL, event_time TIME WITHOUT TIME ZONE, type VARCHAR(50) NOT NULL, status VARCHAR(50) DEFAULT 'pending'::character varying, priority VARCHAR(20) DEFAULT 'medium'::character varying, amount NUMERIC(15,2), category VARCHAR(50), recurrence VARCHAR(20) DEFAULT 'none'::character varying, parent_event_id UUID, project_id UUID, personnel_id UUID, payroll_period_id UUID, notify_days_before INTEGER DEFAULT 1, notification_sent BOOLEAN DEFAULT false, is_completed BOOLEAN DEFAULT false, completed_at TIMESTAMP, completed_by VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Constraints
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_parent_event_id_fkey FOREIGN KEY (parent_event_id) REFERENCES calendar_events(id);
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES personnel(id);

-- Índices
CREATE INDEX idx_calendar_events_date ON public.calendar_events USING btree (event_date);
CREATE INDEX idx_calendar_events_type ON public.calendar_events USING btree (type);
CREATE INDEX idx_calendar_events_status ON public.calendar_events USING btree (status);
CREATE INDEX idx_calendar_events_project ON public.calendar_events USING btree (project_id);
CREATE INDEX idx_calendar_events_personnel ON public.calendar_events USING btree (personnel_id);


-- =====================================================
-- Tabla: clients
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS clients CASCADE;
CREATE TABLE clients (id UUID DEFAULT gen_random_uuid() NOT NULL, name VARCHAR(255) NOT NULL, contact_name VARCHAR(255), phone VARCHAR(50), email VARCHAR(255), address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Datos (1 registros)
INSERT INTO clients ("id", "name", "contact_name", "phone", "email", "address", "created_at") VALUES ('cdb68ad9-25d2-44d9-aa7a-6a293839f130', 'MAS', '', '', '', '', '2025-09-27T05:46:51.942Z');

-- Constraints
ALTER TABLE clients ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


-- =====================================================
-- Tabla: company_settings
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS company_settings CASCADE;
CREATE TABLE company_settings (id UUID DEFAULT gen_random_uuid() NOT NULL, company_name VARCHAR(255) DEFAULT 'HYR CONSTRUCTORA & SOLDADURA S.A.S.'::character varying NOT NULL, nit VARCHAR(20) DEFAULT '900123456'::character varying NOT NULL, dv VARCHAR(1) DEFAULT '7'::character varying NOT NULL, ciiu VARCHAR(10) DEFAULT '4100'::character varying NOT NULL, address TEXT DEFAULT 'Calle 123 #45-67, Bogotá D.C.'::text, phone VARCHAR(50) DEFAULT '+57 1 234 5678'::character varying, email VARCHAR(100) DEFAULT 'info@hyrconstructora.com'::character varying, dian_invoice_resolution JSONB DEFAULT '{"to": 5000, "date": "2024-01-01", "from": 1, "number": "18760000001", "prefix": "SETT", "valid_until": "2025-12-31"}'::jsonb, dian_payroll_resolution JSONB DEFAULT '{"date": "2024-01-01", "number": "000000000042", "valid_until": "2025-12-31"}'::jsonb, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Datos (1 registros)
INSERT INTO company_settings ("id", "company_name", "nit", "dv", "ciiu", "address", "phone", "email", "dian_invoice_resolution", "dian_payroll_resolution", "created_at", "updated_at") VALUES ('00000000-0000-0000-0000-000000000001', 'HYR CONSTRUCTORA & SOLDADURA S.A.S.', '900123456', '7', '4100', 'Calle 123 #45-67, Bogotá D.C.', '+57 1 234 5678', 'info@hyrconstructora.com', '[object Object]', '[object Object]', '2025-09-08T05:31:02.176Z', '2025-09-08T05:31:02.176Z');

-- Constraints
ALTER TABLE company_settings ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


-- =====================================================
-- Tabla: contractors
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS contractors CASCADE;
CREATE TABLE contractors (id UUID DEFAULT gen_random_uuid() NOT NULL, name VARCHAR(255) NOT NULL, document_type VARCHAR(10) DEFAULT 'CC'::character varying, document_number VARCHAR(50) NOT NULL, email VARCHAR(100), phone VARCHAR(50), address TEXT, obligated_to_invoice BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Constraints
ALTER TABLE contractors ADD CONSTRAINT contractors_pkey PRIMARY KEY (id);
ALTER TABLE contractors ADD CONSTRAINT contractors_document_number_key UNIQUE (document_number);


-- =====================================================
-- Tabla: dian_payroll_documents
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS dian_payroll_documents CASCADE;
CREATE TABLE dian_payroll_documents (id UUID DEFAULT gen_random_uuid() NOT NULL, period VARCHAR(7) NOT NULL, employee_name VARCHAR(255) NOT NULL, employee_document VARCHAR(50) NOT NULL, base_salary NUMERIC(15,2) NOT NULL, worked_days INTEGER NOT NULL, cune TEXT NOT NULL, xml_content TEXT, dian_status VARCHAR(50) DEFAULT 'PENDIENTE'::character varying, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Datos (12 registros)
INSERT INTO dian_payroll_documents ("id", "period", "employee_name", "employee_document", "base_salary", "worked_days", "cune", "xml_content", "dian_status", "created_at") VALUES ('7b71dc26-80c1-4fc3-b08e-c75a72c038ba', '2025-09', ' BONILLA ANGULO JOHAN SEBASTIAN', '1005985437', '1424000.00', 30, '447ACEE2-43E8EE8A-CA8CC810-ABA1DB2C', '<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual">
    <InformacionGeneral>
        <Version>V1.0</Version>
        <Ambiente>2</Ambiente>
        <TipoXML>102</TipoXML>
        <CUNE>447ACEE2-43E8EE8A-CA8CC810-ABA1DB2C</CUNE>
        <EncripCUNE></EncripCUNE>
        <FechaGen>2025-09-28</FechaGen>
        <HoraGen>04:15:45</HoraGen>
        <PeriodoNomina>
            <FechaIngreso>2025-09-28</FechaIngreso>
            <FechaLiquidacionInicio>2025-09-01</FechaLiquidacionInicio>
            <FechaLiquidacionFin>2025-09-30</FechaLiquidacionFin>
            <TiempoLaborado>30</TiempoLaborado>
            <FechaGen>2025-09-28</FechaGen>
        </PeriodoNomina>
        <NumeroSecuenciaXML>
            <Numero>1</Numero>
            <Prefijo>NOM</Prefijo>
            <Consecutivo>001</Consecutivo>
        </NumeroSecuenciaXML>
    </InformacionGeneral>
    
    <Empleador>
        <RazonSocial>HYR CONSTRUCTORA & SOLDADURA S.A.S.</RazonSocial>
        <NIT>900123456</NIT>
        <DV>7</DV>
        <Pais>CO</Pais>
        <DepartamentoEstado>11</DepartamentoEstado>
        <MunicipioCiudad>11001</MunicipioCiudad>
        <Direccion>Calle 123 #45-67, Bogotá D.C.</Direccion>
    </Empleador>
    
    <Trabajador>
        <TipoTrabajador>01</TipoTrabajador>
        <SubTipoTrabajador>00</SubTipoTrabajador>
        <AltoRiesgoPension>false</AltoRiesgoPension>
        <TipoDocumento>13</TipoDocumento>
        <NumeroDocumento>1005985437</NumeroDocumento>
        <PrimerApellido>BONILLA</PrimerApellido>
        <SegundoApellido>ANGULO</SegundoApellido>
        <PrimerNombre></PrimerNombre>
        <SegundoNombre>JOHAN</SegundoNombre>
        <LugarTrabajoPais>CO</LugarTrabajoPais>
        <LugarTrabajoDepartamentoEstado>11</LugarTrabajoDepartamentoEstado>
        <LugarTrabajoMunicipioCiudad>11001</LugarTrabajoMunicipioCiudad>
        <LugarTrabajoOtros>Construcción</LugarTrabajoOtros>
        <SalarioIntegral>false</SalarioIntegral>
        <TipoContrato>1</TipoContrato>
        <Sueldo>1424000</Sueldo>
        <CodigoTrabajador>EMP1005985437</CodigoTrabajador>
    </Trabajador>
    
    <Pago>
        <Forma>1</Forma>
        <Metodo>1</Metodo>
        <Banco></Banco>
        <TipoCuenta></TipoCuenta>
        <NumeroCuenta></NumeroCuenta>
    </Pago>
    
    <Devengados>
        <Basico>
            <DiasTrabajados>30</DiasTrabajados>
            <SueldoTrabajado>1424000</SueldoTrabajado>
        </Basico>
        <Transporte>
            <ViaticoManuAlojS>200000</ViaticoManuAlojS>
        </Transporte>
    </Devengados>
    
    <Deducciones>
        <Salud>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </Salud>
        <FondoPension>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </FondoPension>
        
    </Deducciones>
    
    <ComprobanteTotal>
        <DevengadosTotal>1624000</DevengadosTotal>
        <DeduccionesTotal>113920</DeduccionesTotal>
        <ComprobanteTotal>1510080</ComprobanteTotal>
    </ComprobanteTotal>
    
</NominaIndividual>', 'ACEPTADO_SIMULADO', '2025-09-28T09:15:45.555Z');
INSERT INTO dian_payroll_documents ("id", "period", "employee_name", "employee_document", "base_salary", "worked_days", "cune", "xml_content", "dian_status", "created_at") VALUES ('62be4cd7-57bc-445e-8945-8f659e54dda5', '2025-09', ' HERNANDEZ COLMENAREZ BERNARDO ANTONIO ', '4976648', '1424000.00', 30, '1A0247A7-78149EC8-CBA018C0-0335A119', '<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual">
    <InformacionGeneral>
        <Version>V1.0</Version>
        <Ambiente>2</Ambiente>
        <TipoXML>102</TipoXML>
        <CUNE>1A0247A7-78149EC8-CBA018C0-0335A119</CUNE>
        <EncripCUNE></EncripCUNE>
        <FechaGen>2025-09-28</FechaGen>
        <HoraGen>04:15:45</HoraGen>
        <PeriodoNomina>
            <FechaIngreso>2025-09-28</FechaIngreso>
            <FechaLiquidacionInicio>2025-09-01</FechaLiquidacionInicio>
            <FechaLiquidacionFin>2025-09-30</FechaLiquidacionFin>
            <TiempoLaborado>30</TiempoLaborado>
            <FechaGen>2025-09-28</FechaGen>
        </PeriodoNomina>
        <NumeroSecuenciaXML>
            <Numero>1</Numero>
            <Prefijo>NOM</Prefijo>
            <Consecutivo>001</Consecutivo>
        </NumeroSecuenciaXML>
    </InformacionGeneral>
    
    <Empleador>
        <RazonSocial>HYR CONSTRUCTORA & SOLDADURA S.A.S.</RazonSocial>
        <NIT>900123456</NIT>
        <DV>7</DV>
        <Pais>CO</Pais>
        <DepartamentoEstado>11</DepartamentoEstado>
        <MunicipioCiudad>11001</MunicipioCiudad>
        <Direccion>Calle 123 #45-67, Bogotá D.C.</Direccion>
    </Empleador>
    
    <Trabajador>
        <TipoTrabajador>01</TipoTrabajador>
        <SubTipoTrabajador>00</SubTipoTrabajador>
        <AltoRiesgoPension>false</AltoRiesgoPension>
        <TipoDocumento>13</TipoDocumento>
        <NumeroDocumento>4976648</NumeroDocumento>
        <PrimerApellido>HERNANDEZ</PrimerApellido>
        <SegundoApellido>COLMENAREZ</SegundoApellido>
        <PrimerNombre></PrimerNombre>
        <SegundoNombre>BERNARDO</SegundoNombre>
        <LugarTrabajoPais>CO</LugarTrabajoPais>
        <LugarTrabajoDepartamentoEstado>11</LugarTrabajoDepartamentoEstado>
        <LugarTrabajoMunicipioCiudad>11001</LugarTrabajoMunicipioCiudad>
        <LugarTrabajoOtros>Construcción</LugarTrabajoOtros>
        <SalarioIntegral>false</SalarioIntegral>
        <TipoContrato>1</TipoContrato>
        <Sueldo>1424000</Sueldo>
        <CodigoTrabajador>EMP4976648</CodigoTrabajador>
    </Trabajador>
    
    <Pago>
        <Forma>1</Forma>
        <Metodo>1</Metodo>
        <Banco></Banco>
        <TipoCuenta></TipoCuenta>
        <NumeroCuenta></NumeroCuenta>
    </Pago>
    
    <Devengados>
        <Basico>
            <DiasTrabajados>30</DiasTrabajados>
            <SueldoTrabajado>1424000</SueldoTrabajado>
        </Basico>
        <Transporte>
            <ViaticoManuAlojS>200000</ViaticoManuAlojS>
        </Transporte>
    </Devengados>
    
    <Deducciones>
        <Salud>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </Salud>
        <FondoPension>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </FondoPension>
        
    </Deducciones>
    
    <ComprobanteTotal>
        <DevengadosTotal>1624000</DevengadosTotal>
        <DeduccionesTotal>113920</DeduccionesTotal>
        <ComprobanteTotal>1510080</ComprobanteTotal>
    </ComprobanteTotal>
    
</NominaIndividual>', 'ACEPTADO_SIMULADO', '2025-09-28T09:15:45.573Z');
INSERT INTO dian_payroll_documents ("id", "period", "employee_name", "employee_document", "base_salary", "worked_days", "cune", "xml_content", "dian_status", "created_at") VALUES ('847e9959-3fb3-49bb-aaf4-89384c26530f', '2025-09', 'ALARCON LLANOS JAIDER', '1144185672', '1424000.00', 30, '444E1ACB-90B1AD2D-E8AA8BFF-6C40E136', '<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual">
    <InformacionGeneral>
        <Version>V1.0</Version>
        <Ambiente>2</Ambiente>
        <TipoXML>102</TipoXML>
        <CUNE>444E1ACB-90B1AD2D-E8AA8BFF-6C40E136</CUNE>
        <EncripCUNE></EncripCUNE>
        <FechaGen>2025-09-28</FechaGen>
        <HoraGen>04:15:45</HoraGen>
        <PeriodoNomina>
            <FechaIngreso>2025-09-28</FechaIngreso>
            <FechaLiquidacionInicio>2025-09-01</FechaLiquidacionInicio>
            <FechaLiquidacionFin>2025-09-30</FechaLiquidacionFin>
            <TiempoLaborado>30</TiempoLaborado>
            <FechaGen>2025-09-28</FechaGen>
        </PeriodoNomina>
        <NumeroSecuenciaXML>
            <Numero>1</Numero>
            <Prefijo>NOM</Prefijo>
            <Consecutivo>001</Consecutivo>
        </NumeroSecuenciaXML>
    </InformacionGeneral>
    
    <Empleador>
        <RazonSocial>HYR CONSTRUCTORA & SOLDADURA S.A.S.</RazonSocial>
        <NIT>900123456</NIT>
        <DV>7</DV>
        <Pais>CO</Pais>
        <DepartamentoEstado>11</DepartamentoEstado>
        <MunicipioCiudad>11001</MunicipioCiudad>
        <Direccion>Calle 123 #45-67, Bogotá D.C.</Direccion>
    </Empleador>
    
    <Trabajador>
        <TipoTrabajador>01</TipoTrabajador>
        <SubTipoTrabajador>00</SubTipoTrabajador>
        <AltoRiesgoPension>false</AltoRiesgoPension>
        <TipoDocumento>13</TipoDocumento>
        <NumeroDocumento>1144185672</NumeroDocumento>
        <PrimerApellido>LLANOS</PrimerApellido>
        <SegundoApellido>JAIDER</SegundoApellido>
        <PrimerNombre>ALARCON</PrimerNombre>
        <SegundoNombre></SegundoNombre>
        <LugarTrabajoPais>CO</LugarTrabajoPais>
        <LugarTrabajoDepartamentoEstado>11</LugarTrabajoDepartamentoEstado>
        <LugarTrabajoMunicipioCiudad>11001</LugarTrabajoMunicipioCiudad>
        <LugarTrabajoOtros>Construcción</LugarTrabajoOtros>
        <SalarioIntegral>false</SalarioIntegral>
        <TipoContrato>1</TipoContrato>
        <Sueldo>1424000</Sueldo>
        <CodigoTrabajador>EMP1144185672</CodigoTrabajador>
    </Trabajador>
    
    <Pago>
        <Forma>1</Forma>
        <Metodo>1</Metodo>
        <Banco></Banco>
        <TipoCuenta></TipoCuenta>
        <NumeroCuenta></NumeroCuenta>
    </Pago>
    
    <Devengados>
        <Basico>
            <DiasTrabajados>30</DiasTrabajados>
            <SueldoTrabajado>1424000</SueldoTrabajado>
        </Basico>
        <Transporte>
            <ViaticoManuAlojS>200000</ViaticoManuAlojS>
        </Transporte>
    </Devengados>
    
    <Deducciones>
        <Salud>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </Salud>
        <FondoPension>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </FondoPension>
        
    </Deducciones>
    
    <ComprobanteTotal>
        <DevengadosTotal>1624000</DevengadosTotal>
        <DeduccionesTotal>113920</DeduccionesTotal>
        <ComprobanteTotal>1510080</ComprobanteTotal>
    </ComprobanteTotal>
    
</NominaIndividual>', 'ACEPTADO_SIMULADO', '2025-09-28T09:15:45.581Z');
INSERT INTO dian_payroll_documents ("id", "period", "employee_name", "employee_document", "base_salary", "worked_days", "cune", "xml_content", "dian_status", "created_at") VALUES ('5f80faa4-b1f2-4e1e-9b19-b28933669799', '2025-09', 'ANGULO ORTIZ GUSTAVO ADOLFO ', '1143926942', '1424000.00', 30, 'ED523B02-761617A4-E89A1F8B-53BE280A', '<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual">
    <InformacionGeneral>
        <Version>V1.0</Version>
        <Ambiente>2</Ambiente>
        <TipoXML>102</TipoXML>
        <CUNE>ED523B02-761617A4-E89A1F8B-53BE280A</CUNE>
        <EncripCUNE></EncripCUNE>
        <FechaGen>2025-09-28</FechaGen>
        <HoraGen>04:15:45</HoraGen>
        <PeriodoNomina>
            <FechaIngreso>2025-09-28</FechaIngreso>
            <FechaLiquidacionInicio>2025-09-01</FechaLiquidacionInicio>
            <FechaLiquidacionFin>2025-09-30</FechaLiquidacionFin>
            <TiempoLaborado>30</TiempoLaborado>
            <FechaGen>2025-09-28</FechaGen>
        </PeriodoNomina>
        <NumeroSecuenciaXML>
            <Numero>1</Numero>
            <Prefijo>NOM</Prefijo>
            <Consecutivo>001</Consecutivo>
        </NumeroSecuenciaXML>
    </InformacionGeneral>
    
    <Empleador>
        <RazonSocial>HYR CONSTRUCTORA & SOLDADURA S.A.S.</RazonSocial>
        <NIT>900123456</NIT>
        <DV>7</DV>
        <Pais>CO</Pais>
        <DepartamentoEstado>11</DepartamentoEstado>
        <MunicipioCiudad>11001</MunicipioCiudad>
        <Direccion>Calle 123 #45-67, Bogotá D.C.</Direccion>
    </Empleador>
    
    <Trabajador>
        <TipoTrabajador>01</TipoTrabajador>
        <SubTipoTrabajador>00</SubTipoTrabajador>
        <AltoRiesgoPension>false</AltoRiesgoPension>
        <TipoDocumento>13</TipoDocumento>
        <NumeroDocumento>1143926942</NumeroDocumento>
        <PrimerApellido>ORTIZ</PrimerApellido>
        <SegundoApellido>GUSTAVO</SegundoApellido>
        <PrimerNombre>ANGULO</PrimerNombre>
        <SegundoNombre>ADOLFO</SegundoNombre>
        <LugarTrabajoPais>CO</LugarTrabajoPais>
        <LugarTrabajoDepartamentoEstado>11</LugarTrabajoDepartamentoEstado>
        <LugarTrabajoMunicipioCiudad>11001</LugarTrabajoMunicipioCiudad>
        <LugarTrabajoOtros>Construcción</LugarTrabajoOtros>
        <SalarioIntegral>false</SalarioIntegral>
        <TipoContrato>1</TipoContrato>
        <Sueldo>1424000</Sueldo>
        <CodigoTrabajador>EMP1143926942</CodigoTrabajador>
    </Trabajador>
    
    <Pago>
        <Forma>1</Forma>
        <Metodo>1</Metodo>
        <Banco></Banco>
        <TipoCuenta></TipoCuenta>
        <NumeroCuenta></NumeroCuenta>
    </Pago>
    
    <Devengados>
        <Basico>
            <DiasTrabajados>30</DiasTrabajados>
            <SueldoTrabajado>1424000</SueldoTrabajado>
        </Basico>
        <Transporte>
            <ViaticoManuAlojS>200000</ViaticoManuAlojS>
        </Transporte>
    </Devengados>
    
    <Deducciones>
        <Salud>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </Salud>
        <FondoPension>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </FondoPension>
        
    </Deducciones>
    
    <ComprobanteTotal>
        <DevengadosTotal>1624000</DevengadosTotal>
        <DeduccionesTotal>113920</DeduccionesTotal>
        <ComprobanteTotal>1510080</ComprobanteTotal>
    </ComprobanteTotal>
    
</NominaIndividual>', 'ACEPTADO_SIMULADO', '2025-09-28T09:15:45.586Z');
INSERT INTO dian_payroll_documents ("id", "period", "employee_name", "employee_document", "base_salary", "worked_days", "cune", "xml_content", "dian_status", "created_at") VALUES ('68017615-114c-443e-91fa-55e01fb94e30', '2025-09', 'ARROYO LEMUS HUGO FERLEY ', '14465180', '1800000.00', 30, 'B821D4E0-E56DB1B9-1A6F6C43-DB17A981', '<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual">
    <InformacionGeneral>
        <Version>V1.0</Version>
        <Ambiente>2</Ambiente>
        <TipoXML>102</TipoXML>
        <CUNE>B821D4E0-E56DB1B9-1A6F6C43-DB17A981</CUNE>
        <EncripCUNE></EncripCUNE>
        <FechaGen>2025-09-28</FechaGen>
        <HoraGen>04:15:45</HoraGen>
        <PeriodoNomina>
            <FechaIngreso>2025-09-28</FechaIngreso>
            <FechaLiquidacionInicio>2025-09-01</FechaLiquidacionInicio>
            <FechaLiquidacionFin>2025-09-30</FechaLiquidacionFin>
            <TiempoLaborado>30</TiempoLaborado>
            <FechaGen>2025-09-28</FechaGen>
        </PeriodoNomina>
        <NumeroSecuenciaXML>
            <Numero>1</Numero>
            <Prefijo>NOM</Prefijo>
            <Consecutivo>001</Consecutivo>
        </NumeroSecuenciaXML>
    </InformacionGeneral>
    
    <Empleador>
        <RazonSocial>HYR CONSTRUCTORA & SOLDADURA S.A.S.</RazonSocial>
        <NIT>900123456</NIT>
        <DV>7</DV>
        <Pais>CO</Pais>
        <DepartamentoEstado>11</DepartamentoEstado>
        <MunicipioCiudad>11001</MunicipioCiudad>
        <Direccion>Calle 123 #45-67, Bogotá D.C.</Direccion>
    </Empleador>
    
    <Trabajador>
        <TipoTrabajador>01</TipoTrabajador>
        <SubTipoTrabajador>00</SubTipoTrabajador>
        <AltoRiesgoPension>false</AltoRiesgoPension>
        <TipoDocumento>13</TipoDocumento>
        <NumeroDocumento>14465180</NumeroDocumento>
        <PrimerApellido>LEMUS</PrimerApellido>
        <SegundoApellido>HUGO</SegundoApellido>
        <PrimerNombre>ARROYO</PrimerNombre>
        <SegundoNombre>FERLEY</SegundoNombre>
        <LugarTrabajoPais>CO</LugarTrabajoPais>
        <LugarTrabajoDepartamentoEstado>11</LugarTrabajoDepartamentoEstado>
        <LugarTrabajoMunicipioCiudad>11001</LugarTrabajoMunicipioCiudad>
        <LugarTrabajoOtros>Construcción</LugarTrabajoOtros>
        <SalarioIntegral>false</SalarioIntegral>
        <TipoContrato>1</TipoContrato>
        <Sueldo>1800000</Sueldo>
        <CodigoTrabajador>EMP14465180</CodigoTrabajador>
    </Trabajador>
    
    <Pago>
        <Forma>1</Forma>
        <Metodo>1</Metodo>
        <Banco></Banco>
        <TipoCuenta></TipoCuenta>
        <NumeroCuenta></NumeroCuenta>
    </Pago>
    
    <Devengados>
        <Basico>
            <DiasTrabajados>30</DiasTrabajados>
            <SueldoTrabajado>1800000</SueldoTrabajado>
        </Basico>
        <Transporte>
            <ViaticoManuAlojS>200000</ViaticoManuAlojS>
        </Transporte>
    </Devengados>
    
    <Deducciones>
        <Salud>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>72000</Deduccion>
        </Salud>
        <FondoPension>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>72000</Deduccion>
        </FondoPension>
        
    </Deducciones>
    
    <ComprobanteTotal>
        <DevengadosTotal>2000000</DevengadosTotal>
        <DeduccionesTotal>144000</DeduccionesTotal>
        <ComprobanteTotal>1856000</ComprobanteTotal>
    </ComprobanteTotal>
    
</NominaIndividual>', 'ACEPTADO_SIMULADO', '2025-09-28T09:15:45.590Z');
INSERT INTO dian_payroll_documents ("id", "period", "employee_name", "employee_document", "base_salary", "worked_days", "cune", "xml_content", "dian_status", "created_at") VALUES ('b7600fc3-92db-44d8-94e9-7e5eaf5794ec', '2025-09', 'CAMACHO MICOLTA JOSE RAÚL ', '1107084364', '1424000.00', 30, '8292AD5B-20836764-8AA9D0BE-3BE6062D', '<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual">
    <InformacionGeneral>
        <Version>V1.0</Version>
        <Ambiente>2</Ambiente>
        <TipoXML>102</TipoXML>
        <CUNE>8292AD5B-20836764-8AA9D0BE-3BE6062D</CUNE>
        <EncripCUNE></EncripCUNE>
        <FechaGen>2025-09-28</FechaGen>
        <HoraGen>04:15:45</HoraGen>
        <PeriodoNomina>
            <FechaIngreso>2025-09-28</FechaIngreso>
            <FechaLiquidacionInicio>2025-09-01</FechaLiquidacionInicio>
            <FechaLiquidacionFin>2025-09-30</FechaLiquidacionFin>
            <TiempoLaborado>30</TiempoLaborado>
            <FechaGen>2025-09-28</FechaGen>
        </PeriodoNomina>
        <NumeroSecuenciaXML>
            <Numero>1</Numero>
            <Prefijo>NOM</Prefijo>
            <Consecutivo>001</Consecutivo>
        </NumeroSecuenciaXML>
    </InformacionGeneral>
    
    <Empleador>
        <RazonSocial>HYR CONSTRUCTORA & SOLDADURA S.A.S.</RazonSocial>
        <NIT>900123456</NIT>
        <DV>7</DV>
        <Pais>CO</Pais>
        <DepartamentoEstado>11</DepartamentoEstado>
        <MunicipioCiudad>11001</MunicipioCiudad>
        <Direccion>Calle 123 #45-67, Bogotá D.C.</Direccion>
    </Empleador>
    
    <Trabajador>
        <TipoTrabajador>01</TipoTrabajador>
        <SubTipoTrabajador>00</SubTipoTrabajador>
        <AltoRiesgoPension>false</AltoRiesgoPension>
        <TipoDocumento>13</TipoDocumento>
        <NumeroDocumento>1107084364</NumeroDocumento>
        <PrimerApellido>MICOLTA</PrimerApellido>
        <SegundoApellido>JOSE</SegundoApellido>
        <PrimerNombre>CAMACHO</PrimerNombre>
        <SegundoNombre>RAÚL</SegundoNombre>
        <LugarTrabajoPais>CO</LugarTrabajoPais>
        <LugarTrabajoDepartamentoEstado>11</LugarTrabajoDepartamentoEstado>
        <LugarTrabajoMunicipioCiudad>11001</LugarTrabajoMunicipioCiudad>
        <LugarTrabajoOtros>Construcción</LugarTrabajoOtros>
        <SalarioIntegral>false</SalarioIntegral>
        <TipoContrato>1</TipoContrato>
        <Sueldo>1424000</Sueldo>
        <CodigoTrabajador>EMP1107084364</CodigoTrabajador>
    </Trabajador>
    
    <Pago>
        <Forma>1</Forma>
        <Metodo>1</Metodo>
        <Banco></Banco>
        <TipoCuenta></TipoCuenta>
        <NumeroCuenta></NumeroCuenta>
    </Pago>
    
    <Devengados>
        <Basico>
            <DiasTrabajados>30</DiasTrabajados>
            <SueldoTrabajado>1424000</SueldoTrabajado>
        </Basico>
        <Transporte>
            <ViaticoManuAlojS>200000</ViaticoManuAlojS>
        </Transporte>
    </Devengados>
    
    <Deducciones>
        <Salud>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </Salud>
        <FondoPension>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </FondoPension>
        
    </Deducciones>
    
    <ComprobanteTotal>
        <DevengadosTotal>1624000</DevengadosTotal>
        <DeduccionesTotal>113920</DeduccionesTotal>
        <ComprobanteTotal>1510080</ComprobanteTotal>
    </ComprobanteTotal>
    
</NominaIndividual>', 'ACEPTADO_SIMULADO', '2025-09-28T09:15:45.594Z');
INSERT INTO dian_payroll_documents ("id", "period", "employee_name", "employee_document", "base_salary", "worked_days", "cune", "xml_content", "dian_status", "created_at") VALUES ('c1c158eb-ba19-4152-8ca7-5c63187c7ecb', '2025-09', 'PEREZ VARGAS JOSE GERARDO ', '6835561', '1424000.00', 30, '7D742522-9328F974-58160AC8-52A1E9E8', '<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual">
    <InformacionGeneral>
        <Version>V1.0</Version>
        <Ambiente>2</Ambiente>
        <TipoXML>102</TipoXML>
        <CUNE>7D742522-9328F974-58160AC8-52A1E9E8</CUNE>
        <EncripCUNE></EncripCUNE>
        <FechaGen>2025-09-28</FechaGen>
        <HoraGen>04:15:45</HoraGen>
        <PeriodoNomina>
            <FechaIngreso>2025-09-28</FechaIngreso>
            <FechaLiquidacionInicio>2025-09-01</FechaLiquidacionInicio>
            <FechaLiquidacionFin>2025-09-30</FechaLiquidacionFin>
            <TiempoLaborado>30</TiempoLaborado>
            <FechaGen>2025-09-28</FechaGen>
        </PeriodoNomina>
        <NumeroSecuenciaXML>
            <Numero>1</Numero>
            <Prefijo>NOM</Prefijo>
            <Consecutivo>001</Consecutivo>
        </NumeroSecuenciaXML>
    </InformacionGeneral>
    
    <Empleador>
        <RazonSocial>HYR CONSTRUCTORA & SOLDADURA S.A.S.</RazonSocial>
        <NIT>900123456</NIT>
        <DV>7</DV>
        <Pais>CO</Pais>
        <DepartamentoEstado>11</DepartamentoEstado>
        <MunicipioCiudad>11001</MunicipioCiudad>
        <Direccion>Calle 123 #45-67, Bogotá D.C.</Direccion>
    </Empleador>
    
    <Trabajador>
        <TipoTrabajador>01</TipoTrabajador>
        <SubTipoTrabajador>00</SubTipoTrabajador>
        <AltoRiesgoPension>false</AltoRiesgoPension>
        <TipoDocumento>13</TipoDocumento>
        <NumeroDocumento>6835561</NumeroDocumento>
        <PrimerApellido>VARGAS</PrimerApellido>
        <SegundoApellido>JOSE</SegundoApellido>
        <PrimerNombre>PEREZ</PrimerNombre>
        <SegundoNombre>GERARDO</SegundoNombre>
        <LugarTrabajoPais>CO</LugarTrabajoPais>
        <LugarTrabajoDepartamentoEstado>11</LugarTrabajoDepartamentoEstado>
        <LugarTrabajoMunicipioCiudad>11001</LugarTrabajoMunicipioCiudad>
        <LugarTrabajoOtros>Construcción</LugarTrabajoOtros>
        <SalarioIntegral>false</SalarioIntegral>
        <TipoContrato>1</TipoContrato>
        <Sueldo>1424000</Sueldo>
        <CodigoTrabajador>EMP6835561</CodigoTrabajador>
    </Trabajador>
    
    <Pago>
        <Forma>1</Forma>
        <Metodo>1</Metodo>
        <Banco></Banco>
        <TipoCuenta></TipoCuenta>
        <NumeroCuenta></NumeroCuenta>
    </Pago>
    
    <Devengados>
        <Basico>
            <DiasTrabajados>30</DiasTrabajados>
            <SueldoTrabajado>1424000</SueldoTrabajado>
        </Basico>
        <Transporte>
            <ViaticoManuAlojS>200000</ViaticoManuAlojS>
        </Transporte>
    </Devengados>
    
    <Deducciones>
        <Salud>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </Salud>
        <FondoPension>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </FondoPension>
        
    </Deducciones>
    
    <ComprobanteTotal>
        <DevengadosTotal>1624000</DevengadosTotal>
        <DeduccionesTotal>113920</DeduccionesTotal>
        <ComprobanteTotal>1510080</ComprobanteTotal>
    </ComprobanteTotal>
    
</NominaIndividual>', 'ACEPTADO_SIMULADO', '2025-09-28T09:15:45.598Z');
INSERT INTO dian_payroll_documents ("id", "period", "employee_name", "employee_document", "base_salary", "worked_days", "cune", "xml_content", "dian_status", "created_at") VALUES ('026b3334-f16a-4e87-8159-4234cea5509f', '2025-09', 'QUIÑONES ARROYO DANY ALEJANDRO ', '1130664803', '1425000.00', 30, 'DA1A3AB2-9060C881-B6E632AE-A80FC238', '<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual">
    <InformacionGeneral>
        <Version>V1.0</Version>
        <Ambiente>2</Ambiente>
        <TipoXML>102</TipoXML>
        <CUNE>DA1A3AB2-9060C881-B6E632AE-A80FC238</CUNE>
        <EncripCUNE></EncripCUNE>
        <FechaGen>2025-09-28</FechaGen>
        <HoraGen>04:15:45</HoraGen>
        <PeriodoNomina>
            <FechaIngreso>2025-09-28</FechaIngreso>
            <FechaLiquidacionInicio>2025-09-01</FechaLiquidacionInicio>
            <FechaLiquidacionFin>2025-09-30</FechaLiquidacionFin>
            <TiempoLaborado>30</TiempoLaborado>
            <FechaGen>2025-09-28</FechaGen>
        </PeriodoNomina>
        <NumeroSecuenciaXML>
            <Numero>1</Numero>
            <Prefijo>NOM</Prefijo>
            <Consecutivo>001</Consecutivo>
        </NumeroSecuenciaXML>
    </InformacionGeneral>
    
    <Empleador>
        <RazonSocial>HYR CONSTRUCTORA & SOLDADURA S.A.S.</RazonSocial>
        <NIT>900123456</NIT>
        <DV>7</DV>
        <Pais>CO</Pais>
        <DepartamentoEstado>11</DepartamentoEstado>
        <MunicipioCiudad>11001</MunicipioCiudad>
        <Direccion>Calle 123 #45-67, Bogotá D.C.</Direccion>
    </Empleador>
    
    <Trabajador>
        <TipoTrabajador>01</TipoTrabajador>
        <SubTipoTrabajador>00</SubTipoTrabajador>
        <AltoRiesgoPension>false</AltoRiesgoPension>
        <TipoDocumento>13</TipoDocumento>
        <NumeroDocumento>1130664803</NumeroDocumento>
        <PrimerApellido>ARROYO</PrimerApellido>
        <SegundoApellido>DANY</SegundoApellido>
        <PrimerNombre>QUIÑONES</PrimerNombre>
        <SegundoNombre>ALEJANDRO</SegundoNombre>
        <LugarTrabajoPais>CO</LugarTrabajoPais>
        <LugarTrabajoDepartamentoEstado>11</LugarTrabajoDepartamentoEstado>
        <LugarTrabajoMunicipioCiudad>11001</LugarTrabajoMunicipioCiudad>
        <LugarTrabajoOtros>Construcción</LugarTrabajoOtros>
        <SalarioIntegral>false</SalarioIntegral>
        <TipoContrato>1</TipoContrato>
        <Sueldo>1425000</Sueldo>
        <CodigoTrabajador>EMP1130664803</CodigoTrabajador>
    </Trabajador>
    
    <Pago>
        <Forma>1</Forma>
        <Metodo>1</Metodo>
        <Banco></Banco>
        <TipoCuenta></TipoCuenta>
        <NumeroCuenta></NumeroCuenta>
    </Pago>
    
    <Devengados>
        <Basico>
            <DiasTrabajados>30</DiasTrabajados>
            <SueldoTrabajado>1425000</SueldoTrabajado>
        </Basico>
        <Transporte>
            <ViaticoManuAlojS>200000</ViaticoManuAlojS>
        </Transporte>
    </Devengados>
    
    <Deducciones>
        <Salud>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>57000</Deduccion>
        </Salud>
        <FondoPension>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>57000</Deduccion>
        </FondoPension>
        
    </Deducciones>
    
    <ComprobanteTotal>
        <DevengadosTotal>1625000</DevengadosTotal>
        <DeduccionesTotal>114000</DeduccionesTotal>
        <ComprobanteTotal>1511000</ComprobanteTotal>
    </ComprobanteTotal>
    
</NominaIndividual>', 'RECHAZADO_SIMULADO', '2025-09-28T09:15:45.602Z');
INSERT INTO dian_payroll_documents ("id", "period", "employee_name", "employee_document", "base_salary", "worked_days", "cune", "xml_content", "dian_status", "created_at") VALUES ('5d9e82c9-0447-45a2-9c7d-4e2976068a0d', '2025-09', 'RAMOS JOSE VINDAR ', '14605813', '1800000.00', 30, '538EEFC4-81A33FD3-C33F0494-D6E2EE5B', '<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual">
    <InformacionGeneral>
        <Version>V1.0</Version>
        <Ambiente>2</Ambiente>
        <TipoXML>102</TipoXML>
        <CUNE>538EEFC4-81A33FD3-C33F0494-D6E2EE5B</CUNE>
        <EncripCUNE></EncripCUNE>
        <FechaGen>2025-09-28</FechaGen>
        <HoraGen>04:15:45</HoraGen>
        <PeriodoNomina>
            <FechaIngreso>2025-09-28</FechaIngreso>
            <FechaLiquidacionInicio>2025-09-01</FechaLiquidacionInicio>
            <FechaLiquidacionFin>2025-09-30</FechaLiquidacionFin>
            <TiempoLaborado>30</TiempoLaborado>
            <FechaGen>2025-09-28</FechaGen>
        </PeriodoNomina>
        <NumeroSecuenciaXML>
            <Numero>1</Numero>
            <Prefijo>NOM</Prefijo>
            <Consecutivo>001</Consecutivo>
        </NumeroSecuenciaXML>
    </InformacionGeneral>
    
    <Empleador>
        <RazonSocial>HYR CONSTRUCTORA & SOLDADURA S.A.S.</RazonSocial>
        <NIT>900123456</NIT>
        <DV>7</DV>
        <Pais>CO</Pais>
        <DepartamentoEstado>11</DepartamentoEstado>
        <MunicipioCiudad>11001</MunicipioCiudad>
        <Direccion>Calle 123 #45-67, Bogotá D.C.</Direccion>
    </Empleador>
    
    <Trabajador>
        <TipoTrabajador>01</TipoTrabajador>
        <SubTipoTrabajador>00</SubTipoTrabajador>
        <AltoRiesgoPension>false</AltoRiesgoPension>
        <TipoDocumento>13</TipoDocumento>
        <NumeroDocumento>14605813</NumeroDocumento>
        <PrimerApellido>JOSE</PrimerApellido>
        <SegundoApellido>VINDAR</SegundoApellido>
        <PrimerNombre>RAMOS</PrimerNombre>
        <SegundoNombre></SegundoNombre>
        <LugarTrabajoPais>CO</LugarTrabajoPais>
        <LugarTrabajoDepartamentoEstado>11</LugarTrabajoDepartamentoEstado>
        <LugarTrabajoMunicipioCiudad>11001</LugarTrabajoMunicipioCiudad>
        <LugarTrabajoOtros>Construcción</LugarTrabajoOtros>
        <SalarioIntegral>false</SalarioIntegral>
        <TipoContrato>1</TipoContrato>
        <Sueldo>1800000</Sueldo>
        <CodigoTrabajador>EMP14605813</CodigoTrabajador>
    </Trabajador>
    
    <Pago>
        <Forma>1</Forma>
        <Metodo>1</Metodo>
        <Banco></Banco>
        <TipoCuenta></TipoCuenta>
        <NumeroCuenta></NumeroCuenta>
    </Pago>
    
    <Devengados>
        <Basico>
            <DiasTrabajados>30</DiasTrabajados>
            <SueldoTrabajado>1800000</SueldoTrabajado>
        </Basico>
        <Transporte>
            <ViaticoManuAlojS>200000</ViaticoManuAlojS>
        </Transporte>
    </Devengados>
    
    <Deducciones>
        <Salud>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>72000</Deduccion>
        </Salud>
        <FondoPension>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>72000</Deduccion>
        </FondoPension>
        
    </Deducciones>
    
    <ComprobanteTotal>
        <DevengadosTotal>2000000</DevengadosTotal>
        <DeduccionesTotal>144000</DeduccionesTotal>
        <ComprobanteTotal>1856000</ComprobanteTotal>
    </ComprobanteTotal>
    
</NominaIndividual>', 'ACEPTADO_SIMULADO', '2025-09-28T09:15:45.606Z');
INSERT INTO dian_payroll_documents ("id", "period", "employee_name", "employee_document", "base_salary", "worked_days", "cune", "xml_content", "dian_status", "created_at") VALUES ('f56a4d2d-e523-42f4-8110-44aa3d5802c2', '2025-09', 'REINA JHON JAIRO ', '6324558', '1424000.00', 30, 'AE8078FD-7584DCF2-3A82F516-B4A0ACDE', '<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual">
    <InformacionGeneral>
        <Version>V1.0</Version>
        <Ambiente>2</Ambiente>
        <TipoXML>102</TipoXML>
        <CUNE>AE8078FD-7584DCF2-3A82F516-B4A0ACDE</CUNE>
        <EncripCUNE></EncripCUNE>
        <FechaGen>2025-09-28</FechaGen>
        <HoraGen>04:15:45</HoraGen>
        <PeriodoNomina>
            <FechaIngreso>2025-09-28</FechaIngreso>
            <FechaLiquidacionInicio>2025-09-01</FechaLiquidacionInicio>
            <FechaLiquidacionFin>2025-09-30</FechaLiquidacionFin>
            <TiempoLaborado>30</TiempoLaborado>
            <FechaGen>2025-09-28</FechaGen>
        </PeriodoNomina>
        <NumeroSecuenciaXML>
            <Numero>1</Numero>
            <Prefijo>NOM</Prefijo>
            <Consecutivo>001</Consecutivo>
        </NumeroSecuenciaXML>
    </InformacionGeneral>
    
    <Empleador>
        <RazonSocial>HYR CONSTRUCTORA & SOLDADURA S.A.S.</RazonSocial>
        <NIT>900123456</NIT>
        <DV>7</DV>
        <Pais>CO</Pais>
        <DepartamentoEstado>11</DepartamentoEstado>
        <MunicipioCiudad>11001</MunicipioCiudad>
        <Direccion>Calle 123 #45-67, Bogotá D.C.</Direccion>
    </Empleador>
    
    <Trabajador>
        <TipoTrabajador>01</TipoTrabajador>
        <SubTipoTrabajador>00</SubTipoTrabajador>
        <AltoRiesgoPension>false</AltoRiesgoPension>
        <TipoDocumento>13</TipoDocumento>
        <NumeroDocumento>6324558</NumeroDocumento>
        <PrimerApellido>JHON</PrimerApellido>
        <SegundoApellido>JAIRO</SegundoApellido>
        <PrimerNombre>REINA</PrimerNombre>
        <SegundoNombre></SegundoNombre>
        <LugarTrabajoPais>CO</LugarTrabajoPais>
        <LugarTrabajoDepartamentoEstado>11</LugarTrabajoDepartamentoEstado>
        <LugarTrabajoMunicipioCiudad>11001</LugarTrabajoMunicipioCiudad>
        <LugarTrabajoOtros>Construcción</LugarTrabajoOtros>
        <SalarioIntegral>false</SalarioIntegral>
        <TipoContrato>1</TipoContrato>
        <Sueldo>1424000</Sueldo>
        <CodigoTrabajador>EMP6324558</CodigoTrabajador>
    </Trabajador>
    
    <Pago>
        <Forma>1</Forma>
        <Metodo>1</Metodo>
        <Banco></Banco>
        <TipoCuenta></TipoCuenta>
        <NumeroCuenta></NumeroCuenta>
    </Pago>
    
    <Devengados>
        <Basico>
            <DiasTrabajados>30</DiasTrabajados>
            <SueldoTrabajado>1424000</SueldoTrabajado>
        </Basico>
        <Transporte>
            <ViaticoManuAlojS>200000</ViaticoManuAlojS>
        </Transporte>
    </Devengados>
    
    <Deducciones>
        <Salud>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </Salud>
        <FondoPension>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </FondoPension>
        
    </Deducciones>
    
    <ComprobanteTotal>
        <DevengadosTotal>1624000</DevengadosTotal>
        <DeduccionesTotal>113920</DeduccionesTotal>
        <ComprobanteTotal>1510080</ComprobanteTotal>
    </ComprobanteTotal>
    
</NominaIndividual>', 'ACEPTADO_SIMULADO', '2025-09-28T09:15:45.610Z');
INSERT INTO dian_payroll_documents ("id", "period", "employee_name", "employee_document", "base_salary", "worked_days", "cune", "xml_content", "dian_status", "created_at") VALUES ('ce8ad688-5a08-4ca1-bffb-768f311fb449', '2025-09', 'SALGADO LAGAREJO IVETH KATHERINE ', '31488013', '1424000.00', 30, '5200094E-66424FA0-D3B5CC2F-67848A09', '<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual">
    <InformacionGeneral>
        <Version>V1.0</Version>
        <Ambiente>2</Ambiente>
        <TipoXML>102</TipoXML>
        <CUNE>5200094E-66424FA0-D3B5CC2F-67848A09</CUNE>
        <EncripCUNE></EncripCUNE>
        <FechaGen>2025-09-28</FechaGen>
        <HoraGen>04:15:45</HoraGen>
        <PeriodoNomina>
            <FechaIngreso>2025-09-28</FechaIngreso>
            <FechaLiquidacionInicio>2025-09-01</FechaLiquidacionInicio>
            <FechaLiquidacionFin>2025-09-30</FechaLiquidacionFin>
            <TiempoLaborado>30</TiempoLaborado>
            <FechaGen>2025-09-28</FechaGen>
        </PeriodoNomina>
        <NumeroSecuenciaXML>
            <Numero>1</Numero>
            <Prefijo>NOM</Prefijo>
            <Consecutivo>001</Consecutivo>
        </NumeroSecuenciaXML>
    </InformacionGeneral>
    
    <Empleador>
        <RazonSocial>HYR CONSTRUCTORA & SOLDADURA S.A.S.</RazonSocial>
        <NIT>900123456</NIT>
        <DV>7</DV>
        <Pais>CO</Pais>
        <DepartamentoEstado>11</DepartamentoEstado>
        <MunicipioCiudad>11001</MunicipioCiudad>
        <Direccion>Calle 123 #45-67, Bogotá D.C.</Direccion>
    </Empleador>
    
    <Trabajador>
        <TipoTrabajador>01</TipoTrabajador>
        <SubTipoTrabajador>00</SubTipoTrabajador>
        <AltoRiesgoPension>false</AltoRiesgoPension>
        <TipoDocumento>13</TipoDocumento>
        <NumeroDocumento>31488013</NumeroDocumento>
        <PrimerApellido>LAGAREJO</PrimerApellido>
        <SegundoApellido>IVETH</SegundoApellido>
        <PrimerNombre>SALGADO</PrimerNombre>
        <SegundoNombre>KATHERINE</SegundoNombre>
        <LugarTrabajoPais>CO</LugarTrabajoPais>
        <LugarTrabajoDepartamentoEstado>11</LugarTrabajoDepartamentoEstado>
        <LugarTrabajoMunicipioCiudad>11001</LugarTrabajoMunicipioCiudad>
        <LugarTrabajoOtros>Construcción</LugarTrabajoOtros>
        <SalarioIntegral>false</SalarioIntegral>
        <TipoContrato>1</TipoContrato>
        <Sueldo>1424000</Sueldo>
        <CodigoTrabajador>EMP31488013</CodigoTrabajador>
    </Trabajador>
    
    <Pago>
        <Forma>1</Forma>
        <Metodo>1</Metodo>
        <Banco></Banco>
        <TipoCuenta></TipoCuenta>
        <NumeroCuenta></NumeroCuenta>
    </Pago>
    
    <Devengados>
        <Basico>
            <DiasTrabajados>30</DiasTrabajados>
            <SueldoTrabajado>1424000</SueldoTrabajado>
        </Basico>
        <Transporte>
            <ViaticoManuAlojS>200000</ViaticoManuAlojS>
        </Transporte>
    </Devengados>
    
    <Deducciones>
        <Salud>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </Salud>
        <FondoPension>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </FondoPension>
        
    </Deducciones>
    
    <ComprobanteTotal>
        <DevengadosTotal>1624000</DevengadosTotal>
        <DeduccionesTotal>113920</DeduccionesTotal>
        <ComprobanteTotal>1510080</ComprobanteTotal>
    </ComprobanteTotal>
    
</NominaIndividual>', 'ACEPTADO_SIMULADO', '2025-09-28T09:15:45.615Z');
INSERT INTO dian_payroll_documents ("id", "period", "employee_name", "employee_document", "base_salary", "worked_days", "cune", "xml_content", "dian_status", "created_at") VALUES ('74f3fac5-ce1b-48bd-b38b-24d5fb5d30cd', '2025-09', 'VALENCIA ARRECHEA ANDRES MAURICIO ', '1144169220', '1424000.00', 30, '5309606D-23677335-C6C79477-84902F35', '<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual">
    <InformacionGeneral>
        <Version>V1.0</Version>
        <Ambiente>2</Ambiente>
        <TipoXML>102</TipoXML>
        <CUNE>5309606D-23677335-C6C79477-84902F35</CUNE>
        <EncripCUNE></EncripCUNE>
        <FechaGen>2025-09-28</FechaGen>
        <HoraGen>04:15:45</HoraGen>
        <PeriodoNomina>
            <FechaIngreso>2025-09-28</FechaIngreso>
            <FechaLiquidacionInicio>2025-09-01</FechaLiquidacionInicio>
            <FechaLiquidacionFin>2025-09-30</FechaLiquidacionFin>
            <TiempoLaborado>30</TiempoLaborado>
            <FechaGen>2025-09-28</FechaGen>
        </PeriodoNomina>
        <NumeroSecuenciaXML>
            <Numero>1</Numero>
            <Prefijo>NOM</Prefijo>
            <Consecutivo>001</Consecutivo>
        </NumeroSecuenciaXML>
    </InformacionGeneral>
    
    <Empleador>
        <RazonSocial>HYR CONSTRUCTORA & SOLDADURA S.A.S.</RazonSocial>
        <NIT>900123456</NIT>
        <DV>7</DV>
        <Pais>CO</Pais>
        <DepartamentoEstado>11</DepartamentoEstado>
        <MunicipioCiudad>11001</MunicipioCiudad>
        <Direccion>Calle 123 #45-67, Bogotá D.C.</Direccion>
    </Empleador>
    
    <Trabajador>
        <TipoTrabajador>01</TipoTrabajador>
        <SubTipoTrabajador>00</SubTipoTrabajador>
        <AltoRiesgoPension>false</AltoRiesgoPension>
        <TipoDocumento>13</TipoDocumento>
        <NumeroDocumento>1144169220</NumeroDocumento>
        <PrimerApellido>ARRECHEA</PrimerApellido>
        <SegundoApellido>ANDRES</SegundoApellido>
        <PrimerNombre>VALENCIA</PrimerNombre>
        <SegundoNombre>MAURICIO</SegundoNombre>
        <LugarTrabajoPais>CO</LugarTrabajoPais>
        <LugarTrabajoDepartamentoEstado>11</LugarTrabajoDepartamentoEstado>
        <LugarTrabajoMunicipioCiudad>11001</LugarTrabajoMunicipioCiudad>
        <LugarTrabajoOtros>Construcción</LugarTrabajoOtros>
        <SalarioIntegral>false</SalarioIntegral>
        <TipoContrato>1</TipoContrato>
        <Sueldo>1424000</Sueldo>
        <CodigoTrabajador>EMP1144169220</CodigoTrabajador>
    </Trabajador>
    
    <Pago>
        <Forma>1</Forma>
        <Metodo>1</Metodo>
        <Banco></Banco>
        <TipoCuenta></TipoCuenta>
        <NumeroCuenta></NumeroCuenta>
    </Pago>
    
    <Devengados>
        <Basico>
            <DiasTrabajados>30</DiasTrabajados>
            <SueldoTrabajado>1424000</SueldoTrabajado>
        </Basico>
        <Transporte>
            <ViaticoManuAlojS>200000</ViaticoManuAlojS>
        </Transporte>
    </Devengados>
    
    <Deducciones>
        <Salud>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </Salud>
        <FondoPension>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>56960</Deduccion>
        </FondoPension>
        
    </Deducciones>
    
    <ComprobanteTotal>
        <DevengadosTotal>1624000</DevengadosTotal>
        <DeduccionesTotal>113920</DeduccionesTotal>
        <ComprobanteTotal>1510080</ComprobanteTotal>
    </ComprobanteTotal>
    
</NominaIndividual>', 'ACEPTADO_SIMULADO', '2025-09-28T09:15:45.620Z');

-- Constraints
ALTER TABLE dian_payroll_documents ADD CONSTRAINT dian_payroll_documents_pkey PRIMARY KEY (id);
ALTER TABLE dian_payroll_documents ADD CONSTRAINT dian_payroll_documents_cune_key UNIQUE (cune);
ALTER TABLE dian_payroll_documents ADD CONSTRAINT dian_payroll_documents_period_employee_document_key UNIQUE (period, employee_document);

-- Índices
CREATE INDEX idx_dian_payroll_period ON public.dian_payroll_documents USING btree (period);
CREATE INDEX idx_dian_payroll_employee ON public.dian_payroll_documents USING btree (employee_document);


-- =====================================================
-- Tabla: document_support
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS document_support CASCADE;
CREATE TABLE document_support (id UUID DEFAULT gen_random_uuid() NOT NULL, ds_number VARCHAR(50) NOT NULL, contractor_id UUID NOT NULL, concept TEXT NOT NULL, base_amount NUMERIC(15,2) NOT NULL, withholdings JSONB DEFAULT '{}'::jsonb, total_amount NUMERIC(15,2) NOT NULL, dian_status VARCHAR(50) DEFAULT 'ACEPTADO_SIMULADO'::character varying, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Constraints
ALTER TABLE document_support ADD CONSTRAINT document_support_pkey PRIMARY KEY (id);
ALTER TABLE document_support ADD CONSTRAINT document_support_ds_number_key UNIQUE (ds_number);
ALTER TABLE document_support ADD CONSTRAINT document_support_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES contractors(id);


-- =====================================================
-- Tabla: electronic_invoices
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS electronic_invoices CASCADE;
CREATE TABLE electronic_invoices (id UUID DEFAULT gen_random_uuid() NOT NULL, invoice_number VARCHAR(50) NOT NULL, client_name VARCHAR(255) NOT NULL, client_nit VARCHAR(20), city VARCHAR(100) NOT NULL, subtotal NUMERIC(15,2) NOT NULL, vat_amount NUMERIC(15,2) DEFAULT 0, reteica_amount NUMERIC(15,2) DEFAULT 0, total_amount NUMERIC(15,2) NOT NULL, cufe TEXT NOT NULL, xml_ubl_content TEXT, dian_validation_status VARCHAR(50) DEFAULT 'PENDIENTE'::character varying, line_items JSONB DEFAULT '[]'::jsonb NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Constraints
ALTER TABLE electronic_invoices ADD CONSTRAINT electronic_invoices_pkey PRIMARY KEY (id);
ALTER TABLE electronic_invoices ADD CONSTRAINT electronic_invoices_invoice_number_key UNIQUE (invoice_number);
ALTER TABLE electronic_invoices ADD CONSTRAINT electronic_invoices_cufe_key UNIQUE (cufe);

-- Índices
CREATE INDEX idx_electronic_invoices_date ON public.electronic_invoices USING btree (created_at);
CREATE INDEX idx_electronic_invoices_client ON public.electronic_invoices USING btree (client_name);
CREATE INDEX idx_electronic_invoices_status ON public.electronic_invoices USING btree (dian_validation_status);


-- =====================================================
-- Tabla: event_notifications
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS event_notifications CASCADE;
CREATE TABLE event_notifications (id UUID DEFAULT gen_random_uuid() NOT NULL, event_id UUID NOT NULL, notification_type VARCHAR(50) NOT NULL, recipient VARCHAR(255) NOT NULL, subject VARCHAR(255), message TEXT, status VARCHAR(50) DEFAULT 'pending'::character varying, scheduled_for TIMESTAMP NOT NULL, sent_at TIMESTAMP, failed_reason TEXT, retry_count INTEGER DEFAULT 0, max_retries INTEGER DEFAULT 3, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Constraints
ALTER TABLE event_notifications ADD CONSTRAINT event_notifications_pkey PRIMARY KEY (id);
ALTER TABLE event_notifications ADD CONSTRAINT event_notifications_event_id_fkey FOREIGN KEY (event_id) REFERENCES calendar_events(id);

-- Índices
CREATE INDEX idx_event_notifications_event ON public.event_notifications USING btree (event_id);
CREATE INDEX idx_event_notifications_status ON public.event_notifications USING btree (status);
CREATE INDEX idx_event_notifications_scheduled ON public.event_notifications USING btree (scheduled_for);


-- =====================================================
-- Tabla: expenses
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS expenses CASCADE;
CREATE TABLE expenses (id UUID DEFAULT gen_random_uuid() NOT NULL, project_id UUID, date DATE NOT NULL, category VARCHAR(50) NOT NULL, subcategory VARCHAR(100), vendor VARCHAR(255), description TEXT, quantity NUMERIC(10,3), unit_price NUMERIC(15,2), amount NUMERIC(15,2) NOT NULL, invoice_number VARCHAR(100), receipt_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Constraints
ALTER TABLE expenses ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);
ALTER TABLE expenses ADD CONSTRAINT expenses_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);

-- Índices
CREATE INDEX idx_expenses_project_date ON public.expenses USING btree (project_id, date);
CREATE INDEX idx_expenses_category ON public.expenses USING btree (category, date);


-- =====================================================
-- Tabla: payroll_details
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS payroll_details CASCADE;
CREATE TABLE payroll_details (id UUID DEFAULT gen_random_uuid() NOT NULL, payroll_period_id VARCHAR(50) NOT NULL, personnel_id UUID NOT NULL, regular_hours NUMERIC(6,2) DEFAULT 0, overtime_hours NUMERIC(6,2) DEFAULT 0, base_salary NUMERIC(15,2) NOT NULL, regular_pay NUMERIC(15,2) DEFAULT 0, overtime_pay NUMERIC(15,2) DEFAULT 0, transport_allowance NUMERIC(15,2) DEFAULT 0, bonuses NUMERIC(15,2) DEFAULT 0, total_income NUMERIC(15,2) DEFAULT 0, health_employee NUMERIC(15,2) DEFAULT 0, pension_employee NUMERIC(15,2) DEFAULT 0, solidarity_contribution NUMERIC(15,2) DEFAULT 0, withholding_tax NUMERIC(15,2) DEFAULT 0, other_deductions NUMERIC(15,2) DEFAULT 0, total_deductions NUMERIC(15,2) DEFAULT 0, net_pay NUMERIC(15,2) DEFAULT 0, health_employer NUMERIC(15,2) DEFAULT 0, pension_employer NUMERIC(15,2) DEFAULT 0, arl NUMERIC(15,2) DEFAULT 0, severance NUMERIC(15,2) DEFAULT 0, severance_interest NUMERIC(15,2) DEFAULT 0, service_bonus NUMERIC(15,2) DEFAULT 0, vacation NUMERIC(15,2) DEFAULT 0, sena NUMERIC(15,2) DEFAULT 0, icbf NUMERIC(15,2) DEFAULT 0, compensation_fund NUMERIC(15,2) DEFAULT 0, total_employer_cost NUMERIC(15,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Datos (24 registros)
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('139f0aca-862c-4731-b316-4c9e03b5309f', 'period-202509', '7a757de1-bae3-4929-8bbd-33e5b7609194', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-28T10:15:11.804Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('6ae09cd5-38ed-4b33-a0be-d63d37931456', 'period-202509', '7b315b15-43a7-4dc9-bc14-59d2f9ce6598', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-28T10:15:11.804Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('6a647586-44b2-4481-b71b-06e341723719', 'period-202509', '5c7905db-d36b-4fca-b1e4-22552415396e', '0.00', '0.00', '1425000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-28T10:15:11.804Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('d2910905-e425-469c-a12e-c663fee5ff44', 'period-202509', '946881e6-d142-4c9d-8721-b4cefbf65f5c', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '1044.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '303703.20', '2025-09-28T10:15:11.804Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('95b5309a-f6d3-414d-92f1-8a966d4d1281', 'period-202509', 'dd1cecf4-9f02-4230-977a-d036bb118bbe', '7.30', '0.48', '1800000.00', '125000.00', '10273.97', '200000.00', '0.00', '335273.97', '13410.96', '13410.96', '0.00', '0.00', '0.00', '26821.92', '308452.05', '28498.29', '40232.88', '23335.07', '27928.32', '3351.40', '27928.32', '13980.92', '6705.48', '10058.22', '13410.96', '530703.83', '2025-09-28T10:15:11.804Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('c4019c50-bd27-4561-bbf2-17c7fbd7bd8a', 'period-202509', 'be857298-7157-4b58-8f7e-e851e871ad10', '0.00', '0.00', '1800000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-28T10:15:11.804Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('9617f03e-ecec-4e83-aab1-49c2f44e5ad2', 'period-202509', 'caf9732a-8cd0-4cf0-b433-b38319a15f08', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-28T10:15:11.804Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('fb2310a4-9455-4e95-b5cb-a6e7f1ebd0c6', 'period-202509', '79f54a60-7f96-4f5e-94f8-33936caed96c', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-28T10:15:11.804Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('f7387f3a-895c-42b8-80ef-22aea93ee605', 'period-202509', '4ee954c6-dc6d-4ce8-a7fe-b721b84aeec9', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-28T10:15:11.804Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('ddf9fbc8-7609-4f39-98ac-2eeb6acfe570', 'period-202509', '469b4596-71b6-4c8a-bd6a-8097b561dff4', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-28T10:15:11.804Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('7f7264e1-e3d9-4c78-b783-aa02d00f31a8', 'period-202509', '8a733736-9e03-497c-b613-cd1f0f67c2bd', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-28T10:15:11.804Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('83480dab-eebf-436c-ab6d-eeaa51b8862c', 'period-202509', 'c562491c-246c-491e-833c-a08237a0e384', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-28T10:15:11.804Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('0adaebe6-0317-4743-a87e-14f7f24964ec', 'period-202508', '7a757de1-bae3-4929-8bbd-33e5b7609194', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-29T04:04:58.319Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('ad4437c7-a9a5-4c8f-a84f-b2642cd97776', 'period-202508', '7b315b15-43a7-4dc9-bc14-59d2f9ce6598', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-29T04:04:58.319Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('b0508b89-8e8d-434a-9b99-4509901507b0', 'period-202508', '5c7905db-d36b-4fca-b1e4-22552415396e', '0.00', '0.00', '1425000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-29T04:04:58.319Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('b94ae155-ddb0-491c-8302-d232b7ccbf54', 'period-202508', '946881e6-d142-4c9d-8721-b4cefbf65f5c', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '1044.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '303703.20', '2025-09-29T04:04:58.319Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('19c2ccde-aa0b-4423-b358-b53750f41cd8', 'period-202508', 'dd1cecf4-9f02-4230-977a-d036bb118bbe', '0.00', '0.00', '1800000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-29T04:04:58.319Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('074017ac-26bd-471c-af9d-9a31b68b66f5', 'period-202508', 'be857298-7157-4b58-8f7e-e851e871ad10', '0.00', '0.00', '1800000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-29T04:04:58.319Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('1a29e487-96d9-406e-b985-2ecb997d1d5c', 'period-202508', 'caf9732a-8cd0-4cf0-b433-b38319a15f08', '23.80', '1.40', '1424000.00', '260821.92', '19178.08', '200000.00', '0.00', '480000.00', '19200.00', '19200.00', '0.00', '0.00', '0.00', '38400.00', '441600.00', '40800.00', '57600.00', '33408.00', '39984.00', '4798.08', '39984.00', '20016.00', '9600.00', '14400.00', '19200.00', '759790.08', '2025-09-29T04:04:58.319Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('dfd2f719-9a8e-467d-b27c-bb5cc9e77619', 'period-202508', '79f54a60-7f96-4f5e-94f8-33936caed96c', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-29T04:04:58.319Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('91421dcd-b79e-43f2-b174-00af7bbee707', 'period-202508', '4ee954c6-dc6d-4ce8-a7fe-b721b84aeec9', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-29T04:04:58.319Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('74e5786b-d64c-46d3-a920-2787607949f6', 'period-202508', '469b4596-71b6-4c8a-bd6a-8097b561dff4', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-29T04:04:58.319Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('d9bd3820-e0c2-4864-8005-ebba0e441464', 'period-202508', '8a733736-9e03-497c-b613-cd1f0f67c2bd', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-29T04:04:58.319Z');
INSERT INTO payroll_details ("id", "payroll_period_id", "personnel_id", "regular_hours", "overtime_hours", "base_salary", "regular_pay", "overtime_pay", "transport_allowance", "bonuses", "total_income", "health_employee", "pension_employee", "solidarity_contribution", "withholding_tax", "other_deductions", "total_deductions", "net_pay", "health_employer", "pension_employer", "arl", "severance", "severance_interest", "service_bonus", "vacation", "sena", "icbf", "compensation_fund", "total_employer_cost", "created_at") VALUES ('d20b38cb-1457-4554-bf13-58983b4e9937', 'period-202508', 'c562491c-246c-491e-833c-a08237a0e384', '0.00', '0.00', '1424000.00', '0.00', '0.00', '200000.00', '0.00', '200000.00', '8000.00', '8000.00', '0.00', '0.00', '0.00', '16000.00', '184000.00', '17000.00', '24000.00', '13920.00', '16660.00', '1999.20', '16660.00', '8340.00', '4000.00', '6000.00', '8000.00', '316579.20', '2025-09-29T04:04:58.319Z');

-- Constraints
ALTER TABLE payroll_details ADD CONSTRAINT payroll_details_pkey PRIMARY KEY (id);
ALTER TABLE payroll_details ADD CONSTRAINT payroll_details_payroll_period_id_personnel_id_key UNIQUE (payroll_period_id, personnel_id);
ALTER TABLE payroll_details ADD CONSTRAINT payroll_details_payroll_period_id_fkey FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id);
ALTER TABLE payroll_details ADD CONSTRAINT payroll_details_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES personnel(id);

-- Índices
CREATE INDEX idx_payroll_period ON public.payroll_details USING btree (payroll_period_id);


-- =====================================================
-- Tabla: payroll_events
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS payroll_events CASCADE;
CREATE TABLE payroll_events (id UUID DEFAULT gen_random_uuid() NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL, period_type VARCHAR(20) DEFAULT 'monthly'::character varying, cutoff_date DATE NOT NULL, process_date DATE NOT NULL, payment_date DATE NOT NULL, status VARCHAR(50) DEFAULT 'pending'::character varying, total_employees INTEGER DEFAULT 0, total_amount NUMERIC(15,2), notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Constraints
ALTER TABLE payroll_events ADD CONSTRAINT payroll_events_pkey PRIMARY KEY (id);
ALTER TABLE payroll_events ADD CONSTRAINT payroll_events_year_month_period_type_key UNIQUE (year, month, period_type);

-- Índices
CREATE INDEX idx_payroll_events_year_month ON public.payroll_events USING btree (year, month);
CREATE INDEX idx_payroll_events_status ON public.payroll_events USING btree (status);


-- =====================================================
-- Tabla: payroll_periods
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS payroll_periods CASCADE;
CREATE TABLE payroll_periods (id VARCHAR(50) NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL, period_type VARCHAR(20) DEFAULT 'monthly'::character varying, start_date DATE NOT NULL, end_date DATE NOT NULL, processed_at TIMESTAMP, status VARCHAR(20) DEFAULT 'draft'::character varying);

-- Datos (2 registros)
INSERT INTO payroll_periods ("id", "year", "month", "period_type", "start_date", "end_date", "processed_at", "status") VALUES ('period-202509', 2025, 9, 'monthly', '2025-09-01T05:00:00.000Z', '2025-09-30T05:00:00.000Z', '2025-09-28T10:15:11.804Z', 'completed');
INSERT INTO payroll_periods ("id", "year", "month", "period_type", "start_date", "end_date", "processed_at", "status") VALUES ('period-202508', 2025, 8, 'monthly', '2025-08-01T05:00:00.000Z', '2025-08-31T05:00:00.000Z', '2025-09-29T04:04:58.319Z', 'completed');

-- Constraints
ALTER TABLE payroll_periods ADD CONSTRAINT payroll_periods_pkey PRIMARY KEY (id);
ALTER TABLE payroll_periods ADD CONSTRAINT payroll_periods_year_month_period_type_key UNIQUE (year, month, period_type);


-- =====================================================
-- Tabla: personnel
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS personnel CASCADE;
CREATE TABLE personnel (id UUID DEFAULT gen_random_uuid() NOT NULL, name VARCHAR(255) NOT NULL, document_type VARCHAR(20) DEFAULT 'CC'::character varying, document_number VARCHAR(50) NOT NULL, phone VARCHAR(50), email VARCHAR(255), address TEXT, "position" VARCHAR(100) NOT NULL, department VARCHAR(100) NOT NULL, hire_date DATE NOT NULL, status VARCHAR(50) DEFAULT 'active'::character varying, salary_type VARCHAR(20) DEFAULT 'hourly'::character varying, hourly_rate NUMERIC(10,2), monthly_salary NUMERIC(15,2), arl_risk_class VARCHAR(5) DEFAULT 'V'::character varying, emergency_contact VARCHAR(255), emergency_phone VARCHAR(50), bank_account VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, salary_base NUMERIC(15,2), daily_rate NUMERIC(15,2), expected_arrival_time TIME WITHOUT TIME ZONE DEFAULT '07:00:00'::time without time zone, expected_departure_time TIME WITHOUT TIME ZONE DEFAULT '15:30:00'::time without time zone);

-- Datos (12 registros)
INSERT INTO personnel ("id", "name", "document_type", "document_number", "phone", "email", "address", "position", "department", "hire_date", "status", "salary_type", "hourly_rate", "monthly_salary", "arl_risk_class", "emergency_contact", "emergency_phone", "bank_account", "created_at", "updated_at", "salary_base", "daily_rate", "expected_arrival_time", "expected_departure_time") VALUES ('5c7905db-d36b-4fca-b1e4-22552415396e', 'QUIÑONES ARROYO DANY ALEJANDRO ', 'CC', '1130664803', '313 6072111', '', '', 'PINTOR ', 'construccion', '2025-09-26T05:00:00.000Z', 'active', 'monthly', NULL, '1425000.00', 'V', '', '', '205', '2025-09-26T20:12:41.634Z', '2025-09-26T20:55:55.053Z', '1425000.00', '90000.00', '07:00:00', '15:30:00');
INSERT INTO personnel ("id", "name", "document_type", "document_number", "phone", "email", "address", "position", "department", "hire_date", "status", "salary_type", "hourly_rate", "monthly_salary", "arl_risk_class", "emergency_contact", "emergency_phone", "bank_account", "created_at", "updated_at", "salary_base", "daily_rate", "expected_arrival_time", "expected_departure_time") VALUES ('7b315b15-43a7-4dc9-bc14-59d2f9ce6598', 'PEREZ VARGAS JOSE GERARDO ', 'PP', '6835561', '3126252210', '', '', 'operario', 'construccion', '2024-12-09T05:00:00.000Z', 'active', 'monthly', NULL, '1424000.00', 'V', '', '', '00000003126252210', '2025-09-26T19:11:11.337Z', '2025-09-26T20:57:04.464Z', '1424000.00', '76000.00', '07:00:00', '15:30:00');
INSERT INTO personnel ("id", "name", "document_type", "document_number", "phone", "email", "address", "position", "department", "hire_date", "status", "salary_type", "hourly_rate", "monthly_salary", "arl_risk_class", "emergency_contact", "emergency_phone", "bank_account", "created_at", "updated_at", "salary_base", "daily_rate", "expected_arrival_time", "expected_departure_time") VALUES ('7a757de1-bae3-4929-8bbd-33e5b7609194', ' HERNANDEZ COLMENAREZ BERNARDO ANTONIO ', 'PP', '4976648', '3128305606', 'bernardohernandez@gmail.com', 'CRA 8A # 20-32 ', 'operario', 'construccion', '2025-09-26T05:00:00.000Z', 'active', 'monthly', NULL, '1424000.00', 'V', 'ALEJANDRA ', '3226266289', '06200001662', '2025-09-26T19:00:51.439Z', '2025-09-26T21:06:41.660Z', '1424000.00', '120000.00', '07:30:00', '16:30:00');
INSERT INTO personnel ("id", "name", "document_type", "document_number", "phone", "email", "address", "position", "department", "hire_date", "status", "salary_type", "hourly_rate", "monthly_salary", "arl_risk_class", "emergency_contact", "emergency_phone", "bank_account", "created_at", "updated_at", "salary_base", "daily_rate", "expected_arrival_time", "expected_departure_time") VALUES ('be857298-7157-4b58-8f7e-e851e871ad10', 'ARROYO LEMUS HUGO FERLEY ', 'CC', '14465180', '3116677422', '', '', 'SUB GERENTE ', 'administracion', '2020-01-20T05:00:00.000Z', 'active', 'monthly', NULL, '1800000.00', 'V', 'SONIA ROJAS ', '', '', '2025-09-26T20:27:28.892Z', '2025-09-26T21:09:17.213Z', '1800000.00', '125000.00', '07:30:00', '16:30:00');
INSERT INTO personnel ("id", "name", "document_type", "document_number", "phone", "email", "address", "position", "department", "hire_date", "status", "salary_type", "hourly_rate", "monthly_salary", "arl_risk_class", "emergency_contact", "emergency_phone", "bank_account", "created_at", "updated_at", "salary_base", "daily_rate", "expected_arrival_time", "expected_departure_time") VALUES ('dd1cecf4-9f02-4230-977a-d036bb118bbe', 'RAMOS JOSE VINDAR ', 'CC', '14605813', '3178565572', 'josedeivi4@outlook.com', '', 'GERENTE ', 'administracion', '2020-01-20T05:00:00.000Z', 'active', 'monthly', NULL, '1800000.00', 'V', 'SHIRLEY LOPEZ IDROBO ', '3187229548', '', '2025-09-26T20:26:10.666Z', '2025-09-26T21:11:29.223Z', '1800000.00', '125000.00', '07:30:00', '16:30:00');
INSERT INTO personnel ("id", "name", "document_type", "document_number", "phone", "email", "address", "position", "department", "hire_date", "status", "salary_type", "hourly_rate", "monthly_salary", "arl_risk_class", "emergency_contact", "emergency_phone", "bank_account", "created_at", "updated_at", "salary_base", "daily_rate", "expected_arrival_time", "expected_departure_time") VALUES ('946881e6-d142-4c9d-8721-b4cefbf65f5c', 'SALGADO LAGAREJO IVETH KATHERINE ', 'CC', '31488013', '3154978948', 'ivethk.68@gmail.com', 'CRA 40 52A29', 'ASISTENTE ADMINISTRATIVA ', 'administracion', '2024-11-22T05:00:00.000Z', 'active', 'monthly', NULL, '1424000.00', 'I', 'ISABELLA IBAÑEZ ', '3107051413', '74970190485', '2025-09-26T20:22:12.314Z', '2025-09-26T20:22:12.314Z', '1424000.00', '59333.33', '07:00:00', '15:30:00');
INSERT INTO personnel ("id", "name", "document_type", "document_number", "phone", "email", "address", "position", "department", "hire_date", "status", "salary_type", "hourly_rate", "monthly_salary", "arl_risk_class", "emergency_contact", "emergency_phone", "bank_account", "created_at", "updated_at", "salary_base", "daily_rate", "expected_arrival_time", "expected_departure_time") VALUES ('469b4596-71b6-4c8a-bd6a-8097b561dff4', 'REINA JHON JAIRO ', 'CC', '6324558', '3147630956', '', '', 'operario', 'construccion', '2025-09-26T05:00:00.000Z', 'active', 'monthly', NULL, '1424000.00', 'V', '', '', '74158858162', '2025-09-26T19:14:43.695Z', '2025-09-26T20:38:21.559Z', '1424000.00', '59333.33', '07:00:00', '15:30:00');
INSERT INTO personnel ("id", "name", "document_type", "document_number", "phone", "email", "address", "position", "department", "hire_date", "status", "salary_type", "hourly_rate", "monthly_salary", "arl_risk_class", "emergency_contact", "emergency_phone", "bank_account", "created_at", "updated_at", "salary_base", "daily_rate", "expected_arrival_time", "expected_departure_time") VALUES ('8a733736-9e03-497c-b613-cd1f0f67c2bd', 'VALENCIA ARRECHEA ANDRES MAURICIO ', 'CC', '1144169220', '3011362067', 'marcosvalenciamontoya@gmail.co', 'CARRERA 1G 71 – 91 ', 'operario', 'construccion', '2025-09-15T05:00:00.000Z', 'active', 'monthly', NULL, '1424000.00', 'V', '', '', '3011362067', '2025-09-26T19:25:55.968Z', '2025-09-26T20:39:18.363Z', '1424000.00', '59333.33', '07:00:00', '15:30:00');
INSERT INTO personnel ("id", "name", "document_type", "document_number", "phone", "email", "address", "position", "department", "hire_date", "status", "salary_type", "hourly_rate", "monthly_salary", "arl_risk_class", "emergency_contact", "emergency_phone", "bank_account", "created_at", "updated_at", "salary_base", "daily_rate", "expected_arrival_time", "expected_departure_time") VALUES ('c562491c-246c-491e-833c-a08237a0e384', ' BONILLA ANGULO JOHAN SEBASTIAN', 'CC', '1005985437', '305 4204234', '', '', 'operario', 'construccion', '2024-11-26T05:00:00.000Z', 'active', 'monthly', NULL, '1424000.00', 'V', '', '', '74124243517', '2025-09-26T18:49:18.855Z', '2025-09-26T21:05:59.287Z', '1424000.00', '80000.00', '07:30:00', '16:30:00');
INSERT INTO personnel ("id", "name", "document_type", "document_number", "phone", "email", "address", "position", "department", "hire_date", "status", "salary_type", "hourly_rate", "monthly_salary", "arl_risk_class", "emergency_contact", "emergency_phone", "bank_account", "created_at", "updated_at", "salary_base", "daily_rate", "expected_arrival_time", "expected_departure_time") VALUES ('79f54a60-7f96-4f5e-94f8-33936caed96c', 'ALARCON LLANOS JAIDER', 'CC', '1144185672', '3229054378', 'alarconllanosjaider@gmail.com', 'cl 33B # 38-89', 'operario', 'construccion', '2025-09-08T05:00:00.000Z', 'active', 'monthly', NULL, '1424000.00', 'V', 'CAROLINA ', '3187483386', '91242298166', '2025-09-26T18:57:11.717Z', '2025-09-26T21:07:20.594Z', '1424000.00', '130000.00', '07:30:00', '16:30:00');
INSERT INTO personnel ("id", "name", "document_type", "document_number", "phone", "email", "address", "position", "department", "hire_date", "status", "salary_type", "hourly_rate", "monthly_salary", "arl_risk_class", "emergency_contact", "emergency_phone", "bank_account", "created_at", "updated_at", "salary_base", "daily_rate", "expected_arrival_time", "expected_departure_time") VALUES ('caf9732a-8cd0-4cf0-b433-b38319a15f08', 'ANGULO ORTIZ GUSTAVO ADOLFO ', 'CC', '1143926942', '3206972496', 'gustavoangulo1990@gmail.com', '', 'operario', 'construccion', '2025-09-26T05:00:00.000Z', 'active', 'monthly', NULL, '1424000.00', 'V', 'FLOR ORTÍZ ', '3108443356', '74158817849', '2025-09-26T17:54:28.488Z', '2025-09-26T21:08:23.685Z', '1424000.00', '80000.00', '07:30:00', '16:30:00');
INSERT INTO personnel ("id", "name", "document_type", "document_number", "phone", "email", "address", "position", "department", "hire_date", "status", "salary_type", "hourly_rate", "monthly_salary", "arl_risk_class", "emergency_contact", "emergency_phone", "bank_account", "created_at", "updated_at", "salary_base", "daily_rate", "expected_arrival_time", "expected_departure_time") VALUES ('4ee954c6-dc6d-4ce8-a7fe-b721b84aeec9', 'CAMACHO MICOLTA JOSE RAÚL ', 'CC', '1107084364', '3155665791', 'joseraulcamacho76@gmail.com', '', 'AYUDANTE PRÁCTICO ', 'construccion', '2025-09-26T05:00:00.000Z', 'active', 'monthly', NULL, '1424000.00', 'V', 'YOMIRA ANGULO ', '317 5503584', '20582111414', '2025-09-26T19:50:46.768Z', '2025-09-26T21:10:42.187Z', '1424000.00', '80000.00', '07:30:00', '16:30:00');

-- Constraints
ALTER TABLE personnel ADD CONSTRAINT personnel_pkey PRIMARY KEY (id);
ALTER TABLE personnel ADD CONSTRAINT personnel_document_number_key UNIQUE (document_number);

-- Índices
CREATE INDEX idx_personnel_status ON public.personnel USING btree (status);


-- =====================================================
-- Tabla: pila_submissions
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS pila_submissions CASCADE;
CREATE TABLE pila_submissions (id UUID DEFAULT gen_random_uuid() NOT NULL, period VARCHAR(7) NOT NULL, employees_count INTEGER NOT NULL, total_contributions NUMERIC(15,2) NOT NULL, file_path TEXT, csv_content TEXT, status VARCHAR(50) DEFAULT 'GENERADO'::character varying, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Constraints
ALTER TABLE pila_submissions ADD CONSTRAINT pila_submissions_pkey PRIMARY KEY (id);
ALTER TABLE pila_submissions ADD CONSTRAINT pila_submissions_period_key UNIQUE (period);


-- =====================================================
-- Tabla: project_assignments
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS project_assignments CASCADE;
CREATE TABLE project_assignments (id UUID DEFAULT gen_random_uuid() NOT NULL, personnel_id UUID NOT NULL, project_id UUID NOT NULL, assigned_date DATE DEFAULT CURRENT_DATE NOT NULL, start_date DATE NOT NULL, end_date DATE, role VARCHAR(100), expected_hours_per_day NUMERIC(4,2) DEFAULT 8.0, is_primary_project BOOLEAN DEFAULT false, priority INTEGER DEFAULT 1, status VARCHAR(50) DEFAULT 'active'::character varying, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, created_by VARCHAR(255));

-- Datos (3 registros)
INSERT INTO project_assignments ("id", "personnel_id", "project_id", "assigned_date", "start_date", "end_date", "role", "expected_hours_per_day", "is_primary_project", "priority", "status", "notes", "created_at", "updated_at", "created_by") VALUES ('e7dafc30-37a5-4e35-9ef1-cd9ec2c5f6fb', '483ef843-0057-4950-96ec-68637445d8d3', '2848b427-d40b-45b1-ad29-6b6ce6813071', '2025-09-08T05:00:00.000Z', '2025-09-08T05:00:00.000Z', NULL, 'Operario', '7.00', FALSE, 1, 'active', 'Asignado via API personnel - Operario', '2025-09-09T01:57:12.070Z', '2025-09-09T01:57:12.070Z', 'api_personnel');
INSERT INTO project_assignments ("id", "personnel_id", "project_id", "assigned_date", "start_date", "end_date", "role", "expected_hours_per_day", "is_primary_project", "priority", "status", "notes", "created_at", "updated_at", "created_by") VALUES ('8e79ae6b-352b-47e0-b2be-8dd387a26716', '483ef843-0057-4950-96ec-68637445d8d3', 'b46c33d2-df91-4cc6-962d-f14694fa32fd', '2025-09-10T05:00:00.000Z', '2025-09-03T05:00:00.000Z', NULL, 'soldador', '8.00', FALSE, 1, 'active', 'Asignación automática para Jaider alarcon', '2025-09-10T17:55:51.212Z', '2025-09-10T17:55:51.212Z', 'sistema_test');
INSERT INTO project_assignments ("id", "personnel_id", "project_id", "assigned_date", "start_date", "end_date", "role", "expected_hours_per_day", "is_primary_project", "priority", "status", "notes", "created_at", "updated_at", "created_by") VALUES ('adbb22ed-0a02-41bd-aa50-524645515cbf', 'c3c885d7-188d-48b7-bd2b-99f8b51b5516', 'b46c33d2-df91-4cc6-962d-f14694fa32fd', '2025-09-10T05:00:00.000Z', '2025-09-03T05:00:00.000Z', NULL, 'operario', '8.00', FALSE, 1, 'active', 'Asignación automática para Santiago Hurtado Lopez', '2025-09-10T17:55:51.289Z', '2025-09-10T17:55:51.289Z', 'sistema_test');

-- Constraints
ALTER TABLE project_assignments ADD CONSTRAINT project_assignments_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE;
ALTER TABLE project_assignments ADD CONSTRAINT project_assignments_personnel_id_project_id_start_date_key UNIQUE (personnel_id, project_id, start_date);
ALTER TABLE project_assignments ADD CONSTRAINT project_assignments_pkey PRIMARY KEY (id);
ALTER TABLE project_assignments ADD CONSTRAINT project_assignments_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Índices
CREATE INDEX idx_project_assignments_personnel ON public.project_assignments USING btree (personnel_id);
CREATE INDEX idx_project_assignments_project ON public.project_assignments USING btree (project_id);
CREATE INDEX idx_project_assignments_status ON public.project_assignments USING btree (status);
CREATE INDEX idx_project_assignments_dates ON public.project_assignments USING btree (start_date, end_date);
CREATE INDEX idx_project_assignments_active ON public.project_assignments USING btree (personnel_id, project_id) WHERE ((status)::text = 'active'::text);


-- =====================================================
-- Tabla: project_events
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS project_events CASCADE;
CREATE TABLE project_events (id UUID DEFAULT gen_random_uuid() NOT NULL, project_id UUID NOT NULL, title VARCHAR(255) NOT NULL, description TEXT, event_date DATE NOT NULL, type VARCHAR(50), status VARCHAR(50) DEFAULT 'pending'::character varying, priority VARCHAR(20) DEFAULT 'medium'::character varying, progress_percentage INTEGER, notes TEXT, calendar_event_id UUID, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Constraints
ALTER TABLE project_events ADD CONSTRAINT project_events_calendar_event_id_fkey FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(id);
ALTER TABLE project_events ADD CONSTRAINT project_events_pkey PRIMARY KEY (id);
ALTER TABLE project_events ADD CONSTRAINT project_events_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);

-- Índices
CREATE INDEX idx_project_events_project ON public.project_events USING btree (project_id);
CREATE INDEX idx_project_events_date ON public.project_events USING btree (event_date);
CREATE INDEX idx_project_events_type ON public.project_events USING btree (type);


-- =====================================================
-- Tabla: project_incomes
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS project_incomes CASCADE;
CREATE TABLE project_incomes (id UUID DEFAULT gen_random_uuid() NOT NULL, project_id UUID, amount NUMERIC(15,2) NOT NULL, date DATE NOT NULL, concept VARCHAR(255) NOT NULL, payment_method VARCHAR(50) DEFAULT 'transfer'::character varying, invoice_number VARCHAR(100), notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, created_by VARCHAR(100) DEFAULT 'system'::character varying);

-- Constraints
ALTER TABLE project_incomes ADD CONSTRAINT project_incomes_pkey PRIMARY KEY (id);
ALTER TABLE project_incomes ADD CONSTRAINT project_incomes_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Índices
CREATE INDEX idx_project_incomes_project ON public.project_incomes USING btree (project_id);
CREATE INDEX idx_project_incomes_date ON public.project_incomes USING btree (date);
CREATE INDEX idx_project_incomes_concept ON public.project_incomes USING btree (concept);


-- =====================================================
-- Tabla: projects
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS projects CASCADE;
CREATE TABLE projects (id UUID DEFAULT gen_random_uuid() NOT NULL, name VARCHAR(255) NOT NULL, client_id UUID, description TEXT, budget_materials NUMERIC(15,2) DEFAULT 0, budget_labor NUMERIC(15,2) DEFAULT 0, budget_equipment NUMERIC(15,2) DEFAULT 0, budget_overhead NUMERIC(15,2) DEFAULT 0, budget_total NUMERIC(15,2) DEFAULT 0, spent_materials NUMERIC(15,2) DEFAULT 0, spent_labor NUMERIC(15,2) DEFAULT 0, spent_equipment NUMERIC(15,2) DEFAULT 0, spent_overhead NUMERIC(15,2) DEFAULT 0, spent_total NUMERIC(15,2) DEFAULT 0, start_date DATE, end_date DATE, estimated_end_date DATE, status VARCHAR(50) DEFAULT 'planned'::character varying, progress INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, total_income NUMERIC(15,2) DEFAULT 0, expected_income NUMERIC(15,2) DEFAULT 0);

-- Datos (1 registros)
INSERT INTO projects ("id", "name", "client_id", "description", "budget_materials", "budget_labor", "budget_equipment", "budget_overhead", "budget_total", "spent_materials", "spent_labor", "spent_equipment", "spent_overhead", "spent_total", "start_date", "end_date", "estimated_end_date", "status", "progress", "created_at", "updated_at", "total_income", "expected_income") VALUES ('0013fb18-1db7-4ed3-80a2-2bec282d2b9d', 'Prueba Proyecto', 'cdb68ad9-25d2-44d9-aa7a-6a293839f130', NULL, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, 'planned', 0, '2025-09-27T05:46:51.956Z', '2025-09-27T05:46:51.956Z', '0.00', '0.00');

-- Constraints
ALTER TABLE projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
ALTER TABLE projects ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id);

-- Índices
CREATE INDEX idx_projects_status ON public.projects USING btree (status);


-- =====================================================
-- Tabla: settings
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS settings CASCADE;
CREATE TABLE settings (id INTEGER DEFAULT nextval('settings_id_seq'::regclass) NOT NULL, key VARCHAR(100) NOT NULL, value JSONB NOT NULL, category VARCHAR(50) DEFAULT 'general'::character varying, description TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);

-- Datos (7 registros)
INSERT INTO settings ("id", "key", "value", "category", "description", "created_at", "updated_at") VALUES (2, 'dian_settings', '[object Object]', 'compliance', 'Configuraciones DIAN para facturación electrónica', '2025-09-10T17:26:00.116Z', '2025-09-10T17:26:00.116Z');
INSERT INTO settings ("id", "key", "value", "category", "description", "created_at", "updated_at") VALUES (5, 'notification_settings', '[object Object]', 'notifications', 'Configuraciones de notificaciones', '2025-09-10T17:26:00.142Z', '2025-09-10T17:50:23.274Z');
INSERT INTO settings ("id", "key", "value", "category", "description", "created_at", "updated_at") VALUES (4, 'app_preferences', '[object Object]', 'general', 'Preferencias generales de la aplicación', '2025-09-10T17:26:00.131Z', '2025-09-10T17:50:32.218Z');
INSERT INTO settings ("id", "key", "value", "category", "description", "created_at", "updated_at") VALUES (3, 'theme_settings', '[object Object]', 'ui', 'Configuraciones de tema y interfaz', '2025-09-10T17:26:00.125Z', '2025-09-10T17:50:38.828Z');
INSERT INTO settings ("id", "key", "value", "category", "description", "created_at", "updated_at") VALUES (6, 'payroll_settings', '[object Object]', 'payroll', 'Configuraciones de nómina colombiana', '2025-09-10T17:26:00.148Z', '2025-09-26T20:54:24.155Z');
INSERT INTO settings ("id", "key", "value", "category", "description", "created_at", "updated_at") VALUES (8, 'business_hours', '[object Object]', 'business_profile', 'Horarios estándar de trabajo de la empresa', '2025-09-26T20:54:24.155Z', '2025-09-26T20:54:24.155Z');
INSERT INTO settings ("id", "key", "value", "category", "description", "created_at", "updated_at") VALUES (1, 'business_profile', '[object Object]', 'company', 'Información del perfil empresarial', '2025-09-10T17:26:00.074Z', '2025-09-29T04:53:46.318Z');

-- Constraints
ALTER TABLE settings ADD CONSTRAINT settings_pkey PRIMARY KEY (id);
ALTER TABLE settings ADD CONSTRAINT settings_key_key UNIQUE (key);

-- Índices
CREATE INDEX idx_settings_category ON public.settings USING btree (category);
CREATE INDEX idx_settings_key ON public.settings USING btree (key);


-- =====================================================
-- Tabla: tax_tables
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS tax_tables CASCADE;
CREATE TABLE tax_tables (year INTEGER NOT NULL, uvt_value NUMERIC(12,2) DEFAULT 47065.00 NOT NULL, vat_rates JSONB DEFAULT '{"0": {"rate": 0.00, "description": "Exento/Excluido"}, "5": {"rate": 0.05, "description": "Productos básicos"}, "19": {"rate": 0.19, "description": "General"}}'::jsonb NOT NULL, ica JSONB DEFAULT '{"Cali": {"CONSTRUCCION": {"code": "4100", "rate": 0.01104}}, "Bogota": {"SOLDADURA": {"code": "2592", "rate": 0.00966}, "CONSTRUCCION": {"code": "4100", "rate": 0.00966}}, "Medellin": {"CONSTRUCCION": {"code": "4100", "rate": 0.007}}}'::jsonb NOT NULL, withholding_tax JSONB DEFAULT '{"services": {"general": 0.11, "construction": 0.02}, "employment": {"0-95": 0.00, "360+": 0.33, "95-150": 0.19, "150-360": 0.28}}'::jsonb NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Constraints
ALTER TABLE tax_tables ADD CONSTRAINT tax_tables_pkey PRIMARY KEY (year);


-- =====================================================
-- Tabla: time_entries
-- =====================================================

-- Estructura
DROP TABLE IF EXISTS time_entries CASCADE;
CREATE TABLE time_entries (id UUID DEFAULT gen_random_uuid() NOT NULL, personnel_id UUID NOT NULL, project_id UUID, work_date DATE NOT NULL, hours_worked NUMERIC(4,2) NOT NULL, overtime_hours NUMERIC(4,2) DEFAULT 0, description TEXT, hourly_rate NUMERIC(10,2) NOT NULL, regular_pay NUMERIC(15,2) NOT NULL, overtime_pay NUMERIC(15,2) DEFAULT 0, total_pay NUMERIC(15,2) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, status VARCHAR(20) DEFAULT 'draft'::character varying, approver_notes TEXT, payroll_period_id UUID, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, arrival_time TIME WITHOUT TIME ZONE, departure_time TIME WITHOUT TIME ZONE, expected_arrival_time TIME WITHOUT TIME ZONE, late_minutes INTEGER DEFAULT 0, early_departure_minutes INTEGER DEFAULT 0, effective_hours_worked NUMERIC(4,2), night_hours NUMERIC(4,2) DEFAULT 0, night_pay NUMERIC(15,2) DEFAULT 0, lunch_deducted BOOLEAN DEFAULT true NOT NULL);

-- Datos (5 registros)
INSERT INTO time_entries ("id", "personnel_id", "project_id", "work_date", "hours_worked", "overtime_hours", "description", "hourly_rate", "regular_pay", "overtime_pay", "total_pay", "created_at", "status", "approver_notes", "payroll_period_id", "updated_at", "arrival_time", "departure_time", "expected_arrival_time", "late_minutes", "early_departure_minutes", "effective_hours_worked", "night_hours", "night_pay", "lunch_deducted") VALUES ('d193ded5-0358-4416-809f-84448a65c0ed', 'caf9732a-8cd0-4cf0-b433-b38319a15f08', NULL, '2025-08-21T05:00:00.000Z', '8.00', '0.70', '', '10958.90', '87671.20', '9589.04', '97260.24', '2025-09-29T03:42:12.364Z', 'payroll_locked', NULL, NULL, '2025-09-29T04:04:58.319Z', NULL, NULL, NULL, 0, 0, NULL, '5.00', '0.00', TRUE);
INSERT INTO time_entries ("id", "personnel_id", "project_id", "work_date", "hours_worked", "overtime_hours", "description", "hourly_rate", "regular_pay", "overtime_pay", "total_pay", "created_at", "status", "approver_notes", "payroll_period_id", "updated_at", "arrival_time", "departure_time", "expected_arrival_time", "late_minutes", "early_departure_minutes", "effective_hours_worked", "night_hours", "night_pay", "lunch_deducted") VALUES ('66a54016-acad-4a0c-a4fd-5b5353d335b0', 'dd1cecf4-9f02-4230-977a-d036bb118bbe', '0013fb18-1db7-4ed3-80a2-2bec282d2b9d', '2025-09-28T05:00:00.000Z', '7.30', '0.48', '', '17123.29', '125000.02', '10273.97', '135273.99', '2025-09-28T10:02:34.407Z', 'payroll_locked', NULL, NULL, '2025-09-28T10:15:11.804Z', '07:30:00', '16:17:00', '07:30:00', 0, 0, '7.78', '0.00', '0.00', TRUE);
INSERT INTO time_entries ("id", "personnel_id", "project_id", "work_date", "hours_worked", "overtime_hours", "description", "hourly_rate", "regular_pay", "overtime_pay", "total_pay", "created_at", "status", "approver_notes", "payroll_period_id", "updated_at", "arrival_time", "departure_time", "expected_arrival_time", "late_minutes", "early_departure_minutes", "effective_hours_worked", "night_hours", "night_pay", "lunch_deducted") VALUES ('08238eb3-1689-4916-a67f-b403a28ea8c5', 'caf9732a-8cd0-4cf0-b433-b38319a15f08', '0013fb18-1db7-4ed3-80a2-2bec282d2b9d', '2025-08-19T05:00:00.000Z', '7.30', '0.70', '', '10958.90', '79999.97', '9589.04', '89589.01', '2025-09-28T23:53:58.332Z', 'payroll_locked', NULL, NULL, '2025-09-29T04:04:58.319Z', '07:30:00', '16:30:00', '07:30:00', 0, 0, '8.00', '0.00', '0.00', TRUE);
INSERT INTO time_entries ("id", "personnel_id", "project_id", "work_date", "hours_worked", "overtime_hours", "description", "hourly_rate", "regular_pay", "overtime_pay", "total_pay", "created_at", "status", "approver_notes", "payroll_period_id", "updated_at", "arrival_time", "departure_time", "expected_arrival_time", "late_minutes", "early_departure_minutes", "effective_hours_worked", "night_hours", "night_pay", "lunch_deducted") VALUES ('5f9054e4-d1fe-4048-a8f0-f34105839898', 'caf9732a-8cd0-4cf0-b433-b38319a15f08', '0013fb18-1db7-4ed3-80a2-2bec282d2b9d', '2025-08-16T05:00:00.000Z', '4.00', '0.00', '', '10958.90', '43835.60', '0.00', '43835.60', '2025-09-28T23:50:01.129Z', 'payroll_locked', NULL, NULL, '2025-09-29T04:04:58.319Z', '07:30:00', '12:30:00', '07:30:00', 0, 0, '4.00', '0.00', '0.00', TRUE);
INSERT INTO time_entries ("id", "personnel_id", "project_id", "work_date", "hours_worked", "overtime_hours", "description", "hourly_rate", "regular_pay", "overtime_pay", "total_pay", "created_at", "status", "approver_notes", "payroll_period_id", "updated_at", "arrival_time", "departure_time", "expected_arrival_time", "late_minutes", "early_departure_minutes", "effective_hours_worked", "night_hours", "night_pay", "lunch_deducted") VALUES ('73f66972-61ff-4d9d-928b-713d2496f21d', 'caf9732a-8cd0-4cf0-b433-b38319a15f08', '0013fb18-1db7-4ed3-80a2-2bec282d2b9d', '2025-08-20T05:00:00.000Z', '4.50', '0.00', '', '10958.90', '49315.05', '0.00', '49315.05', '2025-09-28T23:56:17.751Z', 'payroll_locked', NULL, NULL, '2025-09-29T04:04:58.319Z', '07:30:00', '13:00:00', '07:30:00', 0, 0, '4.50', '0.00', '0.00', TRUE);

-- Constraints
ALTER TABLE time_entries ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);
ALTER TABLE time_entries ADD CONSTRAINT time_entries_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES personnel(id);
ALTER TABLE time_entries ADD CONSTRAINT time_entries_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);

-- Índices
CREATE INDEX idx_time_entries_project_date ON public.time_entries USING btree (project_id, work_date);
CREATE INDEX idx_time_entries_personnel_date ON public.time_entries USING btree (personnel_id, work_date);
CREATE INDEX idx_time_entries_personnel ON public.time_entries USING btree (personnel_id);
CREATE INDEX idx_time_entries_project ON public.time_entries USING btree (project_id);
CREATE INDEX idx_time_entries_status ON public.time_entries USING btree (status);
CREATE INDEX idx_time_entries_work_date ON public.time_entries USING btree (work_date);
CREATE INDEX idx_time_entries_payroll_period ON public.time_entries USING btree (payroll_period_id);
CREATE UNIQUE INDEX idx_time_entries_unique_with_null_project ON public.time_entries USING btree (personnel_id, work_date) WHERE (project_id IS NULL);
CREATE UNIQUE INDEX idx_time_entries_unique_with_project ON public.time_entries USING btree (personnel_id, project_id, work_date) WHERE (project_id IS NOT NULL);


-- =====================================================
-- Secuencias
-- =====================================================

SELECT setval('annual_payroll_settings_id_seq', 1, true);
SELECT setval('settings_id_seq', 8, true);
