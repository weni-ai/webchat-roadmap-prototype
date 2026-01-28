# Research: Full Voice Mode

**Feature**: 002-full-voice-mode  
**Date**: 2026-01-28

## Summary

This document consolidates research findings for implementing full voice mode in the Weni Webchat. The feature requires real-time speech-to-text (STT) and text-to-speech (TTS) capabilities with ultra-low latency requirements.

---

## Decision 1: Speech-to-Text Provider and Approach

**Decision**: Use ElevenLabs Scribe v2 Realtime via WebSocket for speech-to-text

**Rationale**:
- Ultra-low latency (~150ms) for real-time transcription
- Built-in Voice Activity Detection (VAD) with configurable silence threshold
- Supports Brazilian Portuguese (ISO 639-1: `pt` or ISO 639-3: `por`)
- WebSocket API enables streaming audio chunks from browser microphone
- Provides both partial transcripts (interim) and committed transcripts (final)
- Auto-commit strategy based on silence detection (`commit_strategy: vad`)

**Alternatives Considered**:
1. **Web Speech API (browser native)**: Free but inconsistent accuracy across browsers, limited language support, no streaming control
2. **Google Cloud Speech-to-Text**: Good accuracy but higher latency, requires server-side proxy, more complex pricing
3. **OpenAI Whisper API**: High accuracy but batch-only (no real-time streaming), not suitable for voice conversations

**API Details**:
- **Endpoint**: `wss://api.elevenlabs.io/v1/speech-to-text/realtime`
- **Model**: `scribe_v2_realtime`
- **Audio Format**: `pcm_16000` (16-bit PCM at 16kHz)
- **Authentication**: Single-use token for client-side (generated via backend)
- **Key Parameters**:
  - `language_code`: `pt` (Portuguese)
  - `commit_strategy`: `vad` (Voice Activity Detection)
  - `vad_silence_threshold_secs`: `1.5` (configurable)
  - `vad_threshold`: `0.4`

---

## Decision 2: Text-to-Speech Provider and Approach

**Decision**: Use ElevenLabs TTS Streaming API for text-to-speech

**Rationale**:
- Ultra-low latency streaming (starts playback within ~75ms with Flash v2.5 model)
- High-quality, natural-sounding voices
- Native support for Brazilian Portuguese
- Chunked transfer encoding allows progressive audio playback
- Supports latency optimization settings
- Large voice library with female voices available

**Alternatives Considered**:
1. **Web Speech API (SpeechSynthesis)**: Free but robotic quality, inconsistent across browsers
2. **Google Cloud TTS**: Good quality but higher latency for streaming, more complex setup
3. **Amazon Polly**: Good quality but not as natural as ElevenLabs, requires AWS infrastructure

**API Details**:
- **Endpoint**: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream`
- **Model**: `eleven_flash_v2_5` (lowest latency) or `eleven_multilingual_v2` (highest quality)
- **Output Format**: `mp3_44100_128` or `pcm_24000` for lower latency
- **Key Parameters**:
  - `optimize_streaming_latency`: `3` (max latency optimization) or `4` (max with text normalizer off)
  - `language_code`: `pt-BR`
  - `model_id`: `eleven_flash_v2_5`

---

## Decision 3: Voice Selection for TTS

**Decision**: Use a female voice from ElevenLabs voice library that supports Brazilian Portuguese

**Rationale**:
- User requirement specifies female voice in Brazilian Portuguese
- ElevenLabs provides voices with verified language support
- Can search for voices with `language: pt` and `gender: female` labels

**Implementation**:
- Query ElevenLabs API: `GET /v2/voices?search=portuguese&category=premade`
- Filter for female voices with `verified_languages` including Portuguese
- Store selected `voice_id` in configuration
- **Fallback**: Use ElevenLabs multilingual model which adapts to any language

**Recommended Voices** (to be confirmed via API):
- Look for voices with Brazilian accent
- Prefer voices with `verified_languages` containing `pt` or `pt-BR`

---

## Decision 4: Audio Handling in Browser

**Decision**: Use Web Audio API for microphone capture and audio playback

**Rationale**:
- Native browser API with good support
- Enables real-time audio processing and streaming
- MediaRecorder API for encoding audio chunks
- AudioContext for seamless playback of streaming audio

**Implementation Details**:

### Microphone Capture
```javascript
// Get microphone stream
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

// Or use AudioWorklet for PCM encoding (required for ElevenLabs)
const audioContext = new AudioContext({ sampleRate: 16000 });
const source = audioContext.createMediaStreamSource(stream);
// Process with AudioWorkletNode for 16-bit PCM
```

### Audio Playback (Streaming)
```javascript
const audioContext = new AudioContext();
const audioQueue = [];

