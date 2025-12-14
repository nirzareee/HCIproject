const express = require('express');
const router = express.Router();
const spotifyAPI = require('../services/spotifyAPI');
const nlpProcessor = require('../services/nlpProcessor');
const playlistCurator = require('../services/playlistCurator');
const llmMusicEnhancer = require('../services/llmMusicEnhancer');
const trackDeduplicator = require('../services/trackDeduplicator');
const curatedTracksService = require('../services/curatedTracksService');

// Text search endpoint with LLM enhancement
router.post('/text', async (req, res) => {
  try {
    const { query, useLLM = true } = req.body; // LLM enabled by default

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    console.log('Original text search request:', query);
    console.log('LLM enhancement:', useLLM ? 'ENABLED' : 'DISABLED');

    let results;
    let llmData = null;

    if (useLLM && process.env.GROQ_API_KEY) {
      // Use LLM enhancement for popular, relevant results
      console.log('🤖 Using LLM to enhance query...');

      llmData = await llmMusicEnhancer.enhanceQuery(query);
      console.log('LLM Enhancement:', llmData);

      // FIRST: Try to get curated tracks from famous artists
      const accessToken = await spotifyAPI.getAccessToken();
      const curatedTracks = await curatedTracksService.getCuratedResults(
        query,
        llmData.popularArtists,
        accessToken
      );

      // Always search Spotify for fresh results
      console.log('Searching Spotify for diverse results...');
      const searchResults = await spotifyAPI.searchWithLLMEnhancement(query, llmData);

      // Mix curated tracks (max 3) with search results for variety
      if (curatedTracks.length > 0) {
        const limitedCurated = curatedTracks.slice(0, 3); // Only use top 3 curated tracks
        results = [...limitedCurated, ...searchResults];
        console.log(`✅ Mixed ${limitedCurated.length} curated + ${searchResults.length} searched tracks`);
      } else {
        results = searchResults;
        console.log('Using only searched tracks (no curated matches)');
      }

      // Rerank results for relevance
      if (results.length > 5) {
        console.log('🤖 Reranking text results by relevance...');
        results = await llmMusicEnhancer.rerankByRelevance(
          results.slice(0, 20),
          query,
          llmData
        );
      }
    } else {
      // Fallback: Use basic NLP keyword extraction
      console.log('Using basic NLP (no LLM)');
      const extractedKeywords = nlpProcessor.extractKeywords(query);
      const optimizedQuery = nlpProcessor.buildSearchQuery(extractedKeywords);
      results = await spotifyAPI.searchByKeywords(optimizedQuery);
    }

    // Deduplicate and ensure diversity (less aggressive filtering)
    const deduplicated = trackDeduplicator.processResults(results, {
      maxPerArtist: 3, // Allow up to 3 tracks per artist for more variety
      removeDuplicates: true,
      ensureDiversity: true
    });

    // Ensure we have at least 10 results, pad with more if needed
    let finalResults = deduplicated.slice(0, 10);

    // If we have fewer than 10, fetch more results
    if (finalResults.length < 10 && useLLM) {
      console.log(`⚠️ Only ${finalResults.length} tracks, fetching more...`);
      const additionalResults = await spotifyAPI.searchWithLLMEnhancement(query, llmData);
      const combined = [...finalResults, ...additionalResults];
      const reDeduplicated = trackDeduplicator.processResults(combined, {
        maxPerArtist: 3,
        removeDuplicates: true,
        ensureDiversity: false // Less strict on second pass
      });
      finalResults = reDeduplicated.slice(0, 10);
    }

    // Create curated playlist
    const playlist = playlistCurator.createPlaylistObject(
      finalResults,
      'text',
      query
    );

    // Add metadata
    playlist.llmEnhanced = useLLM && llmData !== null;
    if (llmData) {
      playlist.llmData = {
        originalQuery: query,
        enhancedQuery: llmData.enhancedQuery,
        popularArtists: llmData.popularArtists,
        reasoning: llmData.reasoning
      };
    }

    res.json({
      success: true,
      originalQuery: query,
      llmEnhanced: useLLM && llmData !== null,
      llmData: llmData,
      results: finalResults,
      playlist: playlist,
      count: finalResults.length
    });
  } catch (error) {
    console.error('Text search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Slider search endpoint
router.post('/sliders', async (req, res) => {
  try {
    const { energy, valence, danceability, tempo } = req.body;

    // Validate inputs
    if (energy === undefined || valence === undefined ||
        danceability === undefined || tempo === undefined) {
      return res.status(400).json({
        success: false,
        error: 'All audio features (energy, valence, danceability, tempo) are required'
      });
    }

    console.log('Slider search request:', { energy, valence, danceability, tempo });
    const params = {
      energy: parseFloat(energy),
      valence: parseFloat(valence),
      danceability: parseFloat(danceability),
      tempo: parseFloat(tempo)
    };
    const results = await spotifyAPI.searchByAudioFeatures(params);

    // Deduplicate and ensure diversity
    const deduplicated = trackDeduplicator.processResults(results, {
      maxPerArtist: 2,
      removeDuplicates: true,
      ensureDiversity: true
    });

    // Take top 10 unique results
    const finalResults = deduplicated.slice(0, 10);

    // Create curated playlist
    const playlist = playlistCurator.createPlaylistObject(
      finalResults,
      'sliders',
      params
    );

    res.json({
      success: true,
      parameters: params,
      results: finalResults,
      playlist: playlist,
      count: finalResults.length
    });
  } catch (error) {
    console.error('Slider search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
