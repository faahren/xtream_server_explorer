import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const PlaylistContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const SearchInput = styled.input`
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  min-width: 250px;
`;

const CategorySelect = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
`;

const RefreshButton = styled.button`
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

const PlaylistTable = styled.div`
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 80px 2fr 2fr 3fr 100px;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  font-weight: bold;
  color: #333;
  border-bottom: 1px solid #e9ecef;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 80px 2fr 2fr 3fr 100px;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  align-items: center;
  
  &:hover {
    background: #f8f9fa;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const ChannelLogo = styled.img`
  width: 60px;
  height: 40px;
  object-fit: cover;
  border-radius: 5px;
`;

const ChannelName = styled.div`
  font-weight: 500;
  color: #333;
`;

const CategoryName = styled.div`
  color: #666;
  font-size: 0.9rem;
`;

const StreamUrl = styled.div`
  color: #666;
  font-size: 0.8rem;
  word-break: break-all;
  font-family: monospace;
`;

const DownloadButton = styled.button`
  padding: 0.5rem 0.75rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.8rem;
  
  &:hover {
    background: #218838;
  }
  
  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
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

const NoLogo = styled.div`
  width: 60px;
  height: 40px;
  background: #f0f0f0;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: #999;
`;

function Playlist() {
  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filteredPlaylist, setFilteredPlaylist] = useState([]);
  const [downloadedChannels, setDownloadedChannels] = useState(new Set());

  useEffect(() => {
    fetchPlaylist();
  }, []);

  useEffect(() => {
    filterPlaylist();
  }, [searchQuery, selectedCategory, playlist]);

  const fetchPlaylist = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/playlist');
      setPlaylist(response.data);
    } catch (err) {
      setError('Failed to fetch playlist');
      console.error('Error fetching playlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterPlaylist = () => {
    let filtered = playlist;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(channel => channel.category_name === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(channel => 
        channel.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPlaylist(filtered);
  };

  const handleDownload = async (streamUrl, channelName) => {
    try {
      const response = await axios.post('/api/download', {
        stream_url: streamUrl,
        name: channelName
      });
      
      if (response.data.success) {
        setDownloadedChannels(prev => new Set([...prev, streamUrl]));
        alert('Download started successfully!');
      }
    } catch (err) {
      alert('Failed to start download');
      console.error('Download error:', err);
    }
  };

  const getCategories = () => {
    const categories = ['All', ...new Set(playlist.map(channel => channel.category_name))];
    return categories.filter(cat => cat && cat.trim() !== '');
  };

  if (loading) return <Loading>Loading playlist...</Loading>;
  if (error) return <Error>{error}</Error>;

  return (
    <PlaylistContainer>
      <Header>
        <Title>Playlist</Title>
        <Controls>
          <SearchInput
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <CategorySelect
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {getCategories().map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </CategorySelect>
          <RefreshButton onClick={fetchPlaylist}>
            Refresh
          </RefreshButton>
        </Controls>
      </Header>

      <PlaylistTable>
        <TableHeader>
          <div>Logo</div>
          <div>Channel Name</div>
          <div>Category</div>
          <div>Stream URL</div>
          <div>Action</div>
        </TableHeader>
        
        {filteredPlaylist.map((channel, index) => (
          <TableRow key={`${channel.name}-${index}`}>
            <div>
              {channel.stream_icon && channel.stream_icon !== 'N/A' ? (
                <ChannelLogo src={channel.stream_icon} alt={channel.name} />
              ) : (
                <NoLogo>No Logo</NoLogo>
              )}
            </div>
            
            <ChannelName>{channel.name}</ChannelName>
            
            <CategoryName>{channel.category_name}</CategoryName>
            
            <StreamUrl>{channel.stream_url}</StreamUrl>
            
            <div>
              <DownloadButton
                onClick={() => handleDownload(channel.stream_url, channel.name)}
                disabled={downloadedChannels.has(channel.stream_url)}
              >
                {downloadedChannels.has(channel.stream_url) ? '✓ Downloaded' : 'Download'}
              </DownloadButton>
            </div>
          </TableRow>
        ))}
      </PlaylistTable>
      
      <div style={{ marginTop: '1rem', textAlign: 'center', color: '#666' }}>
        Showing {filteredPlaylist.length} channels
      </div>
    </PlaylistContainer>
  );
}

export default Playlist;
