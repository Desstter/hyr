# HYR Admin - Construction & Welding Business Management

A modern, responsive UI-only admin web application for construction and welding business management, built with Next.js and TypeScript.

## 🚀 Features

- **Dashboard**: Real-time KPIs, project overview, and financial charts
- **Project Management**: Complete project lifecycle tracking with budget management
- **Expense Tracking**: Categorized expense logging with filtering and search
- **Financial Reports**: Interactive charts and analytics with date filtering
- **Settings**: Business profile management and theme customization
- **Responsive Design**: Mobile-first approach with desktop and tablet optimizations
- **Internationalization**: Spanish-first with English support
- **Accessibility**: Full ARIA compliance and keyboard navigation

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Tables**: TanStack Table
- **Notifications**: Sonner

## 🎨 Design System

- **Primary Color**: Amber (#f59e0b) - warm, professional construction industry aesthetic
- **Base Colors**: Neutral grays for readability and professionalism
- **Typography**: Inter font for clarity and modern look
- **Layout**: Left sidebar navigation with responsive mobile drawer

## 📊 Mock Data

The application includes comprehensive mock data representing a Colombian construction business:

- **5 Projects**: Various construction and welding projects with realistic budgets (COP currency)
- **30+ Expenses**: Categorized expenses across materials, labor, equipment, and miscellaneous
- **Financial Data**: 6 months of historical data for reporting and analytics

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Navigate to the project directory

```bash
cd construction-admin
```

2. Install dependencies

```bash
npm install
```

3. Start the development server

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## 📱 Page Structure

### Dashboard (`/`)

- KPI cards showing active projects, revenue, costs, and forecasted profit
- Top projects list with progress indicators
- Monthly cashflow chart
- Quick actions for common tasks

### Projects (`/projects`)

- Comprehensive projects table with search and filtering
- Project detail pages with budget tracking
- Progress visualization and expense summaries

### Expenses (`/expenses`)

- Filterable expense list by project, category, and date
- Real-time expense totals and summaries
- Category-based expense organization

### Reports (`/reports`)

- Financial KPI summary cards
- Interactive charts: Revenue vs Costs, Profit Evolution, Expense Distribution
- Date range filtering for historical analysis

### Settings (`/settings`)

- Business profile management
- Theme and language preferences
- Currency and locale settings

## 🎯 User Experience

### Target User

Non-technical business owner of a construction and welding company who needs:

- Clear, intuitive interface with minimal learning curve
- Spanish-first labeling with familiar business terminology
- Mobile accessibility for on-site project management
- Quick access to financial overview and project status

### Key UX Principles

- **Clarity**: Clear labels and intuitive navigation
- **Speed**: Quick actions always accessible
- **Mobility**: Responsive design for mobile use
- **Context**: Relevant information presented contextually

## 🌐 Internationalization

The application supports Spanish (primary) and English with:

- Complete interface translations
- Date formatting localized for Colombian users
- Currency formatting in Colombian Pesos (COP)
- Extensible translation system for future languages

## ♿ Accessibility Features

- Full ARIA labeling and semantic HTML
- Keyboard navigation support
- Focus management and visible focus indicators
- Screen reader compatibility
- High contrast color ratios
- Alternative text for all visual elements

## 🎨 Component Architecture

### Layout Components

- `Sidebar`: Main navigation with responsive behavior
- `TopBar`: Search, notifications, and user profile
- `QuickActions`: Context-sensitive action buttons

### Feature Components

- **Dashboard**: KPI cards, project lists, charts
- **Projects**: Data tables, forms, detail views
- **Expenses**: Filtering, categorization, summaries
- **Reports**: Interactive charts and analytics
- **Settings**: Profile and preference management

## 📈 Future Enhancements (Phase 2+)

- **Data Persistence**: Local storage and export capabilities
- **Authentication**: User management and role-based access
- **File Uploads**: Document management and photo attachments
- **Real Backend**: API integration and database connectivity
- **Advanced Reporting**: PDF exports and custom report generation

## 🤝 Contributing

This is a Phase 1 UI-only implementation. Future contributions should focus on:

1. Backend integration patterns
2. Enhanced form validations
3. Performance optimizations
4. Additional accessibility features
5. Extended internationalization

## 📄 License

This project is developed for HYR Construction & Welding business administration.

---

**Status**: Phase 1 Complete ✅  
**Last Updated**: August 2024  
**Version**: 1.0.0-ui-only
