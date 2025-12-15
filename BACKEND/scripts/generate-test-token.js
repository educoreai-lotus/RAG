import jwt from 'jsonwebtoken';

// Get secret from environment or use default
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create test user token
const token = jwt.sign(
  {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test Admin User',
    role: 'admin',
    tenant_id: 'default',
    permissions: ['read:all', 'read:reports', 'read:hr']
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('\n' + '='.repeat(80));
console.log('✅ TEST TOKEN GENERATED');
console.log('='.repeat(80));
console.log('\n📋 COPY THIS TOKEN:\n');
console.log(token);
console.log('\n' + '='.repeat(80));
console.log('\n🔧 PASTE THIS IN BROWSER CONSOLE:\n');
console.log(`localStorage.setItem('auth_token', '${token}');`);
console.log(`localStorage.setItem('token', '${token}');`);
console.log('location.reload();');
console.log('\n' + '='.repeat(80) + '\n');

