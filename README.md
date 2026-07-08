# Buzbo Landing

Marketing landing page for Buzbo, built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com). The site is configured to deploy to [Cloudflare Workers](https://developers.cloudflare.com/workers/).

## Prerequisites

- **Node.js** `>= 22.12.0` (see `package.json` engines)
- **npm** (comes with Node.js)

Check your Node version:

```bash
node -v
```

If you use [nvm](https://github.com/nvm-sh/nvm), install and use the required version:

```bash
nvm install 22
nvm use 22
```

## Local setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd buzbo-landing-v2
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the dev server

```bash
npm run dev
```

Astro starts a local dev server, usually at [http://localhost:4321](http://localhost:4321). Open that URL in your browser to view the site. The page reloads automatically when you save changes.

### 4. Build for production (optional)

To verify the production build locally:

```bash
npm run build
npm run preview
```

`preview` serves the built output so you can check it before deploying.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Build the site for production |
| `npm run preview` | Preview the production build locally |
| `npm run deploy` | Build and deploy to Cloudflare Workers |
| `npm run generate-types` | Generate Wrangler TypeScript types |

## Project structure

```
buzbo-landing-v2/
├── public/              # Static assets served as-is (favicon, brand images, etc.)
├── src/
│   ├── pages/
│   │   └── index.astro  # Landing page
│   └── styles/
│       └── global.css   # Tailwind theme and base styles
├── astro.config.mjs     # Astro configuration
├── wrangler.json        # Cloudflare Workers deployment config
├── package.json
└── tsconfig.json
```

Static files in `public/` are served from the site root. For example, `public/brand/logo.png` is available at `/brand/logo.png`.

## Tech stack

- **Astro 7** — static site framework
- **Tailwind CSS 4** — utility-first styling via `@tailwindcss/vite`
- **@astrojs/cloudflare** — Cloudflare Workers adapter
- **Wrangler** — Cloudflare CLI for deployment

## Deploying to Cloudflare Workers

Deployment is only needed when pushing to production. Local development does not require a Cloudflare account.

1. Log in to Cloudflare (first time only):

   ```bash
   npx wrangler login
   ```

2. Build and deploy:

   ```bash
   npm run deploy
   ```

The Worker name is set in `wrangler.json` as `buzbo-landing-v2`. Cloudflare will auto-provision bindings (KV, Images) on first deploy.

## Troubleshooting

**Port already in use**

Run the dev server on a different port:

```bash
npm run dev -- --port 4322
```

**Node version errors**

This project requires Node.js 22.12 or newer. Upgrade Node or switch versions with nvm before running `npm install`.

**Missing brand assets**

The landing page references images under `/brand/`. Add those files to `public/brand/` if they are not already in the repo.
