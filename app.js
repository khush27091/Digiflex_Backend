const express = require('express');
const cors = require('cors');
const path = require('path');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const uploadRouter = require('./routes/upload');
const measurementsRouter = require('./routes/measurements');

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ API routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/uploads', uploadRouter);
app.use('/api/measurements', measurementsRouter);


module.exports = app;
