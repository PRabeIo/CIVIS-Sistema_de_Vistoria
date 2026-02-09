-- Active: 1749991457200@@127.0.0.1@5432@Construtora
-- Criar o banco de dados (caso ainda não exista)
CREATE DATABASE construtora;
-- Tabela Funcionario
CREATE TABLE Funcionario (
    id SERIAL PRIMARY KEY,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    senha VARCHAR(100) NOT NULL,
    telefone VARCHAR(20)
);

-- Tabela Administrador
CREATE TABLE Administrador (
    idAdministrador INT PRIMARY KEY,
    FOREIGN KEY (idAdministrador) REFERENCES Funcionario(id)
);

-- Tabela Vistoriador
CREATE TABLE Vistoriador (
    idVistoriador INT PRIMARY KEY,
    idVistoria INT,
    FOREIGN KEY (idVistoriador) REFERENCES Funcionario(id)
);

-- Tabela Cliente
CREATE TABLE Cliente (
    idCliente SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    email VARCHAR(100)
);

-- Tabela Endereco
CREATE TABLE Endereco (
    idEndereco SERIAL PRIMARY KEY,
    condominio VARCHAR(100),
    bloco VARCHAR(50),
    numero VARCHAR(20)
);

-- Tabela Empreendimento
CREATE TABLE Empreendimento (
    idEmpreendimento SERIAL PRIMARY KEY,
    idEndereco INT,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    construtora VARCHAR(100),
    dataEntrega DATE,
    observacoes TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    rua VARCHAR(100),
    FOREIGN KEY (idEndereco) REFERENCES Endereco(idEndereco)
);

-- Tabela Imovel
CREATE TABLE Imovel (
    idImovel SERIAL PRIMARY KEY,
    descricao TEXT,
    status VARCHAR(20),
    vistoriasRealizadas INT,
    observacao TEXT,
    numeroUnidade VARCHAR(20),
    idEmpreendimento INT,
    FOREIGN KEY (idEmpreendimento) REFERENCES Empreendimento(idEmpreendimento)
);

-- Tabela Vistoria
CREATE TABLE Vistoria (
    idVistoria SERIAL PRIMARY KEY,
    idCliente INT NOT NULL,
    idImovel INT NOT NULL,
    idRelatorio INT,
    idVistoriador INT NOT NULL,
    dataInicio DATE,
    dataFim DATE,
    status VARCHAR(20),
    FOREIGN KEY (idCliente) REFERENCES Cliente(idCliente),
    FOREIGN KEY (idImovel) REFERENCES Imovel(idImovel),
    FOREIGN KEY (idVistoriador) REFERENCES Vistoriador(idVistoriador)
);

-- Tabela RelatorioTecnico
CREATE TABLE RelatorioTecnico (
    idVistoria INT PRIMARY KEY,
    estadoConservacaoEstrutura VARCHAR(30),
    estadoConservacaoPintura VARCHAR(30),
    estadoInstalacaoEletrica VARCHAR(30),
    estadoInstalacaoHidraulica VARCHAR(30),
    estadoTelhado VARCHAR(30),
    estadoPiso VARCHAR(30),
    segurancaPortasJanelas BOOLEAN,
    funcionamentoSistemaAlarme BOOLEAN,
    presencaPragas BOOLEAN,
    presencaInfiltracoes BOOLEAN,
    anexos TEXT,
    FOREIGN KEY (idVistoria) REFERENCES Vistoria(idVistoria)
);
