const Groq = require('groq-sdk');

class LLMMusicEnhancer {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  /**
   * Use LLM to enhance user query with popular artists/tracks context
   * @param {string} userQuery - Original user query
   * @returns {object} Enhanced search parameters
   */
  async enhanceQuery(userQuery) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });

    const prompt = `You are a music discovery expert with deep knowledge of current music trends. Today is ${currentMonth} ${currentYear}.

User's request: "${userQuery}"

CRITICAL RULES:
1. MATCH THE MOOD/GENRE the user requested - if they say "sad", give SAD artists. If they say "party", give PARTY artists.
2. Focus on POPULAR, CHART-TOPPING artists from 2024-2025
3. Include 3-4 trending artists that EXACTLY match the requested mood/genre
4. Add descriptive keywords that reinforce the user's intent
5. If user mentions a specific artist, INCLUDE that artist in the query

Example transformations:
- "sad songs" → "sad emotional heartbreak Billie Eilish Olivia Rodrigo Adele ballad 2024"
- "party music" → "party dance club Calvin Harris David Guetta Dua Lipa EDM 2024"
- "workout music" → "workout gym motivation Drake Travis Scott hip hop 2024"
- "happy songs" → "happy upbeat cheerful Pharrell Williams Taylor Swift pop 2024"

Return JSON:
{
  "enhancedQuery": "optimized search with RELEVANT artist names and mood keywords",
  "popularArtists": ["artist1", "artist2", "artist3"],
  "trendingKeywords": ["keyword1", "keyword2", "keyword3"],
  "genreContext": "specific genre that matches user's request",
  "eraPreference": "current",
  "reasoning": "why these artists match the user's mood/genre request"
}

Example:
Input: "workout music"
Output: {
  "enhancedQuery": "workout gym motivation Drake Travis Scott hip hop 2024",
  "popularArtists": ["Drake", "Travis Scott", "Future"],
  "trendingKeywords": ["gym", "motivation", "beast mode"],
  "genreContext": "hip-hop/rap",
  "eraPreference": "current",
  "reasoning": "Hip-hop dominates workout playlists in 2024, these artists are chart-toppers"
}`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a music industry expert with knowledge of current trends, popular artists, and chart performance. Always prioritize mainstream, popular, and currently relevant music.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      console.log('LLM Enhanced Query:', result);
      return result;
    } catch (error) {
      console.error('LLM enhancement error:', error);
      // Fallback to original query
      return {
        enhancedQuery: userQuery,
        popularArtists: [],
        trendingKeywords: [],
        genreContext: 'general',
        eraPreference: 'current',
        reasoning: 'Fallback to original query'
      };
    }
  }

  /**
   * Use LLM to get currently trending artists/tracks for a genre/mood
   * @param {string} mood - Mood or genre
   * @returns {array} List of trending artist names
   */
  async getTrendingArtists(mood) {
    const currentYear = new Date().getFullYear();

    const prompt = `What are the TOP 10 most popular and mainstream artists for "${mood}" music in ${currentYear}?

Requirements:
- Must be currently active and popular
- Focus on chart-toppers and streaming leaders
- Include both established stars and rising artists
- Prioritize artists that dominate playlists

Return JSON array of artist names only:
["Artist 1", "Artist 2", ...]`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a music chart analyst with real-time knowledge of popular artists and streaming trends.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      return result.artists || [];
    } catch (error) {
      console.error('Error getting trending artists:', error);
      return [];
    }
  }

  /**
   * Rank and filter Spotify results by relevance and popularity
   * @param {array} tracks - Spotify search results
   * @param {string} originalQuery - User's original query
   * @param {object} enhancedData - LLM enhancement data
   * @returns {array} Reranked tracks
   */
  async rerankByRelevance(tracks, originalQuery, enhancedData) {
    if (!tracks || tracks.length === 0) return [];

    // Create a prompt with track information
    const trackList = tracks.map((track, idx) =>
      `${idx + 1}. "${track.name}" by ${track.artist}`
    ).join('\n');

    const prompt = `User searched for: "${originalQuery}"
Context: ${enhancedData.reasoning}

Here are ${tracks.length} tracks from Spotify:
${trackList}

Task: Rank these tracks by:
1. Popularity (mainstream appeal, chart performance)
2. Relevance to user's query
3. Current cultural relevance (2024-2025)

Return JSON array of track numbers in order from MOST to LEAST relevant:
{"rankedIndexes": [3, 1, 7, 2, ...]}`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a music recommendation expert. Prioritize popular, mainstream, and culturally relevant tracks.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile', // Use same model for consistency
        temperature: 0.2,
        max_tokens: 500, // Increased for JSON generation
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      const rankedIndexes = result.rankedIndexes || [];

      // Reorder tracks based on LLM ranking
      const rerankedTracks = rankedIndexes
        .filter(idx => idx >= 1 && idx <= tracks.length)
        .map(idx => tracks[idx - 1]);

      // Add any tracks that weren't ranked (append to end)
      const rankedSet = new Set(rankedIndexes.map(i => i - 1));
      const unrankedTracks = tracks.filter((_, idx) => !rankedSet.has(idx));

      return [...rerankedTracks, ...unrankedTracks];
    } catch (error) {
      console.error('Error reranking tracks:', error);
      return tracks; // Return original order on error
    }
  }

  /**
   * Build smart Spotify search query with popularity filters
   * @param {object} enhancedData - LLM enhancement data
   * @returns {string} Optimized Spotify query
   */
  buildSpotifyQuery(enhancedData) {
    const { enhancedQuery, popularArtists, trendingKeywords } = enhancedData;

    // Combine enhanced query with artist names for better results
    const queryParts = [enhancedQuery];

    // Add popular artists to boost relevance
    if (popularArtists && popularArtists.length > 0) {
      // Include top 2-3 artists in query
      queryParts.push(`artist:(${popularArtists.slice(0, 3).join(' OR ')})`);
    }

    return queryParts.join(' ');
  }
}

module.exports = new LLMMusicEnhancer();
