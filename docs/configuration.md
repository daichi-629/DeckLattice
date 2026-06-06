# 設定ファイル

`decklattice.config.json` でプロジェクトのパスをカスタマイズできます。

```json
{
  "deckDir": "deck",
  "output": "deck/index.html",
  "pdfOutput": "deck/output/slides.pdf"
}
```

| キー | 既定値 | 説明 |
|---|---|---|
| `deckDir` | `"deck"` | スライドファイルが置かれるディレクトリ |
| `output` | `"deck/index.html"` | ビルド後の HTML 出力先 |
| `pdfOutput` | `"deck/output/slides.pdf"` | PDF 出力先 |

相対アセット参照を維持するため、`output` は `deckDir` 直下の HTML ファイルにしてください。
