// test/smoke.test.mjs【修正】太田の習慣コーチの画面配信と保存APIを確認するスモークテストです。
// 長文メモの保持と、送信区分・PDCAレイアウトを実送信なしで確認します。
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let appProcess;
let baseUrl;
let testDataDir;
let serverOutput = "";

before(async () => {
  const port = await findAvailablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  testDataDir = await mkdtemp(join(tmpdir(), "ota-habit-coach-test-"));

  appProcess = spawn(process.execPath, ["server.mjs"], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: testDataDir,
      APP_BASE_URL: "",
      LINE_CHANNEL_SECRET: "",
      LINE_CHANNEL_ACCESS_TOKEN: "",
      REPORT_EMAIL_TO: "",
      COACH_EMAIL_TO: "",
      GOOGLE_SCRIPT_EMAIL_WEBHOOK_URL: "",
      RESEND_API_KEY: "",
      EMAIL_FROM: "",
      // ローカルの設定があってもテスト記録を外部の保存先へ送らない。
      PERSISTENT_STORE_WEBHOOK_URL: "",
      REMOTE_SYNC_BASE_URL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  appProcess.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  appProcess.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });

  await waitForServer();
});

after(async () => {
  if (appProcess?.exitCode === null) {
    appProcess.kill();
    await once(appProcess, "exit");
  }
  if (testDataDir) await rm(testDataDir, { recursive: true, force: true });
});

test("アプリ画面と必要なファイルを配信できる", async () => {
  const pageResponse = await fetch(`${baseUrl}/`);
  assert.equal(pageResponse.status, 200);
  assert.match(pageResponse.headers.get("content-type") || "", /text\/html/);
  assert.match(await pageResponse.text(), /太田の習慣コーチ/);

  const assetPaths = ["/styles.css", "/app.js"];
  for (const path of assetPaths) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200, `${path} should be available`);
  }
});

test("メモ欄は長文を貼り付けても文字数上限で切られない", async () => {
  // NOTE: 日常入力・一覧編集・保存済み記録の編集で同じ上限を再び設定しないようにする。
  const pageResponse = await fetch(`${baseUrl}/`);
  const pageHtml = await pageResponse.text();
  assert.doesNotMatch(pageHtml, /id="note"[^>]*maxlength=/);

  const appResponse = await fetch(`${baseUrl}/app.js`);
  const appScript = await appResponse.text();
  assert.doesNotMatch(appScript, /class="multi-note"[^>]*maxlength=/);
  assert.doesNotMatch(appScript, /class="record-edit-note"[^>]*maxlength=/);
});

test("読み取りAPIが安全な初期状態を返す", async () => {
  const healthResponse = await fetch(`${baseUrl}/api/health`);
  const health = await healthResponse.json();
  assert.equal(healthResponse.status, 200);
  assert.equal(health.ok, true);
  assert.equal(health.lineConfigured, false);
  assert.equal(health.emailConfigured, false);

  const linkResponse = await fetch(`${baseUrl}/api/link-codes`);
  const links = await linkResponse.json();
  assert.equal(linkResponse.status, 200);
  assert.match(links.student, /^OTA-/);
  assert.match(links.coach, /^COACH-/);
  assert.equal(links.studentLinked, false);
  assert.equal(links.coachLinked, false);

  const recordsResponse = await fetch(`${baseUrl}/api/records`);
  const records = await recordsResponse.json();
  assert.equal(recordsResponse.status, 200);
  assert.deepEqual(records.records, []);
});

