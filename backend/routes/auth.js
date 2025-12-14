const express = require('express');
const router = express.Router();
const axios = require('axios');

// Generate Spotify authorization URL
router.get('/login', (req, res) => {
  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-library-read'
  ].join(' ');

  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    scope: scopes,
    show_dialog: false
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  res.json({ authUrl });
});

// Handle OAuth callback and exchange code for token
router.post('/callback', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'Authorization code is required'
    });
  }

  try {
    const credentials = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        code: code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        grant_type: 'authorization_code'
      }),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json({
      success: true,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in
    });
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to exchange authorization code'
    });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Refresh token is required'
    });
  }

  try {
    const credentials = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json({
      success: true,
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    });
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});

module.exports = router;
