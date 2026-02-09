import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../HomeCliente.css'; 

function AgendarVistoria() {
  const navigate = useNavigate();
  const [imovelSelecionado, setImovelSelecionado] = useState('');
  const [dataDesejada, setDataDesejada] = useState('');
  const [horaDesejada, setHoraDesejada] = useState('');  // novo estado para hora
  const [imoveisDisponiveis, setImoveisDisponiveis] = useState([]);

  useEffect(() => {
    const fetchImoveis = async () => {
      const idCliente = localStorage.getItem("idcliente");
      if (!idCliente) {
        alert("Cliente não identificado. Faça login novamente.");
        navigate("/login");
        return;
      }

      try {
        const res = await fetch(`http://localhost:3001/api/imoveis/cliente/${idCliente}/disponiveis`);
        if (!res.ok) throw new Error("Erro ao buscar imóveis");
        const data = await res.json();
        setImoveisDisponiveis(data);
      } catch (err) {
        console.error(err);
        alert("Erro ao carregar imóveis.");
      }
    };

    fetchImoveis();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imovelSelecionado || !dataDesejada || !horaDesejada) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/vistorias/${imovelSelecionado}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dataagendada: dataDesejada,
          horaagendada: horaDesejada  // envia a hora também
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao agendar vistoria");
      }

      alert("Sua solicitação de vistoria foi enviada com sucesso!");
      navigate('/home-cliente');  // Redireciona para a home do cliente
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
        <button className="back-arrow" onClick={() => navigate("/home-cliente")} style={{ marginBottom: '20px', marginLeft: '20px', alignSelf: 'flex-start' }}>
          &#8592; Voltar
        </button>
        <h1 className="titulo-centralizado">Agendar Vistoria</h1>

        <form onSubmit={handleSubmit} className="login-form" style={{ width: '90%', maxWidth: '400px', margin: '0 auto', padding: '30px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
          <label htmlFor="imovel">Selecione o Imóvel:</label>
          <select
            id="imovel"
            value={imovelSelecionado}
            onChange={(e) => setImovelSelecionado(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '10px' }}
          >
            <option value="">-- Selecione um imóvel --</option>
            {imoveisDisponiveis.map(imovel => (
              <option key={imovel.idvistoria} value={imovel.idvistoria}>
                {imovel.descricao || `${imovel.nomeempreendimento} - Bloco ${imovel.bloco}, Nº ${imovel.numero}`}
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

          <button type="submit" className="login-button">
            Agendar 
          </button>
        </form>
      </main>
    </div>
  );
}


export default AgendarVistoria;
