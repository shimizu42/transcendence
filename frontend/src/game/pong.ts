export interface Player {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    score: number;
    name: string;
}

export interface Ball {
    x: number;
    y: number;
    radius: number;
    speedX: number;
    speedY: number;
}

export interface GameState {
    player1: Player;
    player2: Player;
    ball: Ball;
    isRunning: boolean;
    gameWidth: number;
    gameHeight: number;
    maxScore: number;
    winner: string | null;
}

export class PongGame {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private gameState: GameState;
    private keys: { [key: string]: boolean } = {};
    private animationId: number | null = null;
    private onGameEnd?: (winner: string) => void;

    constructor(canvas: HTMLCanvasElement, player1Name: string = "Player 1", player2Name: string = "Player 2") {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Unable to get 2D context from canvas');
        }
        this.ctx = context;

        // Initialize game state
        this.gameState = {
            gameWidth: canvas.width,
            gameHeight: canvas.height,
            maxScore: 5,
            winner: null,
            isRunning: false,
            player1: {
                x: 20,
                y: canvas.height / 2 - 50,
                width: 10,
                height: 100,
                speed: 5,
                score: 0,
                name: player1Name
            },
            player2: {
                x: canvas.width - 30,
                y: canvas.height / 2 - 50,
                width: 10,
                height: 100,
                speed: 5,
                score: 0,
                name: player2Name
            },
            ball: {
                x: canvas.width / 2,
                y: canvas.height / 2,
                radius: 8,
                speedX: 4,
                speedY: 3
            }
        };

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Start game with space
            if (e.key === ' ' && !this.gameState.isRunning && !this.gameState.winner) {
                this.start();
            }
            
