import { describe, it } from "node:test";
import assert from "node:assert";

import { targetLanguageFor } from "../services/telegramService";

describe("targetLanguageFor", () => {
  it("leaves a different target alone", () => {
    assert.strictEqual(targetLanguageFor("ru", "ky"), "ky");
    assert.strictEqual(targetLanguageFor("ky", "en"), "en");
  });

  it("never overrides an explicit no-translation choice", () => {
    assert.strictEqual(targetLanguageFor("ru", "none"), "none");
    assert.strictEqual(targetLanguageFor("ky", "none"), "none");
  });

  it("offers Kyrgyz when the recording is already in the target language", () => {
    assert.strictEqual(targetLanguageFor("ru", "ru"), "ky");
    assert.strictEqual(targetLanguageFor("uz", "uz"), "ky");
    assert.strictEqual(targetLanguageFor("tg", "tg"), "ky");
    assert.strictEqual(targetLanguageFor("en", "en"), "ky");
  });

  it("falls back to Russian when the recording is Kyrgyz", () => {
    assert.strictEqual(targetLanguageFor("ky", "ky"), "ru");
  });

  it("never returns the source language", () => {
    for (const lang of ["ky", "tg", "uz", "en", "ru"] as const) {
      assert.notStrictEqual(targetLanguageFor(lang, lang), lang);
    }
  });
});
