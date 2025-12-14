const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'study_data.db');
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id TEXT,
      condition TEXT,
      task_number INTEGER,
      query_input TEXT,
      timestamp_start TEXT,
      timestamp_end TEXT,
      duration_seconds REAL,
      songs_clicked TEXT,
      final_selection TEXT,
      success INTEGER,
      satisfaction_rating INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating interactions table:', err);
    } else {
      console.log('Interactions table ready');
    }
  });

  // Create playlists table
  db.run(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_name TEXT,
      description TEXT,
      participant_id TEXT,
      condition TEXT,
      query_input TEXT,
      tracks TEXT,
      track_count INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating playlists table:', err);
    } else {
      console.log('Playlists table ready');
    }
  });

  console.log('Database initialized successfully');
});

class Logger {
  logInteraction(data) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO interactions (
          participant_id, condition, task_number, query_input,
          timestamp_start, timestamp_end, duration_seconds,
          songs_clicked, final_selection, success, satisfaction_rating
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        data.participantId || null,
        data.condition || null,
        data.taskNumber || null,
        data.queryInput || null,
        data.timestampStart || null,
        data.timestampEnd || null,
        data.durationSeconds || null,
        typeof data.songsClicked === 'object' ? JSON.stringify(data.songsClicked) : data.songsClicked,
        data.finalSelection || null,
        data.success ? 1 : 0,
        data.satisfactionRating || null
      ];

      db.run(sql, values, function(err) {
        if (err) {
          console.error('Error logging interaction:', err);
          reject(err);
        } else {
          console.log('Interaction logged with ID:', this.lastID);
          resolve(this.lastID);
        }
      });
    });
  }

  getAllData() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM interactions ORDER BY created_at DESC', (err, rows) => {
        if (err) {
          console.error('Error fetching data:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  getDataByParticipant(participantId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM interactions WHERE participant_id = ? ORDER BY created_at DESC',
        [participantId],
        (err, rows) => {
          if (err) {
            console.error('Error fetching participant data:', err);
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  getStatsByCondition() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          condition,
          COUNT(*) as total_interactions,
          AVG(duration_seconds) as avg_duration,
          AVG(satisfaction_rating) as avg_satisfaction,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count
        FROM interactions
        WHERE condition IS NOT NULL
        GROUP BY condition
      `;

      db.all(sql, (err, rows) => {
        if (err) {
          console.error('Error getting stats:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  clearAllData() {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM interactions', (err) => {
        if (err) {
          console.error('Error clearing data:', err);
          reject(err);
        } else {
          console.log('All data cleared');
          resolve();
        }
      });
    });
  }

  // Playlist methods
  savePlaylist(data) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO playlists (
          playlist_name, description, participant_id, condition,
          query_input, tracks, track_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        data.playlistName || 'Untitled Playlist',
        data.description || '',
        data.participantId || null,
        data.condition || null,
        data.queryInput || null,
        typeof data.tracks === 'object' ? JSON.stringify(data.tracks) : data.tracks,
        data.trackCount || 0
      ];

      db.run(sql, values, function(err) {
        if (err) {
          console.error('Error saving playlist:', err);
          reject(err);
        } else {
          console.log('Playlist saved with ID:', this.lastID);
          resolve(this.lastID);
        }
      });
    });
  }

  getAllPlaylists() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM playlists ORDER BY created_at DESC', (err, rows) => {
        if (err) {
          console.error('Error fetching playlists:', err);
          reject(err);
        } else {
          // Parse tracks JSON
          const playlists = rows.map(row => ({
            ...row,
            tracks: typeof row.tracks === 'string' ? JSON.parse(row.tracks) : row.tracks
          }));
          resolve(playlists);
        }
      });
    });
  }

  getPlaylistById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM playlists WHERE id = ?', [id], (err, row) => {
        if (err) {
          console.error('Error fetching playlist:', err);
          reject(err);
        } else if (!row) {
          reject(new Error('Playlist not found'));
        } else {
          const playlist = {
            ...row,
            tracks: typeof row.tracks === 'string' ? JSON.parse(row.tracks) : row.tracks
          };
          resolve(playlist);
        }
      });
    });
  }

  getPlaylistsByParticipant(participantId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM playlists WHERE participant_id = ? ORDER BY created_at DESC',
        [participantId],
        (err, rows) => {
          if (err) {
            console.error('Error fetching participant playlists:', err);
            reject(err);
          } else {
            const playlists = rows.map(row => ({
              ...row,
              tracks: typeof row.tracks === 'string' ? JSON.parse(row.tracks) : row.tracks
            }));
            resolve(playlists);
          }
        }
      );
    });
  }

  deletePlaylist(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM playlists WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Error deleting playlist:', err);
          reject(err);
        } else {
          console.log('Playlist deleted:', id);
          resolve(this.changes);
        }
      });
    });
  }
}

module.exports = new Logger();
