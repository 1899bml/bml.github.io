# Sistema de Gestão de Sócios

Este projeto é um painel web simples e dinâmico para gerir os sócios de uma associação, com integração direta com Google Sheets.

## 📦 Funcionalidades

- ➕ Adicionar sócios através de formulário dinâmico
- ⚙️ Gerir campos personalizados (tipo, obrigatoriedade, visibilidade)
- 📋 Visualizar lista de sócios com filtros por categoria
- 🔄 Sincronização com Google Sheets via Web App
- 💾 Configuração guardada localmente (localStorage)

## 🗂️ Estrutura do projeto

├── index.html # Painel principal 
├── adicionar.html # Formulário de registo de sócios 
├── configurar.html # Painel para gerir campos do formulário 
├── socios.html # Lista de sócios com filtros


## 🚀 Como usar

1. Clona ou faz fork deste repositório
2. Publica os ficheiros com GitHub Pages ou Netlify
3. Configura o Web App no Google Apps Script para guardar os dados
4. Abre `configurar.html` para definir os campos do formulário
5. Usa `adicionar.html` para registar sócios
6. Consulta `socios.html` para ver os registos

## 🔗 Integração com Google Sheets

- A folha deve conter uma aba chamada `Folha1`
- O Web App deve estar publicado com acesso público
- Os dados são guardados linha a linha com base nos campos definidos

## 🛠️ Tecnologias usadas

- HTML + CSS + JavaScript
- Google Apps Script
- Google Sheets API
- GitHub Pages / Netlify

## 📄 Licença

Este projeto é livre para uso e adaptação. Se usares ou melhorares, dá crédito ao autor original.

---

Feito com ❤️ por Paulo
