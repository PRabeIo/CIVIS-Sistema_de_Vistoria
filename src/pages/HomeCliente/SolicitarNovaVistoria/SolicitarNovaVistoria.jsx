import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../HomeCliente.css'; 

function SolicitarNovaVistoria() {
  const navigate = useNavigate();
  const [vistoriaSelecionada, setVistoriaSelecionada] = useState('');
  const [dataDesejada, setDataDesejada] = useState('');
  const [horaDesejada, setHoraDesejada] = useState('');
  const [vistoriasPendentes, setVistoriasPendentes] = useState([]);

  useEffect(() => {
    const fetchVistorias = async () => {
      const idCliente = localStorage.getItem("idcliente");
      if (!idCliente) {
        alert("Cliente não identificado. Faça login novamente.");
        navigate("/login");
        return;
      }

      try {
        const res = await fetch(`http://localhost:3001/api/vistorias/cliente/${idCliente}/aguardando-validacao`);
        if (!res.ok) throw new Error("Erro ao buscar vistorias");
        const data = await res.json();
        setVistoriasPendentes(data);
      } catch (err) {
        console.error(err);
        alert("Erro ao carregar vistorias.");
      }
    };

    fetchVistorias();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!vistoriaSelecionada || !dataDesejada || !horaDesejada) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/vistorias/reagendar/${vistoriaSelecionada}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataagendada: dataDesejada,
          horaagendada: horaDesejada,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao reagendar vistoria");
      }

      alert("Sua solicitação de reagendamento foi enviada com sucesso!");
      navigate('/home-cliente');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="home-container">
      <header className="navbar">
        <div className="logo">CIVIS</div>
        <nav className="nav-links">
          <a href="#" onClick={() => navigate("/home-cliente")}>Home</a>
          <a href="#" onClick={() => navigate("/agendar-vistoria")}>Agendar Vistoria</a>
          <a href="#" onClick={() => navigate("/minhas-vistorias")}>Minhas Vistorias</a>
          <a href="#" onClick={() => navigate("/meus-imoveis")}>Meus Imóveis</a>
        </nav>
        <button className="logout-button" onClick={() => navigate("/login")}>
          Sair
        </button>
      </header>

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          className="back-arrow"
          onClick={() => navigate("/home-cliente")}
          style={{ marginBottom: '20px', marginLeft: '20px', alignSelf: 'flex-start' }}
        >
          &#8592; Voltar
        </button>
        <h1 className="titulo-centralizado">Reagendar Vistoria</h1>

        <form
          onSubmit={handleSubmit}
          className="login-form"
          style={{
            width: '90%',
            maxWidth: '400px',
            margin: '0 auto',
            padding: '30px',
            backgroundColor: 'white',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}
        >
          <label htmlFor="vistoria">Selecione a Vistoria:</label>
          <select
            id="vistoria"
            value={vistoriaSelecionada}
            onChange={(e) => setVistoriaSelecionada(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '10px' }}
          >
            <option value="">-- Selecione a vistoria --</option>
            {vistoriasPendentes.map(vistoria => (
              <option key={vistoria.idvistoria} value={vistoria.idvistoria}>
                {vistoria.descricao || `${vistoria.nomeempreendimento} - Bloco ${vistoria.bloco}, Nº ${vistoria.numero}`}
              </option>
            ))}
          </select>

          <label htmlFor="data">Data Desejada:</label>
          <input
            type="date"
            id="data"
            value={dataDesejada}
            onChange={(e) => setDataDesejada(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '10px' }}
          />

          <label htmlFor="hora">Hora Desejada:</label>
          <input
            type="time"
            id="hora"
            value={horaDesejada}
            onChange={(e) => setHoraDesejada(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '25px' }}
          />

          <button
            type="submit"
            className="login-button"
            style={{ backgroundColor: '#007bff', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Reagendar
          </button>
        </form>
      </main>
    </div>
  );
}

export default SolicitarNovaVistoria;
