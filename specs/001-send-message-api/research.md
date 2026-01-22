# Research: Programmatic Send Message API

**Feature**: 001-send-message-api  
**Date**: 2026-01-22  
**Status**: Complete

## Overview

This document captures technical research and decisions for implementing the programmatic send message API. The goal is to expose a `window.WebChat.send(message)` method that allows external pages to send messages programmatically through the webchat widget.

## Key Research Areas

### 1. Service Instance Access Pattern

**Problem**: The `send()` function in `standalone.jsx` needs access to the WeniWebchatService instance, but the service is created inside the React component tree (ChatProvider).

**Current Architecture Analysis**:

From `src/contexts/ChatContext.jsx`:
- Service instance is created in `ChatProvider` component
- A module-level `serviceInstance` variable is exported that acts as a promise/proxy
- The `serviceInstance` implements an `onReady()` promise pattern that resolves when service is initialized
- This pattern already exists for `setContext()`, `getContext()`, and `setCustomField()` methods in `standalone.jsx`

**Decision**: Use the existing `serviceInstance` pattern with `onReady()` promise

**Rationale**:
- Already implemented and tested for other API methods
- Handles async initialization properly
- Maintains separation between standalone API and React component lifecycle
- No architectural changes needed

**Implementation approach**:
```javascript
// In standalone.jsx
async function send(message) {
  const service = await serviceWhenReady();
  service.sendMessage(message);
}
```

**Alternatives considered**:
- **Global service reference**: Would break React lifecycle and make testing harder
- **Custom event system**: Over-engineered for simple method call
- **Direct React ref passing**: Would couple standalone API to React internals

---

### 2. Message Queue Implementation

**Problem**: Messages sent before connection is established need to be queued and sent once connected.

**Research findings**:

Examined existing WeniWebchatService behavior:
- Service manages connection lifecycle internally
- Service has events like `connection:status` and `connection:established`
- Service likely has internal queueing for its own operations

**Decision**: Implement standalone message queue in `src/utils/messageQueue.js`

**Rationale**:
- Keep queueing logic in the standalone layer, not in service (separation of concerns)
- Service already handles message sending robustly
- Queue should be simple FIFO array with event listener
- Clear lifecycle: queue messages → connect event → flush queue

