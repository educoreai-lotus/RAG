# Full-Stack Templates Methodology - Complete Guide

## Overview

The **Full-Stack Templates** system is a comprehensive, intelligent project template framework that guides teams through a structured, TDD-first, traceable development process from initial requirements to deployment. It enforces best practices, ensures quality, and maintains complete audit trails.

**Purpose:** Transform an idea into a production-ready full-stack application through 9 progressive stages with explicit gates, adaptive dialogues, and deterministic logging.

---

## Core Principles

### 1. **Stage-Based Progression**
- 9 sequential stages (Stage_01 → Stage_09)
- Each stage must be completed and approved before unlocking the next
- No skipping or overwriting without explicit approval
- Progress tracked via `ROADMAP.md` and `PROJECT_EVOLUTION_LOG.md`

### 2. **Adaptive Dialogue System**
- Context-aware questioning (only asks for missing information)
- Multi-role pseudo-code dialogues for critical decisions (Stage_01, Stage_02)
- All dialogues stored in `DIALOGUES/` and `SESSION_LOGS/` folders
- Decisions documented with rationale and trade-offs

### 3. **TDD-First Discipline**
- Tests written before implementation (Red-Green-Refactor)
- Coverage targets: ≥80% overall, ≥85% for critical paths
- Test plans created in Stage_04 (Backend) and Stage_05 (Frontend)
- CI/CD enforces coverage gates

### 4. **Complete Traceability**
- Every decision logged in `PROJECT_EVOLUTION_LOG.md`
- Feature registry (`FEATURES_REGISTRY.md`) tracks all features
- Activity logs (`LOGS/FEATURE_ACTIVITY.log`, `LOGS/STAGE_ACTIVITY.log`)
- Global log (`GLOBAL_LOG.md`) for high-level events
- Recovery snapshots in `RECOVERY_POINTS/` before destructive changes

### 5. **Non-Destructive Evolution**
- Recovery points created before major changes
- Feature lifecycle management (Add/Update/Retire)
- Archive system for deprecated features
- Reversible changes via snapshots

---

## Directory Structure

