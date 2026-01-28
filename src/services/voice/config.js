/**
 * Voice Mode Configuration
 *
 * Defines configuration options and defaults for the voice mode feature.
 * Includes validation for required settings.
 */

import { VoiceError, VoiceErrorCode } from './errors';

/**
 * Default voice configuration values
 * @type {VoiceConfiguration}
 */
export const DEFAULT_VOICE_CONFIG = {
  // Required - must be provided
  voiceId: '',

  // Language settings
  languageCode: 'pt',

  // ElevenLabs model settings
  ttsModel: 'eleven_flash_v2_5',
  sttModel: 'scribe_v2_realtime',

  // Audio settings
  audioFormat: 'mp3_44100_128',
  sampleRate: 16000,

  // Voice Activity Detection settings
  silenceThreshold: 1.5, // seconds
  vadThreshold: 0.4,
  minSpeechDuration: 100, // ms
  minSilenceDuration: 100, // ms

  // Latency optimization (0-4, higher = more optimization, lower quality)
  latencyOptimization: 3,

  // Behavior settings
  enableBargeIn: true,
  autoListen: true,

  // Token provider (must be provided for production)
  getToken: null,

  // UI text customization
  texts: {
    title: 'Fully voice mode',
    listening: "I'm listening, how can I help you?",
    microphoneHint: 'The microphone is on, you can speak whenever you\'re ready.',
    speaking: 'Speaking...',
    processing: 'Processing...',
    errorTitle: 'Something went wrong',
  },
};

/**
 * @typedef {Object} VoiceConfiguration
 * @property {string} voiceId - ElevenLabs voice ID (required)
 * @property {string} [languageCode='pt'] - ISO 639-1 language code
 * @property {'eleven_flash_v2_5'|'eleven_multilingual_v2'} [ttsModel] - TTS model
 * @property {'scribe_v2_realtime'} [sttModel] - STT model
 * @property {'mp3_44100_128'|'pcm_24000'} [audioFormat] - Audio output format
 * @property {number} [sampleRate=16000] - Audio sample rate for STT
 * @property {number} [silenceThreshold=1.5] - Silence threshold in seconds
 * @property {number} [vadThreshold=0.4] - VAD threshold (0.1-0.9)
 * @property {number} [minSpeechDuration=100] - Minimum speech duration in ms
 * @property {number} [minSilenceDuration=100] - Minimum silence duration in ms
 * @property {number} [latencyOptimization=3] - Latency optimization level (0-4)
 * @property {boolean} [enableBargeIn=true] - Allow interrupting agent
 * @property {boolean} [autoListen=true] - Auto-listen after agent speaks
 * @property {function(): Promise<string>} [getToken] - Token provider function
 * @property {Object} [texts] - UI text customization
 */

/**
 * Validate voice configuration
 * @param {Partial<VoiceConfiguration>} config - Configuration to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateVoiceConfig(config) {
  const errors = [];

  // Required: voiceId
  if (!config.voiceId || typeof config.voiceId !== 'string' || config.voiceId.trim() === '') {
    errors.push('voiceId is required and must be a non-empty string');
  }

  // Validate silenceThreshold (0.3 - 3.0)
  if (config.silenceThreshold !== undefined) {
    if (typeof config.silenceThreshold !== 'number' ||
        config.silenceThreshold < 0.3 ||
        config.silenceThreshold > 3.0) {
      errors.push('silenceThreshold must be a number between 0.3 and 3.0');
    }
  }

  // Validate vadThreshold (0.1 - 0.9)
  if (config.vadThreshold !== undefined) {
    if (typeof config.vadThreshold !== 'number' ||
        config.vadThreshold < 0.1 ||
        config.vadThreshold > 0.9) {
      errors.push('vadThreshold must be a number between 0.1 and 0.9');
    }
  }

  // Validate latencyOptimization (0-4)
  if (config.latencyOptimization !== undefined) {
    if (!Number.isInteger(config.latencyOptimization) ||
        config.latencyOptimization < 0 ||
        config.latencyOptimization > 4) {
      errors.push('latencyOptimization must be an integer between 0 and 4');
    }
  }

  // Validate getToken is a function if provided
  if (config.getToken !== undefined && config.getToken !== null) {
    if (typeof config.getToken !== 'function') {
      errors.push('getToken must be a function that returns a Promise<string>');
    }
  }

  // Validate ttsModel
  if (config.ttsModel !== undefined) {
    const validModels = ['eleven_flash_v2_5', 'eleven_multilingual_v2'];
    if (!validModels.includes(config.ttsModel)) {
      errors.push(`ttsModel must be one of: ${validModels.join(', ')}`);
    }
  }

  // Validate audioFormat
  if (config.audioFormat !== undefined) {
    const validFormats = ['mp3_44100_128', 'pcm_24000'];
    if (!validFormats.includes(config.audioFormat)) {
      errors.push(`audioFormat must be one of: ${validFormats.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge user config with defaults
 * @param {Partial<VoiceConfiguration>} userConfig - User-provided configuration
 * @returns {VoiceConfiguration} - Merged configuration
 * @throws {VoiceError} - If configuration is invalid
 */
