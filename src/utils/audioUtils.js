/**
 * Audio Utilities for Voice Mode
 *
 * Provides helper functions for audio encoding, format conversion,
 * and audio processing required for ElevenLabs STT/TTS integration.
 */

/**
 * Convert Float32Array audio samples to 16-bit PCM
 * @param {Float32Array} float32Array - Audio samples in float format (-1 to 1)
 * @returns {Int16Array} - Audio samples in 16-bit PCM format
 */
export function floatTo16BitPCM(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp value between -1 and 1
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    // Convert to 16-bit integer
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

/**
 * Convert Int16Array to Base64 string for WebSocket transmission
 * @param {Int16Array} int16Array - 16-bit PCM audio data
 * @returns {string} - Base64 encoded string
 */
export function int16ToBase64(int16Array) {
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

/**
 * Convert Float32Array audio to Base64-encoded 16-bit PCM
 * Combines floatTo16BitPCM and int16ToBase64 for convenience
 * @param {Float32Array} float32Array - Audio samples in float format
 * @returns {string} - Base64 encoded 16-bit PCM
 */
export function audioToBase64PCM(float32Array) {
  const pcm = floatTo16BitPCM(float32Array);
  return int16ToBase64(pcm);
}

/**
 * Downsample audio from one sample rate to another
 * Used when browser captures at 48kHz but API needs 16kHz
 * @param {Float32Array} buffer - Input audio buffer
 * @param {number} inputSampleRate - Original sample rate (e.g., 48000)
 * @param {number} outputSampleRate - Target sample rate (e.g., 16000)
 * @returns {Float32Array} - Downsampled audio buffer
 */
export function downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }

  if (inputSampleRate < outputSampleRate) {
    throw new Error('Upsampling is not supported');
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }

    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

/**
 * Calculate RMS (Root Mean Square) volume level from audio samples
 * Used for voice activity detection visualization
 * @param {Float32Array} buffer - Audio samples
 * @returns {number} - RMS value between 0 and 1
 */
export function calculateRMS(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * Simple voice activity detection based on volume threshold
 * @param {Float32Array} buffer - Audio samples
 * @param {number} threshold - Volume threshold (default: 0.01)
 * @returns {boolean} - True if voice activity detected
 */
export function detectVoiceActivity(buffer, threshold = 0.01) {
  const rms = calculateRMS(buffer);
  return rms > threshold;
}

/**
 * Create an AudioWorklet processor script as a Blob URL
 * Used to process audio in a separate thread for better performance
 * @returns {string} - Blob URL for the AudioWorklet processor
 */
export function createAudioWorkletProcessorURL() {
  const processorCode = `
    class PCMProcessor extends AudioWorkletProcessor {
      constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
      }

      process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length === 0) return true;

        const channelData = input[0];
        
        for (let i = 0; i < channelData.length; i++) {
          this.buffer[this.bufferIndex++] = channelData[i];
          
          if (this.bufferIndex >= this.bufferSize) {
            this.port.postMessage({
              type: 'audioData',
              data: this.buffer.slice()
            });
            this.bufferIndex = 0;
          }
        }

        return true;
      }
    }

    registerProcessor('pcm-processor', PCMProcessor);
  `;

  const blob = new Blob([processorCode], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

/**
 * Merge multiple audio chunks into a single buffer
 * @param {ArrayBuffer[]} chunks - Array of audio data chunks
 * @returns {ArrayBuffer} - Merged audio buffer
 */
export function mergeAudioChunks(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    merged.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }

  return merged.buffer;
}

/**
 * Constants for audio processing
 */
export const AUDIO_CONSTANTS = {
  /** Target sample rate for ElevenLabs STT */
  TARGET_SAMPLE_RATE: 16000,

  /** Default browser sample rate */
  BROWSER_SAMPLE_RATE: 48000,

  /** Buffer size for audio processing */
  BUFFER_SIZE: 4096,

  /** Voice activity detection threshold */
  VAD_THRESHOLD: 0.01,

  /** Supported audio MIME types */
  SUPPORTED_MIME_TYPES: ['audio/webm', 'audio/mp4', 'audio/ogg'],
};

export default {
  floatTo16BitPCM,
  int16ToBase64,
  audioToBase64PCM,
  downsampleBuffer,
  calculateRMS,
  detectVoiceActivity,
  createAudioWorkletProcessorURL,
  mergeAudioChunks,
  AUDIO_CONSTANTS,
};
