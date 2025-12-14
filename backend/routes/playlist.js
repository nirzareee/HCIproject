const express = require('express');
const router = express.Router();
const logger = require('../database/logger');
const playlistCurator = require('../services/playlistCurator');

// Save a playlist
router.post('/save', async (req, res) => {
  try {
    const { tracks, condition, queryInput, participantId, detectedMoods } = req.body;

    if (!tracks || tracks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tracks are required'
      });
    }

    // Create curated playlist
    const playlistData = playlistCurator.createPlaylistObject(
      tracks,
      condition,
      queryInput,
      participantId,
      detectedMoods
    );

    // Save to database
    const playlistId = await logger.savePlaylist(playlistData);

    res.json({
      success: true,
      playlistId: playlistId,
      playlist: {
        id: playlistId,
        ...playlistData
      },
      message: 'Playlist saved successfully'
    });
  } catch (error) {
    console.error('Save playlist error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all playlists
router.get('/all', async (req, res) => {
  try {
    const playlists = await logger.getAllPlaylists();
    res.json({
      success: true,
      playlists: playlists,
      count: playlists.length
    });
  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get playlist by ID
router.get('/:id', async (req, res) => {
  try {
    const playlistId = req.params.id;
    const playlist = await logger.getPlaylistById(playlistId);

    res.json({
      success: true,
      playlist: playlist
    });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Get playlists by participant
router.get('/participant/:id', async (req, res) => {
  try {
    const participantId = req.params.id;
    const playlists = await logger.getPlaylistsByParticipant(participantId);

    res.json({
      success: true,
      participantId: participantId,
      playlists: playlists,
      count: playlists.length
    });
  } catch (error) {
    console.error('Get participant playlists error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete playlist
router.delete('/:id', async (req, res) => {
  try {
    const playlistId = req.params.id;
    await logger.deletePlaylist(playlistId);

    res.json({
      success: true,
      message: 'Playlist deleted successfully'
    });
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create a curated playlist from search results (without saving)
router.post('/curate', async (req, res) => {
  try {
    const { tracks, condition, queryInput, participantId, detectedMoods } = req.body;

    if (!tracks || tracks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tracks are required'
      });
    }

    // Create curated playlist (don't save to DB)
    const playlistData = playlistCurator.createPlaylistObject(
      tracks,
      condition,
      queryInput,
      participantId,
      detectedMoods
    );

    res.json({
      success: true,
      playlist: playlistData
    });
  } catch (error) {
    console.error('Curate playlist error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
