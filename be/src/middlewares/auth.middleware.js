import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../modules/users/user.model.js';

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing Bearer token' });
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).select('-password');
    if (!user || user.status !== 'ACTIVE') return res.status(401).json({ message: 'Unauthorized' });
    req.user = user;
    next();
  } catch (error) { return res.status(401).json({ message: 'Invalid or expired token' }); }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
