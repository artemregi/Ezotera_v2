-- Create users table for Ezoterra authentication system
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,

    -- Onboarding data (populated after registration via /api/onboarding/complete)
    gender VARCHAR(50),
    birth_date DATE,
    birth_time TIME,
    birth_place VARCHAR(255),
    relationship_status VARCHAR(100),
    focus_area VARCHAR(255),
    zodiac_sign VARCHAR(50),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Add table comment
COMMENT ON TABLE users IS 'User accounts with authentication and onboarding data for Ezoterra astrology platform';

-- Add column comments
COMMENT ON COLUMN users.email IS 'Unique email address for login';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password (never store plain passwords)';
COMMENT ON COLUMN users.email_verified IS 'Whether user has verified their email address';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last successful login';
