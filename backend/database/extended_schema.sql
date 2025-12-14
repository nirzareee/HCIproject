-- Extended HCI Research Database Schema

-- Track-level feedback table
CREATE TABLE IF NOT EXISTS track_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id TEXT,
  playlist_id INTEGER,
  track_id TEXT,
  track_name TEXT,
  rating INTEGER CHECK(rating >= 1 AND rating <= 5),
  thumb_vote INTEGER CHECK(thumb_vote IN (-1, 0, 1)),  -- -1=down, 0=neutral, 1=up
  comment TEXT,
  relevance_score INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id)
);

-- System Usability Scale (SUS) responses
CREATE TABLE IF NOT EXISTS sus_surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id TEXT,
  condition TEXT,  -- voice, text, or sliders
  q1_use_frequently INTEGER CHECK(q1_use_frequently >= 1 AND q1_use_frequently <= 5),
  q2_unnecessarily_complex INTEGER CHECK(q2_unnecessarily_complex >= 1 AND q2_unnecessarily_complex <= 5),
  q3_easy_to_use INTEGER CHECK(q3_easy_to_use >= 1 AND q3_easy_to_use <= 5),
  q4_need_support INTEGER CHECK(q4_need_support >= 1 AND q4_need_support <= 5),
  q5_well_integrated INTEGER CHECK(q5_well_integrated >= 1 AND q5_well_integrated <= 5),
  q6_too_much_inconsistency INTEGER CHECK(q6_too_much_inconsistency >= 1 AND q6_too_much_inconsistency <= 5),
  q7_learn_quickly INTEGER CHECK(q7_learn_quickly >= 1 AND q7_learn_quickly <= 5),
  q8_cumbersome INTEGER CHECK(q8_cumbersome >= 1 AND q8_cumbersome <= 5),
  q9_confident INTEGER CHECK(q9_confident >= 1 AND q9_confident <= 5),
  q10_learn_before_use INTEGER CHECK(q10_learn_before_use >= 1 AND q10_learn_before_use <= 5),
  sus_score REAL,  -- Calculated SUS score (0-100)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- NASA-TLX (Task Load Index) responses
CREATE TABLE IF NOT EXISTS nasa_tlx_surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id TEXT,
  condition TEXT,
  task_id INTEGER,
  mental_demand INTEGER CHECK(mental_demand >= 0 AND mental_demand <= 100),
  physical_demand INTEGER CHECK(physical_demand >= 0 AND physical_demand <= 100),
  temporal_demand INTEGER CHECK(temporal_demand >= 0 AND temporal_demand <= 100),
  performance INTEGER CHECK(performance >= 0 AND performance <= 100),
  effort INTEGER CHECK(effort >= 0 AND effort <= 100),
  frustration INTEGER CHECK(frustration >= 0 AND frustration <= 100),
  overall_workload REAL,  -- Average of all dimensions
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Experience Questionnaire (UEQ) responses
CREATE TABLE IF NOT EXISTS ueq_surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id TEXT,
  condition TEXT,
  attractiveness REAL,  -- Average of attractiveness items
  perspicuity REAL,  -- Clarity/understandability
  efficiency REAL,
  dependability REAL,
  stimulation REAL,
  novelty REAL,
  q1_annoying_enjoyable INTEGER CHECK(q1_annoying_enjoyable >= 1 AND q1_annoying_enjoyable <= 7),
  q2_incomprehensible_understandable INTEGER CHECK(q2_incomprehensible_understandable >= 1 AND q2_incomprehensible_understandable <= 7),
  q3_creative_dull INTEGER CHECK(q3_creative_dull >= 1 AND q3_creative_dull <= 7),
  q4_difficult_easy INTEGER CHECK(q4_difficult_easy >= 1 AND q4_difficult_easy <= 7),
  q5_valuable_inferior INTEGER CHECK(q5_valuable_inferior >= 1 AND q5_valuable_inferior <= 7),
  q6_boring_exciting INTEGER CHECK(q6_boring_exciting >= 1 AND q6_boring_exciting <= 7),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Detailed interaction events log
CREATE TABLE IF NOT EXISTS interaction_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  participant_id TEXT,
  event_type TEXT,  -- click, search, refine, error, etc.
  condition TEXT,
  element_id TEXT,
  event_data TEXT,  -- JSON data
  timestamp_ms INTEGER,  -- Unix timestamp in milliseconds
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Error logs
CREATE TABLE IF NOT EXISTS error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id TEXT,
  condition TEXT,
  error_type TEXT,  -- voice_recognition, no_results, timeout, etc.
  error_message TEXT,
  recovery_action TEXT,
  recovery_successful INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Comparative search data (when users try same query on different interfaces)
CREATE TABLE IF NOT EXISTS comparative_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id TEXT,
  query_text TEXT,
  voice_results TEXT,  -- JSON
  text_results TEXT,   -- JSON
  slider_results TEXT,  -- JSON
  preferred_interface TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Session metadata
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  participant_id TEXT,
  start_time DATETIME,
  end_time DATETIME,
  total_duration_seconds REAL,
  conditions_used TEXT,  -- JSON array
  tasks_completed INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Task completion tracking
CREATE TABLE IF NOT EXISTS task_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  participant_id TEXT,
  task_id INTEGER,
  task_description TEXT,
  condition TEXT,
  success INTEGER,
  time_to_complete_seconds REAL,
  number_of_attempts INTEGER,
  user_satisfaction INTEGER CHECK(user_satisfaction >= 1 AND user_satisfaction <= 10),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Accessibility preferences
CREATE TABLE IF NOT EXISTS accessibility_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id TEXT UNIQUE,
  screen_reader_enabled INTEGER DEFAULT 0,
  high_contrast_mode INTEGER DEFAULT 0,
  reduced_motion INTEGER DEFAULT 0,
  font_size_multiplier REAL DEFAULT 1.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_track_feedback_participant ON track_feedback(participant_id);
CREATE INDEX IF NOT EXISTS idx_interaction_events_session ON interaction_events(session_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_participant ON error_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_session ON task_completions(session_id);
