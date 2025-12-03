# Frontend - Floating Chat Widget

Frontend implementation for the EDUCORE Contextual Assistant floating chat widget.

## Structure

```
FRONTEND/
├── src/
│   ├── components/      # React components
│   │   ├── common/      # Reusable components (Button, Input, Modal, etc.)
│   │   └── chat/        # Chat-specific components (FloatingChatWidget, MessageList, etc.)
│   ├── store/           # Redux store and slices
│   ├── services/        # API services and Supabase client
│   ├── hooks/           # Custom React hooks (useChat, useAuth, useRealtime)
│   ├── utils/           # Utility functions (answerFormatter, constants)
│   ├── theme/           # Material-UI theme configuration
│   └── App.jsx          # Main application component
├── public/              # Static assets
└── tests/               # Test files
```

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run all tests
- `npm run test:unit` - Run unit tests only
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Lint code
- `npm run format` - Format code

## Embedding the Widget

The widget can be embedded in any HTML page. See `public/embedding-snippet.html` for an example.











