# タスク管理

現在のタスク、優先順位、状態を管理する。

## 状態の定義

- `未着手`: まだ着手していない
- `計画中`: plannerによる計画作成中/完了
- `実装中`: developerによる実装中
- `レビュー中`: reviewerによる確認中
- `完了`: 完了条件（CLAUDE.md参照）を満たした

## タスク一覧

| ID | タスク | 優先度 | 状態 | 担当エージェント | 備考 |
|----|--------|--------|------|------------------|------|
| T-001 | 長期開発用AI開発環境の整備（tasks/progress/decisions） | 高 | 完了 | claude | docs配下に3ファイルを作成し、CLAUDE.mdに参照ルールを追加 |
| T-002 | project001を共通AI開発エージェント用テンプレートへ転換 | 高 | 完了 | claude | CLAUDE.mdに「プロジェクトの役割」「トークン効率化ルール」を追加。個別アプリの仕様・コードは保持しない方針を明記（D-002参照） |
| T-003 | ponytail（DietrichGebert/ponytail）のコード品質ルールを導入 | 中 | 完了 | claude | AGENTS.mdの内容をCLAUDE.mdに「コード品質ルール（Ponytail）」として統合（D-003参照） |
| T-004 | AI開発OS化: Manager導入とドキュメント/Agent構成の整理 | 高 | 完了 | claude | CLAUDE.mdを大幅簡潔化し、Manager役割（このセッション自身）を明記。docs/agents.mdを新設しAgent構成とPonytail原則を集約（D-003の内容を移設）（D-004参照） |
| T-005 | SessionStart/PreCompact Hookの導入 | 中 | 完了 | claude | .claude/settings.jsonを新設。tasks.md/progress.mdの自動表示と圧縮前リマインダーを1行shellコマンドで実装（D-005参照） |
| T-006 | AI開発OS全体レビュー（重複排除・Hook環境検証） | 高 | 完了 | claude | CLAUDE.mdのAgent説明重複を除去、Manager-Hook接続を明文化、Hook環境依存性を文書化（D-006参照） |
| T-007 | Agent別モデル最適化（Model Routing）の導入 | 中 | 完了 | claude | Planner=opus/Developer・Reviewer=sonnetに固定。軽量レビューはAgent呼び出し時のmodelパラメータ上書きで対応（D-007参照） |
| T-008 | ビジュアルサイトビルダー: 設計フェーズ（アーキテクチャ・データ構造・ディレクトリ・UI/UX・技術選定・段階的スコープ） | 高 | 完了 | planner | Planner提案をUser承認（D-009参照）。以降はP0〜P3のフェーズ別タスク（T-010以降）で実装管理する |
| T-010 | ビジュアルサイトビルダー P0（MVP）: スキーマ・core/render・基本セクション種別・基本編集・自動保存・プレビュー・ZIPエクスポート・Node CLI | 高 | 完了 | developer/reviewer | セキュリティ2件（href/URLのXSS対策、theme色のCSSインジェクション対策）Reviewer承認済み。cssHref空文字列バグも修正済み。Manager側でPlaywrightによりプレビュー正常表示・セクション選択・プロパティパネル表示を視覚確認済み |
| T-011 | ビジュアルサイトビルダー P1-a: teate1122インポートスクリプト（Astroソース→サイトビルダーJSON変換） | 高 | 完了 | developer/reviewer | tools/import-teate1122.jsを新規実装。Reviewer承認済み（軽微指摘のイベント開催予定/過去の分類・ソートも追加修正済み）。Manager側で5ページ全てのビルド・バリデーション・実データ反映を確認済み |

