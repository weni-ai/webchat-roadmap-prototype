import PropTypes from 'prop-types';
import Button from '@/components/common/Button';
import { MessageButton } from '@/components/common/MessageButton';
import { Radio } from '@/components/common/Radio';
import { useState } from 'react';
import { useWeniChat } from '@/hooks/useWeniChat';

import './QuickReplies.scss';

export function QuickReplies({ options }) {
  const { currentPage, sendMessage } = useWeniChat();
  const [selectedOption, setSelectedOption] = useState(null);

  const handleOptionChange = (option) => {
    setSelectedOption(option);
  };

  return (
    <section className="weni-view-quick-replies">
      <section className="weni-view-quick-replies__options">
        {options.map((option) => (
          <MessageButton
            key={option}
            alignContent="start"
            onClick={() => handleOptionChange(option)}
          >
            <Radio
              value={option}
              checked={selectedOption === option}
              name={option}
              id={option}
              label={option}
            />
          </MessageButton>
        ))}
      </section>

      {!selectedOption && (
        <section className="weni-view-quick-replies__instruction">
          Tap to select an item
        </section>
      )}

      <footer className="weni-view-quick-replies__footer">
        <Button variant="tertiary" onClick={() => currentPage.goBack()}>Back</Button>
        <Button
          variant="primary"
          disabled={!selectedOption}
          onClick={() => {
            sendMessage(selectedOption);
            currentPage.goBack();
          }}
        >
          Send
        </Button>
      </footer>
    </section>
  )
}

QuickReplies.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
};
