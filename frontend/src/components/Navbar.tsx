import React from 'react';

const Navbar: React.FC = () => {
  return (
    <nav className="glass-card" style={{ 
      margin: '20px', 
      padding: '15px 40px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      borderRadius: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '20px'
        }}>T</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          <span className="gradient-text">TaskFlow</span>
        </h2>
      </div>
      
      <div style={{ display: 'flex', gap: '30px', fontWeight: 500 }}>
        <a href="#" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Dashboard</a>
        <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Projects</a>
        <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Team</a>
      </div>

      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <button style={{ background: 'transparent', color: 'white', border: '1px solid var(--glass-border)' }}>Login</button>
        <button className="btn-primary">Sign Up</button>
      </div>
    </nav>
  );
};

export default Navbar;
