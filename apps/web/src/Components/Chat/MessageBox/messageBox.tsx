import React from 'react';
import * as S from "./messageBox.style";
import {Message} from "@/Hooks/Common/SendMessage/useChatMessages";
import { SERVER_URL } from "@/Api/client";

interface MessageBoxProps {
  message: Message;
}

const MessageBox: React.FC<MessageBoxProps> = ({ message }) => {
  const date = new Date(message.timestamp ?? "");

  const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (  
    <S.messageContainer>
      <S.messageTime>{formattedTime}</S.messageTime>
      <S.messageBox className="message-box">
        {message.message}
        {message.files?.map((file) => {
          const url = new URL(file, SERVER_URL).toString();
          const filename = decodeURIComponent(new URL(file, SERVER_URL).pathname.split("/").pop() ?? "첨부 파일");
          return <S.messageAttachment key={file} href={url} target="_blank" rel="noreferrer">{filename}</S.messageAttachment>;
        })}
      </S.messageBox>
    </S.messageContainer>
  );
};

export default MessageBox;
