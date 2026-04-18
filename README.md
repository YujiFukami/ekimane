# 駅伝部のマネージャー（駅マネ）

> 陸上・駅伝部のマネージャー向け、スマホで使えるラップタイム計測Webアプリ

[![App](https://img.shields.io/badge/▶%20Launch%20App-brightgreen)](https://ekimane-lfqjoymif-yujifukamis-projects.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-YujiFukami%2Fekimane-181717?logo=github)](https://github.com/YujiFukami/ekimane)

---

## 🔗 リンク

| 種類 | URL |
|------|-----|
| 🌐 アプリ（Vercel） | [https://ekimane-lfqjoymif-yujifukamis-projects.vercel.app/](https://ekimane-lfqjoymif-yujifukamis-projects.vercel.app/) |
| 💻 GitHub リポジトリ | [https://github.com/YujiFukami/ekimane](https://github.com/YujiFukami/ekimane) |
| 🏢 会社ホームページ | [https://www.softex-celware.com/](https://www.softex-celware.com/) |

---

## 🎬 使い方動画

<video src="https://github.com/YujiFukami/ekimane/raw/main/%E8%AA%AC%E6%98%8E%E5%8B%95%E7%94%BB/%E7%94%BB%E9%9D%A2%E9%8C%B2%E7%94%BB%202026-04-18%20064806.mp4" controls width="600">
  お使いのブラウザは動画再生に対応していません。
</video>

▶ [動画を直接ダウンロード／再生する](説明動画/画面録画%202026-04-18%20064806.mp4)

---

## 🎯 概要

トラック練習で複数のランナーのラップタイムを **1台のスマホ** で同時に計測・集計できるアプリです。

| 課題 | 解決策 |
|------|--------|
| ランナーが複数いるとストップウォッチ1つでは計測しきれない | ランナーごとの個別ボタンで同時多人数対応 |
| タイム計測後の集計が手間 | 自動でペース・速度・順位を計算して表示 |
| 紙やメモに書くと共有が大変 | CSVエクスポートで即共有 |

---

## ✨ 機能一覧

### ランナー登録
- 名前または番号で登録
- 10色プリセットの色パレット（追加するたびに次の色へ自動進行）
- 登録済みランナーの削除

### セッション設定
- ラップ距離を選択（300m / 400m / 自由入力）

### 計測画面
- ミリ秒精度のリアルタイムタイマー
- ランナーごとの個別ラップ記録ボタン（ランナーカラー表示）
- 「全員同時」ボタン（全員を同タイムで一括記録）
- 「最初から」ボタン（ランナー登録を保持したままリセット）
- 「終了」ボタンでセッション確定

### ライブトラックアニメーション
- 陸上トラック（直線＋半円）をキャンバスで描画
- 各ランナーが **色付きの▼マーカー** としてトラック上をリアルタイム移動
- 直前ラップタイムを速度の基準に60fpsアニメーション
- マーカー内にリアルタイム順位を表示

### ラップ結果テーブル
- ランナーを行、周回を列に配置したクロス集計表
- **最新周が左側** に表示（常に最新状況を手前で確認）
- 各セルにラップタイム＋ペース（min/km）を表示
- 横スクロール対応（ラップが増えても計測ボタンは固定表示）

### サマリ・順位
- 総時間・平均ラップ・ベストラップ・総距離・平均速度・平均ペース
- **順位変動バンプチャート**（駅伝のリレーチャートのような順位の推移グラフ）

### データ管理
- CSV エクスポート（BOM付きUTF-8、Excel対応）
- セッション中はブラウザの sessionStorage でデータ保持

### UI/UX
- ライト / ダークモード切替
- モバイルファースト設計（スマホでの操作を最優先）
- PWA対応メタタグ（iOSホーム画面追加可能）
- SVGファビコン

---

## 🚀 使い方

### 1. ランナー登録
1. 名前または背番号を入力
2. 色を選択（追加するたびに自動で次の色へ）
3. 「追加」ボタンをタップ → 繰り返す

### 2. セッション設定
1. ラップ距離を選択（300m / 400m、またはその他で自由入力）
2. 「▶ セッション開始」をタップ

### 3. 計測
- 各ランナーのボタンをタップ → そのランナーのラップを記録
- 「全員同時」→ 全ランナーを同タイムで記録
- ラップ結果は画面下部にリアルタイム更新

### 4. 終了・集計
1. 「終了」ボタンでセッション確定
2. 「🏆 サマリ」タブで順位・統計・バンプチャートを確認
3. 「CSV エクスポート」でデータを保存・共有

---

## 🛠 技術スタック

| 項目 | 内容 |
|------|------|
| HTML5 | 構造・セマンティクス |
| CSS3 | グラスモーフィズム・ダークモード・レスポンシブ |
| Vanilla JavaScript | ロジック・Canvas アニメーション |
| フォント | Noto Sans JP (Google Fonts) |
| ビルドツール | なし（サーバーレス・ファイル直実行） |
| デプロイ | GitHub Pages |

---

## 📂 ファイル構成

```
ekimane/
├── index.html      # メインHTML
├── style.css       # スタイルシート
├── script.js       # アプリロジック・Canvas描画
├── favicon.svg     # ファビコン（ストップウォッチアイコン）
└── README.md       # このファイル
```

---

## 🔧 ローカルで動かす

サーバー不要。ファイルをダウンロードして `index.html` をブラウザで開くだけです。

```bash
git clone https://github.com/YujiFukami/ekimane.git
cd ekimane
# index.html をブラウザで開く
```

---

## 📋 今後の拡張予定

- [ ] PWA化（オフライン対応・インストール可能）
- [ ] 練習履歴の保存（LocalStorage / IndexedDB）
- [ ] 複数セッションの管理
- [ ] ランナーのプロフィール（目標タイムなど）登録

---

## 📄 ライセンス

MIT License

---

## 🏢 開発元

<a href="https://www.softex-celware.com/">
  <img src="logo.svg" alt="SOFTEX-CELWARE" width="320" />
</a>

**Softex Celware** — [https://www.softex-celware.com/](https://www.softex-celware.com/)

---

*Made with ❤️ for track & field managers*
