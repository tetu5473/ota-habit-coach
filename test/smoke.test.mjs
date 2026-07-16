import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
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

test("存在しないページは404になる", async () => {
  const response = await fetch(`${baseUrl}/not-found-for-test`);
  assert.equal(response.status, 404);
});

async function findAvailablePort() {
  const probe = createServer();
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
