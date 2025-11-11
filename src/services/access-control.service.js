import { logger as defaultLogger } from '../utils/logger.util.js';

const MASK_PLACEHOLDER = '[REDACTED]';

function matchesConditions(attributes = {}, conditions = {}) {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;
  }

  return Object.entries(conditions).every(([key, conditionValue]) => {
    const attributeValue = attributes[key];

    if (attributeValue === undefined || attributeValue === null) {
      return false;
    }

    if (Array.isArray(conditionValue)) {
      return conditionValue.includes(attributeValue);
    }

    if (typeof conditionValue === 'object' && conditionValue !== null) {
      return Object.entries(conditionValue).every(([operator, expected]) => {
        switch (operator) {
          case 'eq':
            return attributeValue === expected;
          case 'neq':
            return attributeValue !== expected;
          case 'in':
            return Array.isArray(expected) && expected.includes(attributeValue);
          case 'nin':
            return Array.isArray(expected) && !expected.includes(attributeValue);
          case 'gte':
            return Number(attributeValue) >= Number(expected);
          case 'lte':
            return Number(attributeValue) <= Number(expected);
          case 'gt':
            return Number(attributeValue) > Number(expected);
          case 'lt':
            return Number(attributeValue) < Number(expected);
          default:
            return false;
        }
      });
    }

    return attributeValue === conditionValue;
  });
}

let defaultPrismaPromise = null;

async function resolveDefaultPrisma() {
  if (!defaultPrismaPromise) {
    const module = await import('../config/database.config.js');
    defaultPrismaPromise = module.prisma;
  }

  return defaultPrismaPromise;
}

class AccessControlService {
  constructor({ prismaClient = null, logger = defaultLogger } = {}) {
    this.prismaProvider = prismaClient
      ? () => Promise.resolve(prismaClient)
      : () => resolveDefaultPrisma();
    this.logger = logger;
  }

  async checkRBAC({ tenantId, userRoles = [], resourceType, permission, resourceId = null }) {
    try {
      const prisma = await this.prismaProvider();

      const rules = await prisma.accessControlRule.findMany({
        where: {
          tenantId,
          ruleType: 'RBAC',
          isActive: true,
          resourceType,
          permission,
        },
      });

      const rolesSet = new Set(userRoles);
      const match = rules.find((rule) => {
        const roleMatch = rolesSet.has(rule.subjectId);
        const resourceMatch = rule.resourceId === null || rule.resourceId === resourceId;
        return roleMatch && resourceMatch;
      });

      if (match) {
        return { allowed: true, rule: match };
      }

      return {
        allowed: false,
        reason: 'No RBAC rule matched the provided roles and resource.',
      };
    } catch (error) {
      this.logger.error('RBAC evaluation failed', { error: error.message, tenantId, resourceType, permission });
      return {
        allowed: false,
        reason: 'RBAC evaluation error.',
        error,
      };
    }
  }

  async checkABAC({ tenantId, attributes = {}, resourceType, permission, resourceId = null }) {
    try {
      const prisma = await this.prismaProvider();

      const rules = await prisma.accessControlRule.findMany({
        where: {
          tenantId,
          ruleType: 'ABAC',
          isActive: true,
          resourceType,
          permission,
        },
      });

      if (rules.length === 0) {
        return {
          allowed: true,
          reason: 'No ABAC rules defined for resource.',
        };
      }

      const match = rules.find((rule) => {
        const resourceMatch = rule.resourceId === null || rule.resourceId === resourceId;
        return resourceMatch && matchesConditions(attributes, rule.conditions || {});
      });

      if (match) {
        return { allowed: true, rule: match };
      }

      return {
        allowed: false,
        reason: 'ABAC conditions not met for provided attributes.',
      };
    } catch (error) {
      this.logger.error('ABAC evaluation failed', { error: error.message, tenantId, resourceType, permission });
      return {
        allowed: false,
        reason: 'ABAC evaluation error.',
        error,
      };
    }
  }

