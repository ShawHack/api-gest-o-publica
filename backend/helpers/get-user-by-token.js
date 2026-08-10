const jwt = require('jsonwebtoken')
const User = require("../models/User")

const getUserByToken = async (token) => {
  if (!token) {
    return null;
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET não definido no ambiente');
    }
    const decoded = jwt.verify(token, JWT_SECRET);

    const userId = decoded.id;

    if (!userId) {
      return null;
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return null;
    }

    return user;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[getUserByToken]', err.name || err.message);
    }
    return null;
  }
}

module.exports = getUserByToken;