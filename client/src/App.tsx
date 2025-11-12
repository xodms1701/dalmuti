import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { SocketProvider, useSocketContext } from "./contexts/SocketContext";
import { trackPageView } from "./analytics";
import Lobby from "./pages/Lobby";
import Room from "./pages/Room";
import RoleSelection from "./pages/RoleSelection";
import SelectCardDeck from "./pages/SelectCardDeck";
import RevolutionSelection from "./pages/RevolutionSelection";
import TaxSelection from "./pages/TaxSelection";
import Play from "./pages/Play";
import VotePage from "./pages/VotePage";
import RankConfirmation from "./pages/RankConfirmation";
import { SpeedInsights } from "@vercel/speed-insights/react";

const AppContent: React.FC = () => {
  const { connect } = useSocketContext();
  const location = useLocation();

  useEffect(() => {
    connect();
  }, [connect]);

  // 페이지 변경 시 Google Analytics 추적
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

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
