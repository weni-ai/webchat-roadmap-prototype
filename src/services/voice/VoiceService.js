/**
 * VoiceService - Main orchestrator for voice mode functionality
 *
 * Manages the voice session lifecycle, coordinates between
 * AudioCapture, STTConnection, and TTSPlayer components.
 */

import { AudioCapture } from './AudioCapture';
import { STTConnection } from './STTConnection';
import { TTSPlayer } from './TTSPlayer';
import { VoiceError, VoiceErrorCode, createVoiceError } from './errors';
import { mergeVoiceConfig, DEFAULT_VOICE_CONFIG } from './config';

/**
 * Voice session states
 * @enum {string}
 */
export const VoiceSessionState = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SENDING: 'sending',
  RECEIVING: 'receiving',
  SPEAKING: 'speaking',
  ERROR: 'error',
};

/**
 * VoiceService class - Main voice mode orchestrator
 * @fires VoiceService#session:started - When a session starts
 * @fires VoiceService#session:ended - When a session ends
 * @fires VoiceService#state:changed - When state changes
 * @fires VoiceService#listening:started - When listening starts
 * @fires VoiceService#listening:stopped - When listening stops
 * @fires VoiceService#transcript:partial - When partial transcript received
 * @fires VoiceService#transcript:committed - When final transcript received
 * @fires VoiceService#speaking:started - When TTS starts
 * @fires VoiceService#speaking:ended - When TTS ends
 * @fires VoiceService#barge-in - When user interrupts agent
 * @fires VoiceService#error - When an error occurs
 */
export class VoiceService {
  /**
   * @param {Object} [options] - Service options
   */
  constructor(options = {}) {
    /** @type {Object} */
    this.config = null;

    /** @type {VoiceSessionState} */
    this.state = VoiceSessionState.IDLE;

    /** @type {string|null} */
    this.sessionId = null;

    /** @type {number|null} */
    this.sessionStartTime = null;

    /** @type {AudioCapture|null} */
    this.audioCapture = null;

    /** @type {STTConnection|null} */
    this.sttConnection = null;

    /** @type {TTSPlayer|null} */
    this.ttsPlayer = null;

    /** @type {string} */
    this.partialTranscript = '';

    /** @type {VoiceError|null} */
    this.error = null;

    /** @type {string|null} */
    this.currentToken = null;

    /** @type {Map<string, Function[]>} */
    this.listeners = new Map();

    /** @type {Function|null} */
    this.onMessageCallback = null;

    /** @type {string} */
    this.textBuffer = '';

    /** @type {number} - Start speaking after this many chars or sentence ending */
    this.minChunkSize = 30;
    
    /** @type {boolean} - Track if we're currently in a streaming TTS session */
    this.isStreamingSpeech = false;
  }

  /**
   * Check if voice mode is supported in current browser
   * @returns {boolean}
   */
  static isSupported() {
    return !!(
      AudioCapture.isSupported() &&
      typeof WebSocket !== 'undefined' &&
      (window.AudioContext || window.webkitAudioContext)
    );
  }

  /**
   * Alias for static isSupported
   * @returns {boolean}
   */
  isSupported() {
    return VoiceService.isSupported();
  }

  /**
   * Initialize the voice service with configuration
   * @param {Object} config - Voice configuration
   * @returns {Promise<void>}
   */
  async init(config) {
    try {
      this.config = mergeVoiceConfig(config);

      // Initialize components
      this.audioCapture = new AudioCapture();
      this.ttsPlayer = new TTSPlayer();

      // Set up audio capture listeners
      this.setupAudioCaptureListeners();

    } catch (error) {
      if (error instanceof VoiceError) {
        throw error;
      }
      throw createVoiceError(VoiceErrorCode.UNKNOWN_ERROR, error);
    }
  }

  /**
   * Set up listeners for AudioCapture events
   * @private
   */
  setupAudioCaptureListeners() {
    if (!this.audioCapture) return;

    this.audioCapture.on('audioData', (data) => {
      if (this.state === VoiceSessionState.LISTENING ||
          this.state === VoiceSessionState.PROCESSING) {
        this.handleAudioData(data);
      }

      // Barge-in detection: if we're speaking and detect voice, interrupt
      if (this.state === VoiceSessionState.SPEAKING &&
          data.hasVoice &&
          this.config?.enableBargeIn) {
        this.handleBargeIn();
      }
    });

    this.audioCapture.on('voiceActivity', (data) => {
      if (data.speaking && this.state === VoiceSessionState.LISTENING) {
        this.setState(VoiceSessionState.PROCESSING);
      }
    });

    this.audioCapture.on('silenceDetected', (data) => {
      // VAD handles commits automatically - no manual commit needed
    });
  }

  /**
   * Request microphone permission
   * @returns {Promise<boolean>}
   */
  async requestMicrophonePermission() {
    if (!this.audioCapture) {
      this.audioCapture = new AudioCapture();
    }
    return this.audioCapture.requestPermission();
  }

