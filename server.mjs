import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const rootDir = process.cwd();
const env = await loadEnv();
const port = Number(env.PORT || 8001);
const dataDir = resolve(rootDir, env.DATA_DIR || "data");
const dbPath = join(dataDir, "habit-coach-db.json");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

await ensureDb();

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    await serveStatic(response, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "internal_server_error" });
  }
});

server.listen(port, () => {
  console.log(`Habit coach server running at http://localhost:${port}/`);
});

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      lineConfigured: Boolean(env.LINE_CHANNEL_SECRET && env.LINE_CHANNEL_ACCESS_TOKEN),
      emailConfigured: Boolean(getReportEmailTo() && (env.GOOGLE_SCRIPT_EMAIL_WEBHOOK_URL || (env.RESEND_API_KEY && env.EMAIL_FROM))),
      emailToConfigured: Boolean(getReportEmailTo()),
      webhookUrl: `${env.APP_BASE_URL || `http://localhost:${port}`}/api/line/webhook`,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/link-codes") {
    const db = await readDb();
    sendJson(response, 200, {
      student: db.users.student.linkCode,
      coach: db.users.coach.linkCode,
      studentLinked: Boolean(db.users.student.lineUserId),
      coachLinked: Boolean(db.users.coach.lineUserId),
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/records") {
    const db = await readDb();
    sendJson(response, 200, {
      records: db.dailyRecords || [],
    });
    return;
  }

  if (request.method === "DELETE" && url.pathname === "/api/records") {
    const body = await readJsonBody(request);
    const deleted = await deleteDailyRecord(body.date, body.habitId);
    sendJson(response, 200, {
      ok: true,
      deleted,
    });
    return;
  }

  if (request.method === "PATCH" && url.pathname === "/api/records/date") {
    const body = await readJsonBody(request);
    const movedRecord = await moveDailyRecordDate(body.fromDate, body.toDate, body.habitId);
    sendJson(response, 200, {
      ok: true,
      record: movedRecord,
    });
    return;
  }

  if (request.method === "PATCH" && url.pathname === "/api/records/bulk") {
    const body = await readJsonBody(request);
    const updatedRecords = await updateDailyRecords(
      body.fromDate,
      Array.isArray(body.records) ? body.records : [],
    );
    if (!updatedRecords.length) {
      sendJson(response, 404, { error: "records_not_found" });
      return;
    }
    sendJson(response, 200, {
      ok: true,
      records: updatedRecords,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/records") {
    const body = await readJsonBody(request);
    const savedRecord = await saveDailyRecord(body);
    const reportResult = await sendDailyReport(savedRecord, {
      target: body.reportTarget,
      style: body.reportStyle,
    });
    sendJson(response, 200, {
      ok: true,
      record: savedRecord,
      report: reportResult,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/records/bulk") {
    const body = await readJsonBody(request);
    const savedRecords = await saveDailyRecords(Array.isArray(body.records) ? body.records : []);
    const reportResult = savedRecords.length
      ? await sendDailyReportForDate(savedRecords[0].date, {
        target: body.reportTarget,
        style: body.reportStyle,
      })
      : { sent: false, reason: "no_records_for_date" };
    sendJson(response, 200, {
      ok: true,
      records: savedRecords,
      report: reportResult,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/reports/daily") {
    const body = await readJsonBody(request);
    const reportResult = await sendDailyReportForDate(body.date || formatDateKey(new Date()), {
      target: body.reportTarget,
      style: body.reportStyle,
    });
    sendJson(response, 200, {
      ok: true,
      report: reportResult,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/reports/daily/preview") {
    const db = await readDb();
    const date = url.searchParams.get("date") || formatDateKey(new Date());
    const records = db.dailyRecords.filter((record) => record.date === date);
    sendJson(response, 200, {
      date,
      recordCount: records.length,
      text: records.length ? buildDailyReportMessage(db, date, url.searchParams.get("style") || "standard") : "",
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/line/webhook") {
    await handleLineWebhook(request, response);
    return;
  }

  sendJson(response, 404, { error: "not_found" });
}

async function handleLineWebhook(request, response) {
  const rawBody = await readRawBody(request);
  if (!verifyLineSignature(rawBody, request.headers["x-line-signature"])) {
    console.warn("LINE webhook rejected: invalid signature");
    sendJson(response, 401, { error: "invalid_signature" });
    return;
  }

  const payload = JSON.parse(rawBody || "{}");
  const db = await readDb();

  for (const event of payload.events || []) {
    if (event.type !== "message" || event.message?.type !== "text") {
      console.info("LINE webhook ignored:", {
        eventType: event.type,
        messageType: event.message?.type || null,
        sourceType: event.source?.type || null,
      });
      continue;
    }
    const text = event.message.text.trim();
    const lineUserId = event.source?.userId;
    const textInfo = describeLineLinkText(text, db);
    console.info("LINE webhook text received:", {
      sourceType: event.source?.type || null,
      hasUserId: Boolean(lineUserId),
      command: textInfo.command,
      codePrefix: textInfo.codePrefix,
      match: textInfo.match,
    });

    if (!lineUserId) {
      console.warn("LINE webhook skipped: missing source userId");
      continue;
    }

    const linked = linkUserByMessage(db, lineUserId, text);
    if (linked && event.replyToken) {
      console.info("LINE link success:", { role: linked.role, name: linked.name });
      await replyLineMessage(event.replyToken, `${linked.name}として連携しました。`);
    } else if (textInfo.command && event.replyToken) {
      console.warn("LINE link failed:", { reason: textInfo.reason, codePrefix: textInfo.codePrefix });
      await replyLineMessage(event.replyToken, getLineLinkHelpMessage(textInfo.reason));
    }
  }

  await writeDb(db);
  sendJson(response, 200, { ok: true });
}

function describeLineLinkText(text, db) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const command = normalized.startsWith("講師連携")
    ? "coach"
    : normalized.startsWith("連携")
      ? "student"
      : null;
  const [, code] = normalized.match(/^(?:連携|講師連携)\s+([A-Z0-9-]+)$/i) || [];
  const matchedUser = code
    ? Object.values(db.users).find((user) => user.linkCode.toUpperCase() === code.toUpperCase())
    : null;

  return {
    command,
    codePrefix: code ? `${code.slice(0, 5)}...` : null,
    match: Boolean(matchedUser),
    reason: code ? "unknown_code" : command ? "invalid_format" : "not_link_command",
  };
}

function getLineLinkHelpMessage(reason) {
  if (reason === "unknown_code") {
    return "連携コードが一致しませんでした。講師連携 COACH-1234 の形で、余分な文字を入れずに送ってください。";
  }
  return "連携メッセージの形式が違う可能性があります。講師連携 COACH-1234 の1行だけを送ってください。";
}

function linkUserByMessage(db, lineUserId, text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const [, code] = normalized.match(/^(?:連携|講師連携)\s+([A-Z0-9-]+)$/i) || [];
  if (!code) return null;

  for (const user of Object.values(db.users)) {
    if (user.linkCode.toUpperCase() === code.toUpperCase()) {
      user.lineUserId = lineUserId;
      user.linkedAt = new Date().toISOString();
      return user;
    }
  }

  return null;
}

async function saveDailyRecord(body) {
  const [record] = await saveDailyRecords([body]);
  return record;
}

async function saveDailyRecords(records) {
  const db = await readDb();
  const savedRecords = records.map((body) => ({
    id: randomUUID(),
    userId: "student",
    date: body.date || formatDateKey(new Date()),
    habitId: body.habitId,
    habitTitle: body.habitTitle || body.habitId,
    plannedMinimumAction: body.plannedMinimumAction || "",
    status: body.status || "done",
    mood: body.mood || "good",
    learningMinutes: body.learningMinutes || "",
    learningSessions: Array.isArray(body.learningSessions) ? body.learningSessions : [],
    learningStartTime: body.learningStartTime || "",
    learningEndTime: body.learningEndTime || "",
    blocker: body.blocker || "",
    blockerPreset: body.blockerPreset || "",
    blockerNote: body.blockerNote || "",
    note: body.note || "",
    createdAt: new Date().toISOString(),
  }));

  savedRecords.forEach((record) => {
    db.dailyRecords = db.dailyRecords.filter(
      (item) => !(item.userId === record.userId && item.date === record.date && item.habitId === record.habitId),
    );
    db.dailyRecords.push(record);
  });
  await writeDb(db);
  return savedRecords;
}

async function deleteDailyRecord(date, habitId) {
  if (!date || !habitId) return false;
  const db = await readDb();
  const beforeCount = db.dailyRecords.length;
  db.dailyRecords = db.dailyRecords.filter(
    (item) => !(item.userId === "student" && item.date === date && item.habitId === habitId),
  );
  await writeDb(db);
  return db.dailyRecords.length < beforeCount;
}

async function moveDailyRecordDate(fromDate, toDate, habitId) {
  if (!fromDate || !toDate || !habitId) return null;
  const db = await readDb();
  const record = db.dailyRecords.find(
    (item) => item.userId === "student" && item.date === fromDate && item.habitId === habitId,
  );
  if (!record) return null;

  const movedRecord = {
    ...record,
    date: toDate,
    updatedAt: new Date().toISOString(),
  };
  db.dailyRecords = db.dailyRecords.filter(
    (item) => !(item.userId === "student" && item.habitId === habitId && (item.date === fromDate || item.date === toDate)),
  );
  db.dailyRecords.push(movedRecord);
  await writeDb(db);
  return movedRecord;
}

async function updateDailyRecords(fromDate, records) {
  if (!isValidDateKey(fromDate) || !records.length) return [];
  const targetDate = records[0]?.date;
  if (!isValidDateKey(targetDate) || records.some((record) => record.date !== targetDate || !record.habitId)) {
    return [];
  }

  const db = await readDb();
  const sourceRecords = db.dailyRecords.filter(
    (record) => record.userId === "student" && record.date === fromDate,
  );
  const updatedAt = new Date().toISOString();
  const updatedRecords = records.flatMap((body) => {
    const sourceRecord = sourceRecords.find((record) => record.habitId === body.habitId);
    if (!sourceRecord) return [];
    return [{
      ...sourceRecord,
      date: targetDate,
      habitTitle: body.habitTitle || sourceRecord.habitTitle,
      plannedMinimumAction: body.plannedMinimumAction ?? sourceRecord.plannedMinimumAction,
      status: body.status || sourceRecord.status,
      mood: body.mood || sourceRecord.mood,
      learningMinutes: body.learningMinutes ?? sourceRecord.learningMinutes,
      learningSessions: Array.isArray(body.learningSessions) ? body.learningSessions : sourceRecord.learningSessions,
      learningStartTime: body.learningStartTime ?? sourceRecord.learningStartTime,
      learningEndTime: body.learningEndTime ?? sourceRecord.learningEndTime,
      blocker: body.blocker ?? sourceRecord.blocker,
      blockerPreset: body.blockerPreset ?? sourceRecord.blockerPreset,
      blockerNote: body.blockerNote ?? sourceRecord.blockerNote,
      note: body.note ?? sourceRecord.note,
      updatedAt,
    }];
  });

  if (updatedRecords.length !== records.length) return [];

  const updatedHabitIds = new Set(updatedRecords.map((record) => record.habitId));
  db.dailyRecords = db.dailyRecords.filter(
    (record) => !(
      record.userId === "student"
      && updatedHabitIds.has(record.habitId)
      && (record.date === fromDate || record.date === targetDate)
    ),
  );
  db.dailyRecords.push(...updatedRecords);
  await writeDb(db);
  return updatedRecords;
}

async function sendDailyReport(record, options = {}) {
  return sendDailyReportForDate(record.date, options);
}

async function sendDailyReportForDate(date, options = {}) {
  const db = await readDb();
  const records = db.dailyRecords.filter((record) => record.date === date);
  if (!records.length) {
    return { sent: false, reason: "no_records_for_date" };
  }

  const text = buildDailyReportMessage(db, date, options.style || "standard");
  if (options.target === "student") {
    const line = await sendLineDailyReportToStudent(db.users.student, text);
    return {
      sent: line.sent,
      reason: line.reason,
      target: "student",
      line,
      email: { sent: false, reason: "test_mode" },
    };
  }

  // Send the same daily report to the coach and to the student for confirmation.
  const line = await sendLineDailyReport(db.users.coach, db.users.student, text);
  const email = await sendEmailDailyReport(text, date);
  return {
    sent: line.sent,
    reason: line.reason,
    line,
    email,
  };
}

async function sendLineDailyReportToStudent(student, text) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN) {
    return { sent: false, reason: "missing_channel_access_token" };
  }
  if (!student?.lineUserId) {
    return { sent: false, reason: "student_not_linked" };
  }

  try {
    await pushLineMessage(student.lineUserId, text);
    return { sent: true, recipients: { student: { sent: true } } };
  } catch (error) {
    console.error("LINE self-test send failed:", error);
    return { sent: false, reason: "line_send_failed", recipients: { student: { sent: false } } };
  }
}

async function sendLineDailyReport(coach, student, text) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN) {
    return { sent: false, reason: "missing_channel_access_token" };
  }
  if (!coach.lineUserId) {
    return { sent: false, reason: "coach_not_linked" };
  }

  // Avoid duplicate LINE pushes when coach and student accidentally share the same stored ID.
  const recipients = [
    { key: "coach", lineUserId: coach.lineUserId },
    { key: "student", lineUserId: student?.lineUserId },
  ].filter((recipient, index, list) => (
    recipient.lineUserId
      && list.findIndex((item) => item.lineUserId === recipient.lineUserId) === index
  ));
  const results = {};

  try {
    for (const recipient of recipients) {
      await pushLineMessage(recipient.lineUserId, text);
      results[recipient.key] = { sent: true };
    }
    if (!student?.lineUserId) {
      results.student = { sent: false, reason: "student_not_linked" };
    }
    return { sent: true, recipients: results };
  } catch (error) {
    console.error("LINE report send failed:", error);
    return { sent: false, reason: "line_send_failed", recipients: results };
  }
}

async function sendEmailDailyReport(text, date) {
  const to = getReportEmailTo();
  if (!to) {
    return { sent: false, reason: "missing_email_to" };
  }
  // Prefer Google Apps Script because it works without a custom email domain.
  if (env.GOOGLE_SCRIPT_EMAIL_WEBHOOK_URL) {
    try {
      await sendEmailViaGoogleScript({
        to,
        subject: `太田の習慣レポート ${formatJapaneseDate(date)}`,
        text,
      });
      return { sent: true };
    } catch (error) {
      console.error("Google Script email send failed:", error);
      return { sent: false, reason: "email_send_failed" };
    }
  }
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return { sent: false, reason: "missing_email_config" };
  }

  try {
    await sendEmail({
      to,
      subject: `太田の習慣レポート ${formatJapaneseDate(date)}`,
      text,
    });
    return { sent: true };
  } catch (error) {
    console.error("Email report send failed:", error);
    return { sent: false, reason: "email_send_failed" };
  }
}

async function sendEmailViaGoogleScript({ to, subject, text }) {
  const emailResponse = await fetch(env.GOOGLE_SCRIPT_EMAIL_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({ to, subject, text }),
  });

  const responseText = await emailResponse.text();
  if (!emailResponse.ok || !responseText.includes('"ok":true')) {
    throw new Error(`Google Script email error ${emailResponse.status}: ${responseText}`);
  }
}

function buildDailyReportMessage(db, date, style = "standard") {
  const records = db.dailyRecords.filter((record) => record.date === date);
  if (style === "short") return buildShortDailyReportMessage(records, date);

  const lines = [
    "【太田の習慣レポート】",
    `記録日: ${formatJapaneseDate(date)}`,
    "",
    "【習慣別の記録】",
    ...records.flatMap((record, index) => formatDailyRecordSection(record, index, style)),
  ];
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function buildShortDailyReportMessage(records, date) {
  const doneCount = records.filter((record) => record.status === "done").length;
  const partialCount = records.filter((record) => record.status === "partial").length;
  const missedCount = records.filter((record) => record.status === "missed").length;
  const learningMinutes = records.reduce((total, record) => {
    const minutes = Number(record.learningMinutes);
    return Number.isFinite(minutes) ? total + minutes : total;
  }, 0);
  return [
    "【太田の習慣レポート】",
    `記録日: ${formatJapaneseDate(date)}`,
    `結果: できた${doneCount} / 少し${partialCount} / 未達${missedCount}`,
    learningMinutes ? `学習: ${formatDuration(learningMinutes)}` : "",
    "",
    ...records.map((record) => {
      const note = summarizeText(record.note || "", 42);
      return `・${record.habitTitle}: ${statusLabel(record.status)}${note ? ` / ${note}` : ""}`;
    }),
  ].filter(Boolean).join("\n").trim();
}

// Formats each habit block so LINE reports stay scannable even on a phone screen.
function formatDailyRecordSection(record, index, style = "standard") {
  const learningDuration = formatDuration(Number(record.learningMinutes));
  const lines = [
    `${index + 1}. ${record.habitTitle}`,
    `・結果: ${statusLabel(record.status)}`,
    record.plannedMinimumAction ? `・最低ライン: ${record.plannedMinimumAction}` : "",
    learningDuration ? `・学習時間: ${learningDuration}` : "",
    formatLearningTimeRange(record) ? `・時間帯: ${formatLearningTimeRange(record)}` : "",
  ].filter(Boolean);

  if (record.note) {
    if (style === "detailed") {
      lines.push("・メモ:");
      lines.push(...formatReportNote(record.note));
    } else {
      const summary = summarizeText(record.note, 70);
      if (summary) lines.push(`・メモ: ${summary}`);
    }
  }

  lines.push("");
  return lines;
}

function formatReportNote(note) {
  const lines = note.replace(/\r\n/g, "\n").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  return lines.map((line) => {
    const trimmedEnd = line.trimEnd();
    if (!trimmedEnd.trim()) return "";
    return `  ${normalizeReportNoteLine(trimmedEnd.trimStart())}`;
  });
}

function normalizeReportNoteLine(line) {
  const match = line.match(/^([PDCA])\s*[:：]\s*(.*)$/i);
  if (!match) return toPlainReportStyle(line);

  const labels = {
    P: "計画",
    D: "実行",
    C: "確認",
    A: "改善",
  };
  const code = match[1].toUpperCase();
  const label = labels[code];
  const body = toPlainReportStyle(match[2].replace(new RegExp(`^${label}\\s*[:：]?\\s*`), ""));
  return body ? `${code}：${label} ${body}` : `${code}：${label}`;
}

function summarizePdcaNote(note) {
  const sections = extractPdcaSections(note);
  if (!Object.keys(sections).length) return [];

  const labels = [
    ["計画", "P：計画"],
    ["実行", "D：実行"],
    ["確認", "C：確認"],
    ["改善", "A：改善"],
  ];

  return labels
    .map(([key, label]) => {
      const summary = summarizeText(sections[key] || "");
      return summary ? `${label} ${summary}` : "";
    })
    .filter(Boolean);
}

// Splits a note into Japanese PDCA headings so each section can be summarized.
function extractPdcaSections(note) {
  const sections = {};
  let currentKey = "";

  note.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    const heading = line.match(/^(?:[PDCA]\s*[:：]\s*)?(計画|実行|確認|改善)\s*[:：]?\s*(.*)$/i);
    if (heading) {
      currentKey = heading[1];
      sections[currentKey] = [sections[currentKey], heading[2]].filter(Boolean).join(" ");
      return;
    }

    const pdcaHeading = line.match(/^([PDCA])\s*[:：]\s*(.*)$/i);
    if (pdcaHeading) {
      currentKey = { P: "計画", D: "実行", C: "確認", A: "改善" }[pdcaHeading[1].toUpperCase()];
      sections[currentKey] = [sections[currentKey], pdcaHeading[2]].filter(Boolean).join(" ");
      return;
    }

    if (currentKey) {
      sections[currentKey] = [sections[currentKey], line].filter(Boolean).join(" ");
    }
  });

  return sections;
}

function summarizeText(text, maxLength = 58) {
  const normalized = toPlainReportStyle(text).replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const firstSentence = normalized.split(/(?<=[。！？!?])\s*/)[0] || normalized;
  if (firstSentence.length <= maxLength) return firstSentence;
  return `${firstSentence.slice(0, maxLength - 1)}…`;
}

function toPlainReportStyle(text) {
  return text
    .replace(/しました/g, "した")
    .replace(/しています/g, "している")
    .replace(/できています/g, "できている")
    .replace(/できました/g, "できた")
    .replace(/あります/g, "ある")
    .replace(/ありません/g, "ない")
    .replace(/なりました/g, "なった")
    .replace(/進めます/g, "進める")
    .replace(/確認します/g, "確認する")
    .replace(/送信します/g, "送信する")
    .replace(/行いました/g, "行った")
    .replace(/でした/g, "だった")
    .replace(/です/g, "だ")
    .replace(/ます/g, "る");
}

function buildDailyReportSummary(records) {
  const doneCount = records.filter((record) => record.status === "done").length;
  const partialCount = records.filter((record) => record.status === "partial").length;
  const missedCount = records.filter((record) => record.status === "missed").length;
  const learningMinutes = records.reduce((total, record) => {
    const minutes = Number(record.learningMinutes);
    return Number.isFinite(minutes) ? total + minutes : total;
  }, 0);
  const statusText = `できた ${doneCount} / 少し ${partialCount} / 難しい ${missedCount}`;
  const followText = missedCount ? "あり" : "なし";
  return {
    overviewText: buildDailyOverviewText(records, { doneCount, partialCount, missedCount, learningMinutes }),
    statusText,
    followText,
    learningText: learningMinutes ? `学習合計: ${formatDuration(learningMinutes)}` : "",
  };
}

// Turns numeric status counts into a short natural-language summary.
function buildDailyOverviewText(records, { doneCount, partialCount, missedCount, learningMinutes }) {
  const totalCount = records.length;
  const learningText = learningMinutes ? `学習は${formatDuration(learningMinutes)}行った` : "";
  if (totalCount && doneCount === totalCount) {
    return [`今日は${totalCount}項目すべて達成できた`, learningText].filter(Boolean).join("。") + "。";
  }
  if (missedCount) {
    return [`今日は${doneCount}項目達成、${missedCount}項目は未達だった`, learningText].filter(Boolean).join("。") + "。";
  }
  if (partialCount) {
    return [`今日は${doneCount}項目達成、${partialCount}項目は一部実施だった`, learningText].filter(Boolean).join("。") + "。";
  }
  return learningText ? `${learningText}。` : "今日の記録を送信した。";
}

function formatLearningTimeRange(record) {
  if (Array.isArray(record.learningSessions) && record.learningSessions.length) {
    return record.learningSessions
      .map((session) => {
        const startTime = typeof session.startTime === "string" ? session.startTime : "";
        const endTime = typeof session.endTime === "string" ? session.endTime : "";
        if (startTime && endTime) return `${startTime}〜${endTime}`;
        if (startTime) return `${startTime}〜`;
        if (endTime) return `〜${endTime}`;
        return "";
      })
      .filter(Boolean)
      .join(" / ");
  }
  if (record.learningStartTime && record.learningEndTime) {
    return `${record.learningStartTime}〜${record.learningEndTime}`;
  }
  if (record.learningStartTime) return `${record.learningStartTime}〜`;
  if (record.learningEndTime) return `〜${record.learningEndTime}`;
  return "";
}

function formatDuration(totalMinutes) {
  const minutesValue = Number(totalMinutes);
  if (!Number.isFinite(minutesValue) || minutesValue <= 0) return "";
  const hours = Math.floor(minutesValue / 60);
  const minutes = minutesValue % 60;
  if (hours && minutes) return `${hours}時間${String(minutes).padStart(2, "0")}分`;
  if (hours) return `${hours}時間`;
  return `${minutes}分`;
}

async function replyLineMessage(replyToken, text) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN) return;
  await callLineApi("https://api.line.me/v2/bot/message/reply", {
    replyToken,
    messages: [{ type: "text", text }],
  });
}

