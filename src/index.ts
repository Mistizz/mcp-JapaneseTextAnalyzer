#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { z } from 'zod';

// ESモジュールでrequireを使用するための設定
const require = createRequire(import.meta.url);
const kuromoji = require('kuromoji');

// ESモジュールで__dirnameの代わりに使用
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初期化状態を管理するための変数
let tokenizerInstance = null;
let initializationPromise = null;
let initializationError = null;

// 辞書パスを明示的に指定するための関数
function getDictionaryPath() {
  try {
    // kuromojiモジュールのパスを取得
    const kuromojiPath = path.dirname(require.resolve('kuromoji'));
    // 辞書パスを構築
    const dicPath = path.join(kuromojiPath, 'dict');
    console.error(`辞書パス: ${dicPath}`);
    return dicPath;
  } catch (error) {
    console.error(`辞書パスの解決に失敗しました: ${error.message}`);
    // フォールバックとして相対パスを返す
    return path.resolve(path.join('node_modules', 'kuromoji', 'dict'));
  }
}

// 形態素解析器の初期化関数
function initializeTokenizer() {
  // すでに初期化が進行中の場合は、そのPromiseを返す
  if (initializationPromise) {
    return initializationPromise;
  }

  // 初期化済みの場合は、そのインスタンスを返す
  if (tokenizerInstance) {
    return Promise.resolve(tokenizerInstance);
  }

  console.error('形態素解析器の初期化を開始します...');
  
  // 初期化処理を行い、Promiseを保存
  initializationPromise = new Promise((resolve, reject) => {
    const dicPath = getDictionaryPath();
    kuromoji.builder({ dicPath: dicPath }).build((err, tokenizer) => {
      if (err) {
        console.error(`形態素解析器の初期化エラー: ${err}`);
        initializationError = err;
        reject(err);
        return;
      }
      
      console.error('形態素解析器の初期化が完了しました');
      tokenizerInstance = tokenizer;
      resolve(tokenizer);
    });
  });

  return initializationPromise;
}

// 形態素解析器の初期化状態を確認し、必要に応じて初期化する関数
async function ensureTokenizerInitialized() {
  try {
    // 初期化済みの場合はそのインスタンスを返す
    if (tokenizerInstance) {
      return tokenizerInstance;
    }
    
    // 初期化が進行中または未初期化の場合は初期化する
    const tokenizer = await initializeTokenizer();
    return tokenizer;
  } catch (error) {
    console.error(`形態素解析器の初期化中にエラーが発生しました: ${error}`);
    throw new Error('形態素解析器の初期化に失敗しました。しばらく待ってから再試行してください。');
  }
}

// JapaneseTextAnalyzerサーバークラス
class JapaneseTextAnalyzer {
  private server: McpServer;
  private tokenizerReady: boolean = false;

  constructor() {
    this.server = new McpServer({
      name: 'JapaneseTextAnalyzer',
      version: '1.0.0'
    });
  }

  // 形態素解析器のセットアップ
  async setupMorphologicalAnalyzer() {
    try {
      await initializeTokenizer();
      this.tokenizerReady = tokenizerInstance !== null;
      return this.tokenizerReady;
    } catch (error) {
      console.error('形態素解析器のセットアップに失敗しました:', error);
      this.tokenizerReady = false;
      return false;
    }
  }