  async checkContentPermissions({ tenantId, resourceType, resourceId, permission, userRoles = [] }) {
    try {
      const prisma = await this.prismaProvider();

      const rules = await prisma.accessControlRule.findMany({
        where: {
          tenantId,
          ruleType: 'content_permission',
          isActive: true,
          resourceType,
          permission,
        },
      });

      const allowedRoles = new Set(userRoles);

      const match = rules.find((rule) => {
        const resourceMatch = rule.resourceId === null || rule.resourceId === resourceId;
        if (!resourceMatch) {
          return false;
        }

        const ruleConditions = rule.conditions || {};

        if (Array.isArray(ruleConditions.allowedRoles) && ruleConditions.allowedRoles.length > 0) {
          return ruleConditions.allowedRoles.some((role) => allowedRoles.has(role));
        }

        if (Array.isArray(ruleConditions.deniedRoles) && ruleConditions.deniedRoles.length > 0) {
          return !ruleConditions.deniedRoles.some((role) => allowedRoles.has(role));
        }

        return true;
      });

      if (match) {
        return { allowed: true, rule: match };
      }

      return {
        allowed: false,
        reason: 'No content permission rule allows access for the provided roles.',
      };
    } catch (error) {
      this.logger.error('Content permission evaluation failed', {
        error: error.message,
        tenantId,
        resourceType,
        resourceId,
      });
      return {
        allowed: false,
        reason: 'Content permission evaluation error.',
        error,
      };
    }
  }

  async evaluatePolicies({ tenantId, userRoles = [], attributes = {}, resourceType, resourceId, permission }) {
    const results = {};

    const rbacResult = await this.checkRBAC({
      tenantId,
      userRoles,
      resourceType,
      resourceId,
      permission,
    });
    results.rbac = rbacResult;
    if (!rbacResult.allowed) {
      return {
        allowed: false,
        reason: rbacResult.reason,
        details: results,
      };
    }

    const abacResult = await this.checkABAC({
      tenantId,
      attributes,
      resourceType,
      resourceId,
      permission,
    });
    results.abac = abacResult;
    if (!abacResult.allowed) {
      return {
        allowed: false,
        reason: abacResult.reason,
        details: results,
      };
    }

    const contentResult = await this.checkContentPermissions({
      tenantId,
      resourceType,
      resourceId,
      permission,
      userRoles,
    });
    results.content = contentResult;
    if (!contentResult.allowed) {
      return {
        allowed: false,
        reason: contentResult.reason,
        details: results,
      };
    }

    return {
      allowed: true,
      details: results,
    };
  }

  async applyFieldMasking({ tenantId, resourceType, resourceId, data, userRoles = [], permission = 'read' }) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const { rule } = await this.checkContentPermissions({
      tenantId,
      resourceType,
      resourceId,
      permission,
      userRoles,
    });

    if (!rule || !rule.conditions || !Array.isArray(rule.conditions.maskFields)) {
      return { ...data };
    }

    const masked = { ...data };
    for (const field of rule.conditions.maskFields) {
      if (field in masked) {
        masked[field] = MASK_PLACEHOLDER;
      }
    }

    return masked;
  }

  async getAccessibleContent({ tenantId, items = [], userRoles = [], permission = 'read' }) {
    const accessibleItems = [];

    for (const item of items) {
      try {
        const evaluation = await this.evaluatePolicies({
          tenantId,
          userRoles,
          attributes: item.attributes || {},
          resourceType: item.resourceType,
          resourceId: item.resourceId,
          permission,
        });

        if (!evaluation.allowed) {
          this.logger.info('Content filtered due to access control', {
            tenantId,
            resourceId: item.resourceId,
            reason: evaluation.reason,
          });
          continue;
        }

        const maskedData = await this.applyFieldMasking({
          tenantId,
          resourceType: item.resourceType,
          resourceId: item.resourceId,
          data: item.data,
          userRoles,
          permission,
        });

        accessibleItems.push({
          ...item,
          data: maskedData,
        });
      } catch (error) {
        this.logger.error('Failed to evaluate content access', {
          error: error.message,
          tenantId,
          resourceId: item.resourceId,
        });
      }
    }

    return accessibleItems;
  }

  async logAccessAttempt({ tenantId, userId, action, resourceType, resourceId, decision, metadata = {} }) {
    try {
      const prisma = await this.prismaProvider();

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action,
          resourceType,
          resourceId,
          details: {
            decision,
            metadata,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to log access attempt', {
        error: error.message,
        tenantId,
        resourceType,
        resourceId,
      });
    }
  }
}

const accessControlService = new AccessControlService();

export { AccessControlService, accessControlService };

