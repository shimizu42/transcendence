export class SPA {
  private routes: Map<string, (params?: any) => string> = new Map()
  private currentPath: string = '/'

  constructor() {
    window.addEventListener('popstate', () => {
      this.handleRoute()
    })
  }

  public init() {
    this.handleRoute()
  }

  public addRoute(path: string, handler: (params?: any) => string) {
    this.routes.set(path, handler)
  }

  public navigateTo(path: string) {
    window.history.pushState({}, '', path)
    this.handleRoute()
  }

  private handleRoute() {
    const path = window.location.pathname
    this.currentPath = path

    // Try exact match first
    const exactHandler = this.routes.get(path)
    if (exactHandler) {
      this.render(exactHandler())
      return
    }

    // Try parameterized routes
    for (const [routePath, handler] of this.routes.entries()) {
      const params = this.matchRoute(routePath, path)
      if (params !== null) {
        this.render(handler(params))
        return
      }
    }

    // 404 fallback
    this.render(this.render404())
  }

  private matchRoute(routePath: string, actualPath: string): any | null {
    const routeParts = routePath.split('/')
    const actualParts = actualPath.split('/')

    if (routeParts.length !== actualParts.length) {
      return null
    }

    const params: any = {}
    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i]
      const actualPart = actualParts[i]

      if (routePart.startsWith(':')) {
        const paramName = routePart.slice(1)
        params[paramName] = actualPart
      } else if (routePart !== actualPart) {
        return null
      }
    }

    return params
  }

  private render(content: string) {
    const app = document.getElementById('app')
    if (app) {
      app.innerHTML = content
    }
  }

  private render404(): string {
    return `
      <div class="game-container">
        <div class="text-center">
          <h1 class="text-4xl font-bold mb-4 text-red-500">404</h1>
          <p class="text-xl mb-6">ページが見つかりません</p>
          <button onclick="app.navigateTo('/')" class="btn btn-primary">
            ホームに戻る
          </button>
        </div>
      </div>
    `
  }
}