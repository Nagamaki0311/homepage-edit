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
| T-016 | core/renderのパリティ修正（ヘッダー/ナビ・フッター・OGP/favicon・Netlify Forms対応・Webフォント読み込み） | 高 | 未着手 | developer | 「更新」ボタン公開機能の前提作業。D-010参照。本番切替前に既存teate1122公開サイトと機能・見た目が見劣りしない状態にする |
| T-017 | teate1122リポジトリのビルド方式移行（Astro→ビルド不要の静的サイト、legacy-astro/退避、builder-previewブランチでの確認） | 高 | 未着手 | developer | D-010参照。T-016完了後に着手 |
| T-018 | 「更新」ボタンによるGitHub直接公開機能（Git Data API・PAT管理・確認シート・進捗表示） | 高 | 未着手 | developer | D-010参照。T-017完了後に着手 |

## バックログ（未着手・優先度未確定）
- T-013 (P2想定・一部T-018へ吸収): 複数ページ管理UI（ページ切替導線）・ギャラリー・アニメーション・ダークモード
- T-014 (P3想定): 複数サイト管理UI・テンプレート7種・SEO/OGP詳細
- T-018のv2候補: 差分ファイルのみアップロード・Netlify Deploy APIでの公開完了確認・差分プレビュー・公開履歴とロールバック（D-010参照）
- 画像アセット（data URL）のコミット肥大化に対する上限警告は未実装（D-010参照、優先度未確定）
- editor/media/zip.jsが全ページ書き出し時にstyle.css/assetsを重複してZIPに書き込む（T-012レビューで発見、非ブロッキング。優先度低）
- progress.mdが将来肥大化した場合、docs/progress-archive.md等への分割を検討する（D-006時点では未実施・優先度未確定）

## メモ

- 新しいタスクを追加したら、必ず優先度と状態を設定すること。
- タスクの状態が変わったら都度このファイルを更新する（作業完了後にまとめて更新しない）。
- 詳細な作業内容や経緯は [progress.md](./progress.md) を参照。
- 設計上の判断が必要になった場合は [decisions.md](./decisions.md) に記録する。
