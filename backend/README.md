# Multi-modal RAG Chatbot - Backend

FastAPI backend for the multi-modal RAG chatbot with PDF processing, image captioning, and hybrid search capabilities.

## Features

- 📄 **PDF Processing**: Extract text and images from PDF documents using PyMuPDF
- 🖼️ **Image Captioning**: Generate captions for images using BLIP-2
- 🔍 **Hybrid Search**: Combine vector search (Pinecone) with web search (Serper API)
- 🤖 **LLM Integration**: Google Gemini via Vertex AI for answer generation
- 📊 **Semantic Chunking**: LangChain-based semantic document chunking
- ✨ **Citation Generation**: Highlighted PDF page images for citations

## Tech Stack

- **Framework**: FastAPI with async support
- **Document Processing**: PyMuPDF (fitz)
- **Image Processing**: BLIP-2 (Salesforce/blip2-opt-2.7b) via Hugging Face Transformers
- **Embeddings**: Google Gemini Embedding models via Vertex AI
- **LLM**: Google Gemini (gemini-2.5-flash) via Vertex AI
- **Vector DB**: Pinecone
- **Web Search**: Serper API
- **Chunking**: LangChain with RecursiveCharacterTextSplitter

## Prerequisites

- Python 3.10+
- Google Cloud Platform account with Vertex AI enabled
- Pinecone account
- Serper API key
- CUDA-compatible GPU (recommended for BLIP-2)

## Installation

1. **Create and activate virtual environment**:
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Google Cloud / Vertex AI
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-environment
PINECONE_INDEX_NAME=pdf-multimodal-rag

# Serper API
SERPER_API_KEY=your-serper-api-key
```

4. **Set up Google Cloud credentials**:
   - Create a service account in Google Cloud Console
   - Download the JSON key file
   - Update `GOOGLE_APPLICATION_CREDENTIALS` in `.env`

5. **Create Pinecone index** (if not exists):
The application will automatically create the index on first run, but you can also create it manually with dimension 768 (for textembedding-gecko).

## Running the Application

1. **Start the server**:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2. **Access the API**:
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs
   - Health: http://localhost:8000/health

## API Endpoints

### Document Management
- `POST /api/documents/upload` - Upload and process PDF document
- `DELETE /api/documents/{document_id}` - Delete document

### Chat
- `POST /api/chat/query` - Send chat query with RAG

### Citations
- `GET /api/citations/{citation_id}` - Get citation with highlighted page image

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Configuration
│   ├── api/
│   │   ├── routes/          # API route handlers
│   │   └── dependencies.py  # Dependency injection
│   ├── services/            # Business logic services
│   ├── models/              # Pydantic models
│   └── utils/               # Utility functions
├── requirements.txt
└── .env.example
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLOUD_PROJECT` | GCP Project ID | Yes |
| `GOOGLE_CLOUD_LOCATION` | GCP Region | Yes |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON | Yes |
| `PINECONE_API_KEY` | Pinecone API key | Yes |
| `PINECONE_ENVIRONMENT` | Pinecone environment | Yes |
| `PINECONE_INDEX_NAME` | Pinecone index name | Yes |
| `SERPER_API_KEY` | Serper API key | Yes |
| `GEMINI_MODEL` | Gemini model name | No (default: gemini-2.5-flash) |
| `EMBEDDING_MODEL` | Embedding model name | No (default: textembedding-gecko@003) |
| `BLIP2_MODEL` | BLIP-2 model name | No (default: Salesforce/blip2-opt-2.7b) |

## Development

### Code Style
```bash
pip install -r requirements-dev.txt
black app/
flake8 app/
mypy app/
```

## Performance Optimization

- BLIP-2 model is cached in memory after first load
- PDF page images are cached for citation generation
- Pinecone upserts are batched (100 vectors per batch)
- Use GPU for BLIP-2 if available

## Troubleshooting

### BLIP-2 Model Loading
If you encounter memory issues with BLIP-2:
- Use a smaller model variant
- Reduce batch size for caption generation
- Ensure sufficient GPU memory (>8GB recommended)

### Pinecone Connection
If Pinecone index doesn't exist:
- The app will create it automatically
- Wait a few minutes for index to be ready
- Check Pinecone dashboard for index status

### Vertex AI Authentication
If you get authentication errors:
- Verify service account has necessary permissions
- Check GOOGLE_APPLICATION_CREDENTIALS path
- Ensure billing is enabled on GCP project

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
