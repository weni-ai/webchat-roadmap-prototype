/**
 * VoiceModeError - Error display component for voice mode
 *
 * Shows user-friendly error messages with recovery options
 * when voice mode encounters problems.
 */

import PropTypes from 'prop-types';
import Button from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import './VoiceModeOverlay.scss'; // Uses overlay styles

/**
 * VoiceModeError component
 */
export function VoiceModeError({
  error,
  onRetry,
  onDismiss,
  texts = {},
}) {
  if (!error) return null;

  const errorTitle = texts.errorTitle || 'Algo deu errado';
  const retryText = texts.retry || 'Tentar novamente';
  const closeText = texts.close || 'Fechar';
  const defaultMessage = texts.defaultError || 'Ocorreu um erro inesperado';

  return (
    <div className="weni-voice-error">
      <div className="weni-voice-error__icon">
        <Icon
          name="error"
          size="x-large"
          color="white"
        />
      </div>

      <h3 className="weni-voice-error__title">
        {errorTitle}
      </h3>

      <p className="weni-voice-error__message">
        {error.message || defaultMessage}
      </p>

      {error.suggestion && (
        <p className="weni-voice-error__suggestion">
          {error.suggestion}
        </p>
      )}

      <div className="weni-voice-error__actions">
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="secondary"
            className="weni-voice-error__retry-btn"
          >
            {retryText}
          </Button>
        )}

        {onDismiss && (
          <Button
            onClick={onDismiss}
            variant="tertiary"
            className="weni-voice-error__dismiss-btn"
          >
            {closeText}
          </Button>
        )}
      </div>
    </div>
  );
}

VoiceModeError.propTypes = {
  /** Error object with code, message, suggestion, recoverable */
  error: PropTypes.shape({
    code: PropTypes.string,
    message: PropTypes.string,
    suggestion: PropTypes.string,
    recoverable: PropTypes.bool,
  }),
  /** Retry handler */
  onRetry: PropTypes.func,
  /** Dismiss handler */
  onDismiss: PropTypes.func,
  /** Custom texts */
  texts: PropTypes.shape({
    errorTitle: PropTypes.string,
    retry: PropTypes.string,
    close: PropTypes.string,
    defaultError: PropTypes.string,
  }),
};

export default VoiceModeError;
