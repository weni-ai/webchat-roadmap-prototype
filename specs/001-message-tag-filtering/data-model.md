# Data Model: Message Tag Filtering

**Feature**: Message Tag Filtering (001-message-tag-filtering)  
**Date**: Thursday Jan 22, 2026  
**Phase**: Phase 1 - Design & Contracts

## Overview

This document defines the data structures and state models used in the message tag filtering system. Since this is a stateless text transformation feature, there are no persistent entities. The data model focuses on transient runtime structures used during filtering.

## Core Entities

### 1. FilterResult

**Purpose**: Represents the output of a filtering operation

**Structure**:
```javascript
{
  // The filtered text with all tags removed
  text: string,
  
  // Whether any tags were found and removed
  hadTags: boolean,
  
  // Number of tags that were removed
  tagsRemoved: number,
  
  // Optional: array of removed tag names for debugging/logging
  removedTagNames?: string[]
}
```

**Usage**:
- Returned by `filterMessageTags(text)` function
- Used in MessageText component to replace original text
- `hadTags` can be used for metrics/logging

**Example**:
```javascript
// Input: "Results [[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]"
// Output:
{
  text: "Results ",
  hadTags: true,
  tagsRemoved: 1,
  removedTagNames: ["SEARCH_RESULT"]
}
```

**Validation**:
- `text` must be a string (can be empty)
- `hadTags` must be boolean
- `tagsRemoved` must be non-negative integer
- `removedTagNames` (if present) must be array of strings

---

### 2. ParserState

**Purpose**: Represents the current state of the streaming parser state machine

**States** (enum):
```javascript
const ParserState = {
  TEXT: 'TEXT',                      // Reading normal visible text
  TAG_OPENING_1: 'TAG_OPENING_1',    // Saw first '[' 
  TAG_OPENING_2: 'TAG_OPENING_2',    // Saw second '[' (entering tag)
  TAG_NAME: 'TAG_NAME',              // Reading tag name
  TAG_CONTENT: 'TAG_CONTENT',        // Reading content inside tag
  TAG_CLOSING_1: 'TAG_CLOSING_1',    // Saw first '[' while in content
  TAG_CLOSING_2: 'TAG_CLOSING_2',    // Saw '[/' (entering closing tag)
  TAG_CLOSING_NAME: 'TAG_CLOSING_NAME' // Reading closing tag name
};
```

**State Transitions**:
```
TEXT ─[──> TAG_OPENING_1 ─[──> TAG_OPENING_2 ─a-z,0-9,_,-──> TAG_NAME ─]──> TAG_CONTENT
  ↑                                                                               │
  └───────────────────────────────────────[─────────────────────────────────────┘
                                          │
                                          └──/──> TAG_CLOSING_2 ─a-z,0-9,_,-──> TAG_CLOSING_NAME ─]──> TEXT
```

**Validation**:
- State must be one of the defined enum values
- State transitions must follow the state machine diagram
- Invalid character for current state resets to TEXT

---

### 3. StreamingFilterContext

**Purpose**: Maintains state across multiple streaming chunks

**Structure**:
```javascript
{
  // Current parser state
  state: ParserState,
  
  // Buffers for accumulating characters
  buffers: {
    // Characters that might be a tag marker ('[', '[[', '[/', etc.)
    marker: string,
    
    // Current tag name being read
    tagName: string,
    
    // Content between opening and closing tags
    content: string,
    
    // Closing tag name being read
    closingTagName: string,
    
    // Visible text ready to be displayed
    visible: string[]  // Array for efficient concatenation
  },
  
  // Stack of open tags (for nested tag handling)
  tagStack: string[],
  
  // Statistics for debugging
  stats: {
    charsProcessed: number,
    tagsRemoved: number,
    chunksProcessed: number
  }
}
```

**Lifecycle**:
1. Created when streaming message starts
2. Updated with each incoming chunk via `processChunk(chunk)`
3. Finalized when message completes via `finalize()`
4. Disposed after message rendering

**Example** (mid-stream):
```javascript
// After processing: "Results [[SEARCH_RE"
{
  state: ParserState.TAG_NAME,
  buffers: {
    marker: '',
    tagName: 'SEARCH_RE',
    content: '',
    closingTagName: '',
    visible: ['Results ', ' ']
  },
  tagStack: [],
  stats: {
    charsProcessed: 19,
    tagsRemoved: 0,
    chunksProcessed: 1
  }
}
```

**Validation**:
- `state` must be valid ParserState
- `buffers.visible` must be array
- `tagStack` must be array of strings
- `stats` counters must be non-negative

---

### 4. TagPattern

**Purpose**: Defines the expected format of a valid tag

**Structure**:
```javascript
{
  // Opening marker (always '[[')
  openMarker: '[[',
  
  // Closing marker (always ']]')
  closeMarker: ']]',
  
  // Pattern for valid tag names
  namePattern: /^[A-Z0-9_-]+$/,
  
  // Closing tag prefix (always '/')
  closingPrefix: '/'
}
```

