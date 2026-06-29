/* global cast, chrome */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import Hls from 'hls.js';
import axios from 'axios';

// ─── Animations ──────────────────────────────────────────────────────────────

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const slideInRight = keyframes`from { transform: translateX(100%); } to { transform: translateX(0); }`;
const slideUp = keyframes`from { transform: translateY(100%); } to { transform: translateY(0); }`;
const toastIn = keyframes`from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); }`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const TVWrap = styled.div`
  position: fixed;
  inset: 0;
  background: #000;
  overflow: hidden;
  cursor: ${p => p.idle ? 'none' : 'default'};
  user-select: none;
`;

const Video = styled.video`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

// ─── Overlay ──────────────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
  opacity: ${p => p.visible ? 1 : 0};
`;

const TopGradient = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 120px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%);
  pointer-events: ${p => p.visible ? 'auto' : 'none'};
`;

const BottomGradient = styled.div`
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 140px;
  background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
  pointer-events: ${p => p.visible ? 'auto' : 'none'};
`;

const TopBar = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  pointer-events: ${p => p.visible ? 'auto' : 'none'};
`;

const ChannelMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ChannelLogoImg = styled.img`
  width: 36px;
  height: 36px;
  object-fit: contain;
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
`;

const ChannelLogoPlaceholder = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
`;

const ChannelNameText = styled.div`
  color: white;
  font-size: 1rem;
  font-weight: 600;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChannelNumText = styled.div`
  color: rgba(255,255,255,0.6);
  font-size: 0.75rem;
  margin-top: 2px;
`;

const TopActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IconBtn = styled.button`
  background: rgba(255,255,255,0.12);
  border: none;
  color: white;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  transition: background 0.15s;
  &:hover { background: rgba(255,255,255,0.25); }
`;

const BottomBar = styled.div`
  position: absolute;
  bottom: 0; left: 0; right: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem 1.25rem;
  pointer-events: ${p => p.visible ? 'auto' : 'none'};
`;

const ZapBtn = styled.button`
  background: rgba(255,255,255,0.12);
  border: none;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background 0.15s;
  white-space: nowrap;
  &:hover:not(:disabled) { background: rgba(255,255,255,0.25); }
  &:disabled { opacity: 0.3; cursor: default; }
`;

const Spacer = styled.div`flex: 1;`;

const StatusDot = styled.div`
  font-size: 0.8rem;
  color: rgba(255,255,255,0.55);
  padding: 0 0.5rem;
`;

const VolumeWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const VolumeSliderPop = styled.div`
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15,15,20,0.92);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  z-index: 50;
`;

const VolumeSlider = styled.input`
  -webkit-appearance: slider-vertical;
  writing-mode: vertical-lr;
  direction: rtl;
  width: 28px;
  height: 90px;
  cursor: pointer;
  accent-color: #667eea;
`;

const VolPct = styled.div`
  font-size: 0.7rem;
  color: rgba(255,255,255,0.55);
`;

// ─── Channel Toast ────────────────────────────────────────────────────────────

const Toast = styled.div`
  position: absolute;
  top: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 0.6rem 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  animation: ${toastIn} 0.2s ease;
  z-index: 20;
  max-width: 90vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ToastLogo = styled.img`
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 4px;
`;

const ToastNum = styled.span`
  color: rgba(255,255,255,0.5);
  font-size: 0.8rem;
`;

// ─── Channel Panel ────────────────────────────────────────────────────────────

const PanelOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 30;
  animation: ${fadeIn} 0.2s ease;
`;

const Panel = styled.div`
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 320px;
  background: rgba(15,15,20,0.96);
  backdrop-filter: blur(16px);
  border-left: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  z-index: 31;
  animation: ${slideInRight} 0.25s ease;

  @media (max-width: 600px) {
    width: 100%;
    top: auto;
    right: 0; left: 0; bottom: 0;
    height: 75vh;
    border-left: none;
    border-top: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px 16px 0 0;
    animation: ${slideUp} 0.25s ease;
  }
`;

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1rem 0.5rem;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  flex-shrink: 0;
`;

const PanelSearch = styled.input`
  margin: 0.5rem 1rem 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  outline: none;
  flex-shrink: 0;
  &::placeholder { color: rgba(255,255,255,0.35); }
  &:focus { border-color: rgba(102,126,234,0.7); }