**Data structure**:
```javascript
class MessageQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }
  
  enqueue(message) {
    this.queue.push(message);
  }
  
  async flush(sendFn) {
    while (this.queue.length > 0) {
      const message = this.queue.shift();
      await sendFn(message);
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

**Alternatives considered**:
- **Let service handle queueing**: Service API may not support pre-connection queueing
- **LocalStorage-based queue**: Over-engineered, adds complexity, not required for spec
- **No queue (fail fast)**: Violates P2 requirement in spec

---

### 3. Message Validation Strategy

**Problem**: Need to validate message input (type, length, emptiness) before sending.

**Requirements from spec**:
- Support string messages: `send('text')`
- Support object messages: `send({ text: 'msg', metadata: {...} })`
- Reject empty, null, undefined
- Enforce max length (10,000 characters)
- Validate object has `text` field
- Log warnings for invalid input

**Decision**: Implement validation function with early returns

**Implementation approach**:
```javascript
function validateMessage(message) {
  // Check if send() called before init()
  if (!widgetInstance) {
    console.error('WebChat.send(): Widget not initialized. Call init() first.');
    return { valid: false };
  }
  
  // Handle null/undefined
  if (message == null) {
    console.warn('WebChat.send(): Message cannot be null or undefined');
    return { valid: false };
  }
  
  // Extract text from string or object
  let text = '';
  let metadata = null;
  
  if (typeof message === 'string') {
    text = message;
  } else if (typeof message === 'object' && message.text) {
    text = message.text;
    metadata = message.metadata || null;
  } else {
    console.warn('WebChat.send(): Invalid message format. Expected string or { text: string, metadata?: object }');
    return { valid: false };
  }
  
  // Check empty string
  if (text.trim().length === 0) {
    console.warn('WebChat.send(): Message text cannot be empty');
    return { valid: false };
  }
  
  // Check max length
  const MAX_LENGTH = 10000;
  if (text.length > MAX_LENGTH) {
    console.warn(`WebChat.send(): Message exceeds maximum length of ${MAX_LENGTH} characters. Truncating.`);
    text = text.substring(0, MAX_LENGTH);
  }
  
  return { valid: true, text, metadata };
}
```

**Rationale**:
- Clear error messages for debugging
- Follows JavaScript best practices (early returns, type checking)
- Handles both P1 (string) and P3 (object) requirements
- Graceful degradation (truncate vs reject for length)

**Alternatives considered**:
- **Throw exceptions**: Would break caller code, warnings are better UX
- **Schema validation library**: Over-engineered for simple validation
- **Let service validate**: Service may not have same requirements, keep it in API layer

---

### 4. Chat Window Auto-Open Behavior

**Problem**: When `send()` is called programmatically, should the chat window open automatically?

**Spec requirement**: FR-008 states "System MUST open the chat widget (if closed) when a message is sent programmatically"

**Current architecture analysis**:
- Chat open/close state managed by `service.setIsChatOpen(boolean)`
- Service emits `chat:open:changed` event
- ChatProvider listens and updates `isChatOpen` state
- Widget component renders based on `isChatOpen`

**Decision**: Auto-open chat when `send()` is called if chat is closed

**Implementation approach**:
```javascript
async function send(message) {
  // Validation...
  const { valid, text, metadata } = validateMessage(message);
  if (!valid) return;
  
  const service = await serviceWhenReady();
  
  // Auto-open chat if closed
  if (!service.getSession()?.isChatOpen) {
    service.setIsChatOpen(true);
  }
  
  // Send message (queue if not connected)
  if (service.getState().connection?.status === 'connected') {
    service.sendMessage(text, { metadata });
  } else {
    messageQueue.enqueue({ text, metadata });
    // Will flush when connection established
  }
}
```

**Rationale**:
- User needs to see the message they sent and any response
- Aligns with user expectation for button-triggered messages
- Service already has the API to control open state
- No new UI state needed

**Alternatives considered**:
- **Keep chat closed**: Violates spec requirement, poor UX
- **Add config option**: Over-engineered, spec is clear on behavior
- **Open only for first message**: Inconsistent, confusing

---

### 5. Connection State Detection

**Problem**: Need to know if connection is established to decide queue vs send immediately.

**Research findings**:

From examining `ChatContext.jsx`:
- Service has `getState()` method that returns state object
- State includes `connection` with `status` field
- Status values: `'connecting'`, `'connected'`, `'closed'`, etc.
- State is updated via `state:changed` event

**Decision**: Check `service.getState().connection?.status === 'connected'`

**Rationale**:
- Direct, synchronous check
- Uses existing service API
- No need to maintain separate state
- Reliable for decision making

**Event handling for queue flush**:
```javascript
// In standalone.jsx init() or module level
service.on('connection:status', (status) => {
  if (status === 'connected' && messageQueue.size() > 0) {
    messageQueue.flush(async (msg) => {
      await service.sendMessage(msg.text, { metadata: msg.metadata });
    });
  }
});
```

**Alternatives considered**:
- **Maintain isConnected state**: Duplicate state, risk of desync
- **Always queue**: Adds latency for normal case
- **Assume connected**: Violates P2 requirement

---

### 6. Message Format to Service

**Problem**: How should we pass the message to `service.sendMessage()`?

**Research findings**:

From `ChatContext.jsx` line 276:
```javascript
sendMessage: (text) => service.sendMessage(text)
```

And line 208:
```javascript
service.sendMessage(mergedConfig.initPayload, { hidden: true });
```

The service accepts:
- First parameter: text (string)
- Second parameter: options object (e.g., `{ hidden: true }`)

**Decision**: Call `service.sendMessage(text, { metadata })` for object messages

**Rationale**:
- Service already supports options parameter
- Metadata can be passed as option
- Maintains service API contract
- If service doesn't support metadata option, it will be ignored gracefully

**Implementation**:
```javascript
// String message
service.sendMessage('Hello');

