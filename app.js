const STORAGE_KEY = "otaHabitCoach:v2";
const TEST_CHECKLIST_STORAGE_KEY = "otaHabitCoach:testChecklist:v1";
const API_BASE = "";

const today = new Date();
const todayKey = formatDateKey(today);

const defaultHabits = [
  {
    id: "strength",
    category: "strength",
    title: "筋トレ",
    minimumAction: "腕立て1回、またはスクワット1回",
    preferredTime: "morning",
    active: true,
  },
  {
    id: "learning",
    category: "learning",
    title: "学習",
    minimumAction: "教材を1分だけ開く、またはコードを1行読む",
    preferredTime: "morning",
    active: true,
  },
  {
    id: "sleep",
    category: "sleep",
    title: "睡眠",
    minimumAction: "寝る30分前に画面を閉じる、または布団に入る時間を決める",
    preferredTime: "morning",
    active: true,
  },
];

const categoryLabels = {
  strength: "筋トレ",
  learning: "学習",
  sleep: "睡眠",
};

const statusLabels = {
  done: "できた",
  partial: "少しだけ",
  missed: "未達",
};

const moodLabels = {
  great: "かなり良い",
  good: "良い",
  flat: "普通",
  tired: "疲れた",
  hard: "しんどい",
};

const reportStyleLabels = {
  short: "短め",
  standard: "標準",
  detailed: "詳しめ",
};

const conditionLabels = {
  good: "元気な日",
  normal: "普通の日",
  tired: "疲れた日",
};

const adaptiveMinimums = {
  strength: {
    good: "腕立て5回、またはスクワット10回",
    normal: "腕立て1回、またはスクワット1回",
    tired: "立ち上がって深呼吸1回",
    recovery: "スクワット1回だけ",
  },
  learning: {
    good: "教材を10分進める、またはコードを5行読む",
    normal: "教材を1分だけ開く、またはコードを1行読む",
    tired: "教材のタイトルを見るだけ",
    recovery: "学習ページを開くだけ",
  },
  sleep: {
    good: "寝る30分前に画面を閉じる",
    normal: "布団に入る時間を決める",
    tired: "布団に入る時間だけ決める",
    recovery: "スマホを枕元から離すだけ",
  },
};

const blockerPatterns = [
  { label: "疲れ", words: ["疲", "眠", "だる", "しんど", "体力"] },
  { label: "時間不足", words: ["時間", "忙", "残業", "予定", "遅"] },
  { label: "忘れ", words: ["忘", "うっかり"] },
  { label: "やる気", words: ["やる気", "面倒", "めんど", "気分"] },
];

const testChecklistItems = [
  { id: "open_app", group: "基本表示", label: "アプリを開いて今日の記録画面が表示される" },
  { id: "date_label", group: "基本表示", label: "記録日が分かる" },
  { id: "habit_cards", group: "今日の記録", label: "筋トレ・学習・睡眠カードが表示される" },
  { id: "card_toggle", group: "今日の記録", label: "各カードを開閉できる" },
  { id: "status_input", group: "今日の記録", label: "できた・少し・未達を選択できる" },
  { id: "memo_input", group: "今日の記録", label: "ひとことメモを入力できる" },
  { id: "learning_time", group: "今日の記録", label: "学習時間帯を入力し、時間を確認できる" },
  { id: "minimum_edit", group: "今日の記録", label: "今日の目安を編集できる" },
  { id: "report_readiness", group: "LINE報告", label: "報告できる状態や未保存理由が表示される" },
  { id: "preview", group: "LINE報告", label: "保存前にLINE文面を確認できる" },
  { id: "send", group: "LINE報告", label: "保存してLINE報告の状態を確認できる" },
  { id: "line_panel", group: "LINE報告", label: "LINE連携状態を確認できる" },
  { id: "calendar", group: "履歴・確認", label: "カレンダーで過去記録を確認できる" },
  { id: "history_filter", group: "履歴・確認", label: "履歴を月・習慣・結果・メモで絞り込める" },
  { id: "scroll_top", group: "スマホ・操作性", label: "下まで移動した時に上へ戻れる" },
  { id: "mobile", group: "スマホ・操作性", label: "スマホ幅でもボタンと文字が見やすい" },
];

const uiuxImprovementItems = [
  {
    title: "LINE報告できない理由の見える化",
    issue: "送信できない時に、サーバー停止・未保存・連携不足のどれが原因か分かりにくかった。",
    fix: "記録画面に報告状態を表示し、今日の記録未保存やAPI未接続を案内するようにした。",
    status: "修正済み",
  },
  {
    title: "保存前の安心感",
    issue: "保存前に、講師へ送る文面が分からないまま送信する不安があった。",
    fix: "保存前にLINE文面をモーダルで確認できるようにした。",
    status: "修正済み",
  },
  {
    title: "履歴の探しやすさ",
    issue: "記録が増えると、目的の日付や内容を探しにくくなる。",
    fix: "履歴を月ごとに区切り、月・習慣・結果・メモ検索で絞り込めるようにした。",
    status: "修正済み",
  },
  {
    title: "スマホでの操作性",
    issue: "スマホ幅では結果の文字が折り返され、小さい操作ボタンも押しにくかった。",
    fix: "結果を1行で読める文字サイズに調整し、主要な小ボタンを40pxの高さに広げた。チェックリストと履歴フィルターも縦並びにした。",
    status: "修正済み",
  },
  {
    title: "講師課題の確認しやすさ",
    issue: "テスト項目や改善内容が資料だけだと、実際のアプリ確認と結びつきにくい。",
    fix: "アプリ内にテスト確認欄とUI/UX改善リストを追加した。",
    status: "修正済み",
  },
];

// Maps common spoken Japanese words to the form values used by the app.
const recognitionKeywordMap = {
  habit: [
    { value: "strength", words: ["筋トレ", "トレーニング", "運動", "腕立て", "スクワット"] },
    { value: "learning", words: ["学習", "勉強", "プログラミング", "コード", "教材"] },
    { value: "sleep", words: ["睡眠", "寝る", "寝た", "眠る", "就寝"] },
  ],
  condition: [
    { value: "good", words: ["元気", "良い", "いい", "余裕", "調子いい"] },
    { value: "tired", words: ["疲れた", "眠い", "だるい", "しんどい", "きつい"] },
    { value: "normal", words: ["普通", "ふつう", "まあまあ", "いつも通り"] },
  ],
  status: [
    { value: "missed", words: ["できなかった", "無理", "未達", "やれなかった", "サボ"] },
    { value: "partial", words: ["少し", "ちょっと", "一部", "途中", "少しだけ"] },
    { value: "done", words: ["できた", "やった", "完了", "達成", "終わった"] },
  ],
  mood: [
    { value: "great", words: ["かなり良い", "最高", "元気", "とても良い"] },
    { value: "hard", words: ["しんどい", "つらい", "辛い", "きつい", "悪い"] },
    { value: "tired", words: ["疲れた", "眠い", "だるい"] },
    { value: "flat", words: ["普通", "まあまあ", "ふつう"] },
    { value: "good", words: ["良い", "いい", "大丈夫"] },
  ],
};

let activeRecognition = null;
let activeVoiceTarget = null;
let activeVoiceSession = null;
let calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedCalendarDate = todayKey;
let focusTimerInterval = null;
let focusTimerDurationSeconds = 25 * 60;
let focusTimerRemainingSeconds = focusTimerDurationSeconds;
let focusTimerStartedAt = null;
let latestLineHealth = null;
let latestLinkStatus = null;
let latestWeeklyReports = [];
let latestReportLogs = [];
let editingRecordDate = null;
let recordEditReturnFocus = null;
const continuousVoiceTargets = new Set(["note", "habitTitle", "habitMinimum"]);
const voiceRestartDelayMs = 600;
const maxVoiceRestarts = Number.POSITIVE_INFINITY;

const state = loadState();

const elements = {
  todayLabel: document.querySelector("#todayLabel"),
  dailyFormTitle: document.querySelector("#dailyFormTitle"),
  recordDateLabel: document.querySelector("#recordDateLabel"),
  resetRecordDateButton: document.querySelector("#resetRecordDateButton"),
  todayPromises: document.querySelector("#todayPromises"),
  calendarPanel: document.querySelector("#calendarPanel"),
  habitSelect: document.querySelector("#habitSelect"),
  dailyForm: document.querySelector("#dailyForm"),
  multiHabitRecords: document.querySelector("#multiHabitRecords"),
  learningTimeField: document.querySelector("#learningTimeField"),
  learningSessionField: document.querySelector("#learningSessionField"),
  focusTimer: document.querySelector("#focusTimer"),
  timerDisplay: document.querySelector("#timerDisplay"),
  timerToggleButton: document.querySelector("#timerToggleButton"),
  timerResetButton: document.querySelector("#timerResetButton"),
  learningMinutes: document.querySelector("#learningMinutes"),
  learningDurationDisplay: document.querySelector("#learningDurationDisplay"),
  learningSessionList: document.querySelector("#learningSessionList"),
  addLearningSessionButton: document.querySelector("#addLearningSessionButton"),
  mood: document.querySelector("#mood"),
  blockerPreset: document.querySelector("#blockerPreset"),
  blocker: document.querySelector("#blocker"),
  note: document.querySelector("#note"),
  historyList: document.querySelector("#historyList"),
  historyMonthFilter: document.querySelector("#historyMonthFilter"),
  historyHabitFilter: document.querySelector("#historyHabitFilter"),
  historyStatusFilter: document.querySelector("#historyStatusFilter"),
  historySearchInput: document.querySelector("#historySearchInput"),
  testCheckList: document.querySelector("#testCheckList"),
  testProgressStatus: document.querySelector("#testProgressStatus"),
  resetTestChecklistButton: document.querySelector("#resetTestChecklistButton"),
  uiuxImprovementList: document.querySelector("#uiuxImprovementList"),
  coachType: document.querySelector("#coachType"),
  coachTitle: document.querySelector("#coachTitle"),
  coachBody: document.querySelector("#coachBody"),
  returnCount: document.querySelector("#returnCount"),
  minimumWins: document.querySelector("#minimumWins"),
  moodTrend: document.querySelector("#moodTrend"),
  resetDataButton: document.querySelector("#resetDataButton"),
  minimumSuggestion: document.querySelector("#minimumSuggestion"),
  blockerInsights: document.querySelector("#blockerInsights"),
  weeklyReview: document.querySelector("#weeklyReview"),
  refreshLineStatusButton: document.querySelector("#refreshLineStatusButton"),
  studentLinkCode: document.querySelector("#studentLinkCode"),
  coachLinkCode: document.querySelector("#coachLinkCode"),
  studentLinkStatus: document.querySelector("#studentLinkStatus"),
  coachLinkStatus: document.querySelector("#coachLinkStatus"),
  lineReportStatus: document.querySelector("#lineReportStatus"),
  previewDailyReportButton: document.querySelector("#previewDailyReportButton"),
  dailyPreviewReportButton: document.querySelector("#dailyPreviewReportButton"),
  selfTestReportButton: document.querySelector("#selfTestReportButton"),
  sendSelfTestReportButton: document.querySelector("#sendSelfTestReportButton"),
  sendDailyReportButton: document.querySelector("#sendDailyReportButton"),
  lineReportPreview: document.querySelector("#lineReportPreview"),
  dailyLineReportPreview: document.querySelector("#dailyLineReportPreview"),
  modalLineReportPreview: document.querySelector("#modalLineReportPreview"),
  reportPreviewModal: document.querySelector("#reportPreviewModal"),
  closeReportPreviewButton: document.querySelector("#closeReportPreviewButton"),
  recordEditModal: document.querySelector("#recordEditModal"),
  recordEditForm: document.querySelector("#recordEditForm"),
  recordEditDate: document.querySelector("#recordEditDate"),
  recordEditSummary: document.querySelector("#recordEditSummary"),
  recordEditList: document.querySelector("#recordEditList"),
  recordEditStatus: document.querySelector("#recordEditStatus"),
  closeRecordEditButton: document.querySelector("#closeRecordEditButton"),
  cancelRecordEditButton: document.querySelector("#cancelRecordEditButton"),
  scrollTopButton: document.querySelector("#scrollTopButton"),
  reportReadinessStatus: document.querySelector("#reportReadinessStatus"),
  recordSaveStatus: document.querySelector("#recordSaveStatus"),
  dailyReportStyle: document.querySelector("#dailyReportStyle"),
  weeklyReportStyle: document.querySelector("#weeklyReportStyle"),
  buildWeeklyReportButton: document.querySelector("#buildWeeklyReportButton"),
  copyWeeklyReportButton: document.querySelector("#copyWeeklyReportButton"),
  saveWeeklyReportPageButton: document.querySelector("#saveWeeklyReportPageButton"),
  weeklyReportPreview: document.querySelector("#weeklyReportPreview"),
  weeklyReportStatus: document.querySelector("#weeklyReportStatus"),
  weeklyReportHistory: document.querySelector("#weeklyReportHistory"),
  weeklyScoreGrid: document.querySelector("#weeklyScoreGrid"),
  missingRecordPanel: document.querySelector("#missingRecordPanel"),
  weeklyEditDate: document.querySelector("#weeklyEditDate"),
  openWeeklyEditButton: document.querySelector("#openWeeklyEditButton"),
  latestWeeklyReportUrl: document.querySelector("#latestWeeklyReportUrl"),
  latestReportLog: document.querySelector("#latestReportLog"),
  submissionTestStatus: document.querySelector("#submissionTestStatus"),
  reportLogList: document.querySelector("#reportLogList"),
  lineWebhookStatus: document.querySelector("#lineWebhookStatus"),
  calendarMonthLabel: document.querySelector("#calendarMonthLabel"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarDetail: document.querySelector("#calendarDetail"),
  previousMonthButton: document.querySelector("#previousMonthButton"),
  nextMonthButton: document.querySelector("#nextMonthButton"),
  pageTabs: document.querySelector(".page-tabs"),
  voiceButtons: document.querySelectorAll("[data-voice-target]"),
  voiceStatus: document.querySelector("#voiceStatus"),
};

init();

function init() {
  if (elements.todayLabel) elements.todayLabel.textContent = formatDisplayDate(today);
  populateHabitSelects();
  elements.dailyForm.addEventListener("submit", handleDailyRecord);
  elements.multiHabitRecords.addEventListener("input", handleMultiHabitRecordsInput);
  elements.multiHabitRecords.addEventListener("click", handleMultiHabitRecordsClick);
  elements.multiHabitRecords.addEventListener("submit", handleMultiHabitRecordsSubmit);
  elements.habitSelect.addEventListener("change", updatePlanInput);
  elements.learningSessionList.addEventListener("input", syncLearningMinutesFromTimeRange);
  elements.learningSessionList.addEventListener("click", handleLearningSessionListClick);
  elements.addLearningSessionButton.addEventListener("click", () => {
    addLearningSessionRow();
    syncLearningMinutesFromTimeRange();
  });
  elements.timerToggleButton.addEventListener("click", toggleFocusTimer);
  elements.timerResetButton.addEventListener("click", resetFocusTimer);
  document.querySelectorAll("[data-timer-minutes]").forEach((button) => {
    button.addEventListener("click", () => setFocusTimerDuration(Number(button.dataset.timerMinutes)));
  });
  elements.previousMonthButton?.addEventListener("click", () => changeCalendarMonth(-1));
  elements.nextMonthButton?.addEventListener("click", () => changeCalendarMonth(1));
  elements.todayLabel?.addEventListener("click", toggleCalendarPanel);
  elements.resetRecordDateButton.addEventListener("click", () => selectRecordDate(todayKey));
  elements.refreshLineStatusButton.addEventListener("click", loadLineLinkStatus);
  elements.previewDailyReportButton.addEventListener("click", previewDailyReport);
  elements.dailyPreviewReportButton.addEventListener("click", previewDailyReport);
  elements.selfTestReportButton?.addEventListener("click", handleSelfTestReport);
  elements.sendSelfTestReportButton?.addEventListener("click", sendSelfTestReportAgain);
  elements.closeReportPreviewButton?.addEventListener("click", closeReportPreviewModal);
  elements.reportPreviewModal?.addEventListener("click", (event) => {
    if (event.target.matches("[data-report-preview-close]")) closeReportPreviewModal();
  });
  elements.recordEditForm?.addEventListener("submit", handleRecordEditSubmit);
  elements.closeRecordEditButton?.addEventListener("click", closeRecordEditModal);
  elements.cancelRecordEditButton?.addEventListener("click", closeRecordEditModal);
  elements.recordEditModal?.addEventListener("click", (event) => {
    if (event.target.matches("[data-record-edit-close]")) closeRecordEditModal();
  });
  elements.recordEditList?.addEventListener("input", handleRecordEditListInput);
  elements.recordEditList?.addEventListener("click", handleRecordEditListClick);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeReportPreviewModal();
    closeRecordEditModal();
  });
  document.querySelector(".app-shell")?.addEventListener("scroll", updateScrollTopButton);
  elements.scrollTopButton?.addEventListener("click", scrollToTop);
  elements.pageTabs?.addEventListener("click", handlePageTabClick);
  elements.sendDailyReportButton.addEventListener("click", sendDailyReportAgain);
  elements.buildWeeklyReportButton?.addEventListener("click", buildAndShowWeeklyReport);
  elements.copyWeeklyReportButton?.addEventListener("click", copyWeeklyReport);
  elements.saveWeeklyReportPageButton?.addEventListener("click", saveWeeklyReportPage);
  elements.openWeeklyEditButton?.addEventListener("click", openWeeklyEditDate);
  elements.weeklyReportStyle?.addEventListener("change", () => {
    if (!elements.weeklyReportPreview?.hidden) buildAndShowWeeklyReport();
  });
  elements.dailyReportStyle?.addEventListener("change", () => {
    if (!elements.dailyLineReportPreview?.hidden || !elements.lineReportPreview?.hidden) previewDailyReport();
  });
  [elements.historyMonthFilter, elements.historyHabitFilter, elements.historyStatusFilter].forEach((filter) => {
    filter?.addEventListener("change", renderHistory);
  });
  elements.historySearchInput?.addEventListener("input", renderHistory);
  elements.testCheckList?.addEventListener("change", handleTestChecklistChange);
  elements.resetTestChecklistButton?.addEventListener("click", resetTestChecklist);
  elements.resetDataButton.addEventListener("click", resetData);
  setupVoiceInput();
  renderMultiHabitRecordForms();
  if (elements.weeklyEditDate) elements.weeklyEditDate.value = todayKey;
  updatePlanInput();
  renderFocusTimer();
  renderTestChecklist();
  renderUiuxImprovements();
  render();
  updateScrollTopButton();
  loadLineLinkStatus();
  loadServerRecords();
  loadWeeklyReports();
  loadReportLogs();
}