**Constraints**:
- Tag names must be uppercase (A-Z)
- Can contain numbers (0-9)
- Can contain underscores (_) and hyphens (-)
- Minimum length: 1 character
- Maximum length: 50 characters (practical limit)
- Opening and closing tag names must match exactly

**Valid Examples**:
- `[[TAG]]content[[/TAG]]`
- `[[SEARCH_RESULT]]data[[/SEARCH_RESULT]]`
- `[[TAG_123]]info[[/TAG_123]]`
- `[[MULTI-WORD-TAG]]text[[/MULTI-WORD-TAG]]`

**Invalid Examples**:
- `[TAG]` (single brackets)
- `[[tag]]` (lowercase)
- `[[ TAG ]]` (whitespace)
- `[[TAG/]]` (missing closing slash in wrong place)
- `[[TAG123]]x[[/TAG456]]` (mismatched names)

---

### 5. Message (Context from Service)

**Purpose**: The message object received from @weni/webchat-service (read-only)

**Relevant Fields**:
```javascript
{
  id: string,              // Unique message identifier
  type: string,            // 'text', 'image', 'video', etc.
  text: string,            // The raw message text (may contain tags)
  direction: 'incoming' | 'outgoing',
  status: 'sent' | 'delivered' | 'streaming',
  timestamp: number,       // Unix timestamp
  
  // Optional components (unaffected by filtering)
  quick_replies?: Array,
  list_message?: Object,
  cta_message?: Object,
  metadata?: Object
}
```

**Filtering Scope**:
- **Filtered**: `text` field only
- **Preserved**: All other fields unchanged
- **Condition**: Only when `type === 'text'` and `direction === 'incoming'`

**Note**: Filtering is read-only transformation; original message object is never mutated.

---

## Data Flow

### Standard Message Flow

```
1. Service delivers message
   ↓
2. ChatContext adds to state
   message.text: "Results [[TAG]]data[[/TAG]]"
   ↓
3. MessagesList iterates messages
   ↓
4. MessageText receives message
   ↓
5. filterMessageTags(message.text)
   - Parses: "Results [[TAG]]data[[/TAG]]"
   - Returns: FilterResult { text: "Results ", hadTags: true, ... }
   ↓
6. DOMPurify sanitizes: "Results "
   ↓
7. marked parses markdown
   ↓
8. Render to DOM
```

### Streaming Message Flow

```
1. Service delivers chunk 1: "Results [[TAG"
   ↓
2. StreamingFilterContext.processChunk("Results [[TAG")
   - state: TAG_NAME
   - buffers.visible: ["Results "]
   - buffers.tagName: "TAG"
   ↓
3. Render: "Results " (tag buffered, not shown)
   ↓
4. Service delivers chunk 2: "]]data[[/TAG]]"
   ↓
5. StreamingFilterContext.processChunk("]]data[[/TAG]]")
   - Detects complete tag
   - Discards buffer
   - state: TEXT
   - buffers.visible: ["Results "]
   ↓
6. Render: "Results " (tag removed)
```

---

## State Machine Details

### State Transition Table

| Current State | Input Character | Next State | Action |
|--------------|----------------|------------|--------|
| TEXT | `[` | TAG_OPENING_1 | Buffer `[` |
| TEXT | any other | TEXT | Append to visible |
| TAG_OPENING_1 | `[` | TAG_OPENING_2 | Clear marker buffer |
| TAG_OPENING_1 | any other | TEXT | Emit buffered `[`, append char to visible |
| TAG_OPENING_2 | `[A-Z0-9_-]` | TAG_NAME | Start tag name buffer |
| TAG_OPENING_2 | any other | TEXT | Emit `[[`, append char to visible |
| TAG_NAME | `[A-Z0-9_-]` | TAG_NAME | Append to tag name buffer |
| TAG_NAME | `]` | TAG_CLOSING_BRACKET_1 | Wait for second `]` |
| TAG_NAME | any other | TEXT | Emit `[[` + tag name + char, reset |
| TAG_CLOSING_BRACKET_1 | `]` | TAG_CONTENT | Push tag to stack, clear tag name buffer |
| TAG_CLOSING_BRACKET_1 | any other | TAG_NAME | Append `]` + char to tag name |
| TAG_CONTENT | `[` | TAG_CLOSING_1 | Buffer potential closing marker |
| TAG_CONTENT | any other | TAG_CONTENT | Buffer content (not visible) |
| TAG_CLOSING_1 | `/` | TAG_CLOSING_2 | Start closing sequence |
| TAG_CLOSING_1 | `[` | TAG_OPENING_2 | Nested tag opening |
| TAG_CLOSING_1 | any other | TAG_CONTENT | Buffer `[` + char |
| TAG_CLOSING_2 | `[A-Z0-9_-]` | TAG_CLOSING_NAME | Start closing tag name buffer |
| TAG_CLOSING_2 | any other | TAG_CONTENT | Buffer `[/` + char |
| TAG_CLOSING_NAME | `[A-Z0-9_-]` | TAG_CLOSING_NAME | Append to closing tag name buffer |
| TAG_CLOSING_NAME | `]` | TAG_CLOSING_BRACKET_1_CLOSE | Wait for second `]` |
| TAG_CLOSING_NAME | any other | TAG_CONTENT | Buffer `[/` + name + char |
| TAG_CLOSING_BRACKET_1_CLOSE | `]` | TEXT (if match) / TAG_CONTENT (if no match) | Verify tag match, discard or buffer |

