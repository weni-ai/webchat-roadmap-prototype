# Research: Message Tag Filtering

**Feature**: Message Tag Filtering (001-message-tag-filtering)  
**Date**: Thursday Jan 22, 2026  
**Phase**: Phase 0 - Research & Architecture Decisions

## Overview

This document captures the research findings and architectural decisions for implementing message tag filtering in the Weni webchat. The system must filter out metadata tags (`[[TAG_NAME]]content[[/TAG_NAME]]`) from both standard and streaming messages before display.

## Research Areas

### 1. Text Pattern Matching Approach

**Question**: What's the best approach for detecting and removing tag patterns from text?

**Options Evaluated**:

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Regular Expressions** | Fast, concise, built-in | Potential backtracking issues with nested/malformed tags, harder to handle streaming | ❌ Not suitable for streaming |
| **State Machine Parser** | Handles streaming naturally, no backtracking risk, clear edge case handling | More code than regex, slightly more complex | ✅ **SELECTED** |
| **String indexOf/scanning** | Simple, performant | Verbose code for edge cases, harder to maintain | ❌ Less maintainable |
| **Abstract Syntax Tree (AST)** | Powerful, extensible | Overkill for simple tag format, performance overhead | ❌ Over-engineered |

**Decision**: **State Machine Parser**

**Rationale**:
- State machines naturally handle streaming content character-by-character
- Can buffer partial tags without displaying them
- Clear states for edge cases: unmatched tags, nested tags, malformed patterns
- No regex backtracking vulnerabilities
- Easier to test each state transition independently
- Performance is predictable (O(n) single pass)

**Alternatives Considered**:
- **Regex approach**: Would work well for standard (non-streaming) messages with simple patterns but fails for streaming where we need to buffer partial tag matches. Example: `text.replace(/\[\[[^\]]+\]\].*?\[\[\/[^\]]+\]\]/g, '')` could work but would require different logic for streaming vs non-streaming paths.
- **Two-pass approach**: One regex for standard messages, one state machine for streaming. Rejected due to code duplication and maintenance burden.

### 2. Integration Point in Message Flow

**Question**: Where should filtering be applied in the message processing pipeline?

**Current Message Flow**:
```
Service (@weni/webchat-service)
  → ChatContext (state management)
    → MessagesList (message iteration)
      → MessageContainer (wrapper)
        → MessageText (rendering with DOMPurify + marked)
```

**Options Evaluated**:

| Integration Point | Pros | Cons | Decision |
|-------------------|------|------|----------|
| **Service Layer** (external package) | Filter once, earliest possible | Requires changes to external package we don't control | ❌ Not feasible |
| **ChatContext** (message state) | Filter once when message arrives, clean state | Modifies state before React sees it, affects all message types | ⚠️ Secondary option |
| **MessageText** (render component) | Precise control, only affects text rendering | Filters on every render if not memoized | ✅ **PRIMARY** |
| **Utility HOC/Hook** | Reusable, composable | Adds abstraction layer | ❌ Unnecessary complexity |

**Decision**: **MessageText component with ChatContext fallback**

**Rationale**:
- **Primary**: Apply filter in `MessageText.jsx` during the text processing phase (before markdown parsing)
  - Filters alongside existing DOMPurify sanitization
  - Clear integration point with existing `useMemo` for performance
  - Only processes text messages (images, videos, etc. unaffected)
  - Easy to test in isolation
  
- **Fallback**: For streaming messages, may need early filtering in `ChatContext` to prevent partial tags from reaching state
  - Handles real-time streaming where characters arrive progressively
  - Buffers incomplete tags until closing marker received
  - Can emit filtered chunks to MessageText

**Implementation Strategy**:
1. Start with `MessageText` integration for standard messages (P1)
2. Add streaming support in `ChatContext` if needed (P2)
3. Both paths use the same `messageFilter` utility function

### 3. Streaming Message Handling

**Question**: How do we buffer streaming content that might contain partial tags?

**Challenge**: Streaming messages arrive character-by-character or in chunks. A tag might be split across multiple chunks:
- Chunk 1: `"Here are results [[SEARCH_"`
- Chunk 2: `"RESULT]]NEXUS-1234[[/SEARCH_R"`
- Chunk 3: `"ESULT]]"`

**Solution Architecture**:

