import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SocketProvider, useSocketContext } from "./contexts/SocketContext";
import Lobby from "./pages/Lobby";
import Room from "./pages/Room";
import RoleSelection from "./pages/RoleSelection";
import SelectCardDeck from "./pages/SelectCardDeck";
import Play from "./pages/Play";
const AppContent: React.FC = () => {
  const { connect } = useSocketContext();

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <Routes>
      <Route path="/" element={<Lobby />} />
      <Route path="/room" element={<Room />} />
      <Route path="/role-selection" element={<RoleSelection />} />
      <Route path="/select-card-deck" element={<SelectCardDeck />} />
      <Route path="/play" element={<Play />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </Router>
  );
};

export default App;