export function mergeVoiceConfig(userConfig) {
  const validation = validateVoiceConfig(userConfig);

  if (!validation.valid) {
    throw new VoiceError(
      VoiceErrorCode.UNKNOWN_ERROR,
      `Invalid voice configuration: ${validation.errors.join('; ')}`
    );
  }

  return {
    ...DEFAULT_VOICE_CONFIG,
    ...userConfig,
    texts: {
      ...DEFAULT_VOICE_CONFIG.texts,
      ...(userConfig.texts || {}),
    },
  };
}

/**
 * Build ElevenLabs STT WebSocket URL
 * @param {VoiceConfiguration} config - Voice configuration
 * @param {string} token - Single-use token from ElevenLabs API
 * @returns {string} - WebSocket URL
 */
export function buildSTTWebSocketURL(config, token) {
  // Build URL for ElevenLabs Scribe v2 realtime
  // Authentication is done via the 'token' query parameter
  const baseUrl = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';
  
  const params = new URLSearchParams();
  
  // Model ID (required)
  params.set('model_id', config.sttModel || 'scribe_v2_realtime');
  
  // Language code for better accuracy
  if (config.languageCode) {
    params.set('language_code', config.languageCode);
  }
  
  // Single-use token for authentication
  if (token) {
    params.set('token', token);
  }

  // VAD (Voice Activity Detection) configuration for auto-commit
  // commit_strategy=vad enables automatic commit when silence is detected
  params.set('commit_strategy', 'vad');
  
  // VAD sensitivity threshold (0.0-1.0, default 0.5)
  // Lower values = more sensitive to speech
  const vadThreshold = config.vadThreshold || 0.4;
  params.set('vad_threshold', vadThreshold.toString());
  
  // Silence duration to trigger commit (in ms)
  // Time of silence before auto-commit (default 2000ms)
  const silenceDurationMs = Math.round((config.silenceThreshold || 1.5) * 1000);
  params.set('vad_silence_duration_ms', silenceDurationMs.toString());
  
  // Minimum speech duration (in ms) - avoids committing on short noises
  const minSpeechMs = config.minSpeechDuration || 100;
  params.set('vad_min_speech_duration_ms', minSpeechMs.toString());
  
  // Prefix padding (in ms) - audio to include before detected speech
  params.set('vad_prefix_padding_ms', '300');

  const url = `${baseUrl}?${params.toString()}`;
  
  return url;
}

/**
 * Build ElevenLabs TTS API URL
 * @param {string} voiceId - Voice ID
 * @returns {string} - TTS streaming endpoint URL
 */
export function buildTTSStreamURL(voiceId) {
  return `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
}

/**
 * Build TTS request body
 * @param {string} text - Text to convert to speech
 * @param {VoiceConfiguration} config - Voice configuration
 * @returns {Object} - Request body for TTS API
 */
export function buildTTSRequestBody(text, config) {
  return {
    text,
    model_id: config.ttsModel,
    output_format: config.audioFormat,
    optimize_streaming_latency: config.latencyOptimization,
    language_code: config.languageCode,
  };
}

export default {
  DEFAULT_VOICE_CONFIG,
  validateVoiceConfig,
  mergeVoiceConfig,
  buildSTTWebSocketURL,
  buildTTSStreamURL,
  buildTTSRequestBody,
};