test("保存済み報告の内容と日付をまとめて更新できる", async () => {
  const originalDate = "2026-07-10";
  const correctedDate = "2026-07-09";
  const createResponse = await fetch(`${baseUrl}/api/records/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      records: [
        {
          date: originalDate,
          habitId: "strength",
          habitTitle: "筋トレ",
          plannedMinimumAction: "スクワット10回",
          status: "done",
          note: "最初の記録",
        },
        {
          date: originalDate,
          habitId: "learning",
          habitTitle: "学習",
          plannedMinimumAction: "教材を30分進める",
          status: "partial",
          learningMinutes: "30",
          learningSessions: [{ startTime: "09:00", endTime: "09:30" }],
          note: "30分学習した",
        },
      ],
    }),
  });
  const created = await createResponse.json();
  assert.equal(createResponse.status, 200);
  assert.equal(created.records.length, 2);

  const updateResponse = await fetch(`${baseUrl}/api/records/bulk`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fromDate: originalDate,
      records: [
        {
          date: correctedDate,
          habitId: "strength",
          habitTitle: "筋トレ",
          plannedMinimumAction: "スクワット15回",
          status: "partial",
          note: "回数を修正",
        },
        {
          date: correctedDate,
          habitId: "learning",
          habitTitle: "学習",
          plannedMinimumAction: "教材を1時間進める",
          status: "done",
          learningMinutes: "60",
          learningSessions: [{ startTime: "09:00", endTime: "10:00" }],
          learningStartTime: "09:00",
          learningEndTime: "10:00",
          note: "学習時間を修正",
        },
      ],
    }),
  });
  const updated = await updateResponse.json();
  assert.equal(updateResponse.status, 200);
  assert.equal(updated.records.length, 2);
  assert.ok(updated.records.every((record) => record.date === correctedDate));
  assert.ok(updated.records.every((record) => record.updatedAt));

  const recordsResponse = await fetch(`${baseUrl}/api/records`);
  const { records } = await recordsResponse.json();
  assert.equal(records.filter((record) => record.date === originalDate).length, 0);
  assert.equal(records.filter((record) => record.date === correctedDate).length, 2);
  assert.equal(records.find((record) => record.habitId === "strength")?.status, "partial");
  assert.equal(records.find((record) => record.habitId === "learning")?.learningMinutes, "60");
});

test("LINEレポートは空行に依存せずPDCA見出しと本文の間隔をそろえる", async () => {
  // 空行なし・連続空行・CRLFの入力でも、同じ見出し余白で全文を保持する。
  const note = "P：計画\r\n・計画の本文\r\nD：実行\r\n\r\n・実行の本文\r\n・追加の作業\r\n\r\nC：確認\r\n確認できた内容\r\nA：改善\r\n・次回の作業";
  const date = "2026-07-12";
  await fetch(`${baseUrl}/api/records/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records: [{ date, habitId: "learning", habitTitle: "学習", status: "done", note }] }),
  });
  const logsBefore = await (await fetch(`${baseUrl}/api/reports/logs`)).json();
  const response = await fetch(`${baseUrl}/api/reports/daily/preview?date=${date}&format=flex`);
  assert.equal(response.status, 200);
  const { flexMessage } = await response.json();
  const contents = flexMessage.contents.body.contents;
  for (const heading of ["P：計画", "D：実行", "C：確認", "A：改善"]) {
    const headingIndex = contents.findIndex((component) => component.text === heading);
    assert.ok(headingIndex >= 0, heading);
    assert.equal(contents[headingIndex].margin, "20px", heading);
    assert.equal(contents[headingIndex + 1].margin, "4px", heading);
    assert.equal(contents[headingIndex + 1].lineSpacing, "4px", heading);
  }
  assert.equal(contents.find((component) => component.text === "・追加の作業").margin, "8px");
  for (const line of note.split(/\r?\n/).filter(Boolean)) {
    assert.ok(contents.some((component) => component.text === line), line);
  }
  assert.ok(contents.every((component) => component.type !== "text" || component.text.trim()));
  assert.deepEqual(await (await fetch(`${baseUrl}/api/reports/logs`)).json(), logsBefore);
  // 本文を変えずにテスト／通常の表示を切り替え、通知一覧でも区分を識別できる。
  const selfPreview = await (await fetch(`${baseUrl}/api/reports/daily/preview?date=${date}&format=flex&target=student`)).json();
  assert.match(selfPreview.flexMessage.altText, /テスト送信｜自分だけ/);
  assert.equal(selfPreview.flexMessage.contents.header.contents[0].text, "テスト送信｜自分だけ");
  assert.equal(selfPreview.flexMessage.contents.header.contents[2].text, "講師・メールには送信しません");
  assert.match(flexMessage.altText, /通常送信｜講師＋自分/);
  assert.equal(flexMessage.contents.header.contents[0].text, "通常送信｜講師＋自分");
  assert.deepEqual(selfPreview.flexMessage.contents.body, flexMessage.contents.body);
  assert.deepEqual(await (await fetch(`${baseUrl}/api/reports/logs`)).json(), logsBefore);
  const emptyPreview = await (await fetch(`${baseUrl}/api/reports/daily/preview?date=2000-01-01&format=flex`)).json();
  assert.equal(emptyPreview.flexMessage, null);
});

