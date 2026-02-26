# React Native移行開始メモ

## 目的
- 既存の `index.html` 単体構成から、ストア公開前提の React Native 構成へ段階移行する。
- 設定機能・通知機能を後付けしやすい土台を先に作る。

## 今回作成したもの
- `rn-app/` に Expo Router + TypeScript の土台ファイルを追加。
- `index.html` の下記ロジックを `src/core` へ分離して移植。
  - データ構造と時間帯正規化 (`habit-model.ts`)
  - 日付キー処理 (`date-key.ts`)
  - 連続達成の更新ロジック (`streak.ts`)
  - AsyncStorage永続化 (`storage.ts`)
- Zustand ストア (`useHabitsStore.ts`) に日次リセットの初期実装を追加。
- 画面は `app/index.tsx` と `app/settings.tsx` を作成。

## 既存Webとの対応
- `habits` / `lastOpenedDate` / `streakCount` / `streakLastDate` のキー互換を維持。
- 進捗履歴 (`rateHistoryByDate`) と日次スナップショット (`dailySnapshotByDate`) は次フェーズで移行。

## 次の実装順
1. 履歴グラフ用の履歴保存ロジックを `src/core/history.ts` として移植。
2. 設定画面に通知時刻・曜日・ON/OFF を実装し AsyncStorage に保存。
3. Expo Notifications でローカル通知を接続。
4. EAS Build 向けの `bundleIdentifier` / `package` を本番値に更新。

## ローカル起動
```bash
cd rn-app
npm install
npm run start
```

## 注意
- 現時点では移行土台のみで、Web版の全画面機能（履歴グラフ、カレンダー、インポート/エクスポート）は未移植。
- `app.json` の `projectId` は仮値のため、EAS作成後に置き換えが必要。
