# Feature Specification: Programmatic Send Message API

**Feature Branch**: `001-send-message-api`  
**Created**: 2026-01-22  
**Status**: Draft  
**Input**: User description: "Implement send message function that's missing, straightforward and let the page who implement the webchat to send message through it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - External Trigger Message Sending (Priority: P1)

A developer integrating the Weni WebChat needs to programmatically send messages from their own UI components or business logic, without requiring the end user to type in the chat input. For example, clicking a "Get Help" button on their page should send a predefined message to start a support conversation.

**Why this priority**: This is the core functionality requested - enabling external pages to control message sending. It's the minimum viable feature that delivers immediate value and is a common use case for chat integrations.

**Independent Test**: Can be fully tested by initializing the webchat, calling `window.WebChat.send('test message')` from console or a button click handler, and verifying the message appears in the chat and is sent to the service.

**Acceptance Scenarios**:

1. **Given** the webchat is initialized and connected, **When** the page calls `window.WebChat.send('Hello')`, **Then** the message "Hello" appears in the chat as a user message and is transmitted to the backend service
2. **Given** the webchat is initialized and connected, **When** the page calls `window.WebChat.send('Request support')` from a custom button's click handler, **Then** the message is sent and the chat window opens (if closed) to show the sent message
3. **Given** the page calls `window.WebChat.send()` with an empty string, **Then** the system rejects the message and displays a console warning without sending anything

---

### User Story 2 - Send Messages Before Connection Established (Priority: P2)

A developer wants to trigger a message send immediately after initialization, before the websocket connection is fully established. The system should queue the message and send it once the connection is ready.

**Why this priority**: This enhances robustness and developer experience by handling race conditions between initialization and message sending. It's not core functionality but significantly improves reliability.

**Independent Test**: Can be tested by calling `window.WebChat.send('message')` immediately after `window.WebChat.init()`, before the connection event fires, and verifying the message is queued and sent once connected.

**Acceptance Scenarios**:

1. **Given** the webchat initialization has started but connection is not yet established, **When** the page calls `window.WebChat.send('Quick message')`, **Then** the message is queued and automatically sent once the connection is established
2. **Given** multiple messages are sent before connection, **When** the connection is established, **Then** all queued messages are sent in the order they were called

---

### User Story 3 - Rich Message Support (Priority: P3)

A developer wants to send not just plain text, but also structured data or metadata along with messages (e.g., sending a message with custom payload, attachments reference, or context data).

**Why this priority**: This extends the API to support advanced use cases like sending contextual information or triggering specific bot flows. It's valuable but not essential for the basic functionality.

**Independent Test**: Can be tested by calling `window.WebChat.send({ text: 'message', metadata: { source: 'button' } })` and verifying the message is sent with the additional data structure preserved.

**Acceptance Scenarios**:

1. **Given** the webchat is connected, **When** the page calls `window.WebChat.send({ text: 'Hello', metadata: { buttonId: 'help-btn' } })`, **Then** the message is sent with the metadata included in the service payload
2. **Given** the page calls `window.WebChat.send({ text: 'Help' })`, **Then** the system sends the text portion as the message content

---

### Edge Cases

- What happens when `send()` is called before `init()` has been called? (Should log error and do nothing)
- What happens when `send()` is called after `destroy()` has been called? (Should log error and do nothing)
- What happens when network connection is lost while messages are queued? (Should retry or maintain queue until reconnection)
- What happens when `send()` receives invalid data types (null, undefined, number, boolean)? (Should validate and convert to string or reject)
- What happens when sending extremely long messages (>10,000 characters)? (Should validate against maximum length)
- What happens when `send()` is called rapidly in succession (100+ times)? (Should handle gracefully without overwhelming the service or UI)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose a `send(message)` method on the `window.WebChat` global object that accepts either a string or an object parameter
- **FR-002**: System MUST validate that the message parameter is not empty, null, or undefined before attempting to send
- **FR-003**: System MUST support sending plain text messages when a string is passed to `send(message)`
- **FR-004**: System MUST support sending structured messages when an object with a `text` property is passed (e.g., `{ text: 'message', metadata: {...} }`)
- **FR-005**: System MUST display the sent message in the chat UI as a user message immediately after calling `send()`
- **FR-006**: System MUST transmit the message to the backend service through the existing websocket/service layer
- **FR-007**: System MUST queue messages sent before the connection is established and automatically send them once connected
- **FR-008**: System MUST open the chat widget (if closed) when a message is sent programmatically, so the user can see the message and any response
- **FR-009**: System MUST log a console warning when `send()` is called with invalid parameters (empty, wrong type, missing text field in object)
- **FR-010**: System MUST handle the case where `send()` is called before `init()` or after `destroy()` by logging an error and taking no action
- **FR-011**: System MUST enforce a maximum message length (suggested: 10,000 characters) and truncate or reject longer messages with a console warning

### Key Entities

- **Message Object**: Represents a message to be sent, containing at minimum a `text` field (string) and optionally a `metadata` field (object) for additional contextual data
- **Message Queue**: A temporary storage for messages sent before the connection is established, ensuring they are delivered in order once connected

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can successfully send a message programmatically by calling `window.WebChat.send('text')` and see it appear in the chat within 100ms (excluding network latency)
- **SC-002**: Messages sent before connection is established are delivered successfully once connected, with 100% delivery rate in tested scenarios
- **SC-003**: The API handles invalid input gracefully, logging appropriate warnings for 100% of invalid calls without crashing
- **SC-004**: Sending 50 messages in rapid succession (within 1 second) completes without UI freezing or message loss
- **SC-005**: Developers can integrate the `send()` method with custom UI elements (buttons, forms, triggers) with zero additional configuration beyond the standard `init()` call
