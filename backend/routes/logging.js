const express = require('express');
const router = express.Router();
const logger = require('../database/logger');

// Log interaction
router.post('/interaction', async (req, res) => {
  try {
    const data = req.body;

    // Validate required fields
    if (!data.condition) {
      return res.status(400).json({
        success: false,
        error: 'Condition is required'
      });
    }

    const id = await logger.logInteraction(data);
    res.json({
      success: true,
      id: id,
      message: 'Interaction logged successfully'
    });
  } catch (error) {
    console.error('Logging error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all data (for analysis)
router.get('/export', async (req, res) => {
  try {
    const data = await logger.getAllData();
    res.json({
      success: true,
      data: data,
      count: data.length
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get data by participant
router.get('/participant/:id', async (req, res) => {
  try {
    const participantId = req.params.id;
    const data = await logger.getDataByParticipant(participantId);
    res.json({
      success: true,
      participantId: participantId,
      data: data,
      count: data.length
    });
  } catch (error) {
    console.error('Participant data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get statistics by condition
router.get('/stats', async (req, res) => {
  try {
    const stats = await logger.getStatsByCondition();
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear all data (use with caution!)
router.delete('/clear', async (req, res) => {
  try {
    await logger.clearAllData();
    res.json({
      success: true,
      message: 'All data cleared'
    });
  } catch (error) {
    console.error('Clear data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
