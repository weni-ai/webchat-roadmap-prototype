# Quickstart: Full Voice Mode

**Feature**: 002-full-voice-mode  
**Date**: 2026-01-28

## Overview

This guide provides quick integration scenarios for the Full Voice Mode feature in the Weni Webchat.

---

## Prerequisites

1. **ElevenLabs Account**: API key with access to STT and TTS
2. **Backend Token Service**: Endpoint to generate single-use tokens
3. **HTTPS**: Voice mode requires secure context for microphone access
4. **Supported Browser**: Chrome 66+, Firefox 60+, Safari 14.1+, Edge 79+

---

## Basic Integration

### 1. Enable Voice Mode in Widget Config

```jsx
import { Widget } from '@weni/webchat-template-react';

const config = {
  socketUrl: 'wss://websocket.weni.ai',
  channelUuid: 'your-channel-uuid',
  host: 'https://flows.weni.ai',
  
  // Enable voice mode
  voiceMode: {
    enabled: true,
    voiceId: 'your-elevenlabs-voice-id', // Required
    languageCode: 'pt',                   // Brazilian Portuguese
  },
};

function App() {
  return <Widget config={config} />;
}
```

### 2. Provide Token Generator (Secure)

```jsx
const config = {
  // ... other config
  voiceMode: {
    enabled: true,
    voiceId: 'your-elevenlabs-voice-id',
    
    // Token generator function called when voice mode starts
    getToken: async () => {
      const response = await fetch('/api/voice/token', {
        method: 'POST',
        credentials: 'include',
      });
      const { token } = await response.json();
      return token;
    },
  },
};
```

---

## Backend Token Endpoint

Create an endpoint to generate ElevenLabs single-use tokens:

```javascript
// Example: Express.js backend
const express = require('express');
const fetch = require('node-fetch');

const app = express();
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

app.post('/api/voice/token', async (req, res) => {
  try {
    const response = await fetch(
      'https://api.elevenlabs.io/v1/tokens/single-use',
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Token valid for 15 minutes
          allowed_operations: ['speech-to-text', 'text-to-speech'],
        }),
      }
    );
    
    const data = await response.json();
    res.json({ token: data.token, expires_at: data.expires_at });
  } catch (error) {
    console.error('Token generation failed:', error);
    res.status(500).json({ error: 'Token generation failed' });
  }
});
```

---

## Configuration Options

### Full Configuration Example

```jsx
const voiceModeConfig = {
  // Required
  enabled: true,
  voiceId: 'your-elevenlabs-voice-id',
  
  // Language (default: 'pt' for Portuguese)
  languageCode: 'pt',
  
  // End-of-speech detection (default: 1.5 seconds)
  silenceThreshold: 1.5,
  
  // Allow interrupting agent response (default: true)
  enableBargeIn: true,
  
  // Auto-listen after agent speaks (default: true)
  autoListen: true,
  
  // Token provider (required for production)
  getToken: async () => { /* ... */ },
  
  // Custom UI text (optional)
  texts: {
    title: 'Modo de Voz',
    listening: 'Estou ouvindo, como posso ajudar?',
    microphoneHint: 'O microfone está ativado, fale quando quiser.',
    speaking: 'Aguarde enquanto respondo...',
    processing: 'Processando...',
    errorTitle: 'Ops! Algo deu errado',
  },
};
```

---

## Finding a Voice ID

### Using ElevenLabs Voice Library

