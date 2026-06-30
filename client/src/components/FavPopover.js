import React from 'react';
import styled from 'styled-components';
import axios from 'axios';

export const Popover = styled.div`
  position: fixed;
  background: rgba(15,15,20,0.98);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  padding: 0.5rem 0;
  z-index: 1000;
  min-width: 180px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
`;

export const PopoverItem = styled.div`
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  &:hover { background: rgba(255,255,255,0.08); }
`;

export const PopoverDivider = styled.div`
  height: 1px;
  background: rgba(255,255,255,0.1);
  margin: 0.25rem 0;
`;

export const NewListInput = styled.input`
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
      {lists.filter(l => !l.system).map(l => {
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

export default FavPopover;