```
FULLSTACK_TEMPLATES/
├── README.md                          # System overview
├── HOW_TO_USE_TEMPLATES.md            # Quick start guide
├── ROADMAP.md                         # Project progress tracker
├── FEATURES_REGISTRY.md               # All features registry
├── PROJECT_EVOLUTION_LOG.md           # Complete decision log
├── GLOBAL_LOG.md                      # High-level activity log
├── GLOBAL_CHECKLIST.md                # Global requirements
├── GLOBAL_ANALYTICS.md                # Progress metrics
├── GLOBAL_FALLBACKS.md                # Error handling strategies
├── FEATURE_LIFECYCLE_MANAGER.prompt   # Feature management system
├── LOGS/
│   ├── FEATURE_ACTIVITY.log           # Feature-level events
│   └── STAGE_ACTIVITY.log             # Stage-level progress
├── RECOVERY_POINTS/                   # Snapshots for rollback
├── FEATURES/                          # Feature-specific code/docs
│   └── <feature_name>/
│       ├── backend/
│       ├── frontend/
│       ├── tests/
│       ├── docs/
│       ├── DIALOGUES/
│       └── SESSION_LOGS/
├── Stage_01_Requirements_and_Planning/
│   ├── CHECKLIST.md
│   ├── REQUIREMENTS_TEMPLATE.prompt
│   ├── USER_STORIES_TEMPLATE.prompt
│   ├── REQUIREMENTS_SUMMARY.md
│   ├── STAGE_01_APPROVAL.md
│   ├── DIALOGUES/
│   └── SESSION_LOGS/
├── Stage_02_System_and_Architecture/
│   ├── CHECKLIST.md
│   ├── ARCHITECTURE_TEMPLATE.prompt
│   ├── TECH_STACK_TEMPLATE.prompt
│   ├── TECH_STACK_DECISION.md
│   ├── ENDPOINTS_SPEC.md
│   ├── STAGE_02_APPROVAL.md
│   └── DIALOGUES/
├── Stage_03_Project_Flow/
│   ├── CHECKLIST.md
│   ├── FLOW_DIAGRAM_TEMPLATE.prompt
│   ├── INTERACTION_LOGIC_TEMPLATE.prompt
│   ├── PROJECT_FLOWS.md
│   └── STAGE_03_APPROVAL.md
├── Stage_04_Backend/
│   ├── CHECKLIST.md
│   ├── TDD_PLAN_TEMPLATE.prompt
│   ├── TDD_PLAN.md
│   ├── API_DESIGN_TEMPLATE.prompt
│   ├── CODE_REVIEW_TEMPLATE.prompt
│   ├── CODE_REVIEW_CHECKLIST.md
│   └── STAGE_04_APPROVAL.md
├── Stage_05_Frontend/
│   ├── CHECKLIST.md
│   ├── TDD_PLAN_TEMPLATE.prompt
│   ├── TDD_PLAN.md
│   ├── COMPONENT_STRUCTURE_TEMPLATE.prompt
│   ├── COMPONENT_STRUCTURE.md
│   ├── UI_FLOW_TEMPLATE.prompt
│   ├── UI_FLOWS.md
│   ├── FRONTEND_SCOPE.md
│   ├── IMPLEMENTATION_SPEC.md
│   ├── CODE_REVIEW_CHECKLIST.md
│   └── STAGE_05_APPROVAL.md
├── Stage_06_Database/
│   ├── CHECKLIST.md
│   ├── DATA_MODEL_TEMPLATE.prompt
│   ├── DATA_MODEL.md
│   ├── SCHEMA_AND_RELATIONS_TEMPLATE.prompt
│   ├── SCHEMA_AND_RELATIONS.md
│   ├── MIGRATION_PLAN.md
│   └── STAGE_06_APPROVAL.md
├── Stage_07_QA_and_Testing/
│   ├── CHECKLIST.md
│   ├── TEST_STRATEGY.md
│   ├── TEST_ENVIRONMENT_SETUP.md
│   ├── INTEGRATION_TEST_PLAN.md
│   ├── E2E_TEST_PLAN.md
│   ├── REGRESSION_AND_SMOKE_TESTS.md
│   ├── CI_CD_GATING_AND_ROLLBACK.md
│   ├── UNIT_TEST_PLAN_TEMPLATE.prompt
│   ├── INTEGRATION_TEST_PLAN_TEMPLATE.prompt
│   └── STAGE_07_APPROVAL.md
├── Stage_08_Implementation/
│   ├── CHECKLIST.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── IMPLEMENTATION_STATUS.md
│   ├── PROJECT_STRUCTURE.md
│   ├── DEVELOPMENT_WORKFLOW.md
│   ├── BACKEND_IMPLEMENTATION_TEMPLATE.prompt
│   ├── FRONTEND_IMPLEMENTATION_TEMPLATE.prompt
│   ├── INTEGRATION_PLAN_TEMPLATE.prompt
│   ├── UPDATE_FEATURE_TEMPLATE.prompt
│   ├── FINAL_CODE_REVIEW_TEMPLATE.prompt
│   └── STAGE_08_APPROVAL.md
└── Stage_09_Deployment/
    ├── CHECKLIST.md
    ├── CLOUD_CONFIG_TEMPLATE.prompt
    ├── DEPLOYMENT_SCRIPT_TEMPLATE.prompt
    ├── GITHUB_ACTIONS_TEMPLATE.yml
    └── STAGE_09_APPROVAL.md
```

---

## Stage-by-Stage Guide

### Stage_01: Requirements & Planning

**Purpose:** Establish clear users, goals, constraints, and success metrics.

**Process:**
1. **Context Scan:** Read `ROADMAP.md`, `PROJECT_EVOLUTION_LOG.md`, `FEATURES_REGISTRY.md`, `GLOBAL_LOG.md`
2. **Adaptive Questions:** Ask only for missing/conflicting information:
   - Target users and personas
   - Primary jobs-to-be-done
   - Non-functional requirements (SLOs, latency, scale, compliance)
   - Risks and constraints (budget, timeline)
   - Success metrics (KPIs, OKRs)
3. **User Stories:** Create user stories with acceptance criteria
4. **Dialogue:** Run multi-role pseudo-code dialogue if needed
5. **Outputs:**
   - `REQUIREMENTS_SUMMARY.md`
   - User stories document
   - Session logs in `SESSION_LOGS/`
   - Dialogue transcripts in `DIALOGUES/` (if applicable)
   - Entry in `PROJECT_EVOLUTION_LOG.md`

