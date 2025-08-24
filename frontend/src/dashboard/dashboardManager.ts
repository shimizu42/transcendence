export interface GameStatistics {
  wins: number
  losses: number
  totalGames: number
  winRate: number
  averageGameDuration?: number
  longestWinStreak?: number
  currentStreak?: number
  gamesPerDay?: { date: string; games: number }[]
  performanceOverTime?: { date: string; winRate: number }[]
  gameTypeStats?: { pong: GameTypeStats; tank: GameTypeStats }
}

export interface GameTypeStats {
  wins: number
  losses: number
  totalGames: number
  winRate: number
  averageScore?: number
  bestScore?: number
}

export interface Match {
  id: string
  player1Id: string
  player2Id: string
  winnerId?: string
  score: { player1: number; player2: number }
  playedAt: Date
  duration?: number
  gameType?: 'pong' | 'tank'
  tournamentId?: string
  tournamentName?: string
}

export interface DashboardData {
  user: any
  statistics: GameStatistics
  recentMatches: Match[]
  achievements?: Achievement[]
  insights?: Insight[]
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt?: Date
  progress: number
  maxProgress: number
}

export interface Insight {
  type: 'improvement' | 'achievement' | 'trend' | 'recommendation'
  title: string
  description: string
  value?: string
  trend?: 'up' | 'down' | 'stable'
}

export class DashboardManager {
  private authManager: any

  constructor(authManager: any) {
    this.authManager = authManager
  }

  public async getDashboardData(userId?: string): Promise<DashboardData> {
    try {
      const targetUserId = userId || this.authManager.getCurrentUser()?.id
      if (!targetUserId) {
        throw new Error('User not found')
      }

      const [user, statistics, matches] = await Promise.all([
        this.authManager.getUserById(targetUserId),
        this.getEnhancedStatistics(targetUserId),
        this.authManager.getMatchHistory(targetUserId)
      ])

      const achievements = this.generateAchievements(statistics, matches)
      const insights = this.generateInsights(statistics, matches)

      return {
        user,
        statistics,
        recentMatches: matches.slice(0, 10),
        achievements,
        insights
      }
    } catch (error) {
      console.error('Failed to get dashboard data:', error)
      throw error
    }
  }

  private async getEnhancedStatistics(userId: string): Promise<GameStatistics> {
    const basicStats = await this.authManager.getStats(userId)
    const matches = await this.authManager.getMatchHistory(userId)
    
    return this.calculateEnhancedStats(basicStats, matches)
  }

  private calculateEnhancedStats(basicStats: any, matches: Match[]): GameStatistics {
    const sortedMatches = matches.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
    
    // Calculate streaks
    let currentStreak = 0
    let longestWinStreak = 0
    let currentWinStreak = 0
    const userId = this.authManager.getCurrentUser()?.id

    for (const match of sortedMatches) {
      const isWin = match.winnerId === userId
      
      if (currentStreak === 0) {
        currentStreak = isWin ? 1 : -1
      } else if ((currentStreak > 0 && isWin) || (currentStreak < 0 && !isWin)) {
        currentStreak += isWin ? 1 : -1
      } else {
        currentStreak = isWin ? 1 : -1
      }

      if (isWin) {
        currentWinStreak++
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak)
      } else {
        currentWinStreak = 0
      }
    }

    // Games per day for last 30 days
    const gamesPerDay = this.calculateGamesPerDay(matches, 30)
    
    // Performance over time (last 10 games rolling average)
    const performanceOverTime = this.calculatePerformanceOverTime(matches)
    
    // Game type statistics
    const gameTypeStats = this.calculateGameTypeStats(matches, userId)

    // Average game duration
    const durations = matches.filter(m => m.duration).map(m => m.duration!)
    const averageGameDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : undefined

