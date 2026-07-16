import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = new URL("../outputs/spec-workbook/", import.meta.url);
const outputPath = new URL("ota_habit_coach_spec_updated.xlsx", outputDir);

const theme = {
  header: "#E8F0FE",
  title: "#F1F3F4",
  stripe: "#FAFBFC",
  blue: "#EAF2FF",
  yellow: "#FFF7DA",
  purple: "#F2ECFF",
  line: "#DADCE0",
  white: "#FFFFFF",
  ink: "#202124",
  muted: "#5F6368",
};

const checkHeaders = ["チェック", "確認", "優先度", "分類", "確認内容", "期待結果", "メモ"];

function check(priority, category, detail, expected, note = "") {
  return ["☐", "未確認", priority, category, detail, expected, note];
}

const screenCheckRows = [
  check("高", "初期表示", "アプリ名が「太田の習慣コーチ」と表示されている。", "誤字なく太田の習慣コーチと表示される。"),
  check("高", "初期表示", "画面を開いた直後に今日の記録が見える。", "最初に何をすればよいか迷わない。"),
  check("高", "初期表示", "不要な説明文や大きすぎる案内が上部に出ていない。", "記録フォームにすぐ入れる。"),
  check("高", "初期表示", "今日の日付が分かりやすい位置に表示されている。", "今日の記録であることが分かる。"),
  check("中", "色", "筋トレ・学習・睡眠のカードが色や見た目で区別しやすい。", "3つの習慣を見間違えにくい。"),
  check("中", "色", "色が強すぎず、文字が読みやすい。", "目が疲れず、本文が読める。"),
  check("中", "余白", "カード同士の間隔が詰まりすぎていない。", "押し間違いが起きにくい。"),
  check("高", "ボタン", "主要ボタンが押しやすい大きさになっている。", "スマホでもタップしやすい。"),
  check("高", "ボタン", "保存ボタンが記録フォームから遠すぎない。", "入力後すぐ保存できる。"),
  check("中", "文言", "未達時の文言が責める表現になっていない。", "次の日に戻りやすい印象になる。"),
  check("中", "文言", "専門用語が多すぎない。", "本人と講師が読んでも理解しやすい。"),
  check("中", "表示崩れ", "PC幅で文字やボタンが重なっていない。", "すべての文字が読める。"),
  check("高", "表示崩れ", "スマホ幅で横スクロールが発生しない。", "縦スクロールだけで確認できる。"),
  check("高", "表示崩れ", "長いメモを入力してもカードが不自然に崩れない。", "入力欄が自然に広がる。"),
  check("中", "記録後", "記録後のひとことが小さく表示される。", "記録の邪魔にならない。"),
  check("中", "記録後", "記録後のひとことが表示されても画面全体が騒がしくならない。", "補助メッセージとして読める。"),
];

const recordCheckRows = [
  check("高", "カード開閉", "筋トレカードをクリックして開閉できる。", "必要な時だけ入力欄を表示できる。"),
  check("高", "カード開閉", "学習カードをクリックして開閉できる。", "必要な時だけ入力欄を表示できる。"),
  check("高", "カード開閉", "睡眠カードをクリックして開閉できる。", "必要な時だけ入力欄を表示できる。"),
  check("中", "カード開閉", "開閉ボタンの表示が「開く」「閉じる」と状態に合っている。", "今の状態が分かりやすい。"),
  check("高", "今日の目安", "筋トレの今日の目安を編集できる。", "保存後にカードへ反映される。"),
  check("高", "今日の目安", "学習の今日の目安を編集できる。", "保存後にカードへ反映される。"),
  check("高", "今日の目安", "睡眠の今日の目安を編集できる。", "保存後にカードへ反映される。"),
  check("高", "今日の目安", "今日の目安を空にした時の表示が不自然ではない。", "空欄でも画面が壊れない。"),
  check("高", "結果", "筋トレで「できた」を保存できる。", "履歴とLINE文面に反映される。"),
  check("高", "結果", "筋トレで「少しだけ」を保存できる。", "履歴とLINE文面に反映される。"),
  check("高", "結果", "筋トレで「できなかった」を保存できる。", "責めない形で保存される。"),
  check("高", "結果", "学習で「できた」「少しだけ」「できなかった」を保存できる。", "結果が正しく保存される。"),
  check("高", "結果", "睡眠で「できた」「少しだけ」「できなかった」を保存できる。", "結果が正しく保存される。"),
  check("中", "気分", "気分を5種類から選べる。", "選択した気分が保存される。"),
  check("中", "気分", "気分を変更して再保存できる。", "最新の気分に更新される。"),
  check("高", "学習時間", "学習の開始時刻と終了時刻を入力できる。", "時刻入力欄が使える。"),
  check("高", "学習時間", "学習時間が開始・終了時刻から自動計算される。", "例: 19:00〜20:30が1時間30分になる。"),
  check("中", "学習時間", "終了時刻が開始時刻より早い場合の表示が不自然ではない。", "日付またぎとして扱うか、分かりやすく表示される。"),
  check("高", "メモ", "ひとことメモを入力して保存できる。", "保存後に履歴とLINE文面に出る。"),
  check("中", "メモ", "長めのメモを入力しても保存できる。", "メモが途中で消えない。"),
  check("高", "保存", "今日を記録ボタンで3習慣まとめて保存できる。", "保存状態が成功または保留で表示される。"),
  check("高", "保存", "同じ日付で再保存しても同じ習慣の記録が重複しない。", "既存記録が更新される。"),
  check("高", "保存", "講師未連携でも記録保存はできる。", "LINEだけ保留になり、記録は残る。"),
  check("中", "音声", "メモ入力で音声入力が使える。", "認識結果がメモ欄に入る。"),
  check("中", "音声", "今日の目安の音声入力が使える。", "対象カードの目安に反映される。"),
];

