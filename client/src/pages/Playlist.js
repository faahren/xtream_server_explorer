import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';

const PAGE_SIZE = 50;

const PlaylistContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  @media (min-width: 768px) { padding: 2rem; }
`;

const Header = styled.div`
  margin-bottom: 1.5rem;
`;

const Title = styled.h1`
  color: #333;
  margin: 0 0 1rem 0;
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
  min-width: 200px;
`;

// ── Searchable category dropdown ──────────────────────────────────────────────

const DropdownWrap = styled.div`
  position: relative;
  min-width: 200px;
`;

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
  &::after {
    content: '▾';
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #666;
  }
  &:focus { outline: none; border-color: #667eea; }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 5px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 200;
  display: flex;
  flex-direction: column;
  max-height: 320px;
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
  const ref = React.useRef(null);

  const filtered = categories.filter(c =>
    !search || c.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const onClickOut = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, []);

  return (
    <DropdownWrap ref={ref}>
      <DropdownTrigger onClick={() => { setOpen(o => !o); setSearch(''); }}>
        {value === 'All' ? 'All categories' : value}
      </DropdownTrigger>
      {open && (
        <DropdownMenu>
          <DropdownSearch
            autoFocus
            placeholder="Search categories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <DropdownList>
            {filtered.map(cat => (
              <DropdownItem
                key={cat}
                active={cat === value}
                onClick={() => { onChange(cat); setOpen(false); setSearch(''); }}
              >
                {cat === 'All' ? 'All categories' : cat}
              </DropdownItem>
            ))}
          </DropdownList>
        </DropdownMenu>
      )}
    </DropdownWrap>
  );
}

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
    grid-template-columns: 70px 2fr 1.5fr 2.5fr 100px;
    gap: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    font-weight: bold;
    color: #333;
    border-bottom: 1px solid #e9ecef;
  }
`;

const TableRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e9ecef;
  align-items: center;
  &:hover { background: #f8f9fa; }
  &:last-child { border-bottom: none; }

  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: 70px 2fr 1.5fr 2.5fr 100px;
    gap: 1rem;
    padding: 1rem;
    flex-wrap: unset;
  }
`;

const ChannelLogo = styled.img`
  width: 50px;
  height: 35px;
  object-fit: cover;
  border-radius: 4px;
`;

const NoLogo = styled.div`
  width: 50px;
  height: 35px;
  background: #f0f0f0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
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
`;

const CategoryName = styled.div`
  color: #666;
  font-size: 0.85rem;
  flex-shrink: 0;
`;

const StreamUrl = styled.div`
  color: #999;
  font-size: 0.75rem;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: none;
  @media (min-width: 768px) { display: block; }
`;

const WatchButton = styled.button`
  padding: 0.35rem 0.75rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.8rem;
  flex-shrink: 0;
  &:hover { background: #5a6fd8; }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
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

const Error = styled.div`
  text-align: center;
  padding: 2rem;
  color: #e74c3c;
  font-size: 1.2rem;
`;

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

  useEffect(() => { fetchPlaylist(); }, []);

  // Debounce search → sync to URL
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

  // Sync category to URL
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
      const response = await axios.get('/api/playlist');
      setPlaylist(response.data);
    } catch (err) {
      setError('Failed to fetch playlist');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    return ['All', ...new Set(playlist.map(c => c.category_name).filter(Boolean))].sort();
  }, [playlist]);

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
    const delta = 2;
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) pages.push(i);
    return pages;
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <CategoryDropdown
            categories={categories}
            value={selectedCategory}
            onChange={setSelectedCategory}
          />
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
          <div>Action</div>
        </TableHeader>

        {paginated.map((channel, index) => (
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
            <StreamUrl title={channel.stream_url}>{channel.stream_url}</StreamUrl>
            <WatchButton onClick={() => navigate('/tv', { state: { channels: filtered, channel } })}>
              ▶ Watch
            </WatchButton>
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
    </PlaylistContainer>
  );
}

export default Playlist;
