import express from 'express';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- GitHub OAuth Routes ---

  // 1. Get Authorization URL
  app.get('/api/auth/github/url', (req, res) => {
    const { redirect_uri } = req.query;
    if (!redirect_uri) {
      res.status(400).json({ error: 'Missing redirect_uri' });
      return;
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      res.status(500).json({ error: 'GITHUB_CLIENT_ID not configured' });
      return;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirect_uri as string,
      scope: 'repo user', // Request repo and user scopes
      allow_signup: 'true',
    });

    const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
    res.json({ url });
  });

  // 2. Callback Handler (Exchange Code for Token)
  app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
      res.send('Error: No code provided');
      return;
    }

    try {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('GitHub credentials not configured on server');
      }

      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      const { access_token, error } = response.data;

      if (error) {
        throw new Error(error);
      }

      // Return HTML that posts the token to the opener
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GITHUB_AUTH_SUCCESS', 
                  token: '${access_token}' 
                }, '*');
                window.close();
              } else {
                document.body.innerHTML = 'Authentication successful. You can close this window.';
              }
            </script>
            <p>Authentication successful. Closing...</p>
          </body>
        </html>
      `);

    } catch (error: any) {
      console.error('OAuth Error:', error.message);
      res.status(500).send(`Authentication failed: ${error.message}`);
    }
  });

  // --- Vite Middleware (Must be last) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