test("自分だけのLINEテスト送信として保存できる", async () => {
  const testDate = "2026-07-11";
  const response = await fetch(`${baseUrl}/api/records/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportTarget: "student",
      records: [
        {
          date: testDate,
          habitId: "sleep",
          habitTitle: "睡眠",
          plannedMinimumAction: "6時間は寝る",
          status: "done",
          note: "自分だけに確認する",
        },
      ],
    }),
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.records.length, 1);
  assert.equal(result.report.target, "student");
  assert.equal(result.report.sent, false);
  assert.equal(result.report.reason, "missing_channel_access_token");
});

test("永続保存先からRender再起動後の記録を復元できる", async () => {
  const persistentStore = await startFakePersistentStore();
  const firstDataDir = await mkdtemp(join(tmpdir(), "ota-habit-coach-persist-first-"));
  const secondDataDir = await mkdtemp(join(tmpdir(), "ota-habit-coach-persist-second-"));
  let firstApp;
  let secondApp;

  try {
    firstApp = await startIsolatedApp({
      dataDir: firstDataDir,
      persistentStoreUrl: persistentStore.url,
    });

    const saveResponse = await fetch(`${firstApp.baseUrl}/api/records/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        records: [
          {
            date: "2026-08-01",
            habitId: "learning",
            habitTitle: "学習",
            plannedMinimumAction: "30分進める",
            status: "done",
            learningMinutes: "90",
            note: "永続保存テスト",
          },
        ],
      }),
    });
    assert.equal(saveResponse.status, 200);
    assert.ok(persistentStore.state.saves.length >= 1);
    assert.equal(persistentStore.state.db.dailyRecords.length, 1);

    await stopIsolatedApp(firstApp);
    firstApp = null;

    secondApp = await startIsolatedApp({
      dataDir: secondDataDir,
      persistentStoreUrl: persistentStore.url,
    });

    const recordsResponse = await fetch(`${secondApp.baseUrl}/api/records`);
    const { records } = await recordsResponse.json();
    assert.equal(recordsResponse.status, 200);
    assert.equal(records.length, 1);
    assert.equal(records[0].date, "2026-08-01");
    assert.equal(records[0].habitId, "learning");
    assert.equal(records[0].note, "永続保存テスト");
  } finally {
    if (firstApp) await stopIsolatedApp(firstApp);
    if (secondApp) await stopIsolatedApp(secondApp);
    await persistentStore.close();
    await rm(firstDataDir, { recursive: true, force: true });
    await rm(secondDataDir, { recursive: true, force: true });
  }
});

test("存在しないページは404になる", async () => {
  const response = await fetch(`${baseUrl}/not-found-for-test`);
  assert.equal(response.status, 404);
});

async function findAvailablePort() {
  const probe = createNetServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolveClose) => probe.close(resolveClose));
  return port;
}

async function waitForServer() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (appProcess.exitCode !== null) {
      throw new Error(`テスト用サーバーが終了しました。\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The server may need a moment to start listening.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error(`テスト用サーバーを起動できませんでした。\n${serverOutput}`);
}

async function startFakePersistentStore() {
  const state = {
    db: null,
    saves: [],
  };
  const server = createHttpServer(async (request, response) => {
    let rawBody = "";
    for await (const chunk of request) {
      rawBody += chunk.toString();
    }
    const body = rawBody ? JSON.parse(rawBody) : {};
    response.setHeader("Content-Type", "application/json; charset=utf-8");

    if (body.action === "load") {
      response.end(JSON.stringify({
        ok: true,
        db: state.db,
        updatedAt: state.updatedAt || "",
      }));
      return;
    }

    if (body.action === "save") {
      state.db = body.db;
      state.updatedAt = body.updatedAt;
      state.saves.push(body);
      response.end(JSON.stringify({
        ok: true,
        updatedAt: state.updatedAt,
        recordCount: Array.isArray(body.db?.dailyRecords) ? body.db.dailyRecords.length : 0,
      }));
      return;
    }

    response.statusCode = 400;
    response.end(JSON.stringify({ ok: false, reason: "unknown_action" }));
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    state,
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolveClose) => server.close(resolveClose)),
  };
}

async function startIsolatedApp({ dataDir, persistentStoreUrl }) {
  const appPort = await findAvailablePort();
  const isolatedBaseUrl = `http://127.0.0.1:${appPort}`;
  let output = "";
  const processHandle = spawn(process.execPath, ["server.mjs"], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(appPort),
      DATA_DIR: dataDir,
      APP_BASE_URL: "",
      LINE_CHANNEL_SECRET: "",
      LINE_CHANNEL_ACCESS_TOKEN: "",
      REPORT_EMAIL_TO: "",
      COACH_EMAIL_TO: "",
      GOOGLE_SCRIPT_EMAIL_WEBHOOK_URL: "",
      RESEND_API_KEY: "",
      EMAIL_FROM: "",
      PERSISTENT_STORE_WEBHOOK_URL: persistentStoreUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  processHandle.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  processHandle.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  await waitForSpecificServer(processHandle, isolatedBaseUrl, () => output);
  return { processHandle, baseUrl: isolatedBaseUrl };
}

async function stopIsolatedApp(app) {
  if (app.processHandle.exitCode === null) {
    app.processHandle.kill();
    await once(app.processHandle, "exit");
  }
}

async function waitForSpecificServer(processHandle, targetBaseUrl, getOutput) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error(`テスト用サーバーが終了しました。\n${getOutput()}`);
    }
    try {
      const response = await fetch(`${targetBaseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The server may need a moment to start listening.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error(`テスト用サーバーを起動できませんでした。\n${getOutput()}`);
}
