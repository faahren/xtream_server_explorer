import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const HomeContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Hero = styled.div`
  text-align: center;
  margin-bottom: 4rem;
`;

const Title = styled.h1`
  font-size: 3rem;
  color: #333;
  margin-bottom: 1rem;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 2rem;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
`;

const FeatureCard = styled(Link)`
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  text-decoration: none;
  color: inherit;
  transition: transform 0.3s, box-shadow 0.3s;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0,0,0,0.2);
  }
`;

const FeatureTitle = styled.h3`
  color: #667eea;
  margin-bottom: 1rem;
`;

const FeatureDescription = styled.p`
  color: #666;
  line-height: 1.6;
`;

function Home() {
  return (
    <HomeContainer>
      <Hero>
        <Title>IPTV TV Manager</Title>
        <Subtitle>
          Gestionnaire complet de playlists IPTV avec gestion des séries et téléchargements
        </Subtitle>
      </Hero>
      
      <FeaturesGrid>
        <FeatureCard to="/series">
          <FeatureTitle>📺 Gestion des Séries</FeatureTitle>
          <FeatureDescription>
            Parcourez votre collection de séries TV, consultez les détails des épisodes
            et téléchargez facilement vos contenus préférés.
          </FeatureDescription>
        </FeatureCard>

        <FeatureCard to="/movies">
          <FeatureTitle>📺 Gestion des Films</FeatureTitle>
          <FeatureDescription>
            Parcourez votre collection de films, consultez les détails des films
            et téléchargez facilement vos contenus préférés.
          </FeatureDescription>
        </FeatureCard>
        
        <FeatureCard to="/playlist">
          <FeatureTitle>📋 Gestion des Playlists</FeatureTitle>
          <FeatureDescription>
            Gérez vos playlists IPTV, recherchez des chaînes par catégorie
            et téléchargez du contenu en direct.
          </FeatureDescription>
        </FeatureCard>
        
        <FeatureCard to="/downloads">
          <FeatureTitle>⚡ Téléchargements Rapides</FeatureTitle>
          <FeatureDescription>
            Utilisez aria2 pour des téléchargements rapides et fiables
            avec gestion automatique des noms de fichiers.
          </FeatureDescription>
        </FeatureCard>
      </FeaturesGrid>
    </HomeContainer>
  );
}

export default Home;
