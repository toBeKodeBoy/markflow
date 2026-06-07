/** Content length above which split/source mode is preferred. */
export const LARGE_FILE_THRESHOLD = 200_000

/** Debounce delay (ms) for TOC heading re-parse while typing. */
export const TOC_PARSE_DEBOUNCE_MS = 400

/** Debounce delay (ms) for preview HTML render while typing. */
export const PREVIEW_RENDER_DEBOUNCE_MS = 150

/** Extra debounce (ms) for preview when content exceeds large-file threshold. */
export const PREVIEW_LARGE_DEBOUNCE_MS = 600
