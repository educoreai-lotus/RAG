/**
 * RESPONSE BUILDER
 * Builds user-friendly responses using LLM
 */

import { openai } from '../config/openai.config.js';
import { logger } from '../utils/logger.util.js';

class ResponseBuilder {
  /**
   * Build response for user query
   */
  async buildResponse(items, userQuery, schema) {
    // Build context from items
    const context = this.buildContext(items, schema);

    // Call LLM to generate response
    const response = await this.callLLM(context, userQuery, schema);

    return response;
  }

  /**
   * Build context from items
   */
  buildContext(items, schema) {
    const parts = [];

    for (const item of items) {
      const itemParts = [];

      for (const [fieldName, fieldType] of Object.entries(schema.data_structure)) {
        const value = item[fieldName];
        if (!value) continue;

        const description = schema.field_descriptions?.[fieldName] || fieldName;
        itemParts.push(`${description}: ${this.formatValue(value, fieldType)}`);
      }

      parts.push(itemParts.join('\n'));
    }

    return parts.join('\n\n---\n\n');
  }

  /**
   * Format value for display
   */
  formatValue(value, type) {
    switch (type) {
      case 'datetime':
        return new Date(value).toLocaleString();
      case 'object':
      case 'array':
        return JSON.stringify(value, null, 2);
      default:
        return value;
    }
  }

  /**
   * Call LLM to generate response
   */
  async callLLM(context, userQuery, schema) {
    try {
      const serviceDescription = schema.description || schema.service_name;
      
      const systemPrompt = `You are a helpful assistant providing information from ${serviceDescription}.
Your task is to answer user questions based on the provided context.
Be concise, accurate, and helpful. If the context doesn't contain enough information, say so.`;

      const userPrompt = `Context from ${serviceDescription}:
${context}

User question: ${userQuery}

Please provide a helpful answer based on the context above.`;

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const answer = completion.choices[0]?.message?.content || 'I could not generate a response.';

      logger.debug('LLM response generated', {
        service: schema.service_name,
        query: userQuery,
        answer_length: answer.length
      });

      return answer;
    } catch (error) {
      logger.error('LLM response generation failed', {
        service: schema.service_name,
        query: userQuery,
        error: error.message
      });

      // Fallback: return formatted context
      return `Based on ${schema.description || schema.service_name}:\n\n${context}`;
    }
  }
}

export default new ResponseBuilder();

