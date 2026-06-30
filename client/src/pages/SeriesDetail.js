import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';

const DetailContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  @media (min-width: 768px) { padding: 2rem; }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const BackButton = styled.button`
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  white-space: nowrap;
  &:hover { background: #5a6fd8; }
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
  font-size: 1.3rem;
  @media (min-width: 768px) { font-size: 2rem; }
`;

const SeriesInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 2rem;
    margin-bottom: 3rem;
  }
`;

const CoverImage = styled.img`
  width: 100%;
  max-width: 200px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  @media (min-width: 768px) { max-width: 300px; }
`;

const InfoContent = styled.div`
  h2 { color: #333; margin-bottom: 1rem; font-size: 1.1rem; }
  p { margin: 0.5rem 0; color: #666; line-height: 1.6; font-size: 0.9rem; }
  @media (min-width: 768px) {
    h2 { font-size: 1.5rem; }
    p { font-size: 1rem; }
  }
`;

const EpisodesSection = styled.div`
  h2 { color: #333; margin-bottom: 1.5rem; }
`;

const SeasonExpander = styled.div`
  margin-bottom: 1rem;
`;

const SeasonHeader = styled.div`
  background: #f8f9fa;
  padding: 0.75rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
  &:hover { background: #e9ecef; }
`;

const SeasonTitle = styled.span`
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
`;

const SeasonActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DownloadSeasonButton = styled.button`
  padding: 0.3rem 0.75rem;
  background: #fd7e14;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
  &:hover { background: #e8690b; }
  &:disabled { background: #6c757d; cursor: not-allowed; }
`;

const EpisodeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-left: 0;
  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1rem;
    margin-left: 1rem;
  }
`;

const EpisodeCard = styled.div`
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  @media (min-width: 768px) { padding: 1rem; }
`;

const EpisodeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const EpisodeTitle = styled.h4`
  margin: 0;
  color: #333;
  font-size: 0.85rem;
  line-height: 1.3;
  @media (min-width: 768px) { font-size: 1rem; }
`;

const DownloadButton = styled.button`
  padding: 0.4rem 0.75rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
  flex-shrink: 0;
  &:hover { background: #218838; }
  &:disabled { background: #6c757d; cursor: not-allowed; }
`;

const EpisodeImage = styled.img`
  width: 100%;
  max-width: 160px;
  height: auto;
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

const Toast = styled.div`
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.9rem;
  z-index: 1000;
  pointer-events: none;
`;

function saveRecentlyViewed(item) {
  axios.post('/api/recently-viewed', item).catch(() => {});
}

function SeriesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seriesData, setSeriesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSeasons, setExpandedSeasons] = useState(new Set());
  const [downloadedEpisodes, setDownloadedEpisodes] = useState(new Set());
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchSeriesData(); }, [id]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const fetchSeriesData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/series/${id}`);
      setSeriesData(response.data);
      if (response.data?.info) {
        saveRecentlyViewed({
          type: 'series',
          item_id: id,
          name: response.data.info.name,
          cover: response.data.info.cover,
        });
      }
    } catch (err) {
      setError('Failed to fetch series data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSeason = (seasonNum) => {
    const newExpanded = new Set(expandedSeasons);
    if (newExpanded.has(seasonNum)) newExpanded.delete(seasonNum);
    else newExpanded.add(seasonNum);
    setExpandedSeasons(newExpanded);
  };

  const handleDownload = async (episodeId, episodeTitle, container_extension) => {
    try {
      const response = await axios.post('/api/download', {
        type: 'series',
        name: episodeTitle,
        id: episodeId,
        container_extension: container_extension,
      });
      if (response.data.success) {
        setDownloadedEpisodes(prev => new Set([...prev, episodeId]));
        showToast(`Download started: ${episodeTitle}`);
      }
    } catch (err) {
      showToast('Failed to start download');
    }
  };

  const handleDownloadSeason = async (seasonEpisodes, seasonNum) => {
    let count = 0;
    for (const ep of seasonEpisodes) {
      try {
        const response = await axios.post('/api/download', {
          type: 'series',
          name: ep.title,
          id: ep.id,
          container_extension: ep.container_extension,
        });
        if (response.data.success) {
          setDownloadedEpisodes(prev => new Set([...prev, ep.id]));
          count++;
        }
      } catch (_) {}
    }
    showToast(`Season ${seasonNum}: ${count} downloads started`);
  };

  if (loading) return <Loading>Loading series details...</Loading>;
  if (error) return <Error>{error}</Error>;
  if (!seriesData) return <Error>No series data found</Error>;

  const { info, episodes } = seriesData;

  return (
    <DetailContainer>
      <Header>
        <BackButton onClick={() => navigate('/series')}>← Back</BackButton>
        <Title>{info.name}</Title>
      </Header>

      <SeriesInfo>
        <div>
          {info.cover && info.cover !== 'N/A' ? (
            <CoverImage src={info.cover} alt={info.name} />
          ) : (
            <div style={{ width: '160px', height: '240px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
              No Image
            </div>
          )}
        </div>

        <InfoContent>
          <h2>Series Information</h2>
          {info.plot && info.plot !== 'N/A' && <p><strong>Plot:</strong> {info.plot}</p>}
          {info.release_date && info.release_date !== 'N/A' && <p><strong>Release:</strong> {info.release_date}</p>}
          {info.rating && info.rating !== 'N/A' && <p><strong>Rating:</strong> {info.rating}</p>}
          {info.genre && info.genre !== 'N/A' && <p><strong>Genre:</strong> {info.genre}</p>}
          {info.cast && info.cast !== 'N/A' && <p><strong>Cast:</strong> {info.cast}</p>}
        </InfoContent>
      </SeriesInfo>

      <EpisodesSection>
        <h2>Episodes</h2>
        {episodes && Object.keys(episodes).length > 0 ? (
          Object.keys(episodes).sort((a, b) => parseInt(a) - parseInt(b)).map(seasonNum => {
            const seasonEpisodes = episodes[seasonNum];
            const isExpanded = expandedSeasons.has(seasonNum);
            const allDownloaded = seasonEpisodes.every(ep => downloadedEpisodes.has(ep.id));

            return (
              <SeasonExpander key={seasonNum}>
                <SeasonHeader onClick={() => toggleSeason(seasonNum)}>
                  <SeasonTitle>Season {seasonNum} ({seasonEpisodes.length} episodes)</SeasonTitle>
                  <SeasonActions>
                    <DownloadSeasonButton
                      disabled={allDownloaded}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadSeason(seasonEpisodes, seasonNum);
                      }}
                    >
                      {allDownloaded ? '✓ All queued' : '⬇ Download season'}
                    </DownloadSeasonButton>
                    <span>{isExpanded ? '▼' : '▶'}</span>
                  </SeasonActions>
                </SeasonHeader>

                {isExpanded && (
                  <EpisodeGrid>
                    {seasonEpisodes.map(episode => (
                      <EpisodeCard key={episode.id}>
                        <EpisodeHeader>
                          <EpisodeTitle>Ep {episode.episode_num}: {episode.title}</EpisodeTitle>
                          <DownloadButton
                            onClick={() => handleDownload(episode.id, episode.title, episode.container_extension)}
                            disabled={downloadedEpisodes.has(episode.id)}
                          >
                            {downloadedEpisodes.has(episode.id) ? '✓' : '⬇'}
                          </DownloadButton>
                        </EpisodeHeader>

                        {episode.info?.movie_image && (
                          <EpisodeImage src={episode.info.movie_image} alt="Episode" />
                        )}
                        {episode.info?.plot && <p style={{ fontSize: '0.8rem', color: '#666', margin: '0.25rem 0' }}>{episode.info.plot}</p>}
                        {episode.info?.duration && <p style={{ fontSize: '0.8rem', color: '#999', margin: '0.25rem 0' }}>⏱ {episode.info.duration}</p>}
                        {episode.info?.air_date && <p style={{ fontSize: '0.8rem', color: '#999', margin: '0.25rem 0' }}>📅 {episode.info.air_date}</p>}
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

      {toast && <Toast>{toast}</Toast>}
    </DetailContainer>
  );
}

export default SeriesDetail;
