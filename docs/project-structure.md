# 生成プロジェクトの構造

`decklattice init` で作成されるディレクトリ構成です。

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

| ファイル | 役割 |
|---|---|
| `slides.json` | スライドの内容定義 |
| `styles.css` | 共通レイアウト |
| `additional.css` | デッキ固有の装飾（`additional_css` / `additional_classes` で参照） |
| `patches/{slide_id}.patch` | ページ固有の HTML 構造変更 |

## patch の適用ルール

patch は生成された `<section>` へ完全一致で適用されます。不一致の場合はビルドが失敗します。

## Reveal.js の読み込み

Reveal.js は `cdn.jsdelivr.net` から `6.0.1` を固定指定して読み込みます。
CLI や生成プロジェクトへ Reveal.js 本体はコピー・バンドルされません。

`verify`、`pdf`、`screenshot` は Reveal.js CDN へアクセスできるネットワーク環境が必要です。
