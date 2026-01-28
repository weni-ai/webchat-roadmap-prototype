/**
 * AudioCapture - Microphone capture and audio processing
 *
 * Handles microphone stream acquisition, PCM encoding,
 * and voice activity detection for the voice mode feature.
 */

import {
  floatTo16BitPCM,
  int16ToBase64,
  downsampleBuffer,
  detectVoiceActivity,
  AUDIO_CONSTANTS,
} from '@/utils/audioUtils';
import { VoiceError, VoiceErrorCode, getMediaErrorCode } from './errors';

/**
 * AudioCapture class for microphone handling
 * @fires AudioCapture#audioData - When audio data is available
 * @fires AudioCapture#voiceActivity - When voice activity is detected
 * @fires AudioCapture#silenceDetected - When silence is detected after speech
 * @fires AudioCapture#error - When an error occurs
 */
export class AudioCapture {
  constructor() {
    /** @type {MediaStream|null} */
    this.mediaStream = null;

    /** @type {AudioContext|null} */
    this.audioContext = null;

    /** @type {MediaStreamAudioSourceNode|null} */
    this.sourceNode = null;

    /** @type {ScriptProcessorNode|null} */
    this.processorNode = null;

    /** @type {boolean} */
    this.isCapturing = false;

    /** @type {boolean} */
    this.isSpeaking = false;

    /** @type {number} */
    this.silenceStartTime = 0;

    /** @type {number} */
    this.vadThreshold = AUDIO_CONSTANTS.VAD_THRESHOLD;

    /** @type {number} */
    this.targetSampleRate = AUDIO_CONSTANTS.TARGET_SAMPLE_RATE;

    /** @type {Map<string, Function[]>} */
    this.listeners = new Map();
  }

  /**
   * Check if browser supports audio capture
   * @returns {boolean}
   */
  static isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      (window.AudioContext || window.webkitAudioContext)
    );
  }

  /**
   * Request microphone permission
   * @returns {Promise<boolean>} - True if permission granted
   */
  async requestPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just wanted to check permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if microphone permission is granted
   * @returns {Promise<PermissionState>}
   */
  async checkPermission() {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      return result.state;
    } catch {
      // Fallback for browsers that don't support permissions API
      return 'prompt';
    }
  }

  /**
   * Start capturing audio from microphone
   * @param {Object} options - Capture options
   * @param {number} [options.vadThreshold] - Voice activity detection threshold
   * @returns {Promise<void>}
   * @throws {VoiceError}
   */
  async start(options = {}) {
    if (this.isCapturing) {
      return;
    }

    if (options.vadThreshold !== undefined) {
      this.vadThreshold = options.vadThreshold;
    }

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: this.targetSampleRate },
        },
      });

      // Create audio context
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass({
        sampleRate: this.targetSampleRate,
      });

      // Create source node from microphone
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create processor node for audio data access
      // Using ScriptProcessorNode (deprecated but widely supported)
      // TODO: Migrate to AudioWorklet for better performance
      this.processorNode = this.audioContext.createScriptProcessor(
        AUDIO_CONSTANTS.BUFFER_SIZE,
        1, // input channels
        1  // output channels
      );

      // Process audio data
      this.processorNode.onaudioprocess = (event) => {
        if (!this.isCapturing) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Downsample if needed
        let audioData = inputData;
        if (this.audioContext.sampleRate !== this.targetSampleRate) {
          audioData = downsampleBuffer(
            inputData,
            this.audioContext.sampleRate,
            this.targetSampleRate
          );
        }

        // Check for voice activity
        const hasVoice = detectVoiceActivity(audioData, this.vadThreshold);

        if (hasVoice) {
          if (!this.isSpeaking) {
            this.isSpeaking = true;
            this.emit('voiceActivity', { speaking: true });
          }
          this.silenceStartTime = 0;
        } else if (this.isSpeaking) {
          // Track silence duration
          if (this.silenceStartTime === 0) {
            this.silenceStartTime = Date.now();
          }
          this.emit('silenceDetected', {
            duration: Date.now() - this.silenceStartTime,
          });
        }

        // Convert to 16-bit PCM and emit
        const pcmData = floatTo16BitPCM(audioData);
        const base64Data = int16ToBase64(pcmData);

        this.emit('audioData', {
          data: base64Data,
          sampleRate: this.targetSampleRate,
          hasVoice,
        });
      };

      // Connect nodes
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isCapturing = true;
      this.isSpeaking = false;
      this.silenceStartTime = 0;

    } catch (error) {
      const errorCode = getMediaErrorCode(error);
      throw new VoiceError(errorCode, null, error);
    }
  }

  /**
   * Stop audio capture
   */
  stop() {
    this.isCapturing = false;
    this.isSpeaking = false;

    // Disconnect processor
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    // Disconnect source
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // Stop media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  /**
   * Pause audio capture (keep stream open)
   */
  pause() {
    this.isCapturing = false;
  }

  /**
   * Resume audio capture
   */
  resume() {
    if (this.mediaStream && this.processorNode) {
      this.isCapturing = true;
      this.isSpeaking = false;
      this.silenceStartTime = 0;
    }
  }

  /**
   * Reset speaking state
   */
  resetSpeakingState() {
    this.isSpeaking = false;
    this.silenceStartTime = 0;
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
          console.error(`Error in AudioCapture ${event} listener:`, error);
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
  }
}

export default AudioCapture;
