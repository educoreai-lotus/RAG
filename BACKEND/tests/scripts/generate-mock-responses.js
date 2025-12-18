/**
 * Generate mock responses from DATA_STRUCTURE_REPORT.json files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaDir = path.join(__dirname, '../../src/config/microservices');
const outputDir = path.join(__dirname, '../fixtures/mock-responses');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read all schema files
const schemaFiles = fs.readdirSync(schemaDir)
  .filter(f => f.endsWith('.json') && !f.startsWith('_'));

console.log(`Found ${schemaFiles.length} schema files`);

schemaFiles.forEach(file => {
  const serviceName = file.replace('.json', '');
  const schemaPath = path.join(schemaDir, file);
  
  try {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    let schema;
    
    try {
      schema = JSON.parse(schemaContent);
    } catch (parseError) {
      console.error(`❌ Invalid JSON in ${serviceName}: ${parseError.message}`);
      return;
    }

    // Skip placeholder files
    if (schema._status === 'pending') {
      console.log(`Skipping placeholder: ${serviceName}`);
      return;
    }

    console.log(`Generating mock for: ${serviceName}`);

    // Create 2 sample items based on schema
    const items = [
      createMockItem(schema, 1),
      createMockItem(schema, 2)
    ];

    // Wrap in Coordinator format
    const mockResponse = {
      description: `Mock response for ${schema.description || serviceName}`,
      coordinator_wrapped: {
        request: {
          request_id: 'test-123',
          user_query: 'Show recent items'
        },
        aiRanking: [],
        cascadeAttempts: [
          {
            service: serviceName,
            success: true
          }
        ],
        successfulResult: {
          data: items
        },
        metadata: {
          routing_metadata: {
            selected_service: serviceName
          },
          timestamp: new Date().toISOString()
        }
      }
    };

    // Save mock response
    const outputPath = path.join(outputDir, file);
    fs.writeFileSync(outputPath, JSON.stringify(mockResponse, null, 2));

    console.log(`✅ Created: ${serviceName}.json`);
  } catch (fileError) {
    console.error(`❌ Error processing ${serviceName}: ${fileError.message}`);
  }
});

/**
 * Create mock item based on schema
 */
function createMockItem(schema, index) {
  const item = {};

  // Use sample_data as base if available
  const sample = schema.sample_data || {};

  for (const [fieldName, fieldType] of Object.entries(schema.data_structure)) {
    // Use sample data if available
    if (sample[fieldName] !== undefined) {
      item[fieldName] = modifySampleValue(sample[fieldName], index);
    } else {
      // Generate mock value based on type
      item[fieldName] = generateMockValue(fieldName, fieldType, index);
    }
  }

  return item;
}

/**
 * Modify sample value to create variations
 */
function modifySampleValue(value, index) {
  if (typeof value === 'string') {
    // Append index to strings
    return value.replace(/\d+/g, (match) => {
      const num = parseInt(match);
      return (num + index - 1).toString();
    });
  }

  if (typeof value === 'number') {
    return value + (index - 1) * 10;
  }

  // Deep clone objects and arrays
  if (typeof value === 'object' && value !== null) {
    return JSON.parse(JSON.stringify(value));
  }

  return value;
}

/**
 * Generate mock value based on type
 */
function generateMockValue(fieldName, fieldType, index) {
  switch (fieldType) {
    case 'string':
      return `${fieldName}-${index}`;
    case 'text':
      return `Sample text for ${fieldName} ${index}`;
    case 'number':
    case 'integer':
      return index * 100;
    case 'boolean':
      return index % 2 === 0;
    case 'datetime':
      return new Date().toISOString();
    case 'date':
      return new Date().toISOString().split('T')[0];
    case 'object':
      return { key: `value-${index}` };
    case 'array':
      return [`item-${index}-1`, `item-${index}-2`];
    default:
      return null;
  }
}

console.log('\n✅ Mock response generation complete!');

