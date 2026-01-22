# Feature Specification: Message Tag Filtering

**Feature Branch**: `001-message-tag-filtering`  
**Created**: Thursday Jan 22, 2026  
**Status**: Draft  
**Input**: User description: "I may receive from the service some messages in the following format: [[SEARCH_RESULT]]...[/SEARCH_RESULT]]. Everytime you receive something in the format of [[SOME_TEXT_HERE]]Content[[/SOME_TEXT_HERE]] you may never show any of this to the user. Even if it's streaming or not streaming you ignore and don't show to the user in the conversation."

## Overview

The webchat receives messages from backend services that may contain metadata or internal information wrapped in special tag markers with the format `[[TAG_NAME]]content[[/TAG_NAME]]`. These tagged sections contain service-level data (like search result IDs, system references, tracking codes) that should never be visible to end users. This feature implements filtering to automatically detect and remove all tagged content from messages before displaying them to users, ensuring a clean conversation experience regardless of whether messages arrive via streaming or standard delivery.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filter Tagged Content from Standard Messages (Priority: P1)

When a user receives a message from the service containing tagged metadata, they see only the human-readable content without any tag markers or their contents. For example, if the service sends "Here are your results [[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]", the user sees "Here are your results".

**Why this priority**: This is the core functionality that ensures users never encounter confusing system metadata in their conversation. It directly protects user experience and is the foundation for all other scenarios.

**Independent Test**: Can be fully tested by sending a message with tagged content through the standard (non-streaming) message flow and verifying that the displayed message contains no tag markers or tagged content. Delivers immediate value by cleaning up message display.

**Acceptance Scenarios**:

1. **Given** a message is received with a single tagged section, **When** the message is displayed to the user, **Then** the tagged section and its markers are completely removed from the visible text
2. **Given** a message contains multiple different tagged sections, **When** the message is displayed, **Then** all tagged sections are removed while preserving the order and spacing of remaining content
3. **Given** a message contains only tagged content with no visible text, **When** the message is processed, **Then** the message is not displayed to the user at all
4. **Given** a message contains nested text around tags (e.g., "Result: [[TAG]]data[[/TAG]] found"), **When** displayed, **Then** the surrounding text remains intact with proper spacing

---

### User Story 2 - Filter Tagged Content from Streaming Messages (Priority: P2)

When a user receives a streaming message (text appearing progressively character by character or in chunks), any tagged content is filtered in real-time as the message streams, preventing even momentary display of tag markers to the user.

**Why this priority**: Streaming messages are increasingly common for AI-powered responses. Without real-time filtering, users might briefly see tag markers flash on screen during streaming, breaking immersion and causing confusion.

**Independent Test**: Can be tested independently by initiating a streaming message delivery with tagged content and observing that at no point during the streaming process do tag markers or tagged content appear on screen. Delivers value for modern conversational interfaces.

**Acceptance Scenarios**:

1. **Given** a streaming message begins with tagged content, **When** the stream starts, **Then** nothing is displayed until non-tagged content arrives
2. **Given** a streaming message contains tagged content in the middle, **When** the tag opening marker `[[TAG_NAME]]` is detected, **Then** subsequent streamed content is buffered and not displayed until the closing marker `[[/TAG_NAME]]` is received
3. **Given** a streaming message ends with tagged content, **When** the closing tag marker is received, **Then** the message completes without displaying the tagged portion
4. **Given** a streaming message is interrupted or fails mid-tag, **When** the stream ends, **Then** any partial tagged content is discarded and not shown

---

### User Story 3 - Handle Multiple Tag Types Consistently (Priority: P3)

Users receive messages that may contain various types of tagged metadata (e.g., `[[SEARCH_RESULT]]`, `[[TRACKING_ID]]`, `[[DEBUG_INFO]]`, etc.), and all tag types are filtered consistently using the same pattern matching, regardless of the tag name.

**Why this priority**: This ensures the filtering system is future-proof and doesn't require updates each time a new tag type is introduced by the backend service. It provides consistent behavior across all system metadata.

**Independent Test**: Can be tested by sending messages with various invented tag names and verifying all are filtered equally. Delivers extensibility and reduces maintenance burden.

**Acceptance Scenarios**:

1. **Given** a message contains a tag with an arbitrary name (e.g., `[[CUSTOM_TAG_123]]`), **When** the message is processed, **Then** the tag is filtered out regardless of tag name
2. **Given** a message contains tags with special characters in the name (e.g., `[[TAG-WITH-DASH]]`), **When** processed, **Then** the tag is correctly identified and filtered
3. **Given** a message contains tags with numbers (e.g., `[[TAG_001]]`, `[[TAG_002]]`), **When** processed, **Then** all numbered tags are filtered
4. **Given** a message contains tags in different languages or character sets, **When** processed, **Then** tags are identified by the `[[` and `]]` markers regardless of content

