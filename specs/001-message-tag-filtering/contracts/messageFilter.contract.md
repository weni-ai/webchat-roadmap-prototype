# API Contract: messageFilter

**Feature**: Message Tag Filtering (001-message-tag-filtering)  
**Date**: Thursday Jan 22, 2026  
**Phase**: Phase 1 - Design & Contracts  
**Module**: `src/utils/messageFilter.js`

## Overview

This contract defines the public API for the message tag filtering utility. The module exports functions for removing metadata tags from message text in both standard (complete) and streaming (progressive) modes.

---

## Public API

### Function: `filterMessageTags`

**Purpose**: Remove all `[[TAG_NAME]]content[[/TAG_NAME]]` patterns from text (standard/complete messages)

**Signature**:
```javascript
function filterMessageTags(text: string): FilterResult
```

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | ✅ Yes | The message text to filter (may contain tags) |

**Returns**: `FilterResult`
```javascript
{
  text: string,           // Filtered text with all tags removed
  hadTags: boolean,       // Whether any tags were found
  tagsRemoved: number     // Count of tags removed
}
```

**Behavior**:
- Removes all valid tag patterns: `[[TAG_NAME]]content[[/TAG_NAME]]`
- Preserves all text outside tags
- Maintains spacing and formatting
- Handles multiple tags independently
- Handles nested tags (removes outermost tag and all contents)
- Treats unmatched opening tags as incomplete (hides from marker onward)
- Treats unmatched closing tags as regular text
- Returns early if no `[[` markers found (optimization)
- Processes in O(n) time where n = text length
- Should complete in <5ms for 10,000 character messages

**Examples**:

```javascript
// Simple tag removal
filterMessageTags("Results [[TAG]]data[[/TAG]]")
// Returns: { text: "Results ", hadTags: true, tagsRemoved: 1 }

// Multiple tags
filterMessageTags("[[A]]x[[/A]] middle [[B]]y[[/B]]")
// Returns: { text: " middle ", hadTags: true, tagsRemoved: 2 }

// No tags (early return)
filterMessageTags("Just normal text")
// Returns: { text: "Just normal text", hadTags: false, tagsRemoved: 0 }

// Nested tags
filterMessageTags("Text [[OUTER]]a [[INNER]]b[[/INNER]] c[[/OUTER]]")
// Returns: { text: "Text ", hadTags: true, tagsRemoved: 1 }

// Unmatched opening
filterMessageTags("Text [[TAG]]rest of message")
// Returns: { text: "Text ", hadTags: true, tagsRemoved: 1 }

// Unmatched closing
filterMessageTags("Text [[/TAG]] more")
// Returns: { text: "Text [[/TAG]] more", hadTags: false, tagsRemoved: 0 }

// Malformed patterns (ignored)
filterMessageTags("Text [SINGLE] or [[ SPACE ]]")
// Returns: { text: "Text [SINGLE] or [[ SPACE ]]", hadTags: false, tagsRemoved: 0 }

// Empty message
filterMessageTags("")
// Returns: { text: "", hadTags: false, tagsRemoved: 0 }

// Only tags (empty result)
filterMessageTags("[[TAG]]hidden[[/TAG]]")
// Returns: { text: "", hadTags: true, tagsRemoved: 1 }
```

**Error Handling**:
- **Invalid input type**: Throws `TypeError` if input is not a string
- **Null/undefined**: Throws `TypeError` 
- **Malformed tags**: Treated as regular text (no error)

**Performance Guarantees**:
- Time complexity: O(n)
- Space complexity: O(n)
- 10,000 chars in <5ms (requirement: SC-004)
- Early return optimization when no `[[` found

---

### Class: `StreamingMessageFilter`

**Purpose**: Filter tags from streaming messages that arrive in chunks

**Signature**:
```javascript
class StreamingMessageFilter {
  constructor()
  processChunk(chunk: string): string
  finalize(): string
  reset(): void
}
```

#### Constructor

**Signature**:
```javascript
constructor()
```

**Parameters**: None

**Returns**: `StreamingMessageFilter` instance

**Behavior**:
- Initializes parser state machine to `TEXT` state
- Creates empty buffers
- Resets statistics counters

