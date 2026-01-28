# Feature Specification: Full Voice Mode

**Feature Branch**: `002-full-voice-mode`  
**Created**: 2026-01-28  
**Status**: Draft  
**Input**: User description: "Add full voice mode to webchat where user speaks and message is sent automatically when they finish speaking. Agent responses are spoken to the user in real-time during streaming. After the call ends, messages are readable in traditional text mode. Requires ultra-low latency using ElevenLabs. Prefer Brazilian Portuguese and female voice."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start Voice Conversation (Priority: P1)

A user wants to interact with the webchat using their voice instead of typing. They click a button to enter full voice mode, which transforms the interface into an immersive voice-first experience. The system immediately starts listening for their speech.

**Why this priority**: This is the core entry point for the voice mode feature. Without the ability to enter voice mode and have the system listen, no other voice functionality can work.

**Independent Test**: Can be fully tested by clicking the voice mode button and verifying the interface transforms to the listening state with microphone active.

**Acceptance Scenarios**:

1. **Given** user is in the standard text chat view, **When** they click the "Voice Mode" button, **Then** the interface transitions to full-screen voice mode showing "I'm listening, how can I help you?" with an active audio waveform visualization
2. **Given** user is in voice mode, **When** the microphone activates, **Then** they see visual feedback indicating the system is listening (waveform animation)
3. **Given** user is in voice mode, **When** browser does not support microphone access or user denies permission, **Then** the system displays a clear error message and returns to text mode

---

### User Story 2 - Speak and Send Message (Priority: P1)

A user speaks their message naturally. When they pause/finish speaking, the system automatically detects the end of their speech, transcribes it, and sends the message to the agent without requiring any additional user action.

**Why this priority**: This is the core voice input functionality. Users must be able to speak and have their words converted to text and sent automatically for the voice experience to work.

**Independent Test**: Can be fully tested by speaking a message and verifying it appears in the conversation and is sent to the agent.

**Acceptance Scenarios**:

1. **Given** user is in voice mode with microphone active, **When** they speak a complete phrase and pause, **Then** the system transcribes their speech with ultra-low latency (under 500ms from speech end to transcription complete)
2. **Given** speech has been transcribed, **When** silence is detected for the configured threshold, **Then** the message is automatically sent to the agent
3. **Given** user is speaking, **When** they are mid-sentence, **Then** the system does not prematurely send the message (intelligent end-of-speech detection)
4. **Given** transcription occurs, **When** the message is sent, **Then** it appears in the conversation history as a user message

---

### User Story 3 - Hear Agent Response in Real-Time (Priority: P1)

When the agent responds, the text response is converted to speech and played to the user in real-time as the response streams in, rather than waiting for the complete response. The voice is natural-sounding, female, and speaks Brazilian Portuguese.

**Why this priority**: Real-time voice output is essential for a natural conversational experience. Waiting for complete responses would break the flow and feel unnatural.

**Independent Test**: Can be fully tested by sending a message and verifying the agent's response is spoken aloud progressively as text streams in.

**Acceptance Scenarios**:

1. **Given** a message has been sent, **When** the agent begins streaming a response, **Then** text-to-speech begins immediately with ultra-low latency (under 150ms from text chunk received to audio playback start)
2. **Given** the agent is streaming a response, **When** new text chunks arrive, **Then** they are queued and spoken seamlessly without gaps or stuttering
3. **Given** text-to-speech is playing, **When** the audio plays, **Then** it uses a natural-sounding female voice in Brazilian Portuguese
4. **Given** the response is being spoken, **When** the user can see/access the interface, **Then** visual feedback indicates the agent is speaking (e.g., animated waveform)

---

### User Story 4 - Exit Voice Mode (Priority: P2)

A user wants to end the voice conversation and return to the traditional text-based chat. They can do this at any time by clicking the close button. All messages exchanged during voice mode are preserved and visible in text format.

**Why this priority**: Users need a way to exit voice mode gracefully. This is important but secondary to the core voice functionality.

**Independent Test**: Can be fully tested by entering voice mode, having a conversation, exiting, and verifying all messages are visible in text chat.

**Acceptance Scenarios**:

1. **Given** user is in voice mode, **When** they click the close (X) button, **Then** voice mode closes and they return to the standard text chat interface
2. **Given** user had a voice conversation, **When** they exit voice mode, **Then** all messages (user and agent) from the voice session are visible in the text chat history
3. **Given** audio is currently playing (agent speaking), **When** user exits voice mode, **Then** audio playback stops immediately
4. **Given** user exits voice mode, **When** they view the chat, **Then** voice messages are indistinguishable from typed messages (appear as normal text)

---

### User Story 5 - Continuous Voice Conversation (Priority: P2)

A user wants to have a back-and-forth conversation entirely in voice mode without manual intervention. After the agent finishes speaking, the system automatically returns to listening mode so the user can respond.

**Why this priority**: Enables natural multi-turn conversations without requiring user to manually re-activate listening after each agent response.

**Independent Test**: Can be fully tested by having a multi-turn conversation and verifying the system automatically switches between listening and speaking states.

**Acceptance Scenarios**:

1. **Given** the agent has finished speaking, **When** audio playback completes, **Then** the system automatically returns to listening mode
2. **Given** system returns to listening mode, **When** transition occurs, **Then** visual feedback updates to indicate "listening" state
3. **Given** user is in continuous conversation, **When** they speak again after agent response, **Then** their new message is captured and sent without manual intervention

---

### User Story 6 - Interrupt Agent Response (Priority: P3)

