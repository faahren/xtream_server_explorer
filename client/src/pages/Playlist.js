import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import FavPopover from '../components/FavPopover';

const PAGE_SIZE = 50;

// Palette
// --bg: #f4f5fb   (gris-bleu très doux)
// --surface: #ffffff
// --primary: #5b6def
// --primary-light: #eef0fd
// --text: #1c1f3a
// --text-2: #6b7280
// --border: #e4e7f0
// --row-hover: #f7f8ff

const PageGlobal = createGlobalStyle`
  body { background: #f4f5fb; }
`;

// ─── Layout ──────────────────────────────────────────────────────────────────

const PageLayout = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 3rem;
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
`;

const ChannelPane = styled.div`
  flex: 1;
  min-width: 0;
`;

const ListsPane = styled.aside`
  display: none;
  @media (min-width: 960px) {
    display: flex;
    flex-direction: column;
    width: 268px;
    flex-shrink: 0;
    position: sticky;
    top: 74px;
    max-height: calc(100vh - 82px);
    overflow-y: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
  }
`;

// ─── Page header ──────────────────────────────────────────────────────────────

const PageHeader = styled.div`
  margin-bottom: 1.25rem;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.45rem;
  font-weight: 700;
  color: #1c1f3a;
  letter-spacing: -0.02em;
`;

const ChannelCount = styled.span`
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 400;
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`;

const SearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 180px;
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 0.85rem;
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.55rem 0.75rem 0.55rem 2.1rem;
  border: 1px solid #e4e7f0;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  color: #1c1f3a;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:focus { border-color: #5b6def; box-shadow: 0 0 0 3px rgba(91,109,239,0.12); }
  &::placeholder { color: #9ca3af; }
`;

const RefreshButton = styled.button`
  padding: 0.55rem 1rem;
  background: white;
  color: #5b6def;
  border: 1px solid #e4e7f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
  &:hover { background: #eef0fd; border-color: #c7ccf7; }
`;

// ─── Table ───────────────────────────────────────────────────────────────────

const TableCard = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e4e7f0;
  overflow: hidden;
`;

const TableHead = styled.div`
  display: none;
  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: 44px 2fr 1fr 1.8fr 112px;
    gap: 0.75rem;
    padding: 0.6rem 1rem;
    background: #f9fafb;
    border-bottom: 1px solid #e4e7f0;
    font-size: 0.72rem;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
`;

const TableRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid #f1f3f9;
  align-items: center;
  transition: background 0.1s;
  &:hover { background: #f7f8ff; }
  &:last-child { border-bottom: none; }
  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: 44px 2fr 1fr 1.8fr 112px;
    gap: 0.75rem;
    flex-wrap: unset;
  }
`;

const LogoWrap = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  background: #f4f5fb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const LogoImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const LogoFallback = styled.div`
  font-size: 1rem;
  color: #c7ccf7;
`;

const ChannelName = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #1c1f3a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`;

// Category pill — color derived from name hash
const catColor = (name) => {
  if (!name) return { bg: '#f3f4f6', text: '#6b7280' };
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  const hue = Math.abs(h) % 360;
  return { bg: `hsl(${hue},60%,93%)`, text: `hsl(${hue},45%,35%)` };
};

const CategoryPill = styled.span`
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.18rem 0.5rem;
  border-radius: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  background: ${p => catColor(p.cat).bg};
  color: ${p => catColor(p.cat).text};
`;

const StreamUrl = styled.div`
  font-size: 0.68rem;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: #c0c5d8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: none;
  @media (min-width: 768px) { display: block; }
`;

const RowActions = styled.div`
  display: flex;
  gap: 0.35rem;
  align-items: center;
  flex-shrink: 0;
`;

const AddBtn = styled.button`
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: #eef0fd;
  color: #5b6def;
  border: 1px solid #c7ccf7;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
  &:hover { background: #5b6def; color: white; border-color: #5b6def; }
`;

const WatchBtn = styled.button`
  width: 32px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #5b6def;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.7rem;
  transition: background 0.12s;
  &:hover { background: #4a5ce0; }
`;

// ─── Pagination ───────────────────────────────────────────────────────────────

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.35rem;
  margin-top: 1.25rem;
  flex-wrap: wrap;
`;

const PageBtn = styled.button`
  min-width: 32px;
  height: 32px;
  padding: 0 0.5rem;
  border: 1px solid ${p => p.active ? '#5b6def' : '#e4e7f0'};
  background: ${p => p.active ? '#5b6def' : 'white'};
  color: ${p => p.active ? 'white' : '#4b5563'};
  border-radius: 7px;
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${p => p.disabled ? 0.4 : 1};
  font-size: 0.85rem;
  font-weight: ${p => p.active ? 600 : 400};
  transition: background 0.1s;
  &:hover:not([disabled]) { background: ${p => p.active ? '#4a5ce0' : '#f4f5fb'}; }
