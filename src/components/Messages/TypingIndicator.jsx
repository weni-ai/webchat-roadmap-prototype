import './TypingIndicator.scss';

/**
 * TypingIndicator - Shows animated typing indicator when user is typing
 * Displays three animated dots to indicate that someone is typing
 */
export function TypingIndicator() {
  const CLASS_DOT = 'weni-typing-indicator__dot';

  return (
    <section className="weni-typing-indicator">
      <span className={CLASS_DOT} />
      <span className={CLASS_DOT} />
      <span className={CLASS_DOT} />
    </section>
  );
}

export default TypingIndicator;
