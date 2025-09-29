// Cargar variables de entorno
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { db } = require('./database/connection');

const app = express();
// Configuración CORS para permitir acceso desde red local
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://192.168.50.120:3000',
    'http://192.168.1.103:3000',
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:3000$/
  ],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Rutas existentes
app.use('/api/clients', require('./routes/clients'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/budget-items', require('./routes/budget-items'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/personnel', require('./routes/personnel'));
app.use('/api/time-entries', require('./routes/time-entries'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/simulator', require('./routes/simulator'));
app.use('/api/assignments', require('./routes/assignments'));
// Rutas MVP Cumplimiento Normativo (más específicas primero)
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/compliance-settings', require('./routes/compliance-settings'));
app.use('/api/tax', require('./routes/compliance-settings'));
app.use('/api/invoicing', require('./routes/invoicing'));
app.use('/api/dian', require('./routes/dian-payroll'));
app.use('/api/pila', require('./routes/pila-csv'));
app.use('/api/contractors', require('./routes/contractors'));
app.use('/api/files', require('./routes/files'));
app.use('/api', require('./routes/project-incomes'));

// Ruta de salud del servidor
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`🚀 API HYR corriendo en ${HOST}:${PORT}`);
});