const calendarCheckRows = [
  check("高", "開閉", "今日の日付を押すとカレンダーが開く。", "記録カレンダーが表示される。"),
  check("高", "開閉", "もう一度操作してカレンダーを閉じられる。", "不要な時は画面をすっきり戻せる。"),
  check("中", "月移動", "前月へ移動できる。", "過去日の確認ができる。"),
  check("中", "月移動", "翌月へ移動できる。", "月移動が自然にできる。"),
  check("高", "日付選択", "過去日を選択できる。", "選択した日付の記録画面になる。"),
  check("高", "記録表示", "記録がある日がカレンダー上で分かる。", "記録済みの日を見つけられる。"),
  check("高", "詳細", "選択日の記録詳細が表示される。", "習慣ごとの結果・気分・メモが確認できる。"),
  check("高", "編集", "カレンダー詳細の編集ボタンから記録を編集できる。", "フォームに該当記録が読み込まれる。"),
  check("中", "日付変更", "日付変更ボタンで記録日を変更できる。", "誤った日付の記録を直せる。"),
  check("中", "削除", "削除ボタンで不要な記録を削除できる。", "確認後に記録が消える。"),
  check("中", "削除", "削除前に確認メッセージが出る。", "誤削除を防げる。"),
  check("高", "過去保存", "過去日を選んで新しく記録を保存できる。", "その日付の記録として残る。"),
  check("高", "復元", "再読み込み後も過去記録がカレンダーに残る。", "保存済み記録を確認できる。"),
];

const lineCheckRows = [
  check("高", "表示", "LINE連携パネルに本人コードが表示される。", "連携 OTA-XXXX が分かる。"),
  check("高", "表示", "LINE連携パネルに講師コードが表示される。", "講師連携 COACH-XXXX が分かる。"),
  check("中", "表示", "Webhook URLが表示される。", "LINE Developersへ設定するURLが分かる。"),
  check("高", "本人連携", "本人がLINEで連携コードを送ると連携される。", "本人連携済みになる。"),
  check("高", "講師連携", "講師がLINEで講師コードを送ると連携される。", "講師連携済みになる。"),
  check("中", "返信", "連携成功時にLINEへ完了メッセージが返る。", "本人または講師として連携したことが分かる。"),
  check("高", "送信", "記録保存時に講師へ日次レポートが届く。", "LINEにレポートが届く。"),
  check("高", "送信内容", "レポートに記録日が入っている。", "いつの記録か分かる。"),
  check("高", "送信内容", "レポートに今日の状況が入っている。", "できた・少し・難しいの数が分かる。"),
  check("高", "送信内容", "レポートに筋トレの結果とメモが入っている。", "講師が筋トレの状況を確認できる。"),
  check("高", "送信内容", "レポートに学習の結果・時間帯・学習合計が入っている。", "講師が学習状況を確認できる。"),
  check("高", "送信内容", "レポートに睡眠の結果とメモが入っている。", "講師が睡眠状況を確認できる。"),
  check("中", "送信内容", "未達がある時に要フォローが「あり」になる。", "講師が声かけしやすい。"),
  check("中", "送信内容", "理由・理由メモが不要に表示されていない。", "今のシンプルな仕様に合っている。"),
  check("高", "保留", "講師未連携時はLINE送信保留と表示される。", "保存失敗と誤解しない。"),
  check("高", "保留", "LINEトークン未設定時は保留表示になる。", "秘密情報を表示せず状態だけ分かる。"),
  check("中", "プレビュー", "LINE文面を確認ボタンで送信前の文面を見られる。", "講師に届く内容を事前確認できる。"),
  check("中", "再送", "必要な場合に日次レポートを再送できる。", "保存済み記録を再送できる。"),
];