A user wants to interrupt the agent while it's speaking to ask a new question or redirect the conversation. When they start speaking, the agent's audio stops and the system captures their new input.

**Why this priority**: Natural conversations include interruptions. This enhances UX but is not critical for basic functionality.

**Independent Test**: Can be fully tested by speaking while the agent is responding and verifying the agent stops speaking and captures user input.

**Acceptance Scenarios**:

1. **Given** the agent is speaking, **When** the user starts speaking (voice activity detected), **Then** agent audio playback stops within 200ms
2. **Given** the user interrupted, **When** they continue speaking, **Then** their speech is captured and processed normally
3. **Given** the user interrupted, **When** they finish speaking, **Then** a new message is sent to the agent (not appended to previous)

---

### Edge Cases

- What happens when network connection is lost during voice mode? → Display error message, attempt reconnection, fallback to text mode if reconnection fails
- What happens when there's excessive background noise? → Apply noise filtering; if speech cannot be recognized, prompt user to speak more clearly
- What happens when the agent sends a very long response? → Continue streaming TTS; allow user to interrupt at any time
- What happens when multiple browser tabs have voice mode active? → Only one tab can have active microphone; display warning in other tabs
- What happens when user's browser doesn't support required APIs? → Detect capability before showing voice mode option; display browser compatibility message if unsupported
- What happens when speech recognition fails to transcribe? → Display error feedback; remain in listening mode; do not send empty message
- What happens if ElevenLabs service is unavailable? → Gracefully degrade to text-only mode with notification to user

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a voice mode entry point accessible from the standard chat interface
- **FR-002**: System MUST display a full-screen voice mode interface with visual feedback indicating listening state (waveform animation)
- **FR-003**: System MUST request and handle microphone permissions appropriately, with clear user feedback for permission states
- **FR-004**: System MUST capture user speech through the device microphone
- **FR-005**: System MUST convert speech to text using real-time speech recognition with ultra-low latency (under 500ms end-to-end)
- **FR-006**: System MUST automatically detect end of speech using voice activity detection
- **FR-007**: System MUST automatically send the transcribed message when speech ends (configurable silence threshold)
- **FR-008**: System MUST display the transcribed message in the conversation history
- **FR-009**: System MUST convert agent text responses to speech using text-to-speech
- **FR-010**: System MUST begin audio playback within 150ms of receiving first text chunk (streaming TTS)
- **FR-011**: System MUST use a natural-sounding female voice
- **FR-012**: System MUST support Brazilian Portuguese (pt-BR) as the primary language
- **FR-013**: System MUST provide visual feedback when the agent is "speaking" (audio playing)
- **FR-014**: System MUST allow users to exit voice mode at any time via close button
- **FR-015**: System MUST preserve all voice conversation messages in text format accessible after exiting voice mode
- **FR-016**: System MUST automatically return to listening mode after agent finishes speaking
- **FR-017**: System MUST stop agent audio playback when user starts speaking (barge-in/interrupt capability)
- **FR-018**: System MUST handle network errors gracefully with appropriate user feedback
- **FR-019**: System MUST work on modern browsers that support Web Speech API or equivalent technologies

### Key Entities

- **VoiceSession**: Represents an active voice mode session with state (listening, processing, speaking, idle), start time, and associated conversation
- **VoiceMessage**: A message created through voice input, containing original transcription, confidence score, and reference to the text message
- **VoiceConfiguration**: Settings for voice mode including preferred language, voice characteristics, silence threshold, and TTS model selection

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can start voice mode and speak their first message within 3 seconds of clicking the voice button
- **SC-002**: Speech-to-text transcription completes within 500ms of user finishing speaking
- **SC-003**: Agent voice response begins playing within 150ms of first text chunk being received (streaming latency)
- **SC-004**: Audio playback is seamless with no perceivable gaps between text chunks (under 50ms gap tolerance)
- **SC-005**: User interruption stops agent audio within 200ms of voice activity detection
- **SC-006**: 95% of voice messages are transcribed accurately in Brazilian Portuguese under normal speaking conditions
- **SC-007**: Voice mode works reliably on Chrome, Firefox, Safari, and Edge browsers (latest 2 versions)
- **SC-008**: Users can have conversations of 10+ turns without needing to manually re-enter voice mode
- **SC-009**: All voice conversation messages are readable in text format after exiting voice mode
- **SC-010**: Voice mode interface matches the provided design reference (full-screen teal gradient, centered waveform, instructional text)

## Assumptions

- Users have a working microphone on their device
- Users have a stable internet connection for real-time speech services
- The webchat is embedded in a secure context (HTTPS) to enable microphone access
- The ElevenLabs API is used for text-to-speech with their Flash v2.5 or Scribe v2 Realtime models for ultra-low latency
- The Web Speech API or ElevenLabs Scribe v2 Realtime is used for speech-to-text
- Agent responses are already provided via streaming (SSE or WebSocket)
- The default silence threshold for end-of-speech detection is 1-2 seconds (configurable)

## UI Reference

The voice mode interface follows this design:
- Full-screen overlay with teal/cyan gradient background (dark teal at top transitioning to bright cyan at bottom)
- Header showing "Fully voice mode" on the left with a close (X) button on the right
- Centered audio waveform visualization (animated bars indicating listening/speaking states)
- Main text: "I'm listening, how can I help you?"
- Subtitle text: "The microphone is on, you can speak whenever you're ready."

![Voice Mode Interface Reference](/Users/johncordeiro/.cursor/projects/Users-johncordeiro-workspaces-weni-ai-webchat-roadmap-prototype/assets/image-0e0c7530-f282-4afc-b9f6-a5d1c4b5f8a0.png)
