import { useMemo } from 'react';
import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

import { useChatContext } from '@/contexts/ChatContext';

import Button from '@/components/common/Button';

import './MessageText.scss';

/**
 * MessageText - Text message component with markdown support
 * Renders text with proper formatting, links, and markdown syntax
 * TODO: Add timestamp display
 * TODO: Show message status (sent, delivered, read)
 * TODO: Handle quick replies
 */
export function MessageText({ message, enableComponents }) {
  const { sendMessage } = useChatContext();

  const html = useMemo(() => {
    if (!message.text) return '';

    const purifiedContent = DOMPurify.sanitize(message.text);

    marked.use({
      breaks: true,
      useNewRenderer: true,
      renderer: {
        link(token) {
          if (typeof token === 'string' && token.includes('mailto:')) {
            return token.replace('mailto:', '');
          }
          return `<a target="_blank" href="${token.href || token}">${token.text || token}</a>`;
        },
      },
    });

    // Convert bullet points to proper Markdown list syntax
    const processedContent = purifiedContent
      // Convert • bullet points to proper Markdown list syntax
      .replace(/\n•\s*/g, '\n* ')
      // Handle cases where • appears at the start of content
      .replace(/^•\s*/g, '* ');

    return marked.parse(processedContent);
  }, [message.text]);
  
  return (
    <>
      <section 
        className={`weni-message-text weni-message-text--${message.direction}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {message.quick_replies && (
        <section className="weni-message-text__quick-replies">
          {message.quick_replies.map((reply) => (
            <Button key={reply} variant="secondary" disabled={!enableComponents} onClick={() => sendMessage(reply)}>{reply}</Button>
          ))}
        </section>
      )}
    </>
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
    quick_replies: PropTypes.array
  }).isRequired,
  enableComponents: PropTypes.bool
};

export default MessageText;

