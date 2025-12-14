class PlaylistCurator {

  // Generate playlist name based on query type and parameters
  generatePlaylistName(condition, queryInput, detectedMoods = []) {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (condition === 'voice' && detectedMoods.length > 0) {
      const moodStr = detectedMoods.slice(0, 2).join(' & ');
      return `${this.capitalize(moodStr)} Mix - ${timestamp}`;
    }

    if (condition === 'sliders') {
      try {
        const params = typeof queryInput === 'string' ? JSON.parse(queryInput) : queryInput;
        return this.getSliderPlaylistName(params, timestamp);
      } catch (e) {
        return `Custom Mix - ${timestamp}`;
      }
    }

    if (condition === 'text') {
      return `${queryInput} - ${timestamp}`;
    }

    return `Curated Mix - ${timestamp}`;
  }

  // Generate playlist name from slider values
  getSliderPlaylistName(params, timestamp) {
    const { energy, valence, danceability, tempo } = params;

    // Determine vibe based on parameters
    if (energy > 0.7 && danceability > 0.7) {
      return `High Energy Dance Mix - ${timestamp}`;
    }
    if (energy < 0.3 && valence > 0.6) {
      return `Chill Happy Vibes - ${timestamp}`;
    }
    if (valence < 0.3) {
      return `Melancholic Mood - ${timestamp}`;
    }
    if (energy > 0.7 && tempo > 140) {
      return `Workout Power Mix - ${timestamp}`;
    }
    if (energy < 0.4 && tempo < 90) {
      return `Calm & Relaxing - ${timestamp}`;
    }
    if (danceability > 0.7) {
      return `Dance Party Mix - ${timestamp}`;
    }

    return `Custom Blend - ${timestamp}`;
  }

  // Generate playlist description
  generateDescription(condition, queryInput, trackCount, detectedMoods = []) {
    if (condition === 'voice' && detectedMoods.length > 0) {
      return `A ${trackCount}-track playlist curated for ${detectedMoods.join(', ')} vibes based on your voice request.`;
    }

    if (condition === 'sliders') {
      try {
        const params = typeof queryInput === 'string' ? JSON.parse(queryInput) : queryInput;
        return `Custom playlist with ${trackCount} tracks. Energy: ${params.energy.toFixed(2)}, Valence: ${params.valence.toFixed(2)}, Danceability: ${params.danceability.toFixed(2)}, Tempo: ${Math.round(params.tempo)} BPM.`;
      } catch (e) {
        return `Custom curated playlist with ${trackCount} tracks.`;
      }
    }

    if (condition === 'text') {
      return `${trackCount} tracks matching "${queryInput}"`;
    }

    return `Curated playlist with ${trackCount} tracks.`;
  }

  // Curate playlist from tracks (can add intelligent sorting/filtering here)
  curatePlaylist(tracks, condition, queryInput) {
    // For now, return tracks as is
    // In future, you can add:
    // - Intelligent ordering based on energy flow
    // - Remove duplicates
    // - Balance fast/slow songs
    // - Group by similar artists/genres

    let curatedTracks = [...tracks];

    // Optional: Sort by popularity or audio features
    if (condition === 'sliders') {
      // Keep as is - already optimized by Spotify recommendations
      return curatedTracks;
    }

    // Optional: Limit playlist length
    if (curatedTracks.length > 30) {
      curatedTracks = curatedTracks.slice(0, 30);
    }

    return curatedTracks;
  }

  // Create playlist object
  createPlaylistObject(tracks, condition, queryInput, participantId = null, detectedMoods = []) {
    const curatedTracks = this.curatePlaylist(tracks, condition, queryInput);
    const playlistName = this.generatePlaylistName(condition, queryInput, detectedMoods);
    const description = this.generateDescription(condition, queryInput, curatedTracks.length, detectedMoods);

    return {
      playlistName,
      description,
      participantId,
      condition,
      queryInput: typeof queryInput === 'object' ? JSON.stringify(queryInput) : queryInput,
      tracks: curatedTracks,
      trackCount: curatedTracks.length,
      createdAt: new Date().toISOString()
    };
  }

  // Helper function
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = new PlaylistCurator();
