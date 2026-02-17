import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './ReagendarVistoriaPage.css'; // Create this CSS file

function ReagendamentoVistoria({ onLogout }) {
    const navigate = useNavigate();
    const { vistoriaId } = useParams(); // Get survey ID from URL, e.g., /reagendar/123

    // State to hold form data
    const [surveyDetails, setSurveyDetails] = useState({
        id: vistoriaId, // Pre-fill from URL param
        currentDate: '', // To display current date (fetched)
        currentTime: '', // To display current time (fetched)
        newDate: '',
        newTime: '',
        reason: '',
        comments: ''
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Simulate fetching existing survey details
    useEffect(() => {
        const fetchSurveyDetails = async () => {
            setLoading(true);
            setError('');
            // In a real application, you would fetch data from an API:
            // try {
            //   const response = await fetch(`/api/vistorias/${vistoriaId}`);
            //   if (!response.ok) throw new Error('Failed to fetch survey details');
            //   const data = await response.json();
            //   setSurveyDetails(prev => ({
            //     ...prev,
            //     currentDate: data.date,
            //     currentTime: data.time,
            //     // Potentially pre-fill newDate/newTime if there's a suggested reschedule
            //   }));
            // } catch (err) {
            //   setError('Erro ao carregar detalhes da vistoria: ' + err.message);
            // } finally {
            //   setLoading(false);
            // }

            // --- Mock Data for demonstration ---
            setTimeout(() => {
                if (vistoriaId) {
                    setSurveyDetails(prev => ({
                        ...prev,
                        currentDate: '2025-07-10', // Example current date
                        currentTime: '14:30',     // Example current time
                    }));
                } else {
                    setError('ID da vistoria não fornecido na URL.');
                }
                setLoading(false);
            }, 1000);
            // --- End Mock Data ---
        };

        fetchSurveyDetails();
    }, [vistoriaId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSurveyDetails(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        // Basic validation
        if (!surveyDetails.newDate || !surveyDetails.newTime || !surveyDetails.reason) {
            setError('Por favor, preencha a nova data, hora e o motivo do reagendamento.');
            return;
        }

        setLoading(true);
        // Simulate API call for rescheduling
        // In a real application:
        // try {
        //   const response = await fetch(`/api/vistorias/${vistoriaId}/reagendar`, {
        //     method: 'POST',
        //     headers: {
        //       'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify(surveyDetails),
        //   });
        //   if (!response.ok) throw new Error('Failed to reschedule survey');
        //   setSuccessMessage('Vistoria reagendada com sucesso!');
        //   // Optionally navigate away after success
        //   // setTimeout(() => navigate('/vistorias-agendadas'), 2000);
        // } catch (err) {
        //   setError('Erro ao reagendar vistoria: ' + err.message);
        // } finally {
        //   setLoading(false);
        // }

        // --- Mock API Call ---
        console.log("Attempting to reschedule survey:", surveyDetails);
        setTimeout(() => {
            setLoading(false);
            setSuccessMessage('Vistoria reagendada com sucesso para ' + surveyDetails.newDate + ' às ' + surveyDetails.newTime + '.');
           
        }, 1500);
        // --- End Mock API Call ---
    };

    if (loading && !surveyDetails.currentDate) { // Only show full loading if initial data isn't there
        return <div className="loading-container">Carregando detalhes da vistoria...</div>;
    }

    return (
        <div className="reschedule-page-container">
            <header className="navbar"> 
                <div className="logo">CIVIS</div>
                <nav className="nav-links">
                    <a href="#" onClick={() => navigate("/home")}>Home</a>
                    <a href="#" onClick={() => navigate("/vistoriador/realizar-vistoria")}>Realizar Vistoria</a>
                </nav>
                <button className="logout-button" onClick={onLogout}>
                    Sair
                </button>
            </header>

            <main className="reschedule-main-content">
                <div className="reschedule-form-card">
                    <h1>Reagendamento de Vistoria {vistoriaId ? `(ID: ${vistoriaId})` : ''}</h1>
                    <p className="current-details">
                        Data e Hora Atuais: **{surveyDetails.currentDate || 'N/A'}** às **{surveyDetails.currentTime || 'N/A'}**
                    </p>

                    {error && <p className="error-message">{error}</p>}
                    {successMessage && <p className="success-message">{successMessage}</p>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="newDate">Nova Data:</label>
                            <input
                                type="date"
                                id="newDate"
                                name="newDate"
                                value={surveyDetails.newDate}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="newTime">Nova Hora:</label>
                            <input
                                type="time"
                                id="newTime"
                                name="newTime"
                                value={surveyDetails.newTime}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="reason">Motivo do Reagendamento:</label>
                            <select
                                id="reason"
                                name="reason"
                                value={surveyDetails.reason}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Selecione um motivo</option>
                                <option value="Indisponibilidade do vistoriador">Indisponibilidade do vistoriador</option>
                                <option value="Indisponibilidade do cliente">Indisponibilidade do cliente</option>
                                <option value="Problemas climáticos">Problemas climáticos</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="comments">Comentários Adicionais (Opcional):</label>
                            <textarea
                                id="comments"
                                name="comments"
                                value={surveyDetails.comments}
                                onChange={handleChange}
                                rows="4"
                            ></textarea>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="submit-button" disabled={loading}>
                                {loading ? 'Reagendando...' : 'Reagendar Vistoria'}
                            </button>
                            <button type="button" className="cancel-button" onClick={() => navigate(-1)}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default ReagendamentoVistoria;