# Data Model: Programmatic Send Message API

**Feature**: 001-send-message-api  
**Date**: 2026-01-22  
**Status**: Complete

## Overview

This document defines the data structures used by the programmatic send message API. The implementation uses two primary entities: the **Message Object** (representing a message to be sent) and the **Message Queue** (managing pre-connection message storage).

---

## Entity Definitions

### 1. Message Object

Represents a message to be sent through the webchat, with optional metadata.

#### Structure

```javascript
{
  text: string,        // REQUIRED: Message content (1-10,000 characters)
  metadata?: object    // OPTIONAL: Additional contextual data
}
```

#### Field Specifications

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `text` | string | Yes | 1-10,000 chars, non-empty after trim | The message content to display and send |
| `metadata` | object | No | Valid JSON object | Additional data attached to the message (e.g., source, context, user info) |

#### Examples

**Simple text message** (P1 requirement):
```javascript
"Hello, I need support"
```

**Structured message with metadata** (P3 requirement):
```javascript
{
  text: "I need help with my order",
  metadata: {
    source: "help-button",
    page: "/checkout",
    userId: "user_12345",
    orderId: "ORD-98765",
    timestamp: 1738000000000
  }
}
```

#### Validation Rules

1. **Type checking**:
   - Must be either `string` or `object` with `text` property
   - Reject: `null`, `undefined`, `number`, `boolean`, `array`, `object` without `text`

2. **Text validation**:
   - Cannot be empty string after `trim()`
   - Must be ≥ 1 character
   - Must be ≤ 10,000 characters (truncate with warning if exceeded)

3. **Metadata validation**:
   - Must be valid object if provided
   - No type/structure constraints (passed through to service)
   - Should be serializable (no functions, circular refs)

#### State Transitions

```
Input (string/object)
  → Validation
    → [VALID] → Normalize to { text, metadata }
    → [INVALID] → Log warning, return early
  → [VALID] → Check connection status
    → [CONNECTED] → Send immediately via service
    → [NOT CONNECTED] → Enqueue for later
```

---

### 2. Message Queue

Manages messages sent before the websocket connection is established.

#### Structure

```javascript
class MessageQueue {
  queue: Array<QueuedMessage>;
  isProcessing: boolean;
}
```

#### QueuedMessage Structure

```javascript
{
  text: string,
  metadata: object | null,
  timestamp: number  // When queued (for debugging/ordering)
}
```

#### Operations

| Operation | Method | Description | Time Complexity |
|-----------|--------|-------------|-----------------|
| Add message | `enqueue(message)` | Append message to end of queue | O(1) |
| Remove and process | `flush(sendFn)` | Send all queued messages in FIFO order | O(n) |
| Clear all | `clear()` | Empty the queue | O(1) |
| Get count | `size()` | Return number of queued messages | O(1) |

#### Behavioral Rules

1. **FIFO ordering**: Messages are sent in the exact order they were queued
2. **No persistence**: Queue is in-memory only (cleared on page reload)
3. **Auto-flush**: Queue automatically flushes when connection is established
4. **Single processing**: Only one flush operation at a time (prevent race conditions)
5. **Error handling**: If a message fails to send during flush, log error and continue with next

#### Queue Lifecycle

```
State: EMPTY
  ↓
[send() called before connection]
  ↓
State: QUEUED (messages in array)
  ↓
[connection:status = 'connected' event]
  ↓
State: FLUSHING
  ↓
[Send each message via service.sendMessage()]
  ↓
State: EMPTY
```

#### Constraints

- **Max queue size**: 100 messages (prevent memory issues)
- **Max wait time**: No timeout (relies on service connection)
- **Overflow behavior**: If queue exceeds 100, log warning and drop oldest messages

#### Example Implementation

```javascript
class MessageQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.MAX_SIZE = 100;
  }
  
  enqueue(message) {
    if (this.queue.length >= this.MAX_SIZE) {
      console.warn('WebChat: Message queue full, dropping oldest message');
      this.queue.shift();
    }
    
    this.queue.push({
      text: message.text,
      metadata: message.metadata || null,
      timestamp: Date.now()
    });
  }
  
  async flush(sendFn) {
    if (this.isProcessing) {
      console.warn('WebChat: Queue flush already in progress');
      return;
    }
    
    this.isProcessing = true;
    
    try {
      while (this.queue.length > 0) {
        const message = this.queue.shift();
        try {
          await sendFn(message.text, { metadata: message.metadata });
        } catch (error) {
          console.error('WebChat: Failed to send queued message:', error);
          // Continue with next message
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
  
  clear() {
    this.queue = [];
  }
  
  size() {
    return this.queue.length;
  }
}
```

---

## Relationships

```
┌─────────────────────┐
│  External Caller    │
│  (Button, Form,     │
│   Console)          │
└──────────┬──────────┘
           │
           │ send(message)
           ▼
┌─────────────────────┐
│  Validation Layer   │
│  (validateMessage)  │
└──────────┬──────────┘
           │
           │ { text, metadata }
           ▼
     ┌─────────────┐
     │ Connection? │
     └─────┬───┬───┘
           │   │
    ┌──────┘   └────────┐
    │                   │
    │ CONNECTED         │ NOT CONNECTED
    ▼                   ▼
┌─────────────┐    ┌──────────────┐
│   Service   │    │ MessageQueue │
│ sendMessage │    │  .enqueue()  │
└─────────────┘    └──────┬───────┘
                          │
                          │ [connection established]
                          ▼
                   ┌──────────────┐
                   │ MessageQueue │
                   │   .flush()   │
                   └──────┬───────┘
                          │
                          │ for each message
                          ▼
                   ┌─────────────┐
                   │   Service   │
                   │ sendMessage │
                   └─────────────┘
```

