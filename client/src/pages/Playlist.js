import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import FavPopover from '../components/FavPopover';

const PAGE_SIZE = 50;

// ─── Layout ──────────────────────────────────────────────────────────────────

const PageLayout = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  @media (min-width: 768px) { padding: 1.5rem 2rem; }
`;

const ChannelPane = styled.div`
  flex: 1;
  min-width: 0;
`;

const ListsPane = styled.div`
  display: none;
  @media (min-width: 900px) {
    display: flex;
    flex-direction: column;
    width: 280px;
    flex-shrink: 0;
    position: sticky;
    top: 72px;
    max-height: calc(100vh - 80px);
    overflow-y: auto;
  }
`;

// ─── Channel pane ─────────────────────────────────────────────────────────────

const Header = styled.div`
  margin-bottom: 1rem;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
  font-size: 1.4rem;
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`;

const SearchInput = styled.input`
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  flex: 1;
  min-width: 180px;
`;

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  &:hover { background: #5a6fd8; }
`;

const ResultInfo = styled.div`
  margin-bottom: 0.75rem;
  color: #666;
  font-size: 0.9rem;
`;

const PlaylistTable = styled.div`
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
`;

const TableHeader = styled.div`
  display: none;
  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: 50px 2fr 1.5fr 2fr 120px;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: #f8f9fa;
    font-weight: bold;
    color: #333;
    border-bottom: 1px solid #e9ecef;
    font-size: 0.85rem;
  }
`;

const TableRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid #e9ecef;
  align-items: center;
  &:hover { background: #f8f9fa; }
  &:last-child { border-bottom: none; }
  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: 50px 2fr 1.5fr 2fr 120px;
    gap: 0.75rem;
    flex-wrap: unset;
  }
`;

const ChannelLogo = styled.img`
  width: 40px;
  height: 28px;
  object-fit: cover;
  border-radius: 3px;
`;

const NoLogo = styled.div`
  width: 40px;
  height: 28px;
  background: #f0f0f0;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  color: #999;
`;

const ChannelName = styled.div`
  font-weight: 500;
  color: #333;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
`;

const CategoryName = styled.div`
  color: #888;
  font-size: 0.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StreamUrl = styled.div`
  color: #bbb;
  font-size: 0.7rem;
  font-family: monospace;
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
  padding: 0.3rem 0.55rem;
  background: #f0f2ff;
  color: #667eea;
  border: 1px solid #d0d5f7;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  &:hover { background: #667eea; color: white; border-color: #667eea; }
`;

const WatchButton = styled.button`
  padding: 0.3rem 0.55rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.8rem;
  &:hover { background: #5a6fd8; }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
  flex-wrap: wrap;
`;

const PageButton = styled.button`
  padding: 0.4rem 0.8rem;
  border: 1px solid ${p => p.active ? '#667eea' : '#ddd'};
  background: ${p => p.active ? '#667eea' : 'white'};
  color: ${p => p.active ? 'white' : '#333'};
  border-radius: 5px;
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${p => p.disabled ? 0.5 : 1};
  font-size: 0.9rem;
  &:hover:not(:disabled) { background: ${p => p.active ? '#5a6fd8' : '#f8f9fa'}; }
`;

const Loading = styled.div`
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: #666;
`;

const ErrorMsg = styled.div`
  text-align: center;
  padding: 2rem;
  color: #e74c3c;
  font-size: 1.2rem;
`;

// ─── Lists pane ───────────────────────────────────────────────────────────────

const ListsCard = styled.div`
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.08);
  overflow: hidden;
`;

const ListsPaneHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem 0.75rem;
  border-bottom: 1px solid #f0f0f0;
`;

const ListsPaneTitle = styled.h2`
  margin: 0;
  font-size: 0.95rem;
  color: #333;
  font-weight: 600;
