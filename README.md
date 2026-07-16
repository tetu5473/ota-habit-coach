# 太田の習慣コーチ

筋トレ、学習、睡眠を続けるための、記録とLINE・メール報告に対応したWebアプリです。

利用者向けの詳しい操作方法は [USER_GUIDE.md](./USER_GUIDE.md) を見てください。
開発・改善用の仕様は [SPEC.md](./SPEC.md) を見てください。

## 起動

```sh
npm start
```

ブラウザで `http://localhost:8001` を開きます。

静的ファイルだけ確認したい場合は `python3 -m http.server 8000` でも開けますが、LINE連携APIを使う場合は `npm start` で起動します。

## MVPでできること

- 筋トレ、学習、睡眠のサンプル習慣を初期表示
- 1日1回、達成状況・気分・学習時間・学習時間帯・理由・メモを簡潔に記録
- 記録フォームの入力項目を音声で入力
- 学習用の集中タイマーを表示
- 理由を選択肢から選べるようにして記録負担を軽減
- つまずいた理由をもとに挫折パターンを分析
- 週間レビューで戻ってきた日、達成、未達傾向を確認
- 記録カレンダーで日別の記録状況を確認
- 状況別のやさしいコーチメッセージを表示
- 戻ってこられた回数、最低ライン達成日、最近の気分を表示
- 履歴をブラウザのLocalStorageに保存

## 音声入力

今日の記録にある「習慣」「今日の結果」「気分」「理由メモ」「ひとことメモ」のマイクアイコンから入力できます。

音声認識はブラウザの機能を使うため、対応ブラウザとマイク許可が必要です。ローカルでは `http://localhost:8001` で動作します。

## データ保存

画面側の記録はブラウザのLocalStorageに `otaHabitCoach:v2` として保存します。

LINE連携用のバックエンドは `data/habit-coach-db.json` に本人・講師の連携コード、LINE userId、日次記録を保存します。

Render Freeではサーバーの保存ファイルが消えることがあります。無料枠で試す場合は、LINE連携コードや講師のLINE userIdをRenderの環境変数に入れておくと、休止後も日次報告を続けやすくなります。

## LINE連携・メール報告

`.env.example` を `.env` にコピーし、LINE Developersで取得した値を設定します。

```sh
cp .env.example .env
```

必要な値:

- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `APP_BASE_URL`

ローカル確認用API:

- `GET /api/health`
- `GET /api/link-codes`
- `POST /api/records`
- `POST /api/line/webhook`

LINE公式アカウントに `連携 OTA-XXXX` または `講師連携 COACH-XXXX` と送ると、Webhook経由でLINE userIdを紐づける想定です。

アプリ画面の「LINE連携」パネルでは、本人コード・講師コード・連携状態を確認できます。今日の記録を保存すると `/api/records` にも送信し、LINE設定と講師連携が完了していれば講師へ日次レポートを送ります。

同じ日次レポートをメールにも送る場合は、以下も設定します。独自ドメインがない場合は、Google Apps ScriptでGmailから送る方法が一番分かりやすいです。

- `REPORT_EMAIL_TO`: 講師のメールアドレス
- `GOOGLE_SCRIPT_EMAIL_WEBHOOK_URL`: Google Apps ScriptのWebアプリURL

Google Apps Scriptには、以下のような処理を置きます。

```js
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  GmailApp.sendEmail(data.to, data.subject, data.text);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Resendを使う場合は、以下も設定します。

- `RESEND_API_KEY`: ResendのAPIキー
- `EMAIL_FROM`: Resendで送信許可した送信元メールアドレス

`REPORT_EMAIL_TO` だけでは送信できません。実際にメールを飛ばすには、送信元として使うメール配信サービスのAPIキーと送信元アドレスが必要です。

## Render Freeで公開する手順

1. GitHubにこのフォルダをアップロードします。
   - `.env` と `data/` はアップロードしません。
   - `.env.example` は設定項目の見本としてアップロードしてOKです。
2. Renderで `New` → `Web Service` を選び、GitHubのリポジトリを接続します。
3. 設定は以下にします。
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: `Free`
4. Renderの `Environment` に以下を登録します。
   - `LINE_CHANNEL_SECRET`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `APP_BASE_URL`
   - `STUDENT_LINK_CODE`
   - `COACH_LINK_CODE`
   - `COACH_LINE_USER_ID`（分かる場合）
   - `REPORT_EMAIL_TO`（メール送信も使う場合）
   - `GOOGLE_SCRIPT_EMAIL_WEBHOOK_URL`（Gmailからメール送信する場合）
   - `RESEND_API_KEY`（Resendでメール送信する場合）
   - `EMAIL_FROM`（Resendでメール送信する場合）
5. 初回デプロイ後、RenderのURLを `APP_BASE_URL` に入れます。
   - 例: `https://ota-habit-coach.onrender.com`
6. LINE DevelopersのWebhook URLを以下に変更します。
   - `https://あなたのRender URL/api/line/webhook`
7. スマホでRenderのURLを開き、記録送信とLINE報告を確認します。

Render Freeは15分ほどアクセスがないと休止し、次に開く時に起動まで少し待つことがあります。自分と講師で報告を確認する用途なら無料枠から始められますが、長期の記録保存を安定させる場合は、あとで有料の保存先や外部データベースを検討します。