---

## Memory Considerations

### Buffer Sizing

**Typical Scenario**:
- Message: 500 characters
- Tags: 2-3 tags, 20-50 chars each
- Buffers: ~100 characters total
- Memory: <1KB per message

**Worst Case**:
- Message: 10,000 characters  
- Tags: 10 tags, 1,000 chars each
- Buffers: ~2,000 characters
- Memory: ~4KB per message

**Limits**:
- Tag name max: 50 characters (enforced)
- Tag content max: unlimited (spec allows 1,000 chars typical, 10,000 chars max mentioned)
- Message max: 10,000 characters (per spec SC-004)

**Memory Safety**:
- No memory leaks: buffers cleared after each complete tag
- No unbounded growth: buffers reset on malformed patterns
- Streaming contexts disposed after message completion

---

## Validation & Invariants

### Invariants (must always be true)

1. **State Consistency**: Parser state must always be one of the defined states
2. **Buffer Isolation**: Buffers never mix content from different tags
3. **Tag Stack Balance**: Open tag count ≥ 0 (tags in stack ≤ tags opened)
4. **Visibility**: Only TEXT state appends to visible buffer
5. **No Partial Tags**: Closing tag name must match an open tag name exactly

### Validation Rules

1. **Tag Name**: `/^[A-Z0-9_-]{1,50}$/`
2. **Markers**: Must be exactly `[[` and `]]` (no variations)
3. **Matching**: Opening and closing tag names must be identical (case-sensitive)
4. **Nesting**: Inner tags must close before outer tags

### Error Handling

**Malformed Input**:
- Invalid characters in tag name → Reset to TEXT, emit buffered content
- Unmatched closing tag → Emit as regular text
- Incomplete tag at message end → Discard buffer (per spec FR-009)

**Edge Cases**:
- Empty message → Return empty string
- No tags → Return original (early return optimization)
- Only tags → Return empty string (per spec FR-012)

---

## Performance Characteristics

### Time Complexity

- **Standard filtering**: O(n) where n = text length
- **Streaming chunk**: O(n) where n = chunk length
- **State transition**: O(1)
- **Tag validation**: O(m) where m = tag name length (max 50)

### Space Complexity

- **Standard filtering**: O(n) for result string
- **Streaming context**: O(k) where k = max buffer size (bounded by longest tag)
- **Tag stack**: O(d) where d = nesting depth (typically 1-2)

### Benchmark Targets

| Scenario | Target | Measurement |
|----------|--------|-------------|
| 100 char, no tags | <0.1ms | Early return |
| 1,000 char, 3 tags | <1ms | Single pass |
| 10,000 char, 10 tags | <5ms | Worst case (spec SC-004) |
| Streaming chunk (100 char) | <0.5ms | Real-time processing |

---

## Testing Data Sets

### Unit Test Fixtures

```javascript
// Simple cases
const SIMPLE_TAG = "Text [[TAG]]content[[/TAG]] more text";
const MULTIPLE_TAGS = "[[A]]x[[/A]] middle [[B]]y[[/B]]";
const EMPTY_TAG = "Text [[TAG]][[/TAG]] text";

// Edge cases
const NESTED = "[[OUTER]]text [[INNER]]data[[/INNER]][[/OUTER]]";
const UNMATCHED_OPEN = "Text [[TAG]]content (no close)";
const UNMATCHED_CLOSE = "Text [[/TAG]] more";
const MALFORMED = "Text [TAG] or [[TAG/]] or [[ TAG ]]";

// Case sensitivity
const CASE_MISMATCH = "[[TAG]]content[[/tag]]"; // lowercase close
const MIXED_CASE = "[[TaG]]content[[/TaG]]";    // invalid tag name

// Streaming scenarios
const STREAM_CHUNKS = [
  "Text [[TA",
  "G]]hidden[[/",
  "TAG]] visible"
];

// Performance test
const LARGE_TEXT = "a".repeat(10000) + 
  Array(10).fill(null).map((_, i) => 
    `[[TAG_${i}]]${"x".repeat(100)}[[/TAG_${i}]]`
  ).join("");
```

---

## References

- Feature Spec: [spec.md](./spec.md)
- Research: [research.md](./research.md)
- Implementation Plan: [plan.md](./plan.md)
- Contract: [contracts/messageFilter.contract.md](./contracts/messageFilter.contract.md)
