# PRに画像を添付する

PRの説明欄やコメントにサンプル画像(生成されたダイアグラムのスクリーンショット等)を載せる際の手順。

## gh CLIでの画像アップロード

`gh` CLI 2.101.0 以降は `--attach` フラグで PR/issue の説明欄・コメントに画像や動画を直接アップロードできる([GitHub CLI changelog, 2026-09-01](https://github.blog/changelog/2026-09-01-github-cli-media-in-issues-pull-requests-and-comments/))。

```bash
# 本文を書き換えつつ画像を添付する。本文中に `![alt](./sample.png)` という
# 参照を書いておくと、その参照がアップロード後のアセットURLに自動で書き換わる。
gh pr edit <PR番号> --body-file <本文ファイル> --attach <画像パス>#<altテキスト>

# 本文を変更せず、既存の説明欄の末尾に画像を追記するだけならbody指定は不要。
gh pr edit <PR番号> --attach <画像パス>#<altテキスト>

# コメントとして画像を添付する場合
gh pr comment <PR番号> --attach <画像パス>#<altテキスト>
```

- alt テキストは `<path>#<alt text>` の形式でパスの後に `#` 区切りで指定する。省略するとファイル名がそのまま使われる。
- 1回のコマンドで最大50ファイルまで添付可能。
- 本文中の画像参照(`![alt](./sample.png)`)と`--attach`のファイル名が一致していれば、その参照がアップロード後のURLに書き換わる。一致しない添付ファイルは本文の末尾に追加される。

## blockdiag-ng(このリポジトリ自身)でPNGサンプルを生成する

このリポジトリは実装途上のため、CLIやSVG→PNG変換パイプラインがまだ存在しない段階がある。その間にPRのサンプル画像を作る場合は以下の手順を使う。

### 1. SVGを生成する

CLIが無い段階では、`renderDiagramToSvg()` を直接呼び出す一時的なvitestテストファイルを書いて実行するのが確実(型解決の都合上、素の`node`スクリプトではソースの`.js`拡張子importが解決できない)。

```ts
// 例: src/render/__sample_render.test.ts (作業後に削除する。コミットしない)
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "vitest";
import { buildDiagram } from "../builder/tree-builder.js";
import { layoutDiagram } from "../layout/group-layout.js";
import { parseString } from "../parser/parser.js";
import { renderDiagramToSvg } from "./draw-diagram.js";
import { loadFont } from "./font-metrics.js";

const VL_GOTHIC_PATH = join(import.meta.dirname, "../../vendor/vlgothic/VL-Gothic-Regular.ttf");

describe("sample render (scratch)", () => {
  it("writes a sample diagram", () => {
    const diagram = buildDiagram(parseString(`diagram { A -> B; }`));
    layoutDiagram(diagram);
    const svg = renderDiagramToSvg(diagram, { font: loadFont(VL_GOTHIC_PATH) });
    writeFileSync(join(process.env.TMPDIR ?? "/tmp", "sample.svg"), svg);
  });
});
```

```bash
npx vitest run src/render/__sample_render.test.ts
```

CLIが実装済みなら、単に `blockdiag -T svg -o out.svg in.diag` のようにCLI経由で生成すればよい。

### 2. SVGをPNGに変換する

サンドボックス環境によっては以下が使えないことがある(このリポジトリでの作業中に実際に遭遇した失敗例):

- **ImageMagick(`magick`)**: SVGのラスタライズを外部コマンド`rsvg-convert`へのdelegateに依存しており、`rsvg-convert`(librsvg)が未インストールだと `unable to read font` のようなエラーで失敗する。`brew install librsvg`はネットワークアクセスが必要で毎回は使えない。
- **Playwright(ヘッドレスChromium)**: サンドボックスのMach port rendezvous制約(`bootstrap_check_in ... Permission denied`)によりブラウザプロセスを起動できない。

代わりに **`sharp`**(libvips ベース)が動作する。ローカルの他プロジェクトの `node_modules` に `sharp` がキャッシュされていれば、`NODE_PATH` で指定してそのまま `require` できる(自分のプロジェクトに依存追加する必要はない)。

```bash
# 事前に他プロジェクトの node_modules/sharp のパスを探しておく
# 例: find /Users/tkomiya/work -maxdepth 3 -iname sharp | grep node_modules

NODE_PATH=<sharpが存在するnode_modulesのパス> node -e "
const sharp = require('sharp');
const fs = require('fs');
const svg = fs.readFileSync('$TMPDIR/sample.svg');
sharp(svg, { density: 288 })
  .flatten({ background: '#ffffff' })
  .png()
  .toFile('$TMPDIR/sample.png')
  .then(info => console.log('done', info))
  .catch(err => { console.error(err); process.exit(1); });
"
```

`density`(SVGのラスタライズ解像度、DPI相当)は288程度にすると、GitHub上での表示時も十分な解像度になる。`flatten({ background: '#ffffff' })` はSVG側に背景色が無い場合に白背景を敷くため。

### 3. 後片付け

一時テストファイル(`__sample_render.test.ts`等)は生成後に削除し、コミットに含めない。
