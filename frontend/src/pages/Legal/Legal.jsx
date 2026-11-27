import { Link, useNavigate } from "react-router-dom";
import { ROTAS } from "../../rotas";
import { TERMOS_VERSAO } from "../../utils/lgpd";
import "./Legal.css";

// S11: termos de uso e política de privacidade (páginas públicas, linkadas no cadastro e no perfil).
// MODELO: os trechos entre [colchetes] precisam ser preenchidos e o texto revisado pelo jurídico
// antes do lançamento. Ao mudar o conteúdo, atualize TERMOS_VERSAO (utils/lgpd.js e backend/domain/lgpd.ts).

const EMPRESA = "[Razão social da empresa], CNPJ [00.000.000/0000-00]";
const CONTATO = "[privacidade@empresa.com.br]";

function Termos() {
  return (
    <>
      <h1>Termos de uso</h1>
      <p>
        O CIVIS é um sistema de agendamento e registro de vistorias de imóveis, operado por {EMPRESA}. Ao criar uma
        conta, você concorda com estes termos e com a <Link to={ROTAS.privacidade}>política de privacidade</Link>.
      </p>
      <h2>1. Conta</h2>
      <p>
        Você é responsável pelas informações que cadastra e por manter sua senha em sigilo. Contas criadas com dados
        de terceiros ou falsos podem ser desativadas.
      </p>
      <h2>2. Uso do sistema</h2>
      <p>
        O CIVIS serve para acompanhar as vistorias dos imóveis vinculados a você: agendar, acompanhar, consultar e
        validar os relatórios. Não é permitido tentar acessar dados de outros usuários nem interferir no
        funcionamento do sistema.
      </p>
      <h2>3. Relatórios</h2>
      <p>
        Os relatórios são elaborados pelo vistoriador a partir do que foi observado no imóvel. Parte do texto pode ser
        redigida com apoio de inteligência artificial, sempre a partir dos dados registrados pelo vistoriador. Os
        relatórios refletem o estado do imóvel na data da vistoria.
      </p>
      <h2>4. Encerramento</h2>
      <p>
        Você pode excluir sua conta a qualquer momento pela página do seu perfil. As vistorias já realizadas continuam
        com a construtora, sem os seus dados pessoais.
      </p>
      <h2>5. Contato</h2>
      <p>Dúvidas sobre estes termos: {CONTATO}.</p>
    </>
  );
}

function Privacidade() {
  return (
    <>
      <h1>Política de privacidade</h1>
      <p>
        Esta política explica como {EMPRESA} trata os dados pessoais no CIVIS, de acordo com a Lei Geral de Proteção
        de Dados (Lei nº 13.709/2018).
      </p>
      <h2>1. Dados que coletamos</h2>
      <ul>
        <li>Cadastro: nome, CPF, e-mail, telefone (opcional) e foto de perfil (opcional).</li>
        <li>Imóveis e vistorias: unidade, empreendimento, datas, situação e relatórios.</li>
        <li>Acesso: data do último login e, por sessão, navegador e endereço IP (segurança da conta).</li>
      </ul>
      <h2>2. Para que usamos</h2>
      <ul>
        <li>Identificar você e vincular os seus imóveis (execução do contrato com a construtora).</li>
        <li>Agendar e realizar as vistorias e enviar os avisos relacionados.</li>
        <li>Proteger a conta contra acessos indevidos (legítimo interesse).</li>
      </ul>
      <h2>3. Compartilhamento</h2>
      <p>
        Os dados são acessados apenas pela construtora e pelos vistoriadores responsáveis pelas suas vistorias. Para
        redigir o texto dos relatórios usamos um serviço de inteligência artificial (Google Gemini), que recebe somente
        a avaliação técnica dos cômodos — nunca o seu nome, CPF ou contato. Arquivos ficam em provedor de
        armazenamento contratado.
      </p>
      <h2>4. Por quanto tempo guardamos</h2>
      <p>
        Enquanto a sua conta estiver ativa. As vistorias e relatórios podem ser mantidos pela construtora após o
        encerramento da conta pelo prazo exigido em lei ou contrato ([prazo]), sem os seus dados pessoais.
      </p>
      <h2>5. Seus direitos</h2>
      <p>
        Na página do seu perfil você pode baixar uma cópia dos seus dados e excluir a sua conta. Para corrigir dados,
        use a edição de perfil. Para outros pedidos (informações sobre compartilhamento, revisão de decisões, dúvidas),
        fale com o encarregado de dados: {CONTATO}.
      </p>
      <h2>6. Alterações</h2>
      <p>Quando esta política mudar, avisaremos e pediremos um novo aceite se for necessário.</p>
    </>
  );
}

export default function Legal({ tipo }) {
  const navigate = useNavigate();
  const voltar = () => (window.history.length > 1 ? navigate(-1) : navigate(ROTAS.inicial));

  return (
    <div className="legal-page">
      <main className="legal-conteudo">
        <button type="button" className="legal-voltar" onClick={voltar}>
          ← Voltar
        </button>
        {tipo === "privacidade" ? <Privacidade /> : <Termos />}
        <p className="legal-versao">Versão {TERMOS_VERSAO}</p>
      </main>
    </div>
  );
}
