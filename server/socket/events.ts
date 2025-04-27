export enum SocketEvent {
  // 클라이언트에서 서버로 보내는 이벤트
  CREATE_GAME = 'createGame',
  JOIN_GAME = 'joinGame',
  LEAVE_GAME = 'leaveGame',
  READY = 'ready',
  START_GAME = 'startGame',
  SELECT_ROLE = 'selectRole',
  DEAL_CARDS = 'dealCards',
  SELECT_DECK = 'selectDeck',
  PLAY_CARD = 'playCard',
  PASS = 'pass',
  VOTE = 'vote',
  GET_GAME_STATE = 'getGameState',
  // 서버에서 클라이언트로 보내는 이벤트
  GAME_STATE_UPDATED = 'gameStateUpdated',
  GAME_CREATED = 'gameCreated',
  ALL_PLAYERS_READY = 'allPlayersReady',
  GAME_ENDED = 'gameEnded',
  NEXT_GAME_STARTED = 'nextGameStarted',
  ERROR = 'error',
}
