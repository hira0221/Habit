# Web Push サーバー連携手順

## 1. 依存関係を入れる
```powershell
npm install
```

## 2. VAPID鍵を生成
```powershell
npm run push:keygen
```

出力された `VAPID_PUBLIC_KEY` と `VAPID_PRIVATE_KEY` を控える。

## 3. `.env` を作成
`.env.example` をコピーして `.env` を作り、鍵を貼る。

```txt
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your-email@example.com
PORT=4173
```

## 4. ローカルで PWA + Push API サーバー起動
```powershell
npm run pwa:dev
```

ブラウザで `http://localhost:4173` を開く。

## 5. Vercel で使う場合
Vercel では `server/pwa-server.js` は常駐しないため、`/api/push/*` は `api/` 配下の Functions を使う。

必要な環境変数:

```txt
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your-email@example.com
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

補足:
- `KV_REST_API_URL` と `KV_REST_API_TOKEN` は Vercel KV 連携で発行される値を設定する
- Vercel Hobby プランでは毎分 Cron が使えないため、定期通知は外部 Cron から `/api/cron/push` を毎分呼び出す
- Vercel 上ではローカルファイル保存は使わず、購読情報は KV に保存する

外部 Cron の例:
- `https://cron-job.org/` などでジョブを作る
- URL は `https://your-domain.vercel.app/api/cron/push`
- 実行間隔は 1分
- まずはブラウザで `/api/cron/push` を開いて JSON が返ることを確認する

## 6. アプリ側で通知設定
1. メニュー -> `アプリ設定`
2. `習慣リマインド通知を有効化` を ON
3. 保存

成功時:
- Push購読が `/api/push/subscribe` に保存される
- テスト通知を1回送信
- 指定時刻（朝/昼/夜）に1分単位で配信される

## API エンドポイント
- `GET /api/health`
- `GET /api/push/public-key`
- `POST /api/push/subscribe`
- `POST /api/push/unsubscribe`
- `POST /api/push/test`

## 補足
- Web Push は `HTTPS` もしくは `localhost` が必要。
- 実公開時はこの Node サーバーを常時稼働できる環境（Render, Railway, Fly.io など）に置く。