const deployCheckRows = [
  check("高", "GitHub", ".env がGitHubにアップロードされない。", "LINEの秘密情報を守れる。"),
  check("高", "GitHub", "data/ がGitHubにアップロードされない。", "個人データを守れる。"),
  check("高", "GitHub", "node_modules がGitHubにアップロードされない。", "不要なファイルを避けられる。"),
  check("高", "Render", "RenderでWeb Serviceを作成できる。", "アプリの公開先を作れる。"),
  check("高", "Render", "Build Command が npm install になっている。", "Renderで依存関係を準備できる。"),
  check("高", "Render", "Start Command が npm start になっている。", "Renderでサーバーを起動できる。"),
  check("高", "Render", "LINE_CHANNEL_SECRET を環境変数に設定する。", "Webhook署名検証ができる。"),
  check("高", "Render", "LINE_CHANNEL_ACCESS_TOKEN を環境変数に設定する。", "LINE送信ができる。"),
  check("高", "Render", "APP_BASE_URL をRender URLに設定する。", "Webhook URLが正しく表示される。"),
  check("中", "Render", "STUDENT_LINK_CODE を設定する。", "本人連携コードを固定できる。"),
  check("中", "Render", "COACH_LINK_CODE を設定する。", "講師連携コードを固定できる。"),
  check("中", "Render", "COACH_LINE_USER_ID を必要に応じて設定する。", "Render Freeで保存が消えても講師送信を継続しやすい。"),
  check("高", "LINE Developers", "Webhook URLをRender URLに変更する。", "LINEからRenderへリクエストが届く。"),
  check("高", "LINE Developers", "Webhookの検証が成功する。", "LINE連携が動く状態になる。"),
  check("高", "スマホ", "スマホのモバイル回線でRender URLを開ける。", "Macが近くになくても使える。"),
  check("中", "スマホ", "Render Freeの初回起動待ちを確認する。", "少し待てば表示されることが分かる。"),
  check("高", "スマホ", "スマホで記録保存できる。", "外出先でも記録できる。"),
  check("高", "スマホ", "スマホ保存後に講師へLINEが届く。", "公開後の目的を満たす。"),
];

