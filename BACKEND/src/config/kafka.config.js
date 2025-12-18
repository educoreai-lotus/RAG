/**
 * Kafka configuration
 */

import { Kafka } from 'kafkajs';
import { logger } from '../utils/logger.util.js';

const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
const clientId = process.env.KAFKA_CLIENT_ID || 'rag-microservice';

const kafka = new Kafka({
  clientId,
  brokers: kafkaBrokers,
  retry: {
    retries: 8,
    initialRetryTime: 100,
    multiplier: 2,
    maxRetryTime: 30000,
  },
});

// Producer instance
const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000,
});

// Consumer instance
const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || 'rag-microservice-group',
  allowAutoTopicCreation: true,
});

// Connect producer
producer.connect().catch((err) => {
  logger.error('Kafka producer connection error:', err);
});

// Connect consumer
consumer.connect().catch((err) => {
  logger.error('Kafka consumer connection error:', err);
});

export { kafka, producer, consumer };





















