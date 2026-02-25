/**
 * Environment Variable Validation
 * Ensures critical environment variables are set and valid at startup
 * Fails fast to prevent runtime errors in production
 */

function validateEnvironment() {
    const errors = [];

    // Check JWT_SECRET
    if (!process.env.JWT_SECRET) {
        errors.push('❌ JWT_SECRET is not defined in environment');
    } else if (process.env.JWT_SECRET.length < 32) {
        errors.push(`❌ JWT_SECRET must be at least 32 characters (256 bits), got ${process.env.JWT_SECRET.length}`);
    }

    // Check POSTGRES_URL
    if (!process.env.POSTGRES_URL) {
        errors.push('❌ POSTGRES_URL is not defined in environment');
    }

    // Check NODE_ENV
    if (!['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
        errors.push(`⚠️  NODE_ENV should be "development", "production", or "test", got "${process.env.NODE_ENV}"`);
    }

    // Check SMTP configuration (required for password reset feature)
    if (!process.env.SMTP_HOST) {
        errors.push('❌ SMTP_HOST is not defined in environment');
    }

    if (!process.env.SMTP_PORT) {
        errors.push('❌ SMTP_PORT is not defined in environment');
    } else {
        const port = parseInt(process.env.SMTP_PORT, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
            errors.push(`❌ SMTP_PORT must be a valid port number (1-65535), got "${process.env.SMTP_PORT}"`);
        }
    }

    if (!process.env.SMTP_USER) {
        errors.push('❌ SMTP_USER is not defined in environment');
    }

    if (!process.env.SMTP_PASS) {
        errors.push('❌ SMTP_PASS is not defined in environment');
    }

    if (!process.env.SMTP_FROM) {
        errors.push('❌ SMTP_FROM is not defined in environment');
    }

    // Optional: RESET_OTP_EXPIRATION_MINUTES (defaults to 10 if not set)
    if (process.env.RESET_OTP_EXPIRATION_MINUTES) {
        const minutes = parseInt(process.env.RESET_OTP_EXPIRATION_MINUTES, 10);
        if (isNaN(minutes) || minutes < 1 || minutes > 60) {
            errors.push(`⚠️  RESET_OTP_EXPIRATION_MINUTES should be 1-60 minutes, got "${process.env.RESET_OTP_EXPIRATION_MINUTES}"`);
        }
    }

    // If any errors, fail immediately
    if (errors.length > 0) {
        console.error('\n🚨 ENVIRONMENT VALIDATION FAILED:\n');
        errors.forEach(err => console.error('   ' + err));
        console.error('\n');
        process.exit(1);
    }

    // Success log
    console.log('✅ Environment variables validated successfully');
    console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET.length} characters`);
    console.log(`   - POSTGRES_URL: configured`);
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   - SMTP_HOST: ${process.env.SMTP_HOST}`);
    console.log(`   - SMTP_PORT: ${process.env.SMTP_PORT}`);
    console.log(`   - SMTP_USER: ${process.env.SMTP_USER}`);
    console.log(`   - SMTP_FROM: ${process.env.SMTP_FROM}`);
    console.log(`   - OTP_EXPIRATION: ${process.env.RESET_OTP_EXPIRATION_MINUTES || 10} minutes`);
}

module.exports = { validateEnvironment };
