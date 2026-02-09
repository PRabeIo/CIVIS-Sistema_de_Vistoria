import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./HistoricoVistoriasPage.css";

function HistoricoVistoriasPage() {
  const { idCliente } = useParams();
  const navigate = useNavigate();
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchHistorico() {
      try {
        setLoading(true);
        setError(null);
        await new Promise((r) => setTimeout(r, 1000));

        const dadosSimulados = [
          {
            id: 1,
            data: "2025-06-30",
            hora: "14:30",
            status: "Concluída",
            observacao: "Tudo ok",
          },
          {
            id: 2,
            data: "2025-05-15",
            hora: "10:00",
            status: "Pendente",
            observacao: "Aguardando documentos",
          },
          {
            id: 3,
            data: "2025-04-20",
            hora: "08:45",
            status: "Cancelada",
            observacao: "Cliente desistiu",
          },
        ];

        setHistorico(dadosSimulados);
      } catch (e) {
        setError("Erro ao carregar histórico.");
      } finally {
        setLoading(false);
      }
    }

    fetchHistorico();
  }, [idCliente]);

  if (loading) return <p>Carregando histórico...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="historico-vistorias-container">
      <h2>Histórico de Vistorias</h2>

      {historico.length === 0 ? (
        <p>Nenhuma vistoria encontrada para este cliente.</p>
      ) : (
        <motion.ul
          className="lista-historico"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {historico.map(({ id, data, hora, status, observacao }) => (
            <li key={id} className="item-vistoria">
              <p className="linha-data-hora">
                <strong>Data:</strong> {data || "—"} &nbsp; | &nbsp;
                <strong>Hora:</strong> {hora || "[Hora não definida]"}
              </p>

              <p><strong>Status:</strong> {status}</p>
              <p><strong>Observação:</strong> {observacao}</p>
            </li>
          ))}
        </motion.ul>
      )}

      <button className="btn-voltar" onClick={() => navigate(-1)}>
        Voltar
      </button>
    </div>
  );
}

export default HistoricoVistoriasPage;