`;

// ─── Category dropdown ────────────────────────────────────────────────────────

const DropWrap = styled.div`position: relative;`;

const DropTrigger = styled.button`
  padding: 0.55rem 2.2rem 0.55rem 0.9rem;
  border: 1px solid #e4e7f0;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  color: #1c1f3a;
  cursor: pointer;
  position: relative;
  white-space: nowrap;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  &::after { content: '▾'; position: absolute; right: 0.7rem; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 0.8rem; }
  &:focus { outline: none; border-color: #5b6def; }
`;

const DropMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 200px;
  background: white;
  border: 1px solid #e4e7f0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  z-index: 200;
  display: flex;
  flex-direction: column;
  max-height: 300px;
  overflow: hidden;
`;

const DropSearch = styled.input`
  padding: 0.55rem 0.8rem;
  border: none;
  border-bottom: 1px solid #f1f3f9;
  font-size: 0.875rem;
  outline: none;
  color: #1c1f3a;
  &::placeholder { color: #9ca3af; }
`;

const DropList = styled.div`
  overflow-y: auto;
  flex: 1;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #e4e7f0; border-radius: 2px; }
`;

const DropItem = styled.div`
  padding: 0.5rem 0.8rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: ${p => p.active ? '#5b6def' : '#1c1f3a'};
  font-weight: ${p => p.active ? 600 : 400};
  background: ${p => p.active ? '#eef0fd' : 'transparent'};
  &:hover { background: ${p => p.active ? '#eef0fd' : '#f7f8ff'}; }
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

function CategoryDropdown({ categories, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const filtered = categories.filter(c => !search || c.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const onOut = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, []);

  return (
    <DropWrap ref={ref}>
      <DropTrigger onClick={() => { setOpen(o => !o); setSearch(''); }}>
        {value === 'All' ? 'All categories' : value}
      </DropTrigger>
      {open && (
        <DropMenu>
          <DropSearch autoFocus placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          <DropList>
            {filtered.map(cat => (
              <DropItem key={cat} active={cat === value} onClick={() => { onChange(cat); setOpen(false); setSearch(''); }}>
                {cat === 'All' ? 'All categories' : cat}
              </DropItem>
            ))}
          </DropList>
        </DropMenu>
      )}
    </DropWrap>
  );
}

// ─── Lists panel ──────────────────────────────────────────────────────────────

const ListsCard = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e4e7f0;
  overflow: hidden;
`;

const ListsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem 0.8rem;
  border-bottom: 1px solid #f1f3f9;
  background: linear-gradient(135deg, #5b6def 0%, #7b6ff0 100%);
`;

const ListsTitle = styled.h2`
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
  letter-spacing: -0.01em;
`;

const NewListBtn = styled.button`
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.28rem 0.65rem;
  background: rgba(255,255,255,0.18);
  color: white;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s;
  &:hover { background: rgba(255,255,255,0.28); }
`;

const NewListRow = styled.div`
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f1f3f9;
  display: flex;
  gap: 0.4rem;
`;

const NewListField = styled.input`
  flex: 1;
  padding: 0.38rem 0.65rem;
  border: 1px solid #e4e7f0;
  border-radius: 7px;
  font-size: 0.85rem;
  outline: none;
  color: #1c1f3a;
  &:focus { border-color: #5b6def; box-shadow: 0 0 0 3px rgba(91,109,239,0.1); }
  &::placeholder { color: #9ca3af; }
`;

const ConfirmBtn = styled.button`
  padding: 0.38rem 0.65rem;
  background: #5b6def;
  color: white;
  border: none;
  border-radius: 7px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: #4a5ce0; }
`;

const EmptyLists = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.82rem;
  line-height: 1.6;
`;

const ListItem = styled.div`
  border-bottom: 1px solid #f1f3f9;
  &:last-child { border-bottom: none; }
`;

const ListItemHead = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  transition: background 0.1s;
  &:hover { background: #f7f8ff; }
`;

const ListDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5b6def;
  flex-shrink: 0;
`;

const ListName = styled.span`
  flex: 1;
  font-size: 0.85rem;
  font-weight: 500;
  color: #1c1f3a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ListBadge = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  background: #eef0fd;
  color: #5b6def;
  border-radius: 10px;
  padding: 0.1rem 0.45rem;
  flex-shrink: 0;
`;

const ListPlayBtn = styled.button`
  background: none;
  border: none;
  color: #5b6def;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
  flex-shrink: 0;
  opacity: 0.7;
  &:hover { opacity: 1; background: #eef0fd; }
`;

const ListChevron = styled.span`
  font-size: 0.6rem;
  color: #c0c5d8;
  flex-shrink: 0;
  display: inline-block;
  transition: transform 0.15s;
  transform: ${p => p.open ? 'rotate(90deg)' : 'rotate(0)'};
`;

const ListBody = styled.div`
  background: #f9fafb;
  border-top: 1px solid #f1f3f9;
`;

const ListChanRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.38rem 0.75rem;
  border-bottom: 1px solid #f1f3f9;
  &:last-child { border-bottom: none; }
  &:hover { background: #eef0fd; }
`;

const ListChanLogo = styled.img`
  width: 24px;
  height: 18px;
  object-fit: contain;
  border-radius: 3px;
  flex-shrink: 0;
  background: #f4f5fb;
`;

const ListChanName = styled.span`
  flex: 1;
  font-size: 0.78rem;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RemoveBtn = styled.button`
  background: none;
  border: none;
  color: #d1d5db;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0 0.2rem;
  line-height: 1;
  flex-shrink: 0;
  &:hover { color: #ef4444; }
`;

const Loading = styled.div`text-align: center; padding: 3rem; font-size: 1.1rem; color: #9ca3af;`;
const ErrorMsg = styled.div`text-align: center; padding: 3rem; color: #ef4444;`;

// ─── Component ────────────────────────────────────────────────────────────────

function Playlist() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('cat') || 'All');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const [lists, setLists] = useState([]);
  const [listItems, setListItems] = useState(new Map());
  const [expandedLists, setExpandedLists] = useState(new Set());
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [favPopover, setFavPopover] = useState(null);

  const itemsByList = useMemo(() => {
    const m = new Map();
    for (const [id, items] of listItems) m.set(id, new Set(items.map(i => i.stream_url)));
    return m;
  }, [listItems]);

  useEffect(() => { fetchPlaylist(); refreshLists(); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput); setPage(1);
      setSearchParams(p => {
        const n = new URLSearchParams(p);
        if (searchInput) n.set('q', searchInput); else n.delete('q');
        n.delete('page'); return n;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    setSearchParams(p => {
      const n = new URLSearchParams(p);
      if (selectedCategory !== 'All') n.set('cat', selectedCategory); else n.delete('cat');
      n.delete('page'); return n;
    }, { replace: true });
  }, [selectedCategory]);

  const fetchPlaylist = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/playlist');
      setPlaylist(res.data);
    } catch { setError('Failed to fetch playlist'); }
    finally { setLoading(false); }
  };

  const refreshLists = useCallback(async () => {
    try {
      const r = await axios.get('/api/lists');
      setLists(r.data);
      const entries = await Promise.all(r.data.map(l =>
        axios.get(`/api/lists/${l.id}/items`).then(res => [l.id, res.data]).catch(() => [l.id, []])
      ));
      setListItems(new Map(entries));
    } catch {}
  }, []);

  const createList = async () => {
    if (!newListName.trim()) return;
    await axios.post('/api/lists', { name: newListName.trim() });
    setNewListName(''); setCreatingList(false); refreshLists();
  };

  const removeFromList = async (listId, streamUrl) => {
    await axios.delete(`/api/lists/${listId}/items/${encodeURIComponent(streamUrl)}`);
    refreshLists();
  };

  const toggleExpand = (id) => setExpandedLists(prev => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });

  const categories = useMemo(() =>
    ['All', ...new Set(playlist.map(c => c.category_name).filter(Boolean))].sort(), [playlist]);

  const filtered = useMemo(() => {
    let r = playlist;
    if (selectedCategory !== 'All') r = r.filter(c => c.category_name === selectedCategory);
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); r = r.filter(c => c.name?.toLowerCase().includes(q)); }
    return r;
  }, [playlist, searchQuery, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageNums = () => { const a = []; for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) a.push(i); return a; };

  if (loading) return <Loading>Loading playlist…</Loading>;
  if (error) return <ErrorMsg>{error}</ErrorMsg>;

  return (
    <>
      <PageGlobal />
      <PageLayout>
        {/* ── Channel pane ── */}
        <ChannelPane>
          <PageHeader>
            <TitleRow>
              <Title>Playlist</Title>
              <ChannelCount>{filtered.length} channels · p.{page}/{totalPages}</ChannelCount>
            </TitleRow>
            <Controls>
              <SearchWrap>
                <SearchIcon>🔍</SearchIcon>
                <SearchInput
                  type="text"
                  placeholder="Search channels…"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />
              </SearchWrap>
              <CategoryDropdown categories={categories} value={selectedCategory} onChange={setSelectedCategory} />
              <RefreshButton onClick={fetchPlaylist}>↺ Refresh</RefreshButton>
            </Controls>
          </PageHeader>

          <TableCard>
            <TableHead>
              <div />
              <div>Name</div>
              <div>Category</div>
              <div>Stream</div>
              <div>Actions</div>
            </TableHead>

            {paginated.map((ch, i) => (
              <TableRow key={`${ch.name}-${i}`}>
                <LogoWrap>
                  {ch.stream_icon && ch.stream_icon !== 'N/A'
                    ? <LogoImg src={ch.stream_icon} alt="" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                    : null
                  }
                  <LogoFallback style={{ display: ch.stream_icon && ch.stream_icon !== 'N/A' ? 'none' : 'flex' }}>📺</LogoFallback>
                </LogoWrap>
                <ChannelName title={ch.name}>{ch.name}</ChannelName>
                <div><CategoryPill cat={ch.category_name}>{ch.category_name || '—'}</CategoryPill></div>
                <StreamUrl title={ch.stream_url}>{ch.stream_url}</StreamUrl>
                <RowActions>
                  <AddBtn onClick={e => {
                    e.stopPropagation();
                    const r = e.currentTarget.getBoundingClientRect();
                    setFavPopover({ channel: ch, x: r.left - 190, y: r.bottom + 4 });
                  }}>+ List</AddBtn>
                  <WatchBtn
                    title="Watch"
                    onClick={() => navigate('/tv', { state: { channels: filtered, channel: ch } })}
                  >▶</WatchBtn>
                </RowActions>
              </TableRow>
            ))}
          </TableCard>

          {totalPages > 1 && (
            <Pagination>
              <PageBtn onClick={() => setPage(1)} disabled={page === 1}>«</PageBtn>
              <PageBtn onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</PageBtn>
              {pageNums().map(n => <PageBtn key={n} active={n === page} onClick={() => setPage(n)}>{n}</PageBtn>)}
              <PageBtn onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</PageBtn>
              <PageBtn onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</PageBtn>
            </Pagination>
          )}
        </ChannelPane>

        {/* ── Lists pane ── */}
        <ListsPane>
          <ListsCard>
            <ListsHeader>
              <ListsTitle>Mes listes</ListsTitle>
              <NewListBtn onClick={() => { setCreatingList(true); setNewListName(''); }}>+ Nouvelle</NewListBtn>
            </ListsHeader>

            {creatingList && (
              <NewListRow>
                <NewListField
                  autoFocus
                  placeholder="Nom de la liste…"
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createList(); if (e.key === 'Escape') { setCreatingList(false); setNewListName(''); } }}
                />
                <ConfirmBtn onClick={createList}>✓</ConfirmBtn>
              </NewListRow>
            )}

            {lists.length === 0 && !creatingList && (
              <EmptyLists>Aucune liste.<br />Cliquez "+ Nouvelle" ou utilisez<br />"+ List" sur un channel.</EmptyLists>
            )}

            {lists.map(list => {
              const items = listItems.get(list.id) || [];
              const isOpen = expandedLists.has(list.id);
              return (
                <ListItem key={list.id}>
                  <ListItemHead onClick={() => toggleExpand(list.id)}>
                    <ListDot />
                    <ListName title={list.name}>{list.name}</ListName>
                    <ListBadge>{items.length}</ListBadge>
                    <ListPlayBtn title="Ouvrir en TV" onClick={e => {
                      e.stopPropagation();
                      const firstItem = items[0];
                      const firstCh = firstItem ? playlist.find(c => c.stream_url === firstItem.stream_url) : null;
                      const idMatch = firstCh?.stream_url.match(/\/(\d+)(?:\.\w+)?$/)?.[1];
                      navigate(`/tv?source=list:${list.id}${idMatch ? `&id=${idMatch}` : ''}`);
                    }}>▶</ListPlayBtn>
                    <ListChevron open={isOpen}>▶</ListChevron>
                  </ListItemHead>
                  {isOpen && (
                    <ListBody>
                      {items.length === 0 && (
                        <div style={{ padding: '0.75rem', fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center' }}>Liste vide</div>
                      )}
                      {items.map(item => (
                        <ListChanRow key={item.stream_url}>
                          {item.stream_icon
                            ? <ListChanLogo src={item.stream_icon} alt="" onError={e => e.target.style.display='none'} />
                            : <div style={{ width: 24, height: 18, background: '#eef0fd', borderRadius: 3, flexShrink: 0 }} />
                          }
                          <ListChanName title={item.name}>{item.name}</ListChanName>
                          <RemoveBtn title="Retirer" onClick={() => removeFromList(list.id, item.stream_url)}>×</RemoveBtn>
                        </ListChanRow>
                      ))}
                    </ListBody>
                  )}
                </ListItem>
              );
            })}
          </ListsCard>
        </ListsPane>

        {favPopover && (
          <FavPopover
            channel={favPopover.channel}
            lists={lists}
            itemsByList={itemsByList}
            anchorPos={{ x: favPopover.x, y: favPopover.y }}
            onClose={() => setFavPopover(null)}
            onRefresh={() => { refreshLists(); setFavPopover(null); }}
          />
        )}
      </PageLayout>
    </>
  );
}

export default Playlist;
