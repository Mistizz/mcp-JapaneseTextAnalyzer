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
npx -y github:Mistizz/mcp-JapaneseTextAnalyzer
```

### Claude for Desktopでの使用

Claude for Desktopの設定ファイル`claude_desktop_config.json`に以下を追加してください:

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

### チャットにファイル（.txt, .mdなど）をアップロードして、テキストの文字数を数える
```
このテキストの文字数を数えてください。
```

### ファイルパスを指定して、ファイルの単語数を日本語モードで数える
```
C:\path\to\your\file.txt の単語数を日本語モードで数えてください。
```

### テキストを貼り付けて日本語の単語数を数える
```
次のテキストの日本語の単語数を数えてください：

吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。
```

## 内部動作について

このツールは、日本語の単語数カウントに「kuromoji.js」という形態素解析ライブラリを使用しています。形態素解析は自然言語処理の基本的な処理で、文章を意味を持つ最小単位（形態素）に分割します。

形態素解析の処理は初期化に時間がかかることがあります。特に、辞書データを読み込む必要があるため、初回実行時に少々時間がかかる場合があります。サーバー起動時に形態素解析器の初期化を行うことで、ツール実行時の遅延を最小限に抑えています。

## ライセンス

このMCPサーバーはMITライセンスの下で提供されています。これは、MITライセンスの条件に従って、ソフトウェアを自由に使用、変更、配布できることを意味します。詳細については、プロジェクトリポジトリのLICENSEファイルをご覧ください。 