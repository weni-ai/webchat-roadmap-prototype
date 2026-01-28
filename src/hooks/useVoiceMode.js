/**
 * useVoiceMode - React hook for voice mode functionality
 *
 * Provides a convenient interface to voice mode state and actions
 * from the ChatContext.
 */

import { useChatContext } from '@/contexts/ChatContext';
import { useMemo, useCallback } from 'react';

/**
 * @typedef {Object} UseVoiceModeReturn
 * @property {boolean} isActive - Whether voice mode is currently active
 * @property {string|null} state - Current voice session state
 * @property {boolean} isSupported - Whether voice mode is supported in browser
 * @property {string} partialTranscript - Current partial transcript
 * @property {boolean} isSpeaking - Whether TTS is currently playing
 * @property {boolean} isListening - Whether microphone is active
 * @property {Object|null} error - Current error if any
 * @property {Function} enter - Enter voice mode
 * @property {Function} exit - Exit voice mode
 * @property {Function} clearError - Clear current error
 */

/**
 * Hook for voice mode functionality
 * @returns {UseVoiceModeReturn}
 */
export function useVoiceMode() {
  const context = useChatContext();

  const {
    voiceService,
    isVoiceModeActive,
    isVoiceModeSupported,
    voiceModeState,
    voicePartialTranscript,
    voiceError,
    enterVoiceMode,
    exitVoiceMode,
    config,
  } = context;

  /**
   * Whether voice mode is enabled in config
   */
  const isEnabled = useMemo(() => {
    return !!(config?.voiceMode?.enabled && config?.voiceMode?.voiceId);
  }, [config]);

  /**
   * Whether currently listening for speech
   */
  const isListening = useMemo(() => {
    return voiceModeState === 'listening' || voiceModeState === 'processing';
  }, [voiceModeState]);

  /**
   * Whether TTS is currently playing
   */
  const isSpeaking = useMemo(() => {
    return voiceModeState === 'speaking';
  }, [voiceModeState]);

  /**
   * Whether waiting for agent response
   */
  const isReceiving = useMemo(() => {
    return voiceModeState === 'receiving' || voiceModeState === 'sending';
  }, [voiceModeState]);

  /**
   * Enter voice mode with error handling
   */
  const enter = useCallback(async () => {
    if (!isEnabled) {
      console.warn('Voice mode is not enabled in configuration');
      return false;
    }

    if (!isVoiceModeSupported) {
      console.warn('Voice mode is not supported in this browser');
      return false;
    }

    try {
      await enterVoiceMode();
      return true;
    } catch (error) {
      console.error('Failed to enter voice mode:', error);
      return false;
    }
  }, [isEnabled, isVoiceModeSupported, enterVoiceMode]);

  /**
   * Exit voice mode
   */
  const exit = useCallback(() => {
    exitVoiceMode();
  }, [exitVoiceMode]);

  /**
   * Clear current error
   * Note: This is handled by the context, included for convenience
   */
  const clearError = useCallback(() => {
    // Error is cleared when entering voice mode again
    // or when exiting voice mode
  }, []);

  /**
   * Get voice configuration texts
   */
  const texts = useMemo(() => {
    return config?.voiceMode?.texts || {
      title: 'Fully voice mode',
      listening: "I'm listening, how can I help you?",
      microphoneHint: 'The microphone is on, you can speak whenever you\'re ready.',
      speaking: 'Speaking...',
      processing: 'Processing...',
      errorTitle: 'Something went wrong',
    };
  }, [config]);

  return {
    // State
    isActive: isVoiceModeActive,
    isEnabled,
    isSupported: isVoiceModeSupported,
    state: voiceModeState,
    partialTranscript: voicePartialTranscript || '',
    error: voiceError,

    // Computed state
    isListening,
    isSpeaking,
    isReceiving,

    // Actions
    enter,
    exit,
    clearError,

    // Config
    texts,

    // Service reference (for advanced use)
    voiceService,
  };
}

export default useVoiceMode;
