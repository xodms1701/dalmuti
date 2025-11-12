import ReactGA from 'react-ga4';

// Google Analytics 초기화
export const initGA = () => {
  const measurementId = process.env.REACT_APP_GA_MEASUREMENT_ID;

  if (measurementId) {
    ReactGA.initialize(measurementId, {
      gaOptions: {
        siteSpeedSampleRate: 100, // 사이트 속도 측정 샘플 비율
      },
    });
    console.log('Google Analytics initialized');
  } else {
    console.warn('Google Analytics Measurement ID not found');
  }
};

// 페이지 뷰 추적
export const trackPageView = (path: string) => {
  ReactGA.send({ hitType: 'pageview', page: path });
};

// 커스텀 이벤트 추적
export const trackEvent = (category: string, action: string, label?: string, value?: number) => {
  ReactGA.event({
    category,
    action,
    label,
    value,
  });
};

// 게임 관련 이벤트 추적 헬퍼
export const trackGameEvent = {
  // 방 생성
  createRoom: (roomId: string) => {
    trackEvent('Game', 'Create Room', roomId);
  },

  // 방 참가
  joinRoom: (roomId: string) => {
    trackEvent('Game', 'Join Room', roomId);
  },

  // 게임 시작
  startGame: (playerCount: number) => {
    trackEvent('Game', 'Start Game', 'Players', playerCount);
  },

  // 게임 종료
  endGame: (duration: number) => {
    trackEvent('Game', 'End Game', 'Duration (seconds)', duration);
  },

  // 카드 플레이
  playCard: (cardValue: number, cardCount: number) => {
    trackEvent('Game', 'Play Card', `Value: ${cardValue}`, cardCount);
  },

  // 패스
  pass: () => {
    trackEvent('Game', 'Pass Turn');
  },
};
