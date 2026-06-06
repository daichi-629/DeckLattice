# 開発者ガイド

## セットアップ

```bash
npm install
npx playwright install chromium
npm run build
npm link
```

## 開発コマンド

```bash
npm run check   # 型チェック
npm test        # テスト実行
npm pack --dry-run  # パッケージ内容確認
```

## ソース構成

```text
src/
├── core/        # 検証、レンダリング、patch、ビルド
├── browser/     # Playwright 検証、PDF、ローカルサーバー
└── commands/    # CLI コマンド
templates/
└── default/     # init 用テンプレート
test/            # 単体・CLI E2E テスト
```

## パッケージ内容

npm パッケージに含まれるもの:

- コンパイル済み CLI (`dist/`)
- 初期化用テンプレート、CSS、JSON Schema (`templates/`)
- `--skills` で展開する Agent skill (`.skills/decklattice/`)
- README と LICENSE

npm 依存としてインストールされるもの:

- Playwright
- XML 検証ライブラリ

含まれないもの:

- Reveal.js 本体（実行時に固定バージョン CDN から読み込みます）
- Playwright Chromium バイナリ（`npx playwright install chromium` で別途取得）
- サンプル画像や完成済みスライドデッキ
