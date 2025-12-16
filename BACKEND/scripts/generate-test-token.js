/**
 * Generate Test Token Script
 * 
 * Scans Supabase database for tenant_ids and generates test tokens for each tenant
 * 
 * Usage: node scripts/generate-test-token.js [tenant_id]
 * 
 * Examples:
 *   node scripts/generate-test-token.js                    # List all tenants and generate tokens
 *   node scripts/generate-test-token.js dev.educore.local  # Generate token for specific tenant
 */

import jwt from 'jsonwebtoken';
import { getPrismaClient } from '../src/config/database.config.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get secret from environment or use default
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Scan database for all tenant_ids
 */
async function scanTenants() {
  try {
    const prisma = await getPrismaClient();
    
    console.log('\n🔍 Scanning Supabase database for tenants...\n');
    
    // Get all tenants from database
    const tenants = await prisma.tenant.findMany({
      where: {
        deletedAt: null // Only active tenants
      },
      select: {
        id: true,
        name: true,
        domain: true,
      },
      orderBy: {
        domain: 'asc'
      }
    });
    
    if (tenants.length === 0) {
      console.log('⚠️  No tenants found in database!');
      console.log('💡 Using default tenant_id: "default"\n');
      return [{ id: 'default', name: 'Default Tenant', domain: 'default' }];
    }
    
    console.log(`✅ Found ${tenants.length} tenant(s) in database:\n`);
    tenants.forEach((tenant, idx) => {
      console.log(`   ${idx + 1}. ${tenant.name}`);
      console.log(`      ID: ${tenant.id}`);
      console.log(`      Domain: ${tenant.domain}`);
      console.log('');
    });
    
    return tenants;
  } catch (error) {
    console.error('\n❌ Error scanning database:', error.message);
    console.error('💡 Falling back to default tenant_id: "default"\n');
    return [{ id: 'default', name: 'Default Tenant', domain: 'default' }];
  }
}

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
async function main() {
  const requestedTenant = process.argv[2];
  
  // Scan database for tenants
  const tenants = await scanTenants();
  
  console.log('='.repeat(80));
  
  if (requestedTenant) {
    // Generate token for specific tenant
    const tenant = tenants.find(t => 
      t.domain === requestedTenant || 
      t.id === requestedTenant ||
      t.name.toLowerCase() === requestedTenant.toLowerCase()
    );
    
    if (!tenant) {
      console.error(`\n❌ Tenant "${requestedTenant}" not found in database!`);
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
  } else {
    // Generate tokens for all tenants
    console.log('\n✅ GENERATING TOKENS FOR ALL TENANTS\n');
    console.log('='.repeat(80));
    
    tenants.forEach((tenant, idx) => {
      const token = generateToken(tenant.id, tenant.domain, tenant.name);
      
      console.log(`\n${idx + 1}. ${tenant.name} (${tenant.domain})`);
      console.log('   Tenant ID:', tenant.id);
      console.log('   Token:', token);
      console.log('\n   Browser Console Commands:');
      console.log(`   localStorage.setItem('auth_token', '${token}');`);
      console.log(`   localStorage.setItem('token', '${token}');`);
      console.log('   location.reload();');
      console.log('\n' + '-'.repeat(80));
    });
    
    console.log('\n💡 TIP: Run with tenant domain to generate token for specific tenant:');
    console.log(`   node scripts/generate-test-token.js ${tenants[0]?.domain || 'default'}\n`);
  }
  
  // Disconnect from database
  try {
    const prisma = await getPrismaClient();
    await prisma.$disconnect();
  } catch (error) {
    // Ignore disconnect errors
  }
}

// Run main function
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