function setupVoiceInput() {
  const recognitionSupported = Boolean(getSpeechRecognitionConstructor());
  elements.voiceStatus.textContent = recognitionSupported
    ? "マイクを押すと聞き取ります。文章入力は無言でも待機し、同じマイクでもう一度停止します。"
    : "このブラウザでは音声認識を開始できません。ChromeまたはSafariで開いて、マイク許可をオンにしてください。";
  getVoiceButtons().forEach((button) => {
    button.classList.toggle("needs-support", !recognitionSupported);
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-voice-target]");
    if (!button) return;
    startVoiceInput(button.dataset.voiceTarget);
  });
}

// Starts voice input after checking browser support and requesting microphone access.
async function startVoiceInput(target) {
  const SpeechRecognition = getSpeechRecognitionConstructor();
  if (!SpeechRecognition) {
    elements.voiceStatus.textContent = "このブラウザでは音声認識を開始できません。ChromeまたはSafariで開いて、マイク許可をオンにしてください。";
    updateVoiceButtons(null);
    return;
  }

  if (activeVoiceSession || activeRecognition) {
    if (activeVoiceTarget === target) {
      stopVoiceInput("音声入力を停止しました。");
      return;
    }
    stopVoiceInput("");
  }

  updateVoiceButtons(target);
  elements.voiceStatus.textContent = "マイクの許可を確認しています。許可ダイアログが出たら「許可」を選んでください。";

  const microphoneAccess = await requestMicrophoneAccess();
  if (!microphoneAccess.ok) {
    updateVoiceButtons(null);
    elements.voiceStatus.textContent = microphoneAccess.message;
    return;
  }

  beginVoiceRecognition(target, SpeechRecognition);
}

function beginVoiceRecognition(target, SpeechRecognition = getSpeechRecognitionConstructor()) {
  const recognition = new SpeechRecognition();
  const shouldKeepListening = true;
  const continueAfterResult = continuousVoiceTargets.has(getVoiceTargetKind(target));
  const session = activeVoiceSession && activeVoiceTarget === target
    ? activeVoiceSession
    : createVoiceSession(target, shouldKeepListening, continueAfterResult);
  activeVoiceSession = session;
  activeRecognition = recognition;
  activeVoiceTarget = target;
  recognition.lang = "ja-JP";
  recognition.interimResults = continueAfterResult;
  recognition.continuous = true;

  recognition.addEventListener("start", () => {
    updateVoiceButtons(target);
    elements.voiceStatus.textContent = `${getVoiceTargetLabel(target)}を聞き取り中。無言でも待機します。停止は同じマイクです。`;
  });

  recognition.addEventListener("result", (event) => {
    session.restartCount = 0;
    if (continueAfterResult) {
      applyContinuousVoiceResult(target, session, event);
      return;
    }

    const latestResult = event.results[event.results.length - 1];
    if (!latestResult.isFinal) return;
    const transcript = cleanVoiceTranscript(latestResult[0].transcript);
    session.restartCount = 0;
    applyVoiceTranscript(target, transcript);
  });

  recognition.addEventListener("error", (event) => {
    if (session.shouldStop || event.error === "aborted") {
      return;
    }

    if (!session.shouldStop && isRecoverableVoiceError(event.error)) {
      elements.voiceStatus.textContent = "待機中です。少し間が空いても、そのまま話し続けられます。";
      return;
    }
    session.shouldStop = true;
    elements.voiceStatus.textContent = getRecognitionErrorMessage(event.error);
  });

  recognition.addEventListener("end", () => {
    if (activeRecognition === recognition) {
      activeRecognition = null;
    }
    if (shouldKeepListening && !session.shouldStop && activeVoiceTarget === target && session.restartCount < maxVoiceRestarts) {
      session.restartCount += 1;
      window.setTimeout(() => {
        if (!session.shouldStop && activeVoiceTarget === target) {
          beginVoiceRecognition(target, SpeechRecognition);
        }
      }, voiceRestartDelayMs);
      return;
    }
    if (!session.shouldStop && session.restartCount >= maxVoiceRestarts) {
      elements.voiceStatus.textContent = "長く待機したため停止しました。もう一度マイクを押すと再開します。";
    }
    if (session.shouldStop && session.finalText) {
      elements.voiceStatus.textContent = "音声入力を反映しました。";
    }
    activeVoiceTarget = null;
    activeVoiceSession = null;
    updateVoiceButtons(null);
  });

  try {
    recognition.start();
  } catch (error) {
    activeRecognition = null;
    activeVoiceTarget = null;
    activeVoiceSession = null;
    updateVoiceButtons(null);
    elements.voiceStatus.textContent = `音声認識を開始できませんでした。ページを再読み込みしてもう一度試してください。(${error.name})`;
  }
}

function isRecoverableVoiceError(error) {
  return error === "no-speech" || error === "aborted";
}

function createVoiceSession(target, shouldKeepListening, continueAfterResult) {
  return {
    target,
    shouldKeepListening,
    continueAfterResult,
    shouldStop: false,
    restartCount: 0,
    baseText: getVoiceTargetValue(target),
    finalText: "",
  };
}

function applyContinuousVoiceResult(target, session, event) {
  let finalChunk = "";
  let interimChunk = "";

  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    const transcript = cleanVoiceTranscript(result[0].transcript);
    if (!transcript) continue;
    if (result.isFinal) {
      finalChunk = appendVoiceText(finalChunk, transcript);
    } else {
      interimChunk = appendVoiceText(interimChunk, transcript);
    }
  }

  if (finalChunk) {
    session.finalText = appendVoiceText(session.finalText, finalChunk);
  }

  const liveText = appendVoiceText(session.finalText, interimChunk);
  setVoiceTargetValue(target, session.baseText, liveText);
  elements.voiceStatus.textContent = interimChunk
    ? "聞き取り中です。話した内容をそのまま入力しています。"
    : "入力しました。続けて話せます。";
}

function getVoiceTargetValue(target) {
  const scoped = getScopedVoiceTarget(target);
  if (scoped.card) {
    if (scoped.kind === "blocker") return scoped.card.querySelector(".multi-blocker-note")?.value.trim() || "";
    if (scoped.kind === "note") return scoped.card.querySelector(".multi-note")?.value.trim() || "";
    if (scoped.kind === "habitMinimum") return scoped.card.querySelector(".multi-minimum-input")?.value.trim() || "";
  }
  if (scoped.habitCard) {
    if (scoped.kind === "habitTitle" || scoped.kind === "habitMinimum") return "";
  }
  if (target === "blocker") return elements.blocker.value.trim();
  if (target === "note") return elements.note.value.trim();
  return "";
}

function setVoiceTargetValue(target, baseText, liveText) {
  const scoped = getScopedVoiceTarget(target);
  if (scoped.card) {
    if (scoped.kind === "blocker") {
      const input = scoped.card.querySelector(".multi-blocker-note");
      input.value = limitToMaxLength(input, appendVoiceText(baseText, liveText));
      return;
    }

    if (scoped.kind === "note") {
      const textarea = scoped.card.querySelector(".multi-note");
      textarea.value = limitToMaxLength(textarea, appendVoiceText(baseText, liveText));
      return;
    }

    if (scoped.kind === "habitMinimum") {
      const input = scoped.card.querySelector(".multi-minimum-input");
      input.value = limitToMaxLength(input, cleanVoiceTranscript(liveText));
      return;
    }
  }

  if (scoped.habitCard) {
    if (scoped.kind === "habitTitle") {
      const input = scoped.habitCard.querySelector(".habit-title-input");
      input.value = limitToMaxLength(input, cleanVoiceTranscript(liveText));
      return;
    }

    if (scoped.kind === "habitMinimum") {
      const input = scoped.habitCard.querySelector(".habit-minimum-input");
      input.value = limitToMaxLength(input, cleanVoiceTranscript(liveText));
      return;
    }
  }

  if (target === "blocker") {
    const value = appendVoiceText(baseText, liveText);
    elements.blocker.value = limitToMaxLength(elements.blocker, value);
    return;
  }

  if (target === "note") {
    const value = appendVoiceText(baseText, liveText);
    elements.note.value = limitToMaxLength(elements.note, value);
    return;
  }

}

function appendVoiceText(current, addition) {
  const left = cleanVoiceTranscript(current);
  const right = cleanVoiceTranscript(addition);
  if (!left) return right;
  if (!right) return left;
  return `${left}${right}`;
}

function cleanVoiceTranscript(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function stopVoiceInput(message) {
  if (activeVoiceSession) {
    activeVoiceSession.shouldStop = true;
  }
  const session = activeVoiceSession;
  if (activeRecognition) {
    if (session?.finalText || message) {
      activeRecognition.stop();
    } else {
      activeRecognition.abort();
    }
  }
  activeRecognition = null;
  activeVoiceTarget = null;
  activeVoiceSession = null;
  updateVoiceButtons(null);
  if (message) elements.voiceStatus.textContent = message;
}

function getSpeechRecognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

// Explicitly asks for microphone access so browsers can show a permission prompt.
async function requestMicrophoneAccess() {
  if (!window.isSecureContext) {
    return {
      ok: false,
      message: "マイクは安全な接続でのみ使えます。localhost、https、またはSafari/Chromeで開いてください。",
    };
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      ok: true,
      message: "このブラウザでは事前のマイク許可確認ができないため、そのまま音声認識を開始します。",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return {
      ok: true,
      message: "マイクの許可を確認しました。",
    };
  } catch (error) {
    return {
      ok: false,
      message: getMicrophoneAccessErrorMessage(error),
    };
  }
}

function getMicrophoneAccessErrorMessage(error) {
  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "マイクが許可されませんでした。アドレスバー左側のサイト設定、またはMacのシステム設定でマイクを許可してください。";
  }

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "マイクが見つかりませんでした。Macの入力デバイス設定を確認してください。";
  }

  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "マイクを開始できませんでした。他のアプリがマイクを使っていないか確認してください。";
  }

  return `マイク許可を確認できませんでした。ブラウザ設定を確認してもう一度試してください。(${error.name})`;
}

// Applies recognized speech either as selected options or free text.
function applyVoiceTranscript(target, transcript) {
  if (!transcript) {
    elements.voiceStatus.textContent = "待機中です。少し間が空いても、そのまま話し続けられます。";
    return;
  }

  const scoped = getScopedVoiceTarget(target);
  if (scoped.card && scoped.kind === "blocker") {
    const input = scoped.card.querySelector(".multi-blocker-note");
    input.value = limitToMaxLength(input, appendVoiceText(input.value, transcript));
    elements.voiceStatus.textContent = `${getHabitVoiceLabel(scoped.card)}の理由メモに追加しました。続けて話せます。`;
    return;
  }

  if (scoped.card && scoped.kind === "note") {
    const textarea = scoped.card.querySelector(".multi-note");
    textarea.value = limitToMaxLength(textarea, appendVoiceText(textarea.value, transcript));
    elements.voiceStatus.textContent = `${getHabitVoiceLabel(scoped.card)}のメモに追加しました。続けて話せます。`;
    return;
  }

  if (scoped.card && scoped.kind === "habitMinimum") {
    const input = scoped.card.querySelector(".multi-minimum-input");
    input.value = limitToMaxLength(input, cleanVoiceTranscript(transcript));
    elements.voiceStatus.textContent = `${getHabitVoiceLabel(scoped.card)}の今日の目安に入力しました。`;
    return;
  }

  if (scoped.habitCard && scoped.kind === "habitTitle") {
    const input = scoped.habitCard.querySelector(".habit-title-input");
    input.value = limitToMaxLength(input, transcript);
    elements.voiceStatus.textContent = `${getHabitVoiceLabel(scoped.habitCard)}の習慣名に入力しました。`;
    return;
  }

  if (scoped.habitCard && scoped.kind === "habitMinimum") {
    const input = scoped.habitCard.querySelector(".habit-minimum-input");
    input.value = limitToMaxLength(input, transcript);
    elements.voiceStatus.textContent = `${getHabitVoiceLabel(scoped.habitCard)}の最低ラインに入力しました。`;
    return;
  }

  if (target === "blocker") {
    elements.blocker.value = limitToMaxLength(elements.blocker, appendVoiceText(elements.blocker.value, transcript));
    elements.voiceStatus.textContent = "追加しました。続けて話せます。";
    return;
  }

  if (target === "note") {
    elements.note.value = limitToMaxLength(elements.note, appendVoiceText(elements.note.value, transcript));
    elements.voiceStatus.textContent = "追加しました。続けて話せます。";
    return;
  }

  const matchedValue = matchVoiceChoice(getVoiceTargetKind(target), transcript);
  if (!matchedValue) {
    elements.voiceStatus.textContent = `「${transcript}」に合う選択肢が見つかりませんでした。項目名に近い言葉で話してみてください。`;
    return;
  }

  if (scoped.card && scoped.kind === "status") {
    const statusInput = scoped.card.querySelector(`input[name="status-${CSS.escape(scoped.habitId)}"][value="${matchedValue}"]`);
    if (statusInput) statusInput.checked = true;
    elements.voiceStatus.textContent = `${getHabitVoiceLabel(scoped.card)}の結果を「${statusLabels[matchedValue]}」にしました。`;
    return;
  }

  if (scoped.card && scoped.kind === "mood") {
    scoped.card.querySelector(".multi-mood").value = matchedValue;
    elements.voiceStatus.textContent = `${getHabitVoiceLabel(scoped.card)}の気分を「${moodLabels[matchedValue]}」にしました。`;
    return;
  }

  if (target === "habit") {
    elements.habitSelect.value = matchedValue;
    updatePlanInput();
    elements.voiceStatus.textContent = `習慣を「${findHabit(matchedValue).title}」にしました。`;
    return;
  }

  if (target === "status") {
    const statusInput = elements.dailyForm.querySelector(`input[name="status"][value="${matchedValue}"]`);
    statusInput.checked = true;
    elements.voiceStatus.textContent = `今日の結果を「${statusLabels[matchedValue]}」にしました。`;
    return;
  }

  if (target === "mood") {
    elements.mood.value = matchedValue;
    elements.voiceStatus.textContent = `気分を「${moodLabels[matchedValue]}」にしました。`;
  }
}

function matchVoiceChoice(target, transcript) {
  const normalizedTranscript = normalizeVoiceText(transcript);
  const options = recognitionKeywordMap[target] || [];
  const match = options.find((option) =>
    option.words.some((word) => normalizedTranscript.includes(normalizeVoiceText(word))),
  );
  return match?.value || null;
}

function getScopedVoiceTarget(target) {
  const [kind, habitId] = String(target || "").split(":");
  const card = habitId
    ? elements.multiHabitRecords.querySelector(`.multi-habit-card[data-habit-id="${CSS.escape(habitId)}"]`)
    : null;
  const habitCard = habitId
    ? elements.todayPromises?.querySelector(`.habit-card[data-habit-id="${CSS.escape(habitId)}"]`)
    : null;
  return { kind, habitId, card, habitCard };
}

function getVoiceTargetKind(target) {
  return getScopedVoiceTarget(target).kind;
}

function getHabitVoiceLabel(card) {
  return card?.querySelector("h3")?.textContent || card?.querySelector(".habit-title-input")?.value || "この習慣";
}

function normalizeVoiceText(value) {
  return value
    .toLowerCase()
    .replaceAll(/\s/g, "")
    .replaceAll("　", "");
}

function updateVoiceButtons(target) {
  getVoiceButtons().forEach((button) => {
    const isListening = button.dataset.voiceTarget === target;
    button.classList.toggle("is-listening", isListening);
    button.setAttribute("aria-pressed", String(isListening));
    button.disabled = Boolean(target) && !isListening;
  });
}

function getVoiceButtons() {
  return document.querySelectorAll("[data-voice-target]");
}

