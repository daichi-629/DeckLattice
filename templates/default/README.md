# Slide Project

このディレクトリはDeckLatticeの`decklattice` CLIで管理します。

`decklattice init --skills`で初期化した場合、Agent向け操作手順は
`.skills/decklattice/SKILL.md`にあります。
CLI更新後は`decklattice skill update`でskillを同梱最新版へ更新できます。

```bash
decklattice validate
decklattice build
decklattice verify
decklattice pdf
decklattice screenshot --slide 3
```

- 内容: `deck/slides.json`
- デッキ固有CSS: `deck/additional.css`
- ページ固有HTML構造: `deck/patches/{slide_id}.patch`
- 生成HTML: `deck/index.html`
- PDF: `deck/output/slides.pdf`

生成HTMLは直接編集しないでください。標準HTMLと標準CSSはCLIに内蔵され、
ビルド時に最新版が使われます。内容は次のコマンドで確認できます。

```bash
decklattice template html
decklattice template css
```

Reveal.jsは固定バージョンのCDNから読み込みます。
Chart.jsも固定バージョンで読み込まれ、`chart`スライドの`chart_config`に
Chart.jsの設定オブジェクトを記述できます。グラフには`chart_alt`も指定してください。
Mermaidも固定バージョンで読み込まれ、`mermaid`スライドの`diagram`に記法を記述できます。
MathJaxも固定バージョンで読み込まれ、全スライドで`\( ... \)`と`\[ ... \]`を利用できます。
数式を主役にする場合は`math`スライドの`equation`を使います。JSON内のバックスラッシュは
`"\\[ E = mc^2 \\]"`のように二重化してください。

`deck_title`が長い場合は、フッター用に`short_title`を指定できます。章スライドは
`section_label`を省略すると`SECTION 01`から自動採番されます。スライド単位の背景変更には
`additional_classes`で`tone-soft`または`tone-dark`を指定します。

初期デッキはタイトルと概要だけの最小テンプレートです。内容を置き換え、必要なスライドを
`deck/slides.json`へ追加してください。
