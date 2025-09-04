export type Locale = 'es' | 'en';

export const translations = {
  es: {
    // Navigation
    nav: {
      dashboard: 'Panel Principal',
      projects: 'Proyectos',
      expenses: 'Gastos',
      reports: 'Reportes',
      settings: 'Configuración',
    },
    
    // Quick Actions
    quickActions: {
      title: 'Acciones Rápidas',
      newProject: 'Nuevo Proyecto',
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
  },
  
  en: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      projects: 'Projects',
      expenses: 'Expenses',
      reports: 'Reports',
      settings: 'Settings',
    },
    
    // Quick Actions
    quickActions: {
      title: 'Quick Actions',
      newProject: 'New Project',
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
  },
} as const;

export function useTranslations(locale: Locale = 'es') {
  return translations[locale];
}