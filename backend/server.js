const express = require('express');
const cors = require('cors');
const { db } = require('./database/connection');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas existentes
app.use('/api/clients', require('./routes/clients'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/budget-items', require('./routes/budget-items'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/personnel', require('./routes/personnel'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/simulator', require('./routes/simulator'));
// Rutas MVP Cumplimiento Normativo (más específicas primero)
app.use('/api/settings', require('./routes/compliance-settings'));
app.use('/api/settings-legacy', require('./routes/settings'));
app.use('/api/tax', require('./routes/compliance-settings'));
app.use('/api/invoicing', require('./routes/invoicing'));
app.use('/api/dian', require('./routes/dian-payroll'));
app.use('/api/pila', require('./routes/pila-csv'));
app.use('/api/contractors', require('./routes/contractors'));

// Ruta de salud del servidor
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 API HYR corriendo en puerto ${PORT}`);
});