# Viduto App

A modern video creation platform built with React and Vite.

## Features

- AI-powered video creation
- Product showcase videos
- Text-based video generation
- Modern, responsive design

## Getting Started

### 1. Environment Setup

First, copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Then update the `.env` file with your actual values:

- **VITE_SUPABASE_URL**: Your Supabase project URL (found in your Supabase dashboard)
- **VITE_SUPABASE_ANON_KEY**: Your Supabase anonymous key (found in your Supabase dashboard)
- **VITE_OPENAI_API_KEY**: Your OpenAI API key for AI brief generation
- **N8N_INITIAL_VIDEO_WEBHOOK_URL**: Your N8N webhook URL for initial video production
- **N8N_REVISION_WEBHOOK_URL**: Your N8N webhook URL for video revisions
- **SHARED_WEBHOOK_SECRET**: A secure secret for webhook authentication

### 2. Install Dependencies and Start Development

```bash
npm install
npm run dev
```

### 3. Building the app

```bash
npm run build
```

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- React Router
- Radix UI components

For support, please contact support@viduto.com.