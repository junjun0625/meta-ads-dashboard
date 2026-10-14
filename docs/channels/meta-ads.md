# 🔵 CZUR｜Meta広告

Meta（Facebook・Instagram）広告の運用と、Meta広告ダッシュボードを持つチャネルです。

## 前提

### 置き場所
- Meta広告のシート：https://docs.google.com/spreadsheets/d/1S9af1fJ3SukC-hewpt84axsrGSSDaillGTOq2LIxvsA/edit
- Meta広告ダッシュボード（Webアプリ）：リポジトリ `junjun0625/meta-ads-dashboard`（Next.js、Vercel）
  - Meta Marketing APIからキャンペーン・クリエイティブ・年齢性別の内訳・日別の推移を取る
  - 期間の切り替え、配信中のみの絞り込み、トークンの更新ボタンがある
  - APIの認証情報はブラウザのlocalStorageに保存する方式

### KPIでの扱い
- Shopifyのツリーでは、注文の経路の一つ「Meta広告」（＝広告費 ÷ CPA）。経路の目標はまだない（今期の実績から作る予定）
- Shopifyの広告費率（年17%以内）は、Google広告とMeta広告で見る
- KOL動画広告の費用はShopifyの広告費に入れず、マーケ予算として別に記録する
- LINEの「知ったきっかけ」でInstagramが54%（2026年8月）。この中にはMeta広告から来た人も含む

## 現在の状態（10/5時点）
- Google広告で作った「日次の取り込み＋ダッシュボードシート」と同じ意味合いのものを、Meta側でも作り直したいという依頼を受けたところで、作業が止まっている（元のチャット「Meta ダッシュボードシート改修」は使用量の上限で中断）

## 未決事項
- Meta側のダッシュボードシートの作り直し（Google広告と同じ考え方：毎週同じ順番で同じ問いに答えられる1枚）
- Meta広告経由の注文の目標（KPIチャネルと一緒に、今期の実績から作る）

## 元のチャット
Meta ダッシュボードシート改修（10/5）、czur KPI（10/14）
