# Implementation Plan: Message Tag Filtering

**Branch**: `001-message-tag-filtering` | **Date**: Thursday Jan 22, 2026 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-message-tag-filtering/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a text filtering system that automatically detects and removes metadata tags in the format `[[TAG_NAME]]content[[/TAG_NAME]]` from messages before they are displayed to end users. The filtering must work seamlessly with both standard (complete) messages and streaming (progressive) messages, ensuring users never see internal system metadata or tracking information. The solution will use a state machine approach for streaming content to handle partial tag detection and buffer management while maintaining performance (<5ms overhead for 10,000 character messages).

## Technical Context

**Language/Version**: JavaScript ES2020+ (transpiled via Vite/Babel for browser compatibility)  
**Primary Dependencies**: React 18.2+, @weni/webchat-service 1.5.0, DOMPurify 3.3+, marked 16.4+  
**Storage**: N/A (stateless text transformation)  
**Testing**: Jest 29.7+ with jsdom, React Testing Library 16.2+  
**Target Platform**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
**Project Type**: Single project - React component library/widget  
**Performance Goals**: <5ms processing time for messages up to 10,000 characters; streaming without visible flicker  
**Constraints**: Must not break existing markdown rendering, maintain text spacing, zero regex backtracking vulnerabilities  
**Scale/Scope**: Process 100+ messages per conversation, handle up to 10 tagged sections per message, support any tag name format

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ No constitution violations - standard feature implementation following existing architecture patterns.

**Notes**: 
- This feature introduces a pure utility function (text transformation)
- No new external dependencies required
- Follows existing testing patterns (Jest + React Testing Library)
- Integrates with existing message processing pipeline
- No architectural changes or complexity additions

## Project Structure

### Documentation (this feature)

```text
specs/001-message-tag-filtering/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── messageFilter.contract.md
└── checklists/
    └── requirements.md  # Already created during /speckit.specify
```

### Source Code (repository root)

```text
src/
├── utils/
│   ├── messageFilter.js              # NEW: Core filtering logic
│   └── messageFilter.test.js         # NEW: Unit tests
├── components/
│   └── Messages/
│       ├── MessageText.jsx           # MODIFIED: Integrate filter
│       ├── MessageText.test.js       # MODIFIED: Add filter tests
│       └── MessagesList.jsx          # POTENTIALLY MODIFIED: Stream handling
└── contexts/
    └── ChatContext.jsx               # POTENTIALLY MODIFIED: Early filtering

test/
├── setupTests.js                     # Existing test configuration
└── __mocks__/                        # Existing mocks
```

**Structure Decision**: Single project structure (React component library). The feature adds a new utility module (`messageFilter.js`) in the existing `src/utils/` directory, following the established pattern of utilities like `formatters.js` and `themeHelpers.js`. Integration points are the existing message rendering components (`MessageText.jsx`) and potentially the message state management in `ChatContext.jsx`. This maintains the current architecture without introducing new layers or complexity.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**N/A** - No constitution violations or unjustified complexity introduced by this feature.

---

## Phase 0: Research Complete ✅

All research has been completed and documented in [research.md](./research.md).

### Key Decisions

1. **Filtering Approach**: State machine parser (not regex) for streaming compatibility and predictable performance
2. **Integration Point**: MessageText component as primary integration (ChatContext for streaming if needed)
3. **Performance Strategy**: Single-pass O(n) processing with early returns and memoization
4. **Edge Case Handling**: Strict pattern matching with clear behavior for all malformed patterns

### Research Outputs

- [research.md](./research.md) - Complete architecture decisions and rationale
- 7 research areas covered: Pattern matching, integration points, streaming, performance, edge cases, testing, backward compatibility

---

## Phase 1: Design & Contracts Complete ✅

All design artifacts have been generated.

### Design Outputs

**Data Model** ([data-model.md](./data-model.md)):
- FilterResult: Output structure with filtered text and metadata
- ParserState: State machine states and transitions
- StreamingFilterContext: State management for progressive messages
- TagPattern: Tag format specification and validation rules
- State transition table with all 8 states mapped

**API Contract** ([contracts/messageFilter.contract.md](./contracts/messageFilter.contract.md)):
- `filterMessageTags(text)`: Standard message filtering function
- `StreamingMessageFilter`: Class for chunk-based streaming
- Complete API signatures with types
- Performance SLA: <5ms for 10k characters
- 20+ usage examples
- Integration patterns for MessageText and ChatContext
- Testing requirements with 30+ test cases

