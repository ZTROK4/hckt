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

router.post('/', authenticateJWT, async (req, res) => {
  const { type, status, message, email } = req.body;

  if (!email || !message || message.trim() === '') {
    return res.status(400).json({ message: 'Email and message are required' });
  }

  try {
    // Step 1: Find user_id and contact info by email
    const contactRes = await pool.query(
      `SELECT user_id, contact_email, contact_phone, name 
       FROM logincredentials 
       WHERE email = $1`,
      [email]
    );

    if (contactRes.rows.length === 0) {
      return res.status(404).json({ message: 'User or contact info not found' });
    }

    const { user_id, contact_email, contact_phone, name } = contactRes.rows[0];

    // Step 2: Save emergency event
    await pool.query(
      `INSERT INTO emergency_events (user_id, event_type, status, message)
       VALUES ($1, $2, $3, $4)`,
      [user_id, type || null, status || null, message]
    );

    // Step 3: Send Email
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
      text: `This is an emergency alert from ${name} (${email}).\n\nType: ${type}\nStatus: ${status}\nMessage: ${message}\n`,
    });

    // Step 4: Send SMS
    await client.messages.create({
      body: `🚨 Emergency Alert from ${name} (${email})\nType: ${type}\nMessage: ${message}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: contact_phone,
    });

    res.status(201).json({ message: 'Emergency event recorded and alert sent' });

  } catch (err) {
    console.error('Error handling emergency:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