async function pushLineMessage(to, text) {
  await callLineApi("https://api.line.me/v2/bot/message/push", {
    to,
    messages: [buildLineReportFlexMessage(text)],
  });
}

// Sends a light-background LINE Flex Message so the report is readable in dark mode.
function buildLineReportFlexMessage(text) {
  return {
    type: "flex",
    altText: "太田の習慣レポート",
    contents: {
      type: "bubble",
      size: "mega",
      styles: {
        header: { backgroundColor: "#E8F8E7" },
        body: { backgroundColor: "#FFFEF9" },
      },
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "18px",
        contents: [
          {
            type: "text",
            text: "太田習慣コーチからの報告",
            color: "#24734D",
            size: "sm",
            weight: "bold",
          },
          {
            type: "text",
            text: "太田の習慣レポート",
            color: "#1F3327",
            size: "xl",
            weight: "bold",
            wrap: true,
            margin: "sm",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "18px",
        contents: buildLineReportFlexContents(text),
      },
    },
  };
}

// Converts the plain report text into compact Flex Message rows.
function buildLineReportFlexContents(text) {
  return text
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      if (/^【.+】$/.test(line)) {
        return [{
          type: "text",
          text: line.replace(/[【】]/g, ""),
          color: "#24734D",
          size: "md",
          weight: "bold",
          wrap: true,
          margin: "md",
        }];
      }
      if (/^\d+\.\s/.test(line)) {
        return [
          { type: "separator", margin: "md", color: "#D7E8DC" },
          {
            type: "text",
            text: line,
            color: "#1F3327",
            size: "md",
            weight: "bold",
            wrap: true,
            margin: "md",
          },
        ];
      }
      if (/^(?:[PDCA]\s*[:：]\s*)?(計画|実行|確認|改善)/.test(line)) {
        return [{
          type: "text",
          text: line,
          color: "#2F73AD",
          size: "sm",
          weight: "bold",
          wrap: true,
          margin: "sm",
        }];
      }
      return [{
        type: "text",
        text: line,
        color: line.startsWith("・") ? "#2D3D33" : "#3E4C43",
        size: "sm",
        wrap: true,
        margin: line.startsWith("・") ? "xs" : "none",
      }];
    });
}

