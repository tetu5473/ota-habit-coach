const coachStatusLabels = {
  done: "できた",
  partial: "少しだけ",
  missed: "未達",
};

const coachMoodLabels = {
  great: "かなり良い",
  good: "良い",
  flat: "普通",
  tired: "疲れた",
  hard: "しんどい",
};

const coachCategoryLabels = {
  strength: "筋トレ",
  learning: "学習",
  sleep: "睡眠",
};

const coachElements = {
  totalRecords: document.querySelector("#coachTotalRecords"),
  successRate: document.querySelector("#coachSuccessRate"),
  learningTime: document.querySelector("#coachLearningTime"),
  summaryButtons: document.querySelectorAll("[data-summary-action]"),
  dateOverview: document.querySelector("#coachDateOverview"),
  todayTitle: document.querySelector("#coachTodayTitle"),
  todayRecords: document.querySelector("#coachTodayRecords"),
  historyRecords: document.querySelector("#coachHistoryRecords"),
  habitFilter: document.querySelector("#coachHabitFilter"),
  periodFilterButtons: document.querySelectorAll("[data-period-filter]"),
  clearDateFilterButton: document.querySelector("#clearCoachDateFilterButton"),
  selectedDateLabel: document.querySelector("#coachSelectedDateLabel"),
  refreshButton: document.querySelector("#refreshCoachReviewButton"),
  status: document.querySelector("#coachReviewStatus"),
};

let coachRecords = [];
let selectedCoachDate = "";
let statusFilterMode = "all";
let periodFilterMode = "all";

initCoachReview();

function initCoachReview() {
  coachElements.refreshButton.addEventListener("click", loadCoachRecords);
  coachElements.habitFilter.addEventListener("change", renderCoachReview);
  coachElements.clearDateFilterButton.addEventListener("click", () => {
    selectedCoachDate = "";
    renderCoachReview();
    scrollCoachHistoryIntoView();
  });
  coachElements.dateOverview.addEventListener("click", handleDateOverviewClick);
  coachElements.periodFilterButtons.forEach((button) => {
    button.addEventListener("click", handlePeriodFilterClick);
  });
  coachElements.summaryButtons.forEach((button) => {
    button.addEventListener("click", handleSummaryClick);
  });
  coachElements.todayTitle.textContent = `${formatJapaneseDate(formatDateKey(new Date()))}の記録`;
  loadCoachRecords();
}

