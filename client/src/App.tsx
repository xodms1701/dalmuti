import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import Lobby from './components/Lobby';
import Room from './components/Room';
import Game from './components/Game';
import CreateRoom from './components/CreateRoom';

const App: React.FC = () => {
    return (
        <Provider store={store}>
            <Router>
                <Routes>
                    <Route path="/" element={<Lobby />} />
                    <Route path="/create" element={<CreateRoom />} />
                    <Route path="/room" element={<Room />} />
                    <Route path="/game" element={<Game />} />
                </Routes>
            </Router>
        </Provider>
    );
};

export default App;