```javascript
class StreamingMessageFilter {
  constructor() {
    this.state = 'TEXT';           // Current parser state
    this.buffer = '';              // Accumulates characters
    this.tagNameBuffer = '';       // Accumulates tag name
    this.contentBuffer = '';       // Accumulates tag content
    this.visibleOutput = '';       // Clean text to display
  }

  // States: TEXT, TAG_OPENING, TAG_NAME, TAG_CONTENT, TAG_CLOSING, TAG_CLOSING_NAME
  
  processChunk(chunk) {
    for (let char of chunk) {
      this.processCharacter(char);
    }
    return this.flushVisibleOutput();
  }
  
  processCharacter(char) {
    // State machine logic
    // Transitions between states based on character
    // Buffers tag content, emits visible text
  }
}
```

**State Transitions**:
- `TEXT` → `TAG_OPENING`: When see first `[`
- `TAG_OPENING` → `TAG_NAME`: When see second `[`
- `TAG_NAME` → `TAG_CONTENT`: When see `]]`
- `TAG_CONTENT` → `TAG_CLOSING`: When see `[`
- `TAG_CLOSING` → `TAG_CLOSING_NAME`: When see `[/`
- `TAG_CLOSING_NAME` → `TEXT`: When see `]]` matching opening tag

**Buffering Strategy**:
- Visible text emitted immediately in `TEXT` state
- Everything else buffered until tag completion or invalidation
- On tag close: discard all buffers, return to `TEXT`
- On malformed pattern: emit buffers as visible text, return to `TEXT`

### 4. Performance Optimization

**Question**: How do we meet the <5ms processing requirement for 10,000 character messages?

**Benchmark Requirements**:
- 10,000 characters should process in <5ms
- This gives us ~0.5 microseconds per character budget
- Includes: pattern detection, buffering, string concatenation

**Optimizations**:

1. **Single-pass processing**: State machine processes each character exactly once (O(n))

2. **Efficient string building**: Use array accumulation + join instead of concatenation
   ```javascript
   // ❌ Slow (creates new string each time)
   let result = '';
   for (let char of text) result += char;
   
   // ✅ Fast (mutations, single allocation at end)
   let result = [];
   for (let char of text) result.push(char);
   return result.join('');
   ```

3. **Memoization in React**: Wrap filter in `useMemo` to avoid re-processing
   ```javascript
   const filteredText = useMemo(
     () => filterMessageTags(message.text),
     [message.text, message.status]  // Only recompute on text change
   );
   ```

4. **Early returns**: If no `[[` markers found, return original text immediately
   ```javascript
   if (!text.includes('[[')) return text;
   ```

5. **Lazy initialization**: Only create StreamingMessageFilter instance when needed

**Expected Performance**:
- Simple text (no tags): ~0.1ms (early return)
- Text with 5 tags: ~2ms (single pass + array operations)
- 10,000 char text with 10 tags: ~4ms (worst case)

### 5. Edge Case Handling Strategy

**Question**: How do we handle malformed or edge case tag patterns?

**Edge Cases Identified**:

| Case | Example | Expected Behavior | Implementation |
|------|---------|-------------------|----------------|
| **Unmatched opening** | `[[TAG]]content (no close)` | Hide from opening tag onward | State machine stays in TAG_CONTENT until message ends |
| **Unmatched closing** | `text [[/TAG]]` | Display closing tag as text | No matching opening in stack → emit as normal text |
| **Nested tags** | `[[A]]x [[B]]y[[/B]][[/A]]` | Remove entire outer tag | Track tag stack, only close on matching name |
| **Malformed pattern** | `[SINGLE]`, `[[NO_SLASH/]]` | Display as normal text | Invalid patterns fail state transitions → emit buffer |
| **Case sensitivity** | `[[TAG]]x[[/tag]]` | Display as normal text (mismatch) | Tag names compared case-sensitive |
| **Whitespace in tags** | `[[ TAG ]]` | Display as normal text | Pattern requires exact `[[` `]]` format |
| **Empty tag name** | `[[]]content[[/]]` | Display as normal text | Tag name validation in TAG_NAME state |
| **Very long tags** | 5000 char tag content | Buffer and discard | No special handling, buffers in memory |
| **Multiple tags** | `[[A]]x[[/A]][[B]]y[[/B]]` | Remove both independently | State machine resets after each complete tag |
| **Streaming mid-tag** | Chunk ends at `[[TAG` | Buffer until next chunk | Buffers accumulate across chunks |

**Validation Rules**:
- Tag names must match pattern: `/^[A-Z0-9_-]+$/` (uppercase letters, numbers, underscore, hyphen)
- Opening and closing tag names must match exactly (case-sensitive)
- Markers must be exact: `[[` and `]]` (no spaces)
- Closing tags must have forward slash: `[[/TAG]]`

