/* global cast, chrome */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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

// ─── Favorites ───────────────────────────────────────────────────────────────

const StarBtn = styled.button`
  background: none;
  border: none;
  color: ${p => p.active ? '#f5c518' : 'rgba(255,255,255,0.35)'};
  font-size: 1rem;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  flex-shrink: 0;
  line-height: 1;
  &:hover { color: #f5c518; }
`;

const Popover = styled.div`
  position: fixed;
  background: rgba(15,15,20,0.98);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  padding: 0.5rem 0;
  z-index: 100;
  min-width: 180px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
`;

const PopoverItem = styled.div`
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  &:hover { background: rgba(255,255,255,0.08); }
`;

const PopoverDivider = styled.div`
  height: 1px;
  background: rgba(255,255,255,0.1);
  margin: 0.25rem 0;
`;

const NewListInput = styled.input`
  margin: 0.25rem 0.75rem;
  padding: 0.35rem 0.5rem;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  color: white;
  font-size: 0.8rem;
  outline: none;
  width: calc(100% - 1.5rem);
  &::placeholder { color: rgba(255,255,255,0.35); }
`;

// ─── Source Dropdown ──────────────────────────────────────────────────────────

const SourceDropWrap = styled.div`
  position: relative;
  margin: 0 0.75rem 0.5rem;
  flex-shrink: 0;
`;

const SourceTrigger = styled.button`
  width: 100%;
  padding: 0.45rem 2rem 0.45rem 0.75rem;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  color: white;
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &::after { content: '▾'; position: absolute; right: 0.6rem; top: 50%; transform: translateY(-50%); }
  &:hover { background: rgba(255,255,255,0.14); }
`;

const SourceMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  background: rgba(15,15,20,0.98);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  max-height: 280px;
`;

const SourceSearch = styled.input`
  padding: 0.45rem 0.75rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  color: white;
  font-size: 0.85rem;
  outline: none;
  &::placeholder { color: rgba(255,255,255,0.35); }
`;

const SourceList = styled.div`
  overflow-y: auto;
  flex: 1;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
