const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const searchRoutes = require('./routes/search');
const voiceRoutes = require('./routes/voice');
const loggingRoutes = require('./routes/logging');
const playlistRoutes = require('./routes/playlist');
const authRoutes = require('./routes/auth');
const analyticsRoutes = require('./routes/analytics');

app.use('/api/search', searchRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/log', loggingRoutes);
app.use('/api/playlist', playlistRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Music Discovery API is running' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