  /**
   * Check if microphone permission is granted
   * @returns {Promise<PermissionState>}
   */
  async hasMicrophonePermission() {
    if (!this.audioCapture) {
      this.audioCapture = new AudioCapture();
    }
    return this.audioCapture.checkPermission();
  }

  /**
   * Start a new voice session
   * @returns {Promise<Object>} - Session info
   */
  async startSession() {
    if (this.state !== VoiceSessionState.IDLE) {
      throw createVoiceError(
        VoiceErrorCode.UNKNOWN_ERROR,
        'Cannot start session: already in progress'
      );
    }

    this.setState(VoiceSessionState.INITIALIZING);
    this.error = null;

    try {
      // Get authentication token
      if (this.config.getToken) {
        this.currentToken = await this.config.getToken();
      }

      // Initialize STT connection
      this.sttConnection = new STTConnection(this.config, this.currentToken);
      this.setupSTTListeners();

      // Start audio capture
      await this.audioCapture.start({
        vadThreshold: this.config.vadThreshold,
      });

      // Connect to STT service
      await this.sttConnection.connect();

      // Generate session ID
      this.sessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessionStartTime = Date.now();

      // Transition to listening state
      this.setState(VoiceSessionState.LISTENING);

      const sessionInfo = {
        id: this.sessionId,
        startedAt: this.sessionStartTime,
      };

      this.emit('session:started', sessionInfo);
      this.emit('listening:started');

      return sessionInfo;

    } catch (error) {
      this.setState(VoiceSessionState.ERROR);
      this.error = error instanceof VoiceError ? error : createVoiceError(VoiceErrorCode.UNKNOWN_ERROR, error);
      this.emit('error', this.error);
      throw this.error;
    }
  }

  /**
   * Set up listeners for STT connection events
   * @private
   */
  setupSTTListeners() {
    if (!this.sttConnection) return;

    this.sttConnection.on('partial', (data) => {
      this.partialTranscript = data.text;
      this.emit('transcript:partial', { text: data.text });
    });

    this.sttConnection.on('committed', (data) => {
      const text = data.text?.trim();
      
      if (text) {
        // User spoke - interrupt agent if it's speaking
        if (this.ttsPlayer && this.ttsPlayer.isPlaying) {
          this.ttsPlayer.stop();
          this.textBuffer = ''; // Clear pending text
          this.emit('barge-in');
        }
        
        this.partialTranscript = '';
        this.emit('transcript:committed', { text });

        // Call the message callback if set
        if (this.onMessageCallback) {
          this.onMessageCallback(text);
        }

        // Stay in LISTENING state - conversation is continuous
        // Don't transition to RECEIVING - we're always listening
        this.setState(VoiceSessionState.LISTENING);
      } else {
        // Empty transcript, stay listening
        this.setState(VoiceSessionState.LISTENING);
      }
    });

    this.sttConnection.on('error', (error) => {
      this.error = error;
      this.emit('error', error);
    });

    this.sttConnection.on('close', async (closeEvent) => {
      // WebSocket closes after VAD commit - reconnect automatically for continuous conversation
      if (this.state !== VoiceSessionState.IDLE) {
        // Reconnect to allow next message
        try {
          const token = await this.config.getToken();
          this.currentToken = token;
          
          this.sttConnection = new STTConnection(this.config, token);
          await this.sttConnection.connect();
          
          // Re-setup listeners
          this.setupSTTListeners();
          
          // Continue listening
          if (this.state === VoiceSessionState.LISTENING) {
            // Already listening, connection is now ready
          }
        } catch (error) {
          this.emit('error', createVoiceError(VoiceErrorCode.STT_CONNECTION_FAILED, error));
        }
      }
    });
  }

  /**
   * Handle audio data from microphone
   * @private
   * @param {Object} data - Audio data
   */
  handleAudioData(data) {
    if (this.sttConnection && this.sttConnection.isConnected()) {
      this.sttConnection.sendAudio(data.data, data.sampleRate);
    }
  }

  /**
   * Handle barge-in (user interruption)
   * User started speaking while agent was speaking - interrupt and listen
   * @private
   */
  handleBargeIn() {
    // Stop TTS playback immediately
    if (this.ttsPlayer) {
      this.ttsPlayer.stop();
    }

    // Clear text buffer
    this.textBuffer = '';

    // Reset audio capture state to restart silence detection
    if (this.audioCapture) {
      this.audioCapture.resetSpeakingState();
    }

    this.emit('barge-in');
    
    // Go back to listening state
    this.startListening();
  }

