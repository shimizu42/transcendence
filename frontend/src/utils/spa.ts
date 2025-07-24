/**
 * Single Page Application utilities for routing and navigation
 */

export interface Route {
    path: string;
    handler: () => void;
    title?: string;
}

export class SPARouter {
    private routes: Map<string, Route> = new Map();
    private currentPath: string = '';
    private isInitialized: boolean = false;

    constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            this.handlePopState(e);
        });

        // Prevent default link behavior and use SPA routing
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a[href]') as HTMLAnchorElement;
            
            if (link && this.shouldInterceptLink(link)) {
                e.preventDefault();
                this.navigate(link.getAttribute('href') || '');
            }
        });
    }

    private shouldInterceptLink(link: HTMLAnchorElement): boolean {
        // Don't intercept external links or links with target="_blank"
        if (link.target === '_blank' || 
            link.host !== window.location.host ||
            link.hasAttribute('download')) {
            return false;
        }
        return true;
    }

    public addRoute(path: string, handler: () => void, title?: string): void {
        this.routes.set(path, { path, handler, title });
    }

    public navigate(path: string, pushState: boolean = true): void {
        // Normalize path
        const normalizedPath = this.normalizePath(path);
        
        // Don't navigate if already on this path
        if (normalizedPath === this.currentPath) {
            return;
        }

        const route = this.routes.get(normalizedPath);
        if (!route) {
            console.warn(`Route not found: ${normalizedPath}`);
            return;
        }

        // Update browser history
        if (pushState) {
            window.history.pushState(
                { path: normalizedPath }, 
                route.title || document.title, 
                normalizedPath
            );
        }

        // Update current path
        this.currentPath = normalizedPath;

        // Update document title
        if (route.title) {
            document.title = route.title;
        }

        // Execute route handler
        route.handler();
    }

    private handlePopState(e: PopStateEvent): void {
        const path = e.state?.path || window.location.pathname;
        this.navigate(path, false);
    }

    private normalizePath(path: string): string {
        // Remove query string and hash
        const cleanPath = path.split('?')[0].split('#')[0];
        
        // Ensure path starts with /
        return '/' + cleanPath.replace(/^\/+/, '');
    }

    public init(): void {
        if (this.isInitialized) {
            return;
        }

        // Navigate to current path
        const currentPath = this.normalizePath(window.location.pathname);
        this.navigate(currentPath, false);
        
        this.isInitialized = true;
    }

    public getCurrentPath(): string {
        return this.currentPath;
    }
}

/**
 * Screen management for the Pong Tournament app
 */
export class ScreenManager {
    private currentScreen: string = '';
    private screens: Map<string, HTMLElement> = new Map();
    private router: SPARouter;

    constructor() {
        this.router = new SPARouter();
        this.initializeScreens();
        this.setupRoutes();
    }

    private initializeScreens(): void {
        const screenElements = document.querySelectorAll('.screen');
        screenElements.forEach(screen => {
            const id = screen.id;
            if (id) {
                this.screens.set(id, screen as HTMLElement);
            }
        });
    }

    private setupRoutes(): void {
        // Define routes for each screen
        this.router.addRoute('/', () => this.showScreen('mainMenu'), 'Pong Tournament');
        this.router.addRoute('/tournament', () => this.showScreen('tournamentSetup'), 'Tournament Setup');
        this.router.addRoute('/bracket', () => this.showScreen('tournamentBracket'), 'Tournament Bracket');
        this.router.addRoute('/game', () => this.showScreen('game'), 'Pong Game');
    }

    public showScreen(screenId: string): void {
        // Hide all screens
        this.screens.forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const targetScreen = this.screens.get(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;

            // Update URL based on screen
            this.updateURLForScreen(screenId);
        } else {
            console.error(`Screen not found: ${screenId}`);
        }
    }

    private updateURLForScreen(screenId: string): void {
        const pathMap: { [key: string]: string } = {
            'mainMenu': '/',
            'tournamentSetup': '/tournament',
            'tournamentBracket': '/bracket',
            'game': '/game'
        };

        const path = pathMap[screenId] || '/';
        if (this.router.getCurrentPath() !== path) {
            this.router.navigate(path);
        }
    }

    public init(): void {
        this.router.init();
    }

    public getCurrentScreen(): string {
        return this.currentScreen;
    }

    public navigate(path: string): void {
        this.router.navigate(path);
    }
}

/**
 * History management utilities
 */
export class HistoryManager {
    private static instance: HistoryManager;
    private history: Array<{ screen: string; timestamp: number; data?: any }> = [];
    private maxHistorySize: number = 50;

    private constructor() {}

    public static getInstance(): HistoryManager {
        if (!HistoryManager.instance) {
            HistoryManager.instance = new HistoryManager();
        }
        return HistoryManager.instance;
    }

    public addEntry(screen: string, data?: any): void {
        const entry = {
            screen,
            timestamp: Date.now(),
            data
        };

        this.history.push(entry);

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    public getHistory(): Array<{ screen: string; timestamp: number; data?: any }> {
        return [...this.history];
    }

    public getPreviousScreen(): string | null {
        if (this.history.length < 2) {
            return null;
        }
        return this.history[this.history.length - 2].screen;
    }

    public clear(): void {
        this.history = [];
    }
}