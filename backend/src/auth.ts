import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const SALT_ROUNDS = 10

export interface AuthUser {
  id: string
  email: string
  username: string
  displayName: string
  avatar?: string
  isOnline: boolean
  lastSeen: Date
  wins: number
  losses: number
  totalGames: number
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' })
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return decoded.userId
  } catch (error) {
    return null
  }
}

export async function createUser(data: {
  email: string
  username: string
  displayName: string
  password: string
  avatar?: string
}): Promise<AuthUser> {
  const hashedPassword = await hashPassword(data.password)
  
  const user = await prisma.user.create({
    data: {
      email: data.email,
      username: data.username,
      displayName: data.displayName,
      password: hashedPassword,
      avatar: data.avatar || null
    }
  })
  
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar || undefined,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
    wins: user.wins,
    losses: user.losses,
    totalGames: user.totalGames
  }
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { email }
  })
  
  if (!user || !await verifyPassword(password, user.password)) {
    return null
  }
  
  // Update last seen and online status
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      lastSeen: new Date(),
      isOnline: true
    }
  })
  
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar || undefined,
    isOnline: true,
    lastSeen: new Date(),
    wins: user.wins,
    losses: user.losses,
    totalGames: user.totalGames
  }
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  
  if (!user) return null
  
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar || undefined,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
    wins: user.wins,
    losses: user.losses,
    totalGames: user.totalGames
  }
}

export async function updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { 
      isOnline,
      lastSeen: new Date()
    }
  })
}

export async function updateUserProfile(userId: string, data: {
  displayName?: string
  avatar?: string
}): Promise<AuthUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      displayName: data.displayName,
      avatar: data.avatar
    }
  })
  
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar || undefined,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
    wins: user.wins,
    losses: user.losses,
    totalGames: user.totalGames
  }
}

export { prisma }