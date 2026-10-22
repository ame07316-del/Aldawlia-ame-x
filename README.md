# AMK Books

An imaginary bilingual bookshop: generated cover artwork, dimensional CSS hardcover models, and scroll-linked book animation. Built with Vite and vanilla JavaScript. All artwork and fonts are served locally; no API keys or backend required.

## Run

```sh
npm install
npm run dev
```

## Validate

```sh
npm test
npm run build
```

## Experience

- Three original AI-generated cover illustrations in `public/images`: desert, moonlit ocean, and botanical artwork.
- A floating three-book opening composition, followed by three sticky scroll scenes with rotation, lift, subtly opening covers, and progress lines.
- English / Arabic with RTL, light / dark themes, and reduced-motion support.
- Fictional books, authors, descriptions, and original short reading samples, explicitly labeled as portfolio concepts.
- Local-only reading list. Only preferences and saved book IDs are stored in browser localStorage.
- Demo newsletter form: no email collection, network submission, purchase, or backend.

## Skill and scope

The requested `oso95/scroll-world` skill is installed in `.agents/skills/scroll-world`. Its paid external video pipeline was not run. This implementation uses generated still artwork and lightweight scroll-driven CSS 3D, not generated video.

Four automated DOM tests cover rendered books, language/theme switching, preview dialogs and reading-list persistence, and the demo form. Production build passes. Full visual/device QA remains outstanding: the environment blocks Playwright browser downloads; an alternative packaged Chromium also could not launch because the OS lacks `libnspr4.so`.
