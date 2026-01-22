# Tasks: Programmatic Send Message API

**Input**: Design documents from `/specs/001-send-message-api/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a single project web widget. All paths relative to repository root:
- Source: `src/`
- Tests: `test/__tests__/`
- Documentation: `README.md`, `specs/001-send-message-api/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project structure and prepare for implementation

- [X] T001 Verify Jest test environment configuration in `jest.config.js`
- [X] T002 [P] Verify existing `src/standalone.jsx` structure and `send()` stub
- [X] T003 [P] Verify `src/contexts/ChatContext.jsx` service access pattern (`serviceInstance` export)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities that ALL user stories depend on - MUST complete before any user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create `MessageQueue` class in `src/utils/messageQueue.js` with methods: `enqueue()`, `flush()`, `clear()`, `size()`
- [X] T005 Add queue overflow protection (max 100 messages) and warning logging to `src/utils/messageQueue.js`
- [X] T006 [P] Create `validateMessage()` function in `src/standalone.jsx` to handle validation logic (type checking, empty check, length enforcement)
- [X] T007 [P] Create module-level `messageQueue` instance in `src/standalone.jsx`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - External Trigger Message Sending (Priority: P1) 🎯 MVP

**Goal**: Enable `window.WebChat.send('text')` to send plain text messages when connected

**Independent Test**: Initialize webchat, call `window.WebChat.send('Hello')` from console, verify message appears in chat and is transmitted to service

**Acceptance Scenarios**:
1. Send string message while connected → message appears and is sent
2. Send from button click handler → message sent and chat opens
3. Send empty string → console warning, no message sent

### Implementation for User Story 1

- [X] T008 [US1] Implement basic `send()` function in `src/standalone.jsx` with widget initialization check (before/after init validation)
- [X] T009 [US1] Add string message validation using `validateMessage()` in `send()` function
- [X] T010 [US1] Implement `serviceWhenReady()` pattern access in `send()` to get service instance
- [X] T011 [US1] Add connection status check using `service.getState().connection?.status` in `send()` function
- [X] T012 [US1] Implement immediate send path: call `service.sendMessage(text)` when connected
- [X] T013 [US1] Add auto-open chat behavior: call `service.setIsChatOpen(true)` if chat is closed
- [X] T014 [US1] Handle pre-init and post-destroy edge cases with appropriate error logging

**Checkpoint**: US1 complete - users can send simple text messages programmatically

---

## Phase 4: User Story 2 - Send Messages Before Connection Established (Priority: P2)

**Goal**: Queue messages sent before connection and auto-send when connected

**Independent Test**: Call `send('message')` immediately after `init()` before connection, verify message is queued and sent once connected

**Acceptance Scenarios**:
1. Send before connection → message queued → connection established → message sent
2. Multiple messages before connection → all sent in FIFO order

### Implementation for User Story 2

- [X] T015 [US2] Add queue path to `send()` in `src/standalone.jsx`: call `messageQueue.enqueue()` when not connected
- [X] T016 [US2] Listen for `connection:status` event in `send()` or module initialization in `src/standalone.jsx`
- [X] T017 [US2] Implement queue flush logic: when status becomes 'connected' and queue has messages, call `messageQueue.flush()`
- [X] T018 [US2] Pass `service.sendMessage` as callback to `flush()` method for sending queued messages
- [X] T019 [US2] Ensure queue preserves message order (FIFO) during flush

**Checkpoint**: US2 complete - pre-connection messages are queued and sent reliably

---

## Phase 5: User Story 3 - Rich Message Support (Priority: P3)

**Goal**: Support `send({ text, metadata })` format for structured messages

**Independent Test**: Call `send({ text: 'Help', metadata: { source: 'button' } })`, verify metadata is passed to service

**Acceptance Scenarios**:
1. Send object with text and metadata → message sent with metadata in service payload
2. Send object with only text → message sent with null metadata

### Implementation for User Story 3

- [X] T020 [US3] Extend `validateMessage()` in `src/standalone.jsx` to handle object input format `{ text, metadata }`
- [X] T021 [US3] Update immediate send path in `send()` to pass metadata: `service.sendMessage(text, { metadata })`
- [X] T022 [US3] Update queue enqueue to preserve metadata: `messageQueue.enqueue({ text, metadata })`
- [X] T023 [US3] Update queue flush callback to pass metadata: `service.sendMessage(msg.text, { metadata: msg.metadata })`
- [X] T024 [US3] Verify object without `text` field is rejected with warning

**Checkpoint**: US3 complete - all message formats supported (string, object with metadata)

---

