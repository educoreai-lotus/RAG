/**
 * Generate Test Token Script
 * 
 * Generates JWT test tokens for tenants without database connection
 * 
 * Usage: node scripts/generate-test-token.js [tenant_domain]
 * 
 * Examples:
 *   node scripts/generate-test-token.js                    # Generate token for dev.educore.local
 *   node scripts/generate-test-token.js dev.educore.local  # Generate token for specific tenant
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get secret from environment or use default
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Default tenants (no database connection needed)
 */
const DEFAULT_TENANTS = [
  {
    domain: 'dev.educore.local',
    name: 'Development Tenant',
    id: 'dev.educore.local' // Use domain as ID for simplicity
  }
];

/**
 * Generate token for a specific tenant
 */
function generateToken(tenantId, tenantDomain, tenantName) {
  return jwt.sign(
    {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test Admin User',
      role: 'admin',
      tenant_id: tenantId,
      tenant_domain: tenantDomain,
      tenant_name: tenantName,
      permissions: ['read:all', 'read:reports', 'read:hr']
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Main function
 */
function main() {
  const requestedTenant = process.argv[2] || 'dev.educore.local';
  
  // Use default tenants (no database connection)
  const tenants = DEFAULT_TENANTS;
  
  console.log('='.repeat(80));
  
  // Find requested tenant
  const tenant = tenants.find(t => 
    t.domain === requestedTenant || 
    t.id === requestedTenant ||
    t.name.toLowerCase() === requestedTenant.toLowerCase()
  );
  
  if (!tenant) {
    console.error(`\n❌ Tenant "${requestedTenant}" not found!`);
    console.log('\n📋 Available tenants:');
    tenants.forEach(t => {
      console.log(`   - ${t.domain} (${t.name})`);
    });
    process.exit(1);
  }
  
  const token = generateToken(tenant.id, tenant.domain, tenant.name);
  
  console.log(`\n✅ TEST TOKEN GENERATED FOR: ${tenant.name}`);
  console.log(`   Domain: ${tenant.domain}`);
  console.log(`   Tenant ID: ${tenant.id}`);
  console.log('='.repeat(80));
  console.log('\n📋 COPY THIS TOKEN:\n');
  console.log(token);
  console.log('\n' + '='.repeat(80));
  console.log('\n🔧 PASTE THIS IN BROWSER CONSOLE:\n');
  console.log(`localStorage.setItem('auth_token', '${token}');`);
  console.log(`localStorage.setItem('token', '${token}');`);
  console.log('location.reload();');
  console.log('\n' + '='.repeat(80) + '\n');
}

// Run main function
try {
  main();
} catch (error) {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
}