---

## Data Flow Scenarios

### Scenario 1: Send while connected (immediate send)

```
1. User calls: window.WebChat.send('Hello')
2. Validate: { text: 'Hello', metadata: null } ✓
3. Check connection: CONNECTED ✓
4. Call: service.sendMessage('Hello', { metadata: null })
5. Service handles: UI update + WebSocket send
```

### Scenario 2: Send before connection (queue)

```
1. User calls: window.WebChat.send('Quick message')
2. Validate: { text: 'Quick message', metadata: null } ✓
3. Check connection: NOT CONNECTED
4. Enqueue: messageQueue.enqueue({ text: 'Quick message', metadata: null })
5. [Wait for connection...]
6. Connection event: 'connected'
7. Flush: messageQueue.flush()
   → service.sendMessage('Quick message', { metadata: null })
8. Service handles: UI update + WebSocket send
```

### Scenario 3: Multiple messages queued

```
1. User calls: send('Message 1')
2. Queue: ['Message 1']
3. User calls: send('Message 2')
4. Queue: ['Message 1', 'Message 2']
5. User calls: send('Message 3')
6. Queue: ['Message 1', 'Message 2', 'Message 3']
7. Connection established
8. Flush in order:
   → send('Message 1')
   → send('Message 2')
   → send('Message 3')
9. Queue: []
```

### Scenario 4: Send with metadata (P3)

```
1. User calls: send({ text: 'Help', metadata: { page: '/pricing' } })
2. Validate: { text: 'Help', metadata: { page: '/pricing' } } ✓
3. Check connection: CONNECTED ✓
4. Call: service.sendMessage('Help', { metadata: { page: '/pricing' } })
5. Service receives metadata in options parameter
6. Metadata available for analytics/routing
```

---

## Validation Error Cases

| Input | Validation Result | Action |
|-------|-------------------|--------|
| `null` | ❌ Invalid | Log warning, return early |
| `undefined` | ❌ Invalid | Log warning, return early |
| `''` (empty string) | ❌ Invalid | Log warning, return early |
| `'   '` (whitespace) | ❌ Invalid | Log warning (empty after trim), return early |
| `123` (number) | ❌ Invalid | Log warning (wrong type), return early |
| `true` (boolean) | ❌ Invalid | Log warning (wrong type), return early |
| `{}` (object without text) | ❌ Invalid | Log warning (missing text), return early |
| `{ text: '' }` | ❌ Invalid | Log warning (empty text), return early |
| `{ text: 'ok' }` | ✅ Valid | Normalize to `{ text: 'ok', metadata: null }` |
| `'[10001 chars]'` | ⚠️ Valid with truncation | Truncate to 10,000 chars, log warning |

---

## Performance Characteristics

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| Validate message | O(1) | O(1) | Simple type checks + string length |
| Enqueue | O(1) | O(n) | n = queue size (max 100) |
| Flush queue | O(n) | O(1) | n = queue size, sequential async sends |
| Send immediate | O(1) | O(1) | Direct service call |

**Memory usage**:
- Each queued message: ~100-500 bytes (text + metadata)
- Max queue (100 messages): ~10-50 KB
- Negligible impact on page memory

**Latency**:
- Validation: <1ms
- Immediate send: ~5-20ms (service processing + UI update)
- Queued send: <50ms per message during flush

---

## Testing Data

### Valid Test Cases

```javascript
// String messages
'Hello'
'Message with unicode: 你好 🎉'
'A'.repeat(10000)  // Max length

// Object messages
{ text: 'Simple' }
{ text: 'With metadata', metadata: { key: 'value' } }
{ text: 'Complex', metadata: { nested: { deep: { value: 1 } } } }
```

### Invalid Test Cases

```javascript
// Null/undefined
null
undefined

// Empty
''
'   '
{ text: '' }
{ text: '   ' }

// Wrong types
123
true
false
[]
{ no_text: 'field' }

// Too long
'A'.repeat(10001)  // Should truncate
```

### Queue Test Cases

```javascript
// Sequential enqueue
queue.enqueue({ text: 'First' })
queue.enqueue({ text: 'Second' })
queue.enqueue({ text: 'Third' })
// Expected: ['First', 'Second', 'Third']

// Flush order
await queue.flush(mockSendFn)
// Expected: mockSendFn called 3 times in order

// Overflow (101 messages)
for (let i = 0; i < 101; i++) {
  queue.enqueue({ text: `Message ${i}` })
}
// Expected: size() === 100, oldest dropped
```

---

## Summary

**Key Entities**:
1. **Message Object**: `{ text: string, metadata?: object }`
2. **Message Queue**: FIFO queue with max 100 messages

**Key Behaviors**:
- Validation ensures type safety and constraints
- Queue handles pre-connection sends with guaranteed ordering
- Automatic flush on connection establishment
- Graceful error handling with warnings

**Performance**:
- All operations O(1) or O(n) where n ≤ 100
- Low memory footprint (~10-50 KB max)
- Fast validation and send latency

This data model supports all three priority requirements (P1, P2, P3) from the specification.
