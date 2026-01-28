import React, { useState, useEffect, useCallback } from 'react';
import { useWeniChat } from '@/hooks/useWeniChat';
import Header from '@/components/Header/Header';
import MessagesList from '@/components/Messages/MessagesList';
import InputBox from '@/components/Input/InputBox';
import PoweredBy from '@/components/common/PoweredBy';
import { AlreadyInUse } from '@/components/AlreadyInUse/AlreadyInUse';
import { ListMessage } from '@/views/ListMessage';
import VoiceModeOverlay from '@/components/VoiceMode/VoiceModeOverlay';
import { useChatContext } from '@/contexts/ChatContext';

function ChatContent() {
  const { isConnectionClosed, currentPage } = useWeniChat();

  if (isConnectionClosed) {
    return <AlreadyInUse />;
  }

  if (currentPage?.view === 'list-message') {
    return <ListMessage {...currentPage.props} />;
  }

  return <MessagesList />;
}

import './Chat.scss';
/**
 * Chat - Main chat container
 * TODO: Handle fullscreen mode
 * TODO: Add mobile responsiveness
 */
export function Chat() {
  const { isChatOpen, isConnectionClosed, currentPage, config } = useWeniChat();
  const {
    isVoiceModeActive,
    voiceModeState,
    voicePartialTranscript,
    voiceError,
    exitVoiceMode,
    enterVoiceMode,
  } = useChatContext();
  
  const [shouldRender, setShouldRender] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isChatOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);

      // Wait for animation to complete (0.25s from CSS)
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 250);

      return () => clearTimeout(timer);
    }
  }, [isChatOpen, shouldRender]);

  // Handle retry for voice mode errors
  const handleVoiceModeRetry = useCallback(async () => {
    exitVoiceMode();
    setTimeout(() => {
      enterVoiceMode();
    }, 100);
  }, [exitVoiceMode, enterVoiceMode]);

  if (!shouldRender) {
    return null;
  }

  return (
    <section
      className={`weni-chat ${isClosing ? 'weni-chat--closing' : ''} ${config.embedded ? 'weni-chat--disabled-animation' : ''}`}
    >
      <Header />
      <ChatContent />
      <footer className="weni-chat__footer">
        {!isConnectionClosed && !currentPage && <InputBox />}
        <PoweredBy />
      </footer>

      {/* Voice Mode Overlay - Inside chat container */}
      <VoiceModeOverlay
        isOpen={isVoiceModeActive}
        state={voiceModeState}
        partialTranscript={voicePartialTranscript}
        error={voiceError}
        onClose={exitVoiceMode}
        onRetry={handleVoiceModeRetry}
        texts={config.voiceMode?.texts}
      />
    </section>
  );
}

export default Chat;
