
const express = require('express');

const app = express();

// Parse incoming JSON request bodies.
app.use(express.json());

// Health check: confirms the API is running.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Barwaaqo Trading API is running',
  });
});

module.exports = app;
