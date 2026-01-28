import React from 'react';
import ReactDOM from 'react-dom/client';

import Widget from './components/Widget/Widget';
import './styles/index.scss';
import './i18n';

/**
 * Mock token endpoint for testing voice mode
 * In production, this should be a real backend endpoint that generates ElevenLabs tokens
 *
 * IMPORTANT: Replace this with your actual token endpoint!
 * The endpoint should return a single-use token from ElevenLabs API
 *
 * Example backend endpoint (Node.js/Express):
 * ```
 * app.get('/api/voice/token', async (req, res) => {
 *   const response = await fetch('https://api.elevenlabs.io/v1/...', {
 *     headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
 *   });
 *   const data = await response.json();
 *   res.json({ token: data.token });
 * });
 * ```
 */
// ElevenLabs API Key - In production, this should be stored securely on the backend
const ELEVENLABS_API_KEY = 'sk_99a99050632ab1143d045a2c2e52a6b1a57d3c4657a7320d'; // Replace with your key for testing

/**
 * Get single-use token for STT (Speech-to-Text)
 * In production, this should be done on your backend to protect your API key
 */
const getVoiceToken = async () => {
  if (ELEVENLABS_API_KEY === 'YOUR_ELEVENLABS_API_KEY_HERE') {
    console.warn('⚠️ Voice Mode: Please set your ElevenLabs API key in src/index.jsx');
    throw new Error('ElevenLabs API key not configured');
  }

  // Get a single-use token from ElevenLabs API
  const response = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Voice] Token fetch failed:', response.status, errorText);
    throw new Error(`Failed to get voice token: ${response.status}`);
  }

  const data = await response.json();
  return data.token;
};

/**
 * Get API key for TTS (Text-to-Speech)
 * In production, this should be done via a backend proxy endpoint
 * WARNING: Do not expose API keys in production frontend code!
 */
const getApiKey = () => {
  if (ELEVENLABS_API_KEY === 'YOUR_ELEVENLABS_API_KEY_HERE') {
    throw new Error('ElevenLabs API key not configured');
  }
  return ELEVENLABS_API_KEY;
};

const config = {
  // socketUrl: 'wss://websocket.weni.ai',
  // channelUuid: 'your-channel-uuid-here', // Replace with your actual channel UUID
  socketUrl: 'https://websocket.weni.ai',
  channelUuid: 'a9687ddd-849c-44e2-8f81-da9a07de21b8', // Replace with your actual channel UUID
  host: 'https://flows.weni.ai',

  // Optional configurations
  connectOn: 'mount', // or 'manual'
  storage: 'session', // 'local' or 'session'

  // TODO: Add more config options as they become available
  startFullScreen: false,
  showFullScreenButton: true,

  // Voice Mode Configuration
  voiceMode: {
    enabled: true,
    // ElevenLabs voice ID - Use a Brazilian Portuguese female voice
    // You can find voice IDs at: https://elevenlabs.io/app/voice-library
    // Recommended: Search for "Brazilian Portuguese" or "Portuguese" female voices
    voiceId: 'pFZP5JQG7iQjIQuC4Bku', // "Lily" - multilingual voice (replace with your preferred voice)
    languageCode: 'pt', // Portuguese
    silenceThreshold: 1.5, // seconds of silence before auto-send
    enableBargeIn: true, // Allow user to interrupt agent
    autoListen: true, // Auto-listen after agent finishes speaking
    getToken: getVoiceToken, // For STT (single-use token)
    getApiKey: getApiKey, // For TTS (API key)
    texts: {
      title: 'Modo de voz',
      listening: 'Estou ouvindo, como posso ajudar?',
      microphoneHint: 'O microfone está ligado, você pode falar quando quiser.',
      speaking: 'Falando...',
      processing: 'Processando...',
      errorTitle: 'Algo deu errado',
    },
  },
};

// Custom theme (optional)
const customTheme = {
  colors: {
    primary: '#0084FF',
    messageClient: '#0084FF',
  },
  // Override other theme properties as needed
};

function App() {
  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '20px',
          maxWidth: '600px',
        }}
      >
        <h1>Weni Webchat - React</h1>
        <p>Chat widget should appear in the bottom-right corner</p>

        <div
          style={{
            background: '#e8f5e9',
            padding: '16px',
            borderRadius: '8px',
            marginTop: '20px',
            textAlign: 'left',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: '#2e7d32' }}>
            🎤 Modo de Voz Ativado
          </h3>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
            Para testar o modo de voz:
          </p>
          <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
            <li>Configure sua API key da ElevenLabs em <code>src/index.jsx</code></li>
            <li>Abra o chat clicando no botão no canto inferior direito</li>
            <li>Clique no ícone de ondas sonoras (🎤) ao lado do microfone</li>
            <li>Permita o acesso ao microfone quando solicitado</li>
            <li>Fale naturalmente - a mensagem será enviada automaticamente</li>
          </ol>
        </div>

        <p style={{ color: '#666', fontSize: '14px', marginTop: '16px' }}>
          Note: Configure your channel UUID and ElevenLabs API key in src/index.jsx
        </p>
      </div>

      {/* The Widget component */}
      <Widget
        config={config}
        theme={customTheme}
      />
    </div>
  );
}

// Mount the app
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
