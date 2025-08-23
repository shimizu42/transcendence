import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const SALT_ROUNDS = 10

// In-memory storage
export const users = new Map<string, User>()
const usersByUsername = new Map<string, string>() // username -> userId
const friendships = new Map<string, Set<string>>() // userId -> Set of friend userIds
const matchHistory = new Map<string, Match[]>() // userId -> Match[]

interface User {
  id: string
  username: string
  displayName: string
  password: string
  avatar?: string
  isOnline: boolean
  lastSeen: Date
  wins: number
  losses: number
  totalGames: number
  friends: string[]
  createdAt: Date
}

interface Match {
  id: string
  player1Id: string
  player2Id: string
  winnerId?: string
  score: { player1: number, player2: number }
  playedAt: Date
  duration?: number // in seconds
}

// Default avatars
const DEFAULT_AVATARS = [
  '/avatars/default1.svg',
  '/avatars/default2.svg', 
  '/avatars/default3.svg',
  '/avatars/default4.svg',
  '/avatars/default5.svg'
]

export interface AuthUser {
  id: string
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
  username: string
  displayName: string
  password: string
  avatar?: string
}): Promise<AuthUser> {
  // Check if username already exists
  if (usersByUsername.has(data.username)) {
    throw new Error('Username already taken')
  }
  
  // Check if display name is unique
  const displayNameExists = Array.from(users.values()).some(user => user.displayName === data.displayName)
  if (displayNameExists) {
    throw new Error('Display name already taken')
  }
  
  const hashedPassword = await hashPassword(data.password)
  const userId = uuidv4()
  
  const user: User = {
    id: userId,
    username: data.username,
    displayName: data.displayName,
    password: hashedPassword,
    avatar: data.avatar || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
    isOnline: true,
    lastSeen: new Date(),
    wins: 0,
    losses: 0,
    totalGames: 0,
    friends: [],
    createdAt: new Date()
  }
  
  users.set(userId, user)
  usersByUsername.set(data.username, userId)
  friendships.set(userId, new Set())
  matchHistory.set(userId, [])
  
  return {
    id: user.id,
        username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
    wins: user.wins,
    losses: user.losses,
    totalGames: user.totalGames
  }
}

export async function authenticateUser(username: string, password: string): Promise<AuthUser | null> {
  const userId = usersByUsername.get(username)
  if (!userId) {
    return null
  }
  
  const user = users.get(userId)
  if (!user || !await verifyPassword(password, user.password)) {
    return null
  }
  
  // Update last seen and online status
  user.lastSeen = new Date()
  user.isOnline = true
  
  return {
    id: user.id,
        username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
    wins: user.wins,
    losses: user.losses,
    totalGames: user.totalGames
  }
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const user = users.get(userId)
  if (!user) return null
  
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
    wins: user.wins,
    losses: user.losses,
    totalGames: user.totalGames
  }
}

export async function updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
  const user = users.get(userId)
  if (user) {
    user.isOnline = isOnline
    user.lastSeen = new Date()
  }
}

export async function updateUserProfile(userId: string, data: {
  displayName?: string
  avatar?: string
}): Promise<AuthUser> {
  const user = users.get(userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  // Check if display name is unique (if changing)
  if (data.displayName && data.displayName !== user.displayName) {
    const displayNameExists = Array.from(users.values()).some(u => u.id !== userId && u.displayName === data.displayName)
    if (displayNameExists) {
      throw new Error('Display name already taken')
    }
    user.displayName = data.displayName
  }
  
  if (data.avatar !== undefined) {
    user.avatar = data.avatar
  }
  
  return {
    id: user.id,
        username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
    wins: user.wins,
    losses: user.losses,
    totalGames: user.totalGames
  }
}

// Friend system functions
export async function addFriend(userId: string, friendId: string): Promise<void> {
  console.log(`Adding friend: userId=${userId}, friendId=${friendId}`)
  
  const user = users.get(userId)
  const friend = users.get(friendId)
  
  console.log(`User exists: ${!!user}, Friend exists: ${!!friend}`)
  console.log(`All users: ${Array.from(users.keys()).join(', ')}`)
  
  if (!user || !friend) {
    throw new Error('User not found')
  }
  
  if (userId === friendId) {
    throw new Error('Cannot add yourself as friend')
  }
  
  const userFriends = friendships.get(userId) || new Set()
  const friendFriends = friendships.get(friendId) || new Set()
  
  userFriends.add(friendId)
  friendFriends.add(userId)
  
  friendships.set(userId, userFriends)
  friendships.set(friendId, friendFriends)
  
  // Update user objects
  user.friends = Array.from(userFriends)
  friend.friends = Array.from(friendFriends)
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  const user = users.get(userId)
  const friend = users.get(friendId)
  
  if (!user || !friend) {
    throw new Error('User not found')
  }
  
  const userFriends = friendships.get(userId) || new Set()
  const friendFriends = friendships.get(friendId) || new Set()
  
  userFriends.delete(friendId)
  friendFriends.delete(userId)
  
  friendships.set(userId, userFriends)
  friendships.set(friendId, friendFriends)
  
  // Update user objects
  user.friends = Array.from(userFriends)
  friend.friends = Array.from(friendFriends)
}

export async function getFriends(userId: string): Promise<AuthUser[]> {
  const userFriends = friendships.get(userId) || new Set()
  const friends: AuthUser[] = []
  
  for (const friendId of userFriends) {
    const friend = await getUserById(friendId)
    if (friend) {
      friends.push(friend)
    }
  }
  
  return friends
}

export async function searchUsers(query: string): Promise<AuthUser[]> {
  const results: AuthUser[] = []
  const lowerQuery = query.toLowerCase()
  
  for (const user of users.values()) {
    if (user.username.toLowerCase().includes(lowerQuery) || 
        user.displayName.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: user.id,
                username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        wins: user.wins,
        losses: user.losses,
        totalGames: user.totalGames
      })
    }
  }
  
  return results
}

// Match history functions
export async function addMatchToHistory(match: Omit<Match, 'id'>): Promise<void> {
  const matchWithId: Match = {
    id: uuidv4(),
    ...match
  }
  
  // Add to both players' history
  const player1History = matchHistory.get(match.player1Id) || []
  const player2History = matchHistory.get(match.player2Id) || []
  
  player1History.push(matchWithId)
  player2History.push(matchWithId)
  
  matchHistory.set(match.player1Id, player1History)
  matchHistory.set(match.player2Id, player2History)
  
  // Update user stats
  const player1 = users.get(match.player1Id)
  const player2 = users.get(match.player2Id)
  
  if (player1 && player2) {
    player1.totalGames++
    player2.totalGames++
    
    if (match.winnerId === match.player1Id) {
      player1.wins++
      player2.losses++
    } else if (match.winnerId === match.player2Id) {
      player2.wins++
      player1.losses++
    }
  }
}

export async function getMatchHistory(userId: string): Promise<Match[]> {
  return matchHistory.get(userId) || []
}

export async function getUserStats(userId: string): Promise<{
  wins: number
  losses: number
  totalGames: number
  winRate: number
}> {
  const user = users.get(userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  const winRate = user.totalGames > 0 ? (user.wins / user.totalGames) * 100 : 0
  
  return {
    wins: user.wins,
    losses: user.losses,
    totalGames: user.totalGames,
    winRate: Math.round(winRate * 100) / 100 // Round to 2 decimal places
  }
}

export function getDefaultAvatars(): string[] {
  return [...DEFAULT_AVATARS]
}