export type Locale = 'es' | 'en';

export const translations = {
  es: {
    // Navigation
    nav: {
      dashboard: 'Panel Principal',
      projects: 'Proyectos',
      clients: 'Clientes',
      personnel: 'Personal',
      payroll: 'Nómina',
      expenses: 'Gastos',
      simulator: 'Simulador de Costos',
      calendar: 'Calendario',
      reports: 'Reportes',
      // Compliance Section
      compliance: 'Cumplimiento',
      invoicing: 'Facturación',
      payroll_electronic: 'Nómina Electrónica',
      pila: 'PILA',
      contractors: 'Contratistas',
      // Settings
      settings: 'Configuración',
    },
    
    // Quick Actions
    quickActions: {
      title: 'Acciones Rápidas',
      newProject: 'Nuevo Proyecto',
      addEmployee: 'Agregar Empleado',
      logExpense: 'Registrar Gasto',
      createEstimate: 'Crear Cotización',
    },
    
    // Dashboard
    dashboard: {
      title: 'Panel Principal',
      kpis: {
        activeProjects: 'Proyectos Activos',
        monthlyRevenue: 'Ingresos del Mes',
        monthlyCosts: 'Costos del Mes',
        forecastedProfit: 'Ganancia Proyectada',
      },
      topProjects: 'Proyectos Principales',
      cashflow: 'Flujo de Caja Mensual',
      revenue: 'Ingresos',
      costs: 'Costos',
      profit: 'Ganancia',
    },
    
    // Projects
    projects: {
      title: 'Gestión de Proyectos',
      newProject: 'Nuevo Proyecto',
      editProject: 'Editar Proyecto',
      projectDetails: 'Detalles del Proyecto',
      name: 'Nombre',
      client: 'Cliente',
      status: 'Estado',
      budget: 'Presupuesto',
      spent: 'Gastado',
      progress: 'Progreso',
      startDate: 'Fecha Inicio',
      endDate: 'Fecha Fin',
      description: 'Descripción',
      actions: 'Acciones',
      
      tabs: {
        overview: 'Resumen',
        budget: 'Presupuesto',
        expenses: 'Gastos',
        documents: 'Documentos',
      },
    },
    
    // Clients
    clients: {
      title: 'Gestión de Clientes',
      newClient: 'Nuevo Cliente',
      editClient: 'Editar Cliente',
      clientDetails: 'Detalles del Cliente',
      name: 'Nombre de la Empresa',
      contactName: 'Nombre del Contacto',
      phone: 'Teléfono',
      email: 'Correo Electrónico',
      address: 'Dirección',
      actions: 'Acciones',
      totalClients: 'Total Clientes',
      activeClients: 'Clientes Activos',
      totalProjects: 'Total Proyectos',
      activeProjects: 'Proyectos Activos',
      completedProjects: 'Proyectos Completados',
      totalRevenue: 'Ingresos Totales',
      averageProjectValue: 'Valor Promedio por Proyecto',
      projects: 'Proyectos',
      statistics: 'Estadísticas',
      noProjects: 'Sin proyectos asignados',
      deleteConfirmation: '¿Estás seguro de que deseas eliminar este cliente?',
      deleteError: 'No se puede eliminar el cliente porque tiene proyectos asociados',
      searchPlaceholder: 'Buscar clientes...',
    },
    
    // Personnel
    personnel: {
      title: 'Gestión de Personal',
      newEmployee: 'Nuevo Empleado',
      editEmployee: 'Editar Empleado',
      employeeDetails: 'Detalles del Empleado',
      name: 'Nombre',
      position: 'Cargo',
      department: 'Departamento',
      status: 'Estado',
      phone: 'Teléfono',
      email: 'Correo',
      address: 'Dirección',
      hireDate: 'Fecha de Contratación',
      hourlyRate: 'Tarifa por Hora',
      baseSalary: 'Salario Base',
      overtimeRate: 'Tarifa de Horas Extra',
      currentProject: 'Proyecto Actual',
      assignedSince: 'Asignado desde',
      emergencyContact: 'Contacto de Emergencia',
      emergencyPhone: 'Teléfono de Emergencia',
      certifications: 'Certificaciones',
      specializations: 'Especializaciones',
      equipmentLicenses: 'Licencias de Equipos',
      notes: 'Notas',
      actions: 'Acciones',
      assign: 'Asignar',
      unassign: 'Desasignar',
      available: 'Disponible',
      totalEmployees: 'Total Empleados',
      activeEmployees: 'Empleados Activos',
      assignedEmployees: 'Empleados Asignados',
      tabs: {
        basicInfo: 'Información Básica',
        employment: 'Empleo',
        financial: 'Información Financiera',
        skills: 'Habilidades',
      },
      filters: {
        allDepartments: 'Todos los Departamentos',
        allStatuses: 'Todos los Estados',
        allPositions: 'Todos los Cargos',
        available: 'Disponibles',
        assigned: 'Asignados',
      },
    },
    
    // Expenses
    expenses: {
      title: 'Gestión de Gastos',
      addExpense: 'Agregar Gasto',
      date: 'Fecha',
      project: 'Proyecto',
      category: 'Categoría',
      vendor: 'Proveedor',
      amount: 'Monto',
      description: 'Descripción',
      filters: 'Filtros',
      allProjects: 'Todos los Proyectos',
      allCategories: 'Todas las Categorías',
    },
    
    // Reports
    reports: {
      title: 'Reportes Financieros',
      dateRange: 'Rango de Fechas',
      lastMonth: 'Último Mes',
      last3Months: '3 Meses',
      last6Months: '6 Meses',
      lastYear: 'Último Año',
      allTime: 'Todo el Tiempo',
      totalRevenue: 'Ingresos Totales',
      totalExpenses: 'Gastos Totales',
      totalProfit: 'Ganancia Total',
      expenseBreakdown: 'Desglose de Gastos',
      revenueVsCosts: 'Ingresos vs Costos',
      profitEvolution: 'Evolución de Ganancias',
      expenseDistribution: 'Distribución de Gastos',
    },
    
    // Cost Simulator
    simulator: {
      title: 'Simulador de Costos',
      newEstimate: 'Nueva Cotización',
      editEstimate: 'Editar Cotización',
      estimates: 'Cotizaciones',
      templates: 'Plantillas',
      templateName: 'Nombre de Plantilla',
      estimateName: 'Nombre de Cotización',
      client: 'Cliente',
      selectTemplate: 'Seleccionar Plantilla',
      selectClient: 'Seleccionar Cliente',
      profitMargin: 'Margen de Ganancia',
      subtotal: 'Subtotal',
      total: 'Total',
      item: 'Ítem',
      quantity: 'Cantidad',
      unitCost: 'Costo Unitario',
      unit: 'Unidad',
      itemTotal: 'Total Ítem',
      addItem: 'Agregar Ítem',
      removeItem: 'Eliminar Ítem',
      createEstimate: 'Crear Cotización',
      updateEstimate: 'Actualizar Cotización',
      deleteEstimate: 'Eliminar Cotización',
      convertToProject: 'Convertir a Proyecto',
      duplicateEstimate: 'Duplicar Cotización',
      exportToPDF: 'Exportar a PDF',
      noEstimates: 'No hay cotizaciones creadas',
      noTemplates: 'No hay plantillas disponibles',
      estimateCreated: 'Cotización creada exitosamente',
      estimateUpdated: 'Cotización actualizada exitosamente',
      estimateDeleted: 'Cotización eliminada exitosamente',
      categories: {
        structural_welding: 'Soldadura Estructural',
        residential_construction: 'Construcción Residencial',
        industrial_repair: 'Reparación Industrial',
        custom_fabrication: 'Fabricación Personalizada',
      },
      itemTypes: {
        material: 'Material',
        labor: 'Mano de Obra',
        equipment: 'Equipo',
        overhead: 'Gastos Generales',
      },
    },
    
    // Settings
    settings: {
      title: 'Configuración',
      businessProfile: 'Perfil de Empresa',
      companyName: 'Nombre de la Empresa',
      contactPerson: 'Persona de Contacto',
      email: 'Correo Electrónico',
      phone: 'Teléfono',
      address: 'Dirección',
      currency: 'Moneda',
      theme: 'Tema',
      language: 'Idioma',
      lightMode: 'Modo Claro',
      darkMode: 'Modo Oscuro',
      spanish: 'Español',
      english: 'English',
    },
    
    // Common
    common: {
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      view: 'Ver',
      search: 'Buscar',
      filter: 'Filtrar',
      clear: 'Limpiar',
      close: 'Cerrar',
      loading: 'Cargando...',
      noData: 'No hay datos disponibles',
      success: 'Operación exitosa',
      error: 'Error en la operación',
    },
    
    // Categories
    categories: {
      materials: 'Materiales',
      labor: 'Mano de Obra',
      equipment: 'Equipos',
      misc: 'Varios',
    },
    
    // Status
    status: {
      planned: 'Planificado',
      in_progress: 'En Progreso',
      completed: 'Completado',
    },

    // Personnel Status
    personnelStatus: {
      active: 'Activo',
      on_leave: 'Con Permiso',
      inactive: 'Inactivo',
      terminated: 'Terminado',
    },

    // Personnel Departments
    departments: {
      construction: 'Construcción',
      welding: 'Soldadura',
      administration: 'Administración',
      maintenance: 'Mantenimiento',
    },

    // Personnel Positions
    positions: {
      welder: 'Soldador',
      operator: 'Operario',
      supervisor: 'Supervisor',
      foreman: 'Capataz',
      helper: 'Ayudante',
      admin: 'Administrativo',
      manager: 'Gerente',
    },
  },
  
  en: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      projects: 'Projects',
      personnel: 'Personnel',
      expenses: 'Expenses',
      simulator: 'Cost Simulator',
      calendar: 'Calendar',
      reports: 'Reports',
      // Compliance Section
      compliance: 'Compliance',
      invoicing: 'Invoicing',
      payroll_electronic: 'Electronic Payroll',
      pila: 'PILA',
      contractors: 'Contractors',
      // Settings
      settings: 'Settings',
    },
    
    // Quick Actions
    quickActions: {
      title: 'Quick Actions',
      newProject: 'New Project',
      addEmployee: 'Add Employee',
      logExpense: 'Log Expense',
      createEstimate: 'Create Estimate',
    },
    
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      kpis: {
        activeProjects: 'Active Projects',
        monthlyRevenue: 'Monthly Revenue',
        monthlyCosts: 'Monthly Costs',
        forecastedProfit: 'Forecasted Profit',
      },
      topProjects: 'Top Projects',
      cashflow: 'Monthly Cashflow',
      revenue: 'Revenue',
      costs: 'Costs',
      profit: 'Profit',
    },
    
    // Projects
    projects: {
      title: 'Project Management',
      newProject: 'New Project',
      editProject: 'Edit Project',
      projectDetails: 'Project Details',
      name: 'Name',
      client: 'Client',
      status: 'Status',
      budget: 'Budget',
      spent: 'Spent',
      progress: 'Progress',
      startDate: 'Start Date',
      endDate: 'End Date',
      description: 'Description',
      actions: 'Actions',
      
      tabs: {
        overview: 'Overview',
        budget: 'Budget',
        expenses: 'Expenses',
        documents: 'Documents',
      },
    },
    
    // Personnel
    personnel: {
      title: 'Personnel Management',
      newEmployee: 'New Employee',
      editEmployee: 'Edit Employee',
      employeeDetails: 'Employee Details',
      name: 'Name',
      position: 'Position',
      department: 'Department',
      status: 'Status',
      phone: 'Phone',
      email: 'Email',
      address: 'Address',
      hireDate: 'Hire Date',
      hourlyRate: 'Hourly Rate',
      baseSalary: 'Base Salary',
      overtimeRate: 'Overtime Rate',
      currentProject: 'Current Project',
      assignedSince: 'Assigned since',
      emergencyContact: 'Emergency Contact',
      emergencyPhone: 'Emergency Phone',
      certifications: 'Certifications',
      specializations: 'Specializations',
      equipmentLicenses: 'Equipment Licenses',
      notes: 'Notes',
      actions: 'Actions',
      assign: 'Assign',
      unassign: 'Unassign',
      available: 'Available',
      totalEmployees: 'Total Employees',
      activeEmployees: 'Active Employees',
      assignedEmployees: 'Assigned Employees',
      tabs: {
        basicInfo: 'Basic Information',
        employment: 'Employment',
        financial: 'Financial Information',
        skills: 'Skills',
      },
      filters: {
        allDepartments: 'All Departments',
        allStatuses: 'All Statuses',
        allPositions: 'All Positions',
        available: 'Available',
        assigned: 'Assigned',
      },
    },
    
    // Expenses
    expenses: {
      title: 'Expense Management',
      addExpense: 'Add Expense',
      date: 'Date',
      project: 'Project',
      category: 'Category',
      vendor: 'Vendor',
      amount: 'Amount',
      description: 'Description',
      filters: 'Filters',
      allProjects: 'All Projects',
      allCategories: 'All Categories',
    },
    
    // Reports
    reports: {
      title: 'Financial Reports',
      dateRange: 'Date Range',
      lastMonth: 'Last Month',
      last3Months: '3 Months',
      last6Months: '6 Months',
      lastYear: 'Last Year',
      allTime: 'All Time',
      totalRevenue: 'Total Revenue',
      totalExpenses: 'Total Expenses',
      totalProfit: 'Total Profit',
      expenseBreakdown: 'Expense Breakdown',
      revenueVsCosts: 'Revenue vs Costs',
      profitEvolution: 'Profit Evolution',
      expenseDistribution: 'Expense Distribution',
    },
    
    // Cost Simulator
    simulator: {
      title: 'Cost Simulator',
      newEstimate: 'New Quote',
      editEstimate: 'Edit Quote',
      estimates: 'Quotes',
      templates: 'Templates',
      templateName: 'Template Name',
      estimateName: 'Quote Name',
      client: 'Client',
      selectTemplate: 'Select Template',
      selectClient: 'Select Client',
      profitMargin: 'Profit Margin',
      subtotal: 'Subtotal',
      total: 'Total',
      item: 'Item',
      quantity: 'Quantity',
      unitCost: 'Unit Cost',
      unit: 'Unit',
      itemTotal: 'Item Total',
      addItem: 'Add Item',
      removeItem: 'Remove Item',
      createEstimate: 'Create Quote',
      updateEstimate: 'Update Quote',
      deleteEstimate: 'Delete Quote',
      convertToProject: 'Convert to Project',
      duplicateEstimate: 'Duplicate Quote',
      exportToPDF: 'Export to PDF',
      noEstimates: 'No quotes created',
      noTemplates: 'No templates available',
      estimateCreated: 'Quote created successfully',
      estimateUpdated: 'Quote updated successfully',
      estimateDeleted: 'Quote deleted successfully',
      categories: {
        structural_welding: 'Structural Welding',
        residential_construction: 'Residential Construction',
        industrial_repair: 'Industrial Repair',
        custom_fabrication: 'Custom Fabrication',
      },
      itemTypes: {
        material: 'Material',
        labor: 'Labor',
        equipment: 'Equipment',
        overhead: 'Overhead',
      },
    },
    
    // Settings
    settings: {
      title: 'Settings',
      businessProfile: 'Business Profile',
      companyName: 'Company Name',
      contactPerson: 'Contact Person',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      currency: 'Currency',
      theme: 'Theme',
      language: 'Language',
      lightMode: 'Light Mode',
      darkMode: 'Dark Mode',
      spanish: 'Español',
      english: 'English',
    },
    
    // Common
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      search: 'Search',
      filter: 'Filter',
      clear: 'Clear',
      close: 'Close',
      loading: 'Loading...',
      noData: 'No data available',
      success: 'Operation successful',
      error: 'Operation error',
    },
    
    // Categories
    categories: {
      materials: 'Materials',
      labor: 'Labor',
      equipment: 'Equipment',
      misc: 'Miscellaneous',
    },
    
    // Status
    status: {
      planned: 'Planned',
      in_progress: 'In Progress',
      completed: 'Completed',
    },

    // Personnel Status
    personnelStatus: {
      active: 'Active',
      on_leave: 'On Leave',
      inactive: 'Inactive',
      terminated: 'Terminated',
    },

    // Personnel Departments
    departments: {
      construction: 'Construction',
      welding: 'Welding',
      administration: 'Administration',
      maintenance: 'Maintenance',
    },

    // Personnel Positions
    positions: {
      welder: 'Welder',
      operator: 'Operator',
      supervisor: 'Supervisor',
      foreman: 'Foreman',
      helper: 'Helper',
      admin: 'Admin',
      manager: 'Manager',
    },
  },
} as const;

export function useTranslations(locale: Locale = 'es') {
  return translations[locale];
}