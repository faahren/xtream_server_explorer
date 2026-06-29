import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const HomeContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
  @media (min-width: 768px) { padding: 2rem; }
`;

const Hero = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  @media (min-width: 768px) { margin-bottom: 3rem; }
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #333;
  margin-bottom: 0.5rem;
  @media (min-width: 768px) { font-size: 3rem; }
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: #666;
  @media (min-width: 768px) { font-size: 1.2rem; }
`;

const SectionTitle = styled.h2`
  color: #333;
  font-size: 1.2rem;
  margin-bottom: 1rem;
  @media (min-width: 768px) { font-size: 1.5rem; }
`;

const RecentSection = styled.div`
  margin-bottom: 2.5rem;
`;

const RecentScroll = styled.div`
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 0.75rem;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 2px; }
  &::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }
`;

const RecentCard = styled.div`
  flex-shrink: 0;
  width: 120px;
  cursor: pointer;
  @media (min-width: 768px) { width: 140px; }
`;

const RecentCover = styled.div`
  width: 100%;
  aspect-ratio: 2/3;
  border-radius: 8px;
  overflow: hidden;
  background: #f0f0f0;
  margin-bottom: 0.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  transition: transform 0.2s;
  ${RecentCard}:hover & { transform: scale(1.04); }
`;

const RecentCoverImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const RecentName = styled.p`
  font-size: 0.75rem;
  color: #333;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
`;

const RecentBadge = styled.span`
  display: inline-block;
  font-size: 0.65rem;
  background: #667eea;
  color: white;
  border-radius: 3px;
  padding: 0.1rem 0.3rem;
  margin-bottom: 0.25rem;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 1rem;
  }
`;

const FeatureCard = styled(Link)`
  background: white;
  padding: 1.25rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  text-decoration: none;
  color: inherit;
  transition: transform 0.3s, box-shadow 0.3s;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 15px rgba(0,0,0,0.2);
  }
  @media (min-width: 768px) { padding: 2rem; }
`;

const FeatureTitle = styled.h3`
  color: #667eea;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  @media (min-width: 768px) { font-size: 1.25rem; margin-bottom: 1rem; }
`;

const FeatureDescription = styled.p`
  color: #666;
  line-height: 1.5;
  font-size: 0.8rem;
  display: none;
  @media (min-width: 768px) { display: block; font-size: 1rem; }
`;

const NoCoverBox = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
`;

function Home() {
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const items = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      setRecentlyViewed(items);
    } catch (_) {}
  }, []);

  const handleRecentClick = (item) => {
    if (item.type === 'series') navigate(`/series/${item.id}`);
  };

  return (
    <HomeContainer>
      <Hero>
        <Title>IPTV Manager</Title>
        <Subtitle>Playlists IPTV · Séries · Films · Téléchargements</Subtitle>
      </Hero>

      {recentlyViewed.length > 0 && (
        <RecentSection>
          <SectionTitle>Récemment consultés</SectionTitle>
          <RecentScroll>
            {recentlyViewed.map((item) => (
              <RecentCard key={`${item.type}-${item.id}`} onClick={() => handleRecentClick(item)}>
                <RecentCover>
                  {item.cover && item.cover !== 'N/A' ? (
                    <RecentCoverImg src={item.cover} alt={item.name} />
                  ) : (
                    <NoCoverBox>📺</NoCoverBox>
                  )}
                </RecentCover>
                <div style={{ textAlign: 'center' }}>
                  <RecentBadge>{item.type === 'series' ? 'Série' : 'Film'}</RecentBadge>
                  <RecentName>{item.name}</RecentName>
                </div>
              </RecentCard>
            ))}
          </RecentScroll>
        </RecentSection>
      )}

      <FeaturesGrid>
        <FeatureCard to="/series">
          <FeatureTitle>📺 Séries</FeatureTitle>
          <FeatureDescription>Parcourez votre collection de séries TV et téléchargez vos épisodes.</FeatureDescription>
        </FeatureCard>

        <FeatureCard to="/movies">
          <FeatureTitle>🎬 Films</FeatureTitle>
          <FeatureDescription>Parcourez votre collection de films et téléchargez facilement.</FeatureDescription>
        </FeatureCard>

        <FeatureCard to="/playlist">
          <FeatureTitle>📋 Playlist</FeatureTitle>
          <FeatureDescription>Gérez vos playlists IPTV et recherchez des chaînes par catégorie.</FeatureDescription>
        </FeatureCard>

        <FeatureCard to="/downloads">
          <FeatureTitle>⚡ Téléchargements</FeatureTitle>
          <FeatureDescription>Suivez vos téléchargements aria2 en cours et terminés.</FeatureDescription>
        </FeatureCard>
      </FeaturesGrid>
    </HomeContainer>
  );
}

export default Home;
