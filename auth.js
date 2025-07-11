const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const pool = require('./db'); 
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

router.get('/google/user', passport.authenticate('google-user', {
  scope: ['profile', 'email']
}));

router.get('/google/user/callback',
  passport.authenticate('google-user', { failureRedirect: '/auth/access-denied' }),
  async (req, res) => {
    const { email, isNewUser } = req.user;

    try {
      if (isNewUser) {
        await pool.query('INSERT INTO logincredentials (email) VALUES ($1)', [email]);
        console.log(`✅ New user inserted: ${email}`);
      }

      const token = jwt.sign({ email,isNewUser }, JWT_SECRET, { expiresIn: '1h' });

      return res.redirect(`http://localhost:8000/token?token=${token}`);
    } catch (err) {
      console.error("❌ Error inserting user:", err);
      return res.status(500).send("Internal Server Error");
    }
  }
);

router.get('/access-denied', (req, res) => {
  res.status(401).send("Authentication failed");
});

module.exports = router;
