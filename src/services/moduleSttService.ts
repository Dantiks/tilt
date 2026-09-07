import { logger } from "../utils/logger";
import { config } from "../config";
import type { TranscriptionResult, TranscriptionSegment } from "../types";

/**
 * Client for the transcription module.
 *
 * Unlike every other STT path in this codebase the module is asynchronous: the
 * POST only queues the work and answers 202 with a job id, and the transcript
 * is collected by polling. Recognition there is serialised across the whole
 * service, so a job can sit in the queue behind someone else's hour of audio;
 * the timeout has to allow for that, not just for our own processing time.
 */

interface ModuleJob {
  jobId?: string;
  id?: string;
  status?: string;
  error?: string;
  /** Proofread transcript. Sits on the job, not inside `result`. */
  cleanedText?: string;
  progress?: { percent?: number };
  result?: {
    text?: string;
    language?: string;
    segments?: TranscriptionSegment[];
    provider?: string;
    model?: string;
    /** Human-readable quality note, e.g. low confidence for the duration. */
    warning?: string;
  };
}

export function isModuleSttEnabled(): boolean {
  return Boolean(config.TILTAB_MODULE_URL);
}

function moduleUrl(path: string): string {
  return new URL(path, config.TILTAB_MODULE_URL).toString();
}

function authHeaders(): Record<string, string> {
  return config.TILTAB_MODULE_API_KEY
    ? { Authorization: `Bearer ${config.TILTAB_MODULE_API_KEY}` }
    : {};
}

/** Turn a non-2xx module response into an error carrying its machine-readable code. */
async function moduleError(res: Response, what: string): Promise<Error> {
  const body = await res.text().catch(() => "");
  let code = "";
  try {
    code = (JSON.parse(body) as { error?: string }).error ?? "";
  } catch {
    // Body was not JSON; fall back to the raw text below.
  }

  if (res.status === 429 && code === "queue_full") {
    return new Error("module_queue_full");
  }
  return new Error(`${what} failed: ${res.status} ${code || body.slice(0, 200)}`);
}

async function submit(path: string, body: FormData | string, extraHeaders: Record<string, string> = {}): Promise<string> {
  const res = await fetch(moduleUrl(path), {
    method: "POST",
    headers: { ...authHeaders(), ...extraHeaders },
    body,
    // Only the hand-off is bounded here. The job itself is waited on by polling.
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw await moduleError(res, "Module submit");

  const data = (await res.json()) as ModuleJob;
  const jobId = data.jobId ?? data.id;
  if (!jobId) throw new Error("Module accepted the job but returned no job id");
  return jobId;
}

async function waitForJob(
  jobId: string,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<TranscriptionResult> {
  const pollMs = config.TILTAB_MODULE_POLL_MS;
  const deadline = Date.now() + config.TILTAB_MODULE_TIMEOUT_MS;
  let lastPercent = -1;

  while (Date.now() < deadline) {
    if (abortSignal?.aborted) throw new Error("Module transcription aborted");
    await new Promise((r) => setTimeout(r, pollMs));

    const res = await fetch(moduleUrl(`/api/web/jobs/${jobId}`), {
      headers: authHeaders(),
      signal: AbortSignal.timeout(30_000),
    });

    // A job the module has forgotten is not going to appear later.
    if (res.status === 404) throw new Error(`Module job ${jobId} not found`);
    if (!res.ok) throw await moduleError(res, "Module poll");

    const job = (await res.json()) as ModuleJob;

    if (job.status === "failed") {
      // job_interrupted means their server restarted mid-job; it is worth retrying.
      throw new Error(`Module job failed: ${job.error ?? "unknown"}`);
    }

    const percent = job.progress?.percent;
    if (typeof percent === "number" && percent >= 0 && percent !== lastPercent) {
      lastPercent = percent;
      onProgress?.(percent);
    }

    if (job.status === "completed" || job.status === "done" || job.result) {
      const r = job.result ?? {};
      // cleanedText is the same transcript after proofreading and paragraphing,
      // and it hangs off the job rather than off `result`; result.text is raw.
      const text = job.cleanedText || r.text || "";
      if (!text && job.status !== "completed" && job.status !== "done") continue;

      logger.info("Module transcription finished", {
        jobId,
        language: r.language,
        textLength: text.length,
        segmentCount: r.segments?.length ?? 0,
        provider: r.provider,
      });

      return {
        text,
        // Surfaces things like "very few words recognised for this duration",
        // which the bot shows so a poor transcript is not passed off as good.
        warning: r.warning,
        language: r.language ?? "auto",
        // confidence comes back null from GigaAM, so nothing here relies on it.
        segments: r.segments ?? [],
        provider: r.provider ?? "module",
        model: r.model ?? "unknown",
      };
    }
  }

  throw new Error(`Module job ${jobId} exceeded ${config.TILTAB_MODULE_TIMEOUT_MS}ms`);
}

/** Transcribe an uploaded file. `targetLang` also returns a translation when set. */
export async function transcribeWithModule(
  audioBuffer: Buffer,
  filename: string,
  language: string,
  options: { targetLang?: string; onProgress?: (percent: number) => void; abortSignal?: AbortSignal } = {}
): Promise<TranscriptionResult> {
  if (!isModuleSttEnabled()) throw new Error("TILTAB_MODULE_URL is not configured");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audioBuffer)]), filename);
  // The module calls this sourceLang, not language.
  form.append("sourceLang", language || "auto");
  if (options.targetLang) form.append("targetLang", options.targetLang);

  logger.info("Submitting file to transcription module", { filename, language, sizeBytes: audioBuffer.length });
  const jobId = await submit("/api/web/transcribe", form);
  return waitForJob(jobId, options.onProgress, options.abortSignal);
}

/** Transcribe a media link. Same job shape as the file endpoint. */
export async function transcribeLinkWithModule(
  url: string,
  language: string,
  options: { targetLang?: string; onProgress?: (percent: number) => void; abortSignal?: AbortSignal } = {}
): Promise<TranscriptionResult> {
  if (!isModuleSttEnabled()) throw new Error("TILTAB_MODULE_URL is not configured");

  logger.info("Submitting link to transcription module", { url, language });
  const jobId = await submit(
    "/api/web/youtube",
    JSON.stringify({ url, sourceLang: language || "auto", targetLang: options.targetLang ?? "none" }),
    { "Content-Type": "application/json" }
  );
  return waitForJob(jobId, options.onProgress, options.abortSignal);
}
