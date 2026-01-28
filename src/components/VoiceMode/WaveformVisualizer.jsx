/**
 * WaveformVisualizer - Audio waveform animation component
 *
 * Displays animated bars representing audio waveform for different states:
 * - idle: Static bars
 * - listening: Animated bars responding to audio input
 * - speaking: Animated bars for TTS playback
 * - processing: Subtle animation while processing
 */

import PropTypes from 'prop-types';
import { useMemo } from 'react';
import './WaveformVisualizer.scss';

/**
 * WaveformVisualizer component
 */
export function WaveformVisualizer({
  state = 'idle',
  barCount = 5,
  className = '',
}) {
  // Generate bar elements
  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, index) => (
      <div
        key={index}
        className={`weni-waveform__bar weni-waveform__bar--${index}`}
        style={{
          animationDelay: `${index * 0.1}s`,
        }}
      />
    ));
  }, [barCount]);

  const stateClass = `weni-waveform--${state}`;

  return (
    <div
      className={`weni-waveform ${stateClass} ${className}`}
      role="img"
      aria-label={getAriaLabel(state)}
    >
      {bars}
    </div>
  );
}

/**
 * Get aria-label based on state
 * @param {string} state - Current state
 * @returns {string} - Aria label
 */
function getAriaLabel(state) {
  switch (state) {
    case 'listening':
      return 'Listening for your voice';
    case 'speaking':
      return 'Playing audio response';
    case 'processing':
      return 'Processing your speech';
    default:
      return 'Voice mode indicator';
  }
}

WaveformVisualizer.propTypes = {
  /** Animation state */
  state: PropTypes.oneOf(['idle', 'listening', 'speaking', 'processing']),
  /** Number of bars to display */
  barCount: PropTypes.number,
  /** Additional CSS class */
  className: PropTypes.string,
};

export default WaveformVisualizer;