// Object message with metadata
service.sendMessage('Hello', { metadata: { buttonId: 'help-btn' } });
```

**Alternatives considered**:
- **Custom message format**: Would require service changes
- **Separate API method**: Over-engineered
- **Embed metadata in text**: Ugly, error-prone, loses type safety

---

## Testing Strategy

### Unit Tests

1. **Message validation tests** (`standalone.send.test.js`):
   - Valid string messages
   - Valid object messages with text + metadata
   - Invalid: null, undefined, empty string
   - Invalid: object without text field
   - Invalid: wrong types (number, boolean, array)
   - Max length truncation

2. **Queue tests** (`messageQueue.test.js`):
   - Enqueue messages
   - Flush queue in order
   - Clear queue
   - Size reporting
   - Multiple flush operations

3. **send() behavior tests** (`standalone.send.test.js`):
   - send() before init() → error
   - send() after destroy() → error
   - send() when connected → immediate send
   - send() when disconnected → queue
   - Auto-open chat on send

### Integration Tests

1. **Full flow test** (`send.integration.test.js`):
   - Initialize widget
   - Call send() multiple times
   - Verify messages appear in chat
   - Verify service received messages
   - Verify chat opened automatically

2. **Queue flush test**:
   - Call send() before connection
   - Simulate connection established
   - Verify queued messages sent in order

3. **Rapid send test**:
   - Send 50 messages in quick succession
   - Verify no messages lost
   - Verify no UI freeze
   - Verify order preserved

### Manual Testing

1. **Browser console test**:
   ```javascript
   window.WebChat.init({ selector: '#chat', socketUrl: '...', channelUuid: '...', host: '...' });
   window.WebChat.send('Test message');
   window.WebChat.send({ text: 'With metadata', metadata: { source: 'console' } });
   ```

2. **Button integration test**:
   ```html
   <button onclick="window.WebChat.send('I need help')">Get Help</button>
   ```

---

## Performance Considerations

### Benchmarks to validate

1. **Message send latency**: <100ms from `send()` call to UI update
2. **Queue flush time**: <500ms for 10 queued messages
3. **Memory usage**: Queue should not grow unbounded (add max size?)
4. **Rapid sends**: 50 messages in 1 second without UI freeze

### Optimizations

1. **Batch queue flush**: Flush messages in small batches with `setTimeout` to avoid blocking
2. **Debounce validation**: If sending many messages, validate once per batch
3. **Async send**: Use `async/await` to avoid blocking main thread

---

## Documentation Requirements

### README.md updates

Add to "Standalone API" section:

```markdown
### Send Messages Programmatically

Send messages from your own UI components or code:

```javascript
// Send simple text message
window.WebChat.send('Hello, I need assistance');

// Send message with metadata (advanced)
window.WebChat.send({
  text: 'Help request',
  metadata: {
    source: 'help-button',
    page: '/pricing',
    userId: '12345'
  }
});
```

**Behavior**:
- Messages sent before connection is established are queued and sent once connected
- Chat window opens automatically when a message is sent
- Invalid messages log warnings to console without crashing

**Examples**:
```html
<!-- Button that sends predefined message -->
<button onclick="window.WebChat.send('I want to upgrade my plan')">
  Upgrade Plan
</button>

<!-- Form submission -->
<form onsubmit="event.preventDefault(); window.WebChat.send('Order #' + document.getElementById('orderId').value)">
  <input id="orderId" placeholder="Order ID" />
  <button type="submit">Track Order</button>
</form>
```
```

### Quickstart.md

Create comprehensive integration guide with:
- Common use cases (button triggers, form submissions, page events)
- Code examples
- Troubleshooting
- Best practices

---

## Security Considerations

1. **XSS protection**: Rely on existing service/UI sanitization (marked.js, DOMPurify already in use)
2. **Message size limit**: 10,000 characters enforced
3. **Rate limiting**: Consider adding client-side rate limit (e.g., max 100 messages/minute) - NOT in P1
4. **Input validation**: Strict validation prevents injection attempts

---

## Summary of Decisions

| Decision Area | Chosen Approach | Rationale |
|--------------|-----------------|-----------|
| Service access | Use `serviceWhenReady()` promise pattern | Already implemented for other methods |
| Message queue | Standalone queue in utils/ | Separation of concerns, simple FIFO |
| Validation | Function with early returns | Clear errors, handles all spec requirements |
| Auto-open chat | Open on send() call | Spec requirement, good UX |
| Connection check | `service.getState().connection?.status` | Direct, synchronous, reliable |
| Message format | `service.sendMessage(text, { metadata })` | Uses existing service API |
| Testing | Unit + integration + manual | Comprehensive coverage |

---

## Open Questions

None - all research areas resolved with clear decisions.

---

## Next Steps

1. ✅ Research complete
2. → Phase 1: Create data-model.md (message object, queue structure)
3. → Phase 1: Create contracts/send-api.contract.md (API specification)
4. → Phase 1: Create quickstart.md (integration guide)
5. → Phase 2: Create tasks.md (implementation breakdown)