**Developer Guide** ([quickstart.md](./quickstart.md)):
- Step-by-step implementation guide (4-6 hour estimate)
- Starter code templates
- Testing checklist
- Common issues and solutions
- Performance targets and monitoring

### Agent Context Update ✅

- Updated `.cursor/rules/specify-rules.mdc` with:
  - Language: JavaScript ES2020+ (Vite/Babel)
  - Dependencies: React 18.2+, DOMPurify 3.3+, marked 16.4+
  - Project type: React component library
  - Testing: Jest 29.7+ with jsdom

---

## Implementation Overview

### File Changes

**New Files** (2):
```
src/utils/messageFilter.js          # Core filtering logic (state machine)
src/utils/messageFilter.test.js     # Unit tests (30+ test cases)
```

**Modified Files** (2):
```
src/components/Messages/MessageText.jsx       # Add filter integration
src/components/Messages/MessageText.test.js   # Integration tests (create if needed)
```

**Total LOC Estimate**: ~400-500 lines
- messageFilter.js: ~200 lines (state machine + both functions)
- messageFilter.test.js: ~150 lines (unit tests)
- MessageText.jsx: ~10 lines (integration)
- MessageText.test.js: ~50 lines (integration tests)

---

## Implementation Phases

### Phase 1 (P1): Standard Message Filtering
**Priority**: Critical (Core functionality)  
**Estimated Time**: 4-6 hours  
**Dependencies**: None

**Deliverables**:
1. `messageFilter.js` with `filterMessageTags()` function
2. Complete unit test suite (30+ tests)
3. Integration into `MessageText.jsx`
4. Integration tests
5. Manual browser testing

**Acceptance Criteria**:
- All unit tests pass
- Performance: <5ms for 10k char messages
- No visible tags in rendered messages
- Markdown rendering preserved
- Zero console errors

---

### Phase 2 (P2): Streaming Message Support
**Priority**: High (Modern chat experience)  
**Estimated Time**: 3-4 hours  
**Dependencies**: Phase 1 complete

**Deliverables**:
1. `StreamingMessageFilter` class in messageFilter.js
2. Streaming-specific unit tests
3. ChatContext integration (if needed)
4. Real-time streaming tests

**Acceptance Criteria**:
- No tag flicker during streaming
- Chunks process in <0.5ms each
- Partial tags buffered correctly
- Stream completion handles incomplete tags

---

### Phase 3 (P3): Multiple Tag Types
**Priority**: Medium (Extensibility)  
**Estimated Time**: 1-2 hours  
**Dependencies**: Phase 1 complete

**Deliverables**:
1. Additional test cases for various tag names
2. Documentation updates
3. Performance testing with complex scenarios

**Acceptance Criteria**:
- 10+ tag types in single message
- Arbitrary tag names supported
- No performance degradation

---

## Testing Strategy

### Unit Tests (messageFilter.test.js)
**Coverage Target**: >95%

**Test Categories**:
- Basic filtering (5 tests)
- Multiple tags (3 tests)
- Nested tags (3 tests)
- Edge cases (8 tests)
- Streaming (5 tests)
- Performance (2 tests)
- Error handling (3 tests)

**Total**: 30+ test cases

---

### Integration Tests (MessageText.test.js)
**Coverage Target**: Key integration paths

**Test Categories**:
- Tag removal in rendered output (3 tests)
- Markdown preservation (2 tests)
- Component interaction (2 tests)
- Empty message handling (2 tests)

**Total**: 10+ test cases

---

### Manual Testing
**Browser Verification**:
- [ ] Tags not visible in chat
- [ ] Streaming smooth (Phase 2)
- [ ] Markdown works (bold, links, lists)
- [ ] Quick replies/CTA unaffected
- [ ] Performance acceptable
- [ ] No visual artifacts

---

## Performance Requirements

### SLA Commitments

| Metric | Target | Verification Method |
|--------|--------|---------------------|
| Simple text (no tags) | <0.1ms | Unit test with performance.now() |
| 1,000 chars, 3 tags | <1ms | Unit test |
| 10,000 chars, 10 tags | <5ms | Unit test (SC-004) |
| Streaming chunk (100 chars) | <0.5ms | Unit test |
| Memory per message | <4KB | Chrome DevTools Profiler |

### Optimization Strategies

1. **Early return**: Skip processing if no `[[` markers
2. **Memoization**: Cache results in React useMemo
3. **Array building**: Use array + join for string concatenation
4. **Single pass**: O(n) state machine (no backtracking)

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Regex backtracking DoS | High | Low | Use state machine (not regex) |
| Streaming performance issues | Medium | Low | Buffer management + benchmarks |
| Breaking markdown | High | Low | Filter before markdown parser |
| False positives (legitimate `[[`) | Low | Very Low | Strict pattern matching |

