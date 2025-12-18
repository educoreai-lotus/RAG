/**
 * Test script to verify schema loader works correctly
 */

import schemaLoader from '../src/core/schemaLoader.js';
import { logger } from '../src/utils/logger.util.js';

async function testSchemaLoader() {
  console.log('🧪 Testing Schema Loader...\n');

  try {
    // Reload schemas
    schemaLoader.reload();

    // Get available services
    const services = schemaLoader.listServices();
    console.log(`✅ Found ${services.length} service(s) with schemas:\n`);

    for (const serviceName of services) {
      try {
        const schema = schemaLoader.getSchema(serviceName);
        console.log(`📋 Service: ${serviceName}`);
        console.log(`   Description: ${schema.description || 'N/A'}`);
        console.log(`   Version: ${schema.version || 'N/A'}`);
        console.log(`   Fields: ${Object.keys(schema.data_structure).length}`);
        console.log(`   Field names: ${Object.keys(schema.data_structure).join(', ')}\n`);
      } catch (error) {
        console.error(`❌ Error loading schema for ${serviceName}:`, error.message);
      }
    }

    // Test managementreporting-service specifically
    if (schemaLoader.hasSchema('managementreporting-service')) {
      console.log('✅ managementreporting-service schema is loaded!');
      const schema = schemaLoader.getSchema('managementreporting-service');
      console.log('\n📊 Schema details:');
      console.log(JSON.stringify(schema, null, 2));
    } else {
      console.log('❌ managementreporting-service schema NOT found');
      console.log('Available services:', schemaLoader.listServices());
    }

    console.log('\n✅ Schema loader test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testSchemaLoader();

