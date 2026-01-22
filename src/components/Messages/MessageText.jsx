import { useMemo } from 'react';
import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

import { filterMessageTags } from '@/utils/messageFilter';
import { QuickReplies } from './TextComponents/QuickReplies';
import { ListMessage } from './TextComponents/ListMessage';
import { CallToAction } from './TextComponents/CallToAction';

import './MessageText.scss';

// Configure marked once at module level (not in component)
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

/**
 * MessageText - Text message component with markdown support
 * Renders text with proper formatting, links, and markdown syntax
 * TODO: Add timestamp display
 * TODO: Show message status (sent, delivered, read)
 * TODO: Handle quick replies
 */
export function MessageText({ message, componentsEnabled, onNewBlock }) {
  const html = useMemo(() => {
    if (!message.text) return '';

    // Filter out metadata tags before processing
    const { text: filteredText } = filterMessageTags(message.text, {
      onNewBlock,
    });

    // If message is empty after filtering, return empty (FR-012)
    if (!filteredText.trim()) return '';

    const purifiedContent = DOMPurify.sanitize(filteredText);

    // Convert bullet points to proper Markdown list syntax
    const processedContent =
      purifiedContent
        // Convert • bullet points to proper Markdown list syntax
        .replace(/\n•\s*/g, '\n* ')
        // Handle cases where • appears at the start of content
        .replace(/^•\s*/g, '* ') +
      (message.status === 'streaming'
        ? '<span class="weni-message-text__caret" />'
        : '');

    return marked.parse(processedContent);
  }, [message.text, message.status]);

  return (
    <>
      <section
        className={`weni-message-text weni-message-text--${message.direction}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {message.quick_replies && (
        <QuickReplies
          quickReplies={message.quick_replies}
          disabled={!componentsEnabled}
        />
      )}

      {message.list_message && (
        <ListMessage
          buttonText={message.list_message.button_text}
          items={message.list_message.list_items}
          disabled={!componentsEnabled}
        />
      )}

      {message.cta_message && (
        <CallToAction
          buttonText={message.cta_message.display_text}
          url={message.cta_message.url}
          disabled={!componentsEnabled}
        />
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
    quick_replies: PropTypes.array,
    list_message: PropTypes.shape({
      button_text: PropTypes.string.isRequired,
      list_items: PropTypes.array.isRequired,
    }),
    cta_message: PropTypes.shape({
      url: PropTypes.string.isRequired,
      display_text: PropTypes.string.isRequired,
    }),
  }).isRequired,
  componentsEnabled: PropTypes.bool,
  onNewBlock: PropTypes.func,
};

export default MessageText;
