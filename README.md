# Zoft Workflow Frontend

Stack: React 18, TypeScript, Vite, Tailwind v4, React Router DOM, Zustand, Axios, Zod, React Hook Form, Sonner.

Scripts:

- `npm run dev`: start dev server
- `npm run build`: type-check and build
- `npm run preview`: preview production build

Env variables:

- `VITE_API_BASE_URL`: Base URL for backend API

Project structure highlights:

- `src/layouts/AppLayout.tsx`: Protected app shell with sidebar and top bar
- `src/pages/auth/*`: Sign-in and sign-up pages
- `src/stores/authStore.ts`: Auth state, session restoration, cookie-based token
- `src/lib/http.ts`: Axios instance with interceptors
- `src/components/*`: Error boundary, guarded route, primitives