**Checklist:**
- [ ] Context scanned and gaps resolved
- [ ] Users, goals, constraints, metrics documented
- [ ] User stories with acceptance criteria created
- [ ] Dialogue transcripts saved (if applicable)
- [ ] Session logs saved
- [ ] Summary appended to `PROJECT_EVOLUTION_LOG.md`
- [ ] Approval recorded to unlock Stage_02

**Unlock Condition:** `CHECKLIST.md` satisfied and approved in `PROJECT_EVOLUTION_LOG.md`

---

### Stage_02: System & Architecture

**Purpose:** Define system architecture, tech stack, and API endpoints.

**Roles:** Architect, Backend Lead, Frontend Lead, AI Engineer, Product Owner, UX Designer

**Process:**
1. **Confirm Roles:** Identify participants for architecture dialogue
2. **Context Scan:** Review requirements, identify conflicts/unknowns
3. **Architecture Dialogue:** Run pseudo-code dialogue to:
   - Propose candidate architectures
   - Discuss trade-offs
   - Reach consensus
4. **Tech Stack Selection:** Choose technologies based on constraints
5. **API Specification:** Generate `ENDPOINTS_SPEC.md` from user stories (use placeholders like `{{API_URL}}`, `{{ENV_TOKEN}}`)
6. **Outputs:**
   - Architecture decision with rationale
   - `TECH_STACK_DECISION.md`
   - `ENDPOINTS_SPEC.md`
   - Dialogue transcript in `DIALOGUES/`
   - Entry in `PROJECT_EVOLUTION_LOG.md`

**Checklist:**
- [ ] Roles confirmed and dialogue completed
- [ ] Architecture selected with rationale
- [ ] Tech stack chosen with constraints considered
- [ ] `ENDPOINTS_SPEC.md` generated (placeholders only, no secrets)
- [ ] Transcript saved in `DIALOGUES/`
- [ ] Summary appended to `PROJECT_EVOLUTION_LOG.md`
- [ ] Approval recorded to unlock Stage_03

**Unlock Condition:** `CHECKLIST.md` satisfied and approved

---

### Stage_03: Project Flow

**Purpose:** Map data flows, user journeys, and interaction logic.

**Process:**
1. **Data Flows:** Document how data moves through the system
2. **User Journeys:** Map user interactions from start to finish
3. **State Machines:** Define state transitions for key processes
4. **Error Handling:** Document error paths and retry strategies
5. **Diagrams:** Create flow diagrams (text or visual)
6. **Outputs:**
   - `PROJECT_FLOWS.md`
   - Flow diagrams
   - Error handling strategies
   - Entry in `PROJECT_EVOLUTION_LOG.md`

**Checklist:**
- [ ] Data and user flows captured
- [ ] Error paths and retries defined
- [ ] Diagrams produced and linked
- [ ] Summary logged to `PROJECT_EVOLUTION_LOG.md`
- [ ] Approval recorded to unlock Stage_04

---

### Stage_04: Backend TDD Planning

**Purpose:** Create comprehensive test plan before implementation.

**Process:**
1. **Test Strategy:** Define unit, integration, and E2E test approach
2. **Test Plans:** Write test specifications for each service
3. **Fixtures & Mocks:** Define test data and mock services
4. **Coverage Targets:** Set coverage goals (≥80% overall, ≥85% critical)
5. **Code Review Checklist:** Create review criteria
6. **Outputs:**
   - `TDD_PLAN.md`
   - Test specifications
   - Code review checklist
   - Entry in `PROJECT_EVOLUTION_LOG.md`

**Checklist:**
- [ ] Test strategy defined
- [ ] Unit test plans created
- [ ] Integration test plans created
- [ ] Coverage targets set (≥80%)
- [ ] Code review checklist created
- [ ] Summary appended to `PROJECT_EVOLUTION_LOG.md`
- [ ] Approval recorded to unlock Stage_05

---

### Stage_05: Frontend TDD Planning

**Purpose:** Create frontend component structure and test plan.

**Process:**
1. **Frontend Scope:** Define what will be built (widget, dashboard, etc.)
2. **Component Structure:** Design component hierarchy
3. **UI Flows:** Map user interface interactions
4. **Test Strategy:** Plan component, integration, and E2E tests
5. **Implementation Spec:** Create detailed implementation guide
6. **Outputs:**
   - `FRONTEND_SCOPE.md`
   - `COMPONENT_STRUCTURE.md`
   - `UI_FLOWS.md`
   - `TDD_PLAN.md`
   - `IMPLEMENTATION_SPEC.md`
   - Code review checklist
   - Entry in `PROJECT_EVOLUTION_LOG.md`

