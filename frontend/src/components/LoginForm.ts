import { ApiService } from '../services/ApiService';

export class LoginForm {
  private container: HTMLElement;
  private apiService: ApiService;
  private onLoginSuccess: (user: any) => void;

  constructor(container: HTMLElement, onLoginSuccess: (user: any) => void) {
    this.container = container;
    this.apiService = new ApiService();
    this.onLoginSuccess = onLoginSuccess;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-900">
        <div class="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
          <h2 class="text-2xl font-bold text-white mb-6 text-center">Transcendence Pong</h2>
          
          <div id="login-form" class="space-y-4">
            <div>
              <label for="username" class="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input type="text" id="username" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your username">
            </div>
            <div>
              <label for="password" class="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input type="password" id="password" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your password">
            </div>
            <button id="login-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Login
            </button>
            <button id="register-btn" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
              Register
            </button>
          </div>
          
          <div id="error-message" class="mt-4 text-red-500 text-sm hidden"></div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const loginBtn = document.getElementById('login-btn')!;
    const registerBtn = document.getElementById('register-btn')!;
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;

    loginBtn.addEventListener('click', () => this.handleLogin());
    registerBtn.addEventListener('click', () => this.handleRegister());

    [usernameInput, passwordInput].forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleLogin();
        }
      });
    });
  }

  private async handleLogin(): Promise<void> {
    const username = (document.getElementById('username') as HTMLInputElement).value.trim();
    const password = (document.getElementById('password') as HTMLInputElement).value;

    if (!username || !password) {
      this.showError('Username and password are required');
      return;
    }

    try {
      const result = await this.apiService.login(username, password);
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      this.onLoginSuccess(result.user);
    } catch (error) {
      console.error('Login error:', error);
      this.showError('Login failed. Please check your credentials.');
    }
  }

  private async handleRegister(): Promise<void> {
    const username = (document.getElementById('username') as HTMLInputElement).value.trim();
    const password = (document.getElementById('password') as HTMLInputElement).value;

    if (!username || !password) {
      this.showError('Username and password are required');
      return;
    }

    if (username.length < 3 || password.length < 6) {
      this.showError('Username must be at least 3 characters and password at least 6 characters');
      return;
    }

    try {
      console.log('Attempting registration for:', username);
      await this.apiService.register(username, password);
      console.log('Registration successful, attempting login...');
      const result = await this.apiService.login(username, password);
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      this.onLoginSuccess(result.user);
    } catch (error) {
      console.error('Registration error:', error);
      this.showError('Registration failed. Username may already exist.');
    }
  }

  private showError(message: string): void {
    const errorElement = document.getElementById('error-message')!;
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }
}