### 6. Testing Strategy

**Question**: How do we ensure comprehensive test coverage for all scenarios?

**Test Pyramid**:

```
                    /\
                   /  \
                  /E2E \         Manual/Visual: Message display in browser
                 /______\
                /        \
               /Integration\     React Testing Library: MessageText + filter
              /____________\
             /              \
            /  Unit Tests    \   Jest: messageFilter.js state machine
           /__________________\
```

**Unit Tests** (messageFilter.test.js):
- ✅ Simple tag removal: `[[TAG]]content[[/TAG]]`
- ✅ Multiple tags: `[[A]]x[[/A]][[B]]y[[/B]]`
- ✅ Nested tags: `[[OUTER]]x [[INNER]]y[[/INNER]][[/OUTER]]`
- ✅ Unmatched opening: `[[TAG]]content (no close)`
- ✅ Unmatched closing: `text [[/TAG]]`
- ✅ Malformed patterns: `[SINGLE]`, `[[MISSING/]]`
- ✅ Case sensitivity: `[[TAG]]x[[/tag]]`
- ✅ Whitespace variations: `[[ TAG ]]`, `[[TAG ]]`
- ✅ Empty content: `[[TAG]][[/TAG]]`
- ✅ Empty message: `""`
- ✅ No tags: `"normal text"`
- ✅ Performance: 10,000 chars in <5ms
- ✅ Streaming: Multi-chunk processing
- ✅ Streaming mid-tag: Chunk boundaries within tags

**Integration Tests** (MessageText.test.js):
- ✅ Tagged message renders without tags
- ✅ Markdown preserved after filtering
- ✅ Links work after filtering
- ✅ Streaming messages update correctly
- ✅ Quick replies/CTA components unaffected

**Visual/Manual Tests**:
- ✅ Streaming messages don't flicker
- ✅ No visible tag markers during streaming
- ✅ Message spacing correct after filtering
- ✅ Performance acceptable in real chat flow

### 7. Backward Compatibility

**Question**: Does this feature break existing functionality?

**Risk Assessment**:

| Component | Risk | Mitigation |
|-----------|------|------------|
| **Existing messages** | Messages with `[[` in normal text might be filtered | Low risk: `[[` is rare in normal text; requires exact `[[TAG]]` format |
| **Markdown rendering** | Filter might break markdown syntax | Filter runs *before* markdown parser; markdown syntax preserved |
| **Message timestamps** | N/A | Filter only affects text content, not metadata |
| **Quick replies** | N/A | Filter only affects message.text, not message.quick_replies |
| **Custom components** | N/A | Filter doesn't affect custom message types |
| **Service layer** | N/A | No changes to @weni/webchat-service |

**Safety Measures**:
1. **Opt-in behavior**: Filter only activates when tags detected (no `[[` → early return)
2. **Strict pattern matching**: Only `[[TAG_NAME]]...[[/TAG_NAME]]` filtered; loose patterns ignored
3. **Comprehensive tests**: Ensure markdown, links, formatting preserved
4. **Feature flag ready**: Easy to disable if issues arise (wrap in config check)

**Migration Path**: None required - feature is additive and backward compatible.

## Architecture Decisions Summary

### Primary Decisions

1. **Filtering Approach**: State machine parser for streaming-compatible, predictable performance
2. **Integration Point**: MessageText component (with ChatContext streaming support if needed)
3. **Performance Strategy**: Single-pass processing, memoization, early returns, array-based string building
4. **Edge Case Handling**: Strict pattern matching with clear behavior for malformed tags

### Implementation Plan

**Phase 1 (P1)**: Standard Message Filtering
- Create `messageFilter.js` with state machine
- Integrate into `MessageText.jsx` 
- Comprehensive unit tests
- Integration tests

**Phase 2 (P2)**: Streaming Message Support
- Extend state machine for chunk processing
- Add streaming buffer management
- ChatContext integration if needed
- Streaming-specific tests

**Phase 3 (P3)**: Multiple Tag Types
- Already supported by generic state machine
- Additional test cases for various tag names
- Documentation and examples

## Open Questions

None - all research complete and decisions documented.

## References

- Feature Spec: [spec.md](./spec.md)
- Implementation Plan: [plan.md](./plan.md)
- React useMemo optimization: https://react.dev/reference/react/useMemo
- State machine pattern: https://en.wikipedia.org/wiki/Finite-state_machine