  // テキストの文字数を計測する処理
  private countTextCharsImpl(text: string, sourceName: string = 'テキスト') {
    try {
      // 改行とスペースを除外した文字数
      const contentWithoutSpacesAndNewlines = text.replace(/[\s\n\r]/g, '');
      const effectiveCharCount = contentWithoutSpacesAndNewlines.length;
      
      return {
        content: [{ 
          type: 'text' as const, 
          text: `${sourceName}の文字数: ${effectiveCharCount}文字（改行・スペース除外）`
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

  // テキストの単語数を計測する処理
  private async countTextWordsImpl(text: string, language: 'en' | 'ja' = 'en', sourceName: string = 'テキスト') {
    try {
      let wordCount = 0;
      let resultText = '';
      
      if (language === 'en') {
        // 英語の場合、単語はスペースで区切られているためsplitで分割
        const words = text.trim().split(/\s+/);
        wordCount = words.length;
        resultText = `${sourceName}の単語数: ${wordCount}単語 (英語モード)`;
      } else if (language === 'ja') {
        // 日本語の場合、kuromojiを使用して形態素解析
        // 形態素解析器が利用可能かを確認
        if (!this.tokenizerReady) {
          await this.setupMorphologicalAnalyzer();
        }
        
        // 形態素解析器が初期化されているか最終確認
        if (!tokenizerInstance) {
          return {
            content: [{ 
              type: 'text' as const, 
              text: '形態素解析器の初期化に失敗しました。しばらく待ってから再試行してください。'
            }],
            isError: true
          };
        }
        
        // 形態素解析を実行
        const tokens = tokenizerInstance.tokenize(text);
        
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
        
        resultText = `${sourceName}の単語数: ${wordCount}単語 (日本語モード、すべての品詞を含む)\n\n分析結果:\n${tokenDetails}\n\n有効な単語としてカウントしたもの:\n${meaningfulTokens.map((t: any) => t.surface_form).join(', ')}`;
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
    // テキストの文字数を計測するツール（ファイルパスまたは直接テキスト入力に対応）
    this.server.tool(
      'count-text-chars', 
      'テキストの文字数を計測します。ファイルパスまたは直接テキストを指定できます。スペースや改行を除いた実質的な文字数をカウントします。日本語と英語の両方に対応しています。',
      { 
        input: z.string().describe('文字数をカウントするテキスト、またはファイルパス'),
        isFilePath: z.boolean().default(false).describe('入力がファイルパスかどうか (true: ファイルパス, false: 直接テキスト)')
      },
      async ({ input, isFilePath }) => {
        if (isFilePath) {
          try {
            const fileContent = fs.readFileSync(input, 'utf8');
            return this.countTextCharsImpl(fileContent, `ファイル '${input}'`);
          } catch (error: any) {
            return {
              content: [{ 
                type: 'text' as const, 
                text: `ファイル読み込みエラー: ${error.message}`
              }],
              isError: true
            };
          }
        } else {
          return this.countTextCharsImpl(input);
        }
      }
    );

    // テキストの単語数を計測するツール（ファイルパスまたは直接テキスト入力に対応）
    this.server.tool(
      'count-text-words', 
      'テキストの単語数を計測します。ファイルパスまたは直接テキストを指定できます。英語ではスペースで区切られた単語をカウントし、日本語では形態素解析を使用して単語をカウントします。日本語モードでは記号や空白を除外した有意な単語のみをカウントします。',
      { 
        input: z.string().describe('単語数をカウントするテキスト、またはファイルパス'),
        language: z.enum(['en', 'ja']).default('en').describe('テキストの言語 (en: 英語, ja: 日本語)'),
        isFilePath: z.boolean().default(false).describe('入力がファイルパスかどうか (true: ファイルパス, false: 直接テキスト)')
      },
      async ({ input, language, isFilePath }) => {
        if (isFilePath) {
          try {
            const fileContent = fs.readFileSync(input, 'utf8');
            return await this.countTextWordsImpl(fileContent, language, `ファイル '${input}'`);
          } catch (error: any) {
            return {
              content: [{ 
                type: 'text' as const, 
                text: `ファイル読み込みエラー: ${error.message}`
              }],
              isError: true
            };
          }
        } else {
          return await this.countTextWordsImpl(input, language);
        }
      }
    );

    // 後方互換性のために古いツール名も残す（非推奨）
    this.server.tool(
      'count-chars', 
      '【非推奨】指定されたファイルの文字数を計測します。代わりに count-text-chars を使用してください。',
      { filePath: z.string().describe('文字数をカウントするファイルのパス') },
      async ({ filePath }) => {
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          return this.countTextCharsImpl(fileContent, `ファイル '${filePath}'`);
        } catch (error: any) {
          return {
            content: [{ 
              type: 'text' as const, 
              text: `ファイル読み込みエラー: ${error.message}\n\n代わりに count-text-chars ツールを使用することをお勧めします。`
            }],
            isError: true
          };
        }
      }
    );

    this.server.tool(
      'count-words', 
      '【非推奨】指定されたファイルの単語数を計測します。代わりに count-text-words を使用してください。',
      { 
        filePath: z.string().describe('単語数をカウントするファイルのパス'),
        language: z.enum(['en', 'ja']).default('en').describe('ファイルの言語 (en: 英語, ja: 日本語)')
      },
      async ({ filePath, language }) => {
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          return await this.countTextWordsImpl(fileContent, language, `ファイル '${filePath}'`);
        } catch (error: any) {
          return {
            content: [{ 
              type: 'text' as const, 
              text: `ファイル読み込みエラー: ${error.message}\n\n代わりに count-text-words ツールを使用することをお勧めします。`
            }],
            isError: true
          };
        }
      }
    );

    this.server.tool(
      'count-clipboard-chars', 
      '【非推奨】クリップボードからのテキストの文字数を計測します。代わりに count-text-chars を使用してください。',
      { text: z.string().describe('文字数をカウントするテキスト') },
      async ({ text }) => this.countTextCharsImpl(text, 'クリップボードのテキスト')
    );

    this.server.tool(
      'count-clipboard-words', 
      '【非推奨】クリップボードからのテキストの単語数を計測します。代わりに count-text-words を使用してください。',
      { 
        text: z.string().describe('単語数をカウントするテキスト'),
        language: z.enum(['en', 'ja']).default('en').describe('テキストの言語 (en: 英語, ja: 日本語)')
      },
      async ({ text, language }) => await this.countTextWordsImpl(text, language, 'クリップボードのテキスト')
    );
  }

  // サーバーを起動
  async start() {
    // 形態素解析器を初期化
    const initSuccess = await this.setupMorphologicalAnalyzer();
    if (initSuccess) {
      console.log('形態素解析器の初期化が完了しました。ツールのセットアップを行います。');
    } else {
      console.warn('形態素解析器の初期化に問題がありましたが、セットアップを続行します。');
    }
    
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
  
  // サーバーを起動（内部で形態素解析器も初期化）
  await server.start();
}

main().catch(error => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}); 