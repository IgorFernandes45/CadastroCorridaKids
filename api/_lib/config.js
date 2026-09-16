// Regras do evento usadas pelo servidor
const senha = process.env.ADMIN_SENHA || 'nonatao123';

module.exports = {
  dataCorrida: '2026-10-10',
  valor: 15,
  categorias: [
    { id: 'A', nome: '3 a 5 anos', min: 3, max: 5, vagas: 50 },
    { id: 'B', nome: '6 a 13 anos', min: 6, max: 13, vagas: 100 },
  ],
  admin: {
    usuario: process.env.ADMIN_USUARIO || 'admin',
    senha,
  },
  // Assina o token do painel admin. Defina ADMIN_SEGREDO na Vercel para um valor próprio.
  segredo: process.env.ADMIN_SEGREDO || `corrida-kids::${senha}`,
};
