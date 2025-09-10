export interface User {
  id: string;
  username: string;
  isOnline: boolean;
  isInGame: boolean;
}

export interface GameInvitation {
  id: string;
  fromUser: User;
  toUser: User;
  status: 'pending' | 'accepted' | 'declined';
}