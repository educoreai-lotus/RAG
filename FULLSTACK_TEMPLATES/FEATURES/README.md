Features Workspace
==================

New features are created under `/features/<feature_name>/` with the following structure:

backend/
frontend/
tests/
docs/FEATURE_SPEC.md
DIALOGUES/
SESSION_LOGS/
changelog.md
README.md

Use `FEATURE_LIFECYCLE_MANAGER.prompt` to add/update/retire features safely.


Recent additions (backend + frontend)
-------------------------------------
- Strict Support-Mode Gating
  - Activate support mode only when explicitly signaled by embed (headers/metadata/flag)
  - Backend env gating: `SUPPORT_MODE_ENABLED`, `SUPPORT_ALLOWED_ORIGINS`, `SUPPORT_SHARED_SECRET`
  - Route-level middleware blocks unauthorized access to `/api/assessment/support` and `/api/devlab/support`
- Frontend Mode Detection Update
  - Removed keyword-based auto-switch to support modes
  - Support mode is now controlled solely by embed/init config or explicit UI toggle
- General Mode UX Cleanup
  - Removed "Contact Support" quick-action from initial recommendations
  - Kept minimal buttons only (e.g., "Get Started Guide", "Live Chat")
- RAG and Fallback
  - RAG-only answers with strict context
  - gRPC fallback hook (disabled unless configured) for EDUCORE services
- Logging
  - Added routing decision logs for support-mode gating
  - Pretty logs via `LOG_PRETTY=true`