function getRecognitionErrorMessage(error) {
  const messages = {
    "not-allowed": "マイクの使用が許可されていません。ブラウザの設定でマイクを許可してから、もう一度押してください。",
    "audio-capture": "マイクが見つかりませんでした。Macの入力デバイス設定を確認してください。",
    "no-speech": "声を聞き取れませんでした。もう一度押して、短く話してみてください。",
    network: "音声認識サービスに接続できませんでした。通信状態を確認して、もう一度試してください。",
  };
  return messages[error] || `音声入力を完了できませんでした。もう一度押して話してください。(${error})`;
}

function getVoiceTargetLabel(target) {
  const scoped = getScopedVoiceTarget(target);
  const labels = {
    habit: "習慣",
    status: "今日の結果",
    mood: "気分",
    blocker: "理由メモ",
    note: "ひとことメモ",
    habitTitle: "習慣名",
    habitMinimum: "標準の最低ライン",
  };
  const baseLabel = labels[scoped.kind] || "項目";
  const scopedCard = scoped.card || scoped.habitCard;
  return scopedCard ? `${getHabitVoiceLabel(scopedCard)}の${baseLabel}` : baseLabel;
}

function limitToMaxLength(element, value) {
  const maxLength = Number(element.getAttribute("maxlength"));
  if (!maxLength) return value;
  return value.slice(0, maxLength);
}

function normalizeLearningMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 0) return "";
  return String(Math.min(Math.round(minutes), 600));
}

function parseLearningMinutes(transcript) {
  const normalized = normalizeVoiceText(transcript);
  const numberPattern = "([0-9一二三四五六七八九十]+)";
  const hourMatch = normalized.match(new RegExp(`${numberPattern}時間`));
  const minuteMatch = normalized.match(new RegExp(`${numberPattern}分`));
  const rawNumberMatch = normalized.match(new RegExp(numberPattern));
  const hours = hourMatch ? parseSpokenNumber(hourMatch[1]) : 0;
  const minutes = minuteMatch ? parseSpokenNumber(minuteMatch[1]) : 0;
  const total = hours * 60 + minutes;
  if (total > 0) return normalizeLearningMinutes(total);
  if (rawNumberMatch) return normalizeLearningMinutes(parseSpokenNumber(rawNumberMatch[1]));
  return "";
}

function parseSpokenNumber(value) {
  if (/^\d+$/.test(value)) return Number(value);
  const digits = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };
  if (value === "十") return 10;
  if (value.includes("十")) {
    const [tensText, onesText] = value.split("十");
    const tens = tensText ? digits[tensText] || 0 : 1;
    const ones = onesText ? digits[onesText] || 0 : 0;
    return tens * 10 + ones;
  }
  return digits[value] || 0;
}

