# DeckLattice

構造化JSONからReveal.jsスライドを生成し、Playwrightで表示検証とPDF出力を行うCLIです。
Pythonやプロジェクトごとのnpm依存は不要です。

## Development Setup

```bash
npm install
npx playwright install chromium
npm run build
npm link
```

## CLI

```bash
decklattice init ./presentation --skills
decklattice validate ./presentation
decklattice build ./presentation
decklattice verify ./presentation
decklattice pdf ./presentation
decklattice screenshot ./presentation --slide 3
```

対象ディレクトリを省略すると現在ディレクトリを使います。`build`以降のコマンドは、
現在位置から親ディレクトリへ`decklattice.config.json`または`deck/slides.json`を探索します。

```bash
cd presentation/deck
decklattice build
```

### init

```bash
decklattice init [directory] [--force] [--skills]
```

`templates/default/`を対象ディレクトリへ展開します。既存ファイルは上書きせず、
明示的に`--force`を指定した場合だけ置き換えます。

`--skills`を指定すると、CLI操作用Agent skillを
`.skills/decklattice/`へ追加します。

```bash
decklattice init ./presentation --skills
```

### validate

```bash
decklattice validate [directory]
```

`slides.json`の型、必須項目、件数制限、重複ID、追加CSS、SVGの安全性を検証します。

### build

```bash
decklattice build [directory]
```

固定バージョンのReveal.js CDNを参照するHTMLを生成し、ページ単位patchを厳密に適用します。

### verify

```bash
decklattice verify [directory]
```

ビルド後、Playwright Chromiumでoverflow、画像ロード、alt、HTTP、JavaScriptエラーを検査します。

### pdf

```bash
decklattice pdf [directory] [--output path/to/slides.pdf]
```

検証成功後にPDFを出力します。既定値は`deck/output/slides.pdf`です。

### screenshot

```bash
decklattice screenshot [directory] --slide <number|id> [--output path/to/slide.png]
```

AIやレビュー担当者がページ単位で確認できるよう、指定したスライドを1280x720のPNGで出力します。
番号は1始まりです。`slides.json`のIDでも指定できます。

```bash
decklattice screenshot --slide 3
decklattice screenshot --slide slide-3
decklattice screenshot --slide slide-3 --output review/slide-3.png
```

出力先省略時は`deck/output/{slide_id}.png`です。

## Generated Project

```text
presentation/
├── decklattice.config.json
└── deck/
    ├── slides.json
    ├── slides.schema.json
    ├── template.html
    ├── styles.css
    ├── additional.css
    └── patches/
```

- 内容は`slides.json`
- 共通レイアウトは`styles.css`
- デッキ固有の装飾は`additional_css`と`additional_classes`
- ページ固有のHTML構造変更は`patches/{slide_id}.patch`

patchは生成された`<section>`へ完全一致で適用され、不一致ならビルドが失敗します。

Reveal.jsは`cdn.jsdelivr.net`から`6.0.1`を固定指定して読み込みます。CLIや生成プロジェクトへ
Reveal.js本体はコピー・バンドルされません。

## Package Contents

npmパッケージに含まれるもの:

- コンパイル済みCLI (`dist/`)
- 初期化用テンプレート、CSS、JSON Schema (`templates/`)
- `--skills`で展開するAgent skill (`.skills/decklattice/`)
- READMEとLICENSE

npm依存としてインストールされるもの:

- Playwright
- XML検証ライブラリ

含まれないもの:

- Reveal.js本体。実行時に固定バージョンCDNから読み込みます。
- Playwright Chromiumバイナリ。`npx playwright install chromium`で別途取得します。
- サンプル画像や完成済みスライドデッキ。

したがって`verify`、`pdf`、`screenshot`はReveal.js CDNへアクセスできるネットワーク環境が必要です。

## Configuration

```json
{
  "deckDir": "deck",
  "output": "deck/index.html",
  "pdfOutput": "deck/output/slides.pdf"
}
```

相対アセット参照を維持するため、`output`は`deckDir`直下のHTMLファイルにしてください。

## Development

```bash
npm run check
npm test
npm pack --dry-run
```

ソースは責務別に分割されています。

- `src/core/`: 検証、レンダリング、patch、ビルド
- `src/browser/`: Playwright検証、PDF、ローカルサーバー
- `src/commands/`: CLIコマンド
- `templates/default/`: `init`用テンプレート
- `test/`: 単体・CLI E2Eテスト
