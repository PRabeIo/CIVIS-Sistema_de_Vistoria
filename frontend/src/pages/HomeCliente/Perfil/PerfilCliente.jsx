import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './PerfilCliente.css';

function PerfilCliente() {
  const navigate = useNavigate();
  const { id: paramId } = useParams();

  const getStoredId = () => {
    try {
      const stored = localStorage.getItem('usuario');
      const user = stored ? JSON.parse(stored) : {};
      return user.idcliente || user.id || null;
    } catch {
      return null;
    }
  };

  const perfilId = paramId || getStoredId();

  const [menuOpen, setMenuOpen] = useState(false);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!perfilId) return;

    const fetchPerfil = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3001/api/clientes/${perfilId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setClienteInfo(data);
      } catch (err) {
        console.error('Erro ao buscar perfil:', err);
        alert('Não foi possível carregar seu perfil.');
      } finally {
        setLoading(false);
      }
    };

    fetchPerfil();
  }, [perfilId]);

  const handleLogout = () => {
    alert('Você será desconectado!');
    localStorage.clear();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="perfil-container">
        <p>Carregando perfil...</p>
      </div>
    );
  }

  if (!clienteInfo) {
    return (
      <div className="perfil-container">
        <p>Perfil não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="perfil-container">
      <header className="navbar">
        <div className="logo">CIVIS (Cliente)</div>
        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <a href="#" onClick={() => navigate('/home')}>Home</a>
          <a href="#" onClick={() => navigate('/cliente/minhas-vistorias')}>Minhas Vistorias</a>
          <a href="#" onClick={() => navigate('/cliente/editar-perfil')}>Editar Perfil</a>
          <button className="logout-button mobile-logout" onClick={handleLogout}>Sair</button>
        </nav>
        <button className="menu-toggle" onClick={() => setMenuOpen(o => !o)}>☰</button>
        <button className="logout-button desktop-logout" onClick={handleLogout}>Sair</button>
      </header>

      <main className="main-content">
        <h1>Meu Perfil</h1>

        <div className="profile-image-container">
          <img
            src={
              clienteInfo.imagemdeperfil
                ? `http://localhost:3001/uploads/clientes/${clienteInfo.imagemdeperfil}`
                : '/default-profile.png'
            }
            alt="Foto de Perfil"
            className="profile-image"
          />
        </div>

        <div className="info-grid">
          <div><strong>Nome:</strong> {clienteInfo.nome}</div>
          <div><strong>Email:</strong> {clienteInfo.email}</div>
          <div><strong>CPF:</strong> {clienteInfo.cpf}</div>
          <div><strong>Telefone:</strong> {clienteInfo.telefone}</div>
        </div>

        <div className="actions">
          <button
            className="edit-button"
            onClick={() => navigate('/editar-perfil-cliente')}
          >
            Editar Perfil
          </button>
        </div>
      </main>
    </div>
  );
}

export default PerfilCliente;
