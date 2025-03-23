# Japanese Text Analyzer MCP Server
テキストの文字数と単語数を日本語と英語の両方でカウントするためのMCPサーバー実装です。

## 機能

- 日本語と英語のテキストの文字数をカウント
- スペースや改行を除いた実質的な文字数をカウント
- 形態素解析を用いた日本語の単語数カウント
- スペースで区切られた英語の単語数カウント
- ファイルパスまたは直接テキスト入力の両方に対応

## ツール

### count-text-chars

テキストの文字数を計測します。ファイルパスまたは直接テキストを指定できます。

**入力:**
- `input` (string): 文字数をカウントするテキスト、またはファイルパス
- `isFilePath` (boolean, オプション, デフォルト: false): 入力がファイルパスかどうか (true: ファイルパス, false: 直接テキスト)

### count-text-words

テキストの単語数を計測します。ファイルパスまたは直接テキストを指定できます。

**入力:**
- `input` (string): 単語数をカウントするテキスト、またはファイルパス
- `language` (string, オプション, デフォルト: "en"): テキストの言語 (en: 英語, ja: 日本語)
- `isFilePath` (boolean, オプション, デフォルト: false): 入力がファイルパスかどうか (true: ファイルパス, false: 直接テキスト)

### 非推奨のツール（後方互換性のために維持）

以下のツールは後方互換性のために維持されていますが、新しいツールの使用を推奨します。

- `count-chars`: ファイルの文字数を計測（代わりに `count-text-chars` を使用）
- `count-words`: ファイルの単語数を計測（代わりに `count-text-words` を使用）
- `count-clipboard-chars`: クリップボードテキストの文字数を計測（代わりに `count-text-chars` を使用）
- `count-clipboard-words`: クリップボードテキストの単語数を計測（代わりに `count-text-words` を使用）

## 使用方法

### npxでの実行

このパッケージはnpxでGitHubリポジトリから直接実行できます：

```bash
npx github:Mistizz/mcp-JapaneseTextAnalyzer
```

### Claude for Desktopでの使用

Claude for Desktopの設定ファイルに以下を追加してください:

**Windows:**
`%AppData%\Claude\claude_desktop_config.json`

**macOS:**
`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "japanese-text-analyzer": {
      "command": "npx",
      "args": [
        "github:Mistizz/mcp-JapaneseTextAnalyzer"
      ]
    }
  }
}
```

Windows環境において、上記で動作しなかった場合、下記を試してみてください：

```json
{
  "mcpServers": {
    "JapaneseTextAnalyzer": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "github:Mistizz/mcp-JapaneseTextAnalyzer"
      ]
    }
  }
}
```

### Cursorでの使用

同様の設定をCursorでも使用できます。

## 使用例

### 直接テキストの文字数を数える
```
このテキストの文字数を数えてください。
```

### ファイルの単語数を日本語モードで数える
```
C:\path\to\your\file.txt の単語数を日本語モードで数えてください。
```

### クリップボードテキストの英語単語数を数える
```
次のテキストの英語の単語数を数えてください：
This is a sample text that I want to count words for.
```

Japanese Text Analyzerツールは以下のような用途に適しています:
- 日本語文書の文字数の確認
- 記事や論文の文字数・単語数の測定
- テキスト入力フォームの文字数制限の確認
- 翻訳前後のテキスト量の比較

## ライセンス

このMCPサーバーはMITライセンスの下で提供されています。これは、MITライセンスの条件に従って、ソフトウェアを自由に使用、変更、配布できることを意味します。詳細については、プロジェクトリポジトリのLICENSEファイルをご覧ください。 