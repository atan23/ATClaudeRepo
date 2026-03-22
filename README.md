# ReadWise - Book Recommendations App

A full-stack book recommendations app with Google login, reading platform integrations (Kindle, Goodreads), personalized recommendations, and gamification features.

## Features

- **Google OAuth Login** — Sign in with your Google account
- **Reading Platform Integration** — Import books from Kindle and Goodreads via CSV export
- **Book Recommendations**
  - **For You** — Personalized based on your reading history and favorite genres
  - **Trending** — Popular books based on ratings and community reads
  - **Social** — Community favorites and what readers are loving
- **Library Management** — Track books across reading statuses (Want to Read, Reading, Read)
- **Gamification**
  - Points system (+5 to +50 per action)
  - 10 levels (Curious Reader → Legendary Reader)
  - 16 unique badges to earn
  - Reading streak tracker
  - Leaderboard
- **Reading Goals** — Set yearly and monthly reading targets with progress tracking
- **Book Search** — Search 40+ million books via Google Books API

## Quick Start

### Prerequisites
- Node.js 18+

### 1. Install dependencies

```bash
# Backend (--no-workspaces avoids npm workspace hoisting issues)
cd backend && npm install --no-workspaces

# Frontend
cd ../frontend && npm install --no-workspaces
```

### 2. Configure backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_BOOKS_API_KEY=your_api_key   # optional
JWT_SECRET=any_random_secret
```

### 3. Run the app

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Demo Mode

Click **"Try Demo (No sign-in needed)"** to explore with pre-loaded data — no Google account required.

## Importing Books

- **Goodreads**: My Books → Import and Export → Export Library CSV
- **Kindle**: Amazon Content Library → export CSV

## Tech Stack

- **Backend**: Node.js + Express + TypeScript + SQLite + Passport Google OAuth
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
