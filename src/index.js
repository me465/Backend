const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

// 1. Validation critique de la configuration au démarrage
if (!process.env.JWT_SECRET) {
  console.error('\x1b[31m%s\x1b[0m', 'FATAL ERROR: La variable d\'environnement JWT_SECRET est obligatoire pour démarrer le serveur en toute sécurité.');
  process.exit(1);
}

const { sequelize } = require('./models');

const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const productRoutes = require('./routes/productRoutes');
const alertRoutes = require('./routes/alertRoutes');
const businessRoutes = require('./routes/businessRoutes');
const venteRoutes = require('./routes/venteRoutes');
const achatRoutes = require('./routes/achatRoutes');
const detteRoutes = require('./routes/detteRoutes');
const rapportRoutes = require('./routes/rapportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const familyBudgetRoutes = require('./routes/familyBudgetRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const clientRoutes = require('./routes/clientRoutes');

const app = express();

// Configuration de sécurité pour la production
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Middleware Helmet pour sécuriser les en-têtes HTTP
app.use(helmet());

// Middleware CORS configurable via variables d'environnement
const allowedOriginsEnv = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || '*';
const allowedOrigins = allowedOriginsEnv.split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Autorise les requêtes sans origine (comme les applications mobiles natives ou Postman) ou si wildcard
    if (!origin || allowedOriginsEnv === '*' || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origine non autorisée par la politique CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));

// Limitation de la taille du payload pour éviter les attaques DoS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Express Rate Limiting sur les routes d'authentification et OTP
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '30', 10), // Max 30 requêtes par fenêtre de 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de tentatives sur les services d\'authentification. Veuillez réessayer dans 15 minutes pour des raisons de sécurité.'
  }
});

app.use('/api/auth', authRateLimiter);
app.use('/api/otp', authRateLimiter);
app.use('/auth', authRateLimiter);
app.use('/otp', authRateLimiter);

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Yomankash API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'Yomankash API', environment: process.env.NODE_ENV || 'production' });
});

// Routes principales
app.use('/api/auth', authRoutes);
app.use('/api/otp', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/business/vendeurs', businessRoutes);
app.use('/api/ventes', venteRoutes);
app.use('/api/achats', achatRoutes);
app.use('/api/dettes', detteRoutes);
app.use('/api/rapports', rapportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/family-budget', familyBudgetRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/clients', clientRoutes);

// Duplicate routes without /api prefix for frontend compatibility
app.use('/auth', authRoutes);
app.use('/otp', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/products', productRoutes);
app.use('/alerts', alertRoutes);
app.use('/business/vendeurs', businessRoutes);
app.use('/ventes', venteRoutes);
app.use('/achats', achatRoutes);
app.use('/dettes', detteRoutes);
app.use('/rapports', rapportRoutes);
app.use('/notifications', notificationRoutes);
app.use('/family-budget', familyBudgetRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/clients', clientRoutes);

// Middleware global de gestion sécurisée des erreurs
app.use((err, req, res, next) => {
  console.error('[Yomankash Security Error Log]:', err.message);
  
  if (res.headersSent) {
    return next(err);
  }

  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    success: false,
    message: isProd ? 'Une erreur interne est survenue. Veuillez réessayer ultérieurement.' : err.message
  });
});

// Database Connection & Server Listen
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const isForceSync = process.env.NODE_ENV !== 'production' && process.env.DB_FORCE_SYNC === 'true';

sequelize.sync({ force: isForceSync })
  .then(async () => {
    if (isForceSync) {
      console.log('Database synced and data cleared (force: true)');
    } else {
      console.log('Connected to PostgreSQL and synced securely');
    }
    app.listen(PORT, HOST, () => {
      console.log(`Server is running securely on http://${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });
