# Slide Project

このディレクトリはDeckLatticeの`decklattice` CLIで管理します。

`decklattice init --skills`で初期化した場合、Agent向け操作手順は
`.skills/decklattice/SKILL.md`にあります。

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

生成HTMLは直接編集しないでください。Reveal.jsは固定バージョンのCDNから読み込みます。

初期デッキはタイトルと概要だけの最小テンプレートです。内容を置き換え、必要なスライドを
`deck/slides.json`へ追加してください。