  /**
   * End the current voice session
   */
  endSession() {
    const sessionDuration = this.sessionStartTime
      ? Date.now() - this.sessionStartTime
      : 0;

    // Stop all components
    if (this.audioCapture) {
      this.audioCapture.stop();
    }

    if (this.sttConnection) {
      this.sttConnection.disconnect();
      this.sttConnection = null;
    }

    if (this.ttsPlayer) {
      this.ttsPlayer.stop();
    }

    const sessionId = this.sessionId;

    // Reset state
    this.sessionId = null;
    this.sessionStartTime = null;
    this.partialTranscript = '';
    this.textBuffer = '';
    this.error = null;
    this.currentToken = null;

    this.setState(VoiceSessionState.IDLE);

    this.emit('session:ended', {
      sessionId,
      duration: sessionDuration,
    });
    this.emit('listening:stopped');
  }

  /**
   * Get current session state
   * @returns {Object|null}
   */
  getSession() {
    if (!this.sessionId) return null;

    return {
      id: this.sessionId,
      state: this.state,
      startedAt: this.sessionStartTime,
      config: this.config,
      partialTranscript: this.partialTranscript,
      isPlaying: this.ttsPlayer?.isPlaying || false,
      error: this.error,
    };
  }

  /**
   * Start listening for speech
   * WebSocket auto-reconnects on close, just resume audio capture
   */
  startListening() {
    if (!this.audioCapture) return;

    // Just resume audio capture - WebSocket reconnects automatically
    if (this.state !== VoiceSessionState.LISTENING) {
      this.audioCapture.resume();
      this.setState(VoiceSessionState.LISTENING);
      this.emit('listening:started');
    }
  }

  /**
   * Stop listening for speech
   */
  stopListening() {
    if (this.audioCapture) {
      this.audioCapture.pause();
      this.emit('listening:stopped');
    }
  }

  /**
   * Convert text to speech and play
   * @param {string} text - Text to speak
   * @param {Object} [options] - TTS options
   * @returns {Promise<void>}
   */
  async speak(text, options = {}) {
    if (!this.ttsPlayer || !text) {
      return;
    }

    try {
      this.setState(VoiceSessionState.SPEAKING);
      this.emit('speaking:started', { text });

      // Get API key for TTS - use getApiKey if available, fallback to token
      let apiKey = this.currentToken;
      if (this.config.getApiKey) {
        try {
          apiKey = typeof this.config.getApiKey === 'function' 
            ? this.config.getApiKey() 
            : this.config.getApiKey;
        } catch (e) {
          // Fallback to token if getApiKey fails
        }
      }

      await this.ttsPlayer.speak(text, {
        voiceId: this.config.voiceId,
        token: apiKey,
        ...this.config,
        ...options,
      });

      this.emit('speaking:ended');

      // Return to listening state - mic is always on
      this.startListening();

    } catch (error) {
      this.emit('error', createVoiceError(VoiceErrorCode.TTS_GENERATION_FAILED, error));
      // Return to listening state
      this.startListening();
    }
  }

  /**
   * Process incoming text chunk for TTS (streaming)
   * Speaks text progressively as it arrives for ultra-low latency
   * @param {string} textChunk - Incoming text chunk
   * @param {boolean} [isComplete=false] - Whether this is the final chunk
   */
  processTextChunk(textChunk, isComplete = false) {
    this.textBuffer += textChunk;

    // Check for sentence boundaries to speak naturally
    const sentenceEndings = /[.!?。！？\n]/;
    const sentences = this.textBuffer.split(sentenceEndings);
    
    // If we have complete sentences, speak them
    if (sentences.length > 1 || isComplete) {
      // Speak all complete sentences (all but the last fragment)
      const completeSentences = isComplete ? sentences : sentences.slice(0, -1);
      const textToSpeak = completeSentences.join('. ').trim();
      
      // Keep the incomplete fragment in buffer
      this.textBuffer = isComplete ? '' : sentences[sentences.length - 1];

      if (textToSpeak) {
        this.speak(textToSpeak);
      }
    }
    
    // If complete and there's remaining text, speak it too
    if (isComplete && this.textBuffer.trim()) {
      this.speak(this.textBuffer.trim());
      this.textBuffer = '';
    }
  }

  /**
   * Stop current TTS playback
   */
  stopSpeaking() {
    if (this.ttsPlayer) {
      this.ttsPlayer.stop();
    }
    this.textBuffer = '';
  }

  /**
   * Set callback for when message is committed
   * @param {Function} callback - Callback function(text)
   */
  setMessageCallback(callback) {
    this.onMessageCallback = callback;
  }

  /**
   * Set state and emit change event
   * @private
   * @param {VoiceSessionState} newState
   */
  setState(newState) {
    const previousState = this.state;
    if (previousState !== newState) {
      this.state = newState;
      this.emit('state:changed', { state: newState, previousState });
    }
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
          console.error(`Error in VoiceService ${event} listener:`, error);
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
    this.endSession();

    if (this.audioCapture) {
      this.audioCapture.destroy();
      this.audioCapture = null;
    }

    if (this.ttsPlayer) {
      this.ttsPlayer.destroy();
      this.ttsPlayer = null;
    }

    this.removeAllListeners();
    this.config = null;
  }
}

export default VoiceService;
