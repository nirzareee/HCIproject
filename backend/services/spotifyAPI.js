const axios = require('axios');

class SpotifyAPI {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get access token (server-to-server)
  async getAccessToken() {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString('base64');

    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      this.accessToken = response.data.access_token;
      // Set expiry to 1 minute before actual expiry
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  // Search tracks by keywords
  async searchByKeywords(query) {
    if (!query || query.trim() === '') {
      throw new Error('Search query cannot be empty');
    }

    await this.getAccessToken();

    try {
      const response = await axios.get(
        'https://api.spotify.com/v1/search',
        {
          headers: { 'Authorization': `Bearer ${this.accessToken}` },
          params: {
            q: query,
            type: 'track',
            limit: 10
          }
        }
      );
      return this.formatResults(response.data.tracks.items);
    } catch (error) {
      console.error('Error searching tracks:', error.response?.data || error.message);
      throw new Error('Failed to search tracks on Spotify');
    }
  }

  // LLM-Enhanced search for popular and relevant tracks
  async searchWithLLMEnhancement(query, llmEnhancedData) {
    if (!query || query.trim() === '') {
      throw new Error('Search query cannot be empty');
    }

    await this.getAccessToken();

    try {
      const searchQuery = llmEnhancedData.enhancedQuery || query;
      const popularArtists = llmEnhancedData.popularArtists || [];

      console.log('Original query:', query);
      console.log('LLM enhanced query:', searchQuery);
      console.log('Target artists:', popularArtists.join(', '));

      // Strategy: Search for tracks by the specific artists LLM suggested
      const allTracks = [];

      // First: Get tracks FROM the specific artists LLM suggested (most important!)
      if (popularArtists && popularArtists.length > 0) {
        for (const artist of popularArtists.slice(0, 3)) { // Top 3 artists
          try {
            const artistQuery = `artist:"${artist}" ${query}`;
            const response = await axios.get(
              'https://api.spotify.com/v1/search',
              {
                headers: { 'Authorization': `Bearer ${this.accessToken}` },
                params: {
                  q: artistQuery,
                  type: 'track',
                  limit: 10,
                  market: 'US'
                }
              }
            );

            const tracks = response.data.tracks.items.map(track => ({
              ...this.formatResults([track])[0],
              popularity: track.popularity || 0
            }));

            allTracks.push(...tracks);
            console.log(`Found ${tracks.length} tracks from ${artist}`);
          } catch (err) {
            console.log(`Could not fetch tracks from ${artist}`);
          }
        }
      }

      // Second: Add general search results as backup
      const generalResponse = await axios.get(
        'https://api.spotify.com/v1/search',
        {
          headers: { 'Authorization': `Bearer ${this.accessToken}` },
          params: {
            q: searchQuery,
            type: 'track',
            limit: 20,
            market: 'US'
          }
        }
      );

      const generalTracks = generalResponse.data.tracks.items.map(track => ({
        ...this.formatResults([track])[0],
        popularity: track.popularity || 0
      }));

      allTracks.push(...generalTracks);

      // Remove duplicates and sort by popularity
      const uniqueTracks = [];
      const seenIds = new Set();

      for (const track of allTracks) {
        if (!seenIds.has(track.id)) {
          seenIds.add(track.id);
          uniqueTracks.push(track);
        }
      }

      const sorted = uniqueTracks.sort((a, b) => b.popularity - a.popularity);

      console.log(`Total unique tracks: ${sorted.length}, returning top 30`);

      return sorted.slice(0, 30);
    } catch (error) {
      console.error('Error in LLM-enhanced search:', error.response?.data || error.message);
      return this.searchByKeywords(query);
    }
  }

  // Search by audio features (for sliders)
  async searchByAudioFeatures(features) {
    await this.getAccessToken();

    // Validate features
    const { energy, valence, danceability, tempo } = features;

    if (energy < 0 || energy > 1 || valence < 0 || valence > 1 ||
        danceability < 0 || danceability > 1) {
      throw new Error('Audio features must be between 0 and 1');
    }

    if (tempo < 60 || tempo > 200) {
      throw new Error('Tempo must be between 60 and 200 BPM');
    }

    try {
      // Build a search query based on audio features
      const queryParts = [];

      // Map valence to mood keywords
      if (valence < 0.3) {
        queryParts.push('sad OR melancholy OR dark');
      } else if (valence > 0.7) {
        queryParts.push('happy OR upbeat OR cheerful');
      } else {
        queryParts.push('chill OR mellow OR relaxed');
      }

      // Map energy to energy keywords
      if (energy < 0.3) {
        queryParts.push('calm OR peaceful OR ambient');
      } else if (energy > 0.7) {
        queryParts.push('energetic OR intense OR powerful');
      }

      // Map danceability
      if (danceability > 0.6) {
        queryParts.push('dance OR pop OR electronic');
      }

      // Map tempo
      if (tempo < 90) {
        queryParts.push('slow OR ballad');
      } else if (tempo > 140) {
        queryParts.push('fast OR uptempo');
      }

      // Combine query parts
      const query = queryParts.join(' ');

      console.log('Search query constructed:', query);

      // Search for tracks matching the query
      const response = await axios.get(
        'https://api.spotify.com/v1/search',
        {
          headers: { 'Authorization': `Bearer ${this.accessToken}` },
          params: {
            q: query,
            type: 'track',
            limit: 20
          }
        }
      );

      // Return top 10 results
      const tracks = response.data.tracks.items.slice(0, 10);
      return this.formatResults(tracks);
    } catch (error) {
      console.error('Error searching by audio features:', error.response?.data || error.message);
      throw new Error('Failed to search tracks on Spotify');
    }
  }

  // Format results consistently
  formatResults(tracks) {
    if (!tracks || tracks.length === 0) {
      return [];
    }

    return tracks.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name || 'Unknown Artist',
      album: track.album?.name || 'Unknown Album',
      previewUrl: track.preview_url,
      imageUrl: track.album?.images[0]?.url || null,
      spotifyUrl: track.external_urls?.spotify
    }));
  }
}

module.exports = new SpotifyAPI();
