# Image Integration Testing Rules

- Always use base64-encoded images for tests. Accepted: JPEG, PNG, WEBP only.
- No SVG/BMP/HEIC. No blank/solid-color images. Images must have real visual features.
- Re-detect MIME after any transform. Animated images -> first frame only. Resize oversized images.

## StudioHub AI — AI Photo Selection
- Endpoint: POST /api/galleries/{id}/ai-select analyzes each photo (OpenAI gpt-5.4 vision via EMERGENT_LLM_KEY).
- Photos stored as base64 data URLs or http URLs (downloaded & encoded server-side).
- Returns gallery with each photo scored (ai_score 0-100), ai_tags, ai_reason, and top 40% ai_selected=true.
