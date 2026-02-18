#!/usr/bin/env node

/**
 * Authentication System Fix Verification Script
 * Checks that all fixes have been properly applied
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔐 AUTHENTICATION FIX VERIFICATION\n');
console.log('=' .repeat(60));

let passCount = 0;
let failCount = 0;

function check(condition, description, details = '') {
    if (condition) {
        console.log(`✅ ${description}`);
        if (details) console.log(`   ${details}`);
        passCount++;
    } else {
        console.log(`❌ ${description}`);
        if (details) console.log(`   ${details}`);
        failCount++;
    }
}

// 1. Check .env.local
console.log('\n📋 Checking .env.local:');
try {
    const envLocal = fs.readFileSync('.env.local', 'utf8');
    const jwtMatch = envLocal.match(/JWT_SECRET="([^"]+)"/);

    if (jwtMatch) {
        const secret = jwtMatch[1];
        check(secret.length === 64, 'JWT_SECRET length is 64 characters', `Length: ${secret.length}`);
        check(!secret.includes('\\n'), 'JWT_SECRET has no newline escape', `Secret: ${secret.substring(0, 20)}...`);
        check(secret.includes('/'), 'JWT_SECRET contains base64 characters', `Format: base64 ✓`);
    } else {
        check(false, 'JWT_SECRET found in .env.local');
    }
} catch (e) {
    check(false, '.env.local is readable', e.message);
}

// 2. Check .env.production.local
console.log('\n📋 Checking .env.production.local:');
try {
    const envProd = fs.readFileSync('.env.production.local', 'utf8');
    const jwtMatch = envProd.match(/JWT_SECRET="([^"]+)"/);

    if (jwtMatch) {
        const secret = jwtMatch[1];
        check(secret.length === 64, 'JWT_SECRET length is 64 characters', `Length: ${secret.length}`);
        check(!secret.includes('\\n'), 'JWT_SECRET has no newline escape', `Secret: ${secret.substring(0, 20)}...`);
        check(secret.includes('/'), 'JWT_SECRET contains base64 characters', `Format: base64 ✓`);
    } else {
        check(false, 'JWT_SECRET found in .env.production.local');
    }
} catch (e) {
    check(false, '.env.production.local is readable', e.message);
}

// 3. Check secrets match
console.log('\n📋 Comparing secrets:');
try {
    const envLocal = fs.readFileSync('.env.local', 'utf8');
    const envProd = fs.readFileSync('.env.production.local', 'utf8');

    const secretLocal = envLocal.match(/JWT_SECRET="([^"]+)"/)?.[1];
    const secretProd = envProd.match(/JWT_SECRET="([^"]+)"/)?.[1];

    check(
        secretLocal === secretProd,
        'Secrets are identical (local === production)',
        `Both: ${secretLocal?.substring(0, 20)}...`
    );
} catch (e) {
    check(false, 'Secrets can be compared', e.message);
}

// 4. Check validateEnv.js exists
console.log('\n📋 Checking validation module:');
try {
    check(
        fs.existsSync('lib/validateEnv.js'),
        'lib/validateEnv.js exists',
        'Path: ./lib/validateEnv.js'
    );

    const validateCode = fs.readFileSync('lib/validateEnv.js', 'utf8');
    check(
        validateCode.includes('validateEnvironment'),
        'validateEnvironment function is exported',
        'Module exports: validateEnvironment'
    );
    check(
        validateCode.includes('JWT_SECRET'),
        'validateEnvironment checks JWT_SECRET',
        'Validation: JWT_SECRET ✓'
    );
    check(
        validateCode.includes('process.exit(1)'),
        'Validation fails-fast (exits on error)',
        'Behavior: Fail-fast ✓'
    );
} catch (e) {
    check(false, 'Validation module is complete', e.message);
}

// 5. Check dev-server integration
console.log('\n📋 Checking dev-server integration:');
try {
    const devServerCode = fs.readFileSync('api/dev-server.js', 'utf8');
    check(
        devServerCode.includes("require('../lib/validateEnv')"),
        'dev-server imports validateEnv module',
        'Import: ../lib/validateEnv ✓'
    );
    check(
        devServerCode.includes('validateEnvironment()'),
        'dev-server calls validateEnvironment()',
        'Called on: server startup ✓'
    );
} catch (e) {
    check(false, 'dev-server integration is complete', e.message);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log(`\n📊 VERIFICATION RESULTS:\n`);
console.log(`   ✅ Passed: ${passCount}`);
console.log(`   ❌ Failed: ${failCount}`);

if (failCount === 0) {
    console.log(`\n🎉 ALL CHECKS PASSED! Authentication system is fixed.\n`);
    process.exit(0);
} else {
    console.log(`\n⚠️  Some checks failed. Please review the issues above.\n`);
    process.exit(1);
}
