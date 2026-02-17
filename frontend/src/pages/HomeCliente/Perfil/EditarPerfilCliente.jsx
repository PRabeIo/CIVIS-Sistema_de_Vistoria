import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './EditarPerfilCliente.css';

function EditarPerfilCliente() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [clienteId, setClienteId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    newPassword: '',
    confirmPassword: '',
    profileImage: null,
    previewImage: null
  });

  useEffect(() => {
    const stored = localStorage.getItem('idcliente');

    if (stored) {
      setClienteId(stored);

      fetch(`http://localhost:3001/api/clientes/${stored}`)
        .then(res => res.json())
        .then(data => {
          setFormData(prev => ({
            ...prev,
            nome: data.nome || '',
            email: data.email || '',
            cpf: data.cpf || '',
            telefone: data.telefone || '',
            previewImage: data.imagemdeperfil ? `http://localhost:3001/uploads/clientes/${data.imagemdeperfil}` : null
          }));
        })
        .catch(err => {
          console.error('Erro ao carregar dados do cliente:', err);
        });
    }
  }, []);

  const handleChange = e => {
    const { name, value, files } = e.target;
    if (name === 'cpf') {
      const raw = value.replace(/\D/g, '');
      const masked = raw
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
        .slice(0, 14);
      setFormData(prev => ({ ...prev, cpf: masked }));
    } else if (name === 'telefone') {
      const raw = value.replace(/\D/g, '');
      const masked = raw
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 15);
      setFormData(prev => ({ ...prev, telefone: masked }));
    } else if (name === 'profileImage' && files.length > 0) {
      setFormData(prev => ({
        ...prev,
        profileImage: files[0],
        previewImage: URL.createObjectURL(files[0])
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert("⚠️ A confirmação da nova senha não confere. Por favor, verifique e tente novamente.");
      return;
    }

    setLoading(true);

    const form = new FormData();
    if (formData.nome) form.append('nome', formData.nome);
    if (formData.email) form.append('email', formData.email);
    if (formData.cpf) form.append('cpf', formData.cpf);
    if (formData.telefone) form.append('telefone', formData.telefone);
    if (formData.newPassword) form.append('senha', formData.newPassword);
    if (formData.profileImage) form.append('imagemdeperfil', formData.profileImage);

    try {
      const response = await fetch(`http://localhost:3001/api/clientes/${clienteId}/atualizar-com-imagem`, {
        method: 'PUT',
        body: form
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar o perfil');
      }

      alert("Perfil atualizado com sucesso!");
      navigate('/perfil-cliente');

    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      alert(`Erro ao salvar perfil: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="perfil-container">
      <header className="navbar">
        <div className="logo">CIVIS (Cliente)</div>
        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <a onClick={() => navigate('/home')}>Home</a>
          <a onClick={() => navigate('/cliente/minhas-vistorias')}>Minhas Vistorias</a>
          <button className="logout-button mobile-logout" onClick={handleLogout}>Sair</button>
        </nav>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        <button className="logout-button desktop-logout" onClick={handleLogout}>Sair</button>
      </header>
      <main className="main-content">
        <h1>Editar Meu Perfil</h1>
        <div className="profile-image-container">
          <img
            src={formData.previewImage || '/default-profile.png'}
            alt="Foto de Perfil"
            className="profile-image"
          />
        </div>
        <div className="info-grid">
          <div>
            <strong>Nome:</strong>
            <input type="text" name="nome" value={formData.nome} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <strong>Email:</strong>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <strong>CPF:</strong>
            <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} className="input-field" maxLength={14} />
          </div>
          <div>
            <strong>Telefone:</strong>
            <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} className="input-field" maxLength={15} />
          </div>
          <div>
            <strong>Nova Senha:</strong>
            <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <strong>Confirmar Nova Senha:</strong>
            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <strong>Foto de perfil:</strong>
            <input type="file" name="profileImage" accept="image/*" onChange={handleChange} />
          </div>
        </div>
        <div className="actions">
          <button
            className="edit-button"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>
      </main>
    </div>
  );
}

export default EditarPerfilCliente;
