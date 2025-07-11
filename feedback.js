const express = require('express');
const router = express.Router();
const pool = require('./db');

router.post('/', async (req, res) => {
  const { message } = req.body;

  if (!email || !email.includes('@') || !message || message.trim() === '') {
    return res.status(400).json({ message: 'Email and message are required' });
  }

  try {
    await pool.query(
      'INSERT INTO userfeedback ( feedback_text) VALUES ($1, $2)',
      [ message]
    );

    return res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    console.error('Feedback error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
