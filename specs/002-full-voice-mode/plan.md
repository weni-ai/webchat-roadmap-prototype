# Implementation Plan: Full Voice Mode

**Branch**: `002-full-voice-mode` | **Date**: 2026-01-28 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-full-voice-mode/spec.md`

## Summary

Implement a full voice mode for the Weni Webchat that enables users to have voice conversations with the agent. Users speak naturally, speech is transcribed and sent automatically, and agent responses are spoken in real-time using streaming TTS. The feature uses ElevenLabs APIs for ultra-low latency speech processing in Brazilian Portuguese with a female voice.

## Technical Context

**Language/Version**: JavaScript/TypeScript (React 18.x)  
**Primary Dependencies**: React 18, Vite, SCSS, ElevenLabs API (STT + TTS)  
**Storage**: N/A (uses existing message persistence)  
**Testing**: Jest, React Testing Library  
**Target Platform**: Modern browsers (Chrome 66+, Firefox 60+, Safari 14.1+, Edge 79+)  
**Project Type**: Web (React component library)  
**Performance Goals**: STT <500ms, TTS start <150ms, barge-in <200ms  
**Constraints**: HTTPS required, microphone permission required, ElevenLabs API key secured on backend  
**Scale/Scope**: Single feature addition to existing webchat widget

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution template in this project is not yet configured with specific gates. Proceeding with standard best practices:

- [x] Feature is self-contained and independently testable
- [x] No unnecessary complexity - uses existing infrastructure where possible
- [x] Clear interfaces defined via contracts
- [x] Test requirements documented

## Project Structure

### Documentation (this feature)

```text
specs/002-full-voice-mode/
├── plan.md              # This file
├── research.md          # Technical decisions and ElevenLabs API research
├── data-model.md        # VoiceSession, VoiceConfiguration, state machine
├── quickstart.md        # Integration scenarios and examples
├── contracts/           # Service and component contracts
│   └── voice-service.contract.md
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Task breakdown (to be generated)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── VoiceMode/                    # NEW - Voice mode components
│   │   ├── VoiceModeOverlay.jsx      # Full-screen voice UI
│   │   ├── VoiceModeOverlay.scss
│   │   ├── WaveformVisualizer.jsx    # Audio waveform animation
│   │   ├── WaveformVisualizer.scss
│   │   ├── VoiceModeButton.jsx       # Entry point button
│   │   ├── VoiceModeButton.scss
│   │   └── VoiceModeError.jsx        # Error display component
│   ├── Input/
│   │   └── InputBox.jsx              # MODIFY - Add voice mode button
│   └── Widget/
│       └── Widget.jsx                # MODIFY - Add voice mode provider
├── services/
│   └── voice/                        # NEW - Voice service
│       ├── VoiceService.js           # Main voice service class
│       ├── STTConnection.js          # WebSocket STT handler
│       ├── TTSPlayer.js              # Streaming TTS playback
│       ├── AudioCapture.js           # Microphone capture
│       └── index.js
├── hooks/
│   └── useVoiceMode.js               # NEW - Voice mode hook
├── contexts/
│   └── ChatContext.jsx               # MODIFY - Add voice state
└── utils/
    └── audioUtils.js                 # NEW - Audio encoding utilities

test/
├── __tests__/
│   ├── voice/                        # NEW - Voice tests
│   │   ├── VoiceService.test.js
│   │   ├── STTConnection.test.js
│   │   ├── TTSPlayer.test.js
│   │   └── useVoiceMode.test.js
│   └── VoiceModeOverlay.test.jsx     # Component tests
└── __mocks__/
    └── voiceMocks.js                 # NEW - Mock audio APIs