function loadState() {
  const fallback = {
    habits: defaultHabits,
    plans: [],
    checkIns: [],
    tomorrowActions: [],
    settings: {
      dayCondition: "normal",
      recoveryModeDate: null,
    },
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.habits)) {
      return fallback;
    }

    return {
      habits: saved.habits.length ? saved.habits : defaultHabits,
      plans: Array.isArray(saved.plans) ? saved.plans : [],
      checkIns: Array.isArray(saved.checkIns) ? saved.checkIns : [],
      tomorrowActions: Array.isArray(saved.tomorrowActions) ? saved.tomorrowActions : [],
      settings: {
        ...fallback.settings,
        ...(saved.settings || {}),
      },
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadTestChecklistState() {
  try {
    const saved = JSON.parse(localStorage.getItem(TEST_CHECKLIST_STORAGE_KEY));
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function saveTestChecklistState(checks) {
  localStorage.setItem(TEST_CHECKLIST_STORAGE_KEY, JSON.stringify(checks));
}

function renderTestChecklist() {
  if (!elements.testCheckList) return;
  const checks = loadTestChecklistState();
  const groups = [...new Set(testChecklistItems.map((item) => item.group))];
  elements.testCheckList.innerHTML = groups.map((group) => {
    const items = testChecklistItems.filter((item) => item.group === group);
    return `
      <section class="test-check-group">
        <h4>${escapeHtml(group)}</h4>
        <div class="test-check-group-items">
          ${items.map((item) => `
            <label class="test-check-item">
              <input type="checkbox" value="${escapeHtml(item.id)}" ${checks[item.id] ? "checked" : ""}>
              <span>${escapeHtml(item.label)}</span>
            </label>
          `).join("")}
        </div>
      </section>
    `;
  }).join("");
  renderTestProgress(checks);
}

function renderTestProgress(checks = loadTestChecklistState()) {
  if (!elements.testProgressStatus) return;
  const checkedCount = testChecklistItems.filter((item) => checks[item.id]).length;
  elements.testProgressStatus.textContent = `確認済み ${checkedCount} / ${testChecklistItems.length} 件`;
  elements.testProgressStatus.dataset.status = checkedCount === testChecklistItems.length
    ? "complete"
    : checkedCount > 0
      ? "progress"
      : "empty";
}

function handleTestChecklistChange(event) {
  if (!event.target.matches('input[type="checkbox"]')) return;
  const checks = loadTestChecklistState();
  checks[event.target.value] = event.target.checked;
  saveTestChecklistState(checks);
  renderTestProgress(checks);
}

function resetTestChecklist() {
  saveTestChecklistState({});
  renderTestChecklist();
}

function renderUiuxImprovements() {
  if (!elements.uiuxImprovementList) return;
  elements.uiuxImprovementList.innerHTML = uiuxImprovementItems.map((item) => `
    <article class="uiux-improvement-card">
      <div class="uiux-improvement-header">
        <h4>${escapeHtml(item.title)}</h4>
        <span>${escapeHtml(item.status)}</span>
      </div>
      <p><strong>改善点:</strong> ${escapeHtml(item.issue)}</p>
      <p><strong>修正:</strong> ${escapeHtml(item.fix)}</p>
    </article>
  `).join("");
}

function populateHabitSelects() {
  const activeHabits = state.habits.filter((habit) => habit.active);
  elements.habitSelect.innerHTML = "";
  activeHabits.forEach((habit) => {
    const option = document.createElement("option");
    option.value = habit.id;
    option.textContent = `${categoryLabels[habit.category]} - ${habit.title}`;
    elements.habitSelect.append(option);
  });
}

function renderMultiHabitRecordForms() {
  const recordDateKey = getRecordDateKey();
  elements.multiHabitRecords.innerHTML = "";
  state.habits
    .filter((habit) => habit.active)
    .forEach((habit, index) => {
      const savedCheckIn = getCheckIn(recordDateKey, habit.id);
      const savedPlan = getPlan(recordDateKey, habit.id);
      const plannedMinimumAction = savedPlan?.plannedMinimumAction || getAdaptiveMinimum(habit.id);
      const isOpen = index === 0 || Boolean(savedCheckIn);
      const card = document.createElement("article");
      card.className = "multi-habit-card";
      card.classList.toggle("is-collapsed", !isOpen);
      card.dataset.habitId = habit.id;
      card.dataset.category = habit.category;
      const status = savedCheckIn?.status || "done";
      const mood = savedCheckIn?.mood || "good";
      const note = savedCheckIn?.note || "";
      card.innerHTML = `
        <button class="multi-habit-card-header" type="button" aria-expanded="${isOpen}" aria-controls="record-panel-${escapeHtml(habit.id)}">
          <div>
            <p class="category">${escapeHtml(categoryLabels[habit.category])}</p>
            <h3>${escapeHtml(habit.title)}</h3>
            <p class="multi-habit-minimum">${escapeHtml(buildMinimumSuggestionText(habit, plannedMinimumAction))}</p>
          </div>
          <span class="multi-habit-header-side">
            <span class="status-badge ${savedCheckIn ? (savedCheckIn.status === "missed" ? "missed" : "done") : "unsaved"}">${escapeHtml(savedCheckIn ? statusLabels[savedCheckIn.status] : "未保存")}</span>
            <span class="summary-hint multi-habit-toggle-label">${isOpen ? "閉じる" : "開く"}</span>
          </span>
        </button>
        <div class="multi-habit-grid" id="record-panel-${escapeHtml(habit.id)}" ${isOpen ? "" : "hidden"}>
          <div class="multi-minimum-editor multi-habit-full">
            <button class="ghost-button compact-button multi-minimum-edit-button" type="button">編集</button>
            <form class="multi-minimum-edit-form" hidden>
              <label>
                今日の目安
                <span class="input-with-action">
                  <input class="multi-minimum-input" type="text" maxlength="120" value="${escapeHtml(plannedMinimumAction)}" required>
                  ${buildVoiceButtonHtml(`habitMinimum:${habit.id}`, `${habit.title}の今日の目安を音声入力`, "compact-voice-button")}
                </span>
              </label>
              <div class="button-row">
                <button class="primary-button compact-button" type="submit">保存</button>
                <button class="ghost-button compact-button multi-minimum-cancel-button" type="button">キャンセル</button>
              </div>
              <p class="habit-save-note" aria-live="polite"></p>
            </form>
          </div>
          <fieldset class="multi-habit-field">
            <div class="compact-field-heading">
              <legend>結果</legend>
              ${buildVoiceButtonHtml(`status:${habit.id}`, `${habit.title}の結果を音声入力`, "compact-voice-button")}
            </div>
            <div class="segmented-control compact-segmented-control">
              <label><input type="radio" name="status-${escapeHtml(habit.id)}" value="done" ${status === "done" ? "checked" : ""}>できた</label>
              <label><input type="radio" name="status-${escapeHtml(habit.id)}" value="partial" ${status === "partial" ? "checked" : ""}>少し</label>
              <label><input type="radio" name="status-${escapeHtml(habit.id)}" value="missed" ${status === "missed" ? "checked" : ""}>未達</label>
            </div>
          </fieldset>
          ${habit.category === "learning" ? buildMultiLearningHtml(savedCheckIn) : ""}
          <div class="multi-habit-field multi-habit-full">
            <div class="compact-field-heading">
              <label>ひとことメモ</label>
              ${buildVoiceButtonHtml(`note:${habit.id}`, `${habit.title}のひとことメモを音声入力`, "compact-voice-button")}
            </div>
            <textarea class="multi-note" maxlength="2000" placeholder="この習慣について残したいこと">${escapeHtml(note)}</textarea>
            <div class="note-suggestion-box" aria-live="polite"></div>
          </div>
        </div>
      `;
      elements.multiHabitRecords.append(card);
      if (habit.category === "learning") updateMultiLearningDuration(card);
      updateNoteSuggestions(card);
    });
}

function buildMoodSelectHtml(selectedMood) {
  return `
    <select class="multi-mood">
      ${Object.entries(moodLabels).map(([value, label]) =>
        `<option value="${escapeHtml(value)}" ${selectedMood === value ? "selected" : ""}>${escapeHtml(label)}</option>`,
      ).join("")}
    </select>
  `;
}

function buildBlockerPresetSelectHtml(selectedValue) {
  const options = ["", "眠かった", "時間がなかった", "忘れていた", "やる気が出なかった", "体調が悪かった", "何をするか迷った"];
  return `
    <select class="multi-blocker-preset">
      ${options.map((value) =>
        `<option value="${escapeHtml(value)}" ${selectedValue === value ? "selected" : ""}>${escapeHtml(value || "選ばなくてもOK")}</option>`,
      ).join("")}
    </select>
  `;
}

function buildVoiceButtonHtml(target, label, extraClass = "") {
  return `
    <button class="voice-button ${extraClass}" type="button" data-voice-target="${escapeHtml(target)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
      <svg aria-hidden="true"><use href="#icon-mic"></use></svg>
      <span class="sr-only">${escapeHtml(label)}</span>
    </button>
  `;
}

function buildMultiLearningHtml(checkIn) {
  const sessions = getLearningSessionsFromCheckIn(checkIn);
  const sessionRows = (sessions.length ? sessions : [{}]).map((session, index) => buildMultiLearningSessionRow(session, index + 1)).join("");
  const isOpen = sessions.length ? " open" : "";
  return `
    <details class="multi-learning-summary multi-habit-full"${isOpen}>
      <summary>
        <span class="multi-learning-duration">時間帯を入力すると自動計算されます</span>
        <span class="summary-hint">開く</span>
      </summary>
      <input class="multi-learning-minutes" type="hidden" value="${escapeHtml(checkIn?.learningMinutes || "")}">
      <div class="learning-session-list">${sessionRows}</div>
      <button class="ghost-button compact-button multi-add-learning-session" type="button">時間帯を追加</button>
    </details>
  `;
}

function buildMultiLearningSessionRow(session = {}, index = 1) {
  return `
    <div class="time-range-group learning-session-row">
      <input class="learning-start-time" type="time" aria-label="学習開始時刻 ${index}" value="${escapeHtml(session.startTime || "")}">
      <span>から</span>
      <input class="learning-end-time" type="time" aria-label="学習終了時刻 ${index}" value="${escapeHtml(session.endTime || "")}">
      <span>まで</span>
      <button class="ghost-button compact-button remove-learning-session-button" type="button" aria-label="この時間帯を削除">削除</button>
    </div>
  `;
}

function setLearningTimeFromMinutes(value) {
  const normalized = normalizeLearningMinutes(value);
  const totalMinutes = normalized ? Number(normalized) : 0;
  elements.learningMinutes.value = totalMinutes > 0 ? String(totalMinutes) : "";
  elements.learningDurationDisplay.textContent = totalMinutes > 0
    ? formatDuration(totalMinutes)
    : "時間帯を入力すると自動計算されます";
}

function syncLearningMinutesFromTimeRange() {
  const totalMinutes = collectLearningSessions()
    .reduce((total, session) => total + Number(calculateMinutesBetween(session.startTime, session.endTime) || 0), 0);
  setLearningTimeFromMinutes(totalMinutes);
}

function renderLearningSessions(checkIn) {
  const sessions = getLearningSessionsFromCheckIn(checkIn);
  elements.learningSessionList.innerHTML = "";
  (sessions.length ? sessions : [{}]).forEach((session) => addLearningSessionRow(session));
  syncLearningMinutesFromTimeRange();
}

function addLearningSessionRow(session = {}) {
  const index = elements.learningSessionList.children.length + 1;
  const row = document.createElement("div");
  row.className = "time-range-group learning-session-row";
  row.innerHTML = `
    <input class="learning-start-time" type="time" aria-label="学習開始時刻 ${index}" value="${escapeHtml(session.startTime || "")}">
    <span>から</span>
    <input class="learning-end-time" type="time" aria-label="学習終了時刻 ${index}" value="${escapeHtml(session.endTime || "")}">
    <span>まで</span>
    <button class="ghost-button compact-button remove-learning-session-button" type="button" aria-label="この時間帯を削除">削除</button>
  `;
  elements.learningSessionList.append(row);
  updateLearningSessionRemoveButtons();
}

function handleLearningSessionListClick(event) {
  const removeButton = event.target.closest(".remove-learning-session-button");
  if (!removeButton) return;
  removeButton.closest(".learning-session-row")?.remove();
  if (!elements.learningSessionList.children.length) addLearningSessionRow();
  updateLearningSessionRemoveButtons();
  syncLearningMinutesFromTimeRange();
}

function handleMultiHabitRecordsInput(event) {
  const card = event.target.closest(".multi-habit-card");
  if (!card) return;
  if (event.target.matches(".multi-note")) {
    updateNoteSuggestions(card);
    return;
  }
  if (card.dataset.category !== "learning") return;
  if (event.target.matches(".learning-start-time, .learning-end-time")) {
    updateMultiLearningDuration(card);
  }
}

function handleMultiHabitRecordsClick(event) {
  const suggestionButton = event.target.closest(".note-suggestion-button");
  if (suggestionButton) {
    applyNoteSuggestion(suggestionButton);
    return;
  }

  const headerButton = event.target.closest(".multi-habit-card-header");
  if (headerButton) {
    toggleMultiHabitCard(headerButton.closest(".multi-habit-card"));
    return;
  }

  const minimumEditButton = event.target.closest(".multi-minimum-edit-button");
  if (minimumEditButton) {
    showMultiMinimumEditor(minimumEditButton.closest(".multi-habit-card"), true);
    return;
  }

  const minimumCancelButton = event.target.closest(".multi-minimum-cancel-button");
  if (minimumCancelButton) {
    showMultiMinimumEditor(minimumCancelButton.closest(".multi-habit-card"), false);
    return;
  }

  const addButton = event.target.closest(".multi-add-learning-session");
  if (addButton) {
    const card = addButton.closest(".multi-habit-card");
    const list = card.querySelector(".learning-session-list");
    list.insertAdjacentHTML("beforeend", buildMultiLearningSessionRow({}, list.children.length + 1));
    updateMultiLearningRemoveButtons(card);
    updateMultiLearningDuration(card);
    return;
  }

  const removeButton = event.target.closest(".multi-habit-card .remove-learning-session-button");
  if (!removeButton) return;
  const card = removeButton.closest(".multi-habit-card");
  removeButton.closest(".learning-session-row")?.remove();
  const list = card.querySelector(".learning-session-list");
  if (!list.children.length) {
    list.insertAdjacentHTML("beforeend", buildMultiLearningSessionRow());
  }
  updateMultiLearningRemoveButtons(card);
  updateMultiLearningDuration(card);
}

function updateNoteSuggestions(card) {
  const textarea = card?.querySelector(".multi-note");
  const box = card?.querySelector(".note-suggestion-box");
  if (!textarea || !box) return;

  const suggestions = getNoteSuggestions(card.dataset.habitId, textarea.value);
  box.replaceChildren();
  box.hidden = !suggestions.length;
  if (!suggestions.length) return;

  const heading = document.createElement("p");
  heading.className = "note-suggestion-heading";
  heading.textContent = textarea.value.trim() ? "近い過去メモ" : "最近使ったメモ";
  box.append(heading);

  const list = document.createElement("div");
  list.className = "note-suggestion-list";
  suggestions.forEach((suggestion) => {
    const button = document.createElement("button");
    button.className = "note-suggestion-button";
    button.type = "button";
    button.dataset.note = suggestion.note;
    button.title = suggestion.note;
    button.innerHTML = `
      <span class="note-suggestion-label">${escapeHtml(buildNoteSuggestionLabel(suggestion.note))}</span>
      <span class="note-suggestion-meta">${escapeHtml(buildNoteSuggestionMeta(suggestion))}</span>
    `;
    list.append(button);
  });
  box.append(list);
}

function getNoteSuggestions(habitId, query) {
  const normalizedQuery = normalizeSuggestionText(query);
  const currentValue = query.trim();
  const seen = new Set();

  const candidates = state.checkIns
    .filter((checkIn) => checkIn.note && checkIn.note.trim() && checkIn.note.trim() !== currentValue)
    .map((checkIn, index) => ({
      habitId: checkIn.habitId,
      habitTitle: findHabit(checkIn.habitId)?.title || "",
      note: checkIn.note.trim(),
      date: checkIn.date || "",
      createdAt: checkIn.createdAt || "",
      updatedAt: checkIn.updatedAt || "",
      index,
    }))
    .filter((item) => {
      const key = normalizeSuggestionText(item.note);
      if (seen.has(key)) return false;
      seen.add(key);
      if (!normalizedQuery) return true;
      return key.includes(normalizedQuery);
    });

  const sameHabitCandidates = candidates.filter((item) => item.habitId === habitId);
  return (sameHabitCandidates.length ? sameHabitCandidates : candidates)
    .sort((left, right) => {
      const leftScore = getNoteSuggestionScore(left, habitId, normalizedQuery);
      const rightScore = getNoteSuggestionScore(right, habitId, normalizedQuery);
      if (leftScore !== rightScore) return rightScore - leftScore;
      return getSuggestionTime(right) - getSuggestionTime(left);
    })
    .slice(0, 5);
}

function getNoteSuggestionScore(item, habitId, normalizedQuery) {
  let score = item.habitId === habitId ? 8 : 0;
  const normalizedNote = normalizeSuggestionText(item.note);
  if (normalizedQuery) {
    if (normalizedNote.startsWith(normalizedQuery)) score += 6;
    else if (normalizedNote.includes(normalizedQuery)) score += 3;
  }
  return score;
}

function getSuggestionTime(item) {
  const timestamp = Date.parse(item.updatedAt || item.createdAt || item.date);
  return Number.isFinite(timestamp) ? timestamp : item.index;
}

function normalizeSuggestionText(value) {
  return String(value || "").replace(/\s+/g, "").toLowerCase();
}

function buildNoteSuggestionLabel(note) {
  const oneLine = note.replace(/\s+/g, " ").trim();
  return oneLine.length > 70 ? `${oneLine.slice(0, 69)}…` : oneLine;
}

function buildNoteSuggestionMeta(suggestion) {
  return [suggestion.date ? formatShortDate(suggestion.date) : "", suggestion.habitTitle].filter(Boolean).join(" / ");
}

function applyNoteSuggestion(button) {
  const card = button.closest(".multi-habit-card");
  const textarea = card?.querySelector(".multi-note");
  if (!textarea) return;

  textarea.value = button.dataset.note || "";
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  updateNoteSuggestions(card);
}

function handleMultiHabitRecordsSubmit(event) {
  const form = event.target.closest(".multi-minimum-edit-form");
  if (!form) return;
  event.preventDefault();
  const card = form.closest(".multi-habit-card");
  const habit = findHabit(card.dataset.habitId);
  const input = form.querySelector(".multi-minimum-input");
  const plannedMinimumAction = input.value.trim();
  if (!plannedMinimumAction) return;

  upsertByDateAndHabit(state.plans, {
    date: getRecordDateKey(),
    habitId: habit.id,
    plannedMinimumAction,
  });
  saveState();
  card.querySelector(".multi-habit-minimum").textContent = buildMinimumSuggestionText(habit, plannedMinimumAction);
  form.querySelector(".habit-save-note").textContent = "今日の目安を保存しました。";
  showMultiMinimumEditor(card, false);
  updatePlanInput();
  renderCoachMessage({
    type: "habit-edited",
    habitId: habit.id,
  });
}

function showMultiMinimumEditor(card, shouldShow) {
  if (!card) return;
  const form = card.querySelector(".multi-minimum-edit-form");
  const button = card.querySelector(".multi-minimum-edit-button");
  if (!form || !button) return;
  form.hidden = !shouldShow;
  button.hidden = shouldShow;
  if (shouldShow) {
    form.querySelector(".multi-minimum-input")?.focus();
  }
}

function toggleMultiHabitCard(card) {
  if (!card) return;
  const panel = card.querySelector(".multi-habit-grid");
  const header = card.querySelector(".multi-habit-card-header");
  const label = card.querySelector(".multi-habit-toggle-label");
  const willOpen = panel.hidden;
  panel.hidden = !willOpen;
  card.classList.toggle("is-collapsed", !willOpen);
  header.setAttribute("aria-expanded", String(willOpen));
  if (label) label.textContent = willOpen ? "閉じる" : "開く";
}

function updateMultiLearningDuration(card) {
  const sessions = collectMultiLearningSessions(card);
  const totalMinutes = sessions
    .reduce((total, session) => total + Number(calculateMinutesBetween(session.startTime, session.endTime) || 0), 0);
  const minutesInput = card.querySelector(".multi-learning-minutes");
  const display = card.querySelector(".multi-learning-duration");
  minutesInput.value = totalMinutes > 0 ? String(totalMinutes) : "";
  display.textContent = totalMinutes > 0 ? `学習時間: ${formatDuration(totalMinutes)}` : "時間帯を入力すると自動計算されます";
  updateMultiLearningRemoveButtons(card);
}

function updateMultiLearningRemoveButtons(card) {
  const rows = Array.from(card.querySelectorAll(".learning-session-row"));
  rows.forEach((row, index) => {
    row.querySelector(".remove-learning-session-button").hidden = rows.length === 1;
    row.querySelector(".learning-start-time").setAttribute("aria-label", `学習開始時刻 ${index + 1}`);
    row.querySelector(".learning-end-time").setAttribute("aria-label", `学習終了時刻 ${index + 1}`);
  });
}

function collectMultiLearningSessions(card) {
  return Array.from(card.querySelectorAll(".learning-session-row"))
    .map((row) => ({
      startTime: row.querySelector(".learning-start-time")?.value || "",
      endTime: row.querySelector(".learning-end-time")?.value || "",
    }))
    .filter((session) => session.startTime || session.endTime);
}

function updateLearningSessionRemoveButtons() {
  const rows = Array.from(elements.learningSessionList.querySelectorAll(".learning-session-row"));
  rows.forEach((row, index) => {
    const removeButton = row.querySelector(".remove-learning-session-button");
    const startInput = row.querySelector(".learning-start-time");
    const endInput = row.querySelector(".learning-end-time");
    removeButton.hidden = rows.length === 1;
    startInput.setAttribute("aria-label", `学習開始時刻 ${index + 1}`);
    endInput.setAttribute("aria-label", `学習終了時刻 ${index + 1}`);
  });
}

function collectLearningSessions() {
  return Array.from(elements.learningSessionList.querySelectorAll(".learning-session-row"))
    .map((row) => ({
      startTime: row.querySelector(".learning-start-time")?.value || "",
      endTime: row.querySelector(".learning-end-time")?.value || "",
    }))
    .filter((session) => session.startTime || session.endTime);
}

function getLearningSessionsFromCheckIn(checkIn) {
  if (Array.isArray(checkIn?.learningSessions)) {
    return checkIn.learningSessions
      .map((session) => ({
        startTime: typeof session.startTime === "string" ? session.startTime : "",
        endTime: typeof session.endTime === "string" ? session.endTime : "",
      }))
      .filter((session) => session.startTime || session.endTime);
  }
  if (checkIn?.learningStartTime || checkIn?.learningEndTime) {
    return [{
      startTime: checkIn.learningStartTime || "",
      endTime: checkIn.learningEndTime || "",
    }];
  }
  return [];
}

function calculateMinutesBetween(startTime, endTime) {
  if (!startTime || !endTime) return "";
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null) return "";
  const adjustedEndMinutes = endMinutes <= startMinutes ? endMinutes + 24 * 60 : endMinutes;
  return adjustedEndMinutes - startMinutes;
}

function timeToMinutes(value) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}時間${String(minutes).padStart(2, "0")}分`;
  if (hours) return `${hours}時間`;
  return `${minutes}分`;
}

function updatePlanInput() {
  const habit = findHabit(elements.habitSelect.value);
  const recordDateKey = getRecordDateKey();
  const savedPlan = getPlan(recordDateKey, habit.id);
  const savedCheckIn = getCheckIn(recordDateKey, habit.id);
  const suggestedMinimum = getAdaptiveMinimum(habit.id);
  const isLearningHabit = habit.category === "learning";
  elements.learningTimeField.hidden = !isLearningHabit;
  elements.learningSessionField.hidden = !isLearningHabit;
  elements.focusTimer.hidden = !isLearningHabit;
  if (isLearningHabit) {
    renderLearningSessions(savedCheckIn);
    if (!collectLearningSessions().length && savedCheckIn?.learningMinutes) {
      setLearningTimeFromMinutes(savedCheckIn.learningMinutes);
    }
  } else {
    elements.learningSessionList.innerHTML = "";
    setLearningTimeFromMinutes("");
  }
  elements.mood.value = savedCheckIn?.mood || "good";
  if (elements.blockerPreset) elements.blockerPreset.value = savedCheckIn?.blockerPreset || "";
  if (elements.blocker) elements.blocker.value = savedCheckIn?.blockerNote || getLegacyBlockerNote(savedCheckIn);
  elements.note.value = savedCheckIn?.note || "";
  const status = savedCheckIn?.status || "done";
  const statusInput = elements.dailyForm.querySelector(`input[name="status"][value="${status}"]`);
  if (statusInput) statusInput.checked = true;
  elements.minimumSuggestion.textContent = buildMinimumSuggestionText(habit, savedPlan?.plannedMinimumAction || suggestedMinimum);
}

function handleDailyRecord(event) {
  event.preventDefault();
  const recordDateKey = getRecordDateKey();
  const records = collectMultiHabitRecords(recordDateKey);
  saveHabitRecords(records, {
    latestEventType: "checked-in",
    statusMessage: `${formatShortDate(recordDateKey)}の記録を保存しました。LINE送信状態を確認しています。`,
  });
}

function handleSelfTestReport() {
  const recordDateKey = getRecordDateKey();
  const records = collectMultiHabitRecords(recordDateKey);
  saveHabitRecords(records, {
    reportTarget: "student",
    latestEventType: "checked-in",
    statusMessage: `${formatShortDate(recordDateKey)}の記録を保存し、自分だけにテスト送信しています。`,
  });
}

function saveHabitRecords(records, options = {}) {
  const recordDateKey = records[0]?.checkIn.date || getRecordDateKey();
  records.forEach(({ habit, plannedMinimumAction, checkIn }) => {
    upsertByDateAndHabit(state.plans, {
      date: checkIn.date,
      habitId: habit.id,
      plannedMinimumAction,
    });
    upsertByDateAndHabit(state.checkIns, checkIn);
  });
  saveState();
  if (options.statusMessage) {
    setRecordSaveStatus(options.statusMessage, "checking");
  }
  syncRecordsToServer(records.map(({ habit, plannedMinimumAction, checkIn }) => ({
    ...checkIn,
    habitTitle: habit.title,
    plannedMinimumAction,
  })), {
    reportTarget: options.reportTarget,
    reportStyle: getDailyReportStyle(),
  });
  render({
    type: options.latestEventType || "checked-in",
    habitId: records[0]?.habit.id,
    status: records.some(({ checkIn }) => checkIn.status === "missed") ? "missed" : "done",
    date: recordDateKey,
  });
}

function collectMultiHabitRecords(recordDateKey) {
  return Array.from(elements.multiHabitRecords.querySelectorAll(".multi-habit-card"))
    .map((card) => {
      const habit = findHabit(card.dataset.habitId);
      const plannedMinimumAction = getPlan(recordDateKey, habit.id)?.plannedMinimumAction || getAdaptiveMinimum(habit.id);
      const learningSessions = habit.category === "learning" ? collectMultiLearningSessions(card) : [];
      const learningMinutes = habit.category === "learning"
        ? normalizeLearningMinutes(card.querySelector(".multi-learning-minutes")?.value || "")
        : "";
      const checkIn = {
        date: recordDateKey,
        habitId: habit.id,
        status: card.querySelector(`input[name="status-${CSS.escape(habit.id)}"]:checked`)?.value || "done",
        mood: card.querySelector(".multi-mood")?.value || "good",
        learningMinutes,
        learningSessions,
        learningStartTime: learningSessions[0]?.startTime || "",
        learningEndTime: learningSessions[0]?.endTime || "",
        blocker: "",
        blockerPreset: "",
        blockerNote: "",
        note: card.querySelector(".multi-note")?.value.trim() || "",
      };
      return { habit, plannedMinimumAction, checkIn };
    });
}

async function loadLineLinkStatus() {
  try {
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      latestLineHealth = health;
      const emailStatus = health.emailConfigured
        ? "メール送信も設定済みです。"
        : health.emailToConfigured
          ? "メール宛先は設定済みですが、送信サービスは未設定です。"
          : "メール宛先は未設定です。";
      elements.lineWebhookStatus.textContent = health.lineConfigured
        ? `Webhook URL: ${health.webhookUrl}`
        : `LINE設定は未完了です。Webhook URL候補: ${health.webhookUrl}`;
      elements.lineWebhookStatus.textContent = `${elements.lineWebhookStatus.textContent} ${emailStatus}`;
    }

    const response = await fetch(`${API_BASE}/api/link-codes`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const linkStatus = await response.json();
    latestLinkStatus = linkStatus;
    elements.studentLinkCode.textContent = linkStatus.student;
    elements.coachLinkCode.textContent = linkStatus.coach;
    elements.studentLinkStatus.textContent = linkStatus.studentLinked
      ? "本人のLINEアカウントは連携済みです。"
      : `LINE公式アカウントに「連携 ${linkStatus.student}」と送ってください。`;
    elements.coachLinkStatus.textContent = linkStatus.coachLinked
      ? "講師のLINEアカウントは連携済みです。"
      : `講師は「講師連携 ${linkStatus.coach}」と送ってください。`;
    renderReportReadiness();
  } catch {
    latestLineHealth = null;
    latestLinkStatus = null;
    elements.studentLinkCode.textContent = "API未接続";
    elements.coachLinkCode.textContent = "API未接続";
    elements.studentLinkStatus.textContent = "Nodeサーバーを npm start で起動すると表示されます。";
    elements.coachLinkStatus.textContent = "LINE連携APIに接続できません。";
    elements.lineWebhookStatus.textContent = "Webhook URLを取得できません。";
    if (elements.reportReadinessStatus) {
      elements.reportReadinessStatus.textContent = "サーバーに接続できません。npm startで起動してから保存・LINE送信してください。";
      elements.reportReadinessStatus.dataset.status = "error";
    }
  }
}

async function loadServerRecords() {
  try {
    const response = await fetch(`${API_BASE}/api/records`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const records = Array.isArray(result.records) ? result.records : [];
    let restoredCount = 0;

    records.forEach((record) => {
      if (!record.date || !record.habitId) return;

      if (!getPlan(record.date, record.habitId)) {
        upsertByDateAndHabit(state.plans, {
          date: record.date,
          habitId: record.habitId,
          plannedMinimumAction: record.plannedMinimumAction || findHabit(record.habitId).minimumAction,
        });
      }

      if (!getCheckIn(record.date, record.habitId)) {
        upsertByDateAndHabit(state.checkIns, {
          date: record.date,
          habitId: record.habitId,
          status: record.status || "done",
          mood: record.mood || "good",
          learningMinutes: record.learningMinutes || "",
          learningSessions: Array.isArray(record.learningSessions) ? record.learningSessions : [],
          learningStartTime: record.learningStartTime || "",
          learningEndTime: record.learningEndTime || "",
          blocker: record.blocker || "",
          blockerPreset: record.blockerPreset || "",
          blockerNote: record.blockerNote || "",
          note: record.note || "",
        });
        restoredCount += 1;
      }
    });

    if (restoredCount > 0) {
      saveState();
      updatePlanInput();
      render({
        type: "records-restored",
      });
    }
  } catch {
    // The app still works with browser-only storage when the Node API is unavailable.
  }
}

async function syncRecordToServer(record) {
  try {
    const response = await fetch(`${API_BASE}/api/records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const statusText = buildLineReportStatus(result.report);
    elements.lineReportStatus.textContent = statusText;
    setRecordSaveStatus(`記録を保存しました。${statusText}`, getRecordSaveStatusType(result.report));
    renderReportReadiness();
    loadReportLogs();
  } catch {
    const statusText = "記録を保存しました。LINE連携APIには接続できませんでした。";
    elements.lineReportStatus.textContent = "LINE連携APIに接続できませんでした。記録はブラウザ内に保存されています。";
    setRecordSaveStatus(statusText, "error");
    renderReportReadiness();
  }
}

