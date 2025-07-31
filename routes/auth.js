const express = require('express');
const router = express.Router();
const db = require('../db'); // adjust path as per your db config

// Define your bypass credentials
const BYPASS_EMAIL = 'bypass@digiflex.com';
const BYPASS_PASSWORD = 'supersecret123';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // ✅ Bypass login check
if (email === BYPASS_EMAIL && password === BYPASS_PASSWORD) {
  return res.json({
    id: 'bypass-admin-id',
    first_name: 'Admin',
    last_name: 'Bypass',
    email: email,
    role: 'ADMIN',
  });
}

  try {
    const query = 'SELECT * FROM users WHERE email = $1 AND password_hash = $2';
    const values = [email, password];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
