# WBS管理アプリ 仕様書
> Google Antigravity へのプロジェクト指示書 v1.0
> プロジェクト：未来フォーラム 彦根 第一部　2026.6.5

---

## 🎯 概要

静的HTMLアプリ（HTML + CSS + JavaScript）として制作し、GitHub Pagesで公開する。
バックエンド不要。データはすべて `tasks.js` に記述し、管理者がcommit/pushして更新する。

---

## 📁 ファイル構成

```
/
├── index.html       # アプリ本体
├── tasks.js         # タスクデータ（管理者が編集する）
├── style.css        # スタイル
├── app.js           # アプリロジック
└── README.md        # 使い方
```

---

## 🗂️ データ構造（tasks.js）

```javascript
const TASKS = {
  project: {
    name: "未来フォーラム 彦根　第一部",
    date: "2026-06-05",
    venue: "彦根商工会議所 4Fホール",
  },
  venues: [
    {
      id: "v1",
      name: "4Fホール（彦根商工会議所）",
      groups: [
        {
          id: "g1",
          timing: "リハーサル（当日朝・時間要確認）",
          tasks: [
            {
              id: "t1",
              text: "リハーサル運営",
              tanto: "加藤",
              start: "2026-06-05",
              end: "2026-06-05",
              priority: "high",  // "high" | "mid" | "low"
              done: false,
              memo: "開始時間は要確認（8時集合の可能性あり）"
            }
          ]
        },
        {
          id: "g2",
          timing: "開会前",
          tasks: [
            { id:"t2", text:"配布物の設置", tanto:"加藤", start:"2026-06-05", end:"2026-06-05", priority:"high", done:false, memo:"配布物の内容は別途確認" },
            { id:"t3", text:"来賓誘導（控え室→会場）", tanto:"加藤", start:"2026-06-05", end:"2026-06-05", priority:"high", done:false, memo:"15:00直前に控え室へ" }
          ]
        },
        {
          id: "g3",
          timing: "着席前",
          tasks: [
            { id:"t4", text:"サテライト会場への案内・誘導", tanto:"加藤", start:"2026-06-05", end:"2026-06-05", priority:"mid", done:false, memo:"入り切らない参加者を誘導" }
          ]
        },
        {
          id: "g4",
          timing: "式典中",
          tasks: [
            { id:"t5", text:"進行管理", tanto:"加藤", start:"2026-06-05", end:"2026-06-05", priority:"high", done:false, memo:"" },
            { id:"t6", text:"音響・映像オペレーション", tanto:"", start:"2026-06-05", end:"2026-06-05", priority:"high", done:false, memo:"担当者要確認" },
            { id:"t7", text:"記録・撮影", tanto:"", start:"2026-06-05", end:"2026-06-05", priority:"mid", done:false, memo:"カメラマン手配要確認" },
            { id:"t8", text:"来賓対応", tanto:"加藤", start:"2026-06-05", end:"2026-06-05", priority:"high", done:false, memo:"" },
            { id:"t9", text:"トラブル対応", tanto:"", start:"2026-06-05", end:"2026-06-05", priority:"high", done:false, memo:"担当者・連絡体制を決めておく" }
          ]
        },
        {
          id: "g5",
          timing: "終了後",
          tasks: [
            { id:"t10", text:"片付け", tanto:"加藤", start:"2026-06-05", end:"2026-06-05", priority:"low", done:false, memo:"" }
          ]
        }
      ],
      prepItems: [
        { id:"p1",  text:"配布物（内容は確認）", done:false },
        { id:"p2",  text:"役職者・来賓名の紙", done:false },
        { id:"p3",  text:"看板", done:false },
        { id:"p4",  text:"席次表 / 座席プレート", done:false },
        { id:"p5",  text:"音響", done:false },
        { id:"p6",  text:"プロジェクター／スクリーン", done:false },
        { id:"p7",  text:"配信セット", done:false },
        { id:"p8",  text:"撮影機材", done:false },
        { id:"p9",  text:"司会台・演台", done:false },
        { id:"p10", text:"マイク（演台用・フロア用・ハンド）※本数要確認", done:false },
        { id:"p11", text:"進行台本", done:false }
      ]
    },
    {
      id: "v2",
      name: "サテライト会場",
      groups: [
        {
          id: "g6",
          timing: "開会前",
          tasks: [
            { id:"t11", text:"サテライト会場セッティング", tanto:"", start:"2026-06-05", end:"2026-06-05", priority:"high", done:false, memo:"担当者要確認" }
          ]
        },
        {
          id: "g7",
          timing: "式典中",
          tasks: [
            { id:"t12", text:"音響・映像オペレーション（エンジニア1名）", tanto:"", start:"2026-06-05", end:"2026-06-05", priority:"high", done:false, memo:"専任エンジニア1名必須" },
            { id:"t13", text:"進行管理", tanto:"", start:"2026-06-05", end:"2026-06-05", priority:"mid", done:false, memo:"" },
            { id:"t14", text:"記録・撮影", tanto:"", start:"2026-06-05", end:"2026-06-05", priority:"mid", done:false, memo:"" },
            { id:"t15", text:"トラブル対応", tanto:"", start:"2026-06-05", end:"2026-06-05", priority:"mid", done:false, memo:"" }
          ]
        },
        {
          id: "g8",
          timing: "終了後",
          tasks: [
            { id:"t16", text:"片付け", tanto:"", start:"2026-06-05", end:"2026-06-05", priority:"low", done:false, memo:"" }
          ]
        }
      ],
      prepItems: [
        { id:"p12", text:"中継用音響・映像機材", done:false },
        { id:"p13", text:"スクリーン", done:false }
      ]
    }
  ],
  // 事前準備タスク（ガントチャート表示用）
  preTasks: [
    { id:"pre1", text:"4Fホール 予約確定",     tanto:"加藤", start:"2026-03-01", end:"2026-03-31", priority:"high", done:false },
    { id:"pre2", text:"プログラム骨子の作成",   tanto:"加藤", start:"2026-04-01", end:"2026-04-15", priority:"high", done:false },
    { id:"pre3", text:"登壇者・来賓への依頼",   tanto:"加藤", start:"2026-04-01", end:"2026-04-15", priority:"high", done:false },
    { id:"pre4", text:"プレゼン資料 構成確定",  tanto:"加藤", start:"2026-04-15", end:"2026-04-20", priority:"high", done:false },
    { id:"pre5", text:"視察先 選定・許可取得",  tanto:"加藤", start:"2026-04-15", end:"2026-04-30", priority:"high", done:false },
    { id:"pre6", text:"座席配置プラン作成",     tanto:"加藤", start:"2026-05-01", end:"2026-05-10", priority:"high", done:false },
    { id:"pre7", text:"音響・映像 手配",        tanto:"加藤", start:"2026-05-10", end:"2026-05-15", priority:"high", done:false },
    { id:"pre8", text:"配布物 準備",            tanto:"加藤", start:"2026-05-10", end:"2026-05-28", priority:"mid",  done:false },
    { id:"pre9", text:"進行台本 作成",          tanto:"加藤", start:"2026-05-20", end:"2026-05-25", priority:"high", done:false },
    { id:"pre10",text:"スタッフレクチャー",     tanto:"加藤", start:"2026-06-03", end:"2026-06-03", priority:"high", done:false },
    { id:"pre11",text:"リハーサル",             tanto:"加藤", start:"2026-06-05", end:"2026-06-05", priority:"high", done:false }
  ]
};
```

