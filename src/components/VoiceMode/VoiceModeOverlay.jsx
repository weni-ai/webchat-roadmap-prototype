/**
 * VoiceModeOverlay - Full-screen voice mode interface
 *
 * Displays the immersive voice mode UI with:
 * - Header with title and close button
 * - Centered waveform visualization
 * - Status text and instructions
 * - Error handling
 */

import PropTypes from 'prop-types';
import { useCallback, useEffect } from 'react';
import Button from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import WaveformVisualizer from './WaveformVisualizer';
import VoiceModeError from './VoiceModeError';
import './VoiceModeOverlay.scss';

/**
 * Map voice state to waveform state
 * @param {string} voiceState - Voice session state
 * @returns {string} - Waveform state
 */
function getWaveformState(voiceState) {
  switch (voiceState) {
    case 'listening':
    case 'speaking': // Treat speaking as listening - continuous conversation
      return 'listening';
    case 'processing':
    case 'sending':
      return 'processing';
    case 'receiving':
      return 'processing';
    default:
      return 'idle';
  }
}

/**
 * Get status text based on state
 * @param {string} state - Voice session state
 * @param {Object} texts - Custom texts
 * @returns {Object} - Main text and hint
 */
function getStatusText(state, texts) {
  switch (state) {
    case 'listening':
    case 'speaking': // Treat speaking as listening - continuous conversation, always ready
      return {
        main: texts.listening || 'Estou ouvindo, como posso ajudar?',
        hint: texts.microphoneHint || 'O microfone está ligado, você pode falar quando quiser.',
      };
    case 'processing':
    case 'sending':
      return {
        main: texts.processing || 'Processando...',
        hint: texts.sendingHint || 'Enviando sua mensagem...',
      };
    case 'receiving':
      return {
        main: texts.receiving || 'Aguardando resposta...',
        hint: '',
      };
    default:
      return {
        main: texts.listening || 'Estou ouvindo, como posso ajudar?',
        hint: texts.microphoneHint || 'O microfone está ligado, você pode falar quando quiser.',
      };
  }
}

/**
 * VoiceModeOverlay component
 */
export function VoiceModeOverlay({
  isOpen,
  state,
  partialTranscript = '',
  error,
  onClose,
  onRetry,
  texts = {},
}) {
  const waveformState = getWaveformState(state);
  const statusText = getStatusText(state, texts);

  // Handle Escape key to close
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && onClose) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when overlay is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const title = texts.title || 'Modo de voz';

  return (
    <div
      className="weni-voice-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Header */}
      <header className="weni-voice-overlay__header">
        <h2 className="weni-voice-overlay__title">{title}</h2>
        <Button
          onClick={onClose}
          variant="tertiary"
          icon="close"
          iconColor="white"
          className="weni-voice-overlay__close-btn"
          aria-label="Fechar modo de voz"
        />
      </header>

      {/* Content */}
      <div className="weni-voice-overlay__content">
        {error ? (
          <VoiceModeError
            error={error}
            onRetry={onRetry}
            onDismiss={onClose}
            texts={texts}
          />
        ) : (
          <>
            {/* Waveform */}
            <div className="weni-voice-overlay__waveform">
              <WaveformVisualizer state={waveformState} barCount={5} />
            </div>

            {/* Status Text */}
            <h1 className="weni-voice-overlay__main-text">
              {statusText.main}
            </h1>

            {statusText.hint && (
              <p className="weni-voice-overlay__hint-text">
                {statusText.hint}
              </p>
            )}

            {/* Partial Transcript */}
            {partialTranscript && (
              <div className="weni-voice-overlay__transcript">
                <p className="weni-voice-overlay__transcript-text">
                  {partialTranscript}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

VoiceModeOverlay.propTypes = {
  /** Whether the overlay is visible */
  isOpen: PropTypes.bool.isRequired,
  /** Current voice session state */
  state: PropTypes.string,
  /** Partial transcript text */
  partialTranscript: PropTypes.string,
  /** Error object */
  error: PropTypes.object,
  /** Close handler */
  onClose: PropTypes.func.isRequired,
  /** Retry handler for errors */
  onRetry: PropTypes.func,
  /** Custom texts */
  texts: PropTypes.shape({
    title: PropTypes.string,
    listening: PropTypes.string,
    microphoneHint: PropTypes.string,
    speaking: PropTypes.string,
    processing: PropTypes.string,
    errorTitle: PropTypes.string,
  }),
};

export default VoiceModeOverlay;
