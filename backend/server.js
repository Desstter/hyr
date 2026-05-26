// Cargar variables de entorno
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { db, verifyConnection } = require('./database/connection');
const { errorMiddleware, notFoundMiddleware } = require('./utils/http');

const app = express();

// Cabeceras de seguridad (API JSON: no necesita CSP de navegador)
app.use(helmet({ contentSecurityPolicy: false }));

// Configuración CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    'https://hyr.moonhellal.com',
    'http://192.168.50.120:3000',
    'http://192.168.1.103:3000',
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:3000$/
  ],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting para la API (protección básica ante abuso/bucles)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intente de nuevo en un minuto.' }
});
app.use('/api', apiLimiter);

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

// Ruta de salud del servidor (incluye verificación de BD)
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'OK', database: 'up', timestamp: new Date().toISOString() });
    } catch {
        res.status(503).json({ status: 'DEGRADED', database: 'down', timestamp: new Date().toISOString() });
    }
});

// Middlewares finales: 404 y manejador global de errores (red de seguridad)
app.use(notFoundMiddleware);
app.use(errorMiddleware);

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`🚀 API HYR corriendo en ${HOST}:${PORT}`);
    verifyConnection().catch(err => console.error('❌ Error conectando a PostgreSQL:', err.message));
});