## Phase 6: Testing & Validation

**Purpose**: Comprehensive test coverage for all user stories

### Unit Tests

- [X] T025 [P] Create `test/__tests__/messageQueue.test.js` with tests for: enqueue, flush, clear, size, overflow handling, FIFO ordering
- [X] T026 [P] Create `test/__tests__/standalone.send.test.js` with validation tests: null, undefined, empty string, wrong types (number, boolean), object without text, max length truncation
- [X] T027 [P] Add lifecycle tests to `standalone.send.test.js`: send before init (error), send after destroy (error)
- [X] T028 [P] Add connection state tests to `standalone.send.test.js`: send when connected (immediate), send when disconnected (queue)

### Integration Tests

- [X] T029 Create `test/__tests__/send.integration.test.js` with full flow test: init → send multiple messages → verify in UI → verify service called
- [X] T030 Add queue flush integration test: send before connection → simulate connection event → verify messages sent in order
- [X] T031 Add rapid send test: send 50 messages quickly → verify no loss, no UI freeze, order preserved
- [X] T032 Add auto-open test: send message when chat closed → verify chat opens automatically

### Manual Testing Validation

- [ ] T033 Test console usage: `window.WebChat.init()` → `window.WebChat.send('test')` in browser console
- [ ] T034 Test button integration: create HTML button with onclick → verify message sent
- [ ] T035 Test with metadata: send object with metadata → verify in browser/service logs
- [ ] T036 Test edge cases: send before init, send after destroy, send empty, send very long message

---

## Phase 7: Documentation & Polish

**Purpose**: Production-ready documentation and code quality

### Documentation Updates

- [X] T037 Update README.md "Standalone API" section with `send()` method documentation
- [X] T038 [P] Add code examples to README.md: simple send, send with metadata, button integration, form integration
- [X] T039 [P] Add behavior notes to README.md: queueing, auto-open, validation, error handling
- [X] T040 Verify quickstart.md examples are accurate and tested

### Code Quality

- [X] T041 [P] Run ESLint on modified files: `src/standalone.jsx`, `src/utils/messageQueue.js` - fix any errors
- [X] T042 [P] Add JSDoc comments to `send()` function and `MessageQueue` class
- [X] T043 Review code for consistent error message formatting (all start with "WebChat.send():" or "WebChat:")
- [X] T044 Verify all console.warn and console.error calls follow error message format from contracts/send-api.contract.md

### Final Validation

- [X] T045 Run full test suite: `npm test` - verify all tests pass
- [X] T046 Build standalone bundle: `npm run build:standalone` - verify no errors
- [X] T047 Validate against contract: review contracts/send-api.contract.md acceptance criteria
- [X] T048 Performance check: verify send latency < 100ms, 50 rapid sends work without freeze
- [X] T049 Verify backward compatibility: existing `init()`, `destroy()`, `setContext()` methods unchanged

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - Can proceed sequentially (P1 → P2 → P3) for single developer
  - Can proceed in parallel if multiple developers available
- **Testing (Phase 6)**: Depends on corresponding user story completion
  - Tests can be written during or after implementation
