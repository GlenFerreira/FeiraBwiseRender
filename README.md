# FeiraBwise - Tech Maturity Assessment (Matrix Edition)

Este é um projeto interativo de avaliação de maturidade tecnológica com um tema inspirado no filme "Matrix". O objetivo é ajudar empresas e líderes a entenderem em que nível de evolução digital se encontram através de um questionário dinâmico.

## 🚀 Como Rodar o Projeto

Siga os passos abaixo para preparar o ambiente e rodar o projeto localmente.

### Pré-requisitos

Certifique-se de ter o [Node.js](https://nodejs.org/) instalado em sua máquina (recomenda-se a versão LTS).

### 1. Clonar ou Baixar o Projeto
Se você estiver com os arquivos em uma pasta, abra o terminal/PowerShell dentro dessa pasta.

### 2. Instalar as Dependências
No terminal, execute o seguinte comando para instalar todas as bibliotecas necessárias (Vite, TypeScript, etc.):

```bash
npm install
```

### 3. Rodar em Modo de Desenvolvimento
Para iniciar o servidor local e ver o projeto funcionando em tempo real, use:

```bash
npm run dev
```

Após executar, o terminal exibirá um link (geralmente `http://localhost:5173`). Abra este link no seu navegador.

---

## 🛠️ Outros Comandos Úteis

### Gerar Build para Produção
Se desejar gerar os arquivos finais otimizados para hospedar em um servidor:

```bash
npm run build
```
Os arquivos serão gerados na pasta `/dist`.

### Visualizar o Build Localmente
Para testar a versão de produção localmente após o build:

```bash
npm run preview
```

---

## 📂 Estrutura do Projeto

- `index.html`: Estrutura principal da página.
- `src/main.ts`: Lógica do quiz, efeito Matrix Rain e manipulação do DOM.
- `src/style.css`: Estilização visual (efeitos de vidro, neon e animações).
- `public/`: Arquivos estáticos (ícones, imagens).

## 💻 Tecnologias Utilizadas

- [Vite](https://vitejs.dev/) - Ferramenta de build rápida para web.
- [TypeScript](https://www.typescriptlang.org/) - Superset de JavaScript com tipagem estática.
- [CSS3](https://developer.mozilla.org/en-US/docs/Web/CSS) - Estilização moderna com animações e efeitos avançados.
