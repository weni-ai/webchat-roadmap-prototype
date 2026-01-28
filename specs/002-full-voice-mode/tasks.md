# Tasks: Full Voice Mode

**Input**: Design documents from `/specs/002-full-voice-mode/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/voice-service.contract.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and voice service structure

- [X] T001 Create voice services directory structure at src/services/voice/
- [X] T002 [P] Create audio utilities module in src/utils/audioUtils.js with PCM encoding helpers
- [X] T003 [P] Create voice components directory structure at src/components/VoiceMode/
- [X] T004 Create voice service index file in src/services/voice/index.js with exports

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Implement AudioCapture class in src/services/voice/AudioCapture.js with microphone stream handling, PCM encoding, and voice activity detection
- [X] T006 [P] Create VoiceError types and error handling utilities in src/services/voice/errors.js
- [X] T007 [P] Create VoiceConfiguration defaults and validation in src/services/voice/config.js
- [X] T008 Implement base VoiceService class shell in src/services/voice/VoiceService.js with state machine, event emitter, and session management
- [X] T009 Extend ChatContext in src/contexts/ChatContext.jsx with voice mode state (isVoiceModeActive, voiceSession, enterVoiceMode, exitVoiceMode, isVoiceModeSupported)
- [X] T010 Create useVoiceMode hook in src/hooks/useVoiceMode.js with state bindings to ChatContext

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Start Voice Conversation (Priority: P1) 🎯 MVP

**Goal**: User can enter full voice mode from chat interface, see full-screen overlay with waveform animation, and system starts listening

**Independent Test**: Click voice mode button → verify interface transforms to full-screen voice mode with "I'm listening" text and animated waveform

### Implementation for User Story 1

- [X] T011 [P] [US1] Create WaveformVisualizer component in src/components/VoiceMode/WaveformVisualizer.jsx with animated bars for idle/listening/speaking states
- [X] T012 [P] [US1] Create WaveformVisualizer styles in src/components/VoiceMode/WaveformVisualizer.scss with teal color theme and bar animations
- [X] T013 [P] [US1] Create VoiceModeError component in src/components/VoiceMode/VoiceModeError.jsx for displaying permission and connection errors
- [X] T014 [US1] Create VoiceModeOverlay component in src/components/VoiceMode/VoiceModeOverlay.jsx with full-screen UI, header with close button, centered waveform, and instructional text
- [X] T015 [US1] Create VoiceModeOverlay styles in src/components/VoiceMode/VoiceModeOverlay.scss with teal/cyan gradient background per design reference
- [X] T016 [P] [US1] Create VoiceModeButton component in src/components/VoiceMode/VoiceModeButton.jsx for entering voice mode
- [X] T017 [P] [US1] Create VoiceModeButton styles in src/components/VoiceMode/VoiceModeButton.scss
- [X] T018 [US1] Implement microphone permission request flow in VoiceService.requestMicrophonePermission() in src/services/voice/VoiceService.js
- [X] T019 [US1] Implement browser support detection in VoiceService.isSupported() checking MediaDevices, AudioContext, WebSocket APIs
- [X] T020 [US1] Implement startSession() in VoiceService to initialize AudioCapture and transition to listening state
- [X] T021 [US1] Add VoiceModeButton to InputBox in src/components/Input/InputBox.jsx (next to audio recorder button)
- [X] T022 [US1] Add VoiceModeOverlay to Widget in src/components/Widget/Widget.jsx and connect to ChatContext
- [X] T023 [US1] Add voiceMode config support to Widget props in src/components/Widget/Widget.jsx

**Checkpoint**: User Story 1 complete - user can enter voice mode, see full-screen UI, grant microphone permission, system shows listening state

---

## Phase 4: User Story 2 - Speak and Send Message (Priority: P1)

**Goal**: User speaks naturally, system transcribes speech in real-time, automatically sends message when user stops speaking

**Independent Test**: In voice mode, speak a phrase, pause → verify transcript appears and message is sent to agent

### Implementation for User Story 2

- [X] T024 [US2] Implement STTConnection class in src/services/voice/STTConnection.js with ElevenLabs WebSocket connection, audio chunk sending, and transcript event handling
- [X] T025 [US2] Add STT WebSocket URL builder with language_code, model_id, commit_strategy, vad_silence_threshold_secs parameters in STTConnection
- [X] T026 [US2] Implement partial transcript handling (partial_transcript message) in STTConnection with event emission
- [X] T027 [US2] Implement committed transcript handling (committed_transcript message) in STTConnection
- [X] T028 [US2] Connect AudioCapture to STTConnection in VoiceService - pipe microphone PCM chunks to WebSocket
- [X] T029 [US2] Implement transcript:committed event handler in VoiceService that calls ChatContext.sendMessage(text)
- [X] T030 [US2] Update VoiceModeOverlay to display partial transcript in real-time below main text
- [X] T031 [US2] Add processing state visual feedback in VoiceModeOverlay (e.g., "Processing..." text)
- [X] T032 [US2] Handle STT errors (connection failed, transcription failed) with VoiceError display

**Checkpoint**: User Story 2 complete - user can speak, see real-time transcript, message automatically sent on pause

---

## Phase 5: User Story 3 - Hear Agent Response in Real-Time (Priority: P1)

**Goal**: Agent text responses are converted to speech and played in real-time as they stream in

**Independent Test**: Send message → verify agent response is spoken aloud progressively, not waiting for complete text

### Implementation for User Story 3

- [X] T033 [US3] Implement TTSPlayer class in src/services/voice/TTSPlayer.js with AudioContext setup and audio queue management
- [X] T034 [US3] Implement streaming TTS fetch in TTSPlayer.speak() using ElevenLabs /v1/text-to-speech/{voice_id}/stream endpoint
- [X] T035 [US3] Implement audio chunk buffering and seamless playback in TTSPlayer with queueChunk() and play queue processing
- [X] T036 [US3] Add text chunking logic in VoiceService - buffer incoming text until sentence boundary or minimum size before sending to TTS
- [X] T037 [US3] Connect TTSPlayer to VoiceService with speak() method and speaking:started/speaking:ended events
- [X] T038 [US3] Listen to agent message:chunk events in VoiceService when voice mode active - pipe text to TTSPlayer
- [X] T039 [US3] Update VoiceModeOverlay to show speaking state with different waveform animation
- [X] T040 [US3] Add speaking state text in VoiceModeOverlay (e.g., change from "I'm listening" to agent response indicator)
- [X] T041 [US3] Handle TTS errors gracefully - show text response if audio fails

**Checkpoint**: User Story 3 complete - full voice conversation loop works (speak → send → hear response)

---

## Phase 6: User Story 4 - Exit Voice Mode (Priority: P2)

**Goal**: User can exit voice mode at any time, all messages preserved in text chat

**Independent Test**: Have voice conversation, click X → verify return to text chat with all messages visible

### Implementation for User Story 4

- [X] T042 [US4] Implement endSession() in VoiceService - stop AudioCapture, close STT WebSocket, stop TTSPlayer
- [X] T043 [US4] Implement exitVoiceMode() in ChatContext that calls VoiceService.endSession() and updates state
- [X] T044 [US4] Connect close button in VoiceModeOverlay header to exitVoiceMode()
- [X] T045 [US4] Ensure audio playback stops immediately when exiting voice mode (call TTSPlayer.stop())
- [X] T046 [US4] Add smooth transition animation when closing VoiceModeOverlay in src/components/VoiceMode/VoiceModeOverlay.scss
- [X] T047 [US4] Verify messages are visible in standard MessagesList after exit (no code changes expected - uses existing sendMessage)

**Checkpoint**: User Story 4 complete - user can exit voice mode and continue in text mode

---

## Phase 7: User Story 5 - Continuous Voice Conversation (Priority: P2)

**Goal**: System automatically returns to listening mode after agent finishes speaking

**Independent Test**: Have multi-turn conversation without clicking any buttons between turns

### Implementation for User Story 5

- [X] T048 [US5] Add speaking:ended event handler in VoiceService that transitions back to listening state when autoListen=true
- [X] T049 [US5] Restart AudioCapture listening after TTS playback completes in VoiceService
- [X] T050 [US5] Update VoiceModeOverlay text when transitioning from speaking back to listening
- [X] T051 [US5] Add autoListen configuration option to VoiceConfiguration with default true
- [X] T052 [US5] Ensure waveform animation transitions smoothly between speaking and listening states

**Checkpoint**: User Story 5 complete - multi-turn voice conversations work seamlessly

---

## Phase 8: User Story 6 - Interrupt Agent Response (Priority: P3)

**Goal**: User can interrupt agent while speaking by starting to speak themselves

**Independent Test**: While agent is speaking, start talking → verify agent audio stops within 200ms and user speech is captured

### Implementation for User Story 6

- [X] T053 [US6] Keep AudioCapture voice activity detection active during TTS playback (barge-in monitoring)
- [X] T054 [US6] Implement barge-in detection in VoiceService - on voiceActivity during speaking state, call TTSPlayer.stop() and emit barge-in event
- [X] T055 [US6] Transition to processing state on barge-in and capture new user speech
- [X] T056 [US6] Cancel any pending TTS requests when barge-in detected
- [X] T057 [US6] Add enableBargeIn configuration option to VoiceConfiguration with default true
- [X] T058 [US6] Verify barge-in response time is under 200ms from voice detection to audio stop

**Checkpoint**: User Story 6 complete - natural conversation interruptions work

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge cases, and improvements across all user stories

- [X] T059 Handle network disconnect during voice mode - show error, attempt reconnection, fallback to text mode
- [X] T060 Handle browser tab visibility change - pause listening when tab hidden, resume when visible
- [X] T061 Add i18n support for voice mode texts in src/i18n/locales/pt.json, en.json, es.json
- [X] T062 [P] Add keyboard shortcut to exit voice mode (Escape key)
- [X] T063 [P] Add aria-labels and accessibility attributes to voice mode components
- [X] T064 Add VoiceMode component index file in src/components/VoiceMode/index.js with all exports
- [X] T065 Update src/index.js to export voice mode components and hooks
- [X] T066 Run quickstart.md validation scenarios manually to verify feature completeness

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1-US3 (P1) are core and should be completed in order
  - US4-US5 (P2) can start after US3 is done
  - US6 (P3) can start after US5 is done
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Entry point, no dependencies
- **User Story 2 (P1)**: Depends on US1 (needs voice mode entry and AudioCapture)
- **User Story 3 (P1)**: Depends on US2 (needs message sending to receive responses)
- **User Story 4 (P2)**: Can start after US3 (needs full conversation loop)
- **User Story 5 (P2)**: Depends on US3 (needs TTS playback to auto-listen after)
- **User Story 6 (P3)**: Depends on US5 (needs continuous conversation with barge-in)

### Within Each User Story

- UI components can be built in parallel [P]
- Service methods must be completed before integration
- Integration tasks depend on both service and UI being ready

### Parallel Opportunities

**Setup Phase:**
```
T002, T003 can run in parallel (different directories)
```

**Foundational Phase:**
```
T005, T006, T007 can run in parallel (different files)
```

**User Story 1:**
```
T011, T012, T013 can run in parallel (independent components)
T016, T017 can run in parallel (VoiceModeButton files)
```

**User Story 2-6:**
```
Most tasks are sequential due to service integration dependencies
```

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Enter voice mode, see UI)
4. Complete Phase 4: User Story 2 (Speak and send)
5. Complete Phase 5: User Story 3 (Hear agent response)
6. **STOP and VALIDATE**: Test full voice conversation loop
7. Deploy/demo as MVP

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test voice mode entry → Demo
3. Add US2 → Test speech-to-text → Demo
4. Add US3 → Test full loop (MVP!)
5. Add US4 → Test exit flow
6. Add US5 → Test continuous conversation
7. Add US6 → Test barge-in
8. Polish phase for production readiness

---

## Summary

| Phase | User Story | Task Count | Priority |
|-------|-----------|-----------|----------|
| Phase 1 | Setup | 4 | - |
| Phase 2 | Foundational | 6 | - |
| Phase 3 | US1 - Start Voice Conversation | 13 | P1 |
| Phase 4 | US2 - Speak and Send Message | 9 | P1 |
| Phase 5 | US3 - Hear Agent Response | 9 | P1 |
| Phase 6 | US4 - Exit Voice Mode | 6 | P2 |
| Phase 7 | US5 - Continuous Conversation | 5 | P2 |
| Phase 8 | US6 - Interrupt Agent Response | 6 | P3 |
| Phase 9 | Polish | 8 | - |
| **Total** | | **66** | |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable once complete
- MVP scope: User Stories 1-3 (core voice conversation loop)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- ElevenLabs API requires token - implement getToken() callback in config
