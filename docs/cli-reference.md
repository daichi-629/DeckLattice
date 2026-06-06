# CLI リファレンス

## 共通ルール

対象ディレクトリを省略すると現在ディレクトリを使います。`build` 以降のコマンドは、
現在位置から親ディレクトリへ `decklattice.config.json` または `deck/slides.json` を探索します。

```bash
cd presentation/deck
decklattice build
```

---

## init

```bash
decklattice init [directory] [--force] [--skills]
```

`templates/default/` を対象ディレクトリへ展開します。既存ファイルは上書きせず、
明示的に `--force` を指定した場合だけ置き換えます。

`--skills` を指定すると、CLI 操作用 Agent skill を `.skills/decklattice/` へ追加します。

```bash
decklattice init ./presentation --skills
```

## validate

```bash
decklattice validate [directory]
```

`slides.json` の型、必須項目、件数制限、重複 ID、追加 CSS、SVG の安全性を検証します。

## build

```bash
decklattice build [directory]
```

固定バージョンの Reveal.js CDN を参照する HTML を生成し、ページ単位 patch を厳密に適用します。

## verify

```bash
decklattice verify [directory]
```

ビルド後、Playwright Chromium で overflow、画像ロード、alt、HTTP、JavaScript エラーを検査します。

## pdf

```bash
decklattice pdf [directory] [--output path/to/slides.pdf]
```

検証成功後に PDF を出力します。既定値は `deck/output/slides.pdf` です。

## screenshot

```bash
decklattice screenshot [directory] --slide <number|id> [--output path/to/slide.png]
```

指定したスライドを 1280×720 の PNG で出力します。番号は 1 始まりです。`slides.json` の ID でも指定できます。

```bash
decklattice screenshot --slide 3
decklattice screenshot --slide slide-3
decklattice screenshot --slide slide-3 --output review/slide-3.png
```

出力先省略時は `deck/output/{slide_id}.png` です。

## html-before

```bash
decklattice html-before [directory] --slide <number|id>
```

指定したスライドの、パッチ適用前のHTML構造を標準出力に表示します。番号は 1 始まりです。`slides.json` の ID でも指定できます。パッチを作成する際のベースHTMLを取得するのに便利です。

```bash
decklattice html-before --slide 2
decklattice html-before --slide result
```

## html-after

```bash
decklattice html-after [directory] --slide <number|id>
```

指定したスライドの、パッチ適用後のHTML構造を標準出力に表示します。番号は 1 始まりです。`slides.json` の ID でも指定できます。パッチが正しく適用されているか確認するのに便利です。

```bash
decklattice html-after --slide 2
decklattice html-after --slide result
```

