const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

// CREATE user
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, phone, email, password_hash, role } = req.body;
    const user_id = uuidv4();

    const defaultPassword = '123';

    const result = await pool.query(
      `INSERT INTO users (user_id, first_name, last_name, phone, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, first_name, last_name, phone, email, defaultPassword, role || 'normal']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET all users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET user by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// UPDATE user
router.put('/:id', async (req, res) => {
  try {
    const { first_name, last_name, phone, email, password_hash, role } = req.body;

    const result = await pool.query(
      `UPDATE users SET
         first_name = $1,
         last_name = $2,
         phone = $3,
         email = $4,
         password_hash = $5,
         role = $6,
         updated_at = NOW()
       WHERE user_id = $7
       RETURNING *`,
      [first_name, last_name, phone, email, password_hash, role, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE user
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE user_id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});


// Reset Password
// RESET password (with debugging)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Compare old password (plain comparison)
    if (user.password_hash !== oldPassword) {
      return res.status(401).json({ error: 'Old password is incorrect' });
    }

    // Update to new password
    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2`,
      [newPassword, email]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});


module.exports = router;