**Checklist:**
- [ ] Frontend scope defined
- [ ] Component structure designed
- [ ] UI flows mapped
- [ ] Test plan created (≥80% coverage)
- [ ] Implementation spec written
- [ ] Code review checklist created
- [ ] Summary appended to `PROJECT_EVOLUTION_LOG.md`
- [ ] Approval recorded to unlock Stage_06

---

### Stage_06: Database Design

**Purpose:** Design database schema, relations, and migrations.

**Process:**
1. **Data Model:** Define entities and relationships
2. **Schema Design:** Create Prisma schema (or equivalent)
3. **Indexes & Constraints:** Optimize for performance and data integrity
4. **Migration Plan:** Plan database migrations
5. **Seed Data:** Plan initial data seeding
6. **Outputs:**
   - `DATA_MODEL.md`
   - `SCHEMA_AND_RELATIONS.md`
   - `MIGRATION_PLAN.md`
   - Prisma schema file
   - Entry in `PROJECT_EVOLUTION_LOG.md`

**Checklist:**
- [ ] Entities and relations defined
- [ ] Schema and migrations outlined
- [ ] Indexes and constraints designed
- [ ] Seeds plan written
- [ ] Summary logged to `PROJECT_EVOLUTION_LOG.md`
- [ ] Approval recorded to unlock Stage_07

---

### Stage_07: QA and Testing

**Purpose:** Create comprehensive testing strategy and CI/CD gates.

**Process:**
1. **Test Strategy:** Define test pyramid (unit 60%, integration 30%, E2E 10%)
2. **Test Environment:** Set up Docker Compose, mocks, test helpers
3. **Integration Tests:** Plan API, database, cache, message queue tests
4. **E2E Tests:** Plan end-to-end scenarios
5. **Regression & Smoke Tests:** Define test suites
6. **CI/CD Gating:** Set up lint → build → test → deploy pipeline
7. **Rollback Criteria:** Define automatic and manual rollback triggers
8. **Outputs:**
   - `TEST_STRATEGY.md`
   - `TEST_ENVIRONMENT_SETUP.md`
   - `INTEGRATION_TEST_PLAN.md`
   - `E2E_TEST_PLAN.md`
   - `REGRESSION_AND_SMOKE_TESTS.md`
   - `CI_CD_GATING_AND_ROLLBACK.md`
   - Entry in `PROJECT_EVOLUTION_LOG.md`

**Checklist:**
- [ ] Unit and integration plans completed
- [ ] E2E test plan created
- [ ] Regression and smoke tests defined
- [ ] CI/CD gating and rollback criteria documented
- [ ] Test environment setup documented
- [ ] Summary logged to `PROJECT_EVOLUTION_LOG.md`
- [ ] Approval recorded to unlock Stage_08

---

### Stage_08: Implementation

**Purpose:** Implement the system using TDD methodology.

**TDD Process (Red-Green-Refactor):**
1. **Red:** Write failing test
2. **Green:** Write minimal code to pass test
3. **Refactor:** Improve code while keeping tests green
4. **Repeat:** Continue for next feature

**Implementation Order:**
1. **Phase 1: Foundation** (Week 1-2)
   - Project setup (Node.js, Prisma, Jest, ESLint, Docker)
   - Database implementation
   - Core infrastructure (logger, cache, retry, validation)

2. **Phase 2: Core Services** (Week 3-4)
   - Access Control Service (P0 - Critical)
   - Vector Retrieval Service (P0 - Critical)
   - Query Processing Service (P0 - Critical)

3. **Phase 3: API Layer** (Week 5)
   - gRPC services implementation
   - Controllers and middleware

4. **Phase 4: Advanced Features** (Week 6)
   - Personalized Assistance
   - Knowledge Graph integration
   - Context-specific services

5. **Phase 5: Frontend** (Week 7)
   - Component implementation
   - State management
   - API integration

6. **Phase 6: Integration & Testing** (Week 8)
   - End-to-end integration
   - Performance testing
   - Security audit

