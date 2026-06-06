# DeckLattice

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

構造化 JSON から Reveal.js スライドを生成し、Playwright で表示検証・PDF 出力を行う CLI です。
Python やプロジェクトごとの npm 依存は不要です。

## インストール

GitHub リポジトリから直接インストールするか、ローカルにクローンしてビルドします。

### GitHub から直接インストールする場合

```bash
npm install -g git+https://github.com/daichi-629/DeckLattice.git
npx playwright install chromium
```

### ローカルにクローンしてインストールする場合（開発者向け）

```bash
git clone https://github.com/daichi-629/DeckLattice.git
cd DeckLattice
npm install
npm run build
npm link

# Playwright のブラウザをインストール
npx playwright install chromium
```

## クイックスタート

```bash
# 1. 新しいスライドプロジェクトを作成
decklattice init ./my-slides

# 2. slides.json を編集してスライドを作る
cd my-slides

# 3. HTML をビルド
decklattice build

# 4. 表示を検証
decklattice verify

# 5. PDF を出力
decklattice pdf
```

## コマンド一覧

| コマンド | 説明 |
|---|---|
| `init [dir]` | テンプレートを展開して新プロジェクトを作成 |
| `validate [dir]` | `slides.json` の型・安全性を検証 |
| `build [dir]` | Reveal.js HTML を生成 |
| `verify [dir]` | Playwright でレンダリングを検査 |
| `pdf [dir]` | PDF を出力 |
| `screenshot [dir] --slide <n>` | 指定スライドを PNG で出力 |

詳細は [docs/cli-reference.md](docs/cli-reference.md) を参照してください。

## ドキュメント

- [CLI リファレンス](docs/cli-reference.md) — 全コマンドのオプション
- [生成プロジェクトの構造](docs/project-structure.md) — ファイル構成と patch の仕組み
- [設定ファイル](docs/configuration.md) — `decklattice.config.json` のオプション
- [開発者ガイド](docs/development.md) — ビルド手順・ソース構成

## ライセンス

[MIT](LICENSE)
