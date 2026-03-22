# stepfunctions-sync-execution

AWS Step Functions のステートマシンを同期的に実行し、結果を JSON として取得する CLI ツールです。

## 必要条件

- Node.js 18 以上
- AWS 認証情報（`~/.aws/credentials`、`~/.aws/config`、または環境変数で設定済みであること）

## インストール

```bash
yarn install
```

## 使い方

JSON ファイルを指定する場合:

```bash
node index.js --arn <STATE_MACHINE_ARN> --input <INPUT_FILE>
```

JSON を直接渡す場合:

```bash
node index.js --arn <STATE_MACHINE_ARN> --data '{"key": "value"}'
```

AWS プロファイルとポーリング間隔を指定する場合:

```bash
node index.js \
  --arn arn:aws:states:ap-northeast-1:123456789012:stateMachine:MyStateMachine \
  --input input.json \
  --profile my-profile \
  --interval 3
```

結果をファイルに保存する場合（ログは stderr、結果は stdout に出力されます）:

```bash
node index.js --arn <ARN> --input input.json > result.json
```

## オプション

| オプション | 短縮形 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `--arn` | `-a` | はい | - | ステートマシン ARN |
| `--input` | `-f` | `--data` と排他で必須 | - | 実行 input として渡す JSON ファイルのパス |
| `--data` | `-d` | `--input` と排他で必須 | - | 実行 input として渡す JSON 文字列 |
| `--profile` | `-p` | いいえ | SDK デフォルト | AWS プロファイル名 |
| `--interval` | `-i` | いいえ | `5` | ポーリング間隔（秒） |

## 出力

実行が成功すると、整形された JSON が **stdout** に出力されます:

```json
{
  "key": "value"
}
```

実行開始やポーリングのステータスログは **stderr** に出力されるため、stdout をファイルにリダイレクトしてもログが混入しません。

## エラー時の挙動

`SUCCEEDED` 以外のステータス（`FAILED`、`TIMED_OUT`、`ABORTED` など）で終了した場合、エラー原因を stderr に出力してプロセスを終了コード `1` で終了します。

入力ファイルが存在しない、JSON が不正、AWS API エラーなども同様にエラーメッセージを出力してコード `1` で終了します。

## ライセンス

MIT
