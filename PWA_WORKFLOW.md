# PWA運用ルール

## 正本（編集する場所）
- `index.html`
- `manifest.webmanifest`
- `service-worker.js`
- `icons/`

この4つをPWA公開の正本として扱います。

## 公開対象
- ルートディレクトリをそのまま静的ホスティングに公開する。
- `web/` は Capacitor 用の生成物で、PWA公開には使わない。

## よく使うコマンド
```powershell
# ローカル確認
npm run pwa:serve

# 公開前チェック
npm run pwa:publish-check
```

## Capacitorを触る場合
```powershell
npm run cap:prepare
npm run cap:sync:android
```

`web/` は上記で再生成されるため、直接編集しないこと。