**Example**:
```javascript
const filter = new StreamingMessageFilter();
```

---

#### Method: `processChunk`

**Purpose**: Process a chunk of streaming text and return visible output

**Signature**:
```javascript
processChunk(chunk: string): string
```

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `chunk` | `string` | ✅ Yes | A portion of the message text |

**Returns**: `string` - The visible text that should be displayed from this chunk

**Behavior**:
- Processes chunk character-by-character through state machine
- Buffers partial tags (not returned)
- Returns only visible text
- Maintains state across chunks
- Handles chunk boundaries within tags
- Updates internal statistics

**Examples**:

```javascript
const filter = new StreamingMessageFilter();

// Chunk 1: Start of message with partial tag
filter.processChunk("Results [[TAG")
// Returns: "Results " (tag buffered)

// Chunk 2: Complete the tag
filter.processChunk("]]hidden[[/TAG]] visible")
// Returns: " visible" (tag removed, content after tag shown)

// Chunk 3: More text
filter.processChunk(" more")
// Returns: " more"
```

```javascript
const filter = new StreamingMessageFilter();

// Chunk boundaries split marker
filter.processChunk("Text [")
// Returns: "" (might be tag, buffering)

filter.processChunk("[TAG]]hide[[/TAG]]")
// Returns: "Text " (was not a tag, emit, then handle real tag)
```

**Error Handling**:
- **Invalid input type**: Throws `TypeError` if chunk is not a string
- **Null/undefined**: Throws `TypeError`
- **Malformed chunks**: Handled gracefully (state machine emits buffered content)

**State Persistence**:
- State persists across `processChunk` calls
- Buffers accumulate until tags complete
- Must call `finalize()` after last chunk

---

#### Method: `finalize`

**Purpose**: Complete the streaming process and return any remaining visible text

**Signature**:
```javascript
finalize(): string
```

**Parameters**: None

**Returns**: `string` - Any remaining visible text from buffers

**Behavior**:
- Handles incomplete tags at message end (discards per FR-009)
- Emits any buffered visible text
- Does NOT reset state (call `reset()` separately if reusing instance)
- Should be called exactly once after all chunks processed

**Examples**:

```javascript
const filter = new StreamingMessageFilter();

filter.processChunk("Text [[TAG]]hid");
filter.processChunk("den");
// Tag never closed

const remaining = filter.finalize();
// Returns: "" (incomplete tag discarded)
```

```javascript
const filter = new StreamingMessageFilter();

filter.processChunk("Text [");
// Might be a tag, buffered

const remaining = filter.finalize();
// Returns: "[" (wasn't a tag, emit buffer)
```

**Error Handling**:
- **Called multiple times**: Returns empty string on subsequent calls (idempotent)

---

#### Method: `reset`

**Purpose**: Reset the filter to initial state for reuse

**Signature**:
```javascript
reset(): void
```

**Parameters**: None

**Returns**: `void`

**Behavior**:
- Resets state to `TEXT`
- Clears all buffers
- Resets statistics
- Allows instance reuse

**Example**:
```javascript
const filter = new StreamingMessageFilter();

// Process message 1
filter.processChunk("Message 1 [[TAG]]x[[/TAG]]");
filter.finalize();

// Reuse for message 2
filter.reset();
filter.processChunk("Message 2 [[TAG]]y[[/TAG]]");
filter.finalize();
```

**Note**: Creating a new instance is also acceptable; `reset()` is for optimization/reuse scenarios.

---

## Type Definitions

### FilterResult

```javascript
{
  text: string,           // The filtered text (all tags removed)
  hadTags: boolean,       // True if any tags were detected and removed
  tagsRemoved: number     // Count of tags successfully removed
}
```

**Invariants**:
- `text` is always a valid string (can be empty)
- `hadTags` is `true` if and only if `tagsRemoved > 0`
- `tagsRemoved >= 0`

---

### ParserState (Internal)

