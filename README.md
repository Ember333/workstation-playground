# Workstation Playground

A simple React Router v7 site for small web experiments.

## Stack

- React Router v7
- React 19
- Tailwind CSS v4
- Vite
- Cloudflare Pages

## Development

```bash
npm install
npm run dev
```

The local dev server runs at `http://localhost:5173`.

## Build

```bash
npm run typecheck
npm run build
npm run preview
```

The Cloudflare Pages output directory is `build/client`.

## Deploy

```bash
npm run build
npx wrangler pages deploy build/client --project-name=workstation-playground
```

The Pages project configuration is stored in `wrangler.jsonc`.
