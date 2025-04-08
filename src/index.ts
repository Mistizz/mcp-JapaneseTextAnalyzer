#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// kuromojiをrequireで読み込む
const kuromoji = require('kuromoji');

// グローバル変数で形態素解析器の状態を管理
let tokenizerInstance = null;
let initializingPromise = null;
let initializationError = null;
let tokenizerReady = false;

// 辞書パスを見つける関数
function findDictionaryPath() {
  // 考えられる辞書パスの候補を配列で定義
  const possiblePaths = [
    // 1. require.resolveを使用してkuromojiのパスを見つける
    (() => {
      try {
        // kuromojiモジュールのルートパスを取得
        const kuromojiPath = path.dirname(require.resolve('kuromoji/package.json'));
        return path.join(kuromojiPath, 'dict');
      } catch (e) {
        console.error(`require.resolveエラー: ${e}`);
        return null;
      }
    })(),
    
    // 2. 実行ファイルからの相対パス
    path.resolve(__dirname, '../node_modules/kuromoji/dict'),
    
    // 3. カレントディレクトリからの相対パス
    path.resolve('./node_modules/kuromoji/dict'),
    
    // 4. プロセスのカレントワーキングディレクトリからの相対パス
    path.resolve(process.cwd(), 'node_modules/kuromoji/dict'),
    
    // 5. グローバルnpmモジュールからの相対パス（Unixの場合）
    process.env.HOME ? path.resolve(process.env.HOME, '.npm/kuromoji/dict') : null,
    
    // 6. npmのキャッシュディレクトリ
    process.env.npm_config_cache ? path.resolve(process.env.npm_config_cache, 'kuromoji/dict') : null,
  ].filter(Boolean); // nullやundefinedをフィルタリング
  
  // 各パスが存在するか確認し、最初に見つかったものを返す
  for (const dicPath of possiblePaths) {
    try {
      // base.dat.gzが存在するか確認
      if (dicPath && fs.existsSync(path.join(dicPath, 'base.dat.gz'))) {
        console.error(`辞書パスが見つかりました: ${dicPath}`);
        return dicPath;
      }
    } catch (e) {
      // エラーが発生した場合は次のパスを試す
      console.error(`パス確認エラー(${dicPath}): ${e}`);
      continue;
    }
  }
  
  // 見つからなかった場合はデフォルトパスを返す
  console.error('辞書パスが見つかりませんでした。デフォルトパスを使用します。');
  return './node_modules/kuromoji/dict';
}

// 形態素解析器を初期化する関数
async function initializeTokenizer() {
  // すでに初期化されている場合
  if (tokenizerInstance) {
    return tokenizerInstance;
  }
  
  // 初期化中の場合は既存のPromiseを返す
  if (initializingPromise) {
    return initializingPromise;
  }
  
  console.error('形態素解析器の初期化を開始...');
  
  // 辞書パスを取得
  const dicPath = findDictionaryPath();
  console.error(`使用する辞書パス: ${dicPath}`);
  
  // 初期化処理をPromiseでラップ
  initializingPromise = new Promise((resolve, reject) => {
    try {
      kuromoji.builder({ dicPath }).build((err, tokenizer) => {
        if (err) {
          console.error(`形態素解析器の初期化エラー: ${err.message || err}`);
          initializationError = err;
          initializingPromise = null; // リセットして再試行できるようにする
          tokenizerReady = false;
          reject(err);
          return;
        }
        
        console.error('形態素解析器の初期化が完了しました');
        tokenizerInstance = tokenizer;
        tokenizerReady = true;
        resolve(tokenizer);
      });
    } catch (error) {
      console.error(`形態素解析器の初期化中に例外が発生: ${error.message || error}`);
      initializationError = error;
      initializingPromise = null; // リセットして再試行できるようにする
      tokenizerReady = false;
      reject(error);
    }
  });
  
  return initializingPromise;
}

