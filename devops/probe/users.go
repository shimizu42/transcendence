// probe/users.go

package probe

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"

    "transc-exporter/config"
)

type UserRow struct {
  IsOnline bool `json:"isOnline"`
  InGame   bool `json:"isInGame"`
}

// CollectUsers は /users が配列または {"users":[...]} のどちらでもカウントできます。
// ※ バックエンドの実パスに合わせて BASE + PATH を調整してください。
func CollectUsers(ctx context.Context, cfg *config.Config) (online, ingame int, err error) {
  client := &http.Client{Timeout: cfg.HTTPTimeout()}

    // 404 になっていた /api/users ではなく、実装に合わせて /users などに変更してください
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, cfg.BackendBase()+"/users", nil)
  if err != nil {
    return 0, 0, err
  }
  if tok := cfg.APIToken(); tok != "" {
    req.Header.Set("Authorization", "Bearer "+tok)
  }

    resp, err := client.Do(req)
  if err != nil {
    return 0, 0, err
  }
  defer resp.Body.Close()

    // ステータスコードを先に検査（非2xxはすぐエラー）
    if resp.StatusCode/100 != 2 {
    // 返ってきた本文の先頭だけ拾っておくとデバッグしやすい
    body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
    return 0, 0, fmt.Errorf("users: unexpected status %d: %s", resp.StatusCode, string(body))
  }

    // 本文を読み切って、配列 or ラップオブジェクトの両対応
    body, err := io.ReadAll(resp.Body)
  if err != nil {
    return 0, 0, err
  }

    // ① まず単純配列を試す
    var users []UserRow
      if err := json.Unmarshal(body, &users); err != nil {
    // ② ダメなら {"users":[...]} を試す
    var wrapped struct {
      Users []UserRow `json:"users"`
    }
    if err2 := json.Unmarshal(body, &wrapped); err2 != nil {
      return 0, 0, fmt.Errorf("users: decode failed: %v / wrapped: %v", err, err2)
    }
    users = wrapped.Users
  }

    for _, u := range users {
    if u.IsOnline {
      online++
    }
    if u.InGame {
      ingame++
    }
  }
  return
}
