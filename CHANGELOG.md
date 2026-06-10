# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

## [0.1.1] - 2026-06-09

### Fixed

- Logout e redirect de sessão expirada passam a respeitar o base path `/painel`.
- Modais de formulário com scroll em monitores de altura reduzida (conteúdo não fica mais cortado).

## [0.1.0] - 2026-06-08

### Added

- Versionamento centralizado via arquivo `VERSION` na raiz do repositório.
- Exibição da versão no painel (menu lateral e login).
- Endpoint público `GET /api/health` com versão da API.
