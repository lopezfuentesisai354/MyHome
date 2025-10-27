// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// ... otras rutas ...

// MODULO CHECK-IN
app.use('/api/checkin', require('./src/routes/checkin.routes'));

// Servir archivos estáticos (fotos)
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});