    return {
      ...basicStats,
      longestWinStreak,
      currentStreak: Math.abs(currentStreak),
      averageGameDuration,
      gamesPerDay,
      performanceOverTime,
      gameTypeStats
    }
  }

  private calculateGamesPerDay(matches: Match[], days: number): { date: string; games: number }[] {
    const now = new Date()
    const dayMap = new Map<string, number>()

    // Initialize last N days
    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dayMap.set(dateStr, 0)
    }

    // Count games per day
    matches.forEach(match => {
      const dateStr = new Date(match.playedAt).toISOString().split('T')[0]
      if (dayMap.has(dateStr)) {
        dayMap.set(dateStr, dayMap.get(dateStr)! + 1)
      }
    })

    return Array.from(dayMap.entries())
      .map(([date, games]) => ({ date, games }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  private calculatePerformanceOverTime(matches: Match[]): { date: string; winRate: number }[] {
    const userId = this.authManager.getCurrentUser()?.id
    const sortedMatches = matches.sort((a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime())
    const windowSize = 10
    const performance: { date: string; winRate: number }[] = []

    for (let i = windowSize - 1; i < sortedMatches.length; i++) {
      const window = sortedMatches.slice(i - windowSize + 1, i + 1)
      const wins = window.filter(m => m.winnerId === userId).length
      const winRate = (wins / windowSize) * 100
      
      performance.push({
        date: new Date(sortedMatches[i].playedAt).toISOString().split('T')[0],
        winRate: Math.round(winRate)
      })
    }

    return performance
  }

  private calculateGameTypeStats(matches: Match[], userId: string): { pong: GameTypeStats; tank: GameTypeStats } {
    const pongMatches = matches.filter(m => m.gameType === 'pong')
    const tankMatches = matches.filter(m => m.gameType === 'tank')

    const calculateTypeStats = (typeMatches: Match[]): GameTypeStats => {
      const wins = typeMatches.filter(m => m.winnerId === userId).length
      const totalGames = typeMatches.length
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0

      const userScores = typeMatches.map(m => {
        const isPlayer1 = m.player1Id === userId
        return isPlayer1 ? m.score.player1 : m.score.player2
      }).filter(score => score !== undefined)

      const averageScore = userScores.length > 0 
        ? userScores.reduce((sum, score) => sum + score, 0) / userScores.length 
        : 0
      const bestScore = userScores.length > 0 ? Math.max(...userScores) : 0

      return {
        wins,
        losses: totalGames - wins,
        totalGames,
        winRate: Math.round(winRate),
        averageScore: Math.round(averageScore * 10) / 10,
        bestScore
      }
    }

    return {
      pong: calculateTypeStats(pongMatches),
      tank: calculateTypeStats(tankMatches)
    }
  }

  private generateAchievements(statistics: GameStatistics, matches: Match[]): Achievement[] {
    const achievements: Achievement[] = []

    // First Win
    if (statistics.wins >= 1) {
      achievements.push({
        id: 'first_win',
        name: '初勝利',
        description: '初めての勝利を達成',
        icon: '🏆',
        unlockedAt: matches.find(m => m.winnerId === this.authManager.getCurrentUser()?.id)?.playedAt,
        progress: 1,
        maxProgress: 1
      })
    }

    // Win Streak Achievements
    if (statistics.longestWinStreak && statistics.longestWinStreak >= 3) {
      achievements.push({
        id: 'win_streak_3',
        name: '3連勝',
        description: '3連勝を達成',
        icon: '🔥',
        progress: Math.min(statistics.longestWinStreak, 3),
        maxProgress: 3
      })
    }

    if (statistics.longestWinStreak && statistics.longestWinStreak >= 5) {
      achievements.push({
        id: 'win_streak_5',
        name: '5連勝',
        description: '5連勝を達成',
        icon: '⚡',
        progress: Math.min(statistics.longestWinStreak, 5),
        maxProgress: 5
      })
    }

    // Game Count Achievements
    if (statistics.totalGames >= 10) {
      achievements.push({
        id: 'veteran',
        name: 'ベテラン',
        description: '10試合を完了',
        icon: '🎮',
        progress: Math.min(statistics.totalGames, 10),
        maxProgress: 10
      })
    }

    if (statistics.totalGames >= 50) {
      achievements.push({
        id: 'expert',
        name: 'エキスパート',
        description: '50試合を完了',
        icon: '⭐',
        progress: Math.min(statistics.totalGames, 50),
        maxProgress: 50
      })
    }

    // Win Rate Achievement
    if (statistics.totalGames >= 10 && statistics.winRate >= 70) {
      achievements.push({
        id: 'high_winrate',
        name: 'チャンピオン',
        description: '70%以上の勝率を維持',
        icon: '👑',
        progress: statistics.winRate,
        maxProgress: 70
      })
    }

    return achievements
  }

  private generateInsights(statistics: GameStatistics, matches: Match[]): Insight[] {
    const insights: Insight[] = []

    // Recent performance trend
    if (statistics.performanceOverTime && statistics.performanceOverTime.length >= 2) {
      const recent = statistics.performanceOverTime.slice(-2)
      const trend = recent[1].winRate - recent[0].winRate
      
      if (trend > 10) {
        insights.push({
          type: 'trend',
          title: 'パフォーマンス向上中',
          description: '最近の勝率が上昇しています',
          trend: 'up',
          value: `+${trend}%`
        })
      } else if (trend < -10) {
        insights.push({
          type: 'trend',
          title: 'パフォーマンス低下',
          description: '最近の勝率が下降しています',
          trend: 'down',
          value: `${trend}%`
        })
      }
    }

    // Game activity insight
    if (statistics.gamesPerDay) {
      const recentGames = statistics.gamesPerDay.slice(-7).reduce((sum, day) => sum + day.games, 0)
      if (recentGames >= 10) {
        insights.push({
          type: 'achievement',
          title: 'アクティブプレイヤー',
          description: '今週は非常にアクティブです',
          value: `${recentGames}試合`
        })
      }
    }

    // Win streak insight
    if (statistics.currentStreak && statistics.currentStreak >= 3) {
      insights.push({
        type: 'achievement',
        title: '連勝中！',
        description: '素晴らしい連勝記録です',
        value: `${statistics.currentStreak}連勝`,
        trend: 'up'
      })
    }

    // Improvement recommendation
    if (statistics.totalGames >= 5 && statistics.winRate < 50) {
      insights.push({
        type: 'recommendation',
        title: '練習のすすめ',
        description: '友達と練習試合をして技術を向上させましょう'
      })
    }

    // Game type preference
    if (statistics.gameTypeStats) {
      const { pong, tank } = statistics.gameTypeStats
      if (pong.totalGames > 0 && tank.totalGames > 0) {
        if (pong.winRate > tank.winRate + 20) {
          insights.push({
            type: 'trend',
            title: 'Pongが得意',
            description: 'Pongゲームでより良いパフォーマンスを発揮しています',
            value: `Pong: ${pong.winRate}% vs Tank: ${tank.winRate}%`
          })
        } else if (tank.winRate > pong.winRate + 20) {
          insights.push({
            type: 'trend',
            title: 'Tank Battleが得意',
            description: 'Tank Battleでより良いパフォーマンスを発揮しています',
            value: `Tank: ${tank.winRate}% vs Pong: ${pong.winRate}%`
          })
        }
      }
    }

    return insights
  }

  // Chart rendering methods using pure TypeScript and SVG
  public renderBarChart(data: { label: string; value: number }[], options: {
    width?: number
    height?: number
    title?: string
    color?: string
    maxValue?: number
  } = {}): string {
    const { width = 400, height = 200, title = '', color = '#10B981', maxValue } = options
    
    if (data.length === 0) return '<div class="text-gray-400 text-center p-4">データがありません</div>'

    const maxVal = maxValue || Math.max(...data.map(d => d.value))
    const barWidth = (width - 80) / data.length
    const chartHeight = height - 60

    const bars = data.map((item, index) => {
      const barHeight = (item.value / maxVal) * chartHeight
      const x = 40 + index * barWidth + barWidth * 0.1
      const y = height - 40 - barHeight

      return `
        <rect x="${x}" y="${y}" width="${barWidth * 0.8}" height="${barHeight}" 
              fill="${color}" rx="2" opacity="0.8">
        </rect>
        <text x="${x + barWidth * 0.4}" y="${height - 20}" 
              text-anchor="middle" fill="currentColor" font-size="10">
          ${item.label}
        </text>
        <text x="${x + barWidth * 0.4}" y="${y - 5}" 
              text-anchor="middle" fill="currentColor" font-size="10" font-weight="bold">
          ${item.value}
        </text>
      `
    }).join('')

    return `
      <div class="bg-game-text border border-neon-blue rounded-lg p-4">
        ${title ? `<h3 class="text-lg font-bold text-neon-cyan mb-4">${title}</h3>` : ''}
        <svg width="${width}" height="${height}" class="text-white">
          ${bars}
        </svg>
      </div>
    `
  }

  public renderLineChart(data: { x: string; y: number }[], options: {
    width?: number
    height?: number
    title?: string
    color?: string
    strokeWidth?: number
  } = {}): string {
    const { width = 400, height = 200, title = '', color = '#3B82F6', strokeWidth = 2 } = options
    
    if (data.length === 0) return '<div class="text-gray-400 text-center p-4">データがありません</div>'

    const maxY = Math.max(...data.map(d => d.y))
    const minY = Math.min(...data.map(d => d.y))
    const rangeY = maxY - minY || 1
    const chartWidth = width - 80
    const chartHeight = height - 60

    const points = data.map((item, index) => {
      const x = 40 + (index / (data.length - 1)) * chartWidth
      const y = height - 40 - ((item.y - minY) / rangeY) * chartHeight
      return `${x},${y}`
    }).join(' ')

    const gridLines = Array.from({ length: 5 }, (_, i) => {
      const y = 40 + (i / 4) * chartHeight
      return `<line x1="40" y1="${y}" x2="${width - 20}" y2="${y}" stroke="currentColor" opacity="0.1"/>`
    }).join('')

    return `
      <div class="bg-game-text border border-neon-blue rounded-lg p-4">
        ${title ? `<h3 class="text-lg font-bold text-neon-cyan mb-4">${title}</h3>` : ''}
        <svg width="${width}" height="${height}" class="text-white">
          ${gridLines}
          <polyline points="${points}" fill="none" stroke="${color}" 
                    stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
          ${data.map((item, index) => {
            const x = 40 + (index / (data.length - 1)) * chartWidth
            const y = height - 40 - ((item.y - minY) / rangeY) * chartHeight
            return `<circle cx="${x}" cy="${y}" r="3" fill="${color}"/>`
          }).join('')}
        </svg>
      </div>
    `
  }

  public renderPieChart(data: { label: string; value: number; color: string }[], options: {
    width?: number
    height?: number
    title?: string
  } = {}): string {
    const { width = 300, height = 300, title = '' } = options
    
    if (data.length === 0) return '<div class="text-gray-400 text-center p-4">データがありません</div>'

    const total = data.reduce((sum, item) => sum + item.value, 0)
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - 40

    let currentAngle = 0
    const slices = data.map(item => {
      const percentage = (item.value / total) * 100
      const sliceAngle = (item.value / total) * 360
      
      const startAngle = currentAngle
      const endAngle = currentAngle + sliceAngle
      
      const startX = centerX + radius * Math.cos(startAngle * Math.PI / 180)
      const startY = centerY + radius * Math.sin(startAngle * Math.PI / 180)
      const endX = centerX + radius * Math.cos(endAngle * Math.PI / 180)
      const endY = centerY + radius * Math.sin(endAngle * Math.PI / 180)
      
      const largeArc = sliceAngle > 180 ? 1 : 0
      
      const path = `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`
      
      currentAngle += sliceAngle
      
      return {
        path,
        color: item.color,
        label: item.label,
        percentage: Math.round(percentage)
      }
    })

    const legend = data.map((item, index) => `
      <div class="flex items-center space-x-2 mb-1">
        <div class="w-4 h-4 rounded" style="background-color: ${item.color}"></div>
        <span class="text-sm text-white">${item.label}: ${item.value} (${Math.round((item.value / total) * 100)}%)</span>
      </div>
    `).join('')

    return `
      <div class="bg-game-text border border-neon-blue rounded-lg p-4">
        ${title ? `<h3 class="text-lg font-bold text-neon-cyan mb-4">${title}</h3>` : ''}
        <div class="flex items-start space-x-4">
          <svg width="${width / 2}" height="${height / 2}">
            ${slices.map(slice => 
              `<path d="${slice.path}" fill="${slice.color}" opacity="0.8"/>`
            ).join('')}
          </svg>
          <div class="flex-1">
            ${legend}
          </div>
        </div>
      </div>
    `
  }
}