# Corrida Kids do Nonatão — Inscrições

Site de inscrição da 2ª Corrida Kids do Nonatão (10/10/2026, 17h, Loja Nonatão 2 – Uiraúna-PB).

- Categorias: 3 a 5 anos (50 vagas) e 6 a 13 anos (100 vagas), pela idade no dia da corrida
- Pagamento Pix (R$ 15,00) com QR Code e Pix Copia e Cola
- A vaga é contada quando o responsável toca em **Enviar comprovante no WhatsApp**
- Painel do organizador em `/#/admin`

## Onde ficam as inscrições

| Ambiente | Banco |
|---|---|
| Computador (`npm start`) | `data/inscricoes.txt` — uma inscrição (JSON) por linha |
| Vercel | Upstash Redis (a Vercel não permite gravar arquivos) |

A contagem de vagas é feita no servidor, então vale para todos os aparelhos e não estoura
mesmo com várias pessoas confirmando ao mesmo tempo.

## Rodar no computador

```bash
npm start
```

Abra http://localhost:3000. As inscrições são gravadas em `data/inscricoes.txt` (fora do Git).

## Publicar na Vercel

1. No projeto da Vercel: **Storage → Create Database → Upstash (Redis) → Continue**, escolha o plano
   gratuito e conecte ao projeto. Isso cria as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
2. Em **Settings → Environment Variables**, recomenda-se definir:
   - `ADMIN_SENHA` — senha do painel (padrão: `nonatao123`)
   - `ADMIN_SEGREDO` — um texto aleatório longo, usado para assinar o login
3. Faça um novo deploy (as variáveis só valem para deploys novos).

Sem o Redis configurado, a API responde "Inscrições temporariamente indisponíveis".

## API

| Método | Caminho | Uso |
|---|---|---|
| GET | `/api/vagas` | vagas restantes |
| GET | `/api/inscricoes?id=` | dados de uma inscrição |
| POST | `/api/inscricoes` | nova inscrição (pendente) |
| POST | `/api/confirmar` | conta a vaga |
| POST | `/api/cancelar` | cancela inscrição pendente |
| POST | `/api/admin` | `login`, `listar`, `status`, `excluir` |
