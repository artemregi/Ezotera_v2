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
}

module.exports = { validateEnvironment };
