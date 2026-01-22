import { render } from '@testing-library/react';
import { MessageText } from './MessageText';

describe('MessageText - onNewBlock integration', () => {
  const createMessage = (text) => ({
    id: '1',
    type: 'text',
    text,
    timestamp: Date.now(),
    direction: 'incoming',
  });

  it('should pass onNewBlock callback to filterMessageTags', () => {
    const blocks = [];
    const message = createMessage('Text [[TAG]]content[[/TAG]] visible');

    render(
      <MessageText
        message={message}
        componentsEnabled={true}
        onNewBlock={(block) => blocks.push(block)}
      />,
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toBe('[[TAG]]content[[/TAG]]');
  });

  it('should call onNewBlock for multiple blocks', () => {
    const blocks = [];
    const message = createMessage('[[TAG1]]a[[/TAG1]] text [[TAG2]]b[[/TAG2]]');

    render(
      <MessageText
        message={message}
        componentsEnabled={true}
        onNewBlock={(block) => blocks.push(block)}
      />,
    );

    expect(blocks).toHaveLength(2);
    expect(blocks).toEqual(['[[TAG1]]a[[/TAG1]]', '[[TAG2]]b[[/TAG2]]']);
  });

  it('should work without onNewBlock callback (optional)', () => {
    const message = createMessage('Text [[TAG]]content[[/TAG]] visible');

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
      />,
    );

    // Should still filter tags
    expect(container.textContent).toContain('Text');
    expect(container.textContent).toContain('visible');
    expect(container.textContent).not.toContain('content');
  });

  it('should not call callback when no blocks present', () => {
    const callback = jest.fn();
    const message = createMessage('Just normal text');

    render(
      <MessageText
        message={message}
        componentsEnabled={true}
        onNewBlock={callback}
      />,
    );

    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle real-world search result example', () => {
    let receivedBlock = null;
    const message = createMessage(
      'Here are your results [[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]',
    );

    const { container } = render(
      <MessageText
        message={message}
        componentsEnabled={true}
        onNewBlock={(block) => {
          receivedBlock = block;
        }}
      />,
    );

    // User sees clean text
    expect(container.textContent).toContain('Here are your results');
    expect(container.textContent).not.toContain('NEXUS-1234');

    // Callback receives full block
    expect(receivedBlock).toBe('[[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]');
  });

  it('should call callback for nested blocks', () => {
    const blocks = [];
    const message = createMessage(
      '[[OUTER]]outer [[INNER]]inner[[/INNER]] more[[/OUTER]]',
    );

    render(
      <MessageText
        message={message}
        componentsEnabled={true}
        onNewBlock={(block) => blocks.push(block)}
      />,
    );

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toBe('[[INNER]]inner[[/INNER]]');
    expect(blocks[1]).toBe(
      '[[OUTER]]outer [[INNER]]inner[[/INNER]] more[[/OUTER]]',
    );
  });
});
