const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '')),
});

const upload = multer({ storage });

// Upload endpoint
router.post('/upload', (req, res, next) => {
  console.log('upload route hit');
  next();
}, upload.array('photos', 10), (req, res) => {
  console.log('files received:', req.files);
  const files = req.files.map(file => `/uploads/${file.filename}`);
  res.status(200).json({ photo_urls: files });
});


module.exports = router;