// ファイルパスを解決する関数 - WindowsとWSL/Linux形式の両方に対応
function resolveFilePath(filePath: string): string {
  try {
    // WSL/Linux形式のパス (/c/Users/...) をWindows形式 (C:\Users\...) に変換
    if (filePath.match(/^\/[a-zA-Z]\//)) {
      // /c/Users/... 形式を C:\Users\... 形式に変換
      const drive = filePath.charAt(1).toUpperCase();
      let windowsPath = `${drive}:${filePath.substring(2).replace(/\//g, '\\')}`;
      
      console.error(`WSL/Linux形式のパスをWindows形式に変換: ${filePath} -> ${windowsPath}`);
      
      if (fs.existsSync(windowsPath)) {
        console.error(`変換されたパスでファイルを発見: ${windowsPath}`);
        return windowsPath;
      }
    }
    
    // 通常の絶対パスの処理
    if (path.isAbsolute(filePath)) {
      if (fs.existsSync(filePath)) {
        console.error(`絶対パスでファイルを発見: ${filePath}`);
        return filePath;
      }
      
      // 絶対パスでファイルが見つからない場合はエラー
      throw new Error(`指定された絶対パス "${filePath}" が存在しません。パスが正しいか確認してください。` +
                      ` Windows形式(C:\\Users\\...)かWSL/Linux形式(/c/Users/...)で指定してください。`);
    }
    
    // 相対パスの場合、カレントワーキングディレクトリから検索
    const cwdPath = path.resolve(process.cwd(), filePath);
    if (fs.existsSync(cwdPath)) {
      console.error(`カレントディレクトリでファイルを発見: ${cwdPath}`);
      return cwdPath;
    }
    
    // どこにも見つからなかった場合
    throw new Error(`ファイル "${filePath}" が見つかりませんでした。絶対パスで指定してください。` +
                    ` Windows形式(C:\\Users\\...)かWSL/Linux形式(/c/Users/...)で指定可能です。`);
  } catch (error) {
    throw error;
  }
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
        let tokenizer;
        
        try {
          tokenizer = await initializeTokenizer();
        } catch (error) {
          return {
            content: [{ 
              type: 'text' as const, 
              text: '形態素解析器の初期化に失敗しました。しばらく待ってから再試行してください。'
            }],
            isError: true
          };
        }
        
        // 形態素解析を実行
        const tokens = tokenizer.tokenize(text);
        
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

  // テキストの形態素解析結果を返す関数を追加
  private async analyzeTextImpl(text: string) {
    try {
      // 形態素解析器の初期化チェック
      let tokenizer;
      try {
        tokenizer = await initializeTokenizer();
      } catch (error) {
        return {
          content: [{ 
            type: 'text' as const, 
            text: '形態素解析器の初期化に失敗しました。しばらく待ってから再試行してください。'
          }],
          isError: true
        };
      }

      // テキストを文に分割（。で区切る）
      const sentences = text.split(/[。.!?！？]/g).filter(s => s.trim().length > 0);
      
      // 形態素解析を実行
      const tokens = tokenizer.tokenize(text);

      // 基本的な分析結果
      const totalChars = text.replace(/[\s\n\r]/g, '').length;
      const totalSentences = sentences.length;
      const totalMorphemes = tokens.length;

      // 品詞別のカウント
      const posCounts: Record<string, number> = {};
      const particleCounts: Record<string, number> = {};
      let totalParticles = 0;
      
      // 文字種別のカウント
      const scriptCounts = {
        hiragana: 0,
        katakana: 0,
        kanji: 0,
        alphabet: 0,
        digit: 0,
        other: 0
      };
      
      // 単語の一意性確認用
      const uniqueWords = new Set<string>();
      let katakanaWords = 0;
      let punctuationCount = 0;
      const honorificExpressions = ['です', 'ます', 'でした', 'ました', 'ございます', 'いただく', 'なさる', 'れる', 'られる', 'どうぞ', 'お', 'ご'];
      let honorificCount = 0;

      // 各トークンを処理
      tokens.forEach((token: any) => {
        // 品詞カウント
        posCounts[token.pos] = (posCounts[token.pos] || 0) + 1;
        
        // 助詞カウント
        if (token.pos === '助詞') {
          particleCounts[token.surface_form] = (particleCounts[token.surface_form] || 0) + 1;
          totalParticles++;
        }
        
        // 単語カウント
        uniqueWords.add(token.basic_form);
        
        // カタカナ語カウント
        if (/^[\u30A0-\u30FF]+$/.test(token.surface_form)) {
          katakanaWords++;
        }

        // 句読点カウント
        if (token.pos === '記号' && (token.pos_detail_1 === '句点' || token.pos_detail_1 === '読点')) {
          punctuationCount++;
        }

        // 敬語表現カウント
        if (honorificExpressions.some(expr => token.surface_form.includes(expr) || token.basic_form.includes(expr))) {
          honorificCount++;
        }
      });

      // 文字種のカウント
      for (const char of text) {
        if (/[\u3040-\u309F]/.test(char)) {
          scriptCounts.hiragana++;
        } else if (/[\u30A0-\u30FF]/.test(char)) {
          scriptCounts.katakana++;
        } else if (/[\u4E00-\u9FAF]/.test(char)) {
          scriptCounts.kanji++;
        } else if (/[a-zA-Z]/.test(char)) {
          scriptCounts.alphabet++;
        } else if (/[0-9０-９]/.test(char)) {
          scriptCounts.digit++;
        } else if (!/\s/.test(char)) {
          scriptCounts.other++;
        }
      }

      // 各指標の計算
      const totalNonSpaceChars = Object.values(scriptCounts).reduce((a, b) => a + b, 0);
      
      // features.ymlに基づく解析結果
      const analysisResults = {
        average_sentence_length: {
          name: '平均文長',
          value: totalSentences > 0 ? (totalChars / totalSentences).toFixed(2) : '0.00',
          unit: '文字／文',
          description: '一文の長さ。長すぎると読みにくくなる。'
        },
        average_morphemes_per_sentence: {
          name: '文あたりの形態素数',
          value: totalSentences > 0 ? (totalMorphemes / totalSentences).toFixed(2) : '0.00',
          unit: '形態素／文',
          description: '文の密度や構文の複雑さを表す。'
        },
        pos_ratio: {
          name: '品詞の割合',
          value: Object.entries(posCounts).map(([pos, count]) => {
            return `${pos}: ${((count / totalMorphemes) * 100).toFixed(2)}%`;
          }).join(', '),
          unit: '%',
          description: '名詞・動詞・形容詞などの使用バランスを分析。'
        },
        particle_ratio: {
          name: '助詞の割合',
          value: Object.entries(particleCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([particle, count]) => {
              return `${particle}: ${((count / totalParticles) * 100).toFixed(2)}%`;
            }).join(', '),
          unit: '%',
          description: '主語・目的語などの構造分析や文の流れを判断。'
        },
        script_type_ratio: {
          name: '文字種の割合',
          value: Object.entries(scriptCounts).map(([type, count]) => {
            return `${type}: ${((count / totalNonSpaceChars) * 100).toFixed(2)}%`;
          }).join(', '),
          unit: '%',
          description: 'ひらがな・カタカナ・漢字・英数字の構成比率。'
        },
        vocabulary_diversity: {
          name: '語彙の多様性（タイプ/トークン比）',
          value: ((uniqueWords.size / totalMorphemes) * 100).toFixed(2),
          unit: '%',
          description: '語彙の豊かさや表現力の指標。'
        },
        katakana_word_ratio: {
          name: 'カタカナ語の割合',
          value: ((katakanaWords / totalMorphemes) * 100).toFixed(2),
          unit: '%',
          description: '外来語や専門用語の多さ、カジュアルさを示す。'
        },
        honorific_frequency: {
          name: '敬語の頻度',
          value: totalSentences > 0 ? (honorificCount / totalSentences).toFixed(2) : '0.00',
          unit: '回／文',
          description: '丁寧・フォーマルさを示す。'
        },
        punctuation_per_sentence: {
          name: '句読点の平均数',
          value: totalSentences > 0 ? (punctuationCount / totalSentences).toFixed(2) : '0.00',
          unit: '個／文',
          description: '文の区切りや読みやすさに影響。'
        }
      };

      // 結果をテキスト形式で整形
      const resultText = `# テキスト分析結果

## 基本情報
- 総文字数: ${totalChars}文字
- 文の数: ${totalSentences}
- 総形態素数: ${totalMorphemes}

## 詳細分析
${Object.entries(analysisResults).map(([key, data]) => {
  return `### ${data.name} (${data.unit})
- 値: ${data.value}
- 説明: ${data.description}`;
}).join('\n\n')}
`;

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
          text: `分析中にエラーが発生しました: ${error.message}`
        }],
        isError: true
      };
    }
  }

  // ツールをセットアップ
  setupTools() {
    // ファイルの文字数を計測
    this.server.tool(
      'count_chars', 
      'ファイルの文字数を計測します。絶対パスを指定してください（Windows形式 C:\\Users\\...、またはWSL/Linux形式 /c/Users/... のどちらも可）。スペースや改行を除いた実質的な文字数をカウントします。',
      { 
        filePath: z.string().describe('文字数をカウントするファイルのパス（Windows形式かWSL/Linux形式の絶対パスを推奨）')
      },
      async ({ filePath }) => {
        try {
          // ファイルパスを解決
          const resolvedPath = resolveFilePath(filePath);
          const fileContent = fs.readFileSync(resolvedPath, 'utf8');
          return this.countTextCharsImpl(fileContent, `ファイル '${resolvedPath}'`);
        } catch (error: any) {
          return {
            content: [{ 
              type: 'text' as const, 
              text: `ファイル読み込みエラー: ${error.message}`
            }],
            isError: true
          };
        }
      }
    );

    // ファイルの単語数を計測
    this.server.tool(
      'count_words', 
      'ファイルの単語数を計測します。絶対パスを指定してください（Windows形式 C:\\Users\\...、またはWSL/Linux形式 /c/Users/... のどちらも可）。英語ではスペースで区切られた単語をカウントし、日本語では形態素解析を使用します。',
      { 
        filePath: z.string().describe('単語数をカウントするファイルのパス（Windows形式かWSL/Linux形式の絶対パスを推奨）'),
        language: z.enum(['en', 'ja']).default('en').describe('ファイルの言語 (en: 英語, ja: 日本語)')
      },
      async ({ filePath, language }) => {
        try {
          // ファイルパスを解決
          const resolvedPath = resolveFilePath(filePath);
          const fileContent = fs.readFileSync(resolvedPath, 'utf8');
          return await this.countTextWordsImpl(fileContent, language, `ファイル '${resolvedPath}'`);
        } catch (error: any) {
          return {
            content: [{ 
              type: 'text' as const, 
              text: `ファイル読み込みエラー: ${error.message}`
            }],
            isError: true
          };
        }
      }
    );

    // テキストの文字数を計測
    this.server.tool(
      'count_clipboard_chars', 
      'テキストの文字数を計測します。スペースや改行を除いた実質的な文字数をカウントします。',
      { text: z.string().describe('文字数をカウントするテキスト') },
      async ({ text }) => this.countTextCharsImpl(text)
    );

    // テキストの単語数を計測
    this.server.tool(
      'count_clipboard_words', 
      'テキストの単語数を計測します。英語ではスペースで区切られた単語をカウントし、日本語では形態素解析を使用します。',
      { 
        text: z.string().describe('単語数をカウントするテキスト'),
        language: z.enum(['en', 'ja']).default('en').describe('テキストの言語 (en: 英語, ja: 日本語)')
      },
      async ({ text, language }) => await this.countTextWordsImpl(text, language)
    );

    // テキストの詳細分析
    this.server.tool(
      'analyze_text', 
      'テキストの詳細な形態素解析と言語的特徴の分析を行います。文の複雑さ、品詞の割合、語彙の多様性などを解析します。',
      { 
        text: z.string().describe('分析するテキスト')
      },
      async ({ text }) => await this.analyzeTextImpl(text)
    );

    // ファイルの詳細分析
    this.server.tool(
      'analyze_file', 
      'ファイルの詳細な形態素解析と言語的特徴の分析を行います。文の複雑さ、品詞の割合、語彙の多様性などを解析します。',
      { 
        filePath: z.string().describe('分析するファイルのパス（Windows形式かWSL/Linux形式の絶対パスを推奨）')
      },
      async ({ filePath }) => {
        try {
          // ファイルパスを解決
          const resolvedPath = resolveFilePath(filePath);
          const fileContent = fs.readFileSync(resolvedPath, 'utf8');
          return await this.analyzeTextImpl(fileContent);
        } catch (error: any) {
          return {
            content: [{ 
              type: 'text' as const, 
              text: `ファイル読み込みエラー: ${error.message}`
            }],
            isError: true
          };
        }
      }
    );
  }

  // サーバーを起動
  async start() {
    try {
      // ツールをセットアップ
      this.setupTools();

      // サーバーを起動
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      console.error('サーバーが起動しました。標準入出力からの要求を待機しています...');
    } catch (error) {
      console.error(`サーバーの起動中にエラーが発生しました: ${error.message || error}`);
      throw error;
    }
  }
}

// メイン関数
async function main() {
  try {
    // サーバー起動前に形態素解析器を初期化
    console.error('サーバー起動前に形態素解析器の初期化を開始します...');
    try {
      await initializeTokenizer();
      console.error('形態素解析器の初期化が完了しました');
    } catch (err) {
      console.error(`形態素解析器の初期化中にエラーが発生しましたが、サーバーは起動を続行します: ${err.message || err}`);
    }

    // サーバーインスタンスを作成
    const server = new JapaneseTextAnalyzer();
    
    // サーバーを起動
    await server.start();
  } catch (error) {
    console.error(`サーバーの起動中にエラーが発生しました: ${error.message || error}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}); 