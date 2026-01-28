# Data Model: Full Voice Mode

**Feature**: 002-full-voice-mode  
**Date**: 2026-01-28

## Overview

This document defines the data structures and state management for the Full Voice Mode feature. The design prioritizes simplicity by leveraging existing message infrastructure and minimizing new persistent storage requirements.

---

## Entities

### 1. VoiceSession

Represents an active voice mode session. This is a **transient** entity that exists only in memory during voice mode.

```typescript
interface VoiceSession {
  /** Unique identifier for this session */
  id: string;
  
  /** Current state of the voice session */
  state: VoiceSessionState;
  
  /** Timestamp when voice mode was entered */
  startedAt: number;
  
  /** Reference to the chat service/context */
  chatContext: ChatContext;
  
  /** Active WebSocket connection for STT */
  sttConnection: WebSocket | null;
  
  /** Current audio context for playback */
  audioContext: AudioContext | null;
  
  /** Microphone media stream */
  microphoneStream: MediaStream | null;
  
  /** Configuration for this session */
  config: VoiceConfiguration;
  
  /** Current partial transcript (interim result) */
  partialTranscript: string;
  
  /** Queue of audio chunks waiting to be played */
  audioQueue: AudioQueueItem[];
  
  /** Whether TTS is currently playing */
  isPlaying: boolean;
  
  /** Error information if in error state */
  error: VoiceError | null;
}

type VoiceSessionState =
  | 'idle'
  | 'initializing'
  | 'listening'
  | 'processing'
  | 'sending'
  | 'receiving'
  | 'speaking'
  | 'error';
```

### 2. VoiceConfiguration

Configuration settings for voice mode. Can be provided via widget config or use defaults.

```typescript
interface VoiceConfiguration {
  /** ElevenLabs voice ID for TTS */
  voiceId: string;
  
  /** Language code for STT and TTS */
  languageCode: string;  // e.g., 'pt' or 'pt-BR'
  
  /** TTS model to use */
  ttsModel: 'eleven_flash_v2_5' | 'eleven_multilingual_v2';
  
  /** STT model to use */
  sttModel: 'scribe_v2_realtime';
  
  /** Silence threshold in seconds for end-of-speech detection */
  silenceThreshold: number;  // default: 1.5
  
  /** Voice Activity Detection threshold */
  vadThreshold: number;  // default: 0.4
  
  /** Audio output format */
  audioFormat: 'mp3_44100_128' | 'pcm_24000';
  
  /** Latency optimization level (0-4) */
  latencyOptimization: number;  // default: 3
  
  /** Enable barge-in (interrupt) capability */
  enableBargeIn: boolean;  // default: true
  
  /** Auto-return to listening after agent speaks */
  autoListen: boolean;  // default: true
}

const DEFAULT_VOICE_CONFIG: VoiceConfiguration = {
  voiceId: '', // Must be configured
  languageCode: 'pt',
  ttsModel: 'eleven_flash_v2_5',
  sttModel: 'scribe_v2_realtime',
  silenceThreshold: 1.5,
  vadThreshold: 0.4,
  audioFormat: 'mp3_44100_128',
  latencyOptimization: 3,
  enableBargeIn: true,
  autoListen: true,
};
```

### 3. VoiceError

Structured error information for voice mode failures.

```typescript
interface VoiceError {
  /** Error code for programmatic handling */
  code: VoiceErrorCode;
  
  /** Human-readable error message */
  message: string;
  
  /** Whether the error is recoverable */
  recoverable: boolean;
  
  /** Suggested action for the user */
  suggestion: string;
  
  /** Original error if available */
  originalError?: Error;
}

type VoiceErrorCode =
  | 'MICROPHONE_PERMISSION_DENIED'
  | 'MICROPHONE_NOT_FOUND'
  | 'BROWSER_NOT_SUPPORTED'
  | 'STT_CONNECTION_FAILED'
  | 'STT_TRANSCRIPTION_FAILED'
  | 'TTS_GENERATION_FAILED'
  | 'NETWORK_ERROR'
  | 'TOKEN_EXPIRED'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR';
```

