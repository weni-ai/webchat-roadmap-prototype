/**
 * TTSPlayer - Text-to-Speech audio playback
 *
 * Handles streaming TTS from ElevenLabs API and seamless audio playback
 * using Web Audio API.
 */

import { buildTTSStreamURL, buildTTSRequestBody } from './config';
import { VoiceError, VoiceErrorCode, getTTSErrorCode } from './errors';
import { mergeAudioChunks } from '@/utils/audioUtils';

/**
 * TTSPlayer class for ElevenLabs TTS streaming
 * @fires TTSPlayer#started - When playback starts
 * @fires TTSPlayer#ended - When playback ends
 * @fires TTSPlayer#progress - When playback progresses
 * @fires TTSPlayer#error - When an error occurs
 */
export class TTSPlayer {
  constructor() {
    /** @type {AudioContext|null} */
    this.audioContext = null;

    /** @type {boolean} */
    this.isPlaying = false;

    /** @type {boolean} */
    this.isStopped = false;

    /** @type {AudioBufferSourceNode|null} */
    this.currentSource = null;

    /** @type {Array} - Queue of audio buffers to play */
    this.audioQueue = [];

    /** @type {boolean} */
    this.isProcessingQueue = false;

    /** @type {AbortController|null} */
    this.abortController = null;

    /** @type {Map<string, Function[]>} */
    this.listeners = new Map();
    
    /** @type {Array} - Queue of pending TTS requests */
    this.ttsQueue = [];
    
    /** @type {boolean} */
    this.isProcessingTTS = false;
  }

  /**
   * Initialize audio context
   * @private
   */
  initAudioContext() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }

    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Speak text using ElevenLabs TTS
   * Queues TTS requests for sequential playback
   * @param {string} text - Text to speak
   * @param {Object} options - TTS options
   * @returns {Promise<void>}
   */
  async speak(text, options = {}) {
    if (!text?.trim()) {
      return;
    }

    // Reset stopped flag when new speech is requested
    this.isStopped = false;

    // Add to TTS queue
    return new Promise((resolve, reject) => {
      this.ttsQueue.push({ text, options, resolve, reject });
      
      // Start processing if not already processing
      if (!this.isProcessingTTS) {
        this.processTTSQueue();
      }
    });
  }

  /**
   * Process TTS queue sequentially
   * @private
   */
  async processTTSQueue() {
    if (this.isProcessingTTS || this.ttsQueue.length === 0) {
      return;
    }

    this.isProcessingTTS = true;

    while (this.ttsQueue.length > 0 && !this.isStopped) {
      const { text, options, resolve, reject } = this.ttsQueue.shift();

      try {
        await this.speakImmediate(text, options);
        resolve();
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessingTTS = false;
  }

  /**
   * Immediate TTS execution (internal use)
   * @private
   */
  async speakImmediate(text, options = {}) {
    if (!text?.trim()) {
      return;
    }

    this.initAudioContext();
    this.isStopped = false;
    this.isPlaying = true;

    // Create abort controller for this request
    this.abortController = new AbortController();

    try {
      const url = buildTTSStreamURL(options.voiceId);
      const body = buildTTSRequestBody(text, options);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': options.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new VoiceError(
          getTTSErrorCode(response),
          `TTS request failed: ${response.status}`
        );
      }

      this.emit('started', { text });

      // Stream and play audio
      await this.streamAndPlay(response);

      if (!this.isStopped) {
        this.emit('ended');
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        // Request was cancelled, don't emit error
        return;
      }

      const voiceError = error instanceof VoiceError
        ? error
        : new VoiceError(getTTSErrorCode(error), error.message, error);

      this.emit('error', voiceError);
      throw voiceError;

    } finally {
      this.isPlaying = false;
      this.abortController = null;
    }
  }

  /**
   * Stream audio response and play
   * @private
   * @param {Response} response - Fetch response
   */
  async streamAndPlay(response) {
    const reader = response.body.getReader();
    const chunks = [];

    try {
      while (!this.isStopped) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        chunks.push(value.buffer);

        // Play as we receive chunks
        // For simplicity, we'll buffer all chunks then play
        // A more sophisticated implementation would decode and play incrementally
      }

      if (this.isStopped) {
        reader.cancel();
        return;
      }

      // Merge all chunks and decode
      if (chunks.length > 0) {
        const mergedBuffer = mergeAudioChunks(chunks);
        await this.playAudioBuffer(mergedBuffer);
      }

    } catch (error) {
      if (!this.isStopped) {
        throw error;
      }
    }
  }

  /**
   * Decode and play audio buffer
   * @private
   * @param {ArrayBuffer} buffer - Audio data
   */
  async playAudioBuffer(buffer) {
    if (this.isStopped || !this.audioContext) {
      return;
    }

    try {
      // Decode the audio data
      const audioBuffer = await this.audioContext.decodeAudioData(buffer.slice(0));

      if (this.isStopped) {
        return;
      }

      // Create buffer source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      this.currentSource = source;

      // Return promise that resolves when playback ends
      return new Promise((resolve) => {
        source.onended = () => {
          this.currentSource = null;
          resolve();
        };

        source.start(0);
      });

    } catch (error) {
      console.error('Failed to decode/play audio:', error);
      throw error;
    }
  }

  /**
   * Queue audio chunk for playback
   * @param {ArrayBuffer} chunk - Audio data chunk
   */
  queueChunk(chunk) {
    this.audioQueue.push(chunk);

    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * Process audio queue
   * @private
   */
  async processQueue() {
    if (this.isProcessingQueue || this.audioQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.audioQueue.length > 0 && !this.isStopped) {
      const chunk = this.audioQueue.shift();

      try {
        await this.playAudioBuffer(chunk);
      } catch (error) {
        console.error('Error playing queued chunk:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Stop playback and clear all queues
   */
  stop() {
    this.isStopped = true;
    this.isPlaying = false;
    this.isProcessingTTS = false;
    this.audioQueue = [];
    this.ttsQueue = [];

    // Abort any ongoing fetch
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Stop current audio source
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Ignore errors if already stopped
      }
      this.currentSource = null;
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
          console.error(`Error in TTSPlayer ${event} listener:`, error);
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
    this.stop();
    this.removeAllListeners();

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}

export default TTSPlayer;
