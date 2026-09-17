/**
 * TilTap web app.
 *
 * Talks to the same /api/web endpoints the bots use internally: a job is
 * created, progress arrives over Server-Sent Events (with a polling fallback
 * for proxies that buffer SSE), and the finished job carries the transcript,
 * its segments and any translation.
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  tab: "file",
  file: null,
  jobId: null,
  requestNumber: null,
  /** Transcript as returned by the backend (already cleaned). */
  transcript: "",
  /** Text currently shown in the result box — transcript or a translation. */
  shown: "",
  segments: [],
  detectedLang: "",
  translatedLang: "",
  feedbackId: null,
  feedbackRating: null,
  eventSource: null,
  pollTimer: null,
  clientId: null,
};

const SOURCE_LANGS = ["ky", "tg", "uz", "ru", "en"];
const TARGET_LANGS = ["ky", "tg", "uz", "ru", "en", "uz_cyrl"];
const MAX_BYTES = 25 * 1024 * 1024;

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// Theme + language shell
// ---------------------------------------------------------------------------
const THEMES = { light: "corporate", dark: "business" };
function applyTheme(mode) {
  document.documentElement.dataset.theme = THEMES[mode];
  $("themeIcon").textContent = mode === "dark" ? "☀️" : "🌙";
  localStorage.setItem("tiltap_theme", mode);
}