### 4. AudioQueueItem

Represents an audio chunk in the playback queue.

```typescript
interface AudioQueueItem {
  /** Unique identifier */
  id: string;
  
  /** Audio data (ArrayBuffer or Blob) */
  data: ArrayBuffer;
  
  /** Text that generated this audio */
  text: string;
  
  /** Order in the response sequence */
  sequenceNumber: number;
  
  /** Playback state */
  state: 'pending' | 'playing' | 'completed';
  
  /** Duration in milliseconds (if known) */
  duration?: number;
}
```

### 5. STTMessage (WebSocket Protocol)

Messages sent/received via ElevenLabs STT WebSocket.

```typescript
// Client → Server
interface STTInputAudioChunk {
  message_type: 'input_audio_chunk';
  audio_base_64: string;  // Base64 encoded PCM audio
  commit?: boolean;       // Manual commit flag
  sample_rate?: number;   // e.g., 16000
  previous_text?: string; // Context from previous transcript
}

// Server → Client
interface STTSessionStarted {
  message_type: 'session_started';
  session_id: string;
  config: {
    sample_rate: number;
    audio_format: string;
    language_code: string;
    vad_commit_strategy: boolean;
    vad_silence_threshold_secs: number;
    model_id: string;
    // ... other config
  };
}

interface STTPartialTranscript {
  message_type: 'partial_transcript';
  text: string;
}

interface STTCommittedTranscript {
  message_type: 'committed_transcript';
  text: string;
}

interface STTCommittedTranscriptWithTimestamps {
  message_type: 'committed_transcript_with_timestamps';
  text: string;
  language_code: string;
  words: STTWord[];
}

interface STTWord {
  text: string;
  start: number;
  end: number;
  type: 'word' | 'spacing';
  logprob?: number;
}

interface STTError {
  message_type: 'scribe_error' | 'scribe_auth_error' | 'scribe_rate_limited_error';
  error: string;
}

type STTServerMessage =
  | STTSessionStarted
  | STTPartialTranscript
  | STTCommittedTranscript
  | STTCommittedTranscriptWithTimestamps
  | STTError;
```

---

## State Transitions

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│    ┌──────┐                                                          │
│    │ idle │ ─── enterVoiceMode() ──→ ┌──────────────┐               │
│    └──────┘                          │ initializing │               │
│        ↑                             └──────────────┘               │
│        │                                    │                         │
│   exitVoiceMode()                      success │                     │
│        │                                    ↓                         │
│        │    ┌────────────────────────────────────────────────┐       │
│        │    │                  ┌───────────┐                  │       │
│        │    │   ┌─────────────→│ listening │←────────────┐   │       │
│        │    │   │              └───────────┘             │   │       │
│        │    │   │                    │                    │   │       │
│        │    │   │         voiceActivityDetected()        │   │       │
│        │    │   │                    ↓                    │   │       │
│        │    │   │             ┌────────────┐              │   │       │
│        │    │   │             │ processing │              │   │       │
│        │    │   │             └────────────┘              │   │       │
│        │    │   │                    │                    │   │       │
│        │    │   │          silenceDetected()             │   │       │
│        │    │   │                    ↓                    │   │       │
│        │    │   │              ┌─────────┐               │   │       │
│        │    │   │              │ sending │               │   │       │
│        │    │   │              └─────────┘               │   │       │
│        │    │   │                    │                    │   │       │
│        │    │   │            messageSent()               │   │       │
│        │    │   │                    ↓                    │   │       │
│        │    │   │             ┌───────────┐              │   │       │
│        │    │   │             │ receiving │              │   │       │
│        │    │   │             └───────────┘              │   │       │
│        │    │   │                    │                    │   │       │
│        │    │   │        agentResponseStarted()          │   │       │
│        │    │   │                    ↓                    │   │       │
│        │    │   │             ┌──────────┐               │   │       │
│        │    │   │             │ speaking │───────────────┘   │       │
│        │    │   │             └──────────┘                   │       │
│        │    │   │                    │     audioComplete()   │       │
│        │    │   │                    │                        │       │
│        │    │   │       bargeIn() ───┘                       │       │
│        │    │   │          │                                  │       │
│        │    │   │          ↓                                  │       │
│        │    │   └──────── processing ←────────────────────────┘       │
│        │    │                                                  │       │
│        │    └──────────────────────────────────────────────────┘       │
│        │                                                              │
│        │                       ┌───────┐                             │
│        └───────────────────────│ error │←────── anyError()           │
│                                └───────┘                             │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Widget Configuration Extension

