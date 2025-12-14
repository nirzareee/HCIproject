const db = require('../config/database');
const stats = require('simple-statistics');

class AnalyticsService {

  /**
   * Get all interaction data
   */
  async getAllInteractions() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM interactions ORDER BY timestamp_start DESC`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Get interactions by condition
   */
  async getInteractionsByCondition(condition) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM interactions WHERE condition = ? ORDER BY timestamp_start DESC`,
        [condition],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  /**
   * Calculate statistics for a specific metric across conditions
   */
  async calculateConditionStats() {
    const conditions = ['voice', 'sliders', 'text'];
    const conditionStats = {};

    for (const condition of conditions) {
      const interactions = await this.getInteractionsByCondition(condition);

      if (interactions.length === 0) {
        conditionStats[condition] = {
          count: 0,
          duration: { mean: 0, median: 0, stdDev: 0, min: 0, max: 0 },
          clicks: { mean: 0, median: 0, stdDev: 0, min: 0, max: 0 },
          successRate: 0
        };
        continue;
      }

      // Extract durations and click counts
      const durations = interactions
        .map(i => i.duration_seconds)
        .filter(d => d !== null && d > 0);

      const clickCounts = interactions
        .map(i => {
          try {
            const clicked = JSON.parse(i.songs_clicked || '[]');
            return Array.isArray(clicked) ? clicked.length : 0;
          } catch {
            return 0;
          }
        });

      const successCount = interactions.filter(i => i.success === 1).length;

      conditionStats[condition] = {
        count: interactions.length,
        duration: this.calculateStats(durations),
        clicks: this.calculateStats(clickCounts),
        successRate: (successCount / interactions.length) * 100,
        interactions: interactions
      };
    }

    return conditionStats;
  }

  /**
   * Calculate descriptive statistics for an array of numbers
   */
  calculateStats(values) {
    if (!values || values.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0 };
    }

    return {
      mean: stats.mean(values),
      median: stats.median(values),
      stdDev: values.length > 1 ? stats.standardDeviation(values) : 0,
      min: stats.min(values),
      max: stats.max(values)
    };
  }

  /**
   * Perform t-test between two conditions
   */
  tTest(sample1, sample2) {
    if (!sample1 || !sample2 || sample1.length < 2 || sample2.length < 2) {
      return { t: null, p: null, significant: false, message: 'Insufficient data' };
    }

    try {
      const tValue = stats.tTest(sample1, sample2);
      const df = sample1.length + sample2.length - 2;

      // Approximate p-value (two-tailed)
      // For simplicity, using rough approximation
      let pValue = null;
      if (Math.abs(tValue) > 2.576) pValue = 0.01;
      else if (Math.abs(tValue) > 1.96) pValue = 0.05;
      else pValue = 0.1;

      return {
        t: tValue,
        df: df,
        p: pValue,
        significant: pValue <= 0.05,
        effectSize: this.cohenD(sample1, sample2)
      };
    } catch (error) {
      return { t: null, p: null, significant: false, message: error.message };
    }
  }

  /**
   * Calculate Cohen's d effect size
   */
  cohenD(sample1, sample2) {
    if (!sample1 || !sample2 || sample1.length < 2 || sample2.length < 2) {
      return null;
    }

    const mean1 = stats.mean(sample1);
    const mean2 = stats.mean(sample2);
    const std1 = stats.standardDeviation(sample1);
    const std2 = stats.standardDeviation(sample2);

    const pooledStd = Math.sqrt(
      ((sample1.length - 1) * std1 * std1 + (sample2.length - 1) * std2 * std2) /
      (sample1.length + sample2.length - 2)
    );

    return (mean1 - mean2) / pooledStd;
  }

  /**
   * Perform comprehensive statistical comparison
   */
  async performStatisticalTests() {
    const conditionStats = await this.calculateConditionStats();
    const comparisons = {};

    const conditions = ['voice', 'sliders', 'text'];
    const pairs = [
      ['voice', 'sliders'],
      ['voice', 'text'],
      ['sliders', 'text']
    ];

    for (const [cond1, cond2] of pairs) {
      const data1 = conditionStats[cond1];
      const data2 = conditionStats[cond2];

      if (!data1 || !data2) continue;

      // Extract duration values
      const durations1 = data1.interactions?.map(i => i.duration_seconds).filter(d => d > 0) || [];
      const durations2 = data2.interactions?.map(i => i.duration_seconds).filter(d => d > 0) || [];

      // Extract click counts
      const clicks1 = data1.interactions?.map(i => {
        try {
          const clicked = JSON.parse(i.songs_clicked || '[]');
          return Array.isArray(clicked) ? clicked.length : 0;
        } catch {
          return 0;
        }
      }) || [];

      const clicks2 = data2.interactions?.map(i => {
        try {
          const clicked = JSON.parse(i.songs_clicked || '[]');
          return Array.isArray(clicked) ? clicked.length : 0;
        } catch {
          return 0;
        }
      }) || [];

      comparisons[`${cond1}_vs_${cond2}`] = {
        duration: this.tTest(durations1, durations2),
        clicks: this.tTest(clicks1, clicks2)
      };
    }

    return {
      conditionStats,
      comparisons
    };
  }

  /**
   * Get time series data for visualization
   */
  async getTimeSeriesData() {
    const interactions = await this.getAllInteractions();

    const timeSeriesData = {
      voice: [],
      sliders: [],
      text: []
    };

    interactions.forEach(interaction => {
      const date = new Date(interaction.timestamp_start);
      const dataPoint = {
        timestamp: date.toISOString(),
        duration: interaction.duration_seconds,
        clicks: JSON.parse(interaction.songs_clicked || '[]').length,
        success: interaction.success
      };

      if (interaction.condition in timeSeriesData) {
        timeSeriesData[interaction.condition].push(dataPoint);
      }
    });

    return timeSeriesData;
  }

  /**
   * Get participant-level statistics
   */
  async getParticipantStats() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT
          participant_id,
          condition,
          COUNT(*) as total_searches,
          AVG(duration_seconds) as avg_duration,
          AVG(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100 as success_rate
        FROM interactions
        WHERE participant_id IS NOT NULL
        GROUP BY participant_id, condition
        ORDER BY participant_id`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  /**
   * Get overall summary statistics
   */
  async getSummaryStats() {
    const allInteractions = await this.getAllInteractions();
    const conditionStats = await this.calculateConditionStats();

    return {
      totalInteractions: allInteractions.length,
      totalParticipants: new Set(allInteractions.map(i => i.participant_id)).size,
      conditionBreakdown: {
        voice: conditionStats.voice?.count || 0,
        sliders: conditionStats.sliders?.count || 0,
        text: conditionStats.text?.count || 0
      },
      overallSuccessRate: (
        (allInteractions.filter(i => i.success === 1).length / allInteractions.length) * 100
      ).toFixed(2),
      averageDuration: stats.mean(
        allInteractions.map(i => i.duration_seconds).filter(d => d > 0)
      ).toFixed(2)
    };
  }
}

module.exports = new AnalyticsService();
