# Threads Full-Stack — Run Locally (without Docker)

This repository contains a full-stack Threads-like app with two main folders: `server` (Express + MongoDB) and `client` (React + Vite). These instructions show how to run the project locally without Docker.

---

## Prerequisites

- Node.js (v18+ recommended) and npm installed
- A MongoDB instance (Atlas or local) and its connection string
- (Optional) Accounts / API keys for Cloudinary and any AI services used (OpenAI, Gemini, Anthropic, Groq, etc.)

---

## Overview

- `server` runs on port `5000` by default (can be overridden with `PORT`).
- `client` runs on the Vite dev server (usually `5173`).

You will run both in separate terminals.

---

## 1) Install dependencies

Open two terminals (PowerShell) and run the following commands.

Server:

```powershell
cd server
npm install
```

Client:

```powershell
cd client
npm install
```

---

## 2) Environment variables

Create a `.env` file in the `server` directory with the required variables. Example `server/.env` (do NOT commit real secrets):

```
# Server environment variables
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/threads-db?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_here

# Cloudinary (optional, used for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI / 3rd-party keys (optional)
GROQ_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
CLAUDE_API_KEY=

# Other (leave blank or set as needed)
# COOKIE_NAME=some_cookie_name
```

Notes:

- The `server` code prints whether key env variables are set on startup. Make sure `MONGO_URI` and `JWT_SECRET` are set at minimum.
- Keep secrets out of source control. Use `.env.local` or add `.env` to `.gitignore` if needed.

Client-side environment variables

The client expects Vite-style variables prefixed with `VITE_`. There is an existing `client/.env` in the repo for EmailJS values. To add or change client env values, set them in `client/.env` or `client/.env.local`.

Example `client/.env` (values for development):

```
VITE_EmailJS_service_ID=your_service_id
VITE_EmailJS_template_ID=your_template_id
VITE_EmailJS_user_ID=your_user_id
VITE_OPENAI_API_KEY=optional_client_openai_api_key
```

Important: Any `VITE_` variable embedded in client code will be visible to the browser — do not put secrets there that must stay private.

---

## 3) Start the servers (two terminals)

Terminal A — Start the server (development with auto-reload):

```powershell
cd server
npm run dev
# or for production-like: npm start
```

Terminal B — Start the client (Vite):

```powershell
cd client
npm run dev
```

Open the client in your browser (Vite will show the exact URL, usually `http://localhost:5173`). The client will talk to the server at the server's address (default `http://localhost:5000`). If the client needs a different API base URL, update the client code or set an environment variable used by the client that points to the server.

---

## 4) Common troubleshooting

- "Cannot connect to MongoDB": Verify `MONGO_URI` is correct and reachable from your machine.
- "401 / JWT errors": Make sure `JWT_SECRET` is set and same secret is used for token generation and verification.
- Image uploads failing: Ensure your Cloudinary keys are set and valid.
- Port conflicts: set `PORT` in `server/.env` or stop the conflicting process.

---

## 5) Useful commands

- Lint/format server:

```powershell
cd server
npm run format
```

- Format client files:

```powershell
cd client
npm run format
```

- Build client for production:

```powershell
cd client
npm run build
```

---

## 6) Next steps (optional)

- Add `server/.env.example` and `client/.env.example` (I can add these files on request).
- Add an npm script to the repo root to run server + client concurrently (requires adding `concurrently` or a similar tool).

---

If you want, I can create `server/.env.example` and a `client/.env.example`, or add a helper script to start both services together. Would you like me to add those files now?