const sheets = [
  {
    name: "概要",
    title: "太田の習慣コーチ 仕様サマリー",
    headers: ["項目", "内容"],
    rows: [
      ["目的", "筋トレ・学習・睡眠を毎日続けるための習慣化支援アプリ。"],
      ["最重要方針", "見やすさ、使いやすさ、続けやすさを優先する。"],
      ["本人の使い方", "今日の記録を書き、過去記録をカレンダーで確認し、必要に応じて今日の目安を修正する。"],
      ["講師の使い方", "本人が保存した日次レポートをLINEで確認する。"],
      ["現在の中心機能", "今日の記録、カード開閉、今日の目安編集、記録カレンダー、LINE連携、Render公開準備。"],
      ["MVPの考え方", "機能を増やしすぎず、毎日戻ってきやすい記録体験を作る。"],
    ],
  },
  {
    name: "基本方針",
    title: "見やすさ・使いやすさ・続けやすさ",
    headers: ["分類", "方針", "仕様に反映する内容"],
    rows: [
      ["見やすさ", "今日の記録に集中できる構成にする", "最初に見る画面は今日の記録を中心にする。"],
      ["見やすさ", "情報を詰め込みすぎない", "記録後のひとことは小さく表示し、画面上部を占有しない。"],
      ["見やすさ", "状態を色で分かるようにする", "記録済み、保留、エラーを色付きで表示する。"],
      ["使いやすさ", "記録ボタンまでの距離を短くする", "今日の記録フォーム内で保存まで完了できる。"],
      ["使いやすさ", "入力項目を増やしすぎない", "理由・理由メモは使わず、結果・気分・メモを中心にする。"],
      ["使いやすさ", "スマホでも押しやすくする", "カード開閉と大きめの入力欄・ボタンを使う。"],
      ["続けやすさ", "少しだけでも継続として扱う", "結果に「少しだけ」を用意する。"],
      ["続けやすさ", "未達を責めない", "できなかった日は改善材料として扱う。"],
      ["続けやすさ", "過去記録へ戻れる", "カレンダーから過去日の確認・編集をできるようにする。"],
    ],
  },
  {
    name: "画面仕様",
    title: "現在の画面構成",
    headers: ["画面・部品", "役割", "主な表示内容", "操作"],
    rows: [
      ["今日の記録", "アプリの中心画面", "筋トレ・学習・睡眠の記録カード", "カードを開閉して入力し、今日を記録する。"],
      ["今日の目安編集", "その日の最低ラインを調整する", "今日の目安、編集フォーム", "各カードの編集ボタンから修正する。"],
      ["記録カレンダー", "過去の記録を確認する", "記録済み日、選択日の詳細", "日付を押して確認・編集・日付変更・削除する。"],
      ["LINE連携パネル", "連携状態を確認する", "本人コード、講師コード、Webhook URL、連携状態", "LINE連携の準備と送信状態を確認する。"],
      ["記録後のひとこと", "記録後の補助メッセージ", "短いコーチメッセージ", "記録後に小さく確認する。"],
      ["講師レビュー画面", "講師が記録を確認する補助画面", "今日の記録、履歴、簡易レビュー", "現段階ではLINE確認を優先する。"],
    ],
  },
  {
    name: "記録項目",
    title: "今日の記録で扱う項目",
    headers: ["項目", "対象", "入力・表示方法", "保存・送信"],
    rows: [
      ["今日の目安", "筋トレ・学習・睡眠", "カード内に表示し、編集ボタンで修正できる。", "記録と一緒に保存し、LINEにも最低ラインとして送る。"],
      ["今日の結果", "筋トレ・学習・睡眠", "できた、少しだけ、できなかったから選ぶ。", "日次記録とLINEレポートに反映する。"],
      ["気分", "筋トレ・学習・睡眠", "かなり良い、良い、普通、疲れた、しんどいから選ぶ。", "日次記録とLINEレポートに反映する。"],
      ["学習時間帯", "学習のみ", "開始時刻と終了時刻を入力する。", "学習時間の計算とLINEレポートに使う。"],
      ["学習時間", "学習のみ", "時間帯から自動計算して表示する。", "合計分として保存する。"],
      ["ひとことメモ", "筋トレ・学習・睡眠", "自由入力。", "日次記録とLINEレポートに反映する。"],
      ["保存状態", "全体", "記録後に色付きで表示する。", "LINE送信済み、保留、エラーを分かりやすくする。"],
    ],
  },
  {
    name: "LINE連携",
    title: "LINE連携仕様",
    headers: ["項目", "仕様", "補足"],
    rows: [
      ["目的", "講師が本人の習慣記録をLINEで確認できるようにする。", "細かい管理より、毎日の報告確認を重視する。"],
      ["本人連携", "本人がLINE公式アカウントに「連携 OTA-XXXX」と送る。", "本人のLINE userIdを保存する。"],
      ["講師連携", "講師がLINE公式アカウントに「講師連携 COACH-XXXX」と送る。", "講師のLINE userIdを保存する。"],
      ["日次レポート送信", "今日を記録した時に講師へ日次レポートを送る。", "講師未連携時は記録保存を優先し、送信は保留扱いにする。"],
      ["レポート内容", "記録日、今日の状況、要フォロー、学習合計、習慣ごとの結果・目安・時間帯・気分・メモ。", "理由・理由メモは現在のレポート対象にしない。"],
      ["Webhook", "LINE DevelopersにRender URLのWebhookを設定する。", "形式は https://RenderのURL/api/line/webhook。"],
    ],
  },
  {
    name: "データ_API",
    title: "データ保存とAPI",
    headers: ["分類", "項目", "仕様", "注意点"],
    rows: [
      ["ブラウザ保存", "LocalStorage", "otaHabitCoach:v2 に習慣設定、今日の目安、日次記録、画面設定を保存する。", "ブラウザが変わると見えない場合がある。"],
      ["サーバー保存", "habit-coach-db.json", "data/habit-coach-db.json にLINE連携情報と日次記録を保存する。", "Render Freeでは永続化されない可能性がある。"],
      ["環境変数", "LINE設定", "LINE_CHANNEL_SECRET、LINE_CHANNEL_ACCESS_TOKEN、APP_BASE_URLを使う。", "秘密情報は画面やGitHubに出さない。"],
      ["環境変数", "連携情報", "STUDENT_LINK_CODE、COACH_LINK_CODE、COACH_LINE_USER_IDを使える。", "Render Freeで保存ファイルが消えた時の補助になる。"],
      ["API", "GET /api/health", "サーバー状態、LINE設定状態、Webhook URLを返す。", "公開前の確認に使う。"],
      ["API", "GET /api/link-codes", "本人コード、講師コード、連携状態を返す。", "LINE連携パネルで使う。"],
      ["API", "POST /api/records/bulk", "複数習慣の記録をまとめて保存する。", "保存後に日次レポート送信を試す。"],
      ["API", "GET /api/reports/daily/preview", "指定日のLINEレポート文面をプレビューする。", "送信前の確認に使う。"],
      ["API", "POST /api/line/webhook", "LINEの連携メッセージを受け取る。", "署名検証を行う。"],
    ],
  },
  {
    name: "デプロイ",
    title: "Render Freeで公開する仕様",
    headers: ["項目", "内容", "確認ポイント"],
    rows: [
      ["目的", "Macが近くになくてもスマホだけで開けるようにする。", "外出先でRender URLを開けること。"],
      ["起動コマンド", "npm start", "RenderのStart Commandに設定する。"],
      ["ビルドコマンド", "npm install", "RenderのBuild Commandに設定する。"],
      ["公開URL", "Renderが発行するURLをAPP_BASE_URLに設定する。", "例: https://ota-habit-coach.onrender.com"],
      ["LINE Webhook", "https://RenderのURL/api/line/webhook をLINE Developersに設定する。", "Webhook検証が成功すること。"],
      ["無料枠の注意", "アクセスがないと一時停止し、次回起動に時間がかかる。", "講師と本人の確認用途なら無料枠から始められる。"],
      ["保存の注意", "Render Freeでは保存ファイルが消える可能性がある。", "長期保存は外部DBを検討する。"],
    ],
  },
  {
    name: "次にやること",
    title: "今後の改善候補",
    headers: ["優先度", "項目", "内容", "状態"],
    rows: [
      ["高", "GitHubアップロード", "Renderに接続するため、アプリをGitHubにアップロードする。", "次回対応"],
      ["高", "Render接続", "RenderでWeb Serviceを作成し、無料枠で公開する。", "次回対応"],
      ["高", "Webhook変更", "LINE DevelopersのWebhook URLをRender URLに変更する。", "次回対応"],
      ["高", "スマホ確認", "スマホだけで記録とLINE報告ができるか確認する。", "次回対応"],
      ["中", "外部DB検討", "長期保存が必要になったら、Render Free以外の保存先を検討する。", "後で検討"],
      ["中", "講師レビュー画面強化", "講師がブラウザでも見やすく確認できる画面を整える。", "後で検討"],
      ["低", "LINEから記録入力", "アプリを開かずLINEだけで記録できる機能。", "後で検討"],
      ["低", "通知・リマインダー", "記録忘れを防ぐ通知機能。", "後で検討"],
    ],
  },
  {
    name: "確認チェック",
    title: "確認チェック一覧",
    headers: ["タブ", "件数", "主な確認内容", "使い方"],
    rows: [
      ["確認_画面", screenCheckRows.length, "見やすさ、スマホ表示、文言、ボタン配置", "画面を見ながらOK/要修正を選ぶ。"],
      ["確認_記録", recordCheckRows.length, "カード開閉、今日の目安、結果、気分、学習時間、保存", "実際にテスト記録を入れて確認する。"],
      ["確認_カレンダー", calendarCheckRows.length, "過去日確認、編集、日付変更、削除", "過去日の記録を使って確認する。"],
      ["確認_LINE", lineCheckRows.length, "本人連携、講師連携、LINE文面、保留表示", "LINE公式アカウントと合わせて確認する。"],
      ["確認_公開", deployCheckRows.length, "GitHub、Render、Webhook、スマホ確認", "公開作業の前後で確認する。"],
      ["合計", screenCheckRows.length + recordCheckRows.length + calendarCheckRows.length + lineCheckRows.length + deployCheckRows.length, "詳細チェック項目の合計", "未確認を減らしてから公開に進む。"],
    ],
  },
  { name: "確認_画面", title: "画面・見やすさチェック", headers: checkHeaders, rows: screenCheckRows },
  { name: "確認_記録", title: "今日の記録チェック", headers: checkHeaders, rows: recordCheckRows },
  { name: "確認_カレンダー", title: "記録カレンダーチェック", headers: checkHeaders, rows: calendarCheckRows },
  { name: "確認_LINE", title: "LINE連携チェック", headers: checkHeaders, rows: lineCheckRows },
  { name: "確認_公開", title: "GitHub・Render公開チェック", headers: checkHeaders, rows: deployCheckRows },
];

