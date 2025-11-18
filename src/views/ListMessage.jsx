import PropTypes from 'prop-types';
import Button from '@/components/common/Button';
import { MessageButton } from '@/components/common/MessageButton';
import { Radio } from '@/components/common/Radio';
import { useState } from 'react';
import { useWeniChat } from '@/hooks/useWeniChat';
import { useTranslation } from 'react-i18next';

import './ListMessage.scss';

export function ListMessage({ options }) {
  const { t } = useTranslation();
  const { setCurrentPage, sendMessage } = useWeniChat();
  const [selectedOption, setSelectedOption] = useState(null);

  const handleOptionChange = (option) => {
    setSelectedOption(option);
  };

  return (
    <section className="weni-view-list-message">
      <section className="weni-view-list-message__options">
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
        <section className="weni-view-list-message__instruction">
          {t('list_message.instruction')}
        </section>
      )}

      <footer className="weni-view-list-message__footer">
        <Button variant="tertiary" onClick={() => setCurrentPage(null)}>
          {t('list_message.actions.back')}
        </Button>

        <Button
          variant="primary"
          disabled={!selectedOption}
          onClick={() => {
            sendMessage(selectedOption);
            setCurrentPage(null);
          }}
        >
          {t('list_message.actions.send')}
        </Button>
      </footer>
    </section>
  )
}

ListMessage.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
};
