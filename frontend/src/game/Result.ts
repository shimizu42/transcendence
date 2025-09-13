// ResultScreen.ts 

export class ResultScreen {
  private container: HTMLElement;
  private winner: string;
  private score: string;
  private onBackToLobby: () => void;

  constructor(container: HTMLElement, winner: string, score: string, onBackToLobby: () => void) {
    this.container = container;
    this.winner = winner;
    this.score = score;
    this.onBackToLobby = onBackToLobby;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-lg p-8 text-center max-w-md w-full">
          <h2 class="text-3xl font-bold mb-4">Game is Over!</h2>
          <p class="text-xl mb-6">${this.winner} wins!</p>
          <p class="text-lg mb-6">Final Score: ${this.score}</p>
          <button id="back-to-lobby" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Back to Lobby
          </button>
        </div>
      </div>
    `;

    document.getElementById('back-to-lobby')!.addEventListener('click', () => {
      this.onBackToLobby();
    });
  }
}

