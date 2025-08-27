import React from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Series from './pages/Series';
import SeriesDetail from './pages/SeriesDetail';
import Playlist from './pages/Playlist';
import Downloads from './pages/Downloads';
import Movies from './pages/Movies';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #f5f5f5;
`;

const Content = styled.main`
  padding-top: 60px;
`;

function App() {
  return (
    <AppContainer>
      <Navbar />
      <Content>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/series" element={<Series />} />
          <Route path="/series/:id" element={<SeriesDetail />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/playlist" element={<Playlist />} />
          <Route path="/downloads" element={<Downloads />} />
        </Routes>
      </Content>
    </AppContainer>
  );
}

export default App;
