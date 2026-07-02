require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// Fail fast if required environment variables are missing
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET', 'OPENROUTER_API_KEY'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('❌ Please check your .env file and try again.');
  process.exit(1);
}

// Import routes
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const profileRoutes = require('./routes/profileRoutes');
const configRoutes = require('./routes/configRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');
const reminderRoutes = require('./routes/reminderRoutes');

// Import middleware
const { errorHandler } = require('./middleware/errorMiddleware');
const { initializeFirebase } = require('./config/firebase');

// Initialize Express app
const app = express();

// ======================
// MIDDLEWARE
// ======================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Sanitize request data against NoSQL injection (strips $ and . from keys)
app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// ======================
// DATABASE CONNECTION
// ======================

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/MediScan', {
      dbName: process.env.DB_NAME || 'mediscan'
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✅ Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error(`❌ Full error:`, error);
    throw error; // Re-throw to be caught by startServer
  }
};

// ======================
// API ROUTES
// ======================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MediScan API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API version info
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to MediScan API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      chat: '/api/chat',
      hospitals: '/api/hospitals',
      analytics: '/api/analytics',
      profile: '/api/profile',
      user: '/api/user',
      config: '/api/config'
    },
    documentation: 'https://github.com/Rithwik010/HTF25-Team-111'
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/config', configRoutes);
app.use('/api/user', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reminders', reminderRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// ======================
// START SERVER
// ======================

const PORT = process.env.PORT || 5000;

// Start server only after MongoDB connection
const startServer = async () => {
  try {
    // Wait for MongoDB connection
    await connectDB();
    
    // Initialize Firebase Admin (non-fatal if not configured)
    initializeFirebase();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║                                        ║
║       🏥 MediScan API Server 🏥       ║
║                                        ║
║  Status: ✅ Running                    ║
║  Port: ${PORT}                           ║
║  Environment: ${process.env.NODE_ENV || 'development'}              ║
║  URL: http://localhost:${PORT}           ║
║                                        ║
╚════════════════════════════════════════╝
      `);
      console.log(`📋 API Documentation: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`\n⚡ Ready to accept requests!\n`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('❌ Unhandled Rejection:', err.message);
      console.error(err.stack);
      // Close server & exit process
      server.close(() => process.exit(1));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('❌ Uncaught Exception:', err.message);
      console.error(err.stack);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Process terminated');
        mongoose.connection.close().then(() => {
          console.log('✅ MongoDB connection closed');
          process.exit(0);
        });
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
