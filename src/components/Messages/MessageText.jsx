import PropTypes from 'prop-types';

import './MessageText.scss';

/**
 * MessageText - Text message component
 * TODO: Render text with proper formatting
 * TODO: Support markdown/links
 * TODO: Add timestamp display
 * TODO: Show message status (sent, delivered, read)
 * TODO: Handle quick replies
 */
export function MessageText({ message }) {
  // TODO: Parse and render links
  // TODO: Support markdown if needed
  
  return (
    <section className={`weni-message-text weni-message-text--${message.direction}`}>
      <p className="weni-message-text__content">{message.text}</p>

      {/* TODO: Add quick replies if present */}
    </section>
  );
}

MessageText.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    timestamp: PropTypes.number.isRequired,
    direction: PropTypes.oneOf(['outgoing', 'incoming']).isRequired,
    status: PropTypes.string,
    metadata: PropTypes.object,
    quickReplies: PropTypes.array
  }).isRequired
};

export default MessageText;