**Development Workflow:**
- **Branch Strategy:** `main` (production), `develop` (integration), `feature/*`, `fix/*`, `hotfix/*`
- **Commit Convention:** `type(scope): description` (feat, fix, test, refactor, docs, chore, style, perf)
- **Pull Request Process:** Create PR → Code review (2 reviewers) → CI/CD checks → Merge
- **Coverage Requirement:** ≥80% overall, ≥85% critical paths

**Outputs:**
- `IMPLEMENTATION_PLAN.md`
- `IMPLEMENTATION_STATUS.md`
- `PROJECT_STRUCTURE.md`
- `DEVELOPMENT_WORKFLOW.md`
- All code files
- Entry in `PROJECT_EVOLUTION_LOG.md`

**Checklist:**
- [ ] Foundation complete
- [ ] Core services implemented with tests
- [ ] API layer complete
- [ ] Frontend implemented
- [ ] Integration tests passing
- [ ] Coverage targets met (≥80%)
- [ ] Summary logged to `PROJECT_EVOLUTION_LOG.md`
- [ ] Approval recorded to unlock Stage_09

---

### Stage_09: Deployment

**Purpose:** Deploy to production with CI/CD automation.

**Process:**
1. **CI/CD Pipeline:** Configure GitHub Actions (or equivalent)
   - Lint → Build → Test → Deploy
   - Rollback on smoke test failure
2. **Environment Configuration:** Use environment variables (no secrets in code)
3. **Cloud Configuration:** Set up cloud infrastructure
4. **Deployment Scripts:** Create deployment automation
5. **Smoke Tests:** Verify deployment success
6. **Monitoring:** Set up logging and monitoring

**Outputs:**
- `GITHUB_ACTIONS_TEMPLATE.yml`
- Cloud configuration files
- Deployment scripts
- Entry in `PROJECT_EVOLUTION_LOG.md`

**Checklist:**
- [ ] CI/CD pipeline configured and green
- [ ] Environment variables configured (no secrets in code)
- [ ] Smoke tests pass
- [ ] Rollback plan tested
- [ ] Monitoring configured
- [ ] Summary logged to `PROJECT_EVOLUTION_LOG.md`
- [ ] Deployment approved

---

## Feature Lifecycle Management

### Adding a Feature

1. **Context Scan:** Detect name collisions, overlaps, architectural fit
2. **Adaptive Questions:** Feature goal, owner, priority, dependencies
3. **Actions:**
   - Create `/features/<feature_name>/` structure
   - Register in `FEATURES_REGISTRY.md`
   - Initialize TDD hooks
   - Save session log
   - Create recovery snapshot
4. **Checklist:** Dependencies analyzed, structure generated, feature registered, TDD hooks initialized, dialogue log created, commit to evolution log

### Updating a Feature

1. **Pre-Update Scan:** Identify impacted modules, shared logic, contracts
2. **Adaptive Questions:** Scope, risk level, backward compatibility
3. **Actions:**
   - Create recovery snapshot
   - Apply changes in isolated scope
   - Update tests, run regression
   - Update registry and logs
4. **Checklist:** Dependency scan, impact analysis, recovery snapshot, update executed, regression tests passed, log entries updated

### Retiring a Feature

1. **Analysis:** Ensure no active dependencies
2. **Actions:**
   - Archive to `/ARCHIVE/features/<feature_name>/`
   - Mark as Inactive/Archived in registry
   - Update logs, snapshot current state
3. **Checklist:** Feature archived, dependencies cleared, registry updated, changelog finalized, log entries confirmed

---

## Logging and Traceability

### PROJECT_EVOLUTION_LOG.md

Format: `{{TIMESTAMP}} | {{AUTHOR}} | {{ACTION_TYPE}} | {{STAGE}} | Files: {{FILES}} | Summary: {{DECISION_SUMMARY}} | Commit: {{COMMIT_SHA}}`

**Action Types:**
- `INIT` - Initialization
- `ADD` - Adding new component
- `UPDATE` - Updating existing component
- `COMPLETE` - Stage/feature completion
- `APPROVE` - Approval decision

**Example:**
```
2025-01-27 | Project Team | COMPLETE | Stage_05 | Files: FRONTEND/src/components/chatbot/*, tailwind.config.js | Summary: Completed Frontend Chatbot UI Implementation with TailwindCSS, Framer Motion, 6 React components, mock bot logic | Commit: FRONTEND_UI_COMPLETE
```

