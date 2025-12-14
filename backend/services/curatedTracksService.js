const curatedData = require('../data/curatedTracks.json');
const axios = require('axios');

class CuratedTracksService {
  constructor() {
    this.curatedData = curatedData;
    this.spotifyAPI = null;
  }

  setSpotifyAPI(spotifyAPI) {
    this.spotifyAPI = spotifyAPI;
  }

  /**
   * Check if we have curated tracks for the requested artist
   */
  hasArtist(artistName) {
    return this.curatedData.artists.hasOwnProperty(artistName);
  }

  /**
   * Get curated tracks for a specific artist and mood
   */
  getCuratedTracks(artistName, mood = 'all') {
    if (!this.hasArtist(artistName)) {
      return [];
    }

    const artist = this.curatedData.artists[artistName];

    // Try to match mood, fallback to 'all' if mood not found
    let tracks = artist[mood] || artist['all'] || [];

    // If mood specific tracks are few, add some from 'all'
    if (tracks.length < 5 && artist['all']) {
      tracks = [...tracks, ...artist['all']].slice(0, 10);
    }

    return tracks;
  }

  /**
   * Get tracks for a specific mood (generic, not artist-specific)
   */
  getMoodTracks(mood) {
    return this.curatedData.moods[mood] || [];
  }

  /**
   * Fetch full track details from Spotify using track IDs
   */
  async fetchSpotifyTracks(trackIds, accessToken) {
    if (!trackIds || trackIds.length === 0) {
      return [];
    }

    try {
      // Spotify allows up to 50 tracks per request
      const ids = trackIds.slice(0, 50).join(',');

      const response = await axios.get(
        `https://api.spotify.com/v1/tracks`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          params: { ids }
        }
      );

      return response.data.tracks
        .filter(track => track !== null) // Filter out null tracks
        .map(track => ({
          id: track.id,
          name: track.name,
          artist: track.artists[0]?.name || 'Unknown Artist',
          album: track.album?.name || 'Unknown Album',
          previewUrl: track.preview_url,
          imageUrl: track.album?.images[0]?.url || null,
          spotifyUrl: track.external_urls?.spotify,
          popularity: track.popularity || 0
        }));
    } catch (error) {
      console.error('Error fetching curated tracks from Spotify:', error.message);
      return [];
    }
  }

  /**
   * Detect mood from query text
   */
  detectMood(text) {
    const lowerText = text.toLowerCase();

    const moodKeywords = {
      'happy': ['happy', 'upbeat', 'cheerful', 'joyful', 'positive', 'fun'],
      'sad': ['sad', 'emotional', 'cry', 'heartbreak', 'melancholy', 'depressing'],
      'workout': ['workout', 'gym', 'exercise', 'fitness', 'training', 'running'],
      'party': ['party', 'dance', 'club', 'edm', 'rave'],
      'chill': ['chill', 'relax', 'calm', 'peaceful'],
      'romantic': ['romantic', 'love', 'romance', 'date']
    };

    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return mood;
      }
    }

    return 'all';
  }

  /**
   * Main function: Get curated tracks for a query
   * Returns curated tracks if artist is recognized, otherwise returns empty array
   */
  async getCuratedResults(query, popularArtists, accessToken) {
    if (!popularArtists || popularArtists.length === 0) {
      return [];
    }

    console.log('\n🎵 Checking curated track database...');

    const mood = this.detectMood(query);
    console.log(`Detected mood: ${mood}`);

    const curatedTracks = [];
    const trackIds = [];

    // Check each artist suggested by LLM
    for (const artistName of popularArtists) {
      if (this.hasArtist(artistName)) {
        console.log(`✅ Found curated tracks for ${artistName}`);

        const artistTracks = this.getCuratedTracks(artistName, mood);
        trackIds.push(...artistTracks.map(t => t.id));

        console.log(`  → Adding ${artistTracks.length} ${mood} tracks from ${artistName}`);
      } else {
        console.log(`❌ No curated tracks for ${artistName}`);
      }
    }

    // If we found curated tracks, fetch them from Spotify
    if (trackIds.length > 0) {
      console.log(`\n📀 Fetching ${trackIds.length} curated tracks from Spotify...`);
      const tracks = await this.fetchSpotifyTracks(trackIds, accessToken);
      console.log(`✅ Retrieved ${tracks.length} curated tracks\n`);
      return tracks;
    }

    // No curated tracks found for these artists
    console.log('No curated tracks available, will use regular search\n');
    return [];
  }

  /**
   * Get list of all available artists
   */
  getAvailableArtists() {
    return Object.keys(this.curatedData.artists);
  }
}

module.exports = new CuratedTracksService();
