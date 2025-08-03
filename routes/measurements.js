const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

// ==========================
// CREATE Measurement
// ==========================
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      customer_name,
      customer_mobile,
      customer_address,
      measurement_date,
      user_id,
      areas,
    } = req.body;

    await client.query('BEGIN');

    const measurementId = uuidv4();
const status = user_id ? 'assigned' : 'created';

await client.query(
  `INSERT INTO measurements (id, customer_name, customer_mobile, customer_address, measurement_date, user_id, status)
   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [measurementId, customer_name, customer_mobile, customer_address, measurement_date, user_id, status]
);

    for (const area of areas) {
      const areaId = uuidv4();
      await client.query(
        `INSERT INTO measurement_areas (id, measurement_id, area_name, height, width, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [areaId, measurementId, area.area_name, area.height, area.width, area.notes || null]
      );

      if (area.photo_urls?.length) {
        for (const url of area.photo_urls) {
          await client.query(
            `INSERT INTO area_photos (id, area_id, photo_url)
             VALUES ($1, $2, $3)`,
            [uuidv4(), areaId, url]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Measurement created successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create error:', error);
    res.status(500).json({ error: 'Failed to create measurement' });
  } finally {
    client.release();
  }
});

// ==========================
// GET All Measurements
// ==========================
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM measurements ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch all error:', error);
    res.status(500).json({ error: 'Failed to fetch measurements' });
  }
});

// ==========================
// GET One Measurement (with areas & photos)
// ==========================
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const headerRes = await pool.query(`SELECT * FROM measurements WHERE id = $1`, [id]);
    const areaRes = await pool.query(
      `SELECT ma.*, ap.photo_url
       FROM measurement_areas ma
       LEFT JOIN area_photos ap ON ma.id = ap.area_id
       WHERE ma.measurement_id = $1`,
      [id]
    );

    const areas = areaRes.rows.reduce((acc, row) => {
      const existing = acc.find(a => a.id === row.id);
      if (existing) {
        if (row.photo_url) existing.photo_urls.push(row.photo_url);
      } else {
        acc.push({
          id: row.id,
          area_name: row.area_name,
          height: row.height,
          width: row.width,
          notes: row.notes,
          photo_urls: row.photo_url ? [row.photo_url] : [],
        });
      }
      return acc;
    }, []);

    res.json({
      ...headerRes.rows[0],
      areas,
    });
  } catch (error) {
    console.error('Fetch one error:', error);
    res.status(500).json({ error: 'Failed to fetch measurement' });
  }
});

// ==========================
// UPDATE Measurement
// ==========================
router.put('/:id', async (req, res) => {
  const { id } = req.params;
const {
  customer_name,
  customer_mobile,
  customer_address,
  measurement_date,
  user_id, // ✅ Add this
  areas,
} = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

let newStatus = 'created';

if (user_id && !areas?.length) {
  newStatus = 'assigned';
} else if (user_id && areas?.length) {
  newStatus = 'in_progress';
}

await client.query(
  `UPDATE measurements
   SET customer_name = $1, customer_mobile = $2, customer_address = $3,
       measurement_date = $4, user_id = $5, status = $6
   WHERE id = $7`,
  [customer_name, customer_mobile, customer_address, measurement_date, user_id, newStatus, id]
);

    await client.query(`DELETE FROM area_photos WHERE area_id IN (SELECT id FROM measurement_areas WHERE measurement_id = $1)`, [id]);
    await client.query(`DELETE FROM measurement_areas WHERE measurement_id = $1`, [id]);

    for (const area of areas) {
      const areaId = uuidv4();
      await client.query(
        `INSERT INTO measurement_areas (id, measurement_id, area_name, height, width, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [areaId, id, area.area_name, area.height, area.width, area.notes || null]
      );

      if (area.photo_urls?.length) {
        for (const url of area.photo_urls) {
          await client.query(
            `INSERT INTO area_photos (id, area_id, photo_url)
             VALUES ($1, $2, $3)`,
            [uuidv4(), areaId, url]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Measurement updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update measurement' });
  } finally {
    client.release();
  }
});

// ==========================
// DELETE Measurement
// ==========================
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM measurements WHERE id = $1`, [id]);
    res.json({ message: 'Measurement deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete measurement' });
  }
});


// ==========================
// APPROVE Measurement (custom endpoint)
// ==========================
router.put('/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE measurements SET status = 'approved' WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Measurement not found' });
    }

    res.json({ message: 'Measurement approved successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ error: 'Failed to approve measurement' });
  }
});


module.exports = router;

