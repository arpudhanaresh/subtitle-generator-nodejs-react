# Subtitle Generator — Frontend

Vite + React 19 + TypeScript + Tailwind CSS v4.

## Scripts

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server (http://localhost:5173)
npm run build    # type-check (tsc) + production build to dist/
npm run preview  # serve the production build locally
```

## Configuration

The backend base URL is read from `VITE_API_URL` (see `.env`), defaulting to
`http://localhost:5000`. The frontend calls the FastAPI backend in `../api`.

See the repository root `CLAUDE.md` for the full architecture and `IMPLEMENTATION_PLAN.md`
for the migration history.
