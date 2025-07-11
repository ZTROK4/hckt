const express = require('express');
const router = express.Router();
const pool = require('./db');
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");
const twilio = require('twilio');
const crypto = require("crypto");
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ✅ Middleware: JWT Auth
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
    };

    next();
  });
};

// ✅ POST /emergency — record event and alert contact
router.post('/', authenticateJWT, async (req, res) => {
  const { type, status, message } = req.body;
  const { id: user_id, email } = req.user;

  if (!message || message.trim() === '') {
    return res.status(400).json({ message: 'Emergency message is required' });
  }

  try {
    // 🔍 1. Fetch emergency contact info from logincredentials table
    const contactRes = await pool.query(
      'SELECT contact_email, contact_phone FROM logincredentials WHERE user_id = $1',
      [user_id]
    );

    if (contactRes.rows.length === 0) {
      return res.status(404).json({ message: 'Emergency contact not found' });
    }

    const { contact_email, contact_phone } = contactRes.rows[0];

    // ✅ 2. Save emergency event
    await pool.query(
      `INSERT INTO emergency_events (user_id, event_type, status, message)
       VALUES ($1, $2, $3, $4)`,
      [user_id, type || null, status || null, message]
    );

    // 🔐 3. Generate OTP
    const otp = crypto.randomInt(100000, 999999);

    // 📧 4. Send email using Gmail
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Emergency Alert" <${process.env.EMAIL_USER}>`,
      to: contact_email,
      subject: "🚨 Emergency Alert",
      text: `This is an emergency alert from ${email}.\n\nType: ${type}\nStatus: ${status}\nMessage: ${message}\n`,
    });

    // 📱 5. Send SMS via Twilio
    await client.messages.create({
      body: `🚨 Emergency Alert from ${email}\nType: ${type}\nMessage: ${message}\n`,
      from: process.env.TWILIO_PHONE_NUMBER, // your Twilio number
      to: contact_phone,
    });

    res.status(201).json({ message: 'Emergency event recorded and alert sent' });

  } catch (err) {
    console.error('Error handling emergency:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