1. Go to [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
2. Filter by Language: Portuguese
3. Filter by Gender: Female
4. Listen to samples and select a voice
5. Copy the Voice ID from the voice details

### Programmatic Voice Selection

```javascript
// Search for Portuguese female voices
const response = await fetch(
  'https://api.elevenlabs.io/v2/voices?search=portuguese&page_size=10',
  {
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
  }
);
const { voices } = await response.json();

// Filter for female voices with Portuguese support
const portugueseVoices = voices.filter(voice => 
  voice.labels?.gender === 'female' &&
  voice.verified_languages?.some(lang => 
    lang.language.startsWith('pt') || lang.locale === 'pt-BR'
  )
);

console.log('Available voices:', portugueseVoices);
```

---

## Usage Scenarios

### Scenario 1: Simple Voice Chat

User enters voice mode, speaks, and receives spoken responses.

```
1. User clicks voice mode button
2. UI transitions to full-screen voice overlay
3. User speaks: "Olá, qual é o horário de funcionamento?"
4. System transcribes and sends message
5. Agent response streams in
6. TTS speaks response in real-time
7. System returns to listening mode
8. Repeat...
```

### Scenario 2: Interrupting Agent

User interrupts while agent is speaking.

```
1. Agent is speaking a long response
2. User starts speaking (barge-in)
3. Agent audio stops immediately (<200ms)
4. User's new message is captured
5. New response cycle begins
```

### Scenario 3: Exit Voice Mode

User exits and continues in text mode.

```
1. User clicks X button
2. Voice mode overlay closes
3. All voice messages visible as text
4. User continues typing normally
```

---

## Event Handling

### Listen to Voice Events

```jsx
import { useChatContext } from '@/contexts/ChatContext';
import { useEffect } from 'react';

function VoiceEventLogger() {
  const { voiceService } = useChatContext();
  
  useEffect(() => {
    if (!voiceService) return;
    
    const handleTranscript = ({ text }) => {
      console.log('User said:', text);
    };
    
    const handleSpeaking = ({ text }) => {
      console.log('Agent speaking:', text);
    };
    
    const handleError = (error) => {
      console.error('Voice error:', error.code, error.message);
    };
    
    voiceService.on('transcript:committed', handleTranscript);
    voiceService.on('speaking:started', handleSpeaking);
    voiceService.on('error', handleError);
    
    return () => {
      voiceService.off('transcript:committed', handleTranscript);
      voiceService.off('speaking:started', handleSpeaking);
      voiceService.off('error', handleError);
    };
  }, [voiceService]);
  
  return null;
}
```

---

## Error Handling

### Display User-Friendly Errors

```jsx
function VoiceModeError({ error, onRetry, onDismiss }) {
  if (!error) return null;
  
  const messages = {
    MICROPHONE_PERMISSION_DENIED: {
      title: 'Microfone bloqueado',
      body: 'Permita o acesso ao microfone nas configurações do navegador.',
    },
    MICROPHONE_NOT_FOUND: {
      title: 'Microfone não encontrado',
      body: 'Conecte um microfone e tente novamente.',
    },
    BROWSER_NOT_SUPPORTED: {
      title: 'Navegador não suportado',
      body: 'Use Chrome, Firefox, Safari ou Edge.',
    },
    NETWORK_ERROR: {
      title: 'Sem conexão',
      body: 'Verifique sua conexão com a internet.',
    },
    // ... other error codes
  };
  
  const { title, body } = messages[error.code] || {
    title: 'Erro',
    body: error.message,
  };
  
  return (
    <div className="voice-error">
      <h3>{title}</h3>
      <p>{body}</p>
      {error.recoverable && (
        <button onClick={onRetry}>Tentar novamente</button>
      )}
      <button onClick={onDismiss}>Fechar</button>
    </div>
  );
}
```

---

## Testing Voice Mode

### Manual Testing Checklist

- [ ] Voice mode button visible in chat interface
- [ ] Clicking button shows microphone permission prompt
- [ ] Granting permission shows full-screen voice overlay
- [ ] Waveform animation indicates listening state
- [ ] Speaking creates partial transcript feedback
- [ ] Pausing commits transcript and sends message
- [ ] Agent response is spoken aloud
- [ ] Barge-in stops agent audio
- [ ] X button exits voice mode
- [ ] Messages visible in text chat after exit
- [ ] Denying permission shows appropriate error
- [ ] Network disconnect shows error and fallback

### Browser Compatibility Testing

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 120+ | ✓ Primary |
| Firefox | 120+ | ✓ Supported |
| Safari | 17+ | ✓ Supported |
| Edge | 120+ | ✓ Supported |
| Mobile Chrome | Latest | ✓ Supported |
| Mobile Safari | Latest | ⚠️ May need tap-to-speak |

---

## Troubleshooting

### Microphone Not Working

1. Check browser permissions (lock icon in address bar)
2. Ensure HTTPS is enabled
3. Try a different browser
4. Check if another app is using the microphone

### No Audio Output

1. Check device volume
2. Verify voiceId is correct
3. Check browser console for TTS errors
4. Ensure token is valid

### High Latency

1. Check network connection speed
2. Try latencyOptimization: 4 (max optimization)
3. Use eleven_flash_v2_5 model
4. Reduce silenceThreshold for faster send

### Transcription Inaccurate

1. Reduce background noise
2. Speak more clearly
3. Verify languageCode matches spoken language
4. Check microphone quality/placement
