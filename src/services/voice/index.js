/**
 * Voice Services Module
 *
 * Exports all voice-related services for the Full Voice Mode feature.
 * This module provides speech-to-text, text-to-speech, and audio capture
 * functionality using ElevenLabs APIs.
 */

export { VoiceService, default as VoiceServiceDefault } from './VoiceService';
export { AudioCapture } from './AudioCapture';
export { STTConnection } from './STTConnection';
export { TTSPlayer } from './TTSPlayer';
export { VoiceError, VoiceErrorCode, createVoiceError } from './errors';
export {
  VoiceConfiguration,
  DEFAULT_VOICE_CONFIG,
  validateVoiceConfig,
} from './config';