async function loadCoachRecords() {
  coachElements.status.textContent = "記録を読み込み中です。";
  try {
    const response = await fetch("/api/records");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    coachRecords = Array.isArray(result.records) ? result.records : [];
    renderCoachReview();
    coachElements.status.textContent = `最終更新: ${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    coachRecords = [];
    renderCoachReview();
    coachElements.status.textContent = "記録を読み込めませんでした。サーバーが起動しているか確認してください。";
  }
}

function renderCoachReview() {
  const sortedRecords = [...coachRecords].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
  const filteredRecords = filterCoachRecords(sortedRecords);
  const todayKey = formatDateKey(new Date());
  const todayRecords = filterByStatus(sortedRecords.filter((record) => record.date === todayKey));

  renderCoachSummary(sortedRecords);
  renderDateOverview(sortedRecords);
  renderCoachRecordCards(coachElements.todayRecords, todayRecords, "今日の記録はまだありません。");
  renderCoachRecordCards(coachElements.historyRecords, filteredRecords, "表示できる記録がありません。");
  updateSelectedDateLabel();
}

function filterCoachRecords(records) {
  const filter = coachElements.habitFilter.value;
  return filterByStatus(records)
    .filter((record) => matchesPeriodFilter(record))
    .filter((record) => filter === "all" || record.habitId === filter)
    .filter((record) => !selectedCoachDate || record.date === selectedCoachDate);
}

function filterByStatus(records) {
  if (periodFilterMode === "missed") {
    return records.filter((record) => record.status === "missed");
  }
  if (statusFilterMode === "success") {
    return records.filter((record) => record.status === "done" || record.status === "partial");
  }
  return records;
}

function matchesPeriodFilter(record) {
  if (periodFilterMode === "all" || periodFilterMode === "missed") return true;
  const recordDate = parseDateKey(record.date);
  if (!recordDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (periodFilterMode === "last7") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return recordDate >= start && recordDate <= today;
  }

  if (periodFilterMode === "week") {
    const start = new Date(today);
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return recordDate >= start && recordDate <= end;
  }

  return true;
}

function renderCoachSummary(records) {
  const successCount = records.filter((record) => record.status === "done" || record.status === "partial").length;
  const learningMinutes = records.reduce((total, record) => total + Number(record.learningMinutes || 0), 0);
  coachElements.totalRecords.textContent = String(records.length);
  coachElements.successRate.textContent = records.length ? `${Math.round((successCount / records.length) * 100)}%` : "0%";
  coachElements.learningTime.textContent = formatDuration(learningMinutes);
}

function renderDateOverview(records) {
  coachElements.dateOverview.innerHTML = "";
  const grouped = groupRecordsByDate(records);
  if (!grouped.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "日別に表示できる記録がありません。";
    coachElements.dateOverview.append(empty);
    return;
  }

  grouped.forEach((group) => {
    const button = document.createElement("button");
    button.className = "coach-date-chip";
    button.type = "button";
    button.dataset.date = group.date;
    button.classList.toggle("is-active", selectedCoachDate === group.date);
    const successCount = group.records.filter((record) => record.status === "done" || record.status === "partial").length;
    const learningMinutes = group.records.reduce((total, record) => total + Number(record.learningMinutes || 0), 0);
    button.innerHTML = `
      <strong>${formatJapaneseDateWithWeekday(group.date)}</strong>
      <span>${group.records.length}件 / 達成${successCount}件</span>
      <small>${learningMinutes ? `学習 ${formatDuration(learningMinutes)}` : "学習記録なし"}</small>
    `;
    coachElements.dateOverview.append(button);
  });
}

function groupRecordsByDate(records) {
  const groups = new Map();
  records.forEach((record) => {
    if (!record.date) return;
    if (!groups.has(record.date)) groups.set(record.date, []);
    groups.get(record.date).push(record);
  });
  return Array.from(groups.entries())
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([date, dateRecords]) => ({ date, records: dateRecords }));
}

function handleDateOverviewClick(event) {
  const button = event.target.closest(".coach-date-chip");
  if (!button) return;
  selectedCoachDate = button.dataset.date || "";
  renderCoachReview();
  scrollCoachHistoryIntoView();
}

function handleSummaryClick(event) {
  const action = event.currentTarget.dataset.summaryAction;
  if (action === "learning") {
    coachElements.habitFilter.value = "learning";
    statusFilterMode = "all";
  } else if (action === "success") {
    coachElements.habitFilter.value = "all";
    statusFilterMode = statusFilterMode === "success" ? "all" : "success";
  } else {
    coachElements.habitFilter.value = "all";
    statusFilterMode = "all";
  }
  selectedCoachDate = "";
  periodFilterMode = "all";
  renderCoachReview();
  scrollCoachHistoryIntoView();
}

function handlePeriodFilterClick(event) {
  periodFilterMode = event.currentTarget.dataset.periodFilter || "all";
  if (periodFilterMode === "missed") {
    statusFilterMode = "all";
  }
  selectedCoachDate = "";
  renderCoachReview();
}

function updateSelectedDateLabel() {
  const filterText = coachElements.habitFilter.options[coachElements.habitFilter.selectedIndex]?.textContent || "すべて";
  const statusText = statusFilterMode === "success" ? " / 達成した記録のみ" : "";
  const periodText = getPeriodFilterLabel();
  coachElements.selectedDateLabel.textContent = selectedCoachDate
    ? `${formatJapaneseDateWithWeekday(selectedCoachDate)}の${filterText}を表示中${statusText}`
    : `${periodText}の${filterText}を表示中${statusText}`;
  coachElements.clearDateFilterButton.hidden = !selectedCoachDate;
  coachElements.periodFilterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.periodFilter === periodFilterMode);
  });
  coachElements.summaryButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.summaryAction === "success" && statusFilterMode === "success");
    button.classList.toggle("is-active", button.dataset.summaryAction === "learning" && coachElements.habitFilter.value === "learning");
  });
}

function getPeriodFilterLabel() {
  const labels = {
    all: "すべての日付",
    week: "今週",
    last7: "直近7日",
    missed: "未達だけ",
  };
  return labels[periodFilterMode] || "すべての日付";
}

function scrollCoachHistoryIntoView() {
  document.querySelector(".coach-review-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCoachRecordCards(container, records, emptyText) {
  container.innerHTML = "";
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  records.forEach((record) => {
    const card = document.createElement("article");
    card.className = "coach-record-card";

    const header = document.createElement("div");
    header.className = "coach-record-card-header";

    const titleWrap = document.createElement("div");
    const category = document.createElement("p");
    category.className = "category";
    category.textContent = `${formatJapaneseDate(record.date)} / ${coachCategoryLabels[record.habitId] || record.habitId || "習慣"}`;
    const title = document.createElement("h3");
    title.textContent = record.habitTitle || record.habitId || "記録";
    titleWrap.append(category, title);

    const badge = document.createElement("span");
    badge.className = `status-badge ${record.status === "missed" ? "missed" : "done"}`;
    badge.textContent = coachStatusLabels[record.status] || record.status || "未記録";
    header.append(titleWrap, badge);

    const details = document.createElement("dl");
    details.className = "coach-record-details";
    appendDetail(details, "最低ライン", record.plannedMinimumAction);
    appendDetail(details, "学習時間", record.learningMinutes ? formatDuration(Number(record.learningMinutes)) : "");
    appendDetail(details, "時間帯", formatLearningTimeRange(record));
    appendDetail(details, "気分", coachMoodLabels[record.mood] || record.mood);
    appendDetail(details, "理由", record.blocker);
    appendDetail(details, "理由メモ", record.blockerNote);
    appendDetail(details, "メモ", record.note);

    card.append(header, details);
    container.append(card);
  });
}

function appendDetail(container, label, value) {
  if (!value) return;
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  container.append(term, description);
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
  if (record.learningStartTime && record.learningEndTime) return `${record.learningStartTime}〜${record.learningEndTime}`;
  if (record.learningStartTime) return `${record.learningStartTime}〜`;
  if (record.learningEndTime) return `〜${record.learningEndTime}`;
  return "";
}

function formatDuration(totalMinutes) {
  const minutesValue = Number(totalMinutes);
  if (!Number.isFinite(minutesValue) || minutesValue <= 0) return "0分";
  const hours = Math.floor(minutesValue / 60);
  const minutes = minutesValue % 60;
  if (hours && minutes) return `${hours}時間${String(minutes).padStart(2, "0")}分`;
  if (hours) return `${hours}時間`;
  return `${minutes}分`;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatJapaneseDate(dateKey) {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) return dateKey;
  return `${Number(month)}月${Number(day)}日`;
}

function formatJapaneseDateWithWeekday(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][new Date(year, month - 1, day).getDay()];
  return `${month}月${day}日(${weekday})`;
}
