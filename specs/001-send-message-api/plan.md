# Implementation Plan: Programmatic Send Message API

**Branch**: `001-send-message-api` | **Date**: 2026-01-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-send-message-api/spec.md`

## Summary

Implement a programmatic `send(message)` API method exposed on `window.WebChat` that allows external pages to send messages to the chat service. The implementation will leverage the existing `WeniWebchatService` from `@weni/webchat-service` package and extend the standalone API in `src/standalone.jsx` with proper validation, queueing, and UI integration.

**Key Technical Approach**:
- Extend existing `send()` stub in `standalone.jsx` with full implementation
- Use the existing `service.sendMessage()` method from WeniWebchatService
- Implement message queue for pre-connection sends
- Add validation and error handling for edge cases
- Ensure chat window opens when messages are sent programmatically

## Technical Context

**Language/Version**: JavaScript (ES6+) / React 18.2.0  
**Primary Dependencies**: 
- `@weni/webchat-service` v1.5.0 (handles WebSocket, state, message transport)
- React 18.2.0 (UI rendering)
- ReactDOM 18.2.0 (standalone initialization)

**Storage**: LocalStorage/SessionStorage (managed by WeniWebchatService for session persistence)  
**Testing**: Jest 29.7.0 with React Testing Library 16.2.0, jsdom environment  
**Target Platform**: Web browsers (modern ES6+ support), standalone script tag usage  
**Project Type**: Web widget (standalone UMD bundle + React component library)  
**Performance Goals**: 
- Message send latency <100ms (UI update)
- Support 50+ rapid consecutive sends without UI freeze
- Queue persistence across page reloads

**Constraints**: 
- Must work with existing WeniWebchatService API
- Must maintain backward compatibility with current `window.WebChat` API
- Must not break existing init/destroy lifecycle
- Message length limit: 10,000 characters

**Scale/Scope**: 
- Single public API method (`send`)
- ~100-150 lines of implementation code
- 3-4 test suites (unit + integration)
- Documentation updates in README.md

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ **PASS** - No constitution file present in project (template only)

Since the project uses a constitution template without filled content, no specific architectural principles are enforced. The implementation follows standard React/JavaScript best practices:

- ✅ Extends existing library (`WeniWebchatService`) without creating new dependencies
- ✅ Maintains existing API surface with backward compatibility
- ✅ Test-first approach (TDD) will be followed per specification requirements
- ✅ Simple, focused implementation (single method addition)

**Re-evaluation after Phase 1**: Will verify implementation maintains service/template separation and doesn't violate existing architectural patterns.

## Project Structure

### Documentation (this feature)

```text
specs/001-send-message-api/
├── plan.md              # This file
├── research.md          # Architecture decisions and patterns
├── data-model.md        # Message object and queue structure
├── quickstart.md        # Usage examples and integration guide
└── contracts/           # API contract specification
    └── send-api.contract.md
```

### Source Code (repository root)

```text
src/
├── standalone.jsx              # [MODIFY] Implement send() method, add queue management
├── contexts/
│   └── ChatContext.jsx         # [MODIFY] Add sendMessage proxy, expose to standalone
├── hooks/
│   └── useWeniChat.js          # [READ ONLY] Existing hook pattern for reference
└── utils/
    └── messageQueue.js         # [NEW] Message queue implementation for pre-connection sends

test/
└── __tests__/
    ├── standalone.send.test.js          # [NEW] Unit tests for send() method
    ├── messageQueue.test.js             # [NEW] Unit tests for queue logic
    └── send.integration.test.js         # [NEW] Integration test with service
```

**Structure Decision**: 

This is a **single project** (Option 1) web widget codebase with React components. The implementation adds functionality to the existing standalone API layer (`src/standalone.jsx`) which serves as the public interface for script tag users. The changes are minimal and localized:

1. **Primary file**: `src/standalone.jsx` - Contains the `send()` stub that needs implementation
2. **Supporting utility**: `src/utils/messageQueue.js` - New utility for queueing pre-connection messages
3. **Context integration**: `src/contexts/ChatContext.jsx` - Minor modification to expose service methods if needed
4. **Test files**: New test suites in `test/__tests__/` directory following existing patterns

The existing architecture separates concerns between:
- **Service layer**: `@weni/webchat-service` (external package) - handles WebSocket, state, business logic
- **Template layer**: React components - UI rendering only
- **Standalone API**: `standalone.jsx` - public API for script tag usage

Our implementation extends the standalone API layer while maintaining this separation.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Not applicable - no constitution violations or complexity justifications needed. This is a straightforward feature addition using existing patterns and infrastructure.
