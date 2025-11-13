# EDUCORE Bot Embedding Guide

This guide explains how to embed the EDUCORE chatbot widget into microservices (Assessment, DevLab, etc.).

## Architecture Overview

The chatbot is **NOT** globally mounted across the platform. Instead, each microservice must embed the chatbot manually using a simple SCRIPT tag.

## Prerequisites

- The chatbot must only be visible after login
- Public pages (login, register, forgot password) must NOT load the bot
- Each microservice controls when and where the bot appears

## Embedding Steps

### 1. Add Container Element

Add a container div in your page where you want the bot to appear:

```html
<div id="edu-bot-container"></div>
```

You can use any ID or CSS selector. The default is `#edu-bot-container`.

### 2. Load the Bot Script

Load the bot runtime script from the RAG microservice:

```html
<script src="https://your-rag-service.com/embed/bot.js"></script>
```

**Important:** Replace `https://your-rag-service.com` with your actual RAG microservice URL.

### 3. Initialize the Bot

Initialize the bot with microservice-specific settings:

```html
<script>
  window.initializeEducoreBot({
    microservice: "ASSESSMENT",   // or "DEVLAB"
    userId: CURRENT_USER_ID,       // authenticated user id
    token: AUTH_TOKEN,             // JWT or session token
    container: "#edu-bot-container" // optional, defaults to "#edu-bot-container"
  });
</script>
```

## Configuration Options

### `microservice` (required)
- **Type:** `string`
- **Values:** `"ASSESSMENT"` or `"DEVLAB"`
- **Description:** Determines which microservice the bot will connect to. This automatically puts the bot in Support Mode for that microservice.

### `userId` (required)
- **Type:** `string`
- **Description:** The authenticated user's ID. Must be provided after login.

### `token` (required)
- **Type:** `string`
- **Description:** JWT or session token for authentication. Used for API calls to the microservice.

### `container` (optional)
- **Type:** `string`
- **Default:** `"#edu-bot-container"`
- **Description:** CSS selector for the container element where the bot will be mounted.

## Support Mode Behavior

When a microservice loads the bot with a specific `microservice` value, the bot **automatically enters SUPPORT MODE** for that microservice.

### Assessment Support Mode
- `microservice: "ASSESSMENT"` → Assessment Support Mode
- Bot acts as proxy to Assessment microservice
- General Chat Mode is **DISABLED**
- Bot only forwards messages to Assessment API and returns responses verbatim

### DevLab Support Mode
- `microservice: "DEVLAB"` → DevLab Support Mode
- Bot acts as proxy to DevLab microservice
- General Chat Mode is **DISABLED**
- Bot only forwards messages to DevLab API and returns responses verbatim

### Support Mode Rules
- The bot does NOT solve issues itself
- The bot does NOT generate explanations or suggestions on its own
- The bot ONLY:
  1. Collects the user's question or problem
  2. Forwards it to the relevant microservice (Assessment or DevLab)
  3. Waits for the microservice's response
  4. Returns that response to the user exactly as received

## Example: Assessment Microservice

```html
<!DOCTYPE html>
<html>
<head>
  <title>Assessment Dashboard</title>
</head>
<body>
  <h1>Assessment Dashboard</h1>
  
  <!-- Bot Container -->
  <div id="edu-bot-container"></div>
  
  <!-- Load Bot Script -->
  <script src="https://rag-service.educore.com/embed/bot.js"></script>
  
  <!-- Initialize Bot -->
  <script>
    // Only initialize if user is logged in
    if (window.currentUser && window.currentUser.id && window.currentUser.token) {
      window.initializeEducoreBot({
        microservice: "ASSESSMENT",
        userId: window.currentUser.id,
        token: window.currentUser.token,
        container: "#edu-bot-container"
      });
    }
  </script>
</body>
</html>
```

## Example: DevLab Microservice

```html
<!DOCTYPE html>
<html>
<head>
  <title>DevLab Dashboard</title>
</head>
<body>
  <h1>DevLab Dashboard</h1>
  
  <!-- Bot Container -->
  <div id="edu-bot-container"></div>
  
  <!-- Load Bot Script -->
  <script src="https://rag-service.educore.com/embed/bot.js"></script>
  
  <!-- Initialize Bot -->
  <script>
    // Only initialize if user is logged in
    if (window.currentUser && window.currentUser.id && window.currentUser.token) {
      window.initializeEducoreBot({
        microservice: "DEVLAB",
        userId: window.currentUser.id,
        token: window.currentUser.token,
        container: "#edu-bot-container"
      });
    }
  </script>
</body>
</html>
```

## React Example

If you're using React, you can initialize the bot in a `useEffect`:

```jsx
import { useEffect } from 'react';

function AssessmentDashboard() {
  useEffect(() => {
    // Load bot script
    const script = document.createElement('script');
    script.src = 'https://rag-service.educore.com/embed/bot.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      // Initialize bot after script loads
      if (window.initializeEducoreBot && currentUser?.id && currentUser?.token) {
        window.initializeEducoreBot({
          microservice: "ASSESSMENT",
          userId: currentUser.id,
          token: currentUser.token,
          container: "#edu-bot-container"
        });
      }
    };

    return () => {
      // Cleanup: destroy bot when component unmounts
      if (window.destroyEducoreBot) {
        window.destroyEducoreBot();
      }
    };
  }, [currentUser]);

  return (
    <div>
      <h1>Assessment Dashboard</h1>
      <div id="edu-bot-container"></div>
    </div>
  );
}
```

## API Reference

### `window.initializeEducoreBot(config)`

Initializes the bot widget with the provided configuration.

**Parameters:**
- `config` (Object): Configuration object with `microservice`, `userId`, `token`, and optional `container`

**Returns:** `undefined`

**Throws:** Console errors if required parameters are missing or invalid

### `window.destroyEducoreBot()`

Destroys the bot instance and cleans up resources.

**Returns:** `undefined`

### `window.getEducoreBotConfig()`

Gets the current bot configuration.

**Returns:** `Object | null` - Current configuration object or `null` if not initialized

## Events

The bot dispatches custom events that you can listen to:

```javascript
// Listen for bot initialization
document.addEventListener('educore-bot-initialized', (event) => {
  console.log('Bot initialized:', event.detail);
  // event.detail contains: { botId, microservice, supportMode, userId }
});
```

## Security Considerations

1. **Authentication Required:** The bot requires a valid `userId` and `token`. Only initialize after user login.
2. **Token Storage:** The bot stores the token in `localStorage` for API calls. Ensure your token has appropriate expiration.
3. **CORS:** Ensure your RAG microservice allows CORS requests from your microservice domain.
4. **HTTPS:** Always use HTTPS in production to protect tokens and user data.

## Troubleshooting

### Bot doesn't appear
- Check browser console for errors
- Verify container element exists in DOM
- Ensure script loaded successfully
- Verify `userId` and `token` are provided

### Bot shows "Failed to load chatbot"
- Check network tab for failed requests to `bot-bundle.js`
- Verify RAG microservice URL is correct
- Check CORS settings on RAG microservice

### Bot not in Support Mode
- Verify `microservice` parameter is exactly `"ASSESSMENT"` or `"DEVLAB"` (case-sensitive)
- Check browser console for initialization errors

## Build and Deployment

The bot is built as a standalone bundle:

1. Build the frontend: `npm run build`
2. The `bot.js` script is available at: `dist/embed/bot.js`
3. The React bundle is available at: `dist/embed/bot-bundle.js`
4. Serve both files from your RAG microservice at `/embed/` path

## Support

For issues or questions, contact the RAG microservice team.