async function syncRecordsToServer(records, options = {}) {
  try {
    const response = await fetch(`${API_BASE}/api/records/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records,
        reportTarget: options.reportTarget,
        reportStyle: options.reportStyle,
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const statusText = buildLineReportStatus(result.report);
    elements.lineReportStatus.textContent = statusText;
    setRecordSaveStatus(`記録を保存しました。${statusText}`, getRecordSaveStatusType(result.report));
    renderReportReadiness();
    loadReportLogs();
  } catch {
    const statusText = "LINE連携APIに接続できませんでした。記録はブラウザ内に保存されています。";
    elements.lineReportStatus.textContent = statusText;
    setRecordSaveStatus(statusText, "error");
    renderReportReadiness();
  }
}

async function deleteCheckIn(date, habitId) {
  const habit = findHabit(habitId);
  const confirmed = window.confirm(
    `${formatShortDate(date)}の「${habit.title}」の記録を削除しますか？\nこの操作ではLINE送信は行いません。`,
  );
  if (!confirmed) return;

  state.checkIns = state.checkIns.filter((checkIn) => !(checkIn.date === date && checkIn.habitId === habitId));
  saveState();
  render();

  try {
    const response = await fetch(`${API_BASE}/api/records`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ date, habitId }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    elements.lineReportStatus.textContent = "記録を削除しました。LINE送信はしていません。";
  } catch {
    elements.lineReportStatus.textContent = "ブラウザ内の記録は削除しました。サーバー側の削除は未確認です。";
  }
}

function buildLineReportStatus(report) {
  const lineSent = Boolean(report?.line?.sent || report?.sent);
  const emailSent = Boolean(report?.email?.sent);
  if (report?.target === "student") {
    if (lineSent) return "自分だけにLINEテスト送信しました。講師には送っていません。";
    const selfTestReasons = {
      missing_channel_access_token: "LINEトークン未設定のため、自分だけのテスト送信は保留中です。",
      student_not_linked: "本人のLINE連携が未完了のため、自分だけのテスト送信は保留中です。",
      line_send_failed: "自分だけのLINEテスト送信に失敗しました。設定を確認してください。",
      no_records_for_date: `${formatShortDate(getRecordDateKey())}の記録がまだないため、テスト送信していません。`,
    };
    return selfTestReasons[report?.reason || report?.line?.reason] || "自分だけのLINEテスト送信は保留中です。";
  }
  // Show whether the LINE report reached only the coach or both the coach and student.
  const selfLineSent = Boolean(report?.line?.recipients?.student?.sent);
  const lineTargetText = selfLineSent ? "講師と自分へLINE" : "講師へLINE";
  if (lineSent && emailSent) return `${lineTargetText}、講師へメールで日次レポートを送信しました。`;
  if (lineSent) {
    if (report?.email?.reason === "missing_email_config") {
      return `${lineTargetText}日次レポートを送信しました。メール送信は未設定です。`;
    }
    if (report?.email?.reason === "missing_email_to") {
      return `${lineTargetText}日次レポートを送信しました。メール宛先は未設定です。`;
    }
    if (report?.email?.reason === "email_send_failed") {
      return `${lineTargetText}日次レポートを送信しました。メール送信は失敗しました。`;
    }
    return `${lineTargetText}日次レポートを送信しました。`;
  }
  if (emailSent) return "講師へメールで日次レポートを送信しました。LINE送信は保留中です。";
  const reasons = {
    missing_channel_access_token: "LINEトークン未設定のため、日次レポート送信は保留中です。",
    coach_not_linked: "講師のLINE連携が未完了のため、日次レポート送信は保留中です。",
    line_send_failed: "LINE送信に失敗しました。設定と講師連携を確認してください。",
    no_records_for_date: `${formatShortDate(getRecordDateKey())}の記録がまだないため、日次レポートは送信していません。`,
  };
  return reasons[report?.reason] || "日次レポート送信は保留中です。";
}

function getRecordSaveStatusType(report) {
  if (report?.sent || report?.line?.sent || report?.email?.sent) return "success";
  if (
    report?.reason === "missing_channel_access_token"
    || report?.reason === "coach_not_linked"
    || report?.reason === "student_not_linked"
  ) return "pending";
  if (report?.reason === "line_send_failed") return "error";
  if (report?.reason === "no_records_for_date") return "pending";
  return "pending";
}

function setRecordSaveStatus(message, type = "neutral") {
  if (!elements.recordSaveStatus) return;
  elements.recordSaveStatus.textContent = message;
  elements.recordSaveStatus.dataset.status = type;
}

function getDailyReportStyle() {
  return elements.dailyReportStyle?.value || "standard";
}

function getWeeklyReportStyle() {
  return elements.weeklyReportStyle?.value || "standard";
}

async function sendDailyReportAgain() {
  const recordDateKey = getRecordDateKey();
  const savedRecords = state.checkIns.filter((checkIn) => checkIn.date === recordDateKey);
  if (!savedRecords.length) {
    const message = `${formatShortDate(recordDateKey)}の保存済み記録がまだありません。先に「保存してLINE送信」を押してください。`;
    elements.lineReportStatus.textContent = message;
    setRecordSaveStatus(message, "pending");
    renderReportReadiness();
    return;
  }
  elements.lineReportStatus.textContent = `${formatShortDate(recordDateKey)}のレポート送信を確認しています。`;
  try {
    const response = await fetch(`${API_BASE}/api/reports/daily`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date: recordDateKey,
        reportStyle: getDailyReportStyle(),
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    elements.lineReportStatus.textContent = buildLineReportStatus(result.report);
    loadReportLogs();
  } catch {
    elements.lineReportStatus.textContent = "日次レポート再送APIに接続できませんでした。";
  }
}

function buildAndShowWeeklyReport() {
  const report = buildWeeklyReportText(getWeeklyReportStyle());
  if (!elements.weeklyReportPreview) return;
  elements.weeklyReportPreview.innerHTML = buildLineReportPreviewHtml(report);
  elements.weeklyReportPreview.dataset.reportText = report;
  elements.weeklyReportPreview.hidden = false;
  if (elements.copyWeeklyReportButton) elements.copyWeeklyReportButton.disabled = false;
  if (elements.saveWeeklyReportPageButton) elements.saveWeeklyReportPageButton.disabled = false;
  if (elements.weeklyReportStatus) {
    elements.weeklyReportStatus.textContent = `今週の報告文を作成しました。形式は${reportStyleLabels[getWeeklyReportStyle()]}です。`;
  }
}

async function copyWeeklyReport() {
  const reportText = elements.weeklyReportPreview?.dataset.reportText || "";
  if (!reportText) {
    if (elements.weeklyReportStatus) elements.weeklyReportStatus.textContent = "先に週次レポートを作成してください。";
    return;
  }

  try {
    await navigator.clipboard.writeText(reportText);
    if (elements.weeklyReportStatus) elements.weeklyReportStatus.textContent = "週次レポートをコピーしました。ZoomやLINEに貼り付けできます。";
  } catch {
    if (elements.weeklyReportStatus) elements.weeklyReportStatus.textContent = "コピーできませんでした。表示された文面を選択してコピーしてください。";
  }
}

function openWeeklyEditDate() {
  const dateKey = elements.weeklyEditDate?.value || todayKey;
  if (!isValidDateKey(dateKey)) {
    if (elements.weeklyReportStatus) elements.weeklyReportStatus.textContent = "編集したい日付を正しく選んでください。";
    return;
  }

  selectRecordDate(dateKey);
  if (state.checkIns.some((checkIn) => checkIn.date === dateKey)) {
    openRecordEditModal(dateKey, true);
  } else {
    document.querySelector("#dailyRecordSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setRecordSaveStatus(`${formatShortDate(dateKey)}には保存済み記録がありません。この日の記録欄を開きました。`, "pending");
  }
}

async function saveWeeklyReportPage() {
  const text = elements.weeklyReportPreview?.dataset.reportText || "";
  if (!text) {
    if (elements.weeklyReportStatus) elements.weeklyReportStatus.textContent = "先に週次レポートを作成してください。";
    return;
  }

  const summary = buildWeeklySummary();
  elements.saveWeeklyReportPageButton.disabled = true;
  if (elements.weeklyReportStatus) elements.weeklyReportStatus.textContent = "共有URLを作成しています。";

  try {
    const response = await fetch(`${API_BASE}/api/reports/weekly-pages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: summary.startKey,
        endDate: summary.endKey,
        style: getWeeklyReportStyle(),
        text,
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const report = result.report;
    if (!report?.url) throw new Error("missing_weekly_url");
    if (elements.weeklyReportStatus) {
      elements.weeklyReportStatus.innerHTML = `共有URLを作成しました。<a href="${escapeHtml(report.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(report.url)}</a>`;
    }
    latestWeeklyReports = [report, ...latestWeeklyReports.filter((item) => item.id !== report.id)];
    renderWeeklyReportHistory(latestWeeklyReports);
    renderSubmissionSummary();
  } catch {
    if (elements.weeklyReportStatus) {
      elements.weeklyReportStatus.textContent = "共有URLを作成できませんでした。サーバーやRenderの状態を確認してください。文面コピーはできます。";
    }
  } finally {
    elements.saveWeeklyReportPageButton.disabled = false;
  }
}

async function loadWeeklyReports() {
  try {
    const response = await fetch(`${API_BASE}/api/reports/weekly`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const reports = Array.isArray(result.reports) ? result.reports : [];
    latestWeeklyReports = reports;
    renderWeeklyReportHistory(reports);
    renderSubmissionSummary();
  } catch {
    latestWeeklyReports = [];
    renderWeeklyReportHistory([]);
  }
}

async function loadReportLogs() {
  try {
    const response = await fetch(`${API_BASE}/api/reports/logs`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const logs = Array.isArray(result.logs) ? result.logs : [];
    latestReportLogs = logs;
    renderReportLogs(logs);
    renderSubmissionSummary();
  } catch {
    latestReportLogs = [];
    renderReportLogs([]);
  }
}

async function sendSelfTestReportAgain() {
  const recordDateKey = getRecordDateKey();
  const savedRecords = state.checkIns.filter((checkIn) => checkIn.date === recordDateKey);
  if (!savedRecords.length) {
    const message = `${formatShortDate(recordDateKey)}の保存済み記録がまだありません。先に入力して「自分だけにテスト送信」を押してください。`;
    elements.lineReportStatus.textContent = message;
    setRecordSaveStatus(message, "pending");
    renderReportReadiness();
    return;
  }
  elements.lineReportStatus.textContent = `${formatShortDate(recordDateKey)}のレポートを自分だけにテスト送信しています。`;
  try {
    const response = await fetch(`${API_BASE}/api/reports/daily`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date: recordDateKey,
        reportTarget: "student",
        reportStyle: getDailyReportStyle(),
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const statusText = buildLineReportStatus(result.report);
    elements.lineReportStatus.textContent = statusText;
    setRecordSaveStatus(statusText, getRecordSaveStatusType(result.report));
    loadReportLogs();
  } catch {
    const message = "自分だけのLINEテスト送信APIに接続できませんでした。";
    elements.lineReportStatus.textContent = message;
    setRecordSaveStatus(message, "error");
  }
}

function previewDailyReport() {
  const recordDateKey = getRecordDateKey();
  elements.lineReportStatus.textContent = `${formatShortDate(recordDateKey)}の入力中のLINE文面を確認しています。`;
  hideLineReportPreviews();
  const records = collectMultiHabitRecords(recordDateKey);
  const text = buildDraftDailyReportMessage(recordDateKey, records, getDailyReportStyle());
  showLineReportPreviews(text);
  elements.lineReportStatus.textContent = `${formatShortDate(recordDateKey)}の入力中のLINE文面を表示しました。報告文は${reportStyleLabels[getDailyReportStyle()]}です。実際の送信はしていません。`;
  setRecordSaveStatus(`${formatShortDate(recordDateKey)}の入力中のLINE文面を表示しました。保存・送信はしていません。`, "neutral");
}

function buildDraftDailyReportMessage(date, records, style = "standard") {
  if (style === "short") return buildShortDraftDailyReportMessage(date, records);

  const lines = [
    "【太田の習慣レポート】",
    `記録日: ${formatShortDate(date)}`,
    "",
    "【習慣別の記録】",
    ...records.flatMap(({ habit, plannedMinimumAction, checkIn }, index) => formatDraftDailyRecordSection(
      habit,
      plannedMinimumAction,
      checkIn,
      index,
      style,
    )),
  ];
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function buildShortDraftDailyReportMessage(date, records) {
  const doneCount = records.filter(({ checkIn }) => checkIn.status === "done").length;
  const partialCount = records.filter(({ checkIn }) => checkIn.status === "partial").length;
  const missedCount = records.filter(({ checkIn }) => checkIn.status === "missed").length;
  const learningMinutes = records.reduce((total, { checkIn }) => total + Number(checkIn.learningMinutes || 0), 0);
  const lines = [
    "【太田の習慣レポート】",
    `記録日: ${formatShortDate(date)}`,
    `結果: できた${doneCount} / 少し${partialCount} / 未達${missedCount}`,
    learningMinutes ? `学習: ${formatDuration(learningMinutes)}` : "",
    "",
    ...records.map(({ habit, checkIn }) => {
      const note = summarizeDraftText(checkIn.note || "", 42);
      return `・${habit.title}: ${statusLabels[checkIn.status] || checkIn.status}${note ? ` / ${note}` : ""}`;
    }),
  ].filter(Boolean);
  return lines.join("\n").trim();
}

function formatDraftDailyRecordSection(habit, plannedMinimumAction, checkIn, index, style = "standard") {
  const learningDuration = formatDuration(Number(checkIn.learningMinutes));
  const learningTimeRange = formatLearningTimeRange(checkIn);
  const lines = [
    `${index + 1}. ${habit.title}`,
    `・結果: ${statusLabels[checkIn.status] || checkIn.status}`,
    plannedMinimumAction ? `・最低ライン: ${plannedMinimumAction}` : "",
    learningDuration ? `・学習時間: ${learningDuration}` : "",
    learningTimeRange ? `・時間帯: ${learningTimeRange}` : "",
  ].filter(Boolean);

  if (checkIn.note) {
    if (style === "detailed") {
      lines.push("・メモ:");
      lines.push(...formatDraftReportNote(checkIn.note));
    } else {
      const summary = summarizeDraftText(checkIn.note, 70);
      if (summary) lines.push(`・メモ: ${summary}`);
    }
  }

  lines.push("");
  return lines;
}

function formatDraftReportNote(note) {
  const lines = note.replace(/\r\n/g, "\n").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  return lines.map((line) => {
    const trimmedEnd = line.trimEnd();
    if (!trimmedEnd.trim()) return "";
    return `  ${normalizeDraftReportNoteLine(trimmedEnd.trimStart())}`;
  });
}

function normalizeDraftReportNoteLine(line) {
  const match = line.match(/^([PDCA])\s*[:：]\s*(.*)$/i);
  if (!match) return toPlainDraftReportStyle(line);

  const labels = {
    P: "計画",
    D: "実行",
    C: "確認",
    A: "改善",
  };
  const code = match[1].toUpperCase();
  const label = labels[code];
  const body = toPlainDraftReportStyle(match[2].replace(new RegExp(`^${label}\\s*[:：]?\\s*`), "").trim());
  return body ? `${code}：${label} ${body}` : `${code}：${label}`;
}

function summarizeDraftPdcaNote(note) {
  const sections = extractDraftPdcaSections(note);
  if (!Object.keys(sections).length) return [];

  return [
    ["計画", "P：計画"],
    ["実行", "D：実行"],
    ["確認", "C：確認"],
    ["改善", "A：改善"],
  ]
    .map(([key, label]) => {
      const summary = summarizeDraftText(sections[key] || "");
      return summary ? `${label} ${summary}` : "";
    })
    .filter(Boolean);
}

function extractDraftPdcaSections(note) {
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

function summarizeDraftText(text, maxLength = 58) {
  const normalized = toPlainDraftReportStyle(text).replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const firstSentence = normalized.split(/(?<=[。！？!?])\s*/)[0] || normalized;
  if (firstSentence.length <= maxLength) return firstSentence;
  return `${firstSentence.slice(0, maxLength - 1)}…`;
}

function toPlainDraftReportStyle(text) {
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

function hideLineReportPreviews() {
  [elements.lineReportPreview, elements.dailyLineReportPreview, elements.modalLineReportPreview].forEach((preview) => {
    if (!preview) return;
    preview.hidden = true;
    preview.replaceChildren();
  });
  closeReportPreviewModal();
}

function showLineReportPreviews(text) {
  [elements.lineReportPreview, elements.dailyLineReportPreview, elements.modalLineReportPreview].forEach((preview) => {
    if (!preview) return;
    preview.innerHTML = buildLineReportPreviewHtml(text);
    preview.hidden = false;
  });
  openReportPreviewModal();
}

function openReportPreviewModal() {
  if (!elements.reportPreviewModal) return;
  elements.reportPreviewModal.hidden = false;
  elements.closeReportPreviewButton?.focus();
}

function closeReportPreviewModal() {
  if (!elements.reportPreviewModal || elements.reportPreviewModal.hidden) return;
  elements.reportPreviewModal.hidden = true;
}

function openRecordEditModal(date, focusDate = false) {
  if (!elements.recordEditModal || !elements.recordEditList) return;
  const habitOrder = new Map(state.habits.map((habit, index) => [habit.id, index]));
  const records = state.checkIns
    .filter((checkIn) => checkIn.date === date)
    .sort((left, right) => (habitOrder.get(left.habitId) || 0) - (habitOrder.get(right.habitId) || 0));
  if (!records.length) {
    setRecordSaveStatus(`${formatShortDate(date)}には編集できる保存済み記録がありません。`, "error");
    return;
  }

  editingRecordDate = date;
  recordEditReturnFocus = document.activeElement;
  elements.recordEditDate.value = date;
  elements.recordEditSummary.textContent = `${formatShortDate(date)}の保存済み記録 ${records.length}件`;
  elements.recordEditStatus.textContent = "";
  elements.recordEditStatus.dataset.status = "neutral";
  elements.recordEditList.innerHTML = records.map(buildRecordEditItemHtml).join("");
  elements.recordEditList.querySelectorAll(".record-edit-item[data-category='learning']").forEach((item) => {
    updateRecordEditLearningItem(item);
  });
  elements.recordEditModal.hidden = false;

  requestAnimationFrame(() => {
    const target = focusDate
      ? elements.recordEditDate
      : elements.recordEditList.querySelector("textarea, input");
    target?.focus();
  });
}

function buildRecordEditItemHtml(record) {
  const habit = findHabit(record.habitId);
  const plannedMinimumAction = getPlan(record.date, record.habitId)?.plannedMinimumAction
    || habit.minimumAction;
  const learningSessions = getLearningSessionsFromCheckIn(record);
  const learningRows = (learningSessions.length ? learningSessions : [{}])
    .map((session, index) => buildMultiLearningSessionRow(session, index + 1))
    .join("");

  return `
    <article class="record-edit-item" data-habit-id="${escapeHtml(record.habitId)}" data-category="${escapeHtml(habit.category)}">
      <div class="record-edit-item-header">
        <div>
          <p class="category">${escapeHtml(categoryLabels[habit.category])}</p>
          <h3>${escapeHtml(habit.title)}</h3>
        </div>
        <span class="status-badge ${record.status === "missed" ? "missed" : "done"}">${escapeHtml(statusLabels[record.status])}</span>
      </div>
      <label>
        今日の目安
        <input class="record-edit-minimum" type="text" maxlength="120" value="${escapeHtml(plannedMinimumAction)}" required>
      </label>
      <fieldset class="record-edit-result-field">
        <legend>結果</legend>
        <div class="segmented-control compact-segmented-control">
          <label><input type="radio" name="record-edit-status-${escapeHtml(record.habitId)}" value="done" ${record.status === "done" ? "checked" : ""}>できた</label>
          <label><input type="radio" name="record-edit-status-${escapeHtml(record.habitId)}" value="partial" ${record.status === "partial" ? "checked" : ""}>少し</label>
          <label><input type="radio" name="record-edit-status-${escapeHtml(record.habitId)}" value="missed" ${record.status === "missed" ? "checked" : ""}>未達</label>
        </div>
      </fieldset>
      ${habit.category === "learning" ? `
        <div class="record-edit-learning">
          <strong class="record-edit-learning-duration">時間帯を入力すると自動計算されます</strong>
          <div class="learning-session-list">${learningRows}</div>
          <button class="ghost-button compact-button record-edit-add-learning-session" type="button">時間帯を追加</button>
        </div>
      ` : ""}
      <label>
        ひとことメモ
        <textarea class="record-edit-note" rows="4" maxlength="2000" placeholder="この習慣について残したいこと">${escapeHtml(record.note || "")}</textarea>
      </label>
    </article>
  `;
}

function handleRecordEditListInput(event) {
  if (!event.target.matches(".learning-start-time, .learning-end-time")) return;
  updateRecordEditLearningItem(event.target.closest(".record-edit-item"));
}

function handleRecordEditListClick(event) {
  const addButton = event.target.closest(".record-edit-add-learning-session");
  if (addButton) {
    const item = addButton.closest(".record-edit-item");
    const list = item.querySelector(".learning-session-list");
    list.insertAdjacentHTML("beforeend", buildMultiLearningSessionRow({}, list.children.length + 1));
    updateRecordEditLearningItem(item);
    return;
  }

  const removeButton = event.target.closest(".remove-learning-session-button");
  if (!removeButton) return;
  const item = removeButton.closest(".record-edit-item");
  removeButton.closest(".learning-session-row")?.remove();
  const list = item.querySelector(".learning-session-list");
  if (!list.children.length) {
    list.insertAdjacentHTML("beforeend", buildMultiLearningSessionRow());
  }
  updateRecordEditLearningItem(item);
}

function updateRecordEditLearningItem(item) {
  if (!item) return;
  const rows = Array.from(item.querySelectorAll(".learning-session-row"));
  rows.forEach((row, index) => {
    row.querySelector(".remove-learning-session-button").hidden = rows.length === 1;
    row.querySelector(".learning-start-time").setAttribute("aria-label", `学習開始時刻 ${index + 1}`);
    row.querySelector(".learning-end-time").setAttribute("aria-label", `学習終了時刻 ${index + 1}`);
  });
  const totalMinutes = collectMultiLearningSessions(item)
    .reduce((total, session) => total + Number(calculateMinutesBetween(session.startTime, session.endTime) || 0), 0);
  const display = item.querySelector(".record-edit-learning-duration");
  if (display) {
    display.textContent = totalMinutes > 0
      ? `学習時間: ${formatDuration(totalMinutes)}`
      : "時間帯を入力すると自動計算されます";
  }
}

async function handleRecordEditSubmit(event) {
  event.preventDefault();
  if (!editingRecordDate) return;

  const fromDate = editingRecordDate;
  const toDate = elements.recordEditDate.value;
  if (!isValidDateKey(toDate)) {
    elements.recordEditStatus.textContent = "正しい報告日を選択してください。";
    elements.recordEditStatus.dataset.status = "error";
    return;
  }

  const sourceRecords = state.checkIns.filter((checkIn) => checkIn.date === fromDate);
  const habitIds = new Set(sourceRecords.map((record) => record.habitId));
  const targetRecords = state.checkIns.filter(
    (checkIn) => checkIn.date === toDate && habitIds.has(checkIn.habitId),
  );
  if (toDate !== fromDate && targetRecords.length) {
    const overwrite = window.confirm(
      `${formatShortDate(toDate)}には同じ習慣の記録が${targetRecords.length}件あります。\n上書きして報告日を変更しますか？`,
    );
    if (!overwrite) return;
  }

  const editedRecords = Array.from(elements.recordEditList.querySelectorAll(".record-edit-item"))
    .map((item) => {
      const habitId = item.dataset.habitId;
      const sourceRecord = sourceRecords.find((record) => record.habitId === habitId);
      const habit = findHabit(habitId);
      const learningSessions = habit.category === "learning" ? collectMultiLearningSessions(item) : [];
      const learningMinutes = learningSessions.reduce(
        (total, session) => total + Number(calculateMinutesBetween(session.startTime, session.endTime) || 0),
        0,
      );
      const plannedMinimumAction = item.querySelector(".record-edit-minimum").value.trim();
      const checkIn = {
        ...sourceRecord,
        date: toDate,
        habitId,
        status: item.querySelector(`input[name="record-edit-status-${CSS.escape(habitId)}"]:checked`)?.value || "done",
        learningMinutes: learningMinutes > 0 ? String(learningMinutes) : "",
        learningSessions,
        learningStartTime: learningSessions[0]?.startTime || "",
        learningEndTime: learningSessions[0]?.endTime || "",
        note: item.querySelector(".record-edit-note").value.trim(),
      };
      return {
        checkIn,
        plannedMinimumAction,
        serverRecord: {
          ...checkIn,
          habitTitle: habit.title,
          plannedMinimumAction,
        },
      };
    });

  const submitButton = elements.recordEditForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  elements.recordEditStatus.textContent = "変更を保存しています。";
  elements.recordEditStatus.dataset.status = "checking";

  try {
    const response = await fetch(`${API_BASE}/api/records/bulk`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromDate,
        records: editedRecords.map(({ serverRecord }) => serverRecord),
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (!Array.isArray(result.records) || result.records.length !== editedRecords.length) {
      throw new Error("edited_records_mismatch");
    }

    editedRecords.forEach(({ checkIn, plannedMinimumAction }) => {
      state.checkIns = state.checkIns.filter(
        (record) => !(record.habitId === checkIn.habitId && (record.date === fromDate || record.date === toDate)),
      );
      state.checkIns.push(checkIn);
      state.plans = state.plans.filter(
        (plan) => !(plan.habitId === checkIn.habitId && (plan.date === fromDate || plan.date === toDate)),
      );
      state.plans.push({
        date: toDate,
        habitId: checkIn.habitId,
        plannedMinimumAction,
      });
    });

    selectedCalendarDate = toDate;
    calendarCursor = new Date(`${toDate}T00:00:00`);
    saveState();
    closeRecordEditModal();
    render();
    const message = `${formatShortDate(toDate)}の報告内容を更新しました。LINEは送信していません。`;
    elements.lineReportStatus.textContent = `${message}必要な場合は、この日のレポートを再送してください。`;
    setRecordSaveStatus(message, "success");
  } catch {
    elements.recordEditStatus.textContent = "サーバーに接続できないため、変更は保存していません。サーバーを起動してからもう一度お試しください。";
    elements.recordEditStatus.dataset.status = "error";
  } finally {
    submitButton.disabled = false;
  }
}

function closeRecordEditModal() {
  if (!elements.recordEditModal || elements.recordEditModal.hidden) return;
  elements.recordEditModal.hidden = true;
  editingRecordDate = null;
  if (recordEditReturnFocus && typeof recordEditReturnFocus.focus === "function") {
    recordEditReturnFocus.focus();
  }
  recordEditReturnFocus = null;
}

function updateScrollTopButton() {
  const appShell = document.querySelector(".app-shell");
  if (!elements.scrollTopButton || !appShell) return;
  elements.scrollTopButton.hidden = appShell.scrollTop < 280;
}

function scrollToTop() {
  document.querySelector(".app-shell")?.scrollTo({ top: 0, behavior: "smooth" });
}

function handlePageTabClick(event) {
  const button = event.target.closest("[data-scroll-target]");
  if (!button) return;

  const target = document.querySelector(button.dataset.scrollTarget);
  if (!target) return;

  target.querySelector("details")?.setAttribute("open", "");
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Renders the plain LINE report as a light review card before the user sends it.
function buildLineReportPreviewHtml(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<div class="report-preview-spacer" aria-hidden="true"></div>';
      if (/^【.+】$/.test(trimmed)) {
        return `<h3>${escapeHtml(trimmed.replace(/[【】]/g, ""))}</h3>`;
      }
      if (/^\d+\.\s/.test(trimmed)) {
        return `<h4>${escapeHtml(trimmed)}</h4>`;
      }
      if (trimmed.startsWith("・")) {
        return `<p class="report-preview-item">${escapeHtml(trimmed)}</p>`;
      }
      if (/^(?:[PDCA]\s*[:：]\s*)?(計画|実行|確認|改善)/.test(trimmed)) {
        return `<strong class="report-preview-note-heading">${escapeHtml(trimmed)}</strong>`;
      }
      return `<p class="report-preview-note">${escapeHtml(trimmed)}</p>`;
    })
    .join("");
}

function render(latestEvent = null) {
  renderSelectedRecordDate();
  renderReportReadiness();
  renderTodayPromises();
  renderStats();
  renderBlockerInsights();
  renderWeeklyReview();
  renderCalendar();
  renderHistory();
  renderCoachMessage(latestEvent);
}

function renderReportReadiness() {
  if (!elements.reportReadinessStatus) return;
  const recordDateKey = getRecordDateKey();
  const savedRecords = state.checkIns.filter((checkIn) => checkIn.date === recordDateKey);
  const isToday = recordDateKey === todayKey;

  let message = "";
  let status = "neutral";
  if (!savedRecords.length) {
    message = `${formatShortDate(recordDateKey)}の保存済み記録はまだありません。入力後に「保存してLINE送信」を押すと報告されます。`;
    status = "pending";
  } else if (latestLineHealth && !latestLineHealth.lineConfigured) {
    message = "LINE設定が未完了です。LINE Developersの設定を確認してください。";
    status = "error";
  } else if (latestLinkStatus && !latestLinkStatus.coachLinked) {
    message = "講師のLINE連携が未完了です。講師コードの連携を確認してください。";
    status = "pending";
  } else if (latestLinkStatus && !latestLinkStatus.studentLinked) {
    message = "本人のLINE連携が未完了です。自分への確認送信は保留になります。";
    status = "pending";
  } else if (latestLineHealth === null || latestLinkStatus === null) {
    message = "LINE報告に必要な設定状態を確認しています。";
    status = "checking";
  } else {
    message = `${formatShortDate(recordDateKey)}は${savedRecords.length}件保存済みです。LINE報告できる状態です。`;
    status = "success";
  }

  if (isToday && !savedRecords.length) {
    message = "今日の記録はまだ保存されていません。保存すると講師と自分へLINE報告されます。";
  }
  elements.reportReadinessStatus.textContent = message;
  elements.reportReadinessStatus.dataset.status = status;
}

function renderSelectedRecordDate() {
  const recordDateKey = getRecordDateKey();
  const isToday = recordDateKey === todayKey;
  elements.dailyFormTitle.textContent = isToday ? "今日の記録" : `${formatShortDate(recordDateKey)}の記録`;
  elements.recordDateLabel.textContent = isToday
    ? "記録日: 今日"
    : `記録日: ${formatShortDate(recordDateKey)}`;
  elements.resetRecordDateButton.hidden = isToday;
  elements.sendDailyReportButton.textContent = isToday ? "今日のレポートを再送" : "この日のレポートを再送";
  renderMultiHabitRecordForms();
}

function renderTodayPromises() {
  if (!elements.todayPromises) return;
  const template = document.querySelector("#promiseTemplate");
  elements.todayPromises.innerHTML = "";

  state.habits
    .filter((habit) => habit.active)
    .forEach((habit) => {
      const plan = getPlan(todayKey, habit.id);
      const checkIn = getCheckIn(todayKey, habit.id);
      const card = template.content.firstElementChild.cloneNode(true);
      card.dataset.category = habit.category;
      card.dataset.habitId = habit.id;
      card.querySelector(".category").textContent = categoryLabels[habit.category];
      card.querySelector("h3").textContent = habit.title;
      card.querySelector(".minimum").textContent = plan
        ? plan.plannedMinimumAction
        : habit.minimumAction;
      card.querySelector(".habit-title-input").value = habit.title;
      card.querySelector(".habit-minimum-input").value = habit.minimumAction;
      setupHabitEditVoiceButton(card.querySelector(".habit-title-voice-button"), `habitTitle:${habit.id}`, `${habit.title}の習慣名を音声入力`);
      setupHabitEditVoiceButton(card.querySelector(".habit-minimum-voice-button"), `habitMinimum:${habit.id}`, `${habit.title}の標準の最低ラインを音声入力`);
      card.querySelector(".habit-edit-button").addEventListener("click", () => showHabitEditor(card, true));
      card.querySelector(".habit-cancel-button").addEventListener("click", () => showHabitEditor(card, false));
      card.querySelector(".habit-edit-form").addEventListener("submit", (event) => {
        handleHabitEdit(event, habit.id, card);
      });
      card.querySelector(".habit-record-button").addEventListener("click", () => {
        selectRecordDate(todayKey, habit.id);
        document.querySelector(".daily-record-panel").scrollIntoView({ behavior: "smooth", block: "start" });
      });

      const badge = card.querySelector(".status-badge");
      badge.textContent = checkIn ? statusLabels[checkIn.status] : "未記録";
      badge.classList.toggle("done", checkIn?.status === "done" || checkIn?.status === "partial");
      badge.classList.toggle("missed", checkIn?.status === "missed");
      elements.todayPromises.append(card);
    });
}

function setupHabitEditVoiceButton(button, target, label) {
  button.dataset.voiceTarget = target;
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
  button.querySelector(".sr-only").textContent = label;
}

function showHabitEditor(card, shouldShow) {
  card.querySelector(".habit-summary").hidden = shouldShow;
  card.querySelector(".habit-card-footer").hidden = shouldShow;
  card.querySelector(".habit-edit-form").hidden = !shouldShow;
}

function handleHabitEdit(event, habitId, card) {
  event.preventDefault();
  const form = event.currentTarget;
  const habit = findHabit(habitId);
  const title = form.querySelector(".habit-title-input").value.trim();
  const minimumAction = form.querySelector(".habit-minimum-input").value.trim();
  if (!title || !minimumAction) return;

  habit.title = title;
  habit.minimumAction = minimumAction;
  upsertByDateAndHabit(state.plans, {
    date: getRecordDateKey(),
    habitId,
    plannedMinimumAction: minimumAction,
  });
  saveState();
  populateHabitSelects();
  elements.habitSelect.value = habitId;
  updatePlanInput();
  form.querySelector(".habit-save-note").textContent = "保存しました。";
  card.querySelector("h3").textContent = title;
  card.querySelector(".minimum").textContent = minimumAction;
  showHabitEditor(card, false);
  render({
    type: "habit-edited",
    habitId,
  });
}

function renderStats() {
  if (!elements.minimumWins || !elements.returnCount || !elements.moodTrend) return;
  const sorted = [...state.checkIns].sort((a, b) => a.date.localeCompare(b.date));
  const successDates = new Set(
    sorted
      .filter((checkIn) => checkIn.status === "done" || checkIn.status === "partial")
      .map((checkIn) => checkIn.date),
  );

  elements.minimumWins.textContent = successDates.size;
  elements.returnCount.textContent = countReturns(sorted);
  elements.moodTrend.textContent = calculateMoodTrend(sorted);
}

function renderBlockerInsights() {
  if (!elements.blockerInsights) return;

  const insights = analyzeBlockers(state.checkIns);
  elements.blockerInsights.innerHTML = "";

  if (!insights.length) {
    elements.blockerInsights.append(createEmptyMessage("つまずいた理由を数日分残すと、止まりやすいパターンを表示します。"));
    return;
  }

  insights.forEach((insight) => {
    const item = document.createElement("article");
    item.className = "insight-item";
    item.innerHTML = `
      <h3>${escapeHtml(insight.title)}</h3>
      <p>${escapeHtml(insight.body)}</p>
    `;
    elements.blockerInsights.append(item);
  });
}

function renderWeeklyReview() {
  const review = buildWeeklyReview();
  elements.weeklyReview.innerHTML = "";
  renderWeeklyScoreGrid();
  renderMissingRecords();
  renderSubmissionSummary();

  review.forEach((item) => {
    const card = document.createElement("article");
    card.className = "review-item";
    card.innerHTML = `
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
    `;
    elements.weeklyReview.append(card);
  });
}

function renderWeeklyScoreGrid() {
  if (!elements.weeklyScoreGrid) return;
  const summary = buildWeeklySummary();
  elements.weeklyScoreGrid.innerHTML = "";

  [
    { label: "記録日数", value: `${summary.activeDates}日` },
    { label: "達成・少し", value: `${summary.successCount}件` },
    { label: "未達", value: `${summary.missedCount}件` },
    { label: "学習合計", value: summary.learningMinutes ? formatDuration(summary.learningMinutes) : "-" },
  ].forEach((item) => {
    const card = document.createElement("article");
    card.className = "weekly-score-card";
    card.innerHTML = `
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    `;
    elements.weeklyScoreGrid.append(card);
  });
}

function renderMissingRecords() {
  if (!elements.missingRecordPanel) return;
  const missingDates = getRecentMissingRecordDates(7);
  elements.missingRecordPanel.innerHTML = "";

  if (!missingDates.length) {
    elements.missingRecordPanel.innerHTML = "<strong>記録漏れ</strong><p>直近7日分は記録が入っています。</p>";
    elements.missingRecordPanel.dataset.status = "complete";
    return;
  }

  elements.missingRecordPanel.dataset.status = "attention";
  elements.missingRecordPanel.innerHTML = `
    <strong>未記録の日があります</strong>
    <p>${missingDates.map((date) => formatShortDate(date)).join("、")} が未記録です。必要なら日付を開いて入力できます。</p>
    <div class="missing-date-actions">
      ${missingDates.map((date) => `<button class="ghost-button compact-button" type="button" data-missing-date="${escapeHtml(date)}">${escapeHtml(formatShortDate(date))}</button>`).join("")}
    </div>
  `;
  elements.missingRecordPanel.querySelectorAll("[data-missing-date]").forEach((button) => {
    button.addEventListener("click", () => {
      selectRecordDate(button.dataset.missingDate);
      document.querySelector("#dailyRecordSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function getRecentMissingRecordDates(dayCount) {
  return Array.from({ length: dayCount }, (_, index) => formatDateKey(addDays(today, -index)))
    .reverse()
    .filter((date) => !state.checkIns.some((checkIn) => checkIn.date === date));
}

function renderWeeklyReportHistory(reports) {
  if (!elements.weeklyReportHistory) return;
  elements.weeklyReportHistory.innerHTML = "";
  if (!reports.length) {
    elements.weeklyReportHistory.append(createEmptyMessage("週次レポートの共有URL履歴はまだありません。"));
    return;
  }

  reports.slice(0, 5).forEach((report) => {
    const item = document.createElement("article");
    item.className = "weekly-history-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(formatShortDate(report.startDate))}〜${escapeHtml(formatShortDate(report.endDate))}</strong>
        <p>${escapeHtml(reportStyleLabels[report.style] || "標準")} / ${escapeHtml(formatCreatedAt(report.createdAt))}</p>
      </div>
      <a class="ghost-button compact-button" href="${escapeHtml(report.url)}" target="_blank" rel="noopener noreferrer">開く</a>
    `;
    elements.weeklyReportHistory.append(item);
  });
}

function renderReportLogs(logs) {
  if (!elements.reportLogList) return;
  elements.reportLogList.innerHTML = "";
  if (!logs.length) {
    elements.reportLogList.append(createEmptyMessage("まだLINE送信ログはありません。"));
    return;
  }

  logs.slice(0, 6).forEach((log) => {
    const item = document.createElement("article");
    item.className = "report-log-item";
    item.dataset.status = log.sent ? "success" : "pending";
    item.innerHTML = `
      <strong>${escapeHtml(formatShortDate(log.date))} / ${escapeHtml(formatReportTarget(log.target))}</strong>
      <p>${escapeHtml(log.sent ? "送信済み" : "未送信・保留")} / ${escapeHtml(reportStyleLabels[log.style] || "標準")} / ${escapeHtml(formatCreatedAt(log.createdAt))}</p>
    `;
    elements.reportLogList.append(item);
  });
}

function renderSubmissionSummary() {
  const latestReport = latestWeeklyReports[0];
  const latestLog = latestReportLogs[0];
  if (elements.latestWeeklyReportUrl) {
    elements.latestWeeklyReportUrl.innerHTML = latestReport?.url
      ? `<a href="${escapeHtml(latestReport.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(latestReport.url)}</a>`
      : "まだ共有URLは作成されていません。";
  }
  if (elements.latestReportLog) {
    elements.latestReportLog.textContent = latestLog
      ? `${formatShortDate(latestLog.date)} / ${formatReportTarget(latestLog.target)} / ${latestLog.sent ? "送信済み" : "保留"}`
      : "まだ送信ログはありません。";
  }
  if (elements.submissionTestStatus) {
    const stored = loadTestChecklistState();
    const checkedCount = testChecklistItems.filter((item) => stored[item.id]).length;
    elements.submissionTestStatus.textContent = `確認済み ${checkedCount} / ${testChecklistItems.length} 件`;
  }
}

function formatReportTarget(target) {
  if (target === "student") return "自分だけ";
  if (target === "coach_and_student") return "講師と自分";
  return "通常送信";
}

function formatCreatedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function renderCalendar() {
  if (!elements.calendarPanel || !elements.calendarGrid || !elements.calendarMonthLabel) return;
  if (elements.calendarPanel.hidden) return;

  elements.calendarMonthLabel.textContent = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
  }).format(calendarCursor);
  elements.calendarGrid.innerHTML = "";

  buildCalendarDays(calendarCursor).forEach((date) => {
    const dateKey = formatDateKey(date);
    const dayRecords = state.checkIns.filter((checkIn) => checkIn.date === dateKey);
    const button = document.createElement("button");
    button.className = "calendar-day";
    button.type = "button";
    button.classList.toggle("is-outside", date.getMonth() !== calendarCursor.getMonth());
    button.classList.toggle("is-today", dateKey === todayKey);
    button.classList.toggle("is-selected", dateKey === selectedCalendarDate);
    button.classList.toggle("has-records", dayRecords.length > 0);
    button.classList.toggle("has-missed", dayRecords.some((record) => record.status === "missed"));
    button.dataset.dayStatus = getDayStatus(dayRecords);
    button.setAttribute("aria-label", `${formatShortDate(dateKey)}の記録 ${dayRecords.length}件`);
    button.innerHTML = `
      <span class="calendar-date">
        <span>${date.getDate()}</span>
        <span class="calendar-count">${dayRecords.length ? `${dayRecords.length}件` : ""}</span>
      </span>
      <span class="calendar-dots">${buildCalendarDots(dayRecords)}</span>
    `;
    button.addEventListener("click", () => {
      selectRecordDate(dateKey);
    });
    elements.calendarGrid.append(button);
  });

  renderCalendarDetail();
}

function toggleCalendarPanel() {
  if (!elements.calendarPanel || !elements.todayLabel) return;
  const willOpen = elements.calendarPanel.hidden;
  elements.calendarPanel.hidden = !willOpen;
  elements.todayLabel.setAttribute("aria-expanded", String(willOpen));
  elements.todayLabel.classList.toggle("is-active", willOpen);
  if (willOpen) {
    renderCalendar();
  }
}

function selectRecordDate(dateKey, habitId = elements.habitSelect.value) {
  selectedCalendarDate = dateKey;
  calendarCursor = new Date(`${dateKey}T00:00:00`);
  elements.habitSelect.value = habitId;
  updatePlanInput();
  render();
}

function renderCalendarDetail() {
  const records = state.checkIns.filter((checkIn) => checkIn.date === selectedCalendarDate);
  elements.calendarDetail.innerHTML = "";

  const header = document.createElement("div");
  header.className = "calendar-detail-header";
  const title = document.createElement("h3");
  title.textContent = `${formatShortDate(selectedCalendarDate)}の記録`;
  header.append(title);
  if (records.length) {
    const editButton = document.createElement("button");
    editButton.className = "primary-button compact-button";
    editButton.type = "button";
    editButton.textContent = "この日の報告を編集";
    editButton.addEventListener("click", () => openRecordEditModal(selectedCalendarDate));
    header.append(editButton);
  }
  elements.calendarDetail.append(header);

  if (!records.length) {
    elements.calendarDetail.append(createEmptyMessage("この日の記録はまだありません。"));
    return;
  }

  const list = document.createElement("div");
  list.className = "calendar-detail-list";
  records.forEach((record) => {
    const item = document.createElement("article");
    item.className = "calendar-detail-item";
    item.innerHTML = `
      <div class="calendar-detail-body">
        <h3>${escapeHtml(findHabit(record.habitId).title)} / ${escapeHtml(statusLabels[record.status])}</h3>
        <p class="history-note">${escapeHtml(buildHistoryNote(record))}</p>
      </div>
      <div class="calendar-detail-actions">
        <button class="ghost-button compact-button danger-button subtle-button" type="button" data-action="delete">削除</button>
      </div>
    `;
    item.querySelector('[data-action="delete"]').addEventListener("click", () => deleteCheckIn(record.date, record.habitId));
    list.append(item);
  });
  elements.calendarDetail.append(list);
}

function renderHistory() {
  const sortedAll = [...state.checkIns].sort((a, b) => b.date.localeCompare(a.date));
  elements.historyList.innerHTML = "";
  renderHistoryFilters(sortedAll);

  if (!sortedAll.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "まだ記録はありません。今夜、小さな一歩を残してみましょう。";
    elements.historyList.append(empty);
    return;
  }

  const monthFilter = elements.historyMonthFilter?.value || "";
  const habitFilter = elements.historyHabitFilter?.value || "";
  const statusFilter = elements.historyStatusFilter?.value || "";
  const searchText = elements.historySearchInput?.value.trim().toLowerCase() || "";
  const sorted = sortedAll.filter((checkIn) => {
    if (monthFilter && getHistoryMonthKey(checkIn.date) !== monthFilter) return false;
    if (habitFilter && checkIn.habitId !== habitFilter) return false;
    if (statusFilter && checkIn.status !== statusFilter) return false;
    if (searchText) {
      const habit = findHabit(checkIn.habitId);
      const haystack = `${habit.title} ${statusLabels[checkIn.status]} ${buildHistoryNote(checkIn)}`.toLowerCase();
      if (!haystack.includes(searchText)) return false;
    }
    return true;
  });

  const countLabel = document.createElement("p");
  countLabel.className = "history-count-label";
  countLabel.textContent = `全${sortedAll.length}件中 ${sorted.length}件を表示中`;
  elements.historyList.append(countLabel);

  if (!sorted.length) {
    elements.historyList.append(createEmptyMessage("条件に合う記録はありません。絞り込みを変更してください。"));
    return;
  }

  let currentMonthLabel = "";
  sorted.forEach((checkIn) => {
    const monthLabel = formatHistoryMonth(checkIn.date);
    if (monthLabel !== currentMonthLabel) {
      currentMonthLabel = monthLabel;
      const monthHeading = document.createElement("h3");
      monthHeading.className = "history-month-heading";
      monthHeading.textContent = monthLabel;
      elements.historyList.append(monthHeading);
    }

    const habit = findHabit(checkIn.habitId);
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `
      <div class="history-item-header">
        <div>
          <strong>${formatShortDate(checkIn.date)}</strong>
          <h3>${escapeHtml(habit.title)} / ${escapeHtml(statusLabels[checkIn.status])}</h3>
        </div>
      </div>
      <p class="history-note">${escapeHtml(buildHistoryNote(checkIn))}</p>
      <div class="history-actions">
        <button class="ghost-button compact-button" type="button" data-action="edit">編集</button>
        <button class="ghost-button compact-button" type="button" data-action="change-date">日付変更</button>
        <button class="ghost-button compact-button danger-button" type="button" data-action="delete">削除</button>
      </div>
    `;
    item.querySelector('[data-action="edit"]').addEventListener("click", () => openRecordEditModal(checkIn.date));
    item.querySelector('[data-action="change-date"]').addEventListener("click", () => openRecordEditModal(checkIn.date, true));
    item.querySelector('[data-action="delete"]').addEventListener("click", () => deleteCheckIn(checkIn.date, checkIn.habitId));
    elements.historyList.append(item);
  });
}

function renderHistoryFilters(records) {
  if (!elements.historyMonthFilter || !elements.historyHabitFilter) return;

  const selectedMonth = elements.historyMonthFilter.value;
  const selectedHabit = elements.historyHabitFilter.value;
  const months = Array.from(new Set(records.map((checkIn) => getHistoryMonthKey(checkIn.date)))).sort().reverse();
  elements.historyMonthFilter.innerHTML = [
    '<option value="">すべて</option>',
    ...months.map((monthKey) => `<option value="${escapeHtml(monthKey)}">${escapeHtml(formatHistoryMonth(`${monthKey}-01`))}</option>`),
  ].join("");
  elements.historyMonthFilter.value = months.includes(selectedMonth) ? selectedMonth : "";

  const activeHabits = state.habits.filter((habit) => habit.active || records.some((record) => record.habitId === habit.id));
  elements.historyHabitFilter.innerHTML = [
    '<option value="">すべて</option>',
    ...activeHabits.map((habit) => `<option value="${escapeHtml(habit.id)}">${escapeHtml(habit.title)}</option>`),
  ].join("");
  elements.historyHabitFilter.value = activeHabits.some((habit) => habit.id === selectedHabit) ? selectedHabit : "";
}

function getHistoryMonthKey(dateKey) {
  return dateKey.slice(0, 7);
}

function formatHistoryMonth(dateKey) {
  const [year, month] = dateKey.split("-");
  return `${year}年${Number(month)}月`;
}

function createEmptyMessage(text) {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = text;
  return empty;
}

function renderCoachMessage(latestEvent) {
  const message = generateCoachMessage({
    state,
    date: todayKey,
    latestEvent,
  });

  elements.coachType.textContent = message.type;
  elements.coachTitle.textContent = message.title;
  elements.coachBody.textContent = message.body;
}

function generateCoachMessage(context) {
  const { state: currentState, latestEvent } = context;
  const recent = [...currentState.checkIns].sort((a, b) => b.date.localeCompare(a.date));
  const todayCheckIns = recent.filter((checkIn) => checkIn.date === todayKey);
  const hasMissedToday = todayCheckIns.some((checkIn) => checkIn.status === "missed");
  const hasSuccessToday = todayCheckIns.some((checkIn) => checkIn.status === "done" || checkIn.status === "partial");
  const successStreak = countRecentSuccessDays(currentState.checkIns);
  const returnedToday = didReturnAfterBreak(currentState.checkIns);

  if (latestEvent?.type === "planned") {
    const habit = findHabit(latestEvent.habitId);
    return {
      type: "今日の記録",
      title: "ここまでで十分です",
      body: `${habit.title}は、小さく始められる形にできました。太田さんは、まずこの最低ラインに戻ってくれば大丈夫です。`,
    };
  }

  if (latestEvent?.type === "habit-edited") {
    const habit = findHabit(latestEvent.habitId);
    return {
      type: "習慣を更新",
      title: `${habit.title}の内容を更新しました`,
      body: "習慣名と標準の最低ラインを保存しました。今日の記録フォームにも新しい内容を反映しています。",
    };
  }

  if (latestEvent?.type === "recovery-mode") {
    return {
      type: "再開を優先",
      title: "今日は戻るだけで合格です",
      body: "筋トレ、学習、睡眠を全部いちばん小さい形にしました。太田さんは、完璧よりも再開できる流れを優先しましょう。",
    };
  }

  if (returnedToday) {
    return {
      type: "復帰を歓迎",
      title: "戻ってこられたことが一番大事です",
      body: "空いた日があっても、今日また記録できました。習慣化は連勝より復帰力です。この戻り方を大切にしましょう。",
    };
  }

  if (hasMissedToday) {
    return {
      type: "責めないリセット",
      title: "できなかった日も、終わりではありません",
      body: "今日は未達でも大丈夫です。次に開いた時は、1分だけ、1回だけ、開くだけの小ささに戻しましょう。",
    };
  }

  if (successStreak >= 3) {
    return {
      type: "連続達成中",
      title: `${successStreak}日分、ちゃんと積み上がっています`,
      body: "調子が良い時ほど、目標を大きくしすぎなくて大丈夫です。太田さんは今の小ささのまま続けていきましょう。",
    };
  }

  if (hasSuccessToday) {
    return {
      type: "今日の達成",
      title: "小さくても、今日は前に進みました",
      body: "最低ラインを越えられたなら十分です。太田さんの習慣は、派手な一日よりも戻ってこられる毎日で育ちます。",
    };
  }

  return {
    type: "今日の伴走メッセージ",
    title: "まずは今日の記録から",
    body: "やる気がある前提にしなくて大丈夫です。今日の結果をそのまま残せば十分です。",
  };
}

function getPlan(date, habitId) {
  return state.plans.find((plan) => plan.date === date && plan.habitId === habitId);
}

function getRecordDateKey() {
  return selectedCalendarDate || todayKey;
}

function isValidDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const parsed = new Date(`${dateKey}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && formatDateKey(parsed) === dateKey;
}

function getAdaptiveMinimum(habitId, forcedCondition = null) {
  const condition = forcedCondition || "normal";
  if (condition === "normal") {
    return findHabit(habitId).minimumAction;
  }
  return adaptiveMinimums[habitId]?.[condition] || findHabit(habitId).minimumAction;
}

function buildMinimumSuggestionText(habit, suggestedMinimum) {
  return `今日の目安: ${suggestedMinimum}`;
}

function getCheckIn(date, habitId) {
  return state.checkIns.find((checkIn) => checkIn.date === date && checkIn.habitId === habitId);
}

function findHabit(habitId) {
  return state.habits.find((habit) => habit.id === habitId) || state.habits[0];
}

function upsertByDateAndHabit(collection, item) {
  const index = collection.findIndex((entry) => entry.date === item.date && entry.habitId === item.habitId);
  if (index >= 0) {
    collection[index] = item;
  } else {
    collection.push(item);
  }
}

function countReturns(checkIns) {
  const dates = uniqueSortedDates(checkIns);
  let returns = 0;
  for (let index = 1; index < dates.length; index += 1) {
    if (daysBetween(dates[index - 1], dates[index]) > 1) {
      returns += 1;
    }
  }
  return returns;
}

function countRecentSuccessDays(checkIns) {
  const byDate = new Map();
  checkIns.forEach((checkIn) => {
    if (!byDate.has(checkIn.date)) byDate.set(checkIn.date, []);
    byDate.get(checkIn.date).push(checkIn);
  });

  let streak = 0;
  let cursor = new Date(today);
  while (true) {
    const key = formatDateKey(cursor);
    const dayItems = byDate.get(key) || [];
    const hasSuccess = dayItems.some((item) => item.status === "done" || item.status === "partial");
    if (!hasSuccess) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function didReturnAfterBreak(checkIns) {
  const dates = uniqueSortedDates(checkIns);
  if (!dates.includes(todayKey) || dates.length < 2) return false;
  const todayIndex = dates.indexOf(todayKey);
  return todayIndex > 0 && daysBetween(dates[todayIndex - 1], todayKey) > 1;
}

function calculateMoodTrend(checkIns) {
  const recent = checkIns.slice(-5);
  if (!recent.length) return "-";

  const scores = {
    great: 5,
    good: 4,
    flat: 3,
    tired: 2,
    hard: 1,
  };
  const average = recent.reduce((total, item) => total + scores[item.mood], 0) / recent.length;
  if (average >= 4.4) return "上向き";
  if (average >= 3.2) return "安定";
  if (average >= 2.2) return "低め";
  return "休息優先";
}

function analyzeBlockers(checkIns) {
  const blockerTexts = checkIns
    .filter((checkIn) => checkIn.blocker)
    .map((checkIn) => checkIn.blocker);
  if (!blockerTexts.length) return [];

  const matchedPatterns = blockerPatterns
    .map((pattern) => ({
      label: pattern.label,
      count: blockerTexts.filter((text) => pattern.words.some((word) => text.includes(word))).length,
    }))
    .filter((pattern) => pattern.count > 0)
    .sort((a, b) => b.count - a.count);

  if (!matchedPatterns.length) {
    return [{
      title: "理由の記録が増えています",
      body: "まだ大きな傾向は出ていません。数日分たまると、太田さんが止まりやすい場面が見えやすくなります。",
    }];
  }

  const top = matchedPatterns[0];
  return [
    {
      title: `${top.label}で止まりやすい傾向`,
      body: `${top.count}回出ています。次はこの理由が出ても達成できるよう、最低ラインをさらに小さくしておきましょう。`,
    },
    {
      title: "次の対策",
      body: buildBlockerCountermeasure(top.label),
    },
  ];
}

function buildBlockerCountermeasure(label) {
  const measures = {
    "疲れ": "疲れた日は、筋トレは1回、学習は開くだけ、睡眠は布団に入る時間だけ決めれば合格にします。",
    "時間不足": "忙しい日は、朝のうちに1分だけ先取りして、夜に全部残さない形にしましょう。",
    "忘れ": "忘れやすい日は、夜に記録だけでも戻ってきましょう。",
    "やる気": "やる気が低い日は、気持ちを待たずに、最初の1動作だけで達成扱いにしましょう。",
  };
  return measures[label] || "理由が出た日は、目標を小さくして復帰しやすくしましょう。";
}

function buildWeeklyReview() {
  const { recent, successCount, missedCount, activeDates } = buildWeeklySummary();
  const hardestHabit = findHardestHabit(recent);

  return [
    {
      title: "戻ってきた日",
      body: `${activeDates}日。記録がある日は、習慣に戻る入口を作れています。`,
    },
    {
      title: "最低ライン達成",
      body: `${successCount}件。少しだけの日も、継続として数えます。`,
    },
    {
      title: "未達の扱い",
      body: `${missedCount}件。未達は失敗ではなく、次の入力を軽くする材料です。`,
    },
    {
      title: "注意する習慣",
      body: hardestHabit ? `${hardestHabit.title}が止まりやすいです。記録だけでも残す形にすると戻りやすくなります。` : "まだ大きな偏りはありません。",
    },
  ];
}

function buildWeeklySummary() {
  const weekStart = addDays(today, -6);
  const startKey = formatDateKey(weekStart);
  const recent = state.checkIns.filter((checkIn) => {
    const checkInDate = new Date(`${checkIn.date}T00:00:00`);
    return checkInDate >= new Date(`${startKey}T00:00:00`) && checkInDate <= new Date(`${todayKey}T23:59:59`);
  });
  const successCount = recent.filter((item) => item.status === "done" || item.status === "partial").length;
  const missedCount = recent.filter((item) => item.status === "missed").length;
  const activeDates = new Set(recent.map((item) => item.date)).size;
  const learningMinutes = recent.reduce((total, item) => total + Number(item.learningMinutes || 0), 0);
  const byHabit = state.habits
    .filter((habit) => habit.active || recent.some((record) => record.habitId === habit.id))
    .map((habit) => {
      const records = recent.filter((record) => record.habitId === habit.id);
      return {
        habit,
        total: records.length,
        success: records.filter((record) => record.status === "done" || record.status === "partial").length,
        missed: records.filter((record) => record.status === "missed").length,
      };
    });
  return {
    startKey,
    endKey: todayKey,
    recent,
    successCount,
    missedCount,
    activeDates,
    learningMinutes,
    byHabit,
  };
}

function buildWeeklyReportText(style = "standard") {
  const summary = buildWeeklySummary();
  if (style === "short") return buildShortWeeklyReportText(summary);
  if (style === "detailed") return buildDetailedWeeklyReportText(summary);
  return buildStandardWeeklyReportText(summary);
}

function buildStandardWeeklyReportText(summary) {
  const hardestHabit = findHardestHabit(summary.recent);
  const lines = [
    "【太田の習慣コーチ 週次報告】",
    `期間: ${formatShortDate(summary.startKey)}〜${formatShortDate(summary.endKey)}`,
    "",
    "【今週の結果】",
    `・記録した日: ${summary.activeDates}日`,
    `・達成・少し: ${summary.successCount}件`,
    `・未達: ${summary.missedCount}件`,
    summary.learningMinutes ? `・学習合計: ${formatDuration(summary.learningMinutes)}` : "",
    "",
    "【習慣別】",
    ...summary.byHabit.map(({ habit, success, missed, total }) => (
      `・${habit.title}: 記録${total}件 / 達成・少し${success}件 / 未達${missed}件`
    )),
    "",
    "【確認】",
    hardestHabit
      ? `・${hardestHabit.title}が止まりやすい傾向。次は最低ラインをさらに小さくして戻りやすくする。`
      : "・大きな偏りはない。今の記録ペースを続ける。",
    "",
    "【次の改善】",
    "・LINE報告前に自分だけテスト送信で文面を確認する。",
    "・日付を間違えた記録はカレンダーや履歴から編集する。",
  ].filter(Boolean);
  return lines.join("\n").trim();
}

function buildShortWeeklyReportText(summary) {
  const habitText = summary.byHabit
    .map(({ habit, success, total }) => `${habit.title}${success}/${total}`)
    .join("、");
  return [
    "【太田の習慣コーチ 週次報告】",
    `期間: ${formatShortDate(summary.startKey)}〜${formatShortDate(summary.endKey)}`,
    `記録${summary.activeDates}日、達成・少し${summary.successCount}件、未達${summary.missedCount}件。`,
    summary.learningMinutes ? `学習合計は${formatDuration(summary.learningMinutes)}。` : "",
    habitText ? `習慣別: ${habitText}` : "",
    "次は、送信前確認と過去記録編集を使いながら、報告の抜けを減らす。",
  ].filter(Boolean).join("\n");
}

function buildDetailedWeeklyReportText(summary) {
  const lines = [
    buildStandardWeeklyReportText(summary),
    "",
    "【日別の記録】",
  ];
  const recordsByDate = new Map();
  summary.recent
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((record) => {
      if (!recordsByDate.has(record.date)) recordsByDate.set(record.date, []);
      recordsByDate.get(record.date).push(record);
    });

  if (!recordsByDate.size) {
    lines.push("・今週の保存済み記録はまだありません。");
  } else {
    recordsByDate.forEach((records, date) => {
      const dayText = records
        .map((record) => `${findHabit(record.habitId).title}:${statusLabels[record.status] || record.status}`)
        .join(" / ");
      lines.push(`・${formatShortDate(date)} ${dayText}`);
    });
  }

  lines.push("");
  lines.push("【P：計画】外出先でも使える状態に近づけ、報告前に自分で確認できる流れを作る。");
  lines.push("【D：実行】記録、LINE確認、週次まとめ、過去記録編集をアプリ内で扱いやすくする。");
  lines.push("【C：確認】日々の記録と週の達成状況を見比べ、報告前の不安を減らす。");
  lines.push("【A：改善】次回は通常送信と週次報告の運用を確認し、必要なら文面をさらに短くする。");
  return lines.join("\n").trim();
}

function buildCalendarDays(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startDate = addDays(firstDay, -firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(startDate, index));
}

function buildCalendarDots(records) {
  return records
    .slice(0, 3)
    .map((record) => `<span class="calendar-dot ${escapeHtml(record.status)}"></span>`)
    .join("");
}

function getDayStatus(records) {
  if (!records.length) return "empty";
  if (records.every((record) => record.status === "done")) return "done";
  if (records.some((record) => record.status === "missed") && records.some((record) => record.status !== "missed")) {
    return "mixed";
  }
  if (records.every((record) => record.status === "missed")) return "missed";
  return "partial";
}

function changeCalendarMonth(amount) {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + amount, 1);
  elements.calendarPanel.hidden = false;
  elements.todayLabel.setAttribute("aria-expanded", "true");
  elements.todayLabel.classList.add("is-active");
  selectRecordDate(formatDateKey(calendarCursor));
}

function findHardestHabit(checkIns) {
  const missedByHabit = checkIns.reduce((counts, checkIn) => {
    if (checkIn.status === "missed") {
      counts[checkIn.habitId] = (counts[checkIn.habitId] || 0) + 1;
    }
    return counts;
  }, {});
  const hardestHabitId = Object.entries(missedByHabit).sort((a, b) => b[1] - a[1])[0]?.[0];
  return hardestHabitId ? findHabit(hardestHabitId) : null;
}

function buildBlockerText(preset, note) {
  if (preset && note) return `${preset} / ${note}`;
  return preset || note || "";
}

function getLegacyBlockerNote(checkIn) {
  if (!checkIn?.blocker || checkIn.blockerPreset || checkIn.blockerNote) return "";
  return checkIn.blocker;
}

function setFocusTimerDuration(minutes) {
  if (focusTimerInterval) return;
  focusTimerDurationSeconds = minutes * 60;
  focusTimerRemainingSeconds = focusTimerDurationSeconds;
  renderFocusTimer();
}

function toggleFocusTimer() {
  if (focusTimerInterval) {
    pauseFocusTimer();
    return;
  }
  startFocusTimer();
}

function startFocusTimer() {
  const primarySession = getPrimaryLearningSessionInputs();
  if (!primarySession.startInput.value) {
    primarySession.startInput.value = getCurrentTimeValue();
    syncLearningMinutesFromTimeRange();
  }
  focusTimerStartedAt = Date.now();
  elements.timerToggleButton.textContent = "停止";
  focusTimerInterval = window.setInterval(() => {
    focusTimerRemainingSeconds = Math.max(0, focusTimerRemainingSeconds - 1);
    renderFocusTimer();
    if (focusTimerRemainingSeconds === 0) {
      pauseFocusTimer(true);
    }
  }, 1000);
}

function pauseFocusTimer(markEndTime = false) {
  window.clearInterval(focusTimerInterval);
  focusTimerInterval = null;
  elements.timerToggleButton.textContent = "再開";
  if (markEndTime || focusTimerStartedAt) {
    getPrimaryLearningSessionInputs().endInput.value = getCurrentTimeValue();
    syncLearningMinutesFromTimeRange();
  }
}

function resetFocusTimer() {
  window.clearInterval(focusTimerInterval);
  focusTimerInterval = null;
  focusTimerStartedAt = null;
  focusTimerRemainingSeconds = focusTimerDurationSeconds;
  elements.timerToggleButton.textContent = "開始";
  renderFocusTimer();
}

function renderFocusTimer() {
  const minutes = Math.floor(focusTimerRemainingSeconds / 60);
  const seconds = focusTimerRemainingSeconds % 60;
  elements.timerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getCurrentTimeValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function getPrimaryLearningSessionInputs() {
  if (!elements.learningSessionList.querySelector(".learning-session-row")) {
    addLearningSessionRow();
  }
  const row = elements.learningSessionList.querySelector(".learning-session-row");
  return {
    startInput: row.querySelector(".learning-start-time"),
    endInput: row.querySelector(".learning-end-time"),
  };
}

function buildHistoryNote(checkIn) {
  const parts = [];
  if (checkIn.learningMinutes) parts.push(`学習時間: ${formatDuration(Number(checkIn.learningMinutes))}`);
  const learningTimeRange = formatLearningTimeRange(checkIn);
  if (learningTimeRange) parts.push(`時間帯: ${learningTimeRange}`);
  if (checkIn.note) parts.push(checkIn.note);
  return parts.join(" / ") || "記録できたこと自体が一歩です。";
}

function formatLearningTimeRange(checkIn) {
  const sessions = getLearningSessionsFromCheckIn(checkIn);
  if (sessions.length) {
    return sessions
      .map((session) => {
        if (session.startTime && session.endTime) return `${session.startTime}〜${session.endTime}`;
        if (session.startTime) return `${session.startTime}〜`;
        return `〜${session.endTime}`;
      })
      .join(" / ");
  }
  if (checkIn.learningStartTime && checkIn.learningEndTime) {
    return `${checkIn.learningStartTime}〜${checkIn.learningEndTime}`;
  }
  if (checkIn.learningStartTime) {
    return `${checkIn.learningStartTime}〜`;
  }
  if (checkIn.learningEndTime) {
    return `〜${checkIn.learningEndTime}`;
  }
  return "";
}

function resetData() {
  if (!window.confirm("保存データを初期化しますか？")) return;
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

function uniqueSortedDates(checkIns) {
  return [...new Set(checkIns.map((checkIn) => checkIn.date))].sort((a, b) => a.localeCompare(b));
}

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.round((end - start) / 86400000);
}

function addDays(date, amount) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatShortDate(dateKey) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
