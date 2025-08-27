import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const Nav = styled.nav`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem 2rem;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const NavContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled(Link)`
  color: white;
  text-decoration: none;
  font-size: 1.5rem;
  font-weight: bold;
`;

const NavLinks = styled.div`
  display: flex;
  gap: 2rem;
`;

const NavLink = styled(Link)`
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: rgba(255,255,255,0.1);
  }
  
  &.active {
    background-color: rgba(255,255,255,0.2);
  }
`;

function Navbar() {
  const location = useLocation();
  
  return (
    <Nav>
      <NavContainer>
        <Logo to="/">IPTV TV Manager</Logo>
        <NavLinks>
          <NavLink to="/" className={location.pathname === '/' ? 'active' : ''}>
            Home
          </NavLink>
          <NavLink to="/series" className={location.pathname.startsWith('/series') ? 'active' : ''}>
            Series
          </NavLink>
          <NavLink to="/movies" className={location.pathname.startsWith('/movies') ? 'active' : ''}>
            Movies
          </NavLink>
          <NavLink to="/playlist" className={location.pathname === '/playlist' ? 'active' : ''}>
            Playlist
          </NavLink>
          <NavLink to="/downloads" className={location.pathname === '/downloads' ? 'active' : ''}>
            Downloads
          </NavLink>
        </NavLinks>
      </NavContainer>
    </Nav>
  );
}

export default Navbar;
