import { jest } from '@jest/globals';
import { AccessControlService } from '../../../src/services/access-control.service.js';
import rbacPolicies from '../../fixtures/mock-data/rbac-policies.js';
import abacPolicies from '../../fixtures/mock-data/abac-policies.js';
import contentPermissions from '../../fixtures/mock-data/content-permissions.js';

describe('AccessControlService', () => {
  const tenantId = 'tenant-123';
  let prismaMock;
  let loggerMock;
  let service;

  beforeEach(() => {
    prismaMock = {
      accessControlRule: {
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    loggerMock = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    service = new AccessControlService({
      prismaClient: prismaMock,
      logger: loggerMock,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRBAC', () => {
    it('allows access when a matching RBAC rule exists', async () => {
      prismaMock.accessControlRule.findMany.mockResolvedValueOnce([rbacPolicies[0]]);

      const result = await service.checkRBAC({
        tenantId,
        userRoles: ['trainer'],
        resourceType: 'course',
        permission: 'read',
        resourceId: null,
      });

      expect(prismaMock.accessControlRule.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          ruleType: 'RBAC',
          isActive: true,
          resourceType: 'course',
          permission: 'read',
        },
      });
      expect(result.allowed).toBe(true);
      expect(result.rule).toEqual(rbacPolicies[0]);
    });

    it('denies access when no RBAC rule matches', async () => {
      prismaMock.accessControlRule.findMany.mockResolvedValueOnce([]);

      const result = await service.checkRBAC({
        tenantId,
        userRoles: ['learner'],
        resourceType: 'course',
        permission: 'write',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/No RBAC rule/);
    });
  });

  describe('checkABAC', () => {
    it('allows access when attributes satisfy ABAC conditions', async () => {
      prismaMock.accessControlRule.findMany.mockResolvedValueOnce([abacPolicies[0]]);

      const result = await service.checkABAC({
        tenantId,
        attributes: {
          department: 'Engineering',
          region: 'US',
          seniority: 4,
        },
        resourceType: 'report',
        permission: 'read',
      });

      expect(result.allowed).toBe(true);
      expect(result.rule).toEqual(abacPolicies[0]);
    });

    it('denies access when attributes do not satisfy conditions', async () => {
      prismaMock.accessControlRule.findMany.mockResolvedValueOnce([abacPolicies[0]]);

      const result = await service.checkABAC({
        tenantId,
        attributes: {
          department: 'Finance',
          region: 'US',
          seniority: 1,
        },
        resourceType: 'report',
        permission: 'read',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/ABAC conditions not met/);
    });
  });

  describe('checkContentPermissions', () => {
    it('allows access when content permission rule matches resource', async () => {
      prismaMock.accessControlRule.findMany.mockResolvedValueOnce([contentPermissions[0]]);

      const result = await service.checkContentPermissions({
        tenantId,
        resourceType: 'course',
        resourceId: 'course-advanced-js',
        permission: 'read',
        userRoles: ['trainer'],
      });

      expect(result.allowed).toBe(true);
      expect(result.rule).toEqual(contentPermissions[0]);
    });

    it('denies access when content permission rule denies role', async () => {
      prismaMock.accessControlRule.findMany.mockResolvedValueOnce([contentPermissions[1]]);

      const result = await service.checkContentPermissions({
        tenantId,
        resourceType: 'course',
        resourceId: 'course-sensitive-ai',
        permission: 'read',
        userRoles: ['learner'],
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/No content permission/);
    });
  });

  describe('evaluatePolicies', () => {
    it('returns allowed when RBAC, ABAC, and content permissions all pass', async () => {
      prismaMock.accessControlRule.findMany
        .mockResolvedValueOnce([rbacPolicies[0]]) // RBAC
        .mockResolvedValueOnce([abacPolicies[0]]) // ABAC
        .mockResolvedValueOnce([contentPermissions[0]]); // Content

      const result = await service.evaluatePolicies({
        tenantId,
        userRoles: ['trainer'],
        attributes: {
          department: 'Engineering',
          region: 'US',
          seniority: 4,
        },
        resourceType: 'course',
        resourceId: 'course-advanced-js',
        permission: 'read',
      });

      expect(result.allowed).toBe(true);
      expect(result.details.rbac.allowed).toBe(true);
      expect(result.details.abac.allowed).toBe(true);
      expect(result.details.content.allowed).toBe(true);
    });

    it('returns denied when any policy fails', async () => {
      prismaMock.accessControlRule.findMany
        .mockResolvedValueOnce([rbacPolicies[0]]) // RBAC passes
        .mockResolvedValueOnce([abacPolicies[0]]) // ABAC fails
        .mockResolvedValueOnce([contentPermissions[0]]);

      const result = await service.evaluatePolicies({
        tenantId,
        userRoles: ['trainer'],
        attributes: {
          department: 'Finance',
          region: 'US',
          seniority: 1,
        },
        resourceType: 'course',
        resourceId: 'course-advanced-js',
        permission: 'read',
      });

      expect(result.allowed).toBe(false);
      expect(result.details.abac.allowed).toBe(false);
      expect(result.reason).toMatch(/ABAC/);
    });
  });

  describe('applyFieldMasking', () => {
    it('masks fields according to masking rules', async () => {
      prismaMock.accessControlRule.findMany.mockResolvedValueOnce([contentPermissions[0]]);

      const record = {
        title: 'Advanced JS',
        instructorNotes: 'Use this carefully',
        salaryBand: 'Level 6',
      };

      const result = await service.applyFieldMasking({
        tenantId,
        resourceType: 'course',
        resourceId: 'course-advanced-js',
        data: record,
        userRoles: ['trainer'],
      });

      expect(result.instructorNotes).toBe('[REDACTED]');
      expect(result.salaryBand).toBe('[REDACTED]');
      expect(result.title).toBe('Advanced JS');
    });
  });

  describe('getAccessibleContent', () => {
    it('filters content items based on policy evaluation and applies masking', async () => {
      const accessibleRecord = {
        id: 'course-1',
        resourceType: 'course',
        resourceId: 'course-advanced-js',
        data: {
          title: 'Advanced JS',
          instructorNotes: 'Only for trainers',
        },
        attributes: {
          department: 'Engineering',
          region: 'US',
          seniority: 4,
        },
      };

      const inaccessibleRecord = {
        id: 'course-2',
        resourceType: 'course',
        resourceId: 'course-sensitive-ai',
        data: {
          title: 'Sensitive AI',
          instructorNotes: 'Restricted',
        },
        attributes: {
          department: 'Engineering',
          region: 'US',
          seniority: 4,
        },
      };

      const evaluateSpy = jest.spyOn(service, 'evaluatePolicies');
      evaluateSpy
        .mockResolvedValueOnce({
          allowed: true,
          details: { rbac: { allowed: true }, abac: { allowed: true }, content: { allowed: true } },
        })
        .mockResolvedValueOnce({
          allowed: false,
          reason: 'Content permission denied',
          details: {
            rbac: { allowed: true },
            abac: { allowed: true },
            content: { allowed: false },
          },
        });

      jest.spyOn(service, 'applyFieldMasking').mockImplementation(async ({ data }) => ({
        ...data,
        instructorNotes: '[REDACTED]',
      }));

      const result = await service.getAccessibleContent({
        tenantId,
        items: [accessibleRecord, inaccessibleRecord],
        userRoles: ['trainer'],
        permission: 'read',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('course-1');
      expect(result[0].data.instructorNotes).toBe('[REDACTED]');
    });
  });

  describe('logAccessAttempt', () => {
    it('writes audit log entry for access attempt', async () => {
      prismaMock.auditLog.create.mockResolvedValueOnce({});

      await service.logAccessAttempt({
        tenantId,
        userId: 'user-123',
        action: 'ACCESS_CHECK',
        resourceType: 'course',
        resourceId: 'course-advanced-js',
        decision: 'ALLOW',
        metadata: { permission: 'read' },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          userId: 'user-123',
          action: 'ACCESS_CHECK',
          resourceType: 'course',
          resourceId: 'course-advanced-js',
          details: {
            decision: 'ALLOW',
            metadata: { permission: 'read' },
          },
        },
      });
    });
  });
});