```javascript
enum ParserState {
  TEXT = 'TEXT',
  TAG_OPENING_1 = 'TAG_OPENING_1',
  TAG_OPENING_2 = 'TAG_OPENING_2',
  TAG_NAME = 'TAG_NAME',
  TAG_CONTENT = 'TAG_CONTENT',
  TAG_CLOSING_1 = 'TAG_CLOSING_1',
  TAG_CLOSING_2 = 'TAG_CLOSING_2',
  TAG_CLOSING_NAME = 'TAG_CLOSING_NAME'
}
```

**Note**: Internal implementation detail; not exported from module.

---

## Tag Pattern Specification

### Valid Tag Format

```
[[TAG_NAME]]content[[/TAG_NAME]]
```

**Components**:
- Opening marker: `[[` (exactly two opening brackets)
- Tag name: 1-50 characters matching `/^[A-Z0-9_-]+$/`
- Closing marker: `]]` (exactly two closing brackets)
- Content: Any characters (including nested tags)
- Closing tag: `[[/TAG_NAME]]` (forward slash after opening brackets)

**Constraints**:
- Tag names are case-sensitive
- Opening and closing tag names must match exactly
- No whitespace inside markers
- Tag name must be uppercase letters, numbers, underscores, or hyphens

### Valid Examples

```
[[TAG]]content[[/TAG]]
[[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]
[[TAG_123]]data[[/TAG_123]]
[[MULTI-WORD-TAG]]info[[/MULTI-WORD-TAG]]
[[A]][[B]]nested[[/B]][[/A]]
```

### Invalid Examples (treated as regular text)

```
[TAG]               // Single brackets
[[tag]]             // Lowercase
[[ TAG ]]           // Whitespace in marker
[[TAG/]]            // Closing slash in wrong place  
[[TAG]]x[[/TAG2]]   // Mismatched names
[[]]                // Empty tag name
[[TAG]]             // Unmatched (handled as incomplete tag)
```

---

## Integration Contract

### MessageText Component Integration

**Current MessageText.jsx**:
```javascript
export function MessageText({ message, componentsEnabled }) {
  const html = useMemo(() => {
    if (!message.text) return '';
    
    const purifiedContent = DOMPurify.sanitize(message.text);
    // ... markdown processing
  }, [message.text, message.status]);
}
```

**Updated MessageText.jsx**:
```javascript
import { filterMessageTags } from '@/utils/messageFilter';

export function MessageText({ message, componentsEnabled }) {
  const html = useMemo(() => {
    if (!message.text) return '';
    
    // NEW: Filter tags before sanitization
    const { text: filteredText } = filterMessageTags(message.text);
    
    // If message is empty after filtering, return empty
    if (!filteredText.trim()) return '';
    
    const purifiedContent = DOMPurify.sanitize(filteredText);
    // ... markdown processing (unchanged)
  }, [message.text, message.status]);
}
```

**Integration Points**:
1. Import `filterMessageTags` from utils
2. Apply filter **before** DOMPurify (filter runs on raw text)
3. Use filtered text for all subsequent processing
4. Memoized with `message.text` and `message.status` dependencies

---

### ChatContext Integration (Streaming)

**For streaming messages** (if needed in Phase 2):

```javascript
import { StreamingMessageFilter } from '@/utils/messageFilter';

// In ChatContext or message handler
const streamingFilters = new Map(); // messageId -> filter instance

service.on('message:streaming:chunk', ({ messageId, chunk, isComplete }) => {
  if (!streamingFilters.has(messageId)) {
    streamingFilters.set(messageId, new StreamingMessageFilter());
  }
  
  const filter = streamingFilters.get(messageId);
  const visibleChunk = filter.processChunk(chunk);
  
  // Update message state with visible chunk only
  updateMessageContent(messageId, visibleChunk);
  
  if (isComplete) {
    const remaining = filter.finalize();
    if (remaining) {
      updateMessageContent(messageId, remaining);
    }
    streamingFilters.delete(messageId); // Cleanup
  }
});
```

---

## Testing Contract

### Required Unit Tests

The `messageFilter.test.js` must include:

**Basic Functionality**:
- ✅ Filter simple tag: `[[TAG]]content[[/TAG]]`
- ✅ Preserve text before tag
- ✅ Preserve text after tag
- ✅ Handle empty message
- ✅ Handle message with no tags
- ✅ Return FilterResult with correct structure