### FEATURES_REGISTRY.md

Format: `ID | Name | Owner | Status | Dependencies | Stage`

**Status Values:**
- `Planned` - Feature planned but not started
- `Active` - Feature in development
- `Done` - Feature completed
- `Archived` - Feature deprecated/removed

**Example:**
```
- F-0016 | Frontend Chatbot UI Widget | Project Team | Done | None | Stage_05
```

### Activity Logs

**FEATURE_ACTIVITY.log:**
```
{{TIMESTAMP}} | {{CATEGORY}} | {{DESCRIPTION}}
```

**STAGE_ACTIVITY.log:**
```
{{TIMESTAMP}} | {{STATUS}} | {{STAGE}} | {{DESCRIPTION}}
```

**GLOBAL_LOG.md:**
```
{{TIMESTAMP}} | {{AUTHOR}} | {{ACTION}} | {{STAGE}} | {{SUMMARY}}
```

---

## Key Rules and Constraints

### Stage Unlocking Rules

1. **Sequential Progression:** Stages unlock only after prior stage validation
2. **Approval Required:** Each stage requires explicit approval in `PROJECT_EVOLUTION_LOG.md`
3. **No Skipping:** Cannot skip or overwrite stages without explicit user approval
4. **Checklist Validation:** `CHECKLIST.md` must be satisfied before approval

### TDD Discipline

1. **Test First:** Write tests before implementation
2. **Coverage Gates:** ≥80% overall, ≥85% for critical paths
3. **CI/CD Enforcement:** Coverage gates enforced in CI/CD pipeline
4. **Test Plans:** TDD plans created in Stage_04 (Backend) and Stage_05 (Frontend)

### Code Review Requirements

1. **Two Reviewers:** Minimum 2 reviewers per PR
2. **Checklist:** Use stage-specific code review checklists
3. **CI/CD Checks:** All CI/CD checks must pass before merge
4. **Coverage:** Coverage must not decrease

### Security and Secrets

1. **No Secrets in Code:** Use environment variables only
2. **Placeholders:** Use `{{API_URL}}`, `{{ENV_TOKEN}}` in specs
3. **Environment Files:** `.env.example` with placeholders only
4. **Secrets Management:** Use secure secret management in production

### Recovery and Rollback

1. **Recovery Snapshots:** Create snapshots before destructive changes
2. **Feature Updates:** Snapshot before updating features
3. **Rollback Plan:** Document rollback procedures in CI/CD
4. **Archive System:** Archive deprecated features, don't delete

---

## Usage Instructions

### Starting a New Project

1. **Initialize Structure:**
   ```bash
   mkdir FULLSTACK_TEMPLATES
   cd FULLSTACK_TEMPLATES
   # Copy template structure
   ```

2. **Start Stage_01:**
   - Open `Stage_01_Requirements_and_Planning/REQUIREMENTS_TEMPLATE.prompt`
   - Run the prompt with Cursor AI
   - Answer adaptive questions
   - Save session logs
   - Complete checklist
   - Record approval in `PROJECT_EVOLUTION_LOG.md`

3. **Proceed Sequentially:**
   - Complete each stage's checklist
   - Get approval before moving to next stage
   - Update `ROADMAP.md` progress
   - Log all decisions

### Working with Features

1. **Add Feature:**
   - Use `FEATURE_LIFECYCLE_MANAGER.prompt`
   - Follow Add Feature process
   - Create feature structure
   - Register in `FEATURES_REGISTRY.md`

2. **Update Feature:**
   - Create recovery snapshot
   - Update in isolated scope
   - Run regression tests
   - Update logs

3. **Retire Feature:**
   - Check dependencies
   - Archive to `/ARCHIVE/`
   - Update registry
   - Update logs

### Maintaining Logs

1. **After Each Stage:**
   - Append entry to `PROJECT_EVOLUTION_LOG.md`
   - Update `ROADMAP.md` progress percentage
   - Update `FEATURES_REGISTRY.md` if features added
   - Add to `GLOBAL_LOG.md` for major milestones

2. **After Feature Changes:**
   - Log in `LOGS/FEATURE_ACTIVITY.log`
   - Update `FEATURES_REGISTRY.md`
   - Append to `PROJECT_EVOLUTION_LOG.md`