function clientId() {
  if (state.clientId) return state.clientId;
  let id = localStorage.getItem("tiltap_client_id");
  if (!id) {
    id = `web_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem("tiltap_client_id", id);
  }
  state.clientId = id;
  return id;
}

// ---------------------------------------------------------------------------
// Language selects
// ---------------------------------------------------------------------------
function fillLanguageSelects() {
  const source = $("sourceLang");
  const target = $("targetLang");
  const prevSource = source.value;
  const prevTarget = target.value;

  source.innerHTML =
    `<option value="auto">${tr("autoDetect")}</option>` +
    SOURCE_LANGS.map((c) => `<option value="${c}">${LANGUAGE_META[c].label}</option>`).join("");

  target.innerHTML =
    `<option value="none">${tr("noTranslation")}</option>` +
    TARGET_LANGS.map((c) => `<option value="${c}">${LANGUAGE_META[c].label}</option>`).join("");

  source.value = prevSource || "auto";
  target.value = prevTarget || "none";
}

function renderTranslateAgainButtons() {
  const row = $("translateAgainRow");
  row.querySelectorAll("button").forEach((b) => b.remove());
  for (const code of TARGET_LANGS) {
    if (code === state.detectedLang || code === state.translatedLang) continue;
    const btn = document.createElement("button");
    btn.className = "btn btn-xs btn-outline";
    btn.textContent = `${LANGUAGE_META[code].label}`;
    btn.addEventListener("click", () => translateShownText(code, btn));
    row.appendChild(btn);
  }
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
function selectTab(tab) {
  state.tab = tab;
  document.querySelectorAll("[data-tab]").forEach((el) => {
    el.classList.toggle("tab-active", el.dataset.tab === tab);
  });
  $("panel-file").classList.toggle("hidden", tab !== "file");
  $("panel-link").classList.toggle("hidden", tab !== "link");
  $("panel-text").classList.toggle("hidden", tab !== "text");
  // Nothing is transcribed in the text tab, so the spoken-language select would
  // only be noise there.
  $("sourceLangWrap").classList.toggle("hidden", tab === "text");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function showError(message) {
  const box = $("errorBox");
  box.textContent = message;
  box.classList.remove("hidden");
}

function clearError() {
  $("errorBox").classList.add("hidden");
}

function setBusy(busy) {
  $("startBtn").disabled = busy;
  $("startBtn").classList.toggle("btn-disabled", busy);
  $("progressWrap").classList.toggle("hidden", !busy);
  if (!busy) setProgress(0, tr("progressStarting"));
}

function setProgress(percent, label) {
  $("progressBar").value = Math.max(0, Math.min(100, percent || 0));
  $("progressPercent").textContent = `${Math.round(percent || 0)}%`;
  if (label) $("progressLabel").textContent = label;
}

function formatTime(seconds, withMs = false) {
  const total = Math.max(0, seconds || 0);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(Math.floor(total % 60)).padStart(2, "0");
  if (!withMs) return `${h}:${m}:${s}`;
  const ms = String(Math.round((total % 1) * 1000)).padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

function isSupportedMediaUrl(url) {
  return (
    /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+/.test(url) ||
    /^(https?:\/\/)?(www\.|m\.|vm\.|vt\.)?tiktok\.com\/.+/.test(url) ||
    /^(https?:\/\/)?(www\.)?instagram\.com\/(reel|p|stories|tv)\/.+/.test(url)
  );
}

function youtubeEmbedUrl(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

// ---------------------------------------------------------------------------
// Export formats
// ---------------------------------------------------------------------------
function buildSrt(segments) {
  return segments
    .map((seg, i) => {
      const start = formatTime(seg.start, true).replace(".", ",");
      const end = formatTime(seg.end, true).replace(".", ",");
      return `${i + 1}\n${start} --> ${end}\n${seg.text.trim()}\n`;
    })
    .join("\n");
}

function buildVtt(segments) {
  const body = segments
    .map((seg) => `${formatTime(seg.start, true)} --> ${formatTime(seg.end, true)}\n${seg.text.trim()}\n`)
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

function download(content, filename, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Result rendering
// ---------------------------------------------------------------------------
function renderSegments() {
  const box = $("segmentsBox");
  box.innerHTML = "";
  for (const seg of state.segments) {
    const row = document.createElement("div");
    row.className = "segment-row";
    const time = document.createElement("time");
    time.textContent = formatTime(seg.start);
    const text = document.createElement("div");
    text.className = "text-sm";
    text.textContent = seg.text.trim();
    row.append(time, text);
    box.appendChild(row);
  }
  $("segmentsWrap").classList.toggle("hidden", state.segments.length === 0);
}

function renderMeta() {
  const meta = $("resultMeta");
  meta.innerHTML = "";
  const parts = [];
  if (state.detectedLang) {
    const info = LANGUAGE_META[state.detectedLang];
    parts.push(`${tr("metaDetected")}: ${info ? `${info.label}` : state.detectedLang}`);
  }
  if (state.segments.length) parts.push(`${tr("metaSegments")}: ${state.segments.length}`);
  if (state.requestNumber) parts.push(`${tr("metaRequest")}: #${state.requestNumber}`);
  for (const part of parts) {
    const badge = document.createElement("span");
    badge.className = "badge badge-ghost";
    badge.textContent = part;
    meta.appendChild(badge);
  }
}

function showResult({ title, text, warning }) {
  state.shown = text;
  $("resultTitle").textContent = title;
  $("resultText").textContent = text;
  const warnBox = $("resultWarning");
  if (warning) {
    warnBox.textContent = `⚠️ ${warning}`;
    warnBox.classList.remove("hidden");
  } else {
    warnBox.classList.add("hidden");
  }
  renderMeta();
  renderSegments();
  renderTranslateAgainButtons();
  $("resultCard").classList.remove("hidden");
  $("resultCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetResult() {
  state.jobId = null;
  state.requestNumber = null;
  state.transcript = "";
  state.shown = "";
  state.segments = [];
  state.detectedLang = "";
  state.translatedLang = "";
  state.feedbackId = null;
  state.feedbackRating = null;
  $("resultCard").classList.add("hidden");
  $("originalWrap").classList.add("hidden");
  $("extraTranslations").innerHTML = "";
  $("feedbackAsk").classList.remove("hidden");
  $("feedbackDetail").classList.add("hidden");
  $("feedbackThanks").classList.add("hidden");
  $("fbComment").value = "";
  $("segmentsBox").classList.add("hidden");
  $("segmentsToggle").textContent = tr("segmentsShow");
}

// ---------------------------------------------------------------------------
// Job lifecycle
// ---------------------------------------------------------------------------
function stopWatching() {
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

function watchJob(jobId) {
  stopWatching();

  // Some proxies buffer SSE into uselessness; polling runs alongside as a
  // safety net and both paths funnel into the same handler.
  try {
    const es = new EventSource(`/api/web/jobs/${jobId}/progress`);
    state.eventSource = es;
    es.onmessage = (event) => {
      try {
        handleJobUpdate(JSON.parse(event.data));
      } catch {
        /* ignore malformed frame */
      }
    };
    es.onerror = () => {
      es.close();
      state.eventSource = null;
    };
  } catch {
    /* EventSource unavailable — polling covers it */
  }

  state.pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/web/jobs/${jobId}`);
      if (!res.ok) return;
      handleJobUpdate(await res.json());
    } catch {
      /* transient network error; the next tick retries */
    }
  }, 2500);
}

function handleJobUpdate(job) {
  if (!job) return;

  if (job.progress) setProgress(job.progress.percent, job.progress.label);

  if (job.status === "failed") {
    stopWatching();
    setBusy(false);
    showError(job.error || tr("errJobFailed"));
    return;
  }

  if (job.status !== "completed") return;

  stopWatching();
  setBusy(false);

  const result = job.result || {};
  state.transcript = job.cleanedText || result.text || "";
  state.segments = Array.isArray(result.segments) ? result.segments : [];
  state.detectedLang = result.language || "";

  if (job.translatedText) {
    state.translatedLang = job.translatedLang || "";
    const label = LANGUAGE_META[state.translatedLang];
    showResult({
      title: `${tr("resultTranslation")}${label ? ` — ${label.label}` : ""}`,
      text: job.translatedText,
      warning: job.translationWarning || result.warning,
    });
    // The transcript is still worth keeping around, one click away.
    $("originalText").textContent = state.transcript;
    $("originalWrap").classList.remove("hidden");
  } else {
    showResult({
      title: tr("resultTranscription"),
      text: state.transcript,
      warning: job.translationError || result.warning,
    });
  }

  if (job.translationRequestId) state.requestNumber = job.translationRequestId;
  renderMeta();
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
async function startJob() {
  clearError();
  resetResult();

  const sourceLang = $("sourceLang").value;
  const targetLang = $("targetLang").value;

  if (state.tab === "file") return startFileJob(sourceLang, targetLang);
  if (state.tab === "link") return startLinkJob(sourceLang, targetLang);
  return startTextTranslation(targetLang);
}

async function startFileJob(sourceLang, targetLang) {
  if (!state.file) {
    showError(tr("errSelectFile"));
    return;
  }
  if (state.file.size > MAX_BYTES) {
    showError(tr("errFileTooLarge", { size: (state.file.size / 1024 / 1024).toFixed(1) }));
    return;
  }

  const form = new FormData();
  form.append("file", state.file);
  form.append("sourceLang", sourceLang);
  form.append("targetLang", targetLang);

  setBusy(true);
  setProgress(0, tr("progressStarting"));

  try {
    const res = await fetch("/api/web/transcribe", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || tr("errUpload"));
    state.jobId = data.jobId;
    state.requestNumber = data.requestNumber ?? null;
    watchJob(data.jobId);
  } catch (err) {
    setBusy(false);
    showError(err.message || tr("errUpload"));
  }
}

async function startLinkJob(sourceLang, targetLang) {
  const url = $("mediaUrl").value.trim();
  if (!url) {
    showError(tr("errEnterUrl"));
    return;
  }
  if (!isSupportedMediaUrl(url)) {
    showError(tr("errUnsupportedUrl"));
    return;
  }

  setBusy(true);
  setProgress(0, tr("progressStarting"));

  try {
    const res = await fetch("/api/web/youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, sourceLang, targetLang }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || tr("errJobFailed"));
    state.jobId = data.jobId;
    state.requestNumber = data.requestNumber ?? null;
    watchJob(data.jobId);
  } catch (err) {
    setBusy(false);
    showError(err.message || tr("errNetwork"));
  }
}

async function startTextTranslation(targetLang) {
  const text = $("sourceText").value.trim();
  if (!text) {
    showError(tr("errEnterText"));
    return;
  }
  if (targetLang === "none") {
    showError(tr("errChooseTarget"));
    return;
  }

  setBusy(true);
  setProgress(40, tr("progressStarting"));

  try {
    const res = await fetch("/api/web/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang, sourceType: "web_text" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || tr("errTranslation"));

    setProgress(100, "");
    setBusy(false);

    state.segments = [];
    state.transcript = text;
    state.detectedLang = data.detectedLang || "";
    state.translatedLang = targetLang;
    state.requestNumber = data.requestId ?? null;

    const label = LANGUAGE_META[targetLang];
    showResult({
      title: `${tr("resultTranslation")}${label ? ` — ${label.label}` : ""}`,
      text: data.translatedText,
      warning: data.warning,
    });
    $("originalText").textContent = text;
    $("originalWrap").classList.remove("hidden");
  } catch (err) {
    setBusy(false);
    showError(err.message || tr("errTranslation"));
  }
}

/**
 * Translate the transcript again into another language. Results stack below the
 * main one instead of replacing it, so several languages can be compared.
 */
async function translateShownText(targetLang, button) {
  const source = state.transcript || state.shown;
  if (!source) return;

  const original = button.textContent;
  button.disabled = true;
  button.classList.add("loading");

  try {
    const res = await fetch("/api/web/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: source,
        targetLang,
        sourceLang: state.detectedLang || undefined,
        sourceType: "web_rerun",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || tr("errTranslation"));

    const label = LANGUAGE_META[targetLang];
    const block = document.createElement("div");
    block.className = "space-y-2";
    const heading = document.createElement("div");
    heading.className = "flex items-center gap-2 text-sm font-medium";
    heading.textContent = `${label ? `${label.label}` : targetLang}${data.requestId ? ` · #${data.requestId}` : ""}`;
    const body = document.createElement("div");
    body.className = "bg-base-200 rounded-box p-4 text-box";
    body.textContent = data.translatedText;
    block.append(heading, body);
    $("extraTranslations").appendChild(block);
    button.remove();
  } catch (err) {
    showError(err.message || tr("errTranslation"));
    button.disabled = false;
    button.classList.remove("loading");
    button.textContent = original;
  }
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------
async function sendRating(rating) {
  state.feedbackRating = rating;

  // A problem report is the text itself, so it is only sent once the user has
  // written something.
  if (rating === "issue") {
    $("fbDetailTitle").textContent = tr("fbReport");
    $("fbReasons").classList.add("hidden");
    $("fbComment").placeholder = tr("fbReportPlaceholder");
    $("feedbackDetail").classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch("/api/web/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: state.jobId || undefined,
        requestNumber: state.requestNumber || undefined,
        rating,
        clientId: clientId(),
      }),
    });
    const data = await res.json();
    if (res.ok) state.feedbackId = data.id ?? null;
  } catch {
    /* a lost rating is not worth an error banner */
  }

  if (rating === "up") {
    $("feedbackAsk").classList.add("hidden");
    $("feedbackThanks").classList.remove("hidden");
  } else {
    $("fbDetailTitle").textContent = tr("fbReason");
    $("fbReasons").classList.remove("hidden");
    $("fbComment").placeholder = tr("fbComment");
    $("feedbackDetail").classList.remove("hidden");
  }
}

async function sendFeedbackDetails(category) {
  const comment = $("fbComment").value.trim();

  try {
    if (state.feedbackRating === "issue") {
      if (!comment) return;
      await fetch("/api/web/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: state.jobId || undefined,
          requestNumber: state.requestNumber || undefined,
          rating: "issue",
          comment,
          clientId: clientId(),
        }),
      });
    } else if (state.feedbackId) {
      await fetch(`/api/web/feedback/${state.feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: category || undefined, comment: comment || undefined }),
      });
    }
  } catch {
    /* best effort */
  }

  $("feedbackAsk").classList.add("hidden");
  $("feedbackDetail").classList.add("hidden");
  $("feedbackThanks").classList.remove("hidden");
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
function init() {
  const storedTheme = localStorage.getItem("tiltap_theme");
  applyTheme(storedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  $("themeToggle").addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === THEMES.dark ? "light" : "dark");
  });

  initLanguageSwitcher();
  fillLanguageSelects();
  selectTab("file");

  document.addEventListener("tiltap:language", () => {
    fillLanguageSelects();
    if (!$("resultCard").classList.contains("hidden")) {
      renderMeta();
      renderTranslateAgainButtons();
    }
  });

  document.querySelectorAll("[data-tab]").forEach((el) => {
    el.addEventListener("click", () => selectTab(el.dataset.tab));
  });

  // --- file input + drag and drop ---
  const dropzone = $("dropzone");
  const fileInput = $("fileInput");

  fileInput.addEventListener("change", () => {
    if (fileInput.files?.[0]) setFile(fileInput.files[0]);
  });

  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) setFile(file);
  });

  // --- link preview ---
  $("mediaUrl").addEventListener("input", (e) => {
    const embed = youtubeEmbedUrl(e.target.value.trim());
    const wrap = $("linkPreview");
    if (embed) {
      $("linkFrame").src = embed;
      wrap.classList.remove("hidden");
    } else {
      $("linkFrame").src = "";
      wrap.classList.add("hidden");
    }
  });

  $("startBtn").addEventListener("click", startJob);
  $("newJobBtn").addEventListener("click", () => {
    resetResult();
    clearError();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("copyBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.shown);
      const btn = $("copyBtn");
      const label = btn.textContent;
      btn.textContent = tr("copied");
      setTimeout(() => (btn.textContent = label), 1500);
    } catch {
      /* clipboard blocked — nothing useful to say */
    }
  });

  document.querySelectorAll("[data-download]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const kind = btn.dataset.download;
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      if (kind === "txt") {
        download(state.shown, `tiltap-${stamp}.txt`);
      } else if (state.segments.length) {
        const content = kind === "srt" ? buildSrt(state.segments) : buildVtt(state.segments);
        download(content, `tiltap-${stamp}.${kind}`, kind === "vtt" ? "text/vtt" : "text/plain;charset=utf-8");
      } else {
        // No timings to export (e.g. a plain text translation) — the plain text
        // is the only honest answer.
        download(state.shown, `tiltap-${stamp}.txt`);
      }
    });
  });

  $("segmentsToggle").addEventListener("click", () => {
    const box = $("segmentsBox");
    const hidden = box.classList.toggle("hidden");
    $("segmentsToggle").textContent = hidden ? tr("segmentsShow") : tr("segmentsHide");
  });

  $("fbUp").addEventListener("click", () => sendRating("up"));
  $("fbDown").addEventListener("click", () => sendRating("down"));
  $("fbIssue").addEventListener("click", () => sendRating("issue"));
  $("fbSend").addEventListener("click", () => sendFeedbackDetails(null));
  document.querySelectorAll("#fbReasons [data-cat]").forEach((btn) => {
    btn.addEventListener("click", () => sendFeedbackDetails(btn.dataset.cat));
  });
}

function setFile(file) {
  state.file = file;
  $("fileName").textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
  const preview = $("filePreview");
  preview.src = URL.createObjectURL(file);
  preview.classList.remove("hidden");
  clearError();
}

document.addEventListener("DOMContentLoaded", init);