async function sendEmail({ to, subject, text }) {
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject,
      text,
    }),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    throw new Error(`Email API error ${emailResponse.status}: ${errorText}`);
  }
}

function getReportEmailTo() {
  return env.REPORT_EMAIL_TO || env.COACH_EMAIL_TO || "";
}

async function callLineApi(url, body) {
  const lineResponse = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!lineResponse.ok) {
    const errorText = await lineResponse.text();
    throw new Error(`LINE API error ${lineResponse.status}: ${errorText}`);
  }
}

function verifyLineSignature(rawBody, signature) {
  if (!env.LINE_CHANNEL_SECRET) return true;
  if (!signature) return false;

  const expected = createHmac("sha256", env.LINE_CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length
    && timingSafeEqual(expectedBuffer, signatureBuffer);
}

async function serveStatic(response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requestedPath).replace(/^[/\\]+/, "").replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(rootDir, safePath);

  if (!filePath.startsWith(rootDir)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      sendText(response, 404, "Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    sendText(response, 404, "Not found");
  }
}

async function ensureDb() {
  await mkdir(dataDir, { recursive: true });
  try {
    await stat(dbPath);
    await hydrateDbFromEnv();
  } catch {
    await writeDb({
      users: {
        student: {
          id: "student",
          name: "太田さん",
          role: "student",
          lineUserId: env.STUDENT_LINE_USER_ID || null,
          linkCode: env.STUDENT_LINK_CODE || createLinkCode("OTA"),
        },
        coach: {
          id: "coach",
          name: "講師",
          role: "coach",
          lineUserId: env.COACH_LINE_USER_ID || null,
          linkCode: env.COACH_LINK_CODE || createLinkCode("COACH"),
        },
      },
      coachLinks: [{ studentUserId: "student", coachUserId: "coach" }],
      dailyRecords: [],
    });
  }
}

async function hydrateDbFromEnv() {
  const db = await readDb();
  let changed = false;

  if (env.STUDENT_LINK_CODE && db.users.student.linkCode !== env.STUDENT_LINK_CODE) {
    db.users.student.linkCode = env.STUDENT_LINK_CODE;
    changed = true;
  }
  if (env.COACH_LINK_CODE && db.users.coach.linkCode !== env.COACH_LINK_CODE) {
    db.users.coach.linkCode = env.COACH_LINK_CODE;
    changed = true;
  }
  if (env.STUDENT_LINE_USER_ID && db.users.student.lineUserId !== env.STUDENT_LINE_USER_ID) {
    db.users.student.lineUserId = env.STUDENT_LINE_USER_ID;
    db.users.student.linkedAt = db.users.student.linkedAt || new Date().toISOString();
    changed = true;
  }
  if (env.COACH_LINE_USER_ID && db.users.coach.lineUserId !== env.COACH_LINE_USER_ID) {
    db.users.coach.lineUserId = env.COACH_LINE_USER_ID;
    db.users.coach.linkedAt = db.users.coach.linkedAt || new Date().toISOString();
    changed = true;
  }

  if (changed) await writeDb(db);
}

async function readDb() {
  return JSON.parse(await readFile(dbPath, "utf8"));
}

async function writeDb(db) {
  await writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`);
}

async function readJsonBody(request) {
  const rawBody = await readRawBody(request);
  return rawBody ? JSON.parse(rawBody) : {};
}

async function readRawBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(body);
}

async function loadEnv() {
  const loadedEnv = { ...process.env };
  try {
    const contents = await readFile(join(rootDir, ".env"), "utf8");
    contents.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const [key, ...valueParts] = trimmed.split("=");
      if (loadedEnv[key] === undefined) {
        loadedEnv[key] = valueParts.join("=");
      }
    });
  } catch {
    // .env is optional for local UI work.
  }
  return loadedEnv;
}

function createLinkCode(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function statusLabel(status) {
  return {
    done: "できた",
    partial: "少しだけ",
    missed: "未達",
  }[status] || status;
}

function moodLabel(mood) {
  return {
    great: "かなり良い",
    good: "良い",
    flat: "普通",
    tired: "疲れた",
    hard: "しんどい",
  }[mood] || mood || "未記録";
}

function formatJapaneseDate(dateKey) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || "")) return false;
  const parsed = new Date(`${dateKey}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && formatDateKey(parsed) === dateKey;
}
