# FluentEdge — Planning Document (React Native)

## 1. Product Overview

**Concept:** An offline, on-device AI-powered English writing/grammar tutor for people who already know English but want to improve writing, grammar, and style. The app generates open-ended writing prompts, evaluates user responses, and delivers targeted mini-lessons on mistakes.

**Target audience:** Intermediate-to-advanced English speakers (not beginners learning from scratch).

**Core differentiator:** Fully offline — no external API calls, using a local LLM running on-device.

---

## 2. Tech Stack
Component	Choice
Framework	React Native
Local LLM runtime	llama.cpp via llama.rn
Model (initial)	Qwen 2.5 3B Instruct or Llama 3.2 3B Instruct (4-bit quantized, .gguf)
Model delivery	Downloaded post-install (not bundled in app binary)
File/download management	react-native-fs or expo-file-system + react-native-background-downloader (resumable downloads)
Local storage	SQLite (user profile, prompts, error history, progress)
Notifications	notifee (action buttons + quick-reply support)
Dev tooling	Android Studio (Gemini as coding assistant only, not part of the shipped app)
3. Core Features
3.1 Onboarding
Diagnostic test: short writing sample or sentence corrections, scored by the LLM to estimate real proficiency (rough CEFR level) instead of relying on self-reported level.
Learning goal: business, academic, exam prep (IELTS/TOEFL), casual/conversational, creative writing.
Native language (optional): helps anticipate L1-interference mistakes.
Focus areas: grammar, vocabulary, tone/style, fluency.
Session preferences: practice frequency, difficulty pacing.
Output: a local user profile (JSON/SQLite) injected into future LLM prompts.

3.2 Exercise Loop
App generates or retrieves a writing prompt appropriate to user profile.
User writes a paragraph/response.
LLM evaluates the response and returns structured JSON:
Corrections (original phrase, corrected phrase, error type, explanation, quick tip)
Improved rewrite of the paragraph
Strengths/positive feedback
UI renders this as interactive cards + a "mini-lesson" per mistake.
3.3 Adaptive Personalization
Log error types/frequency per session.
Maintain a rolling "weak spots" summary (short tags/counters, not raw text) fed back into future prompts.
Adjust difficulty/level estimate over time based on trends, not just the initial diagnostic.
3.4 Local Notifications (Daily Practice Nudge)
Pre-cached (not live-generated) short question + 3 answer alternatives, to avoid running the LLM in the background.
Delivered via notifee action buttons (3 max, cross-platform safe limit).
Tapping an option triggers a background handler that records the answer.
Full explanation/lesson content opens when the user returns to the app (rich content can't render inside the notification itself).
3.5 Model Management (Settings)
Delete downloaded AI model: frees ~1.5–2.5GB storage; sets isModelDownloaded: false, prompts re-download when needed. User profile/progress data stays intact (separate lightweight DB).
Optional future: model switching (smaller/faster vs. larger/more accurate).
3.6 Uninstall Behavior
Uninstalling the app removes everything (model file, database, cache) — standard OS sandboxing on iOS/Android. No separate cleanup needed.
4. Technical Architecture Notes
Model Prompting
Keep injected user profile concise (few lines, not paragraphs) — 3B-class models have limited context and lose instruction-following quality with long system prompts.

Example system prompt pattern:
```
You are an English writing tutor.
User profile:

Level: Intermediate (B1)
Native language: Portuguese
Goal: Improve business email writing
Focus: Grammar and tone
Known recurring mistakes: article omission, verb tense consistency
Generate a writing prompt appropriate for this level and goal.
When correcting, prioritize the focus areas above.
Respond ONLY in the specified JSON format.
```

Structured Output Enforcement
Use a low temperature (0.2–0.4) and a strict JSON schema to keep output parseable:
```json
{
"has_errors": true,
"corrections": [
{
"original_phrase": "he go to school",
"corrected_phrase": "he goes to school",
"error_type": "Subject-Verb Agreement",
"explanation": "...",
"quick_tip": "..."
}
],
"improved_paragraph": "...",
"strengths": "..."
}
```

Hybrid Rule-Based Layer (Optional)
Use a lightweight rule-based spelling/punctuation checker before the LLM call, so the LLM focuses on nuance and style rather than obvious typos.

5. Notification Technical Constraints
iOS: max 4 action buttons (simple taps), text-input reply supported but limited UI.
Android: 3 action buttons is the safe cross-device limit; also supports text-input reply.
No rich/custom UI inside a notification — tapping opens the app or fires a background handler only.
iOS is stricter about background execution triggered from notification taps — test thoroughly across OS versions.
6. Development Phases
Phase 0 — Setup
Lock in framework, model, libraries (table above).

Phase 1 — App Skeleton (no AI)

Onboarding UI
Local profile storage
Static/hardcoded exercise + feedback screens
Navigation: Home → Exercise → Feedback → Progress/History
Phase 2 — Model Integration

Model download manager (resumable, Wi-Fi check, checksum verification)
llama.rn integration, basic prompt/response test
System prompt template with profile injection
Structured JSON parsing
Replace static screens with live LLM-driven exercise loop
Phase 3 — Personalization & Adaptive Difficulty

Error logging per session
Rolling weak-spots summary
Difficulty/level adjustment logic
Refine diagnostic scoring
Phase 4 — Notifications

Schedule daily/periodic notifications
Pre-cache lightweight question + 3 alternatives
Wire action buttons → background handler → store answer
Show lesson on next app open
Phase 5 — Polish

Handle low-storage/low-RAM devices gracefully
Settings: model deletion, re-take diagnostic, focus area changes
Performance testing (inference speed, battery, background limits)
App size/cold-start optimization
Phase 6 — Expansion (Later)

Add target-language selector (architecture is language-agnostic)
Per-language prompt templates and grammar taxonomies
Consider model upgrades for lower-resource languages
7. App Name
FluentEdge

8. Open Decisions to Finalize Before Building
 Confirm final model choice (Qwen 2.5 3B vs. Llama 3.2 3B) — test both for grammar-explanation quality
 Decide if diagnostic test uses fixed sentences or an LLM-generated short writing sample
 Decide notification frequency defaults (daily? user-configurable?)
 Decide minimum supported device specs (RAM threshold for running a 3B model)
