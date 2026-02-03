# Forest Explorer (React + Vite + R3F)

A calm, browser-based forest exploration scene built for Netlify deployment.

## Quick start

```bash
npm install
npm run dev
```

## Netlify deployment notes

- Vite base is set to `"./"` for correct asset paths in Netlify previews.
- The project uses client-side rendering only (no routing). If you add routes, enable SPA fallback (`/* -> /index.html`).
- All assets should live under `public/` and be referenced with absolute paths like `/models/deer.glb`.

## Performance notes

- Trees are instanced meshes to minimize draw calls.
- Animals are capped at 3–5 active models.
- Terrain uses a simple displaced plane.
- Avoid heavy post-processing; keep textures <= 2K.

## Asset expectations

Provide low-poly, Draco-compressed GLB models in `public/models/` and audio in `public/audio/`:

- `public/models/deer.glb`
- `public/models/elk.glb`
- `public/models/fox.glb`
- `public/models/rabbit.glb`
- `public/draco/` (Draco decoder files from the official three.js distribution)
- `public/audio/ambient-forest.mp3`
- `public/audio/animal-chirp.mp3`

The scene will fall back to simple primitives if a model fails to load.
