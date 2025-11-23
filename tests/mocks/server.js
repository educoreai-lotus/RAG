import express from 'express';
import { createServer } from 'http';

let server;

function buildMockApp() {
  const app = express();
  app.use(express.json());

  app.post('/mock-openai/v1/embeddings', (req, res) => {
    const { input = '' } = req.body ?? {};
    const embedding = Array.from({ length: 1536 }, (_, index) => (index % 2 === 0 ? 0.1 : 0.2));

    res.json({
      data: [
        {
          embedding,
          index: 0,
          input,
        },
      ],
      model: 'text-embedding-3-small',
      usage: {
        prompt_tokens: input.length,
        total_tokens: input.length,
      },
    });
  });

  app.post('/mock-openai/v1/chat/completions', (req, res) => {
    const { messages = [] } = req.body ?? {};
    const lastMessage = messages[messages.length - 1];

    res.json({
      id: 'mock-chat-completion',
      object: 'chat.completion',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `Mocked answer for: ${(lastMessage && lastMessage.content) || 'unknown query'}`,
          },
          finish_reason: 'stop',
        },
      ],
    });
  });

  const mockSuccessResponse = (serviceName) => (req, res) => {
    res.json({
      service: serviceName,
      status: 'ok',
      data: req.body ?? {},
    });
  };

  app.post('/mock-learner-ai/*', mockSuccessResponse('learner-ai'));
  app.post('/mock-skills-engine/*', mockSuccessResponse('skills-engine'));
  app.post('/mock-assessment/*', mockSuccessResponse('assessment'));
  app.post('/mock-devlab/*', mockSuccessResponse('devlab'));
  app.post('/mock-analytics/*', mockSuccessResponse('analytics'));
  app.post('/mock-content/*', mockSuccessResponse('content'));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'mock-server' });
  });

  return app;
}

async function startMockServer(port = 8080) {
  if (server) {
    return;
  }

  const app = buildMockApp();
  server = createServer(app);

  await new Promise((resolve) => {
    server.listen(port, () => resolve());
  });
}

async function stopMockServer() {
  if (!server) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

  server = null;
}

export { startMockServer, stopMockServer };

