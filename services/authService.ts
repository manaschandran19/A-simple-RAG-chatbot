import { db } from './db';
import { User } from '../types';

export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const registerUser = async (username: string, password: string): Promise<boolean> => {
  const existing = await db.getUser(username);
  if (existing) {
    throw new Error('Username already exists');
  }

  const passwordHash = await hashPassword(password);
  const newUser: User = {
    username,
    passwordHash,
    createdAt: Date.now()
  };

  await db.createUser(newUser);
  return true;
};

export const loginUser = async (username: string, password: string): Promise<User> => {
  const user = await db.getUser(username);
  if (!user) {
    throw new Error('User not found');
  }

  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) {
    throw new Error('Invalid password');
  }

  return user;
};
