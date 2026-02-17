  // src/pages/HomeVistoriador/Perfil/PerfilVistoriador.jsx
  import React, { useState, useEffect } from 'react';
  import { useNavigate, useParams } from 'react-router-dom';
  import './PerfilVistoriador.css';

  function PerfilVistoriador() {
    const navigate = useNavigate();
    const { id: paramId } = useParams();  // ID da URL

    // Se não vier pela URL, tenta do localStorage
    const getStoredId = () => {
      try {
        const stored = localStorage.getItem('usuario');
        const user = stored ? JSON.parse(stored) : {};
        return user.idvistoriador || user.id || null;
      } catch {
        return null;
      }
    };

    const perfilId = paramId || getStoredId();

    const [menuOpen, setMenuOpen] = useState(false);
    const [vistoriadorInfo, setVistoriadorInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (!perfilId) return;

      const fetchPerfil = async () => {
        setLoading(true);
        try {
          const res = await fetch(`http://localhost:3001/api/funcionarios/perfil/${perfilId}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          setVistoriadorInfo(data);
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

    if (!vistoriadorInfo) {
      return (
        <div className="perfil-container">
          <p>Perfil não encontrado.</p>
        </div>
      );
    }

    return (
      <div className="perfil-container">
        <header className="navbar">
          <div className="logo">CIVIS ({vistoriadorInfo.cargo})</div>
          <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <a href="#" onClick={() => navigate('/home')}>Home</a>
            <a href="#" onClick={() => navigate('/vistoriador/realizar-vistoria')}>Minhas Vistorias</a>
            <a
              href="#"
              onClick={() => navigate(`/vistoriador/editar-perfil-vistoriador/${perfilId}`)}
            >
              Editar Perfil
            </a>
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
                vistoriadorInfo.imagemdeperfil
                  ? `http://localhost:3001/uploads/funcionarios/${vistoriadorInfo.imagemdeperfil}`
                  : '/default-profile.png' // Imagem padrão
              }
              alt="Foto de Perfil"
              className="profile-image"
            />
          </div>

          <div className="info-grid">
            <div><strong>Nome:</strong> {vistoriadorInfo.nome}</div>
            <div><strong>Email:</strong> {vistoriadorInfo.email}</div>
            <div><strong>CPF:</strong> {vistoriadorInfo.cpf}</div>
            <div><strong>Telefone:</strong> {vistoriadorInfo.telefone}</div>
            <div><strong>Cargo:</strong> {vistoriadorInfo.cargo}</div>
          </div>

          <div className="actions">
            <button
              className="edit-button"
              onClick={() => navigate(`/vistoriador/editar-perfil-vistoriador/${perfilId}`)}
            >
              Editar Perfil
            </button>
          </div>
        </main>
      </div>
    );
  }

  export default PerfilVistoriador;