3. **Regular Updates:**
   - Keep `ROADMAP.md` current
   - Update `GLOBAL_ANALYTICS.md` metrics
   - Review and clean up old logs periodically

---

## Example: RAG Microservice Project

### Stage_01 Completion
- **Users:** 5 personas (Learner, Trainer, HR Manager, Admin, API Consumer)
- **User Stories:** 20 stories (177 story points), 9 epics
- **Performance:** ≤3s response, 200 QPS, 100K users
- **Tech Constraints:** Node.js/JavaScript, PostgreSQL+PGVector, gRPC, Kafka, Redis
- **Compliance:** GDPR, Multi-tenant, OAuth2/JWT
- **Timeline:** 8 weeks MVP

### Stage_02 Completion
- **Architecture:** Hybrid Layered + Event-Driven (6 core services)
- **Tech Stack:** Node.js 20 + JavaScript, Express + gRPC, PostgreSQL + pgvector, Prisma, Redis, Kafka, OpenAI API
- **API:** 8 gRPC services (Query, Assessment, DevLab, Analytics, Content, Graph, GDPR, Health)
- **Performance:** Optimized for 200 QPS, ≤3s response time

### Stage_05 Completion (Frontend)
- **Scope:** Floating Chat Widget (embeddable)
- **Components:** 6 components (ChatWidgetButton, ChatPanel, ChatHeader, ChatMessage, Recommendations, ChatInput)
- **Tech:** React, TailwindCSS, Framer Motion, Redux Toolkit
- **Features:** Dark Emerald theme, smooth animations, responsive design, mock bot logic, dynamic recommendations
- **Status:** Ready for backend integration

### Current Progress
- **Stages Completed:** 7/9 (Stage_01 through Stage_07)
- **Stage_08:** In Progress (Implementation)
- **Progress:** 92%
- **Features:** 16 registered (F-0001 through F-0016)
- **Latest:** Frontend Chatbot UI Widget completed (F-0016)

---

## Best Practices

1. **Always Start with Context Scan:** Read existing logs and documentation before making decisions
2. **Use Adaptive Questions:** Only ask for missing information, don't repeat known facts
3. **Document Everything:** Log all decisions, even small ones
4. **Test First:** Never implement without tests
5. **Review Before Merge:** Always get code review approval
6. **Keep Logs Updated:** Update logs immediately after changes
7. **Create Snapshots:** Before any destructive change, create recovery snapshot
8. **Follow Checklist:** Complete each stage's checklist before approval
9. **Maintain Traceability:** Every change should be traceable via logs
10. **Enforce Gates:** Don't skip CI/CD gates or coverage requirements

---

## Troubleshooting

### Stage Won't Unlock
- Check if previous stage's checklist is complete
- Verify approval is recorded in `PROJECT_EVOLUTION_LOG.md`
- Ensure all required outputs are created

### Missing Context
- Run context scan (read `ROADMAP.md`, `PROJECT_EVOLUTION_LOG.md`, `FEATURES_REGISTRY.md`)
- Check `GLOBAL_LOG.md` for recent changes
- Review stage-specific logs in `SESSION_LOGS/`

### Feature Conflicts
- Check `FEATURES_REGISTRY.md` for dependencies
- Review `PROJECT_EVOLUTION_LOG.md` for related decisions
- Run dependency analysis before changes

### Recovery Needed
- Check `RECOVERY_POINTS/` for snapshots
- Review `PROJECT_EVOLUTION_LOG.md` for change history
- Restore from most recent snapshot before problematic change

---

## Conclusion

The Full-Stack Templates methodology provides a structured, traceable, and quality-focused approach to building full-stack applications. By following the 9-stage process, enforcing TDD discipline, maintaining complete logs, and using adaptive dialogues, teams can build production-ready applications with confidence.

**Key Success Factors:**
- Follow stages sequentially
- Complete checklists before approval
- Maintain complete traceability
- Enforce TDD and code review
- Document all decisions
- Create recovery points
- Keep logs updated

**Next Steps:**
1. Review this guide
2. Start with Stage_01
3. Follow the process step-by-step
4. Maintain discipline and documentation
5. Iterate and improve

---

*This methodology has been successfully applied to the EDUCORE RAG Microservice project, achieving 92% completion with 16 features registered and 7 stages completed.*