function writeSheet(workbook, config, index) {
  const sheet = workbook.worksheets.add(config.name);
  const colCount = config.headers.length;
  const rows = [[config.title], [], config.headers, ...config.rows];
  const values = rows.map((source) => {
    const row = Array(colCount).fill("");
    source.forEach((value, colIndex) => {
      row[colIndex] = value;
    });
    return row;
  });

  sheet.getRangeByIndexes(0, 0, values.length, colCount).values = values;
  sheet.showGridLines = false;

  const titleRange = sheet.getRangeByIndexes(0, 0, 1, colCount);
  titleRange.merge();
  titleRange.format = {
    fill: theme.title,
    font: { bold: true, color: theme.ink, size: 16 },
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };
  titleRange.format.rowHeightPx = 38;

  const headerRange = sheet.getRangeByIndexes(2, 0, 1, colCount);
  headerRange.format = {
    fill: theme.header,
    font: { bold: true, color: theme.ink },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    borders: { preset: "all", style: "thin", color: theme.line },
  };
  headerRange.format.rowHeightPx = 28;

  const bodyRows = Math.max(values.length - 3, 1);
  const bodyRange = sheet.getRangeByIndexes(3, 0, bodyRows, colCount);
  bodyRange.format = {
    fill: theme.white,
    font: { color: theme.ink, size: 10 },
    wrapText: true,
    verticalAlignment: "top",
    borders: { preset: "all", style: "thin", color: theme.line },
  };

  for (let rowIndex = 3; rowIndex < values.length; rowIndex += 2) {
    sheet.getRangeByIndexes(rowIndex, 0, 1, colCount).format.fill = theme.stripe;
  }

  if (config.name.startsWith("確認_")) {
    sheet.getRangeByIndexes(3, 0, bodyRows, 1).dataValidation = {
      rule: { type: "list", values: ["☐", "☑"] },
    };
    sheet.getRangeByIndexes(3, 1, bodyRows, 1).dataValidation = {
      rule: { type: "list", values: ["未確認", "OK", "要修正", "対象外"] },
    };
    sheet.getRangeByIndexes(3, 2, bodyRows, 1).dataValidation = {
      rule: { type: "list", values: ["高", "中", "低"] },
    };
  }

  const widths = getColumnWidths(config.name, colCount);
  widths.forEach((width, colIndex) => {
    sheet.getRangeByIndexes(0, colIndex, values.length, 1).format.columnWidthPx = width;
  });

  sheet.freezePanes.freezeRows(3);
}

