import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const DownloadsContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const TabContainer = styled.div`
  margin-bottom: 2rem;
`;

const TabButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const TabButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.active ? '#667eea' : '#f0f0f0'};
  color: ${props => props.active ? 'white' : '#333'};
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;

  &:hover {
    background: ${props => props.active ? '#5a6fd8' : '#e0e0e0'};
  }
`;

const DownloadItem = styled.div`
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 10px;
  background: #f0f0f0;
  border-radius: 5px;
  margin: 1rem 0;
  overflow: hidden;
`;

const Progress = styled.div`
  width: ${props => props.value}%;
  height: 100%;
  background: #667eea;
  transition: width 0.3s ease;
`;

const DownloadInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

function Downloads() {
  const [activeTab, setActiveTab] = useState('active');
  const [downloads, setDownloads] = useState({ active: [], completed: [] });

  const fetchDownloads = async () => {
    try {
      const response = await axios.get('/api/download/status');
      setDownloads(response.data);
    } catch (error) {
      console.error('Error fetching downloads:', error);
    }
  };

  useEffect(() => {
    fetchDownloads();
    const interval = setInterval(fetchDownloads, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const formatSpeed = (bytesPerSecond) => {
    const mbps = (bytesPerSecond / (1024 * 1024)).toFixed(2);
    return `${mbps} MB/s`;
  };

  const formatSize = (bytes) => {
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  };

  const calculateProgress = (download) => {
    const total = parseInt(download.totalLength);
    const completed = parseInt(download.completedLength);
    if (total === 0) return 0;
    return ((completed / total) * 100).toFixed(1);
  };

  return (
    <DownloadsContainer>
      <h1>Downloads</h1>
      
      <TabContainer>
        <TabButtons>
          <TabButton 
            active={activeTab === 'active'} 
            onClick={() => setActiveTab('active')}
          >
            Active Downloads
          </TabButton>
          <TabButton 
            active={activeTab === 'completed'} 
            onClick={() => setActiveTab('completed')}
          >
            Completed Downloads
          </TabButton>
        </TabButtons>

        {activeTab === 'active' && (
          <div>
            {downloads.active.map((download) => (
              <DownloadItem key={download.gid}>
                <h3>{download.files[0]?.path.split('/').pop()}</h3>
                <ProgressBar>
                  <Progress value={calculateProgress(download)} />
                </ProgressBar>
                <DownloadInfo>
                  <div>
                    <strong>Progress: </strong>
                    {calculateProgress(download)}%
                  </div>
                  <div>
                    <strong>Speed: </strong>
                    {formatSpeed(download.downloadSpeed)}
                  </div>
                  <div>
                    <strong>Size: </strong>
                    {formatSize(download.totalLength)}
                  </div>
                </DownloadInfo>
              </DownloadItem>
            ))}
            {downloads.active.length === 0 && (
              <p>No active downloads</p>
            )}
          </div>
        )}

        {activeTab === 'completed' && (
          <div>
            {downloads.completed.map((download) => (
              <DownloadItem key={download.gid}>
                <h3>{download.files[0]?.path.split('/').pop()}</h3>
                <DownloadInfo>
                  <div>
                    <strong>Status: </strong>
                    {download.status}
                  </div>
                  <div>
                    <strong>Size: </strong>
                    {formatSize(download.totalLength)}
                  </div>
                </DownloadInfo>
              </DownloadItem>
            ))}
            {downloads.completed.length === 0 && (
              <p>No completed downloads</p>
            )}
          </div>
        )}
      </TabContainer>
    </DownloadsContainer>
  );
}

export default Downloads;
