import { render } from '@testing-library/react';
import { MessageText } from './MessageText';

describe('MessageText with tag filtering', () => {
  // Helper to create test message
  const createMessage = (text, overrides = {}) => ({
    id: '1',
    type: 'text',
    text,
    timestamp: Date.now(),
    direction: 'incoming',
    ...overrides,
  });

  // T041: Should not display tagged content in rendered output
  it('should not display tagged content in rendered output', () => {
    const message = createMessage(
      'Results [[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]] found',
    );

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
      />,
    );

    const textContent = container.textContent;
    expect(textContent).toContain('Results');
    expect(textContent).toContain('found');
    expect(textContent).not.toContain('NEXUS-1234');
    expect(textContent).not.toContain('SEARCH_RESULT');
    expect(textContent).not.toContain('[[');
    expect(textContent).not.toContain(']]');
  });

  // T042: Should preserve markdown after filtering
  it('should preserve markdown after filtering', () => {
    const message = createMessage(
      '[[TAG]]hidden[[/TAG]] **bold** text with *italic*',
    );

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
      />,
    );

    // Check markdown is rendered
    const boldElement = container.querySelector('strong');
    const italicElement = container.querySelector('em');

    expect(boldElement).toBeInTheDocument();
    expect(boldElement?.textContent).toBe('bold');
    expect(italicElement).toBeInTheDocument();
    expect(italicElement?.textContent).toBe('italic');

    // Verify tag was removed
    expect(container.textContent).not.toContain('hidden');
  });

  // T043: Should preserve links after filtering
  it('should preserve links after filtering', () => {
    const message = createMessage(
      '[[TAG]]hidden[[/TAG]] Check [this link](https://example.com)',
    );

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
      />,
    );

    const linkElement = container.querySelector('a');
    expect(linkElement).toBeInTheDocument();
    expect(linkElement?.getAttribute('href')).toBe('https://example.com');
    expect(linkElement?.textContent).toBe('this link');

    // Verify tag was removed
    expect(container.textContent).not.toContain('hidden');
  });

  // T044: Should handle message with only tags (no render)
  it('should handle message with only tags (no render)', () => {
    const message = createMessage('[[TAG]]only hidden content[[/TAG]]');

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
      />,
    );

    // Message should render empty
    const section = container.querySelector('.weni-message-text');
    expect(section).toBeInTheDocument();
    expect(section?.innerHTML.trim()).toBe('');
  });

  // T045: Should not affect quick_replies component
  it('should not affect quick_replies component', () => {
    const message = createMessage('[[TAG]]hidden[[/TAG]] Choose an option', {
      quick_replies: [
        { title: 'Option 1', payload: 'opt1' },
        { title: 'Option 2', payload: 'opt2' },
      ],
    });

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
      />,
    );

    // Text should be filtered
    expect(container.textContent).toContain('Choose an option');
    expect(container.textContent).not.toContain('hidden');

    // Quick replies should still render
    // Note: This assumes QuickReplies renders with specific class/structure
    // Adjust based on actual QuickReplies implementation
    expect(message.quick_replies).toHaveLength(2);
  });

  // T046: Should not affect cta_message component
  it('should not affect cta_message component', () => {
    const message = createMessage('[[TAG]]hidden[[/TAG]] Click below', {
      cta_message: {
        url: 'https://example.com',
        display_text: 'Visit Site',
      },
    });

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
      />,
    );

    // Text should be filtered
    expect(container.textContent).toContain('Click below');
    expect(container.textContent).not.toContain('hidden');

    // CTA should still be present in message object
    expect(message.cta_message).toBeDefined();
    expect(message.cta_message.url).toBe('https://example.com');
  });

  // Additional integration tests
  it('should handle empty message text', () => {
    const message = createMessage('');

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
      />,
    );

    const section = container.querySelector('.weni-message-text');
    expect(section).toBeInTheDocument();
    expect(section?.innerHTML.trim()).toBe('');
  });

  it('should handle message with multiple tags', () => {
    const message = createMessage(
      'Start [[TAG1]]hidden1[[/TAG1]] middle [[TAG2]]hidden2[[/TAG2]] end',
    );

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
      />,
    );

    const textContent = container.textContent;
    expect(textContent).toContain('Start');
    expect(textContent).toContain('middle');
    expect(textContent).toContain('end');
    expect(textContent).not.toContain('hidden1');
    expect(textContent).not.toContain('hidden2');
  });

  it('should handle nested tags', () => {
    const message = createMessage(
      'Text [[OUTER]]outer [[INNER]]inner[[/INNER]] more[[/OUTER]] visible',
    );

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
      />,
    );

    const textContent = container.textContent;
    expect(textContent).toContain('Text');
    expect(textContent).toContain('visible');
    expect(textContent).not.toContain('outer');
    expect(textContent).not.toContain('inner');
  });

  it('should handle list message with filtered text', () => {
    const message = createMessage('[[TAG]]hidden[[/TAG]] Choose from list', {
      list_message: {
        button_text: 'Select',
        list_items: [{ title: 'Item 1' }, { title: 'Item 2' }],
      },
    });

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
      />,
    );

    expect(container.textContent).toContain('Choose from list');
    expect(container.textContent).not.toContain('hidden');
    expect(message.list_message).toBeDefined();
  });

  it('should handle real-world example from spec', () => {
    const message = createMessage(
      'Here are your results [[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]',
    );

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
      />,
    );

    const textContent = container.textContent;
    expect(textContent).toContain('Here are your results');
    expect(textContent).not.toContain('NEXUS-1234');
    expect(textContent).not.toContain('SEARCH_RESULT');
  });

  it('should handle message with markdown and tags combined', () => {
    const message = createMessage(
      '## Heading\n\n[[TAG]]hidden[[/TAG]]\n\n- Item 1\n- Item 2\n\nMore text',
    );

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
      />,
    );

    // Check markdown is rendered
    const heading = container.querySelector('h2');
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent).toBe('Heading');

    // Check list is rendered
    const listItems = container.querySelectorAll('li');
    expect(listItems.length).toBeGreaterThan(0);

    // Verify tag was removed
    expect(container.textContent).not.toContain('hidden');
  });

  it('should handle streaming status with tags', () => {
    const message = createMessage('[[TAG]]hidden[[/TAG]] Streaming text', {
      status: 'streaming',
    });

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
      />,
    );

    expect(container.textContent).toContain('Streaming text');
    expect(container.textContent).not.toContain('hidden');

    // Check for streaming caret
    const caret = container.querySelector('.weni-message-text__caret');
    expect(caret).toBeInTheDocument();
  });
});
