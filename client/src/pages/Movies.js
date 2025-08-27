import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const MoviesContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 300px;
`;

const CategorySelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const SortSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const MovieGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 2rem;
`;

const MovieCard = styled.div`
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.3s;

  &:hover {
    transform: translateY(-5px);
  }
`;

const MovieImage = styled.img`
  width: 100%;
  height: 300px;
  object-fit: cover;
`;

const MovieInfo = styled.div`
  padding: 1rem;
`;

const MovieTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: #333;
`;

const MovieCategory = styled.p`
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #666;
`;

const MovieRating = styled.div`
  color: #f39c12;
  font-weight: bold;
`;

const MovieAdded = styled.div`
  color: #666;
  font-size: 0.8rem;
  margin-top: 0.5rem;
`;

const LoadMoreButton = styled.button`
  margin: 2rem auto;
  display: block;
  padding: 0.8rem 2rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;

  &:hover {
    background: #764ba2;
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

const DownloadButton = styled.button`
  padding: 0.5rem 1rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  width: 100%;
  margin-top: 0.5rem;
  
  &:hover {
    background: #218838;
  }
  
  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

function Movies() {
  const [movies, setMovies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [visibleMovies, setVisibleMovies] = useState(20);
  const [downloadedMovies, setDownloadedMovies] = useState(new Set());
  const [sortBy, setSortBy] = useState('');

  useEffect(() => {
    fetchMovies(false);
  }, []);

  const fetchMovies = async (refresh = false) => {
    try {
      const response = await axios.get(`/api/movies?refresh=${refresh}`);
      setMovies(response.data.movies || []);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching movies:', error);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.category_id === categoryId);
    return category ? category.category_name : 'Unknown Category';
  };

  const handleDownload = async (movieId, movieTitle, container_extension) => {
    try {
      const type = 'movie';
      const response = await axios.post('/api/download', {
        type: type,
        name: movieTitle,
        id: movieId,
        container_extension: container_extension
      });
      
      if (response.data.success) {
        setDownloadedMovies(prev => new Set([...prev, movieId]));
        alert('Download started successfully!');
      }
    } catch (err) {
      alert('Failed to start download');
      console.error('Download error:', err);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const sortMovies = (movies) => {
    switch(sortBy) {
      case 'added-desc':
        return [...movies].sort((a, b) => b.added - a.added);
      case 'added-asc':
        return [...movies].sort((a, b) => a.added - b.added);
      case 'rating-desc':
        return [...movies].sort((a, b) => b.rating_5based - a.rating_5based);
      case 'rating-asc':
        return [...movies].sort((a, b) => a.rating_5based - b.rating_5based);
      default:
        return movies;
    }
  };

  const filteredMovies = sortMovies(
    movies.filter(movie => 
      movie.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (!selectedCategory || movie.category_id === selectedCategory)
    )
  ).slice(0, visibleMovies);

  const handleLoadMore = () => {
    setVisibleMovies(prev => prev + 20);
  };

  const hasMoreMovies = filteredMovies.length < movies.filter(movie => 
    movie.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!selectedCategory || movie.category_id === selectedCategory)
  ).length;

  const handleRefresh = () => {
    fetchMovies(true);
  };

  return (
    <MoviesContainer>
      <FiltersContainer>
        <SearchInput
          type="text"
          placeholder="Search movies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <CategorySelect
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category.category_id} value={category.category_id}>
              {category.category_name}
            </option>
          ))}
        </CategorySelect>

        <SortSelect
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="">Sort by...</option>
          <option value="added-desc">Added (Newest)</option>
          <option value="added-asc">Added (Oldest)</option>
          <option value="rating-desc">Rating (Highest)</option>
          <option value="rating-asc">Rating (Lowest)</option>
        </SortSelect>

        <RefreshButton onClick={handleRefresh}>Refresh</RefreshButton>	
      </FiltersContainer>

      <MovieGrid>
        {filteredMovies.map(movie => (
          <MovieCard key={movie.stream_id}>
            <MovieImage 
              src={movie.stream_icon || 'https://via.placeholder.com/300x450'} 
              alt={movie.name}
            />
            <MovieInfo>
              <MovieTitle>{movie.name}</MovieTitle>
              <MovieCategory>{getCategoryName(movie.category_id)}</MovieCategory>
              <MovieRating>★ {Number(movie.rating_5based).toFixed(1)}/5</MovieRating>
              <MovieAdded>Added: {formatDate(movie.added)}</MovieAdded>
              <DownloadButton
                onClick={() => handleDownload(movie.stream_id, movie.name, movie.container_extension)}
                disabled={downloadedMovies.has(movie.stream_id)}
              >
                {downloadedMovies.has(movie.stream_id) ? '✓ Downloaded' : 'Download'}
              </DownloadButton>
            </MovieInfo>
          </MovieCard>
        ))}
      </MovieGrid>

      {hasMoreMovies && (
        <LoadMoreButton onClick={handleLoadMore}>
          Load More Movies
        </LoadMoreButton>
      )}
    </MoviesContainer>
  );
}

export default Movies;