- **Documentation (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (Phase 2) - No dependencies on other stories ✅ Independently deployable as MVP
- **User Story 2 (P2)**: Depends on US1 (extends send() function) - Enhances US1 with queueing
- **User Story 3 (P3)**: Depends on US1 (extends validation) - Enhances US1 with metadata support

**Note**: US2 and US3 both extend US1, so they should be implemented sequentially (US1 → US2 → US3) unless careful coordination

### Within Each User Story

- Validation utilities before implementation
- Connection check before send/queue logic
- Basic send before auto-open
- Core implementation before edge cases

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks can run in parallel (T002, T003)

**Phase 2 (Foundational)**: T006 and T007 can run in parallel (different concerns)

**Phase 6 (Testing)**: All test file creation tasks can run in parallel:
- T025 (messageQueue tests)
- T026 (validation tests)
- T027 (lifecycle tests)
- T028 (connection tests)
- T029-T032 (integration tests)

**Phase 7 (Documentation)**: T038, T039, T041, T042 can run in parallel (different files/concerns)

---

## Parallel Example: Foundational Phase

```bash
# Can work on simultaneously:
Task T006: "Create validateMessage() function in src/standalone.jsx"
Task T007: "Create module-level messageQueue instance in src/standalone.jsx"
```

---

## Parallel Example: Testing Phase

```bash
# Launch all test file creation together:
Task T025: "messageQueue.test.js"
Task T026: "standalone.send.test.js (validation)"
Task T027: "standalone.send.test.js (lifecycle)"
Task T028: "standalone.send.test.js (connection)"
Task T029: "send.integration.test.js (full flow)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

Fastest path to value - delivers core functionality:

1. Complete Phase 1: Setup (T001-T003) - ~15 minutes
2. Complete Phase 2: Foundational (T004-T007) - ~1 hour
3. Complete Phase 3: User Story 1 (T008-T014) - ~2 hours
4. Complete Phase 6: Basic testing (T026-T027) - ~1 hour
5. Complete Phase 7: Documentation (T037-T039) - ~30 minutes
6. **STOP and VALIDATE**: Test `send('text')` works end-to-end
7. **Deploy/Demo**: MVP ready - users can trigger messages from buttons!

**Total MVP time**: ~5 hours for experienced developer

### Incremental Delivery

Build and validate in stages:

1. **Foundation** (Phase 1-2): Setup + utilities → ~1.5 hours
2. **MVP** (Phase 3 + basic tests): Basic send() → Test → Deploy → ~3.5 hours (cumulative: ~5 hours)
3. **Enhanced** (Phase 4): Add queueing → Test → Deploy → ~2 hours (cumulative: ~7 hours)
4. **Complete** (Phase 5): Add metadata → Test → Deploy → ~1.5 hours (cumulative: ~8.5 hours)
5. **Production** (Phases 6-7): Full tests + docs → ~3 hours (cumulative: ~11.5 hours)

Each stage adds value without breaking previous functionality.

### Sequential Strategy (Single Developer)

1. Phase 1: Setup (verify structure)
2. Phase 2: Foundational (queue + validation utilities)
3. Phase 3: User Story 1 (basic send)
4. Phase 4: User Story 2 (queueing)
5. Phase 5: User Story 3 (metadata)
6. Phase 6: Testing (comprehensive test coverage)
7. Phase 7: Documentation (README + polish)

**Estimated total**: 12-15 hours for complete feature

### Parallel Strategy (Multiple Developers)

If 2-3 developers available:

**Day 1 - Foundation (Together)**:
- Complete Phase 1-2 together (~1.5 hours)
- Code review and merge

**Day 2-3 - Parallel Development**:
- Developer A: Phase 3 (US1 - basic send) → 3 hours
- Developer B: Phase 4 (US2 - queueing) → 2 hours (after US1 merged)
- Developer C: Phase 6 (Testing) → starts after US1 available → 4 hours

**Day 4 - Integration**:
- Developer A: Phase 5 (US3 - metadata) → 1.5 hours
- Developer B: Phase 7 (Documentation) → 3 hours
- Developer C: Complete integration tests → 1 hour

**Estimated total**: ~8-10 hours calendar time with 3 developers

---

## Notes

### Task Format Compliance

- ✅ All tasks follow format: `- [ ] [ID] [P?] [Story?] Description with file path`
- ✅ Task IDs sequential (T001-T049)
- ✅ [P] marker on parallelizable tasks only
- ✅ [Story] label on all user story tasks (US1, US2, US3)
- ✅ File paths included in every description

### Best Practices

- Start with MVP (Phase 3 only) for fastest validation
- Commit after each task or logical group
- Stop at checkpoints to validate story independently
- Run tests before moving to next phase
- Keep changes small and focused per task

### Avoid Common Pitfalls

- Don't skip foundational phase - queue is needed for US2
- Don't work on same function in parallel - merge conflicts
- Don't skip validation - critical for error handling
- Don't skip tests - regression risk is high
- Don't forget documentation - API users need examples

### Success Criteria Validation

After implementation, verify:
- ✅ SC-001: Message appears in chat < 100ms
- ✅ SC-002: Pre-connection messages delivered 100%
- ✅ SC-003: Invalid input handled gracefully 100%
- ✅ SC-004: 50 rapid sends complete without freeze/loss
- ✅ SC-005: Button/form integration requires zero config

---

## Task Count Summary

- **Total Tasks**: 49
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 4 tasks
- **Phase 3 (US1 - MVP)**: 7 tasks
- **Phase 4 (US2 - Queueing)**: 5 tasks
- **Phase 5 (US3 - Metadata)**: 5 tasks
- **Phase 6 (Testing)**: 8 tasks
- **Phase 7 (Documentation)**: 9 tasks
- **Phase 8 (Polish)**: 8 tasks

**Parallelizable Tasks**: 19 (marked with [P])

**MVP Tasks** (Phases 1-3 + basic tests): 14 tasks (~5 hours)

**Full Feature** (All phases): 49 tasks (~12-15 hours single developer)
