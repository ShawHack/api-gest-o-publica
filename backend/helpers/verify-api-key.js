/**
 * Verifica a API Key no header X-API-Key.
 * Chaves válidas em API_KEYS (env, separadas por vírgula).
 * Opcionalmente, API_KEY_USER_ID vincula a chave a um usuário (para operações que precisam de userId).
 */
const User = require('../models/User');

const getValidKeys = () => {
  const raw = process.env.API_KEYS || '';
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
};

const getApiKeyUserId = () => process.env.API_KEY_USER_ID || null;

/**
 * Verifica se o header X-API-Key contém uma chave válida.
 * Retorna o user object se válido, null caso contrário.
 */
const verifyApiKey = async (req) => {
  try {
    const key = (req.headers['x-api-key'] || req.headers['X-API-Key'] || '').trim();
    if (!key) return null;

    const validKeys = getValidKeys();
    if (validKeys.length === 0) return null;

    if (!validKeys.includes(key)) return null;

    const userId = getApiKeyUserId();
    let userDoc = null;
    if (userId) {
      userDoc = await User.findById(userId).select('_id name role').lean();
    }

    return {
      _id: userDoc?._id?.toString() || 'apikey',
      id: userDoc?._id?.toString() || 'apikey',
      name: userDoc?.name || 'API Key',
      role: (userDoc?.role || 'apikey').toString(),
      authType: 'api_key',
    };
  } catch {
    return null;
  }
};

module.exports = { verifyApiKey, getValidKeys };
