const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  user: 'admin',
  password: 'password',
  database: 'users_db'
});

const createTableQuery = `
CREATE TABLE IF NOT EXISTS event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255),
    action VARCHAR(50),
    entity VARCHAR(50),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_logs_date ON event_logs(created_at);
`;

pool.query(createTableQuery)
  .then(() => console.log('Table event_logs created successfully'))
  .catch(err => console.error('Error creating table:', err))
  .finally(() => pool.end());
