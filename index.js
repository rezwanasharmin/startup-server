const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const User = require('./models/User');

const app = express();

// Connect to MongoDB
connectDB().then(() => {
  // Seed default admin account
  seedAdmin();
});

// Middlewares
const allowedOrigins = [
  'https://startup-client-livid.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Use express.raw for Stripe webhook, otherwise express.json
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(cookieParser());

// Seed default Admin account helper
async function seedAdmin() {
  try {
    const adminEmail = 'admin@startupforge.com';
    const adminExists = await User.findOne({ email: adminEmail });

    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('AdminPassword123', salt);

      const admin = new User({
        name: 'Platform Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'Admin',
        image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
        isBlocked: false,
      });

      await admin.save();
      console.log('--------------------------------------------------');
      console.log('Seed: Default Admin Account Created Successfully!');
      console.log(`Email: ${adminEmail}`);
      console.log('Password: AdminPassword123');
      console.log('--------------------------------------------------');
    }
  } catch (error) {
    console.error('Error seeding default admin account:', error);
  }
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/startups', require('./routes/startups'));
app.use('/api/opportunities', require('./routes/opportunities'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));

// Simple index route
app.get('/', (req, res) => {
  res.send('StartupForge Server API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