`;

const SourceGroupLabel = styled.div`
  padding: 0.3rem 0.75rem;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.35);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SourceItem = styled.div`
  padding: 0.45rem 0.75rem;
  font-size: 0.85rem;
  color: ${p => p.active ? '#667eea' : 'white'};
  font-weight: ${p => p.active ? 600 : 400};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  &:hover { background: rgba(255,255,255,0.07); }
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

// ─── Source Dropdown Component ────────────────────────────────────────────────

function SourceDropdown({ source, setSource, lists, channels }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const ref = React.useRef(null);

  React.useEffect(() => {
    const onOut = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, []);

  const categories = React.useMemo(() =>
    [...new Set(channels.map(c => c.category_name).filter(Boolean))].sort(),
    [channels]
  );

  const label = !source ? 'Toutes les chaînes'
    : source.type === 'list' ? (lists.find(l => l.id === source.id)?.name || 'Liste')
    : source.name;

  const filteredLists = lists.filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()));
  const filteredCats = categories.filter(c => !search || c.toLowerCase().includes(search.toLowerCase()));

  const select = (s) => { setSource(s); setOpen(false); setSearch(''); };

  return (
    <SourceDropWrap ref={ref}>
      <SourceTrigger onClick={() => { setOpen(o => !o); setSearch(''); }}>
        {label}
      </SourceTrigger>
      {open && (
        <SourceMenu>
          <SourceSearch
            autoFocus
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <SourceList>
            <SourceItem active={!source} onClick={() => select(null)}>Toutes les chaînes</SourceItem>
            {filteredLists.length > 0 && (
              <>
                <SourceGroupLabel>Mes listes</SourceGroupLabel>
                {filteredLists.map(l => (
                  <SourceItem
                    key={l.id}
                    active={source?.type === 'list' && source.id === l.id}
                    onClick={() => select({ type: 'list', id: l.id })}
                  >
                    ⭐ {l.name}
                  </SourceItem>
                ))}
              </>
            )}
            {filteredCats.length > 0 && (
              <>
                <SourceGroupLabel>Catégories</SourceGroupLabel>
                {filteredCats.map(c => (
                  <SourceItem
                    key={c}
                    active={source?.type === 'cat' && source.name === c}
                    onClick={() => select({ type: 'cat', name: c })}
                  >
                    {c}
                  </SourceItem>
                ))}
              </>
            )}
          </SourceList>
        </SourceMenu>
      )}
    </SourceDropWrap>
  );
}

// ─── FavPopover Component ─────────────────────────────────────────────────────

function FavPopover({ channel, lists, itemsByList, anchorPos, onClose, onRefresh }) {
  const ref = React.useRef(null);
  const [newListName, setNewListName] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    const onOut = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, [onClose]);

  const toggle = async (listId) => {
    const inList = itemsByList.get(listId)?.has(channel.stream_url);
    if (inList) {
      await axios.delete(`/api/lists/${listId}/items/${encodeURIComponent(channel.stream_url)}`);
    } else {
      await axios.post(`/api/lists/${listId}/items`, {
        stream_url: channel.stream_url,
        name: channel.name,
        stream_icon: channel.stream_icon,
        category_name: channel.category_name,
      });
    }
    onRefresh();
  };

  const createAndAdd = async () => {
    if (!newListName.trim()) return;
    const res = await axios.post('/api/lists', { name: newListName.trim() });
    await axios.post(`/api/lists/${res.data.id}/items`, {
      stream_url: channel.stream_url,
      name: channel.name,
      stream_icon: channel.stream_icon,
      category_name: channel.category_name,
    });
    setNewListName('');
    setCreating(false);
    onRefresh();
  };

  return (
    <Popover ref={ref} style={{ top: anchorPos.y, left: anchorPos.x }}>
      <PopoverItem style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', cursor: 'default' }}>
        {channel.name}
      </PopoverItem>
      <PopoverDivider />
      {lists.map(l => {
        const inList = itemsByList.get(l.id)?.has(channel.stream_url);
        return (
          <PopoverItem key={l.id} onClick={() => toggle(l.id)}>
            <span>{inList ? '✓' : '+'}</span>
            {l.name}
          </PopoverItem>
        );
      })}
      <PopoverDivider />
      {creating ? (
        <NewListInput
          autoFocus
          placeholder="Nom de la liste..."
          value={newListName}
          onChange={e => setNewListName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') createAndAdd(); if (e.key === 'Escape') setCreating(false); }}
        />
      ) : (
        <PopoverItem onClick={() => setCreating(true)}>
          <span>+</span> Nouvelle liste
        </PopoverItem>
      )}
    </Popover>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

function TV() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // All channels — always the full playlist
  const [channels, setChannels] = useState([]);
  // Channels shown in the panel — filtered by source
  const [displayChannels, setDisplayChannels] = useState([]);
  // source: null | { type: 'list', id: number } | { type: 'cat', name: string }
  const [source, setSource] = useState(() => {
    const s = searchParams.get('source');
    if (!s) return null;
    if (s.startsWith('list:')) return { type: 'list', id: Number(s.slice(5)) };
    if (s.startsWith('cat:')) return { type: 'cat', name: s.slice(4) };
    return null;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lists, setLists] = useState([]);
  // Map<listId, Set<stream_url>> — for O(1) membership check
  const [itemsByList, setItemsByList] = useState(new Map());
  const [favPopover, setFavPopover] = useState(null); // { channel, x, y }

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

  // Refresh lists + itemsByList (called on mount and after list mutations)
  const refreshListItems = useCallback(async () => {
    const listsRes = await axios.get('/api/lists').catch(() => ({ data: [] }));
    setLists(listsRes.data);
    const entries = await Promise.all(
      listsRes.data.map(l =>
        axios.get(`/api/lists/${l.id}/items`)
          .then(r => [l.id, new Set(r.data.map(i => i.stream_url))])
          .catch(() => [l.id, new Set()])
      )
    );
    setItemsByList(new Map(entries));
  }, []);

  // 1. Load full playlist on mount + initial lists fetch
  useEffect(() => {
    const fromState = state?.channels;
    if (fromState?.length) {
      setChannels(fromState);
    } else {
      axios.get('/api/playlist').then(r => setChannels(r.data)).catch(() => {});
    }
    refreshListItems();
  }, []);

  // 2. Once channels are loaded, resolve ?id param and set currentIndex
  useEffect(() => {
    if (!channels.length) return;
    const idParam = searchParams.get('id');
    if (idParam) {
      const idx = channels.findIndex(c => c.stream_url.match(/\/(\d+)(?:\.\w+)?$/)?.[1] === idParam);
      if (idx >= 0) setCurrentIndex(idx);
    } else if (state?.channel) {
      const idx = channels.findIndex(c => c === state.channel);
      if (idx >= 0) setCurrentIndex(idx);
    }
  }, [channels]);

  // 3. Apply source filter to build displayChannels
  useEffect(() => {
    if (!channels.length) { setDisplayChannels([]); return; }
    if (!source) { setDisplayChannels(channels); return; }
    if (source.type === 'cat') {
      setDisplayChannels(channels.filter(c => c.category_name === source.name));
      return;
    }
    if (source.type === 'list') {
      axios.get(`/api/lists/${source.id}/items`).then(r => {
        const urls = new Set(r.data.map(i => i.stream_url));
        setDisplayChannels(channels.filter(c => urls.has(c.stream_url)));
      }).catch(() => setDisplayChannels([]));
      return;
    }
    setDisplayChannels(channels);
  }, [channels, source]);

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

  // 4. Load channel when currentIndex resolves (only once channels are ready)
  const prevIndexRef = useRef(null);
  useEffect(() => {
    if (!channels.length) return;
    if (prevIndexRef.current === currentIndex) return;
    prevIndexRef.current = currentIndex;
    if (channels[currentIndex]) loadChannel(channels[currentIndex]);
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [currentIndex, channels]);

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

  // Sync URL params to current state
  useEffect(() => {
    if (!channels.length) return;
    const ch = channels[currentIndex];
    if (!ch) return;
    const idMatch = ch.stream_url.match(/\/(\d+)(?:\.\w+)?$/);
    const id = idMatch ? idMatch[1] : null;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (id) next.set('id', id); else next.delete('id');
      if (source?.type === 'list') next.set('source', `list:${source.id}`);
      else if (source?.type === 'cat') next.set('source', `cat:${source.name}`);
      else next.delete('source');
      return next;
    }, { replace: true });
  }, [currentIndex, source, channels]);

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

  const currentChannel = channels[currentIndex];

  if (!channels.length) {
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
            <StarBtn
              active={currentChannel && lists.some(l => itemsByList.get(l.id)?.has(currentChannel.stream_url))}
              onClick={(e) => {
                if (!currentChannel) return;
                const rect = e.currentTarget.getBoundingClientRect();
                setFavPopover({ channel: currentChannel, x: rect.left - 190, y: rect.bottom + 4 });
              }}
            >⭐</StarBtn>
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

      {/* Favorites popover */}
      {favPopover && (
        <FavPopover
          channel={favPopover.channel}
          lists={lists}
          itemsByList={itemsByList}
          anchorPos={{ x: favPopover.x, y: favPopover.y }}
          onClose={() => setFavPopover(null)}
          onRefresh={() => { refreshListItems(); setFavPopover(null); }}
        />
      )}

      {/* Channel panel */}
      {showPanel && (
        <>
          <PanelOverlay onClick={() => setShowPanel(false)} />
          <Panel>
            <PanelHead>
              <span>Channels ({displayChannels.length})</span>
              <IconBtn onClick={() => setShowPanel(false)}>✕</IconBtn>
            </PanelHead>
            <SourceDropdown
              source={source}
              setSource={setSource}
              lists={lists}
              channels={channels}
            />
            <PanelSearch
              autoFocus
              placeholder="Search channels..."
              value={panelSearch}
              onChange={e => setPanelSearch(e.target.value)}
            />
            <ChannelList ref={channelListRef}>
              {(panelSearch
                ? displayChannels.filter(c => c.name?.toLowerCase().includes(panelSearch.toLowerCase()))
                : displayChannels
              ).map((ch) => {
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
                    <StarBtn
                      active={lists.some(l => itemsByList.get(l.id)?.has(ch.stream_url))}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setFavPopover({ channel: ch, x: rect.left - 190, y: rect.top });
                      }}
                    >⭐</StarBtn>
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