**Multiple Tags**:
- ✅ Filter multiple independent tags
- ✅ Handle adjacent tags: `[[A]]x[[/A]][[B]]y[[/B]]`
- ✅ Handle separated tags: `[[A]]x[[/A]] middle [[B]]y[[/B]]`

**Nested Tags**:
- ✅ Remove outer tag with nested content
- ✅ Handle deeply nested tags (3+ levels)

**Edge Cases**:
- ✅ Unmatched opening tag (hide to end)
- ✅ Unmatched closing tag (display as text)
- ✅ Case sensitivity: `[[TAG]]x[[/tag]]` (mismatch)
- ✅ Whitespace in markers: `[[ TAG ]]` (invalid)
- ✅ Single brackets: `[TAG]` (invalid)
- ✅ Empty tag: `[[TAG]][[/TAG]]`
- ✅ Empty tag name: `[[]]content[[/]]` (invalid)

**Streaming**:
- ✅ Process chunks that split in middle of tag
- ✅ Process chunks that split markers: `[` / `[TAG]]`
- ✅ Handle incomplete tag at stream end
- ✅ Reset and reuse filter instance

**Performance**:
- ✅ 10,000 characters in <5ms
- ✅ Early return optimization (no tags)
- ✅ Multiple tags performance

---

## Backward Compatibility

**Breaking Changes**: None

**New Behavior**:
- Any text matching `[[TAG_NAME]]...[[/TAG_NAME]]` will be removed
- Risk: Legitimate use of `[[` in normal text could be affected
- Mitigation: Pattern is very specific; unlikely in normal conversation

**Deprecations**: None

**Migration**: None required (additive feature)

---

## Performance SLA

| Operation | Target | Measured At |
|-----------|--------|-------------|
| `filterMessageTags` - simple (no tags) | <0.1ms | Early return |
| `filterMessageTags` - 1,000 chars, 3 tags | <1ms | Single pass |
| `filterMessageTags` - 10,000 chars, 10 tags | <5ms | Worst case |
| `processChunk` - 100 char chunk | <0.5ms | Per chunk |
| Memory overhead | <4KB | Per message |

**Monitoring**: Consider adding performance metrics to track:
- Average filter execution time
- Percentage of messages with tags
- Tag removal statistics

---

## Security Considerations

### Regex Denial of Service (ReDoS)

**Risk**: Regular expressions with backtracking can cause catastrophic performance on malicious input

**Mitigation**: This implementation uses a state machine, not regex, avoiding backtracking entirely

### Content Injection

**Risk**: Malicious tags designed to break filtering

**Mitigation**: 
- Strict pattern matching
- Invalid patterns emit as regular text (safe)
- Runs before DOMPurify (additional XSS protection)

### Memory Exhaustion

**Risk**: Extremely long tags could consume excessive memory

**Mitigation**:
- Tag name limited to 50 characters
- Message length limited to 10,000 characters (per spec)
- Buffers bounded by message length

---

## Examples

### Complete Usage Example

```javascript
import { filterMessageTags, StreamingMessageFilter } from '@/utils/messageFilter';

// Standard message filtering
function renderMessage(message) {
  const { text, hadTags } = filterMessageTags(message.text);
  
  if (hadTags) {
    console.log('Removed tags from message:', message.id);
  }
  
  return processMarkdown(text);
}

// Streaming message filtering
function setupStreamingMessageHandler() {
  const filter = new StreamingMessageFilter();
  
  socket.on('chunk', (chunk) => {
    const visibleText = filter.processChunk(chunk);
    if (visibleText) {
      appendToMessage(visibleText);
    }
  });
  
  socket.on('end', () => {
    const remaining = filter.finalize();
    if (remaining) {
      appendToMessage(remaining);
    }
  });
}
```

---

## Versioning

**Version**: 1.0.0  
**Status**: Draft  
**Last Updated**: Thursday Jan 22, 2026

**Changelog**:
- 1.0.0 (2026-01-22): Initial contract specification

---

## References

- Feature Spec: [spec.md](../spec.md)
- Research: [research.md](../research.md)
- Data Model: [data-model.md](../data-model.md)
- Implementation Plan: [plan.md](../plan.md)