| T-012 | ビジュアルサイトビルダー P1-b: 並び替え（構成シート）・Undo/Redo・テーマプリセット切替UI・PWAオフライン・WebP最適化 | 高 | 完了 | developer/reviewer | 必須修正（ZIPエクスポート例外）対応済み、Reviewer承認。Manager側でビルド確認済み |
| T-015 | Netlify公開設定の追加・本番デプロイ確認 | 高 | 完了 | claude | netlify.toml追加（publish=リポジトリルート、/を/editor/へリダイレクト）。本番URL https://edit-teate.netlify.app/editor/ で構造確認済み（リダイレクト・core/sitesへの相対パス解決・PWAファイル、いずれも200） |
| T-016 | core/renderのパリティ修正（ヘッダー/ナビ・フッター・OGP/favicon・Netlify Forms対応・Webフォント読み込み） | 高 | 完了 | developer/reviewer | Reviewer承認済み（推奨事項2件: og:image/og:urlの絶対URL化はT-017でベースURL解決とセットで対応）。Manager側でPlaywright視覚確認済み（ヘッダー/ナビ/フッター/フォーム表示、既存編集機能に影響なし） |
| T-017 | teate1122リポジトリのビルド方式移行（Astro→ビルド不要の静的サイト、legacy-astro/退避、builder-previewブランチでの確認、サイトのベースURL解決とog:image/og:url絶対URL化） | 高 | 完了 | developer/reviewer | Reviewer要修正1件（data: URIでog:imageが壊れる）を修正済み承認。teate1122側はbuilder-previewブランチに退避・生成静的サイト配置・netlify.toml更新済み。Manager側で5ページ全て表示・OGP絶対URL出力を確認済み（main未変更） |
| T-018 | 「更新」ボタンによるGitHub直接公開機能（Git Data API・PAT管理・確認シート・進捗表示） | 高 | レビュー中 | developer/reviewer | D-010参照。実装完了（editor/publish/build-files.js・github.js・token-store.js、editor/ui/sheets/publish-sheet.js、更新ボタン、sites/teate1122/publish.json）。GitHub Data APIクライアントはモックfetchでユニットテスト済み。実push未検証（PAT未用意のためレビュー/User操作で確認予定） |
| T-019 | contact-socialセクションの要素個別化（お問い合わせフォームとSNSの視覚的分離、Instagram遷移ボタンの独立） | 高 | 完了 | developer/reviewer | User指摘対応（コミット6af2439）。Reviewer承認済み（必須修正なし、軽微な既存踏襲事項のみ） |
| T-020 | トップページへのコンテンツ集約（プロフィール/活動等を別ページからトップページのセクションへ統合、ハンバーガーメニューは各セクションへのアンカー遷移に変更） | 高 | 完了 | developer/reviewer | Planner計画に基づき実装（D-011参照）。home.jsonを12セクションに再編し、about/activities/contact.jsonを削除。nav.itemsにhref方式を追加。build確認済み（index.html/privacy.htmlのみ生成、workshop-past非表示）。Reviewer承認済み（軽微指摘4件、必須修正なし。バックログ参照） |

## バックログ（未着手・優先度未確定）
- T-013 (P2想定・一部T-018へ吸収): 複数ページ管理UI（ページ切替導線）・ギャラリー・アニメーション・ダークモード
- T-014 (P3想定): 複数サイト管理UI・テンプレート7種・SEO/OGP詳細
- T-018のv2候補: 差分ファイルのみアップロード・Netlify Deploy APIでの公開完了確認・差分プレビュー・公開履歴とロールバック（D-010参照）
- 画像アセット（data URL）のコミット肥大化に対する上限警告は未実装（D-010参照、優先度未確定）
- editor/media/zip.jsが全ページ書き出し時にstyle.css/assetsを重複してZIPに書き込む（T-012レビューで発見、非ブロッキング。優先度低）
- progress.mdが将来肥大化した場合、docs/progress-archive.md等への分割を検討する（D-006時点では未実施・優先度未確定）
- T-020レビュー指摘（優先度低、非ブロッキング）: `render-site.js`の`isAnchor = item.href.startsWith("#")`が実データ（`/#profile`等）では常にfalseになる死んだ分岐。aria-current非付与は別ロジックで結果的に成立しているため実害なし。`href.includes("#")`への修正、またはコメント整合を推奨
- T-020レビュー指摘: `editor/app/main.js`の`loadInitialState`がIndexedDBキャッシュを無条件優先するため、過去にeditorを開いたブラウザで旧5ページ構成のstale状態が復元され続ける懸念。公開サイト自体には無関係だが、editor利用者が気づかず古い状態を編集・エクスポートするリスクがあるため、バージョンキー等での無効化を将来検討する

## メモ

- 新しいタスクを追加したら、必ず優先度と状態を設定すること。
- タスクの状態が変わったら都度このファイルを更新する（作業完了後にまとめて更新しない）。
- 詳細な作業内容や経緯は [progress.md](./progress.md) を参照。
- 設計上の判断が必要になった場合は [decisions.md](./decisions.md) に記録する。
