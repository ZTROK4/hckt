const express = require('express');
const router = express.Router();
const pool = require('./db'); 

router.post('/confirm', async (req, res) => {
  const { email,type,contact_name,contact_email,contact_phone,contact_relation,user_name } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  try {
    const existing = await pool.query('SELECT * FROM logincredentials WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

await pool.query(
  `UPDATE logincredentials
   SET type = $1,
       contact_name = $2,
       contact_email = $3,
       contact_relation = $4,
       contact_phone = $5,
       name = $6
   WHERE email = $7`,
  [type, contact_name, contact_email, contact_relation, contact_phone,user_name, email]
);


    return res.status(201).json({ message: 'User registered successfully', email });
  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/update', async (req, res) => {
  const { email,type,contact_name,contact_email,contact_phone,contact_relation,user_name } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  try {
    const existing = await pool.query('SELECT * FROM logincredentials WHERE email = $1', [email]);

    if (existing.rows.length > 0) {

    await pool.query(
  `UPDATE logincredentials
   SET type = $1,
       contact_name = $2,
       contact_email = $3,
       contact_relation = $4,
       contact_phone = $5,
       name = $6
   WHERE email = $7`,
  [type, contact_name, contact_email, contact_relation, contact_phone, user_name, email]
);

  }

    return res.status(201).json({ message: 'User details updated  successfully', email });
  } catch (err) {
    console.error('Signup update error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
