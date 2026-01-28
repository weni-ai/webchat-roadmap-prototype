# Voice Service API Contract

**Feature**: 002-full-voice-mode  
**Date**: 2026-01-28  
**Version**: 1.0.0

## Overview

This contract defines the interfaces for the Voice Service that integrates speech-to-text (STT) and text-to-speech (TTS) functionality with ElevenLabs APIs.

---

## Service Interface

### VoiceService

The main service class that manages voice mode functionality.

```typescript
interface IVoiceService {
  /**
   * Initialize the voice service with configuration
   * @param config Voice configuration options
   * @returns Promise that resolves when ready
   */
  init(config: VoiceConfiguration): Promise<void>;
  
  /**
   * Check if voice mode is supported in current browser
   * @returns true if all required APIs are available
   */
  isSupported(): boolean;
  
  /**
   * Start voice mode session
   * @returns Promise that resolves with session info
   * @throws VoiceError if initialization fails
   */
  startSession(): Promise<VoiceSession>;
  
  /**
   * End current voice mode session
   * @param sessionId Session to end
   */
  endSession(sessionId: string): void;
  
  /**
   * Get current session state
   * @returns Current VoiceSession or null
   */
  getSession(): VoiceSession | null;
  
  /**
   * Start listening for speech input
   * Requires an active session
   */
  startListening(): void;
  
  /**
   * Stop listening (pause microphone)
   */
  stopListening(): void;
  
  /**
   * Convert text to speech and play
   * @param text Text to speak
   * @param options Optional TTS options
   * @returns Promise that resolves when audio completes
   */
  speak(text: string, options?: TTSOptions): Promise<void>;
  
  /**
   * Stop current TTS playback
   */
  stopSpeaking(): void;
  
  /**
   * Request microphone permission
   * @returns true if permission granted
   */
  requestMicrophonePermission(): Promise<boolean>;
  
  /**
   * Check if microphone permission is granted
   * @returns Permission state
   */
  hasMicrophonePermission(): Promise<PermissionState>;
  
  /**
   * Subscribe to voice events
   * @param event Event name
   * @param handler Event handler
   */
  on<K extends keyof VoiceEvents>(
    event: K,
    handler: (data: VoiceEvents[K]) => void
  ): void;
  
  /**
   * Unsubscribe from voice events
   */
  off<K extends keyof VoiceEvents>(
    event: K,
    handler: (data: VoiceEvents[K]) => void
  ): void;
  
  /**
   * Cleanup and release resources
   */
  destroy(): void;
}
```

---

## Types

### VoiceConfiguration

```typescript
interface VoiceConfiguration {
  /** ElevenLabs voice ID for TTS (required) */
  voiceId: string;
  
  /** Language code (ISO 639-1 or 639-3) */
  languageCode?: string; // default: 'pt'
  
  /** TTS model */
  ttsModel?: 'eleven_flash_v2_5' | 'eleven_multilingual_v2';
  
  /** Silence threshold in seconds */
  silenceThreshold?: number; // default: 1.5, range: 0.3-3.0
  
  /** VAD threshold */
  vadThreshold?: number; // default: 0.4, range: 0.1-0.9
  
  /** Enable barge-in */
  enableBargeIn?: boolean; // default: true
  
  /** Auto-listen after speaking */
  autoListen?: boolean; // default: true
  
  /** Token provider function (for secure auth) */
  getToken?: () => Promise<string>;
}
```

### VoiceSession

