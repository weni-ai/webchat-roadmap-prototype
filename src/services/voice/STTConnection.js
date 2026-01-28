/**
 * STTConnection - WebSocket connection to ElevenLabs Speech-to-Text API
 *
 * Handles real-time audio streaming to ElevenLabs Scribe v2 Realtime
 * and receives transcription results.
 */

import { buildSTTWebSocketURL } from './config';
import { VoiceError, VoiceErrorCode, getWebSocketErrorCode } from './errors';

/**
 * STTConnection class for ElevenLabs real-time STT
 * @fires STTConnection#session - When session starts
 * @fires STTConnection#partial - When partial transcript received
 * @fires STTConnection#committed - When final transcript received
 * @fires STTConnection#error - When an error occurs
 * @fires STTConnection#close - When connection closes
 */
export class STTConnection {
  /**
   * @param {Object} config - Voice configuration
   * @param {string} token - Authentication token
   */
  constructor(config, token) {
    /** @type {Object} */
    this.config = config;

    /** @type {string} */
    this.token = token;

    /** @type {WebSocket|null} */
    this.ws = null;

    /** @type {boolean} */
    this.connected = false;

    /** @type {string|null} */
    this.sessionId = null;

    /** @type {Map<string, Function[]>} */
    this.listeners = new Map();
  }

  /**
   * Connect to ElevenLabs STT WebSocket
   * @returns {Promise<void>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        const url = buildSTTWebSocketURL(this.config, this.token);
        this.ws = new WebSocket(url);

        const timeout = setTimeout(() => {
          if (!this.connected) {
            this.ws?.close();
            reject(new VoiceError(VoiceErrorCode.STT_CONNECTION_FAILED, 'Connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          // WebSocket connected
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);

            // Resolve on session start
            if (message.message_type === 'session_started') {
              clearTimeout(timeout);
              this.connected = true;
              resolve();
            }
          } catch (error) {
            console.error('[STT] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (event) => {
          console.error('[STT] Connection error:', event);
          clearTimeout(timeout);
          const error = new VoiceError(
            getWebSocketErrorCode(event),
            'WebSocket connection error'
          );
          this.emit('error', error);
          if (!this.connected) {
            reject(error);
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          this.connected = false;
          this.emit('close', { code: event.code, reason: event.reason });

          if (!this.connected && event.code !== 1000) {
            reject(new VoiceError(
              VoiceErrorCode.STT_CONNECTION_FAILED,
              `Connection closed: ${event.reason || 'Unknown reason'} (code: ${event.code})`
            ));
          }
        };

      } catch (error) {
        reject(new VoiceError(VoiceErrorCode.STT_CONNECTION_FAILED, error.message));
      }
    });
  }

  /**
   * Handle incoming WebSocket message
   * @private
   * @param {Object} message - Parsed message
   */
  handleMessage(message) {
    switch (message.message_type) {
      case 'session_started':
        this.sessionId = message.session_id;
        this.emit('session', {
          sessionId: message.session_id,
          config: message.config,
        });
        break;

      case 'partial_transcript':
        this.emit('partial', { text: message.text });
        break;

      case 'committed_transcript':
        this.emit('committed', { text: message.text });
        break;

      case 'committed_transcript_with_timestamps':
        this.emit('committed', {
          text: message.text,
          languageCode: message.language_code,
          words: message.words,
        });
        break;

      case 'scribe_error':
      case 'scribe_auth_error':
      case 'scribe_rate_limited_error':
      case 'scribe_throttled_error':
      case 'scribe_quota_exceeded_error':
        this.emit('error', new VoiceError(
          getWebSocketErrorCode({ message: message.error }),
          message.error
        ));
        break;

      default:
        // Unknown message type, ignore
        break;
    }
  }

  /**
   * Send audio chunk to STT service
   * @param {string} audioBase64 - Base64 encoded PCM audio
   * @param {number} sampleRate - Audio sample rate
   * @param {boolean} [commit=false] - Whether to commit (force end of speech)
   */
  sendAudio(audioBase64, sampleRate, commit = false) {
    if (!this.connected || !this.ws) {
      return;
    }

    const message = {
      message_type: 'input_audio_chunk',
      audio_base_64: audioBase64,
      sample_rate: sampleRate,
    };

    if (commit) {
      message.commit = true;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send audio:', error);
    }
  }

  /**
   * Force commit current transcript
   */
  commit() {
    if (!this.connected || !this.ws) {
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        message_type: 'input_audio_chunk',
        audio_base_64: '',
        commit: true,
      }));
    } catch (error) {
      console.error('Failed to commit:', error);
    }
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnect from STT service
   */
  disconnect() {
    this.connected = false;

    if (this.ws) {
      try {
        this.ws.close(1000, 'Client disconnect');
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }

    this.sessionId = null;
  }

  /**
   * Subscribe to events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Unsubscribe from events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler to remove
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in STTConnection ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    this.listeners.clear();
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.disconnect();
    this.removeAllListeners();
  }
}

export default STTConnection;