The existing widget config should be extended to support voice mode:

```typescript
interface WidgetConfig {
  // ... existing config ...
  
  /** Voice mode configuration */
  voiceMode?: {
    /** Enable voice mode feature */
    enabled: boolean;
    
    /** ElevenLabs voice ID (required if enabled) */
    voiceId: string;
    
    /** Language code */
    languageCode?: string;  // default: 'pt'
    
    /** Silence threshold for end-of-speech */
    silenceThreshold?: number;  // default: 1.5
    
    /** Enable barge-in capability */
    enableBargeIn?: boolean;  // default: true
    
    /** Auto-listen after agent response */
    autoListen?: boolean;  // default: true
    
    /** Custom UI text */
    texts?: {
      title?: string;         // default: 'Fully voice mode'
      listening?: string;     // default: "I'm listening, how can I help you?"
      microphoneHint?: string; // default: 'The microphone is on...'
    };
  };
}
```

---

## Context Extension

The ChatContext should be extended with voice-related state:

```typescript
interface ChatContextValue {
  // ... existing context ...
  
  /** Voice session state */
  voiceSession: VoiceSession | null;
  
  /** Is voice mode currently active */
  isVoiceModeActive: boolean;
  
  /** Voice mode actions */
  enterVoiceMode: () => Promise<void>;
  exitVoiceMode: () => void;
  
  /** Is voice mode supported in this browser */
  isVoiceModeSupported: boolean;
}
```

---

## Storage

### Persisted Data
- **None additional**: Voice messages are stored as regular text messages
- Existing message persistence handles all storage needs

### Session/Memory Data
- `VoiceSession`: In-memory only, destroyed on exit
- `AudioQueue`: In-memory only, destroyed on exit
- `WebSocket connection`: Closed on exit

### Configuration
- `VoiceConfiguration`: Read from widget config at runtime
- `voiceId`: Must be provided in config (no default)
- `ElevenLabs API key`: Stored securely on backend only

---

## Validation Rules

### VoiceConfiguration
- `voiceId`: Required, non-empty string
- `languageCode`: Valid ISO 639-1 or ISO 639-3 code
- `silenceThreshold`: Number between 0.3 and 3.0
- `vadThreshold`: Number between 0.1 and 0.9
- `latencyOptimization`: Integer between 0 and 4

### Message (for voice input)
- Committed transcript must be non-empty
- Empty transcripts should not create messages
- Transcripts should be trimmed before sending

---

## Events

Voice mode emits events through the existing service event system:

```typescript
// New events for voice mode
type VoiceModeEvents = {
  'voice:session:started': { sessionId: string };
  'voice:session:ended': { sessionId: string; duration: number };
  'voice:state:changed': { state: VoiceSessionState; previousState: VoiceSessionState };
  'voice:listening:started': void;
  'voice:listening:stopped': void;
  'voice:transcript:partial': { text: string };
  'voice:transcript:committed': { text: string };
  'voice:speaking:started': { text: string };
  'voice:speaking:stopped': void;
  'voice:error': VoiceError;
  'voice:barge-in': void;
};
```
