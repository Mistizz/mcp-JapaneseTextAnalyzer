import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import * as kuromoji from 'kuromoji';

// kuromojiの辞書をロード
let tokenizer: any = null;
function initializeTokenizer(): Promise<void> {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: path.join(__dirname, '../node_modules/kuromoji/dict') }).build((err, _tokenizer) => {
      if (err) {
        reject(err);
        return;
      }
      tokenizer = _tokenizer;
      resolve();
    });
  });
}

// JapaneseTextAnalyzerサーバークラス
class JapaneseTextAnalyzer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'JapaneseTextAnalyzer',
      version: '1.0.0'
    });
  }

  // 形態素解析器の初期化
  async initializeTokenizer() {
    try {
      await initializeTokenizer();
      console.log('形態素解析器が初期化されました。');
    } catch (error) {
      console.error('形態素解析器の初期化に失敗しました:', error);
    }
  }

  // ファイルの文字数を計測する処理
  private countCharsImpl(filePath: string) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // 改行とスペースを除外した文字数
      const contentWithoutSpacesAndNewlines = fileContent.replace(/[\s\n\r]/g, '');
      const effectiveCharCount = contentWithoutSpacesAndNewlines.length;
      
      return {
        content: [{ 
          type: 'text' as const, 
          text: `ファイル '${filePath}' の文字数: ${effectiveCharCount}文字（改行・スペース除外）`
        }]
      };
    } catch (error: any) {
      return {
        content: [{ 
          type: 'text' as const, 
          text: `エラーが発生しました: ${error.message}`
        }],
        isError: true
      };
    }
  }

  // ファイルの単語数を計測する処理
  private countWordsImpl(filePath: string, language: 'en' | 'ja' = 'en') {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      let wordCount = 0;
      let resultText = '';
      
      if (language === 'en') {
        // 英語の場合、単語はスペースで区切られているためsplitで分割
        const words = fileContent.trim().split(/\s+/);
        wordCount = words.length;
        resultText = `ファイル '${filePath}' の単語数: ${wordCount}単語 (英語モード)`;
      } else if (language === 'ja') {
        // 日本語の場合、kuromojiを使用して形態素解析
        if (!tokenizer) {
          return {
            content: [{ 
              type: 'text' as const, 
              text: '形態素解析器が初期化されていません。'
            }],
            isError: true
          };
        }
        
        const tokens = tokenizer.tokenize(fileContent);
        
        // 記号と空白以外のすべての単語をカウント（助詞や助動詞も含める）
        const meaningfulTokens = tokens.filter((token: any) => {
          // 記号と空白のみを除外
          return !(token.pos === '記号' || token.pos === '空白');
        });
        
        wordCount = meaningfulTokens.length;
        
        // 単語の詳細情報を出力
        const tokenDetails = tokens.map((token: any) => {
          return `【${token.surface_form}】 品詞: ${token.pos}, 品詞細分類: ${token.pos_detail_1}, 読み: ${token.reading}`;
        }).join('\n');
        
        resultText = `ファイル '${filePath}' の単語数: ${wordCount}単語 (日本語モード、すべての品詞を含む)\n\n分析結果:\n${tokenDetails}\n\n有効な単語としてカウントしたもの:\n${meaningfulTokens.map((t: any) => t.surface_form).join(', ')}`;
      }
      
      return {
        content: [{ 
          type: 'text' as const, 
          text: resultText
        }]
      };
    } catch (error: any) {
      return {
        content: [{ 
          type: 'text' as const, 
          text: `エラーが発生しました: ${error.message}`
        }],
        isError: true
      };
    }
  }

  // ツールをセットアップ
  setupTools() {
    // ファイルの文字数を計測するツール
    this.server.tool(
      'count-chars', 
      '指定されたファイルの文字数を計測します。スペースや改行を除いた実質的な文字数をカウントします。日本語と英語の両方に対応しています。',
      { filePath: z.string().describe('文字数をカウントするファイルのパス') },
      async ({ filePath }) => this.countCharsImpl(filePath)
    );

    // ファイルの単語数を計測するツール
    this.server.tool(
      'count-words', 
      '指定されたファイルの単語数を計測します。英語ではスペースで区切られた単語をカウントし、日本語では形態素解析を使用して単語をカウントします。日本語モードでは記号や空白を除外した有意な単語のみをカウントします。',
      { 
        filePath: z.string().describe('単語数をカウントするファイルのパス'),
        language: z.enum(['en', 'ja']).default('en').describe('ファイルの言語 (en: 英語, ja: 日本語)')
      },
      async ({ filePath, language }) => this.countWordsImpl(filePath, language)
    );
  }

  // サーバーを起動
  async start() {
    // ツールを設定
    this.setupTools();

    // サーバーを接続
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log('MCPサーバーが起動しました！標準入出力でリッスン中...');
  }
}

// メイン関数
async function main() {
  const server = new JapaneseTextAnalyzer();
  
  // 形態素解析器を初期化
  await server.initializeTokenizer();
  
  // サーバーを起動
  await server.start();
}

main().catch(error => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}); 