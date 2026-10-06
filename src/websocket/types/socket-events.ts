import { TChatMessage } from 'src/auth/types/messages.type';
import { JoinChatDto } from '../dto/join-chat.dto';
import { MessageSendDto } from '../dto/message-send.dto';

export type ServerToClientEvents = {
  'presence:sync': (data: ChatPresence[]) => void;

  'user:online': (data: {
    userId: string;
    online: true;
    lastSeen: null;
  }) => void;

  'user:offline': (data: {
    userId: string;
    online: false;
    lastSeen: Date | null;
  }) => void;

  'message:new': (message: TChatMessage) => void;
};

export type ClientToServerEvents = {
  'chat:join': (data: JoinChatDto) => void;
  'chat:send': (data: MessageSendDto) => void;
  'presence:request': () => void;
};

export type ChatPresence = {
  chatId: string;
  users: Users[];
};

type Users = {
  userId: string;
  online: boolean;
  lastSeen: Date | null;
};
