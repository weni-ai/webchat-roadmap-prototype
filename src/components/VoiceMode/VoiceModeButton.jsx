/**
 * VoiceModeButton - Button to enter voice mode
 *
 * Displays a microphone button that triggers full voice mode
 * when clicked. Only visible when voice mode is enabled and supported.
 */

import PropTypes from 'prop-types';
import Button from '@/components/common/Button';
import './VoiceModeButton.scss';

/**
 * VoiceModeButton component
 */
export function VoiceModeButton({
  onClick,
  disabled = false,
  className = '',
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="tertiary"
      icon="graphic_eq"
      iconColor="gray-900"
      className={`weni-voice-mode-btn ${className}`}
      aria-label="Enter voice mode"
      title="Voice mode"
    />
  );
}

VoiceModeButton.propTypes = {
  /** Click handler */
  onClick: PropTypes.func.isRequired,
  /** Whether button is disabled */
  disabled: PropTypes.bool,
  /** Additional CSS class */
  className: PropTypes.string,
};

export default VoiceModeButton;
