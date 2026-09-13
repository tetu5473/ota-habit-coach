// test/report-log.test.mjs【新規作成】送信履歴の表示判定を、実際の宛先別結果と照合します。
// DOM初期化を伴う既存の画面スクリプトから、副作用のない表示関数だけを読み込みます。
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
const details = source.slice(source.indexOf("function buildReportLogLineDetail("), source.indexOf("function handleReportLogAction("));
const target = source.slice(source.indexOf("function formatReportTarget("), source.indexOf("function formatCreatedAt("));
const formatters = runInNewContext(`${details}\n${target}\n({ buildReportLogLineDetail, buildReportLogStatusLabel, formatReportTarget })`);

test("実際の送信分岐はテストを本人だけ、通常送信を講師と本人へ振り分ける", async () => {
  // API呼び出しをメモリ上の記録へ差し替え、実送信せず宛先と表示区分を確認する。
  const serverSource = await readFile(new URL("../server.mjs", import.meta.url), "utf8");
  const deliverySource = serverSource.slice(serverSource.indexOf("async function sendLineDailyReportToStudent("), serverSource.indexOf("async function sendEmailDailyReport("));
  const calls = [];
  const delivery = runInNewContext(`${deliverySource}\n({ sendLineDailyReportToStudent, sendLineDailyReport })`, {
    env: { LINE_CHANNEL_ACCESS_TOKEN: "test-only-placeholder" },
    pushLineMessage: async (...argumentsList) => calls.push(argumentsList),
    console,
  });
  const student = { lineUserId: "test-student" };
  const coach = { lineUserId: "test-coach" };
  await delivery.sendLineDailyReportToStudent(student, "確認用本文");
  assert.deepEqual(calls, [["test-student", "確認用本文", "student"]]);
  calls.length = 0;
  await delivery.sendLineDailyReport(coach, student, "確認用本文");
  assert.deepEqual(calls, [["test-coach", "確認用本文", "coach_and_student"], ["test-student", "確認用本文", "coach_and_student"]]);
});

test("自分だけの成功履歴は講師とメールを対象外と表示する", () => {
  const log = { target: "student", studentLineSent: true, coachLineSent: false, emailSent: false };
  assert.equal(formatters.formatReportTarget(log.target), "テスト送信｜自分だけ");
  assert.equal(formatters.buildReportLogStatusLabel(log), "LINE送信完了");
  assert.equal(formatters.buildReportLogLineDetail(log), "自分のLINE：送信成功\n講師のLINE：送信対象外\nメール：送信対象外");
});

test("通常送信は両方成功と一部成功を区別する", () => {
  const log = { target: "coach_and_student", studentLineSent: true, coachLineSent: true, emailSent: true };
  assert.equal(formatters.formatReportTarget(log.target), "通常送信｜講師＋自分");
  assert.equal(formatters.buildReportLogStatusLabel(log), "LINE送信完了");
  log.coachLineSent = false;
  log.lineSent = true;
  assert.equal(formatters.buildReportLogStatusLabel(log), "LINEは一部のみ送信");
  assert.match(formatters.buildReportLogLineDetail(log), /講師のLINE：送信なし・未完了/);
});

test("古い履歴の成功フラグだけから講師への送信を推測しない", () => {
  const log = { sent: true, lineSent: true };
  assert.match(formatters.formatReportTarget(log.target), /不明/);
  assert.match(formatters.buildReportLogLineDetail(log), /講師のLINE：不明/);
});

test("失敗と欠落を分け、テスト区分でも矛盾する送信成功記録を隠さない", () => {
  assert.equal(formatters.buildReportLogStatusLabel({ target: "student", studentLineSent: false }), "LINE送信は未完了");
  assert.equal(formatters.buildReportLogStatusLabel({ target: "student" }), "LINE送信結果は不明");
  assert.match(formatters.buildReportLogLineDetail({ target: "student", coachLineSent: true }), /講師のLINE：送信成功/);
});