---

## 🖥️ 画面仕様

### 共通ヘッダー
- プロジェクト名・日付・会場名を表示
- 全体進捗バー（完了タスク数 / 全タスク数・%）
- ビュー切り替えタブ：「WBS」「ガントチャート」「担当者別」

---

### ① WBSビュー（デフォルト）

**階層構造：**
```
会場（折りたたみ可）
  └── タイミング（折りたたみ可）
        └── タスク行（チェックボックス付き）
  └── 準備物セクション
        └── 準備物行（チェックボックス付き）
```

**タスク行の表示項目：**
- チェックボックス（完了にすると取り消し線 + 色がグレーに）
- タスク名
- 担当者バッジ
- 優先度バッジ（🔴高 / 🟡中 / 🟢低）
- メモ（短縮表示、ホバーで全文）

**タスク行クリック → 右サイドパネルに詳細表示：**
- タスク名、担当者、期限、優先度、メモ、ステータスを編集可能
- 編集内容はlocalStorageに保存（tasks.jsは変更しない）

---

### ② ガントチャートビュー

- 表示期間：2026年3月〜6月
- 左列：タスク名
- 右側：月別グリッドにバーを表示
- 事前準備タスクは期間バーで表示
- 当日タスクはマーカー（◆）で表示
- 今日の位置に縦線（青）
- 完了タスクはバーの色をグレーに変更

---

### ③ 担当者別ビュー

- 担当者ごとにセクションを分けて表示
- 担当者未定（空欄）は「未定」セクションにまとめる
- 各タスクにチェックボックス
- 期限順にソート

---

## 💾 データ保存ルール

- `tasks.js` の `done` フラグは管理者がcommit/pushで更新する（マスターデータ）
- ブラウザ上でのチェック操作は `localStorage` に一時保存し、ページ再読み込みでも状態を維持
- localStorageのキー：`wbs_done_{taskId}`

---

## 🎨 デザイン要件

- ダークテーマ（背景：#0e1117 系）
- フォント：Noto Sans JP（日本語）+ DM Mono（ID・数値）
- アクセントカラー：#4f8ef7（青）
- 優先度カラー：赤 / 黄 / 緑
- レスポンシブ対応（PC優先、スマホでも崩れないこと）
- JOOTOライクなUI（左にWBSツリー、右にガントチャートまたは詳細パネル）

---

## 🚀 GitHub Pages 公開手順（READMEに記載すること）

1. リポジトリをGitHubにpush
2. Settings → Pages → Source: main branch / root
3. 公開URLをチームに共有
4. タスク更新時は `tasks.js` を編集してcommit/push

---

## 📌 AGへの初期指示プロンプト

```
この仕様書に従って、WBS管理アプリを作成してください。

【仕様書】: 本ファイル（WBSアプリ仕様書.md）を参照

【作成するファイル】
1. index.html　- アプリ本体（HTMLのみ、CSS/JSはファイル分割）
2. tasks.js　　- タスクデータ（仕様書のサンプルデータを使用）
3. style.css　 - スタイル
4. app.js　　　- アプリロジック
5. README.md　 - GitHub Pages公開手順と使い方

【優先順位】
1. WBSビュー（階層構造 + チェックボックス）← まずここを動かす
2. ガントチャートビュー
3. 担当者別ビュー

【注意事項】
- バックエンド不要。完全静的ファイル構成
- localStorageでチェック状態を保存
- GitHub Pagesで動作確認すること
- 外部ライブラリは CDN で読み込む（npm不要）
```