async function playAudioChunk(audioData) {
  const audioBuffer = await audioContext.decodeAudioData(audioData);
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
}
```

---

## Decision 5: Backend Token Service

**Decision**: Create a lightweight backend endpoint to generate ElevenLabs single-use tokens

**Rationale**:
- ElevenLabs API keys should not be exposed to the client
- Single-use tokens expire after 15 minutes, reducing security risk
- Token endpoint can enforce rate limiting and authentication

**Implementation**:
- **Endpoint**: `POST /api/voice/token`
- **Response**: `{ token: string, expires_at: number }`
- Uses ElevenLabs Token API: `POST /v1/tokens/single-use`

**Note**: This may require changes to the `@weni/webchat-service` package or a separate voice service.

---

## Decision 6: State Machine for Voice Mode

**Decision**: Implement voice mode as a finite state machine

**States**:
1. `idle` - Voice mode not active
2. `listening` - Microphone active, waiting for user speech
3. `processing` - Speech detected, transcribing
4. `sending` - Message transcribed, sending to agent
5. `receiving` - Waiting for agent response
6. `speaking` - Playing agent response audio
7. `error` - Error state (network, permission, etc.)

**Transitions**:
```
idle → listening (user enters voice mode)
listening → processing (voice activity detected)
processing → sending (silence detected, transcript committed)
sending → receiving (message sent)
receiving → speaking (agent response starts streaming)
speaking → listening (agent finished speaking)
speaking → processing (user interrupts - barge-in)
any → error (error occurs)
error → listening (retry)
any → idle (user exits voice mode)
```

---

## Decision 7: Barge-in (Interrupt) Implementation

**Decision**: Use VAD on user microphone even while TTS is playing

**Rationale**:
- Natural conversations require ability to interrupt
- Spec requires stopping agent audio within 200ms of voice activity

**Implementation**:
1. Keep microphone stream active during TTS playback
2. Run lightweight VAD (can use ElevenLabs WebSocket VAD or client-side)
3. On voice activity detected:
   - Immediately stop TTS audio playback
   - Cancel any pending TTS requests
   - Transition to `processing` state

---

## Decision 8: Streaming TTS During Agent Response

**Decision**: Process agent text chunks incrementally for TTS

**Rationale**:
- Agent responses come via streaming (SSE/WebSocket)
- Must not wait for complete response before speaking
- Need to balance chunk size vs. natural speech

**Implementation**:
1. Buffer incoming text until sentence boundary or minimum chunk size
2. Send each chunk to ElevenLabs TTS streaming API
3. Queue audio chunks for seamless playback
4. Use `previous_text` parameter to maintain prosody continuity

**Chunk Strategy**:
- Minimum: 50 characters or sentence boundary
- Send on: `.`, `!`, `?`, `,`, or 100+ characters
- Use `previous_text` to provide context for continuity

---

## Decision 9: Message Persistence

**Decision**: Voice messages are stored as regular text messages

**Rationale**:
- Spec requires messages to be readable in text mode after voice session
- No special handling needed - transcribed text becomes the message
- Existing message infrastructure handles persistence

**Implementation**:
- On committed transcript → call existing `sendMessage(text)` 
- Agent responses already stored as text messages
- No separate "voice message" entity needed in storage

---

## Decision 10: Error Handling and Fallbacks

**Decision**: Graceful degradation with clear user feedback

**Scenarios and Handling**:

| Scenario | Handling |
|----------|----------|
| Microphone permission denied | Show error, return to text mode |
| STT service unavailable | Fallback to text mode with notification |
| TTS service unavailable | Show text response, notify user |
| Network disconnect | Attempt reconnection, fallback to text |
| Browser unsupported | Hide voice mode button entirely |
| Excessive background noise | Show "speak more clearly" prompt |
| Transcription failed | Remain in listening mode, show error |

---

## Technical Constraints

1. **HTTPS Required**: Microphone access requires secure context
2. **Browser Support**: Chrome 66+, Firefox 60+, Safari 14.1+, Edge 79+
3. **Mobile Considerations**: May need touch-to-speak on some mobile browsers
4. **Audio Codec**: ElevenLabs STT requires PCM 16-bit at 16kHz
5. **Rate Limits**: ElevenLabs has concurrent request limits per tier

---

## Dependencies

### New NPM Packages (to evaluate)
- None strictly required; can use native Web APIs
- Optional: `@elevenlabs/elevenlabs-js` for SDK utilities

### Backend Requirements
- Token generation endpoint for ElevenLabs authentication
- ElevenLabs API key stored securely on backend

### Browser APIs Used
- `navigator.mediaDevices.getUserMedia()` - Microphone access
- `AudioContext` / `AudioWorklet` - Audio processing
- `WebSocket` - STT streaming
- `fetch` with streaming - TTS streaming

---

## Performance Targets

| Metric | Target | ElevenLabs Capability |
|--------|--------|----------------------|
| STT latency (speech end to transcript) | <500ms | ~150ms |
| TTS latency (text to audio start) | <150ms | ~75ms (Flash v2.5) |
| Barge-in response time | <200ms | Client-side |
| Audio gap tolerance | <50ms | Depends on implementation |

---

## Security Considerations

1. **API Key Protection**: Never expose ElevenLabs API key to client
2. **Token Expiry**: Single-use tokens expire in 15 minutes
3. **Rate Limiting**: Implement backend rate limiting for token endpoint
4. **Audio Privacy**: Audio is processed by ElevenLabs (check compliance requirements)
5. **Zero Retention**: Can enable `enable_logging: false` for enterprise compliance

---

## References

- [ElevenLabs STT Realtime API](https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime)
- [ElevenLabs TTS Streaming API](https://elevenlabs.io/docs/api-reference/text-to-speech/stream)
- [ElevenLabs Voices API](https://elevenlabs.io/docs/api-reference/voices/search)
- [ElevenLabs Token API](https://elevenlabs.io/docs/api-reference/tokens/create)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
