# OCR Text Vision Pro — Web (GitHub Pages)

A modern, animated, fully client-side React build of OCR Text Vision Pro.
Deployed to GitHub Pages at:

> **<https://bcastelino.github.io/ocr-text-vision-pro/>**

The original Streamlit app (`../ocr_app.py`) remains live and unchanged.

## Stack

- **Vite + React 18 + TypeScript**
- **TailwindCSS** + custom shadcn-style primitives
- **framer-motion** — scroll-triggered fades, staggered reveals, smooth hover transitions
- **three** + **next-themes** — theme-aware Dotted-Surface 3D background ([21st.dev/efferd](https://21st.dev/community/components/efferd/dotted-surface/default))
- **pdfjs-dist** — client-side PDF rendering
- **react-markdown** + **KaTeX** — Markdown + LaTeX result rendering

## Notes vs. the Streamlit build

| Feature                       | Streamlit | GitHub Pages |
| ----------------------------- | --------- | ------------ |
| User-supplied OpenRouter key  | ✅        | ✅ (localStorage) |
| 5-call fallback developer key | ✅        | ❌ (cannot be secured in a static site) |
| Extract / Ask / Chat / PDF    | ✅        | ✅           |
| Model selector                | ✅        | ✅           |
| Dark mode                     | partial   | ✅           |

## Local development

```bash
cd web
npm install
npm run dev      # http://localhost:5173/ocr-text-vision-pro/
npm run build    # output: web/dist
```

## Deployment

Auto-deployed via `.github/workflows/deploy-pages.yml` on any push to `main` that touches `web/**`.

One-time repo setup: **Settings → Pages → Source → GitHub Actions.**
