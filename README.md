# FluentEdge

<p align="center">
  <img src="icon.png" width="120" alt="FluentEdge icon" />
</p>

An offline, on-device AI writing tutor for intermediate-to-advanced language learners. FluentEdge runs a local LLM (llama.cpp) directly on your phone — no external API calls, no data leaving the device. It generates writing exercises, grades your responses with structured corrections, and adapts to your weak spots over time.

## Features

- **Onboarding diagnostic** — a short LLM-scored writing sample estimates your real proficiency (rough CEFR level) instead of relying on self-reported skill
- **Writing exercises with structured feedback** — corrections (original → corrected, error type, explanation, quick tip), an improved rewrite, and positive feedback, rendered as interactive cards with mini-lessons
- **Adaptive personalization** — error types and frequency are logged per session into a rolling "weak spots" profile that feeds future prompts and difficulty
- **Study reminders** — daily notifications with pre-cached questions and quick-answer action buttons; full explanations open when you return to the app
- **Model management** — resumable, checksum-verified model download (Wi-Fi recommended), switchable between a ~2 GB standard and ~1.7 GB smaller variant, deletable from Settings to free storage
- **Progress tracking** — session history and trends stored locally
- **English & Spanish** — per-language prompt templates and error taxonomies

## Tech Stack

| Component | Choice |
| --- | --- |
| Framework | React Native 0.87 + TypeScript |
| Local LLM runtime | llama.cpp via `llama.rn` |
| Model | Qwen 2.5 3B Instruct (GGUF): `q4_k_m` (~2 GB) or `q3_k_m` (~1.7 GB), 4-bit-class quantized |
| Model delivery | Downloaded post-install (not bundled), SHA-256 verified |
| Downloads / files | `react-native-fs` + `@kesha-antonov/react-native-background-downloader` |
| Local storage | SQLite (`react-native-sqlite-storage`) |
| Notifications | `@notifee/react-native` (action buttons + background handlers) |
| Navigation | `@react-navigation` v7 |

## Requirements

- **Node.js ≥ 22.11** (see `.nvmrc`; `npm install` checks the `engines` field)
- **iOS**: Xcode + CocoaPods (Ruby gems managed via `Gemfile` — `bundle install`)
- **Android**: Android Studio with SDK + JDK

## Getting Started

```bash
# 1. Install JS dependencies
#    (postinstall runs patch-package and applies patches/react-native-sqlite-storage+6.0.1.patch)
npm install

# 2a. iOS — install Ruby deps and CocoaPods, then build & run
bundle install
bundle exec pod install --project-directory=ios
npm run ios

# 2b. Android — build & run
npm run android
```

On first launch the app downloads the LLM model (~2 GB, resumable, checksum-verified) to app-private storage. Keep an eye on free space; the standard variant also wants ~4 GB free RAM to run comfortably.

> Metro is started automatically by `npm run ios` / `npm run android`. To run it on its own: `npm start`.

## Scripts

| Script | Description |
| --- | --- |
| `npm start` | Start Metro bundler |
| `npm run ios` | Build and run the iOS app |
| `npm run android` | Build and run the Android app |
| `npm run lint` | ESLint |
| `npm test` | Jest test suite |

## Project Structure

```
src/
├── ai/                # LLM integration: model config, prompting, evaluation, adaptive logic, languages
├── components/        # Reusable UI components
├── context/           # React contexts: Model, Onboarding, Profile
├── data/              # SQLite layer: schema, profile/session/question repos, diagnostic, prompts
├── hooks/             # Shared React hooks
├── navigation/        # Root navigator, main tabs, onboarding stack
├── notifications/     # Study reminders, daily questions, scheduling, background handlers
├── screens/           # onboarding, home, exercise, lesson, progress, settings
├── services/          # Model download/verification, device capabilities, debug logging
├── utils/             # Helpers
└── theme.ts           # Design tokens
```

## Architecture Notes

<details>
<summary><strong>How the on-device AI works</strong></summary>

- **Profile injection** — the user profile (level, goal, native language, focus areas, weak spots) is injected as a concise system prompt. Small (3B-class) models lose instruction-following quality with long system prompts, so it's kept to a few lines.
- **Structured output** — the model is prompted at low temperature (0.2) to return strict JSON (corrections with `original_phrase` / `corrected_phrase` / `error_type` / `explanation` / `quick_tip`, plus an improved paragraph and strengths), which the app parses and renders as cards.
- **Notifications stay lightweight** — question + answer options are pre-cached (never live-generated) so the LLM never runs in the background. Action buttons are capped at 3 for cross-platform safety (iOS allows 4).
- **Privacy** — all inference and storage are local. Uninstalling the app removes the model, database, and cache (standard OS sandboxing).

</details>

## Roadmap

- Graceful handling of low-storage / low-RAM devices (variant selection exists; more hardening planned)
- Performance testing: inference speed, battery, background limits
- App size / cold-start optimization
- More target languages (architecture is language-agnostic — see `src/ai/languages.ts`)
- Optional model switching between additional quantization levels
