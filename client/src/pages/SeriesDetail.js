import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';

const DetailContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const BackButton = styled.button`
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  
  &:hover {
    background: #5a6fd8;
  }
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
`;

const SeriesInfo = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  margin-bottom: 3rem;
`;

const CoverImage = styled.img`
  width: 100%;
  max-width: 300px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
`;

const InfoContent = styled.div`
  h2 {
    color: #333;
    margin-bottom: 1rem;
  }
  
  p {
    margin: 0.5rem 0;
    color: #666;
    line-height: 1.6;
  }
`;

const EpisodesSection = styled.div`
  h2 {
    color: #333;
    margin-bottom: 1.5rem;
  }
`;

const SeasonExpander = styled.div`
  margin-bottom: 1rem;
`;

const SeasonHeader = styled.div`
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  
  &:hover {
    background: #e9ecef;
  }
`;

const EpisodeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1rem;
  margin-left: 1rem;
`;

const EpisodeCard = styled.div`
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const EpisodeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const EpisodeTitle = styled.h4`
  margin: 0;
  color: #333;
  font-size: 1rem;
`;

const DownloadButton = styled.button`
  padding: 0.5rem 1rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  
  &:hover {
    background: #218838;
  }
  
  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

const EpisodeImage = styled.img`
  width: 100px;
  height: 60px;
  object-fit: cover;
  border-radius: 5px;
  margin-bottom: 0.5rem;
`;

const Loading = styled.div`
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: #666;
`;

const Error = styled.div`
  text-align: center;
  padding: 2rem;
  color: #e74c3c;
  font-size: 1.2rem;
`;

function SeriesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seriesData, setSeriesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSeasons, setExpandedSeasons] = useState(new Set());
  const [downloadedEpisodes, setDownloadedEpisodes] = useState(new Set());

  useEffect(() => {
    fetchSeriesData();
  }, [id]);

  const fetchSeriesData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/series/${id}`);
      setSeriesData(response.data);
    } catch (err) {
      setError('Failed to fetch series data');
      console.error('Error fetching series data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSeason = (seasonNum) => {
    const newExpanded = new Set(expandedSeasons);
    if (newExpanded.has(seasonNum)) {
      newExpanded.delete(seasonNum);
    } else {
      newExpanded.add(seasonNum);
    }
    setExpandedSeasons(newExpanded);
  };

  const handleDownload = async (episodeId, episodeTitle, container_extension) => {
    try {
      const type = 'series';
      const response = await axios.post('/api/download', {
        type: type,
        name: episodeTitle,
        id: episodeId,
        container_extension: container_extension
      });
      
      if (response.data.success) {
        setDownloadedEpisodes(prev => new Set([...prev, episodeId]));
        alert('Download started successfully!');
      }
    } catch (err) {
      alert('Failed to start download');
      console.error('Download error:', err);
    }
  };

  if (loading) return <Loading>Loading series details...</Loading>;
  if (error) return <Error>{error}</Error>;
  if (!seriesData) return <Error>No series data found</Error>;

  const { info, episodes } = seriesData;

  return (
    <DetailContainer>
      <Header>
        <BackButton onClick={() => navigate('/series')}>
          ← Back to Series
        </BackButton>
        <Title>{info.name}</Title>
      </Header>

      <SeriesInfo>
        <div>
          {info.cover && info.cover !== 'N/A' ? (
            <CoverImage src={info.cover} alt={info.name} />
          ) : (
            <div style={{ width: '300px', height: '400px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
              No Image
            </div>
          )}
        </div>
        
        <InfoContent>
          <h2>Series Information</h2>
          {info.plot && info.plot !== 'N/A' && (
            <p><strong>Plot:</strong> {info.plot}</p>
          )}
          {info.release_date && info.release_date !== 'N/A' && (
            <p><strong>Release Date:</strong> {info.release_date}</p>
          )}
          {info.rating && info.rating !== 'N/A' && (
            <p><strong>Rating:</strong> {info.rating}</p>
          )}
          {info.genre && info.genre !== 'N/A' && (
            <p><strong>Genre:</strong> {info.genre}</p>
          )}
          {info.cast && info.cast !== 'N/A' && (
            <p><strong>Cast:</strong> {info.cast}</p>
          )}
        </InfoContent>
      </SeriesInfo>

      <EpisodesSection>
        <h2>Episodes</h2>
        {episodes && Object.keys(episodes).length > 0 ? (
          Object.keys(episodes).sort((a, b) => parseInt(a) - parseInt(b)).map(seasonNum => {
            const seasonEpisodes = episodes[seasonNum];
            const isExpanded = expandedSeasons.has(seasonNum);
            
            return (
              <SeasonExpander key={seasonNum}>
                <SeasonHeader onClick={() => toggleSeason(seasonNum)}>
                  <span>Season {seasonNum} ({seasonEpisodes.length} episodes)</span>
                  <span>{isExpanded ? '▼' : '▶'}</span>
                </SeasonHeader>
                
                {isExpanded && (
                  <EpisodeGrid>
                    {seasonEpisodes.map(episode => (
                      <EpisodeCard key={episode.id}>
                        <EpisodeHeader>
                          <EpisodeTitle>
                            Episode {episode.episode_num}: {episode.title}
                          </EpisodeTitle>
                          <DownloadButton
                            onClick={() => handleDownload(episode.id, episode.title, episode.container_extension)}
                            disabled={downloadedEpisodes.has(episode.id)}
                          >
                            {downloadedEpisodes.has(episode.id) ? '✓ Downloaded' : 'Download'}
                          </DownloadButton>
                        </EpisodeHeader>
                        
                        {episode.info && episode.info.movie_image && (
                          <EpisodeImage src={episode.info.movie_image} alt="Episode" />
                        )}
                        
                        {episode.info && episode.info.plot && (
                          <p><strong>Plot:</strong> {episode.info.plot}</p>
                        )}
                        
                        {episode.info && episode.info.duration && (
                          <p><strong>Duration:</strong> {episode.info.duration}</p>
                        )}
                        
                        {episode.info && episode.info.air_date && (
                          <p><strong>Air Date:</strong> {episode.info.air_date}</p>
                        )}

                      </EpisodeCard>
                    ))}
                  </EpisodeGrid>
                )}
              </SeasonExpander>
            );
          })
        ) : (
          <p>No episodes found for this series.</p>
        )}
      </EpisodesSection>
    </DetailContainer>
  );
}

export default SeriesDetail;