`;

const ChannelList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 0.5rem 1rem;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
`;

const ChannelItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
  background: ${p => p.active ? 'rgba(102,126,234,0.25)' : 'transparent'};
  border: 1px solid ${p => p.active ? 'rgba(102,126,234,0.5)' : 'transparent'};
  margin-bottom: 2px;

  &:hover { background: ${p => p.active ? 'rgba(102,126,234,0.35)' : 'rgba(255,255,255,0.07)'}; }
`;

const ItemLogo = styled.img`
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 5px;
  background: rgba(255,255,255,0.05);
  flex-shrink: 0;
`;

const ItemLogoPlaceholder = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 5px;
  background: rgba(255,255,255,0.08);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
`;

const ItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemName = styled.div`
  color: white;
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ItemCat = styled.div`
  color: rgba(255,255,255,0.4);
  font-size: 0.7rem;
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ItemNum = styled.div`
  color: rgba(255,255,255,0.3);
  font-size: 0.75rem;
  flex-shrink: 0;
`;

// ─── No channels fallback ─────────────────────────────────────────────────────

const NoChannels = styled.div`
  position: fixed;
  inset: 0;
  background: #000;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 1.1rem;
`;

const BackBtn = styled.button`
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  &:hover { background: #5a6fd8; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

function TV() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [channels, setChannels] = useState(state?.channels || []);
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!state?.channels?.length) return 0;
    const idx = state.channels.findIndex(c => c === state?.channel);
    return idx >= 0 ? idx : 0;
  });

  const [showOverlay, setShowOverlay] = useState(true);
  const [idle, setIdle] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [castAvailable, setCastAvailable] = useState(false);
  const [toast, setToast] = useState(null);
  const [panelSearch, setPanelSearch] = useState('');
  const [status, setStatus] = useState('Connecting...');

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const overlayTimer = useRef(null);
  const toastTimer = useRef(null);
  const channelListRef = useRef(null);
  const volumeRef = useRef(null);

  // Fetch channels from API if not passed via state
  useEffect(() => {
    if (!state?.channels?.length) {
      axios.get('/api/playlist').then(r => setChannels(r.data)).catch(() => {});
    }
  }, []);

  // Load a channel into HLS — try direct first, fall back to proxy if CORS error
  const loadChannel = useCallback((ch) => {
    const video = videoRef.current;
    if (!video || !ch) return;
    setStatus('Connecting...');
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const hlsUrl = ch.stream_url.replace(/\.[^/.]+$/, '') + '.m3u8';
    const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(hlsUrl)}`;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(proxyUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { setStatus('Playing'); video.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) setStatus(`Error: ${d.details}`); });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = proxyUrl;
      video.play().catch(() => {});
      setStatus('Playing');
    }
  }, []);

  useEffect(() => {
    if (channels[currentIndex]) loadChannel(channels[currentIndex]);
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [currentIndex, channels.length]);

  // Channel zap
  const zapTo = useCallback((idx) => {
    if (!channels.length) return;
    const clamped = Math.max(0, Math.min(idx, channels.length - 1));
    if (clamped === currentIndex) return;
    setCurrentIndex(clamped);
    const ch = channels[clamped];
    clearTimeout(toastTimer.current);
    setToast({ name: ch.name, icon: ch.stream_icon, num: clamped + 1 });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
    // Scroll channel list to active item
    setTimeout(() => {
      const active = channelListRef.current?.querySelector('[data-active="true"]');
      active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 50);
  }, [channels, currentIndex]);

  // Overlay auto-hide
  const revealOverlay = useCallback(() => {
    setShowOverlay(true);
    setIdle(false);
    clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => {
      if (!showPanel) { setShowOverlay(false); setIdle(true); }
    }, 3000);
  }, [showPanel]);

  useEffect(() => {
    if (showPanel) { setShowOverlay(true); setIdle(false); clearTimeout(overlayTimer.current); }
    else revealOverlay();
  }, [showPanel]);

  // Chromecast init
  useEffect(() => {
    window['__onGCastApiAvailable'] = (isAvailable) => {
      if (!isAvailable) return;
      try {
        cast.framework.CastContext.getInstance().setOptions({
          receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
        });
        setCastAvailable(true);
      } catch (_) {}
    };
  }, []);

  const handleCast = async () => {
    if (!castAvailable || !currentChannel) return;
    try {
      const ctx = cast.framework.CastContext.getInstance();
      await ctx.requestSession();
      const session = ctx.getCurrentSession();
      const url = currentChannel.stream_url.replace(/\.[^/.]+$/, '') + '.m3u8';
      const mediaInfo = new chrome.cast.media.MediaInfo(url, 'application/x-mpegURL');
      await session.loadMedia(new chrome.cast.media.LoadRequest(mediaInfo));
    } catch (_) {}
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.key) {
        case 'Escape':    navigate(-1); break;
        case 'ArrowUp':   e.preventDefault(); zapTo(currentIndex - 1); revealOverlay(); break;
        case 'ArrowDown': e.preventDefault(); zapTo(currentIndex + 1); revealOverlay(); break;
        case 'l': case 'L': setShowPanel(p => !p); break;
        case 'f': case 'F': videoRef.current?.requestFullscreen?.(); break;
        case 'm': case 'M': setMuted(m => !m); revealOverlay(); break;
        case '+': case '=':
          e.preventDefault();
          setMuted(false);
          setVolume(v => Math.min(100, v + 1));
          revealOverlay();
          break;
        case '-':
          e.preventDefault();
          setVolume(v => {
            const next = Math.max(0, v - 1);
            if (next === 0) setMuted(true);
            return next;
          });
          revealOverlay();
          break;
        case ' ':
          e.preventDefault();
          if (videoRef.current) videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, zapTo, revealOverlay, navigate]);

  // Sync volume/mute to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = muted ? 0 : volume / 100;
    video.muted = muted;
  }, [volume, muted]);

  // Close volume popup on outside click
  useEffect(() => {
    if (!showVolume) return;
    const onClick = (e) => { if (volumeRef.current && !volumeRef.current.contains(e.target)) setShowVolume(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showVolume]);

  const volumeIcon = () => {
    if (muted || volume === 0) return '🔇';
    if (volume < 40) return '🔈';
    if (volume < 70) return '🔉';
    return '🔊';
  };

  // Touch swipe
  const touchStartY = useRef(null);
  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 60) zapTo(dy > 0 ? currentIndex + 1 : currentIndex - 1);
    else revealOverlay();
    touchStartY.current = null;
  };

  const filteredChannels = panelSearch
    ? channels.filter(c => c.name?.toLowerCase().includes(panelSearch.toLowerCase()))
    : channels;

  const currentChannel = channels[currentIndex];

  if (!channels.length && !state?.channels) {
    return (
      <NoChannels>
        <span>Loading channels...</span>
      </NoChannels>
    );
  }

  return (
    <TVWrap
      idle={idle}
      onMouseMove={revealOverlay}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Video ref={videoRef} autoPlay playsInline x-webkit-airplay="allow" airplay="allow" />

      {/* Channel toast */}
      {toast && (
        <Toast>
          {toast.icon && <ToastLogo src={toast.icon} alt="" onError={e => e.target.style.display='none'} />}
          <ToastNum>CH {toast.num}</ToastNum>
          {toast.name}
        </Toast>
      )}

      {/* Overlay gradients + bars */}
      <Overlay visible={showOverlay}>
        <TopGradient visible={showOverlay} />
        <BottomGradient visible={showOverlay} />

        <TopBar visible={showOverlay}>
          <ChannelMeta>
            {currentChannel?.stream_icon
              ? <ChannelLogoImg src={currentChannel.stream_icon} alt="" onError={e => e.target.style.display='none'} />
              : <ChannelLogoPlaceholder>📺</ChannelLogoPlaceholder>
            }
            <div>
              <ChannelNameText>{currentChannel?.name || '—'}</ChannelNameText>
              <ChannelNumText>CH {currentIndex + 1} · {currentChannel?.category_name}</ChannelNumText>
            </div>
          </ChannelMeta>
          <TopActions>
            <IconBtn onClick={() => setShowPanel(p => !p)} title="Channel list (L)">☰</IconBtn>
            <IconBtn onClick={() => navigate(-1)} title="Close (Esc)">✕</IconBtn>
          </TopActions>
        </TopBar>

        <BottomBar visible={showOverlay}>
          <ZapBtn
            onClick={() => { zapTo(currentIndex - 1); revealOverlay(); }}
            disabled={currentIndex === 0}
          >
            ‹ Prev
          </ZapBtn>
          <ZapBtn
            onClick={() => { zapTo(currentIndex + 1); revealOverlay(); }}
            disabled={currentIndex >= channels.length - 1}
          >
            Next ›
          </ZapBtn>
          <Spacer />
          <StatusDot>{status}</StatusDot>
          <VolumeWrap ref={volumeRef}>
            <IconBtn
              onClick={() => setShowVolume(v => !v)}
              title="Volume"
            >{volumeIcon()}</IconBtn>
            {showVolume && (
              <VolumeSliderPop>
                <VolumeSlider
                  type="range"
                  min="0"
                  max="100"
                  value={muted ? 0 : volume}
                  onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
                />
                <VolPct>{muted ? 0 : volume}%</VolPct>
                <IconBtn
                  style={{ width: 28, height: 28, fontSize: '0.8rem' }}
                  onClick={() => setMuted(m => !m)}
                  title="Mute"
                >{muted ? '🔇' : '🔊'}</IconBtn>
              </VolumeSliderPop>
            )}
          </VolumeWrap>
          {castAvailable && (
            <IconBtn onClick={handleCast} title="Cast to Chromecast">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm18-7H5c-1.1 0-2 .9-2 2v3h2v-3h14v12h-5v2h5c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM1 10v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/>
              </svg>
            </IconBtn>
          )}
          <IconBtn
            onClick={() => videoRef.current?.requestFullscreen?.()}
            title="Fullscreen (F)"
          >⛶</IconBtn>
        </BottomBar>
      </Overlay>

      {/* Channel panel */}
      {showPanel && (
        <>
          <PanelOverlay onClick={() => setShowPanel(false)} />
          <Panel>
            <PanelHead>
              <span>Channels ({channels.length})</span>
              <IconBtn onClick={() => setShowPanel(false)}>✕</IconBtn>
            </PanelHead>
            <PanelSearch
              autoFocus
              placeholder="Search channels..."
              value={panelSearch}
              onChange={e => setPanelSearch(e.target.value)}
            />
            <ChannelList ref={channelListRef}>
              {filteredChannels.map((ch) => {
                const realIdx = channels.indexOf(ch);
                const isActive = realIdx === currentIndex;
                return (
                  <ChannelItem
                    key={ch.stream_url}
                    active={isActive}
                    data-active={isActive}
                    onClick={() => { zapTo(realIdx); setShowPanel(false); revealOverlay(); }}
                  >
                    {ch.stream_icon
                      ? <ItemLogo src={ch.stream_icon} alt="" onError={e => e.target.style.display='none'} />
                      : <ItemLogoPlaceholder>📺</ItemLogoPlaceholder>
                    }
                    <ItemInfo>
                      <ItemName>{ch.name}</ItemName>
                      <ItemCat>{ch.category_name}</ItemCat>
                    </ItemInfo>
                    <ItemNum>{realIdx + 1}</ItemNum>
                  </ChannelItem>
                );
              })}
            </ChannelList>
          </Panel>
        </>
      )}
    </TVWrap>
  );
}

export default TV;