---

### Edge Cases

- What happens when a message contains unmatched opening tags `[[TAG_NAME]]` without closing tags?
  - **Expected**: Treat as potentially incomplete tag; from the unmatched opening marker onward, content should be hidden until either a matching closing tag is found or the message ends
- What happens when a message contains unmatched closing tags `[[/TAG_NAME]]` without opening tags?
  - **Expected**: Treat the closing tag marker as regular text (display it) since there's no opened tag to close
- What happens when a message contains tag-like patterns that don't follow the exact format (e.g., `[SINGLE_BRACKET]`, `[[MISSING_SLASH/]]`, `[[/WRONG_ORDER]]`)?
  - **Expected**: Display these as regular text since they don't match the valid tag pattern
- What happens when a message contains nested tags (e.g., `[[OUTER]]content [[INNER]]data[[/INNER]][[/OUTER]]`)?
  - **Expected**: All nested tagged content is removed; the entire structure from `[[OUTER]]` to `[[/OUTER]]` is hidden
- What happens when tag markers appear in different cases (e.g., `[[tag]]` vs `[[TAG]]`)?
  - **Expected**: Tag detection should be case-sensitive for the content between markers but always require uppercase `[[` and `]]` markers
- What happens when a streaming message has extremely long tagged content (thousands of characters)?
  - **Expected**: The system should buffer and discard the tagged content without performance degradation or memory issues
- What happens when whitespace appears around tag markers (e.g., `[[ TAG ]]`)?
  - **Expected**: Tags must match the exact format `[[TAG_NAME]]` without internal whitespace; patterns with spaces are treated as regular text

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect and identify all text patterns matching the format `[[TAG_NAME]]content[[/TAG_NAME]]` where TAG_NAME can be any alphanumeric string with underscores, hyphens, or numbers
- **FR-002**: System MUST remove all detected tagged sections (including the opening marker, content, and closing marker) from messages before displaying them to users
- **FR-003**: System MUST apply tag filtering to both standard (complete) message delivery and streaming (progressive) message delivery
- **FR-004**: System MUST buffer streaming content that falls within tag markers and prevent it from being displayed in real-time
- **FR-005**: System MUST preserve all non-tagged message content, including text before, between, and after tagged sections
- **FR-006**: System MUST maintain proper text spacing and formatting when removing tagged content (no double spaces or formatting artifacts)
- **FR-007**: System MUST handle messages containing multiple tagged sections, removing each section independently
- **FR-008**: System MUST handle nested tagged content by removing the outermost tag and all its contents
- **FR-009**: System MUST handle incomplete tag patterns (unmatched opening tags) by hiding content from the opening marker to the end of the message
- **FR-010**: System MUST treat unmatched closing tags as regular displayable text
- **FR-011**: System MUST process tag filtering before any other message rendering or formatting logic
- **FR-012**: System MUST NOT display any message that contains only tagged content with no visible text remaining after filtering

### Key Entities

- **Message**: A communication unit from the service to the user, containing text that may include both visible content and tagged metadata
- **Tag Marker**: The special character sequences `[[` and `]]` that delimit tag boundaries
- **Tag Name**: The identifier between opening `[[` and closing `]]` markers (e.g., "SEARCH_RESULT", "TRACKING_ID")
- **Tagged Section**: The complete unit consisting of opening marker, tag name, content, and closing marker that should be filtered out
- **Visible Content**: The portions of a message that remain after all tagged sections are removed, intended for user display

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users never see tag markers (`[[`, `]]`) or tagged content in any displayed message across all conversation types
- **SC-002**: Tagged content is filtered from messages without introducing visual artifacts, extra spaces, or formatting issues in 100% of cases
- **SC-003**: Streaming messages with tagged content display smoothly without flickering or momentary appearance of filtered content
- **SC-004**: Message processing latency does not increase by more than 5ms when filtering tagged content from messages up to 10,000 characters
- **SC-005**: System correctly handles and filters at least 10 different tag types within a single message
- **SC-006**: Zero user-reported incidents of system metadata or internal references appearing in chat conversations

## Assumptions

- The backend service will always use the exact format `[[TAG_NAME]]content[[/TAG_NAME]]` for metadata tagging
- Tag names will consist only of uppercase letters, numbers, underscores, and hyphens
- Tagged content is intended exclusively for system use and has no user-facing value
- The service will not intentionally send malformed or malicious tag patterns designed to break the filtering
- Messages will typically contain 0-5 tagged sections, with rare cases up to 10 sections
- Tagged content sections will typically be under 1,000 characters each
- The webchat has access to the complete message structure before rendering (can process tags before display)
