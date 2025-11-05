import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ROLES } from '../utils/roles.js';

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid' });
  }
};

export const authorize = (...allowed) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (allowed.includes(req.user.role)) return next();
  return res.status(403).json({ message: 'Forbidden' });
};

export const isOwnerOrAdmin = (ownerId) => {
  if (!ownerId || !ownerId.equals) return false;
  return req => (req.user.role === ROLES.ADMIN) || ownerId.equals(req.user._id);
};
