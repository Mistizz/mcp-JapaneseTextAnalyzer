# Japanese Text Analyzer MCP Server
テキストの文字数と単語数を日本語と英語の両方でカウントするためのMCPサーバー実装です。

<a href="https://glama.ai/mcp/servers/@Mistizz/mcp-JapaneseTextAnalyzer">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@Mistizz/mcp-JapaneseTextAnalyzer/badge" alt="Japanese Text Analyzer MCP server" />
</a>

## 機能

- 日本語と英語のテキストの文字数をカウント
- スペースや改行を除いた実質的な文字数をカウント
- 形態素解析を用いた日本語の単語数カウント
- スペースで区切られた英語の単語数カウント
- ファイルパスまたは直接テキスト入力の両方に対応
- 柔軟なファイルパス解決（絶対パス・相対パス・ファイル名のみでも検索可能）

## ツール

現在、以下のツールが実装されています：

### count-chars

ファイルの文字数を計測します。絶対パスを指定してください（Windows形式 C:\Users\...、またはWSL/Linux形式 /c/Users/... のどちらも可）。スペースや改行を除いた実質的な文字数をカウントします。

**入力:**
- `filePath` (string): 文字数をカウントするファイルのパス（Windows形式かWSL/Linux形式の絶対パスを推奨）

**出力:**
- ファイルの文字数（スペースや改行を除外した実質的な文字数）

### count-words

ファイルの単語数を計測します。絶対パスを指定してください（Windows形式 C:\Users\...、またはWSL/Linux形式 /c/Users/... のどちらも可）。英語ではスペースで区切られた単語をカウントし、日本語では形態素解析を使用します。

**入力:**
- `filePath` (string): 単語数をカウントするファイルのパス（Windows形式かWSL/Linux形式の絶対パスを推奨）
- `language` (string, オプション, デフォルト: "en"): ファイルの言語 (en: 英語, ja: 日本語)

**出力:**
- ファイルの単語数
- 日本語モードの場合は、形態素解析の詳細結果も表示

### count-clipboard-chars

テキストの文字数を計測します。スペースや改行を除いた実質的な文字数をカウントします。

**入力:**
- `text` (string): 文字数をカウントするテキスト

**出力:**
- テキストの文字数（スペースや改行を除外した実質的な文字数）

### count-clipboard-words

テキストの単語数を計測します。英語ではスペースで区切られた単語をカウントし、日本語では形態素解析を使用します。

**入力:**
- `text` (string): 単語数をカウントするテキスト
- `language` (string, オプション, デフォルト: "en"): テキストの言語 (en: 英語, ja: 日本語)

**出力:**
- テキストの単語数
- 日本語モードの場合は、形態素解析の詳細結果も表示

## 使用方法

### npxでの実行

このパッケージはnpxでGitHubリポジトリから直接実行できます：

```bash
npx -y github:Mistizz/mcp-JapaneseTextAnalyzer
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
    "JapaneseTextAnalyzer": {
      "command": "npx",
      "args": [
        "-y",
        "github:Mistizz/mcp-JapaneseTextAnalyzer"
      ]
    }
  }
}
```

### Cursorでの使用

Cursorでも同様の設定を`.cursor`フォルダ内の`mcp.json`ファイルに追加します。

**Windows:**
`%USERPROFILE%\.cursor\mcp.json`

**macOS/Linux:**
`~/.cursor/mcp.json`

一般的な設定(殆どの環境で動作):
```json
{
  "mcpServers": {
    "JapaneseTextAnalyzer": {
      "command": "npx",
      "args": [
        "-y",
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
        "-y",
        "github:Mistizz/mcp-JapaneseTextAnalyzer"
      ]
    }
  }
}
```

## 使用例

### 直接テキストの文字数を数える
```
このテキストの文字数を数えてください。
```

### ファイルの単語数を日本語モードで数える
```
C:\path\to\your\file.txt の単語数を日本語モードで数えてください。
```

### WSL/Linux形式のパスで単語数を数える
```
/c/Users/username/Documents/file.txt の単語数を日本語モードで数えてください。
```

### ファイル名だけで単語数を数える
```
README.md の単語数を英語モードで数えてください。
```

### テキストを貼り付けて日本語の単語数を数える
```
次のテキストの日本語の単語数を数えてください：

吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。
```

## ファイルパス解決機能

このツールは、ファイルパスが指定された場合に柔軟にファイルを探索します：

1. 絶対パスが指定された場合はそのまま使用
   - Windows形式の絶対パス（例: `C:\Users\username\Documents\file.txt`）
   - WSL/Linux形式の絶対パス（例: `/c/Users/username/Documents/file.txt`）のどちらも自動的に検出・変換
2. カレントディレクトリ（作業ディレクトリ）を基準に相対パスを解決
3. ホームディレクトリ（`%USERPROFILE%`や`$HOME`）を基準に検索
4. デスクトップディレクトリを基準に検索
5. ドキュメントディレクトリを基準に検索

これにより、単に「README.md」のようなファイル名だけを指定しても、いくつかの一般的なディレクトリで自動的に検索し、ファイルが見つかった場合はそれを使用します。また、WSL環境やGit Bashなどから取得したパス（`/c/Users/...`形式）も、Windows環境でそのまま使用できます。

## 内部動作について

このツールは、日本語の単語数カウントに「kuromoji.js」という形態素解析ライブラリを使用しています。形態素解析は自然言語処理の基本的な処理で、文章を意味を持つ最小単位（形態素）に分割します。

形態素解析の処理は初期化に時間がかかることがあります。特に、辞書データを読み込む必要があるため、初回実行時に少々時間がかかる場合があります。サーバー起動時に形態素解析器の初期化を行うことで、ツール実行時の遅延を最小限に抑えています。

## ライセンス

このMCPサーバーはMITライセンスの下で提供されています。これは、MITライセンスの条件に従って、ソフトウェアを自由に使用、変更、配布できることを意味します。詳細については、プロジェクトリポジトリのLICENSEファイルをご覧ください。