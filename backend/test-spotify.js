const axios = require('axios');
require('dotenv').config();

async function testSpotify() {
  console.log('Testing Spotify API...');

  // Get token
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  try {
    console.log('\n1. Getting access token...');
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    const accessToken = tokenResponse.data.access_token;
    console.log('✓ Token obtained');

    // Test search
    console.log('\n2. Testing search for seed tracks...');
    const searchResponse = await axios.get(
      'https://api.spotify.com/v1/search',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: {
          q: 'year:2020-2024',
          type: 'track',
          limit: 5
        }
      }
    );
    const seedTracks = searchResponse.data.tracks.items.map(t => t.id).slice(0, 5).join(',');
    console.log('✓ Found seed tracks:', seedTracks);

    // Test recommendations with genres
    console.log('\n3. Testing recommendations API with genres...');
    const recUrl = 'https://api.spotify.com/v1/recommendations';
    const params = {
      seed_genres: 'pop,rock',
      target_energy: 0.5,
      target_valence: 0.5,
      target_danceability: 0.5,
      target_tempo: 120,
      limit: 10
    };
    console.log('URL:', recUrl);
    console.log('Params:', params);

    const recResponse = await axios.get(recUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: params
    });

    console.log('✓ Recommendations received:', recResponse.data.tracks.length, 'tracks');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testSpotify();
