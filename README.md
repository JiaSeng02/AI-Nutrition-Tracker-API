# AI Nutrition Tracker API

A small Vercel serverless API for the AI Nutrition Tracker React Native app.

## Purpose

This backend will eventually provide a secure server-side integration with the Gemini API. The mobile app remains local-first and keeps its SQLite data on the device.

Current endpoint:

- `GET /api/health` — verifies that the API is running.

## Local setup

Install dependencies:

```bash
npm install
```

Run the TypeScript check:

```bash
npm run typecheck
```

For local Vercel development, install the Vercel CLI if needed and run:

```bash
vercel dev
```

Then open:

```
http://localhost:3000/api/health
```

## Deployment

This repository is connected to a Vercel project. Pushes to the configured Git branch can trigger Vercel deployments.

The production endpoint is:

```
https://<your-vercel-project>.vercel.app/api/health
```

Replace the hostname with the actual Vercel project URL.

## Security

Never commit API keys, tokens, passwords, or other secrets to Git.

Environment files such as `.env` are ignored by Git. Gemini credentials will be added later through Vercel Environment Variables and will not be hard-coded into the mobile app or repository.

## Scope

The current backend contains only the health-check foundation. Gemini integration, authentication, databases, and other backend features will be added in later steps.
