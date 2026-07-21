/**
 * RESPONSE BUILDER
 * Builds user-friendly responses using LLM
 */

import { openai } from '../config/openai.config.js';
import { logger } from '../utils/logger.util.js';
import { buildAnswerDisclosureBlock } from '../utils/answerDisclosure.util.js';

class ResponseBuilder {
  /**
   * Build response for user query
   */
  async buildResponse(items, userQuery, schema, verifiedAuthContext = null) {
    logger.info(
      `[ANSWER DISCLOSURE DEBUG] response_builder_received_auth ${JSON.stringify({
        service: schema?.service_name || null,
        queryPreview:
          typeof userQuery === 'string'
            ? userQuery.substring(0, 120)
            : null,
        itemCount: Array.isArray(items) ? items.length : null,
        isAuthenticated: verifiedAuthContext?.isAuthenticated === true,
        primaryRole: verifiedAuthContext?.primaryRole || null,
        isSystemAdmin: verifiedAuthContext?.isSystemAdmin === true,
        isTrainer: verifiedAuthContext?.isTrainer === true
      })}`
    );

    // 📝 DEBUG: Log response building
    console.log('📝 [ResponseBuilder] Building response with context:', {
      itemCount: items.length,
      queryLength: userQuery.length,
      schema: schema.service_name,
      firstItemKeys: items[0] ? Object.keys(items[0]) : 'none',
    });

    // Build context from items (for formatted display, if needed)
    const context = this.buildContext(items, schema);

    // Call LLM to generate response - MUST pass raw items for full data context
    const response = await this.callLLM(items, userQuery, schema, context, verifiedAuthContext);

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
   * MUST include raw data as JSON for full context
   */
  async callLLM(items, userQuery, schema, formattedContext, verifiedAuthContext = null) {
    try {
      const serviceDescription = schema.description || schema.service_name;
      const answerDisclosureBlock =
        buildAnswerDisclosureBlock(verifiedAuthContext);

      logger.info(
        `[ANSWER DISCLOSURE DEBUG] disclosure_block_built ${JSON.stringify({
          service: schema?.service_name || null,
          queryPreview:
            typeof userQuery === 'string'
              ? userQuery.substring(0, 120)
              : null,
          blockLength: answerDisclosureBlock.length,
          containsVerifiedUserContext:
            answerDisclosureBlock.includes('VERIFIED USER CONTEXT'),
          containsDisclosureRules:
            answerDisclosureBlock.includes('ANSWER DISCLOSURE RULES'),
          containsAuthenticatedStatus:
            answerDisclosureBlock.includes('Authentication status: authenticated'),
          containsRegularRole:
            answerDisclosureBlock.includes(
              `Primary role: ${verifiedAuthContext?.primaryRole || 'unavailable'}`
            ),
          containsSystemAdminFalse:
            answerDisclosureBlock.includes('System administrator: false')
        })}`
      );
      
      const systemPrompt = `You are a helpful assistant providing information from ${serviceDescription}.
Your task is to answer user questions based on the provided context.
Be concise, accurate, and helpful. If the context doesn't contain enough information, say so.

${answerDisclosureBlock}`;

      logger.info(
        `[ANSWER DISCLOSURE DEBUG] final_system_prompt ${JSON.stringify({
          service: schema?.service_name || null,
          queryPreview:
            typeof userQuery === 'string'
              ? userQuery.substring(0, 120)
              : null,
          systemPromptLength: systemPrompt.length,
          includesDisclosureBlock:
            systemPrompt.includes('ANSWER DISCLOSURE RULES'),
          includesVerifiedUserContext:
            systemPrompt.includes('VERIFIED USER CONTEXT')
        })}`
      );

      // 🚨 CRITICAL: The LLM MUST receive the full raw data as JSON context!
      const userPrompt = `Context from microservice:

${JSON.stringify(items, null, 2)}

Question: ${userQuery}

Please answer based on the context above.`;

      logger.info(
        `[ANSWER DISCLOSURE DEBUG] llm_call_start ${JSON.stringify({
          service: schema?.service_name || null,
          queryPreview:
            typeof userQuery === 'string'
              ? userQuery.substring(0, 120)
              : null,
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 1000,
          systemPromptIncludesDisclosure:
            systemPrompt.includes('ANSWER DISCLOSURE RULES'),
          itemCount: Array.isArray(items) ? items.length : null
        })}`
      );

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

      if (
        schema?.service_name === 'managementreporting-service' &&
        verifiedAuthContext?.isAuthenticated === true &&
        verifiedAuthContext?.isSystemAdmin === false
      ) {
        logger.info(
          `[ANSWER DISCLOSURE DEBUG] llm_raw_answer ${JSON.stringify({
            service: schema?.service_name || null,
            queryPreview:
              typeof userQuery === 'string'
                ? userQuery.substring(0, 120)
                : null,
            answer,
            answerLength: answer.length,
            isAuthenticated: verifiedAuthContext?.isAuthenticated === true,
            primaryRole: verifiedAuthContext?.primaryRole || null,
            isSystemAdmin: verifiedAuthContext?.isSystemAdmin === true
          })}`
        );
      }

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

      logger.info(
        `[ANSWER DISCLOSURE DEBUG] llm_fallback_used ${JSON.stringify({
          service: schema?.service_name || null,
          queryPreview:
            typeof userQuery === 'string'
              ? userQuery.substring(0, 120)
              : null,
          errorMessage: error?.message || 'unknown_error'
        })}`
      );

      // Fallback: return formatted context
      return `Based on ${schema.description || schema.service_name}:\n\n${formattedContext}`;
    }
  }
}

export default new ResponseBuilder();

