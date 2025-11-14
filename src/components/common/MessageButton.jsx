import PropTypes from 'prop-types';
import './MessageButton.scss';

export function MessageButton({ children, className = '', alignContent = 'center', onClick, disabled = false }) {
  return (
    <button
      className={`weni-message-button weni-message-button--${alignContent}-aligned ${className}`} onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

MessageButton.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  alignContent: PropTypes.oneOf(['start', 'center', 'end']),
  disabled: PropTypes.bool,
};
