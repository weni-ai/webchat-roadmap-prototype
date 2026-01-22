# Tasks: Message Tag Filtering

**Feature**: Message Tag Filtering (001-message-tag-filtering)  
**Branch**: `001-message-tag-filtering`  
**Input**: Design documents from `/specs/001-message-tag-filtering/`  
**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/messageFilter.contract.md](./contracts/messageFilter.contract.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project Type**: Single project (React component library)
- **Source**: `src/` at repository root
- **Tests**: Test files co-located with source files (`*.test.js`)
- **Language**: JavaScript ES2020+
- **Framework**: React 18.2+
- **Testing**: Jest 29.7+ with React Testing Library 16.2+

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and environment verification

**Duration**: ~15 minutes

- [x] T001 Verify Node.js 16+ and npm are installed
- [x] T002 Verify existing dependencies are up to date by running `npm install`
- [x] T003 [P] Run linter to ensure clean baseline: `npm run lint`
- [x] T004 [P] Run existing test suite to ensure all pass: `npm test`

**Checkpoint**: Development environment ready ✓

---

## Phase 2: Foundational (Core Utility Module)

**Purpose**: Create the core filtering utility that ALL user stories depend on

**Duration**: ~2 hours

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### State Machine Implementation

- [x] T005 Create `src/utils/messageFilter.js` file with basic structure and exports
- [x] T006 Implement ParserState enum (TEXT, TAG_OPENING_1, TAG_OPENING_2, TAG_NAME, TAG_CONTENT, TAG_CLOSING_1, TAG_CLOSING_2, TAG_CLOSING_NAME) in `src/utils/messageFilter.js`
- [x] T007 Implement early return optimization (check for `[[` marker) in `src/utils/messageFilter.js`
- [x] T008 Implement state machine core loop (character-by-character processing) in `src/utils/messageFilter.js`
- [x] T009 Implement TEXT state handler in `src/utils/messageFilter.js`
- [x] T010 Implement TAG_OPENING states (TAG_OPENING_1, TAG_OPENING_2) handlers in `src/utils/messageFilter.js`
- [x] T011 Implement TAG_NAME state handler with validation in `src/utils/messageFilter.js`
- [x] T012 Implement TAG_CONTENT state handler with buffering in `src/utils/messageFilter.js`
- [x] T013 Implement TAG_CLOSING states (TAG_CLOSING_1, TAG_CLOSING_2, TAG_CLOSING_NAME) handlers in `src/utils/messageFilter.js`
- [x] T014 Implement FilterResult return structure (text, hadTags, tagsRemoved) in `src/utils/messageFilter.js`
- [x] T015 Add JSDoc documentation to `filterMessageTags` function in `src/utils/messageFilter.js`

**Checkpoint**: Foundation ready - user story implementation can now begin ✓

---

## Phase 3: User Story 1 - Filter Tagged Content from Standard Messages (Priority: P1) 🎯 MVP

**Goal**: Filter tags from complete (non-streaming) messages so users never see metadata

**Independent Test**: Send a message with tagged content through standard message flow and verify no tag markers or tagged content appear in the rendered output

**Duration**: ~4 hours

**Why MVP**: This is the core functionality (P1) that delivers immediate value by cleaning up message display

### Unit Tests for User Story 1

> **NOTE: Write these tests FIRST in TDD fashion, ensure they FAIL before implementation**

- [x] T016 [P] [US1] Create test file `src/utils/messageFilter.test.js` with Jest configuration
- [x] T017 [P] [US1] Test: should remove simple tag `[[TAG]]content[[/TAG]]` in `src/utils/messageFilter.test.js`
- [x] T018 [P] [US1] Test: should preserve text before tag in `src/utils/messageFilter.test.js`
- [x] T019 [P] [US1] Test: should preserve text after tag in `src/utils/messageFilter.test.js`
- [x] T020 [P] [US1] Test: should handle empty message in `src/utils/messageFilter.test.js`
- [x] T021 [P] [US1] Test: should handle message with no tags (early return) in `src/utils/messageFilter.test.js`
- [x] T022 [P] [US1] Test: should return correct FilterResult structure in `src/utils/messageFilter.test.js`
- [x] T023 [P] [US1] Test: should handle multiple independent tags in `src/utils/messageFilter.test.js`
- [x] T024 [P] [US1] Test: should handle adjacent tags `[[A]]x[[/A]][[B]]y[[/B]]` in `src/utils/messageFilter.test.js`
- [x] T025 [P] [US1] Test: should handle nested tags `[[OUTER]][[INNER]]y[[/INNER]][[/OUTER]]` in `src/utils/messageFilter.test.js`
- [x] T026 [P] [US1] Test: should hide content from unmatched opening tag to end of message in `src/utils/messageFilter.test.js`
- [x] T027 [P] [US1] Test: should display unmatched closing tag as regular text in `src/utils/messageFilter.test.js`
- [x] T028 [P] [US1] Test: should handle case sensitivity (TAG vs tag mismatch) in `src/utils/messageFilter.test.js`
- [x] T029 [P] [US1] Test: should ignore malformed patterns `[SINGLE]`, `[[ TAG ]]` in `src/utils/messageFilter.test.js`
- [x] T030 [P] [US1] Test: should handle empty tag `[[TAG]][[/TAG]]` in `src/utils/messageFilter.test.js`
- [x] T031 [P] [US1] Test: should handle message with only tags (empty result) in `src/utils/messageFilter.test.js`
- [x] T032 [P] [US1] Test: should maintain spacing and avoid double spaces in `src/utils/messageFilter.test.js`
- [x] T033 [US1] Test: Performance - should process 10,000 chars in <5ms in `src/utils/messageFilter.test.js`
- [x] T034 [US1] Test: should throw TypeError for non-string input in `src/utils/messageFilter.test.js`
- [x] T035 [US1] Run unit tests to verify they all pass: `npm test -- messageFilter.test.js`

### MessageText Integration for User Story 1

- [x] T036 [US1] Import `filterMessageTags` in `src/components/Messages/MessageText.jsx`
- [x] T037 [US1] Apply filter before DOMPurify in MessageText useMemo in `src/components/Messages/MessageText.jsx`
- [x] T038 [US1] Handle empty result after filtering (don't render) in `src/components/Messages/MessageText.jsx`
- [x] T039 [US1] Ensure memoization dependencies include message.text and message.status in `src/components/Messages/MessageText.jsx`

### Integration Tests for User Story 1

- [x] T040 [P] [US1] Create or update `src/components/Messages/MessageText.test.js` with test structure
- [x] T041 [P] [US1] Test: should not display tagged content in rendered output in `src/components/Messages/MessageText.test.js`
- [x] T042 [P] [US1] Test: should preserve markdown after filtering in `src/components/Messages/MessageText.test.js`
- [x] T043 [P] [US1] Test: should preserve links after filtering in `src/components/Messages/MessageText.test.js`
- [x] T044 [P] [US1] Test: should handle message with only tags (no render) in `src/components/Messages/MessageText.test.js`
- [x] T045 [P] [US1] Test: should not affect quick_replies component in `src/components/Messages/MessageText.test.js`
- [x] T046 [P] [US1] Test: should not affect cta_message component in `src/components/Messages/MessageText.test.js`
- [x] T047 [US1] Run integration tests: `npm test -- MessageText.test.js`

### Manual Testing for User Story 1

- [x] T048 [US1] Start dev server: `npm run dev`
- [x] T049 [US1] Manual test: Verify tags not visible in browser for standard message
- [x] T050 [US1] Manual test: Verify markdown still renders correctly (bold, links, lists)
- [x] T051 [US1] Manual test: Verify message spacing correct after filtering
- [x] T052 [US1] Manual test: Verify no console errors during filtering
- [x] T053 [US1] Manual test: Check DevTools Performance tab for <5ms overhead

### Validation for User Story 1

- [x] T054 [US1] Run full test suite: `npm test`
- [x] T055 [US1] Run linter: `npm run lint`
- [x] T056 [US1] Verify all 4 acceptance scenarios from spec.md pass
- [x] T057 [US1] Review code coverage for messageFilter.js (target >95%)

**Checkpoint**: User Story 1 complete ✓ - Users never see tags in standard messages. This is a shippable MVP!

---

## Phase 4: User Story 2 - Filter Tagged Content from Streaming Messages (Priority: P2)

**Goal**: Filter tags from progressive/streaming messages in real-time without flickering

**Independent Test**: Initiate streaming message delivery with tagged content and verify no tag markers appear at any point during streaming

**Duration**: ~3 hours

**Dependencies**: Requires Phase 3 (User Story 1) complete

### Streaming Filter Implementation

- [x] T058 [US2] Create `StreamingMessageFilter` class structure in `src/utils/messageFilter.js`
- [x] T059 [US2] Implement constructor with state initialization in `src/utils/messageFilter.js`
- [x] T060 [US2] Implement `processChunk(chunk)` method with character-by-character state machine in `src/utils/messageFilter.js`
- [x] T061 [US2] Implement buffer management (marker, tagName, content, visible) in `src/utils/messageFilter.js`
- [x] T062 [US2] Implement `finalize()` method to handle incomplete tags at stream end in `src/utils/messageFilter.js`
- [x] T063 [US2] Implement `reset()` method for instance reuse in `src/utils/messageFilter.js`
- [x] T064 [US2] Add JSDoc documentation to `StreamingMessageFilter` class in `src/utils/messageFilter.js`

### Unit Tests for User Story 2

- [x] T065 [P] [US2] Test: should buffer and hide tag at stream start in `src/utils/messageFilter.test.js`
- [x] T066 [P] [US2] Test: should handle chunk boundary within tag in `src/utils/messageFilter.test.js`
- [x] T067 [P] [US2] Test: should handle chunk boundary splitting marker `[` / `[TAG]]` in `src/utils/messageFilter.test.js`
- [x] T068 [P] [US2] Test: should handle tag in middle of stream in `src/utils/messageFilter.test.js`
- [x] T069 [P] [US2] Test: should handle tag at end of stream in `src/utils/messageFilter.test.js`
- [x] T070 [P] [US2] Test: should discard incomplete tag at stream end (finalize) in `src/utils/messageFilter.test.js`
- [x] T071 [P] [US2] Test: should handle interrupted stream mid-tag in `src/utils/messageFilter.test.js`
- [x] T072 [P] [US2] Test: should allow reset and reuse of filter instance in `src/utils/messageFilter.test.js`
- [x] T073 [US2] Test: Performance - should process 100 char chunk in <0.5ms in `src/utils/messageFilter.test.js`
- [x] T074 [US2] Run streaming tests: `npm test -- messageFilter.test.js -t "streaming"`

### ChatContext Integration for User Story 2 (if needed)

- [x] T075 [US2] Investigate if ChatContext integration needed for streaming (check message handling in `src/contexts/ChatContext.jsx`)
- [x] T076 [US2] If needed: Create Map to store StreamingMessageFilter instances per messageId in `src/contexts/ChatContext.jsx`
- [x] T077 [US2] If needed: Implement chunk processing handler in `src/contexts/ChatContext.jsx`
- [x] T078 [US2] If needed: Implement stream completion handler with finalize in `src/contexts/ChatContext.jsx`
- [x] T079 [US2] If needed: Implement cleanup of filter instances in `src/contexts/ChatContext.jsx`

### Manual Testing for User Story 2

- [x] T080 [US2] Manual test: Start streaming message and verify no visible tags during streaming
- [x] T081 [US2] Manual test: Verify no flickering or momentary tag display
- [x] T082 [US2] Manual test: Verify stream with tag at start buffers correctly
- [x] T083 [US2] Manual test: Verify stream with tag at end completes correctly
- [x] T084 [US2] Manual test: Verify interrupted stream discards partial tag

### Validation for User Story 2

- [x] T085 [US2] Run full test suite: `npm test`
- [x] T086 [US2] Verify all 4 acceptance scenarios for User Story 2 from spec.md pass
- [x] T087 [US2] Verify User Story 1 still works (regression test)

**Checkpoint**: User Story 2 complete ✓ - Streaming messages filter smoothly without flicker

---

## Phase 5: User Story 3 - Handle Multiple Tag Types Consistently (Priority: P3)

**Goal**: Support any tag name format without requiring code changes for new tag types

**Independent Test**: Send messages with various invented tag names and verify all are filtered equally

**Duration**: ~1.5 hours

**Dependencies**: Requires Phase 3 (User Story 1) complete

### Unit Tests for User Story 3

- [x] T088 [P] [US3] Test: should filter arbitrary tag names `[[CUSTOM_TAG_123]]` in `src/utils/messageFilter.test.js`
- [x] T089 [P] [US3] Test: should filter tags with hyphens `[[TAG-WITH-DASH]]` in `src/utils/messageFilter.test.js`
- [x] T090 [P] [US3] Test: should filter tags with underscores `[[TAG_WITH_UNDERSCORE]]` in `src/utils/messageFilter.test.js`
- [x] T091 [P] [US3] Test: should filter numbered tags `[[TAG_001]]`, `[[TAG_002]]` in `src/utils/messageFilter.test.js`
- [x] T092 [P] [US3] Test: should handle 10+ different tag types in single message in `src/utils/messageFilter.test.js`
- [x] T093 [P] [US3] Test: should maintain performance with multiple tag types in `src/utils/messageFilter.test.js`
- [x] T094 [US3] Run tag type tests: `npm test -- messageFilter.test.js -t "tag types"`

### Documentation for User Story 3

- [x] T095 [P] [US3] Document supported tag name formats in `src/utils/messageFilter.js` JSDoc
- [x] T096 [P] [US3] Add examples of valid/invalid tag names in code comments in `src/utils/messageFilter.js`

### Manual Testing for User Story 3

- [x] T097 [US3] Manual test: Create messages with 5+ different tag name formats
- [x] T098 [US3] Manual test: Verify all tag types filter consistently
- [x] T099 [US3] Manual test: Verify performance acceptable with many tag types

### Validation for User Story 3

- [x] T100 [US3] Run full test suite: `npm test`
- [x] T101 [US3] Verify all 4 acceptance scenarios for User Story 3 from spec.md pass
- [x] T102 [US3] Verify User Stories 1 and 2 still work (regression test)

**Checkpoint**: User Story 3 complete ✓ - All tag types handled consistently and extensibly

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements and documentation

**Duration**: ~1 hour

**Dependencies**: All user stories complete

### Code Quality

- [x] T103 [P] Review and refactor messageFilter.js for code clarity
- [x] T104 [P] Ensure all JSDoc comments are complete and accurate in `src/utils/messageFilter.js`
- [x] T105 [P] Run linter and fix any issues: `npm run lint`
- [x] T106 [P] Check test coverage: `npm test -- --coverage`
- [x] T107 Verify coverage >95% for messageFilter.js

### Documentation

- [x] T108 [P] Update README.md if messageFilter becomes public API (optional)
- [x] T109 [P] Review quickstart.md and ensure it's up to date with implementation in `specs/001-message-tag-filtering/quickstart.md`
- [x] T110 [P] Document any deviations from original plan in `specs/001-message-tag-filtering/plan.md`

### Final Validation

- [x] T111 Run complete test suite: `npm test`
- [x] T112 Build project: `npm run build`
- [x] T113 Verify no console warnings or errors
- [x] T114 Verify all 12 functional requirements (FR-001 to FR-012) from spec.md are met
- [x] T115 Verify all 6 success criteria (SC-001 to SC-006) from spec.md are met
- [x] T116 Create demo/test scenario showing all three user stories working

**Checkpoint**: Feature complete and ready for code review ✓

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - Can proceed after T015 complete
- **User Story 2 (Phase 4)**: Depends on Foundational - Can proceed after T015 complete (independent of US1)
- **User Story 3 (Phase 5)**: Depends on Foundational - Can proceed after T015 complete (independent of US1 & US2)
- **Polish (Phase 6)**: Depends on all user stories you want to ship

### User Story Dependencies

```
Foundational (T005-T015)
        │
        ├──> User Story 1 (T016-T057) [P1 - MVP] ✓
        │
        ├──> User Story 2 (T058-T087) [P2] ✓
        │
        └──> User Story 3 (T088-T102) [P3] ✓
                │
                └──> Polish (T103-T116)
```

**Key Points**:
- All user stories are **independent** after Foundational phase
- User Story 1 is the **MVP** (minimum viable product)
- User Stories 2 and 3 can be implemented in parallel by different developers
- Each story can be deployed independently

### Within Each User Story

Typical flow within a story:
1. **Tests FIRST** (TDD approach) - marked [P] can run in parallel
2. **Implementation** - core logic
3. **Integration** - connect to MessageText/ChatContext
4. **Integration tests** - verify end-to-end
5. **Manual testing** - browser verification
6. **Validation** - acceptance criteria check

### Parallel Opportunities

**Within Foundational Phase**:
- State handlers can be implemented in parallel once core loop exists (T009-T013)

**Within User Story 1**:
```bash
# All unit tests can be written in parallel:
T017, T018, T019, T020, T021, T022, T023, T024, T025, T026, T027, T028, T029, T030, T031, T032, T034

# All integration tests can be written in parallel:
T041, T042, T043, T044, T045, T046
```

**Within User Story 2**:
```bash
# All streaming tests can be written in parallel:
T065, T066, T067, T068, T069, T070, T071, T072
```

**Within User Story 3**:
```bash
# All tag type tests can be written in parallel:
T088, T089, T090, T091, T092, T093

# Documentation tasks can run in parallel:
T095, T096
```

**Across User Stories** (once Foundational complete):
- User Story 1, 2, and 3 can be worked on in parallel by different team members
- Each story is independently testable and deliverable

---

## Parallel Example: User Story 1

If working with multiple developers or AI agents:

```bash
# Phase A: All unit tests (parallel)
Developer A: T017, T018, T019, T020, T021, T022
Developer B: T023, T024, T025, T026, T027, T028
Developer C: T029, T030, T031, T032, T033, T034

# Phase B: Integration work (sequential on messageFilter.js foundation)
Developer A: T036, T037, T038, T039

# Phase C: All integration tests (parallel)
Developer A: T041, T042
Developer B: T043, T044
Developer C: T045, T046
```

---

## Implementation Strategy

### MVP First (Recommended) - User Story 1 Only

**Goal**: Ship working feature in ~4-6 hours

1. ✅ Complete Phase 1: Setup (15 min)
2. ✅ Complete Phase 2: Foundational (2 hours)
3. ✅ Complete Phase 3: User Story 1 (4 hours)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Ship to production / demo to stakeholders

**Value**: Users immediately benefit from clean message display (no metadata visible)

### Incremental Delivery (Recommended for Full Feature)

**Goal**: Ship value continuously

1. ✅ Setup + Foundational → Foundation ready
2. ✅ User Story 1 → Test → **Ship MVP** (standard message filtering)
3. ✅ User Story 2 → Test → **Ship v1.1** (add streaming support)
4. ✅ User Story 3 → Test → **Ship v1.2** (add extensibility validation)
5. ✅ Polish → Test → **Ship v2.0** (production-ready)

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With 2-3 developers:

1. **Together**: Complete Setup + Foundational (2-3 hours)
2. **Split after T015**:
   - Developer A: User Story 1 (P1) → 4 hours
   - Developer B: User Story 2 (P2) → 3 hours  
   - Developer C: User Story 3 (P3) → 1.5 hours
3. **Merge**: Each story is independently testable, merge when ready
4. **Together**: Polish phase (1 hour)

**Total time with 3 devs**: ~5-6 hours (vs 10-12 hours sequential)

---

## Task Summary

**Total Tasks**: 116 tasks

**By Phase**:
- Setup: 4 tasks (~15 min)
- Foundational: 11 tasks (~2 hours) - **Blocks all stories**
- User Story 1 (P1): 42 tasks (~4 hours) - **MVP**
- User Story 2 (P2): 30 tasks (~3 hours)
- User Story 3 (P3): 15 tasks (~1.5 hours)
- Polish: 14 tasks (~1 hour)

**By Story Priority**:
- P1 (User Story 1): 42 tasks - **Critical for MVP**
- P2 (User Story 2): 30 tasks - **High value add**
- P3 (User Story 3): 15 tasks - **Nice to have**

**Parallel Tasks**: 68 tasks marked [P] can run in parallel (59% of total)

**Independent Stories**: All 3 user stories can be worked on independently after Foundational phase

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 = 57 tasks (~6.5 hours)

**Estimated Time**:
- MVP (User Story 1 only): 6-7 hours
- Full Feature (All stories): 10-12 hours
- With parallel team (3 devs): 5-6 hours

---

## Success Criteria Checklist

### Feature Complete When:

**Functional Requirements** (from spec.md):
- [ ] FR-001: Pattern detection `[[TAG_NAME]]content[[/TAG_NAME]]`
- [ ] FR-002: Tag removal before display
- [ ] FR-003: Works for standard and streaming
- [ ] FR-004: Streaming content buffering
- [ ] FR-005: Non-tagged content preserved
- [ ] FR-006: Proper spacing maintained
- [ ] FR-007: Multiple tags handled
- [ ] FR-008: Nested tags handled
- [ ] FR-009: Incomplete tags hidden
- [ ] FR-010: Unmatched closing displayed
- [ ] FR-011: Filtering before other rendering
- [ ] FR-012: Empty messages not displayed

**Success Criteria** (from spec.md):
- [ ] SC-001: Zero visible tag markers
- [ ] SC-002: No visual artifacts
- [ ] SC-003: Smooth streaming display
- [ ] SC-004: <5ms processing time for 10k chars
- [ ] SC-005: 10+ tag types supported
- [ ] SC-006: Zero metadata incidents

**Code Quality**:
- [ ] >95% unit test coverage
- [ ] All linter rules pass
- [ ] No console warnings
- [ ] JSDoc complete
- [ ] Code review approved

**User Story Completion**:
- [ ] User Story 1 (P1) - Standard messages filter correctly
- [ ] User Story 2 (P2) - Streaming messages filter smoothly
- [ ] User Story 3 (P3) - All tag types filter consistently

---

## Notes

- **[P] marker**: Tasks marked [P] can run in parallel (different files, no dependencies)
- **[Story] label**: Maps task to specific user story for traceability and independent testing
- **TDD Approach**: All test tasks should be written FIRST and must FAIL before implementation
- **Independent Stories**: Each user story should be fully testable and shippable independently
- **Early Returns**: filterMessageTags uses early return optimization when no `[[` found
- **Performance**: State machine is O(n) single-pass, no backtracking
- **State Machine**: 8 states handling all edge cases (see data-model.md for details)
- **Commit Strategy**: Commit after each task or logical group of parallel tasks

---

## Quick Start

**For MVP (User Story 1 only)**:
```bash
# 1. Setup (Phase 1: T001-T004)
npm install
npm run lint
npm test

# 2. Core utility (Phase 2: T005-T015)
# Create src/utils/messageFilter.js
# Implement state machine

# 3. User Story 1 (Phase 3: T016-T057)
# Write tests first (T016-T035)
# Integrate into MessageText (T036-T039)
# Integration tests (T040-T047)
# Manual testing (T048-T053)
# Validation (T054-T057)

# Total time: ~6 hours for shippable MVP
```

**For Full Feature**:
```bash
# Follow MVP steps above, then continue with:
# User Story 2: T058-T087 (streaming support)
# User Story 3: T088-T102 (tag type validation)
# Polish: T103-T116 (code quality & docs)

# Total time: ~10-12 hours for complete feature
```

---

**Last Updated**: Thursday Jan 22, 2026  
**Version**: 1.0.0  
**Status**: Ready for implementation

**Next Step**: Start with Phase 1 (Setup) → T001