### Integration Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Service layer changes needed | Medium | Low | Pure client-side solution |
| Conflicts with other features | Low | Low | Isolated utility function |
| Testing complexity | Medium | Medium | Comprehensive test suite |

---

## Success Metrics

### Feature Acceptance

- ✅ All 12 functional requirements (FR-001 to FR-012) met
- ✅ All 6 success criteria (SC-001 to SC-006) verified
- ✅ Zero user-visible tags in production
- ✅ No performance degradation
- ✅ 100% backward compatibility

### Code Quality

- ✅ >95% unit test coverage
- ✅ All linting rules pass
- ✅ No console warnings
- ✅ Documentation complete
- ✅ Code review approved

### Performance

- ✅ <5ms processing time (SC-004)
- ✅ 10+ tag types supported (SC-005)
- ✅ No visual flickering (SC-003)
- ✅ No artifacts (SC-002)

---

## Dependencies & Prerequisites

### External Dependencies
**None** - Feature uses existing dependencies:
- React 18.2+ (already installed)
- DOMPurify 3.3+ (already installed)
- marked 16.4+ (already installed)
- Jest 29.7+ (already installed)

### Internal Dependencies
**None** - Feature is self-contained utility

### Skills Required
- JavaScript ES2020+
- React hooks (useMemo)
- State machines (conceptual)
- Jest testing
- Performance profiling

---

## Rollout Plan

### Phase 1 Rollout (P1)
1. **Development**: 4-6 hours (one focused session)
2. **Code Review**: 1 hour
3. **Testing**: Internal QA on staging
4. **Deploy**: Gradual rollout with monitoring

### Monitoring
**Metrics to track**:
- Percentage of messages with tags
- Average filter execution time
- Tag removal count per message
- Performance percentiles (p50, p95, p99)

**Alerts**:
- Filter execution >10ms (threshold: 5ms target)
- Error rate >0.1%
- Memory leak detection

### Rollback Plan
**If issues arise**:
1. Disable filter via feature flag (wrap in config check)
2. Revert MessageText integration
3. Investigate and fix
4. Redeploy with fix

---

## Documentation Updates

### User-Facing
**None required** - Feature is transparent to end users

### Developer-Facing
- ✅ API contract: [contracts/messageFilter.contract.md](./contracts/messageFilter.contract.md)
- ✅ Quickstart: [quickstart.md](./quickstart.md)
- ✅ Data model: [data-model.md](./data-model.md)
- ✅ Architecture decisions: [research.md](./research.md)

### Code Documentation
- JSDoc comments on all public functions
- State machine diagram in code comments
- Example usage in README (if utility becomes public API)

---

## Future Enhancements

### Potential Improvements (Post-MVP)

1. **Configuration**: Allow customizing tag markers (e.g., `{{TAG}}` instead of `[[TAG]]`)
2. **Logging**: Optional tag removal logging for debugging
3. **Metrics**: Built-in performance telemetry
4. **Validation**: Tag name pattern configuration
5. **Whitelist**: Allow specific tags to pass through
6. **Extraction**: Option to extract and return removed tags (for analytics)

### Not Planned
- Tag transformation (changing tag content) - out of scope
- HTML tag filtering - covered by DOMPurify
- Custom tag formats - current format is spec'd by backend

---

## Open Questions

**None** - All research complete, all decisions documented.

---

## Appendix: Quick Reference

### Key Files
- **Spec**: [spec.md](./spec.md)
- **Research**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Contract**: [contracts/messageFilter.contract.md](./contracts/messageFilter.contract.md)
- **Quickstart**: [quickstart.md](./quickstart.md)

### Commands
```bash
# Run tests
npm test -- messageFilter.test.js

# Run linter
npm run lint

# Start dev
npm run dev

# Build
npm run build
```

### Key Metrics
- Performance: <5ms for 10k chars
- Coverage: >95%
- LOC: ~400-500 lines total
- Time: 4-6 hours for P1

---

## Plan Status

**Status**: ✅ **COMPLETE** - Ready for implementation

**Phase 0 (Research)**: ✅ Complete  
**Phase 1 (Design)**: ✅ Complete  
**Phase 2 (Tasks)**: ⏭️ Next step - Run `/speckit.tasks`

**Ready for**: Task breakdown and implementation

---

**Last Updated**: Thursday Jan 22, 2026  
**Plan Version**: 1.0.0  
**Branch**: 001-message-tag-filtering