```typescript
interface VoiceSession {
  id: string;
  state: VoiceSessionState;
  startedAt: number;
  config: Required<VoiceConfiguration>;
  partialTranscript: string;
  isPlaying: boolean;
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

### VoiceError

```typescript
interface VoiceError {
  code: VoiceErrorCode;
  message: string;
  recoverable: boolean;
  suggestion: string;
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

### VoiceEvents

```typescript
interface VoiceEvents {
  'session:started': { sessionId: string };
  'session:ended': { sessionId: string; duration: number };
  'state:changed': { state: VoiceSessionState; previousState: VoiceSessionState };
  'listening:started': void;
  'listening:stopped': void;
  'transcript:partial': { text: string };
  'transcript:committed': { text: string };
  'speaking:started': { text: string };
  'speaking:ended': void;
  'speaking:progress': { text: string; progress: number };
  'barge-in': void;
  'error': VoiceError;
}
```

### TTSOptions

```typescript
interface TTSOptions {
  /** Override voice ID for this request */
  voiceId?: string;
  
  /** Stream mode - play as audio arrives */
  stream?: boolean; // default: true
  
  /** Previous text for prosody continuity */
  previousText?: string;
  
  /** Latency optimization level */
  latencyOptimization?: number; // 0-4, default: 3
}
```

---

## React Hook Contract

### useVoiceMode

```typescript
interface UseVoiceModeReturn {
  /** Is voice mode currently active */
  isActive: boolean;
  
  /** Current session state */
  state: VoiceSessionState;
  
  /** Is voice mode supported in browser */
  isSupported: boolean;
  
  /** Current partial transcript (while speaking) */
  partialTranscript: string;
  
  /** Is TTS currently playing */
  isSpeaking: boolean;
  
  /** Is microphone active/listening */
  isListening: boolean;
  
  /** Current error if any */
  error: VoiceError | null;
  
  /** Enter voice mode */
  enter: () => Promise<void>;
  
  /** Exit voice mode */
  exit: () => void;
  
  /** Clear current error */
  clearError: () => void;
}

function useVoiceMode(): UseVoiceModeReturn;
```

---

## Component Contracts

### VoiceModeOverlay

Full-screen overlay component for voice mode UI.

```typescript
interface VoiceModeOverlayProps {
  /** Is the overlay visible */
  isOpen: boolean;
  
  /** Current voice state */
  state: VoiceSessionState;
  
  /** Partial transcript to display */
  partialTranscript?: string;
  
  /** Error to display */
  error?: VoiceError;
  
  /** Close handler */
  onClose: () => void;
  
  /** Retry handler for errors */
  onRetry?: () => void;
  
  /** Custom texts */
  texts?: {
    title?: string;
    listening?: string;
    speaking?: string;
    processing?: string;
    microphoneHint?: string;
    errorTitle?: string;
  };
}
```

### WaveformVisualizer

Audio waveform animation component.

```typescript
interface WaveformVisualizerProps {
  /** Animation state */
  state: 'idle' | 'listening' | 'speaking' | 'processing';
  
  /** Optional audio analyser for real waveform */
  analyser?: AnalyserNode;
  
  /** Number of bars to display */
  barCount?: number; // default: 5
  
  /** Custom class name */
  className?: string;
}
```

---

## Integration Contract

### ChatContext Extension

```typescript
// Added to existing ChatContext
interface ChatContextVoiceExtension {
  /** Voice service instance */
  voiceService: IVoiceService | null;
  
  /** Is voice mode active */
  isVoiceModeActive: boolean;
  
  /** Voice mode state */
  voiceModeState: VoiceSessionState | null;
  
  /** Enter voice mode */
  enterVoiceMode: () => Promise<void>;
  
  /** Exit voice mode */
  exitVoiceMode: () => void;
  
  /** Is voice mode supported */
  isVoiceModeSupported: boolean;
}
```

### Message Integration

When voice transcript is committed:

```typescript
// Voice service calls existing sendMessage
voiceService.on('transcript:committed', ({ text }) => {
  if (text.trim()) {
    chatContext.sendMessage(text);
  }
});

// When agent responds with streaming text
chatContext.service.on('message:chunk', ({ text, isComplete }) => {
  if (isVoiceModeActive && text) {
    voiceService.speak(text, { stream: true });
  }
});
```

---

## Test Contracts

### Unit Test Requirements

```typescript
describe('VoiceService', () => {
  describe('isSupported()', () => {
    it('should return true when all APIs available');
    it('should return false when MediaDevices unavailable');
    it('should return false when AudioContext unavailable');
    it('should return false when WebSocket unavailable');
  });
  
  describe('startSession()', () => {
    it('should initialize microphone stream');
    it('should connect to STT WebSocket');
    it('should emit session:started event');
    it('should throw if microphone permission denied');
    it('should throw if WebSocket connection fails');
  });
  
  describe('speak()', () => {
    it('should stream audio from TTS API');
    it('should queue multiple speak calls');
    it('should emit speaking:started event');
    it('should emit speaking:ended when complete');
    it('should handle TTS API errors gracefully');
  });
  
  describe('barge-in', () => {
    it('should stop audio playback on voice activity');
    it('should emit barge-in event');
    it('should transition to processing state');
    it('should work within 200ms of voice detection');
  });
});

describe('useVoiceMode', () => {
  it('should initialize with isSupported check');
  it('should update state on voice service events');
  it('should handle errors gracefully');
  it('should cleanup on unmount');
});

describe('VoiceModeOverlay', () => {
  it('should render listening state UI');
  it('should render speaking state UI');
  it('should render error state UI');
  it('should animate waveform based on state');
  it('should call onClose when X clicked');
});
```

### Integration Test Requirements

```typescript
describe('Voice Mode Integration', () => {
  it('should enter voice mode from chat interface');
  it('should transcribe speech and send as message');
  it('should speak agent response in real-time');
  it('should handle multi-turn conversation');
  it('should exit voice mode and show message history');
  it('should handle network disconnection gracefully');
});
```

---

## Error Codes Reference

| Code | Description | Recoverable | Suggestion |
|------|-------------|-------------|------------|
| `MICROPHONE_PERMISSION_DENIED` | User denied mic access | Yes | "Please allow microphone access" |
| `MICROPHONE_NOT_FOUND` | No microphone detected | No | "Connect a microphone" |
| `BROWSER_NOT_SUPPORTED` | Missing required APIs | No | "Use a supported browser" |
| `STT_CONNECTION_FAILED` | WebSocket connect failed | Yes | "Check connection and retry" |
| `STT_TRANSCRIPTION_FAILED` | Transcription error | Yes | "Please try again" |
| `TTS_GENERATION_FAILED` | TTS API error | Yes | "Speech unavailable, see text" |
| `NETWORK_ERROR` | Network disconnected | Yes | "Check connection" |
| `TOKEN_EXPIRED` | Auth token expired | Yes | "Reconnecting..." |
| `RATE_LIMITED` | API rate limit hit | Yes | "Please wait a moment" |
| `UNKNOWN_ERROR` | Unexpected error | Yes | "Please try again" |
