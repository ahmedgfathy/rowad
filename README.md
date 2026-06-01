<div align="center">

# 🚀 Rowad CRM

<img src="https://readme-typing-svg.demolab.com?font=Inter&weight=700&size=24&duration=2800&pause=900&color=2563EB&center=true&vCenter=true&width=680&lines=Modern+Real+Estate+CRM;From+WhatsApp+Leads+to+Actionable+Follow-ups;Vue+3+%2B+Supabase+%2B+PWA" alt="Rowad CRM animated title" />

<p>
  <img src="https://img.shields.io/badge/Vue-3.5-42b883?logo=vue.js&logoColor=white" alt="Vue" />
  <img src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3ecf8e?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/PWA-Ready-2563eb" alt="PWA" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss&logoColor=white" alt="Tailwind" />
</p>

</div>

---

## 📱 Product Preview

<p align="center">
  <img src="https://github.com/user-attachments/assets/0b5b1320-09a5-438e-b482-82d658498992" alt="Rowad CRM login screen" width="360" />
</p>

---

## 🧭 Project Scenario

Rowad CRM is designed for real-estate teams that receive many incoming leads (especially WhatsApp exports) and need a simple way to:

1. **Import conversations** into a central pipeline.
2. **Organize and filter leads** quickly (search, starred, due today).
3. **Track follow-ups** with status, date, tags, and notes.
4. **Monitor performance** from dashboard insights (totals, top senders, trends, categories).
5. **Use it like an app** on mobile through PWA installation.

In short: **it transforms raw chat messages into a manageable sales workflow.**

---

## ✨ Key Features

- 🔐 **Authentication** with Supabase Auth.
- 📥 **Bulk import** of WhatsApp text files.
- 🏷️ **Lead management** with starring, filtering, pagination, and editing.
- 📅 **Follow-up workflow** (`new`, `in_progress`, `waiting_client`, `follow_up`, `closed`, `lost`).
- 📊 **Analytics dashboard** for lead volume, categories, property type split, and activity.
- 📱 **PWA support** with install banner and offline-ready service worker.

---

## 🧱 Technology Stack

- **Frontend:** Vue 3 (Composition API), Vue Router, Pinia
- **Styling:** Tailwind CSS v4
- **Build Tooling:** Vite + TypeScript + vue-tsc
- **Backend Services:** Supabase (Auth + Postgres)
- **PWA:** vite-plugin-pwa + Workbox

---

## ⚙️ Local Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3) Run the app

```bash
npm run dev
```

### 4) Build for production

```bash
npm run build
```

---

## 🗃️ Database Update (Follow-up fields)

Run the provided migration in your Supabase SQL editor:

- `/supabase_followup_migration.sql` (repository root)

It adds follow-up columns, constraints, and indexes used by the CRM workflow.

---

## 📂 Project Structure (high level)

```text
src/
  components/      # Shared UI (navbar, PWA install banner, etc.)
  composables/     # Reusable logic (PWA install flow)
  layouts/         # Dashboard layout shell
  lib/             # External clients (Supabase)
  pages/           # App screens (Login, Dashboard, Properties, ...)
  router/          # Route definitions + auth guards
```

---

## ✅ Available Scripts

- `npm run dev` → start development server
- `npm run build` → type-check + production build
- `npm run preview` → preview production build

---

## 🌟 Vision

Rowad CRM aims to give sales teams a **clear daily operating system** for lead follow-up: faster response, better visibility, and more conversions.
