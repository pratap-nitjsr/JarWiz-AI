
# AI-Powered Document Chat Assistant

## Multi-Modal RAG Chatbot

A voice-enabled, multi-modal chatbot that processes PDFs, performs hybrid RAG + web search, and returns AI-generated answers with **exact page citations, images, and voice input support**.

---

## 🚀 What It Does

* 📄 Upload PDFs → Extract text & images
* 🤖 Ask questions → AI answers with exact citations
* 🎤 Voice input → Real-time speech-to-text (Deepgram)
* 🔍 Hybrid search → RAG + automatic web search fallback
* 🖼️ Image grounding → Inline PDF page images
* 🧠 Memory → Context-aware conversations
* 🔐 Security → Prompt-injection & input sanitization

---

## 🛠 Tech Stack

### Backend

* FastAPI (async)
* Google Gemini 1.5 Pro (LLM)
* Google Vertex AI (embeddings)
* Pinecone (vector DB)
* PyMuPDF (PDF processing)
* BLIP-2 **or** Gemini VLM (image captioning)
* Serper API (web search)
* Deepgram (voice)

### Frontend

* Next.js 14 (App Router)
* TypeScript
* Tailwind CSS + shadcn/ui
* Zustand
* react-pdf
* react-dropzone

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

GOOGLE_API_KEY=your-google-api-key

PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-environment
PINECONE_INDEX_NAME=pdf-multimodal-rag

SERPER_API_KEY=your-serper-api-key

USE_GEMINI_VLM=false
GEMINI_VLM_MODEL=gemini-2.5-flash

UPLOAD_DIR=uploads
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEEPGRAM_API_KEY=your-deepgram-api-key
```

---

## 📦 Setup

### 1️⃣ Clone

```bash
git clone <repository-url>
cd JarWiz-2
```

### 2️⃣ Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3️⃣ Frontend

```bash
cd frontend
npm install
npm run dev
```

* Frontend: [http://localhost:3000](http://localhost:3000)
* Backend API: [http://localhost:8000](http://localhost:8000)
* API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧩 Pinecone Index

* **Name:** `jarwiz-docs`
* **Dimensions:** `768`
* **Metric:** `cosine`

---

## 🧠 Features

* 🎤 Voice-enabled chat
* 📄 Exact PDF page citations (clickable)
* 🖼️ Citation thumbnails & full-page view
* 🔍 Auto web search if document confidence < 50%
* 🧠 Conversation memory (last 10 turns)
* ⚡ Streaming & fast responses

---

## 📁 Project Structure

```
JarWiz-2/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   ├── models/
│   │   └── utils/
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── types/
│
├── .env.example
└── README.md
```

---

## 🔗 API Endpoints

**Documents**

* `POST /api/documents/upload`
* `GET /api/documents`
* `DELETE /api/documents/{id}`

**Chat**

* `POST /api/chat/query`

**Citations**

* `GET /api/citations/{id}`

**Health**

* `GET /health`

---

## ⚡ Quick Start (TL;DR)

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

Open → [http://localhost:3000](http://localhost:3000) 🚀

