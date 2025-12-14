class TrackDeduplicator {
  /**
   * Remove duplicate tracks and covers, keeping only the most popular/original version
   * @param {array} tracks - Array of track objects
   * @returns {array} Deduplicated tracks
   */
  deduplicateTracks(tracks) {
    if (!tracks || tracks.length === 0) return [];

    const trackMap = new Map();
    const artistSet = new Set();
    const deduplicatedTracks = [];

    for (const track of tracks) {
      // Normalize track name (lowercase, remove parentheses, featured artists, etc.)
      const normalizedName = this.normalizeTrackName(track.name);

      // Check if this track name already exists
      const existingTrack = trackMap.get(normalizedName);

      if (!existingTrack) {
        // New unique track - add it
        trackMap.set(normalizedName, track);
      } else {
        // Duplicate found - keep the one with higher popularity
        if (track.popularity > existingTrack.popularity) {
          trackMap.set(normalizedName, track);
        }
      }
    }

    // Convert map to array and ensure artist diversity
    for (const [_, track] of trackMap) {
      // Limit to 2 tracks per artist for diversity
      const artistKey = track.artist.toLowerCase();
      const artistCount = Array.from(deduplicatedTracks).filter(
        t => t.artist.toLowerCase() === artistKey
      ).length;

      if (artistCount < 2) {
        deduplicatedTracks.push(track);
      }
    }

    console.log(`Deduplication: ${tracks.length} tracks → ${deduplicatedTracks.length} unique tracks`);

    return deduplicatedTracks;
  }

  /**
   * Normalize track name for comparison
   * Removes common variations like (feat. X), [Remix], etc.
   */
  normalizeTrackName(name) {
    let normalized = name.toLowerCase();

    // Remove content in parentheses: (feat. X), (Remix), (Live), etc.
    normalized = normalized.replace(/\([^)]*\)/g, '');

    // Remove content in brackets: [Remix], [Radio Edit], etc.
    normalized = normalized.replace(/\[[^\]]*\]/g, '');

    // Remove featuring variations
    normalized = normalized.replace(/\s*-\s*feat\..*$/i, '');
    normalized = normalized.replace(/\s*feat\..*$/i, '');
    normalized = normalized.replace(/\s*featuring.*$/i, '');
    normalized = normalized.replace(/\s*ft\..*$/i, '');
    normalized = normalized.replace(/\s*with\s+.*$/i, '');

    // Remove common suffixes
    normalized = normalized.replace(/\s*-\s*(radio edit|album version|single version|original mix).*$/i, '');

    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Filter out likely cover versions based on artist popularity and track metadata
   */
  removeCoverVersions(tracks) {
    // Group tracks by normalized name
    const trackGroups = {};

    for (const track of tracks) {
      const normalizedName = this.normalizeTrackName(track.name);

      if (!trackGroups[normalizedName]) {
        trackGroups[normalizedName] = [];
      }

      trackGroups[normalizedName].push(track);
    }

    // For each group, keep only the most popular version (likely the original)
    const filtered = [];

    for (const groupName in trackGroups) {
      const group = trackGroups[groupName];

      if (group.length === 1) {
        // Only one version - keep it
        filtered.push(group[0]);
      } else {
        // Multiple versions - pick the most popular one
        const mostPopular = group.reduce((prev, current) =>
          (current.popularity > prev.popularity) ? current : prev
        );

        filtered.push(mostPopular);

        console.log(`Removed ${group.length - 1} cover(s) of "${groupName}"`);
      }
    }

    return filtered;
  }

  /**
   * Ensure artist diversity - limit tracks per artist
   */
  ensureArtistDiversity(tracks, maxPerArtist = 2) {
    const artistCounts = {};
    const diverse = [];

    for (const track of tracks) {
      const artistKey = track.artist.toLowerCase();
      const currentCount = artistCounts[artistKey] || 0;

      if (currentCount < maxPerArtist) {
        diverse.push(track);
        artistCounts[artistKey] = currentCount + 1;
      } else {
        console.log(`Skipped "${track.name}" - too many tracks from ${track.artist}`);
      }
    }

    return diverse;
  }

  /**
   * Filter out known cover/tribute artists
   */
  filterCoverArtists(tracks) {
    // List of known cover/tribute artists to exclude
    const coverArtistKeywords = [
      'kidz bop',
      'tribute',
      'karaoke',
      'cover',
      'remix',
      'instrumental',
      'piano version',
      'acoustic version',
      'workout music',
      'gym music',
      'fitness',
      'motivation music',
      'backing track',
      'originally performed',
      'style of'
    ];

    const filtered = tracks.filter(track => {
      const artistLower = track.artist.toLowerCase();
      const nameLower = track.name.toLowerCase();

      // Check if artist or track name contains cover keywords
      const isCoverArtist = coverArtistKeywords.some(keyword =>
        artistLower.includes(keyword) || nameLower.includes(keyword)
      );

      if (isCoverArtist) {
        console.log(`Filtered out cover: "${track.name}" by ${track.artist}`);
        return false;
      }

      return true;
    });

    return filtered;
  }

  /**
   * Main deduplication pipeline
   */
  processResults(tracks, options = {}) {
    const {
      maxPerArtist = 2,
      removeDuplicates = true,
      ensureDiversity = true,
      filterCovers = true
    } = options;

    console.log('\n=== Track Deduplication ===');
    console.log(`Input: ${tracks.length} tracks`);

    let processed = [...tracks];

    // Step 0: Filter out cover artists (FIRST!)
    if (filterCovers) {
      processed = this.filterCoverArtists(processed);
      console.log(`After cover artist filter: ${processed.length} tracks`);
    }

    // Step 1: Remove duplicate/cover versions
    if (removeDuplicates) {
      processed = this.removeCoverVersions(processed);
      console.log(`After deduplication: ${processed.length} tracks`);
    }

    // Step 2: Ensure artist diversity
    if (ensureDiversity) {
      processed = this.ensureArtistDiversity(processed, maxPerArtist);
      console.log(`After diversity filter: ${processed.length} tracks`);
    }

    console.log('=== End Deduplication ===\n');

    return processed;
  }
}

module.exports = new TrackDeduplicator();
