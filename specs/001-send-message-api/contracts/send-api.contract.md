# API Contract: window.WebChat.send()

**Feature**: 001-send-message-api  
**Version**: 1.0.0  
**Date**: 2026-01-22  
**Status**: Draft

## Overview

This contract defines the public API for the `window.WebChat.send()` method, including function signature, behavior, error handling, and test requirements.

---

## Function Signature

```typescript
function send(message: string | MessageObject): void

interface MessageObject {
  text: string;
  metadata?: Record<string, any>;
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | `string \| MessageObject` | Yes | Message to send. Can be plain text or object with text and metadata |

### Return Value

- **Type**: `void`
- **Rationale**: Fire-and-forget API. Errors logged to console, not thrown.

---

## Behavior Specification

### 1. Valid Input Handling

**Contract**: When `send()` receives valid input, the message MUST be processed according to connection state.

#### Test Cases

```javascript
describe('send() with valid input', () => {
  test('MUST accept string message', async () => {
    await WebChat.init(validConfig);
    WebChat.send('Hello');
    
    // Assert: Message appears in chat UI
    // Assert: Service received message
    expect(getLastMessage()).toBe('Hello');
  });
  
  test('MUST accept object with text', async () => {
    await WebChat.init(validConfig);
    WebChat.send({ text: 'Hello' });
    
    expect(getLastMessage()).toBe('Hello');
  });
  
  test('MUST accept object with text and metadata', async () => {
    await WebChat.init(validConfig);
    WebChat.send({ text: 'Help', metadata: { source: 'button' } });
    
    expect(getLastMessage()).toBe('Help');
    expect(getLastMessageMetadata()).toEqual({ source: 'button' });
  });
  
  test('MUST handle unicode and emojis', async () => {
    await WebChat.init(validConfig);
    WebChat.send('Hello 你好 🎉');
    
    expect(getLastMessage()).toBe('Hello 你好 🎉');
  });
  
  test('MUST handle max length (10,000 chars)', async () => {
    await WebChat.init(validConfig);
    const maxMessage = 'A'.repeat(10000);
    WebChat.send(maxMessage);
    
    expect(getLastMessage()).toBe(maxMessage);
  });
});
```

**Success Criteria**:
- ✅ Message appears in chat UI within 100ms
- ✅ Service receives message for transmission
- ✅ No errors or warnings logged for valid input

---

### 2. Invalid Input Handling

**Contract**: When `send()` receives invalid input, it MUST log appropriate warning and return early without crashing.

#### Test Cases

```javascript
describe('send() with invalid input', () => {
  test('MUST reject null with warning', () => {
    const consoleSpy = jest.spyOn(console, 'warn');
    WebChat.send(null);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('cannot be null or undefined')
    );
    expect(getMessageCount()).toBe(0);
  });
  
  test('MUST reject undefined with warning', () => {
    const consoleSpy = jest.spyOn(console, 'warn');
    WebChat.send(undefined);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('cannot be null or undefined')
    );
  });
  
  test('MUST reject empty string with warning', () => {
    const consoleSpy = jest.spyOn(console, 'warn');
    WebChat.send('');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('cannot be empty')
    );
  });
  
  test('MUST reject whitespace-only string', () => {
    const consoleSpy = jest.spyOn(console, 'warn');
    WebChat.send('   ');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('cannot be empty')
    );
  });
  
  test('MUST reject number with warning', () => {
    const consoleSpy = jest.spyOn(console, 'warn');
    WebChat.send(123);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid message format')
    );
  });
  
  test('MUST reject boolean with warning', () => {
    const consoleSpy = jest.spyOn(console, 'warn');
    WebChat.send(true);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid message format')
    );
  });
  
  test('MUST reject object without text field', () => {
    const consoleSpy = jest.spyOn(console, 'warn');
    WebChat.send({ content: 'Hello' });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid message format')
    );
  });
  
  test('MUST reject object with empty text', () => {
    const consoleSpy = jest.spyOn(console, 'warn');
    WebChat.send({ text: '' });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('cannot be empty')
    );
  });
  
  test('MUST truncate message exceeding 10,000 chars', () => {
    const consoleSpy = jest.spyOn(console, 'warn');
    const longMessage = 'A'.repeat(10001);
    WebChat.send(longMessage);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('exceeds maximum length')
    );
    expect(getLastMessage()).toHaveLength(10000);
  });
});
```

**Success Criteria**:
- ✅ No exceptions thrown
- ✅ Warning logged to console for each invalid case
- ✅ No message added to chat UI
- ✅ Service not called

---

### 3. Lifecycle State Handling

**Contract**: `send()` MUST handle widget lifecycle states correctly (before init, after destroy).

#### Test Cases

```javascript
describe('send() lifecycle', () => {
  test('MUST error when called before init()', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    WebChat.send('Hello');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('not initialized')
    );
  });
  
  test('MUST error when called after destroy()', async () => {
    await WebChat.init(validConfig);
    WebChat.destroy();
    
    const consoleSpy = jest.spyOn(console, 'error');
    WebChat.send('Hello');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('not initialized')
    );
  });
});
```

**Success Criteria**:
- ✅ Error logged for pre-init calls
- ✅ Error logged for post-destroy calls
- ✅ No crash or exception

---

### 4. Connection State Handling (Queueing)

**Contract**: Messages sent before connection is established MUST be queued and sent once connected, in order.

#### Test Cases

```javascript
describe('send() before connection', () => {
  test('MUST queue message if connection not established', async () => {
    // Mock service to delay connection
    mockDelayedConnection();
    
    await WebChat.init(validConfig);
    
    // Send before connected
    WebChat.send('Message 1');
    WebChat.send('Message 2');
    
    // Verify queued (not sent yet)
    expect(getMessageCount()).toBe(0);
    
    // Simulate connection
    await waitForConnection();
    
    // Verify sent in order
    expect(getMessages()).toEqual(['Message 1', 'Message 2']);
  });
  
  test('MUST preserve order of queued messages', async () => {
    mockDelayedConnection();
    await WebChat.init(validConfig);
    
    WebChat.send('First');
    WebChat.send('Second');
    WebChat.send('Third');
    
    await waitForConnection();
    
    const messages = getMessages();
    expect(messages[0]).toBe('First');
    expect(messages[1]).toBe('Second');
    expect(messages[2]).toBe('Third');
  });
  
  test('MUST handle mixed immediate and queued sends', async () => {
    mockDelayedConnection();
    await WebChat.init(validConfig);
    
    // These will queue
    WebChat.send('Queued 1');
    WebChat.send('Queued 2');
    
    await waitForConnection();
    
    // This sends immediately
    WebChat.send('Immediate');
    
    const messages = getMessages();
    expect(messages).toEqual(['Queued 1', 'Queued 2', 'Immediate']);
  });
});
```

**Success Criteria**:
- ✅ Messages sent before connection are queued
- ✅ Queued messages are sent once connection is established
- ✅ Message order is preserved (FIFO)
- ✅ 100% delivery rate in test scenarios

---

### 5. Chat Window Auto-Open

**Contract**: When `send()` is called and chat is closed, chat MUST open automatically.

#### Test Cases

```javascript
describe('send() auto-open behavior', () => {
  test('MUST open chat when sending message while closed', async () => {
    await WebChat.init(validConfig);
    
    // Ensure chat is closed
    expect(isChatOpen()).toBe(false);
    
    WebChat.send('Hello');
    
    // Verify chat opened
    await waitFor(() => expect(isChatOpen()).toBe(true));
  });
  
  test('MUST keep chat open when already open', async () => {
    await WebChat.init(validConfig);
    
    // Open chat manually
    openChat();
    expect(isChatOpen()).toBe(true);
    
    WebChat.send('Hello');
    
    // Verify still open
    expect(isChatOpen()).toBe(true);
  });
});
```

**Success Criteria**:
- ✅ Chat opens when closed
- ✅ Chat state persists when already open
- ✅ User can see sent message and response

---

### 6. Performance Requirements

**Contract**: `send()` MUST meet performance benchmarks defined in spec.

#### Test Cases

```javascript
describe('send() performance', () => {
  test('MUST update UI within 100ms', async () => {
    await WebChat.init(validConfig);
    
    const startTime = Date.now();
    WebChat.send('Performance test');
    
    await waitFor(() => {
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(100);
      expect(getLastMessage()).toBe('Performance test');
    });
  });
  
  test('MUST handle 50 rapid consecutive sends', async () => {
    await WebChat.init(validConfig);
    
    const messages = [];
    for (let i = 0; i < 50; i++) {
      messages.push(`Message ${i}`);
      WebChat.send(`Message ${i}`);
    }
    
    // Wait for all to process
    await waitFor(() => expect(getMessageCount()).toBe(50));
    
    // Verify all sent, none lost
    const receivedMessages = getMessages();
    expect(receivedMessages).toEqual(messages);
  });
  
  test('MUST not freeze UI during rapid sends', async () => {
    await WebChat.init(validConfig);
    
    let uiFrozen = false;
    const checkInterval = setInterval(() => {
      // If this doesn't run, UI is frozen
      uiFrozen = false;
    }, 10);
    
    // Send 50 messages rapidly
    for (let i = 0; i < 50; i++) {
      WebChat.send(`Message ${i}`);
      uiFrozen = true;
      await new Promise(resolve => setTimeout(resolve, 1));
      if (uiFrozen) {
        throw new Error('UI frozen during sends');
      }
    }
    
    clearInterval(checkInterval);
  });
});
```

**Success Criteria**:
- ✅ UI update latency < 100ms (excluding network)
- ✅ 50 messages in 1 second without loss
- ✅ No UI freeze during rapid sends

---

## Error Messages

All error/warning messages MUST follow these formats:

```javascript
// Pre-init error
"WebChat.send(): Widget not initialized. Call init() first."

