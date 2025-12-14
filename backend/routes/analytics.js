const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');

// Get summary statistics
router.get('/summary', async (req, res) => {
  try {
    const summary = await analyticsService.getSummaryStats();
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get condition statistics
router.get('/conditions', async (req, res) => {
  try {
    const conditionStats = await analyticsService.calculateConditionStats();
    res.json({ success: true, data: conditionStats });
  } catch (error) {
    console.error('Error fetching condition stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get statistical comparisons (t-tests, effect sizes)
router.get('/statistical-tests', async (req, res) => {
  try {
    const tests = await analyticsService.performStatisticalTests();
    res.json({ success: true, data: tests });
  } catch (error) {
    console.error('Error performing statistical tests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get time series data
router.get('/timeseries', async (req, res) => {
  try {
    const timeSeriesData = await analyticsService.getTimeSeriesData();
    res.json({ success: true, data: timeSeriesData });
  } catch (error) {
    console.error('Error fetching time series data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get participant statistics
router.get('/participants', async (req, res) => {
  try {
    const participantStats = await analyticsService.getParticipantStats();
    res.json({ success: true, data: participantStats });
  } catch (error) {
    console.error('Error fetching participant stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all interactions
router.get('/interactions', async (req, res) => {
  try {
    const interactions = await analyticsService.getAllInteractions();
    res.json({ success: true, data: interactions });
  } catch (error) {
    console.error('Error fetching interactions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export data as CSV
router.get('/export/csv', async (req, res) => {
  try {
    const interactions = await analyticsService.getAllInteractions();

    // Create CSV header
    let csv = 'Participant ID,Condition,Task Number,Query Input,Timestamp Start,Timestamp End,Duration (s),Songs Clicked,Final Selection,Success,Satisfaction Rating\n';

    // Add data rows
    interactions.forEach(interaction => {
      csv += [
        interaction.participant_id || '',
        interaction.condition || '',
        interaction.task_number || '',
        `"${(interaction.query_input || '').replace(/"/g, '""')}"`,
        interaction.timestamp_start || '',
        interaction.timestamp_end || '',
        interaction.duration_seconds || '',
        `"${interaction.songs_clicked || ''}"`,
        interaction.final_selection || '',
        interaction.success || '',
        interaction.satisfaction_rating || ''
      ].join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=study_data.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