            // Restart game with R
            if (e.key.toLowerCase() === 'r' && this.gameState.winner) {
                this.reset();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    public start(): void {
        if (this.gameState.isRunning) return;
        
        this.gameState.isRunning = true;
        this.gameLoop();
    }

    public pause(): void {
        this.gameState.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    public reset(): void {
        this.pause();
        
        // Reset positions
        this.gameState.player1.y = this.canvas.height / 2 - 50;
        this.gameState.player2.y = this.canvas.height / 2 - 50;
        this.gameState.ball.x = this.canvas.width / 2;
        this.gameState.ball.y = this.canvas.height / 2;
        
        // Reset scores
        this.gameState.player1.score = 0;
        this.gameState.player2.score = 0;
        
        // Reset ball direction
        this.gameState.ball.speedX = Math.random() > 0.5 ? 4 : -4;
        this.gameState.ball.speedY = (Math.random() - 0.5) * 6;
        
        this.gameState.winner = null;
        this.gameState.isRunning = false;
        
        this.draw();
    }

    private gameLoop(): void {
        if (!this.gameState.isRunning) return;

        this.update();
        this.draw();

        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    private update(): void {
        // Update player positions based on input
        this.updatePlayers();
        
        // Update ball position
        this.updateBall();
        
        // Check for collisions
        this.checkCollisions();
        
        // Check win condition
        this.checkWinCondition();
    }

    private updatePlayers(): void {
        const { player1, player2, gameHeight } = this.gameState;
        
        // Player 1 controls (W/S)
        if (this.keys['w'] && player1.y > 0) {
            player1.y -= player1.speed;
        }
        if (this.keys['s'] && player1.y < gameHeight - player1.height) {
            player1.y += player1.speed;
        }
        
        // Player 2 controls (Arrow keys)
        if (this.keys['arrowup'] && player2.y > 0) {
            player2.y -= player2.speed;
        }
        if (this.keys['arrowdown'] && player2.y < gameHeight - player2.height) {
            player2.y += player2.speed;
        }
    }

    private updateBall(): void {
        const { ball } = this.gameState;
        
        ball.x += ball.speedX;
        ball.y += ball.speedY;
        
        // Ball collision with top/bottom walls
        if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= this.gameState.gameHeight) {
            ball.speedY = -ball.speedY;
        }
    }

    private checkCollisions(): void {
        const { ball, player1, player2 } = this.gameState;
        
        // Check collision with player 1 paddle
        if (ball.x - ball.radius <= player1.x + player1.width &&
            ball.y >= player1.y &&
            ball.y <= player1.y + player1.height &&
            ball.speedX < 0) {
            
            ball.speedX = -ball.speedX;
            // Add some angle based on where the ball hit the paddle
            const hitPos = (ball.y - player1.y) / player1.height;
            ball.speedY = (hitPos - 0.5) * 10;
        }
        
        // Check collision with player 2 paddle
        if (ball.x + ball.radius >= player2.x &&
            ball.y >= player2.y &&
            ball.y <= player2.y + player2.height &&
            ball.speedX > 0) {
            
            ball.speedX = -ball.speedX;
            // Add some angle based on where the ball hit the paddle
            const hitPos = (ball.y - player2.y) / player2.height;
            ball.speedY = (hitPos - 0.5) * 10;
        }
    }

    private checkWinCondition(): void {
        const { ball, player1, player2, gameWidth, maxScore } = this.gameState;
        
        // Ball went off left side (player 2 scores)
        if (ball.x < 0) {
            player2.score++;
            this.resetBall();
        }
        
        // Ball went off right side (player 1 scores)
        if (ball.x > gameWidth) {
            player1.score++;
            this.resetBall();
        }
        
        // Check if someone won
        if (player1.score >= maxScore) {
            this.gameState.winner = player1.name;
            this.gameState.isRunning = false;
            if (this.onGameEnd) {
                this.onGameEnd(player1.name);
            }
        } else if (player2.score >= maxScore) {
            this.gameState.winner = player2.name;
            this.gameState.isRunning = false;
            if (this.onGameEnd) {
                this.onGameEnd(player2.name);
            }
        }
    }

    private resetBall(): void {
        const { ball, gameWidth, gameHeight } = this.gameState;
        
        ball.x = gameWidth / 2;
        ball.y = gameHeight / 2;
        ball.speedX = Math.random() > 0.5 ? 4 : -4;
        ball.speedY = (Math.random() - 0.5) * 6;
    }

    private draw(): void {
        const { ctx } = this;
        const { player1, player2, ball, gameWidth, gameHeight } = this.gameState;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, gameWidth, gameHeight);
        
        // Draw center line
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(gameWidth / 2, 0);
        ctx.lineTo(gameWidth / 2, gameHeight);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw players
        ctx.fillStyle = '#fff';
        ctx.fillRect(player1.x, player1.y, player1.width, player1.height);
        ctx.fillRect(player2.x, player2.y, player2.width, player2.height);
        
        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw scores
        ctx.font = '30px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(player1.score.toString(), gameWidth / 4, 50);
        ctx.fillText(player2.score.toString(), (gameWidth * 3) / 4, 50);
        
        // Draw player names
        ctx.font = '16px Courier New';
        ctx.fillText(player1.name, gameWidth / 4, 80);
        ctx.fillText(player2.name, (gameWidth * 3) / 4, 80);
        
        // Draw game status
        if (this.gameState.winner) {
            ctx.font = '48px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.gameState.winner} WINS!`, gameWidth / 2, gameHeight / 2);
            ctx.font = '24px Courier New';
            ctx.fillText('Press R to restart', gameWidth / 2, gameHeight / 2 + 60);
        } else if (!this.gameState.isRunning) {
            ctx.font = '24px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('Press SPACE to start', gameWidth / 2, gameHeight / 2 + 60);
        }
    }

    public setOnGameEnd(callback: (winner: string) => void): void {
        this.onGameEnd = callback;
    }

    public getGameState(): GameState {
        return { ...this.gameState };
    }

    public destroy(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        document.removeEventListener('keydown', this.setupEventListeners);
        document.removeEventListener('keyup', this.setupEventListeners);
    }
}