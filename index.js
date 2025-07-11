const express = require('express');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const pool = require('./db'); // PostgreSQL connection
const jwt = require('jsonwebtoken');

// Routes
const authRoutes = require('./auth');
const feedbackRoute = require('./feedback');
const signupRoute = require('./signup');
const emergencyRoutes = require('./emergency');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Google OAuth Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use('google-user', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `https://hckt.onrender.com/auth/google/user/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const result = await pool.query('SELECT * FROM logincredentials WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      return done(null, { email, isNewUser: false });
    } else {
      return done(null, { email, isNewUser: true });
    }
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

const app = express();
const PORT = process.env.PORT || 5000;

// CORS
const allowedOrigins = [
  'http://localhost:5000',
  'https://www.biznex.site',
  'http://alan.localhost:5000'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// 🔐 SESSION SUPPORT (required for Passport login)
app.use(session({
  secret: process.env.SESSION_SECRET || 'some_secret_value',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// 🔗 Routes
app.use('/auth', authRoutes);
app.use('/signup', signupRoute);
app.use('/feedback', feedbackRoute);
app.use('/emergency', emergencyRoutes);

// ✅ Sample Protected Route using JWT
app.get('/protected', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'Token is required' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    res.status(200).json({ message: 'Protected route accessed', user: decoded });
  });
});



// 🟢 Server Listen
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
