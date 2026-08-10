const getToken = (req) => {
  const authHeader = req.headers.authorization;
  
  // ✅ Validação robusta do cabeçalho Authorization
  if (!authHeader) {
    return null;
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return null;
  }
  
  return token;
};

module.exports = getToken;