// Null/undefined warning
"WebChat.send(): Message cannot be null or undefined"

// Empty string warning
"WebChat.send(): Message text cannot be empty"

// Invalid format warning
"WebChat.send(): Invalid message format. Expected string or { text: string, metadata?: object }"

// Max length warning
"WebChat.send(): Message exceeds maximum length of 10000 characters. Truncating."

// Queue overflow warning (internal)
"WebChat: Message queue full, dropping oldest message"
```

**Requirements**:
- ✅ All messages prefixed with "WebChat" or "WebChat.send()"
- ✅ Clear, actionable error descriptions
- ✅ Consistent formatting

---

## Integration Points

### Service Layer

**Contract**: `send()` MUST use `service.sendMessage(text, options)` for message transmission.

```typescript
// Expected service call
service.sendMessage(
  text: string,
  options?: {
    metadata?: any;
    hidden?: boolean;
    [key: string]: any;
  }
): void
```

**Test**:
```javascript
test('MUST call service.sendMessage with correct params', async () => {
  const serviceMock = mockService();
  await WebChat.init(validConfig);
  
  WebChat.send({ text: 'Hello', metadata: { key: 'value' } });
  
  expect(serviceMock.sendMessage).toHaveBeenCalledWith(
    'Hello',
    { metadata: { key: 'value' } }
  );
});
```

### Chat State

**Contract**: `send()` MUST call `service.setIsChatOpen(true)` when chat is closed.

**Test**:
```javascript
test('MUST call setIsChatOpen when chat closed', async () => {
  const serviceMock = mockService({ isChatOpen: false });
  await WebChat.init(validConfig);
  
  WebChat.send('Hello');
  
  expect(serviceMock.setIsChatOpen).toHaveBeenCalledWith(true);
});
```

---

## Backward Compatibility

**Contract**: Existing `window.WebChat` API MUST remain unchanged.

### Test Cases

```javascript
describe('backward compatibility', () => {
  test('MUST preserve existing init() behavior', async () => {
    const result = await WebChat.init(validConfig);
    expect(result).toBeUndefined(); // No change
  });
  
  test('MUST preserve existing destroy() behavior', () => {
    WebChat.destroy();
    expect(getWidgetInstance()).toBeNull();
  });
  
  test('MUST preserve existing setContext() behavior', async () => {
    await WebChat.init(validConfig);
    await WebChat.setContext({ userId: '123' });
    const context = await WebChat.getContext();
    expect(context.userId).toBe('123');
  });
});
```

**Success Criteria**:
- ✅ No existing methods modified
- ✅ No behavior changes for other API methods
- ✅ All existing tests pass

---

## Documentation Requirements

**Contract**: README.md MUST be updated with comprehensive `send()` documentation.

**Required Sections**:
1. Function signature and parameters
2. Basic usage examples (string and object)
3. Button integration example
4. Form integration example
5. Queueing behavior explanation
6. Error handling notes
7. Performance characteristics

**Verification**:
- ✅ Code examples are tested and working
- ✅ All parameters documented
- ✅ Common use cases covered

---

## Test Coverage Requirements

**Minimum Coverage**:
- ✅ Unit tests: 90% line coverage for `send()` function and `MessageQueue` class
- ✅ Integration tests: 100% coverage of user stories (P1, P2, P3)
- ✅ Edge case tests: 100% coverage of spec edge cases

**Test Suites**:
1. `standalone.send.test.js` - Unit tests for validation and lifecycle
2. `messageQueue.test.js` - Unit tests for queue operations
3. `send.integration.test.js` - End-to-end integration tests

---

## Acceptance Criteria

The implementation is considered complete when:

- ✅ All test cases in this contract pass
- ✅ No linter errors in modified files
- ✅ Documentation updated in README.md
- ✅ Manual testing scenarios verified:
  - Console send works
  - Button integration works
  - Form integration works
  - Queue works across connection states
- ✅ Performance benchmarks met:
  - <100ms UI latency
  - 50 rapid sends without loss
  - No UI freeze
- ✅ Code review approved

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-22 | Initial contract specification |
