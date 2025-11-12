import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { SocketProvider, useSocketContext } from "./contexts/SocketContext";
import { trackPageView } from "./analytics";
import { useGameStore } from "./store/gameStore";
import Lobby from "./pages/Lobby";
import Room from "./pages/Room";
import RoleSelection from "./pages/RoleSelection";
import SelectCardDeck from "./pages/SelectCardDeck";
import RevolutionSelection from "./pages/RevolutionSelection";
import TaxSelection from "./pages/TaxSelection";
import Play from "./pages/Play";
import VotePage from "./pages/VotePage";
import RankConfirmation from "./pages/RankConfirmation";
import { SpeedInsights } from '@vercel/speed-insights/react';

const AppContent: React.FC = () => {
  const { connect } = useSocketContext();
  const location = useLocation();
  const navigate = useNavigate();
  const game = useGameStore((state) => state.game);

  useEffect(() => {
    connect();
  }, [connect]);

  // 페이지 변경 시 Google Analytics 추적
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  // 전역 페이즈 전환 로직: 게임 페이즈가 변경되면 자동으로 올바른 페이지로 이동
  useEffect(() => {
    if (!game) return;

    const currentPath = location.pathname;
    let targetPath: string | null = null;

    // 페이즈별 타겟 경로 결정
    switch (game.phase) {
      case "revolution":
        targetPath = "/revolution";
        break;
      case "tax":
        targetPath = "/tax";
        break;
      case "playing":
        targetPath = "/play";
        break;
      case "gameEnd":
        if (game.isVoting) {
          targetPath = "/vote";
        }
        break;
      default:
        // 다른 페이즈는 각 컴포넌트에서 처리
        break;
    }

    // 현재 경로와 타겟 경로가 다르면 이동
    if (targetPath && currentPath !== targetPath) {
      console.log(`[Global Phase Transition] ${game.phase}: ${currentPath} -> ${targetPath}`);
      navigate(targetPath);
    }
  }, [game?.phase, game?.isVoting, location.pathname, navigate, game]);

  return (
    <Routes>
      <Route path="/" element={<Lobby />} />
      <Route path="/room" element={<Room />} />
      <Route path="/role-selection" element={<RoleSelection />} />
      <Route path="/select-card-deck" element={<SelectCardDeck />} />
      <Route path="/revolution" element={<RevolutionSelection />} />
      <Route path="/tax" element={<TaxSelection />} />
      <Route path="/play" element={<Play />} />
      <Route path="/vote" element={<VotePage />} />
      <Route path="/rank-confirmation" element={<RankConfirmation />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <>
      <Router>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </Router>
      <SpeedInsights />
    </>
  );
};

export default App;