```

**Structure Decision**: Feature is implemented as a self-contained module within the existing React component structure. The voice service layer abstracts ElevenLabs integration, making it testable and potentially replaceable.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Widget                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    ChatProvider                          │   │
│  │  ┌─────────────┐  ┌──────────────────────────────────┐  │   │
│  │  │ ChatContext │  │        VoiceService              │  │   │
│  │  │             │  │  ┌────────────┐ ┌─────────────┐  │  │   │
│  │  │ messages    │←─│──│ STTConnect │ │  TTSPlayer  │  │  │   │
│  │  │ sendMessage │  │  └────────────┘ └─────────────┘  │  │   │
│  │  │             │  │  ┌────────────┐                   │  │   │
│  │  └─────────────┘  │  │AudioCapture│                   │  │   │
│  │        ↑          │  └────────────┘                   │  │   │
│  │        │          └──────────────────────────────────┘  │   │
│  └────────│────────────────────────────────────────────────┘   │
│           │                                                     │
│  ┌────────│────────────────────────────────────────────────┐   │
│  │        │            UI Components                        │   │
│  │  ┌─────┴─────┐  ┌──────────────────┐                    │   │
│  │  │   Chat    │  │ VoiceModeOverlay │                    │   │
│  │  │ InputBox  │  │   Waveform       │                    │   │
│  │  │ [🎤 btn]  │  │   Error          │                    │   │
│  │  └───────────┘  └──────────────────┘                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

                              ↕ WebSocket (STT)
                              ↕ HTTP Stream (TTS)

┌─────────────────────────────────────────────────────────────────┐
│                      ElevenLabs APIs                            │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │ STT Realtime       │  │ TTS Streaming      │                │
│  │ wss://...realtime  │  │ POST .../stream    │                │
│  └────────────────────┘  └────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Speech-to-Text Flow

```
User Speech → Microphone → AudioCapture → PCM Encoding
    → WebSocket → ElevenLabs STT
    → Partial/Committed Transcript
    → VoiceService → ChatContext.sendMessage()
```

### Text-to-Speech Flow

```
Agent Response (streaming) → ChatContext
    → VoiceService.speak() → Chunk Buffering
    → ElevenLabs TTS Stream → Audio Data
    → TTSPlayer → AudioContext → Speaker
```

## Key Implementation Details

### 1. Voice Service Initialization

```javascript
// On entering voice mode
const voiceService = new VoiceService(config);
await voiceService.init({
  voiceId: 'selected-voice-id',
  languageCode: 'pt',
  getToken: () => fetchToken('/api/voice/token'),
});
await voiceService.startSession();
```

### 2. STT WebSocket Connection

```javascript
// Connect to ElevenLabs realtime STT
const ws = new WebSocket(
  `wss://api.elevenlabs.io/v1/speech-to-text/realtime?` +
  `model_id=scribe_v2_realtime&` +
  `language_code=pt&` +
  `commit_strategy=vad&` +
  `vad_silence_threshold_secs=1.5&` +
  `token=${singleUseToken}`
);

// Send audio chunks
ws.send(JSON.stringify({
  message_type: 'input_audio_chunk',
  audio_base_64: base64PCM,
  sample_rate: 16000,
}));
```

### 3. TTS Streaming Playback

```javascript
// Stream TTS for agent response chunks
const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
  {
    method: 'POST',
    headers: {
      'xi-api-key': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: textChunk,
      model_id: 'eleven_flash_v2_5',
      output_format: 'mp3_44100_128',
      optimize_streaming_latency: 3,
      language_code: 'pt-BR',
    }),
  }
);

// Stream audio to player
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  audioPlayer.queueChunk(value);
}
```

### 4. Barge-in Detection

```javascript
// Monitor microphone while TTS plays
audioCapture.on('voiceActivity', () => {
  if (voiceSession.state === 'speaking') {
    ttsPlayer.stop();
    emit('barge-in');
    setState('processing');
  }
});
```

## Dependencies

### New Files to Create

| File | Purpose |
|------|---------|
| `src/services/voice/VoiceService.js` | Main voice service orchestrator |
| `src/services/voice/STTConnection.js` | WebSocket STT handler |
| `src/services/voice/TTSPlayer.js` | Audio playback manager |
| `src/services/voice/AudioCapture.js` | Microphone capture + encoding |
| `src/hooks/useVoiceMode.js` | React hook for components |
| `src/components/VoiceMode/VoiceModeOverlay.jsx` | Full-screen UI |
| `src/components/VoiceMode/WaveformVisualizer.jsx` | Animated waveform |
| `src/components/VoiceMode/VoiceModeButton.jsx` | Entry point button |
| `src/utils/audioUtils.js` | PCM encoding utilities |

### Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/ChatContext.jsx` | Add voice state and methods |
| `src/components/Input/InputBox.jsx` | Add voice mode button |
| `src/components/Widget/Widget.jsx` | Voice mode config support |
| `package.json` | No new npm packages required (uses native APIs) |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Browser compatibility | Feature detection, graceful degradation |
| ElevenLabs API changes | Abstract behind service layer |
| High latency | Configurable optimization levels |
| Token security | Backend-only API key, single-use tokens |
| Audio quality | Configurable sample rates, noise hints |

## Complexity Tracking

> No constitution violations requiring justification.

| Decision | Rationale |
|----------|-----------|
| Separate voice service | Keeps voice logic isolated, testable, replaceable |
| Native Web APIs | No new npm dependencies, better bundle size |
| State machine | Clear transitions, easier debugging |
| Hook abstraction | Clean React integration pattern |
