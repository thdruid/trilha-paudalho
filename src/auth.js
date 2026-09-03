const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'troque-esta-chave-em-producao';

function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, papel: usuario.papel, nome: usuario.nome },
    SECRET,
    { expiresIn: '8h' }
  );
}

// Middleware: exige um token válido. Aceita opcionalmente uma lista de papéis
// permitidos (ex: exigirAuth(['professor'])). Sem lista, qualquer papel passa.
function exigirAuth(papeisPermitidos = null) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ erro: 'Token não informado.' });
    }
    try {
      const payload = jwt.verify(token, SECRET);
      if (papeisPermitidos && !papeisPermitidos.includes(payload.papel)) {
        return res.status(403).json({ erro: 'Sem permissão para este recurso.' });
      }
      req.usuario = payload;
      next();
    } catch (e) {
      return res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
  };
}

module.exports = { gerarToken, exigirAuth };
