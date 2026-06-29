import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import Hls from 'hls.js';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const PlayerBox = styled.div`
  width: 100%;
  max-width: 900px;
  background: #000;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
`;

const PlayerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #111;
`;

const ChannelName = styled.span`
  color: white;
  font-weight: 600;
  font-size: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #aaa;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
  padding: 0 0.25rem;
  flex-shrink: 0;
  &:hover { color: white; }
`;

const Video = styled.video`
  width: 100%;
  aspect-ratio: 16/9;
  display: block;
  background: #000;
`;

const StatusBar = styled.div`
  padding: 0.5rem 1rem;
  background: #111;
  color: #888;
  font-size: 0.8rem;
  text-align: center;
`;

function StreamPlayer({ channel, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = React.useState('Connecting...');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel) return;

    // Force HLS and proxy through our server to bypass CORS
    const hlsUrl = channel.stream_url.replace(/\.[^/.]+$/, '') + '.m3u8';
    const url = `/api/stream-proxy?url=${encodeURIComponent(hlsUrl)}`;

    const cleanup = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus('Playing');
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setStatus(`Error: ${data.details}`);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari)
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        setStatus('Playing');
        video.play().catch(() => {});
      });
    } else {
      setStatus('HLS not supported in this browser');
    }

    return cleanup;
  }, [channel]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!channel) return null;

  return (
    <Overlay onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <PlayerBox>
        <PlayerHeader>
          <ChannelName>
            {channel.stream_icon && <img src={channel.stream_icon} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 3, marginRight: 8, verticalAlign: 'middle' }} />}
            {channel.name}
          </ChannelName>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </PlayerHeader>

        <Video ref={videoRef} controls autoPlay playsInline />

        <StatusBar>{status}</StatusBar>
      </PlayerBox>
    </Overlay>
  );
}

export default StreamPlayer;