function getColumnWidths(sheetName, colCount) {
  const presets = {
    概要: [160, 720],
    基本方針: [120, 260, 520],
    画面仕様: [150, 230, 330, 310],
    記録項目: [150, 180, 350, 330],
    LINE連携: [150, 420, 360],
    データ_API: [130, 180, 430, 320],
    デプロイ: [150, 430, 350],
    次にやること: [90, 190, 460, 150],
    確認チェック: [150, 80, 360, 360],
    確認_画面: [80, 100, 70, 120, 430, 330, 220],
    確認_記録: [80, 100, 70, 120, 430, 330, 220],
    確認_カレンダー: [80, 100, 70, 120, 430, 330, 220],
    確認_LINE: [80, 100, 70, 120, 430, 330, 220],
    確認_公開: [80, 100, 70, 120, 430, 330, 220],
  };
  return presets[sheetName] || Array(colCount).fill(220);
}

await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
sheets.forEach((sheetConfig, index) => writeSheet(workbook, sheetConfig, index));

const summary = await workbook.inspect({
  kind: "sheet",
  include: "name",
  maxChars: 3000,
});
console.log(summary.ndjson);

const overview = await workbook.inspect({
  kind: "table",
  range: "概要!A1:B10",
  include: "values",
  tableMaxRows: 10,
  tableMaxCols: 2,
});
console.log(overview.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  maxChars: 2000,
});
console.log(errors.ndjson || "no formula errors");

for (const sheetConfig of sheets) {
  await workbook.render({
    sheetName: sheetConfig.name,
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
}

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath.pathname);
console.log(`saved:${outputPath.pathname}`);
