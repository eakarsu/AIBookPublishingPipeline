require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Make pool available to routes
app.locals.pool = pool;

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/manuscripts', require('./routes/manuscripts'));
app.use('/api/covers', require('./routes/covers'));
app.use('/api/metadata', require('./routes/metadata'));
app.use('/api/distribution', require('./routes/distribution'));
app.use('/api/royalties', require('./routes/royalties'));
app.use('/api/authors', require('./routes/authors'));
app.use('/api/series', require('./routes/series'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/production', require('./routes/production'));
app.use('/api/translations', require('./routes/translations'));
app.use('/api/preorders', require('./routes/preorders'));
app.use('/api/competitors', require('./routes/competitors'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/events', require('./routes/events'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/ai', require('./routes/ai'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
