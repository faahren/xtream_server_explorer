import React, { useState } from 'react';
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
  
  @media (max-width: 768px) {
    display: none;
  }
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

const BurgerButton = styled.button`
  display: none;
  flex-direction: column;
  justify-content: space-around;
  width: 2rem;
  height: 2rem;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 10;
  
  @media (max-width: 768px) {
    display: flex;
  }
  
  div {
    width: 2rem;
    height: 0.25rem;
    background: white;
    border-radius: 10px;
    transition: all 0.3s linear;
    position: relative;
    transform-origin: 1px;
    
    &:first-child {
      transform: ${({ isOpen }) => isOpen ? 'rotate(45deg)' : 'rotate(0)'};
    }
    
    &:nth-child(2) {
      opacity: ${({ isOpen }) => isOpen ? '0' : '1'};
      transform: ${({ isOpen }) => isOpen ? 'translateX(20px)' : 'translateX(0)'};
    }
    
    &:nth-child(3) {
      transform: ${({ isOpen }) => isOpen ? 'rotate(-45deg)' : 'rotate(0)'};
    }
  }
`;

const MobileMenu = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: ${({ isOpen }) => isOpen ? 'flex' : 'none'};
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding-top: 5rem;
    z-index: 999;
  }
`;

const MobileMenuHeader = styled.div`
  position: absolute;
  top: 1rem;
  right: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const CloseButton = styled.button`
  background: transparent;
  border: 2px solid white;
  color: white;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: white;
    color: #667eea;
  }
`;

const MobileNavLink = styled(Link)`
  color: white;
  text-decoration: none;
  padding: 1rem 2rem;
  font-size: 1.2rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
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
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };
  
  const closeMenu = () => {
    setIsOpen(false);
  };
  
  return (
    <Nav>
      <NavContainer>
        <Logo to="/" onClick={closeMenu}>IPTV TV Manager</Logo>
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
        <BurgerButton isOpen={isOpen} onClick={toggleMenu}>
          <div />
          <div />
          <div />
        </BurgerButton>
      </NavContainer>
      
      <MobileMenu isOpen={isOpen}>
        <MobileMenuHeader>
          <CloseButton onClick={closeMenu}>×</CloseButton>
        </MobileMenuHeader>
        <MobileNavLink to="/" className={location.pathname === '/' ? 'active' : ''} onClick={closeMenu}>
          Home
        </MobileNavLink>
        <MobileNavLink to="/series" className={location.pathname.startsWith('/series') ? 'active' : ''} onClick={closeMenu}>
          Series
        </MobileNavLink>
        <MobileNavLink to="/movies" className={location.pathname.startsWith('/movies') ? 'active' : ''} onClick={closeMenu}>
          Movies
        </MobileNavLink>
        <MobileNavLink to="/playlist" className={location.pathname === '/playlist' ? 'active' : ''} onClick={closeMenu}>
          Playlist
        </MobileNavLink>
        <MobileNavLink to="/downloads" className={location.pathname === '/downloads' ? 'active' : ''} onClick={closeMenu}>
          Downloads
        </MobileNavLink>
      </MobileMenu>
    </Nav>
  );
}

export default Navbar;