`;

const NewListBtn = styled.button`
  font-size: 0.78rem;
  padding: 0.3rem 0.6rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
  &:hover { background: #5a6fd8; }
`;

const NewListInputRow = styled.div`
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  gap: 0.4rem;
`;

const NewListInputField = styled.input`
  flex: 1;
  padding: 0.35rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 0.85rem;
  outline: none;
  &:focus { border-color: #667eea; }
`;

const EmptyLists = styled.div`
  padding: 1.5rem 1rem;
  color: #aaa;
  font-size: 0.85rem;
  text-align: center;
`;

const ListItem = styled.div`
  border-bottom: 1px solid #f5f5f5;
  &:last-child { border-bottom: none; }
`;

const ListItemHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  &:hover { background: #fafafa; }
`;

const ListItemName = styled.span`
  flex: 1;
  font-size: 0.88rem;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ListItemCount = styled.span`
  font-size: 0.72rem;
  background: #f0f2ff;
  color: #667eea;
  border-radius: 10px;
  padding: 0.1rem 0.5rem;
  white-space: nowrap;
  flex-shrink: 0;
`;

const ListPlayBtn = styled.button`
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.1rem 0.3rem;
  flex-shrink: 0;
  &:hover { color: #5a6fd8; }
`;

const ListChevron = styled.span`
  font-size: 0.65rem;
  color: #bbb;
  flex-shrink: 0;
  transition: transform 0.15s;
  transform: ${p => p.open ? 'rotate(90deg)' : 'rotate(0)'};
`;

const ListBody = styled.div`
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
`;

const ListChannelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid #f5f5f5;
  &:last-child { border-bottom: none; }
  &:hover { background: #f0f2ff; }
`;

const ListChannelLogo = styled.img`
  width: 28px;
  height: 20px;
  object-fit: cover;
  border-radius: 2px;
  flex-shrink: 0;
`;

const ListChannelName = styled.span`
  flex: 1;
  font-size: 0.78rem;
  color: #444;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RemoveBtn = styled.button`
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.1rem 0.25rem;
  flex-shrink: 0;
  &:hover { color: #e74c3c; }
`;

// ─── Searchable category dropdown (unchanged) ─────────────────────────────────

const DropdownWrap = styled.div`position: relative; min-width: 180px;`;

const DropdownTrigger = styled.button`
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  background: white;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #333;
  position: relative;
  &::after { content: '▾'; position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); color: #666; }
  &:focus { outline: none; border-color: #667eea; }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 5px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 200;
  display: flex;
  flex-direction: column;
  max-height: 300px;
`;

const DropdownSearch = styled.input`
  padding: 0.5rem 0.75rem;
  border: none;
  border-bottom: 1px solid #eee;
  font-size: 0.9rem;
  outline: none;
  border-radius: 5px 5px 0 0;
  flex-shrink: 0;
`;

const DropdownList = styled.div`
  overflow-y: auto;
  flex: 1;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
`;

const DropdownItem = styled.div`
  padding: 0.45rem 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
  color: #333;
  background: ${p => p.active ? '#f0f2ff' : 'transparent'};
  font-weight: ${p => p.active ? 600 : 400};
  &:hover { background: #f8f9fa; }
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
    <DropdownWrap ref={ref}>
      <DropdownTrigger onClick={() => { setOpen(o => !o); setSearch(''); }}>
        {value === 'All' ? 'All categories' : value}
      </DropdownTrigger>
      {open && (
        <DropdownMenu>
          <DropdownSearch autoFocus placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} />
          <DropdownList>
            {filtered.map(cat => (
              <DropdownItem key={cat} active={cat === value} onClick={() => { onChange(cat); setOpen(false); setSearch(''); }}>
                {cat === 'All' ? 'All categories' : cat}
              </DropdownItem>
            ))}
          </DropdownList>
        </DropdownMenu>
      )}
    </DropdownWrap>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

function Playlist() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Channel state
  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('cat') || 'All');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Lists state
  const [lists, setLists] = useState([]);
  const [listItems, setListItems] = useState(new Map()); // Map<listId, Array<item>>
  const [expandedLists, setExpandedLists] = useState(new Set());
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [favPopover, setFavPopover] = useState(null); // { channel, x, y }

  // Derived: O(1) membership check
  const itemsByList = useMemo(() => {
    const m = new Map();
    for (const [id, items] of listItems) {
      m.set(id, new Set(items.map(i => i.stream_url)));
    }
    return m;
  }, [listItems]);

  useEffect(() => { fetchPlaylist(); refreshLists(); }, []);

  // Debounce search → URL
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
      setSearchParams(p => {
        const next = new URLSearchParams(p);
        if (searchInput) next.set('q', searchInput); else next.delete('q');
        next.delete('page');
        return next;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Sync category → URL
  useEffect(() => {
    setPage(1);
    setSearchParams(p => {
      const next = new URLSearchParams(p);
      if (selectedCategory !== 'All') next.set('cat', selectedCategory); else next.delete('cat');
      next.delete('page');
      return next;
    }, { replace: true });
  }, [selectedCategory]);

  const fetchPlaylist = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/playlist');
      setPlaylist(res.data);
    } catch {
      setError('Failed to fetch playlist');
    } finally {
      setLoading(false);
    }
  };

  const refreshLists = useCallback(async () => {
    try {
      const listsRes = await axios.get('/api/lists');
      setLists(listsRes.data);
      const entries = await Promise.all(
        listsRes.data.map(l =>
          axios.get(`/api/lists/${l.id}/items`)
            .then(r => [l.id, r.data])
            .catch(() => [l.id, []])
        )
      );
      setListItems(new Map(entries));
    } catch {}
  }, []);

  const createList = async () => {
    if (!newListName.trim()) return;
    await axios.post('/api/lists', { name: newListName.trim() });
    setNewListName('');
    setCreatingList(false);
    refreshLists();
  };

  const removeFromList = async (listId, streamUrl) => {
    await axios.delete(`/api/lists/${listId}/items/${encodeURIComponent(streamUrl)}`);
    refreshLists();
  };

  const toggleExpand = (id) => {
    setExpandedLists(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const categories = useMemo(() =>
    ['All', ...new Set(playlist.map(c => c.category_name).filter(Boolean))].sort(),
    [playlist]
  );

  const filtered = useMemo(() => {
    let result = playlist;
    if (selectedCategory !== 'All') result = result.filter(c => c.category_name === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name?.toLowerCase().includes(q));
    }
    return result;
  }, [playlist, searchQuery, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageNumbers = () => {
    const pages = [];
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);
    return pages;
  };

  if (loading) return <Loading>Loading playlist...</Loading>;
  if (error) return <ErrorMsg>{error}</ErrorMsg>;

  return (
    <PageLayout>
      {/* ── Channel pane ── */}
      <ChannelPane>
        <Header>
          <TitleRow>
            <Title>Playlist</Title>
          </TitleRow>
          <Controls>
            <SearchInput
              type="text"
              placeholder="Search channels..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <CategoryDropdown categories={categories} value={selectedCategory} onChange={setSelectedCategory} />
            <RefreshButton onClick={fetchPlaylist}>Refresh</RefreshButton>
          </Controls>
        </Header>

        <ResultInfo>
          {filtered.length} channel{filtered.length !== 1 ? 's' : ''} — page {page}/{totalPages}
        </ResultInfo>

        <PlaylistTable>
          <TableHeader>
            <div>Logo</div>
            <div>Name</div>
            <div>Category</div>
            <div>Stream URL</div>
            <div>Actions</div>
          </TableHeader>

          {paginated.map((channel, index) => (
            <TableRow key={`${channel.name}-${index}`}>
              <div>
                {channel.stream_icon && channel.stream_icon !== 'N/A'
                  ? <ChannelLogo src={channel.stream_icon} alt={channel.name} />
                  : <NoLogo>—</NoLogo>
                }
              </div>
              <ChannelName>{channel.name}</ChannelName>
              <CategoryName>{channel.category_name}</CategoryName>
              <StreamUrl title={channel.stream_url}>{channel.stream_url}</StreamUrl>
              <RowActions>
                <AddBtn
                  title="Ajouter à une liste"
                  onClick={e => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setFavPopover({ channel, x: rect.left - 190, y: rect.bottom + 4 });
                  }}
                >+ Liste</AddBtn>
                <WatchButton onClick={() => navigate('/tv', { state: { channels: filtered, channel } })}>
                  ▶
                </WatchButton>
              </RowActions>
            </TableRow>
          ))}
        </PlaylistTable>

        {totalPages > 1 && (
          <Pagination>
            <PageButton onClick={() => setPage(1)} disabled={page === 1}>«</PageButton>
            <PageButton onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</PageButton>
            {pageNumbers().map(n => (
              <PageButton key={n} active={n === page} onClick={() => setPage(n)}>{n}</PageButton>
            ))}
            <PageButton onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</PageButton>
            <PageButton onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</PageButton>
          </Pagination>
        )}
      </ChannelPane>

      {/* ── Lists pane ── */}
      <ListsPane>
        <ListsCard>
          <ListsPaneHeader>
            <ListsPaneTitle>Mes listes</ListsPaneTitle>
            <NewListBtn onClick={() => { setCreatingList(true); setNewListName(''); }}>
              + Nouvelle
            </NewListBtn>
          </ListsPaneHeader>

          {creatingList && (
            <NewListInputRow>
              <NewListInputField
                autoFocus
                placeholder="Nom de la liste..."
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createList();
                  if (e.key === 'Escape') { setCreatingList(false); setNewListName(''); }
                }}
              />
            </NewListInputRow>
          )}

          {lists.length === 0 && !creatingList && (
            <EmptyLists>Aucune liste.<br />Créez-en une ou ajoutez des chaînes avec "+ Liste".</EmptyLists>
          )}

          {lists.map(list => {
            const items = listItems.get(list.id) || [];
            const isOpen = expandedLists.has(list.id);
            return (
              <ListItem key={list.id}>
                <ListItemHeader onClick={() => toggleExpand(list.id)}>
                  <ListItemName title={list.name}>{list.name}</ListItemName>
                  <ListItemCount>{items.length} ch.</ListItemCount>
                  <ListPlayBtn
                    title="Ouvrir en mode TV"
                    onClick={e => {
                      e.stopPropagation();
                      navigate(`/tv?source=list:${list.id}`);
                    }}
                  >▶</ListPlayBtn>
                  <ListChevron open={isOpen}>▶</ListChevron>
                </ListItemHeader>

                {isOpen && (
                  <ListBody>
                    {items.length === 0 && (
                      <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.78rem', color: '#bbb' }}>
                        Liste vide
                      </div>
                    )}
                    {items.map(item => (
                      <ListChannelRow key={item.stream_url}>
                        {item.stream_icon
                          ? <ListChannelLogo src={item.stream_icon} alt="" onError={e => e.target.style.display = 'none'} />
                          : <div style={{ width: 28, height: 20, background: '#eee', borderRadius: 2, flexShrink: 0 }} />
                        }
                        <ListChannelName title={item.name}>{item.name}</ListChannelName>
                        <RemoveBtn
                          title="Retirer de la liste"
                          onClick={() => removeFromList(list.id, item.stream_url)}
                        >×</RemoveBtn>
                      </ListChannelRow>
                    ))}
                  </ListBody>
                )}
              </ListItem>
            );
          })}
        </ListsCard>
      </ListsPane>

      {/* FavPopover */}
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
  );
}

export default Playlist;
