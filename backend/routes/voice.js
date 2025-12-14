const express = require('express');
const router = express.Router();
const spotifyAPI = require('../services/spotifyAPI');
const nlpProcessor = require('../services/nlpProcessor');
const playlistCurator = require('../services/playlistCurator');
const llmMusicEnhancer = require('../services/llmMusicEnhancer');
const trackDeduplicator = require('../services/trackDeduplicator');
const curatedTracksService = require('../services/curatedTracksService');

// Voice search endpoint with LLM enhancement
router.post('/search', async (req, res) => {
  try {
    const { transcription, useLLM = true } = req.body;

    if (!transcription || transcription.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Transcription is required'
      });
    }

    console.log('Voice search request:', transcription);
    console.log('LLM enhancement:', useLLM ? 'ENABLED' : 'DISABLED');

    let results;
    let llmData = null;
    let detectedMoods = [];

    if (useLLM && process.env.GROQ_API_KEY) {
      // Use LLM for better understanding and popular music
      console.log('🤖 Using LLM to enhance voice query...');

      llmData = await llmMusicEnhancer.enhanceQuery(transcription);
      console.log('LLM Enhancement:', llmData);

      // FIRST: Try to get curated tracks from famous artists
      const accessToken = await spotifyAPI.getAccessToken();
      const curatedTracks = await curatedTracksService.getCuratedResults(
        transcription,
        llmData.popularArtists,
        accessToken
      );

      // Always search Spotify for fresh results
      console.log('Searching Spotify for diverse results...');
      const searchResults = await spotifyAPI.searchWithLLMEnhancement(transcription, llmData);

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
        console.log('🤖 Reranking voice results by relevance...');
        results = await llmMusicEnhancer.rerankByRelevance(
          results.slice(0, 20),
          transcription,
          llmData
        );
      }

      // Extract moods from LLM data (trendingKeywords often include mood descriptors)
      detectedMoods = llmData.trendingKeywords || [];
    } else {
      // Fallback: Use basic NLP
      console.log('Using basic NLP for voice (no LLM)');
      const keywords = nlpProcessor.extractKeywords(transcription);
      const searchQuery = nlpProcessor.buildSearchQuery(keywords);
      detectedMoods = nlpProcessor.extractMood(transcription);

      results = await spotifyAPI.searchByKeywords(searchQuery);
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
      const additionalResults = await spotifyAPI.searchWithLLMEnhancement(transcription, llmData);
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
      'voice',
      transcription,
      null,
      detectedMoods
    );

    // Add metadata
    playlist.llmEnhanced = useLLM && llmData !== null;
    if (llmData) {
      playlist.llmData = {
        originalQuery: transcription,
        enhancedQuery: llmData.enhancedQuery,
        popularArtists: llmData.popularArtists,
        reasoning: llmData.reasoning
      };
    }

    res.json({
      success: true,
      originalText: transcription,
      llmEnhanced: useLLM && llmData !== null,
      llmData: llmData,
      detectedMoods: detectedMoods,
      detectedInstruments: llmData?.trendingKeywords || [],
      detectedGenres: llmData?.genreContext ? [llmData.genreContext] : [],
      detectedArtist: llmData?.popularArtists?.[0] || null,
      results: finalResults,
      playlist: playlist,
      count: finalResults.length
    });
  } catch (error) {
    console.error('Voice search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint to process text with NLP (for testing)
router.post('/process', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const moods = nlpProcessor.extractMood(text);
    const query = nlpProcessor.convertToSearchQuery(text);

    res.json({
      success: true,
      originalText: text,
      detectedMoods: moods,
      processedQuery: query
    });
  } catch (error) {
    console.error('NLP processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
