# Multi-modal RAG Chatbot - Frontend

Next.js frontend for the multi-modal RAG chatbot with voice input, PDF document chat, and citation display.

## Features

- 🎤 **Voice Input**: Real-time speech-to-text with Deepgram Nova-2
- 📄 **PDF Upload**: Drag-and-drop PDF document upload
- 💬 **Chat Interface**: Interactive chat with document Q&A
- 🔍 **Citations**: Display PDF page citations with highlighted sections
- 🌐 **Hybrid Search**: Combines document search with web results
- 🎨 **Modern UI**: Built with Tailwind CSS and shadcn/ui

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **Voice**: Deepgram SDK for browser
- **State Management**: Zustand
- **HTTP Client**: Axios
- **File Upload**: react-dropzone
- **PDF Display**: react-pdf

## Prerequisites

- Node.js 18+
- npm or yarn
- Backend server running (see backend README)
- Deepgram API key

## Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Backend URL
BACKEND_URL=http://localhost:8000

# Deepgram API Key
NEXT_PUBLIC_DEEPGRAM_API_KEY=your-deepgram-api-key

# API URL (if different from backend)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. **Get Deepgram API Key**:
   - Sign up at [Deepgram](https://deepgram.com)
   - Create a new API key
   - Add it to `.env.local`

## Running the Application

1. **Development mode**:
```bash
npm run dev
```

2. **Access the app**:
   - Open http://localhost:3000

3. **Production build**:
```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Main page
│   ├── globals.css          # Global styles
│   └── api/                 # API routes (proxy to backend)
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── ChatInterface.tsx    # Main chat component
│   ├── VoiceInput.tsx       # Voice recording component
│   ├── DocumentUploader.tsx # PDF upload component
│   ├── MessageBubble.tsx    # Chat message display
│   └── CitationCard.tsx     # Citation display
├── hooks/
│   ├── useDeepgram.ts       # Deepgram voice hook
│   ├── useChat.ts           # Chat state management
│   └── useDocuments.ts      # Document state management
├── lib/
│   ├── api.ts               # API client
│   ├── utils.ts             # Utility functions
│   └── constants.ts         # App constants
└── types/
    └── index.ts             # TypeScript types
```

## Usage

### 1. Upload a PDF Document
- Click or drag-and-drop a PDF file into the upload area
- Wait for processing to complete
- The document will appear in the sidebar

### 2. Ask Questions
**Text Input**:
- Type your question in the text area
- Press Enter or click Send

**Voice Input**:
- Click the microphone button
- Speak your question
- Click again to stop recording
- The transcript will appear in the input field

### 3. View Results
- Answers appear in the chat interface
- Citations show relevant PDF pages
- Click to expand citations and view highlighted sections
- Web sources are shown with links

## Components

### ChatInterface
Main chat component with message display and input handling.

### VoiceInput
Voice recording component using Deepgram for real-time transcription.

### DocumentUploader
PDF upload with drag-and-drop, progress tracking, and validation.

### MessageBubble
Chat message display with support for citations and sources.

### CitationCard
Citation display with page numbers, relevance scores, and expandable page images.

## State Management

### Chat Store (useChat)
- Messages history
- Current document
- Loading state
- Error handling

### Documents Store (useDocuments)
- Uploaded documents list
- Persistent storage (localStorage)

## API Integration

### Endpoints
- `POST /api/documents/upload` - Upload PDF
- `POST /api/chat/query` - Send chat query
- `GET /api/citations/{id}` - Get citation image

All API routes proxy to the backend server.

## Styling

The app uses Tailwind CSS with a custom design system:

- **Colors**: Gray-based with primary accents
- **Typography**: System font stack
- **Components**: shadcn/ui for consistent design
- **Responsive**: Mobile-first approach

## Browser Support

- Chrome/Edge (recommended for voice input)
- Firefox
- Safari (voice input may have limitations)

## Troubleshooting

### Voice Input Not Working
- Check microphone permissions in browser
- Verify Deepgram API key is correct
- Try a different browser (Chrome recommended)
- Check browser console for errors

### PDF Upload Fails
- Verify file is a valid PDF
- Check file size (max 50MB)
- Ensure backend is running
- Check network tab for error details

### Citations Not Showing
- Verify backend is processing PDFs correctly
- Check that page numbers are being extracted
- Ensure citation generation is working in backend

### API Connection Issues
- Verify `BACKEND_URL` in `.env.local`
- Check backend is running and accessible
- Look for CORS errors in console

## Development

### Adding New Components
```bash
# Add shadcn/ui component
npx shadcn-ui@latest add [component-name]
```

### Code Style
```bash
npm run lint
```

### Type Checking
TypeScript is configured for strict type checking. Run:
```bash
npm run build
```

## Performance

- Code splitting with Next.js App Router
- Lazy loading for PDF components
- Optimized re-renders with React hooks
- Efficient state management with Zustand

## Security

- API keys in environment variables only
- No sensitive data in client code
- CORS configured for specific origins
- Input validation on all forms

## License

MIT

## Support

For issues and questions, please create an issue in the repository.

# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
