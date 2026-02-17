import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Inicial.css";
import QuemSomosIcon from '/assets/imagenstelainicial/2.png';
import VistoriasImobiliarias from '/assets/imagenstelainicial/3.png';
import LocalizacaoIcon from '/assets/imagenstelainicial/4.png';
import ContatosIcon from '/assets/imagenstelainicial/5.png';

function Inicial() {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false); 
  

    useEffect(() => {
        document.body.classList.add("inicial-body");
            return () => {
            document.body.classList.remove("inicial-body");
    };
    }, []);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleMenuItemClick = (path) => {
        setIsMenuOpen(false); 

    if (path === "/login") {
        navigate(path); // Navega para a página de login
    } else {
        // Mapeia os caminhos para os IDs das seções no HTML para rolagem
        const sectionIdMap = {
            "/quem-somos": "quem-somos-section",
            "/servicos": "servicos-section",
            "/localizacao": "localizacao-section",
            "/contatos": "contatos-section",
        };
        const targetId = sectionIdMap[path];
        
        if (targetId) {
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                // Rola suavemente para a seção correspondente
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }
    };

    return (
        <div className="inicial-page-container">
            <header className="inicial-header">
                <div className="logo-section">
                    <img src="/src\pages\Inicial\logo.png" alt="CIVIS Logo" className="header-logo" />
                </div>

                <button className="hamburger-menu" onClick={toggleMenu} aria-label="Abrir Menu">
                    &#9776;
                </button>
            </header>

            {isMenuOpen && (
                <div className="mobile-menu-overlay">
                    <button className="close-menu" onClick={toggleMenu} aria-label="Fechar Menu">
                        &times;
                    </button>
                <nav className="mobile-nav-links">
                    <a onClick={() => handleMenuItemClick("/login")}>Login</a>
                    <a onClick={() => handleMenuItemClick("/quem-somos")}>Quem somos</a>
                    <a onClick={() => handleMenuItemClick("/servicos")}>Serviços</a>
                    <a onClick={() => handleMenuItemClick("/localizacao")}>Localização</a>
                    <a onClick={() => handleMenuItemClick("/contatos")}>Contatos</a>
                </nav>
                </div>
          )}

            <main className="hero-section">
                <h1 className="hero-title">
                    CIVIS <br /> <span>VISTORIAS</span>
                </h1>
                <p className="hero-subtitle">
            Garanta a segurança e o valor do seu imóvel com vistorias precisas e confiáveis.
        </p>
                <p className="hero-description">
                    Somos uma empresa especializada em vistorias de imóveis, credenciada e com uma
                    equipe capacitada com mais de 20 anos de experiência.
                </p>
                <button
                    className="agendar-button"
                    onClick={() => navigate("/login")}
                >
                    REALIZAR LOGIN
                </button>
            </main>

            <section className="bottom-info-section">
                <h2 className="bottom-info-title">O que você encontra <br /> na Civis Vistorias</h2>
        <div className="info-cards-container">
            <div id="quem-somos-section" className="info-card">
                <img src={QuemSomosIcon} alt="Ícone Quem Somos" className="card-icon" />
                <h3>Quem Somos</h3>
                <h4>Excelência e Credibilidade</h4>
                <p>Com mais de 20 anos de atuação, a Civis Vistorias é líder no mercado, oferecendo confiança, profissionalismo e os mais altos padrões de qualidade em cada serviço.</p>
            </div>
            <div id="servicos-section" className="info-card">
                <img src={VistoriasImobiliarias} alt="Ícone de Serviços" className="card-icon" />
                <h3>Vistorias Imobiliárias</h3>
                <p>Realizamos relatório detalhados sobre  e regularização de imóveis residenciais. Sua segurança  é nossa prioridade.</p>
            </div>
            <div id="localizacao-section" className="info-card">
                <img src={LocalizacaoIcon} alt="Ícone de Localização" className="card-icon" />
                <h3>Localização</h3>
                <p>Estamos convenientemente localizados na Rua das Flores, 123, Centro - São Luís/MA. Nosso horário de atendimento é de Segunda a Sexta, das 8h às 18h.</p>
            </div>
            <div id="contatos-section" className="info-card">
                <img src={ContatosIcon} alt="Ícone de Contato" className="card-icon" />
                <h3>Contatos</h3>
                <p>Telefone: (98) 4578-5647 <br/> Email: contato@civisvistorias.com.br <br/> Converse conosco pelo WhatsApp: (98) 9XXXX-XXXX.</p>
            </div>
        </div>
            </section>
        </div>
    );
}

export default Inicial;