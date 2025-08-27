import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';

const SeriesContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
`;

const SearchContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  min-width: 300px;
`;

const SearchButton = styled.button`
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

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
`;

const SortSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const SeriesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
`;

const SeriesCard = styled.div`
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0,0,0,0.2);
  }
`;

const SeriesImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
`;

const SeriesContent = styled.div`
  padding: 1.5rem;
`;

const SeriesTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.2rem;
`;

const SeriesInfo = styled.div`
  margin-bottom: 1rem;
  
  p {
    margin: 0.5rem 0;
    color: #666;
    font-size: 0.9rem;
  }
`;

const ViewButton = styled(Link)`
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  text-align: center;
  transition: background 0.3s;
  
  &:hover {
    background: #5a6fd8;
  }
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

const LoadMoreButton = styled.button`
  display: block;
  margin: 2rem auto 0;
  padding: 0.75rem 1.5rem;
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

function Series() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSeries, setFilteredSeries] = useState([]);
  const [displayCount, setDisplayCount] = useState(20);
  const [sortBy, setSortBy] = useState('');

  useEffect(() => {
    fetchSeries();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSeries(series);
    } else {
      const filtered = series.filter(s => 
        s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSeries(filtered);
    }
    setDisplayCount(20); // Reset display count when search changes
  }, [searchQuery, series]);

  const fetchSeries = async (refresh = false) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/series?refresh=${refresh}`);
      setSeries(response.data);
      setFilteredSeries(response.data);
    } catch (err) {
      setError('Failed to fetch series');
      console.error('Error fetching series:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSeries(true);
  };

  const handleSearch = () => {
    // Search is handled by useEffect
  };

  const handleLoadMore = () => {
    setDisplayCount(prevCount => prevCount + 20);
  };

  const sortSeries = (series) => {
    switch(sortBy) {
      case 'release-desc':
        return [...series].sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
      case 'release-asc':
        return [...series].sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
      case 'modified-desc':
        return [...series].sort((a, b) => b.last_modified - a.last_modified);
      case 'modified-asc':
        return [...series].sort((a, b) => a.last_modified - b.last_modified);
      case 'rating-desc':
        return [...series].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
      case 'rating-asc':
        return [...series].sort((a, b) => parseFloat(a.rating) - parseFloat(b.rating));
      default:
        return series;
    }
  };

  if (loading) return <Loading>Loading series...</Loading>;
  if (error) return <Error>{error}</Error>;

  const displayedSeries = sortSeries(filteredSeries).slice(0, displayCount);

  return (
    <SeriesContainer>
      <Header>
        <Title>Series</Title>
        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Search series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <SortSelect
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="">Sort by...</option>
            <option value="release-desc">Release Date (Newest)</option>
            <option value="release-asc">Release Date (Oldest)</option>
            <option value="modified-desc">Last Modified (Newest)</option>
            <option value="modified-asc">Last Modified (Oldest)</option>
            <option value="rating-desc">Rating (Highest)</option>
            <option value="rating-asc">Rating (Lowest)</option>
          </SortSelect>
          <SearchButton onClick={handleSearch}>Search</SearchButton>
          <RefreshButton onClick={handleRefresh}>Refresh</RefreshButton>
        </SearchContainer>
      </Header>

      <SeriesGrid>
        {displayedSeries.map((s) => (
          <SeriesCard key={s.series_id}>
            {s.cover && s.cover !== 'N/A' ? (
              <SeriesImage src={s.cover} alt={s.name} />
            ) : (
              <div style={{ height: '200px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                No Image
              </div>
            )}
            <SeriesContent>
              <SeriesTitle>{s.name}</SeriesTitle>
              <SeriesInfo>
                {s.release_date && s.release_date !== 'N/A' && (
                  <p><strong>Release Date:</strong> {s.release_date}</p>
                )}
                {s.rating && s.rating !== 'N/A' && (
                  <p><strong>Rating:</strong> {s.rating}</p>
                )}
                {s.episode_run_time && s.episode_run_time !== 'N/A' && (
                  <p><strong>Duration:</strong> {s.episode_run_time} min</p>
                )}
                {s.genre && s.genre !== 'N/A' && (
                  <p><strong>Genre:</strong> {s.genre}</p>
                )}
              </SeriesInfo>
              <ViewButton to={`/series/${s.series_id}`}>
                View Details
              </ViewButton>
            </SeriesContent>
          </SeriesCard>
        ))}
      </SeriesGrid>
      
      {displayedSeries.length < filteredSeries.length && (
        <LoadMoreButton onClick={handleLoadMore}>
          Load More
        </LoadMoreButton>
      )}
    </SeriesContainer>
  );
}

export default Series;
