# Japanese Text Analyzer MCP Server
テキストの文字数と単語数を日本語と英語の両方でカウントするためのMCPサーバー実装です。

## 機能

- 日本語と英語のテキストの文字数をカウント
- スペースや改行を除いた実質的な文字数をカウント
- 形態素解析を用いた日本語の単語数カウント
- スペースで区切られた英語の単語数カウント

## ツール

### count_chars

指定されたファイルの文字数をカウントします。

**入力:**
- `filePath` (string): 文字数をカウントするファイルのパス

### count_words

指定されたファイルの単語数をカウントします。

**入力:**
- `filePath` (string): 単語数をカウントするファイルのパス
- `language` (string, オプション): ファイルの言語 (en: 英語, ja: 日本語)

## 使用方法

Japanese Text Analyzerツールは以下のような用途に適しています:
- 日本語文書の文字数制限の確認
- 英語と日本語の混在したテキストの分析
- 翻訳前後の文書量の比較
- 記事や論文の文字数・単語数の測定

## 設定

### Claude Desktopでの使用

`claude_desktop_config.json`に以下を追加してください:

#### npx

```json
{
  "mcpServers": {
    "japanese-text-analyzer": {
      "command": "npx",
      "args": [
        "-y",
        "@Mistizz/japanese-text-analyzer"
      ]
    }
  }
}
```


## ライセンス

このMCPサーバーはMITライセンスの下で提供されています。これは、MITライセンスの条件に従って、ソフトウェアを自由に使用、変更、配布できることを意味します。詳細については、プロジェクトリポジトリのLICENSEファイルをご覧ください。 