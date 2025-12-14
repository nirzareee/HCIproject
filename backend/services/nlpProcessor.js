const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

class NLPProcessor {

  // Mood keyword mapping
  moodKeywords = {
    happy: ['happy', 'joyful', 'cheerful', 'upbeat', 'positive', 'bright', 'sunny'],
    sad: ['sad', 'melancholy', 'depressing', 'somber', 'emotional', 'crying', 'heartbreak', 'breakup'],
    energetic: ['energetic', 'intense', 'powerful', 'aggressive', 'hype', 'pumped', 'extreme'],
    calm: ['calm', 'relaxing', 'chill', 'peaceful', 'ambient', 'tranquil', 'soothing', 'meditation'],
    workout: ['workout', 'gym', 'running', 'exercise', 'fitness', 'training', 'cardio'],
    party: ['party', 'dance', 'club', 'edm', 'electronic', 'rave', 'festival'],
    focus: ['focus', 'study', 'studying', 'concentration', 'instrumental', 'classical', 'work', 'reading'],
    romantic: ['romantic', 'love', 'date', 'valentine', 'romance'],
    sleep: ['sleep', 'bedtime', 'night', 'lullaby', 'sleepy']
  };

  // Genre keywords
  genreKeywords = [
    'pop', 'rock', 'jazz', 'classical', 'hip-hop', 'rap', 'country', 'metal',
    'blues', 'reggae', 'soul', 'funk', 'disco', 'techno', 'house', 'trance',
    'dubstep', 'indie', 'folk', 'punk', 'grunge', 'alternative', 'r&b', 'rnb',
    'edm', 'electronic', 'acoustic', 'instrumental', 'ambient', 'lofi'
  ];

  // Instrument keywords
  instrumentKeywords = [
    'piano', 'guitar', 'violin', 'drums', 'bass', 'saxophone', 'trumpet',
    'flute', 'cello', 'acoustic', 'electric', 'synthesizer', 'synth'
  ];

  // Stop words to remove
  stopWords = new Set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
    'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she',
    'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
    'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that',
    'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an',
    'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of',
    'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
    'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will',
    'just', 'don', 'should', 'now', 'want', 'need', 'like', 'feel', 'something',
    'anything', 'music', 'song', 'songs', 'track', 'tracks', 'listen', 'listening',
    'find', 'play', 'playing', 'get', 'give'
  ]);

  /**
   * Extract keywords using NLP techniques
   * @param {string} text - The input text
   * @returns {object} - Extracted keywords with metadata
   */
  extractKeywords(text) {
    console.log('\n=== NLP Keyword Extraction ===');
    console.log('Original text:', text);

    // Tokenize and convert to lowercase
    const tokens = tokenizer.tokenize(text.toLowerCase());
    console.log('Tokens:', tokens);

    // Remove stop words (keep short words that might be artist names)
    const filteredTokens = tokens.filter(token =>
      !this.stopWords.has(token) && token.length >= 2
    );
    console.log('After stop word removal:', filteredTokens);

    // Extract different types of keywords
    const moods = this.extractMood(text);
    const genres = this.extractGenres(filteredTokens);
    const instruments = this.extractInstruments(filteredTokens);

    // Get remaining meaningful keywords (nouns, adjectives, descriptors)
    const otherKeywords = filteredTokens.filter(token =>
      !moods.includes(token) &&
      !genres.includes(token) &&
      !instruments.includes(token)
    );

    // Calculate term frequency for importance of other keywords only
    const otherTermFrequency = this.calculateTermFrequency(otherKeywords);

    // Sort other keywords by frequency
    const sortedOtherKeywords = Object.entries(otherTermFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);

    const result = {
      moods,
      genres,
      instruments,
      otherKeywords: sortedOtherKeywords.slice(0, 5), // Top 5 other keywords (artists, etc.)
      allKeywords: [...moods, ...genres, ...instruments, ...sortedOtherKeywords.slice(0, 3)]
    };

    console.log('Extracted keywords:', result);
    console.log('=== End NLP Processing ===\n');

    return result;
  }

  /**
   * Calculate term frequency
   */
  calculateTermFrequency(tokens) {
    const frequency = {};
    tokens.forEach(token => {
      frequency[token] = (frequency[token] || 0) + 1;
    });
    return frequency;
  }

  /**
   * Extract genres from tokens
   */
  extractGenres(tokens) {
    return tokens.filter(token => this.genreKeywords.includes(token));
  }

  /**
   * Extract instruments from tokens
   */
  extractInstruments(tokens) {
    return tokens.filter(token => this.instrumentKeywords.includes(token));
  }

  /**
   * Build optimized search query from extracted keywords
   */
  buildSearchQuery(keywords) {
    const { moods, genres, instruments, otherKeywords } = keywords;

    const queryParts = [];

    // Prioritize genres and instruments
    if (genres.length > 0) {
      queryParts.push(...genres);
    }

    if (instruments.length > 0) {
      queryParts.push(...instruments);
    }

    // Add moods
    if (moods.length > 0) {
      queryParts.push(...moods);
    }

    // Add other important keywords (artist names usually need 2-3 words)
    if (otherKeywords.length > 0) {
      queryParts.push(...otherKeywords.slice(0, 4));
    }

    // If no keywords extracted, return a default
    if (queryParts.length === 0) {
      return 'popular music';
    }

    const searchQuery = queryParts.join(' ');
    console.log('Built search query:', searchQuery);

    return searchQuery;
  }

  // Extract mood from transcription or text
  extractMood(text) {
    const lowerText = text.toLowerCase();
    const detectedMoods = [];

    for (const [mood, keywords] of Object.entries(this.moodKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          detectedMoods.push(mood);
          break;
        }
      }
    }

    return detectedMoods;
  }

  // Convert to Spotify search query (legacy method - now uses extractKeywords)
  convertToSearchQuery(text) {
    const keywords = this.extractKeywords(text);
    return this.buildSearchQuery(keywords);
  }

  // Get audio feature suggestions based on mood
  suggestAudioFeatures(mood) {
    const featureMap = {
      happy: { energy: 0.7, valence: 0.8, danceability: 0.7, tempo: 120 },
      sad: { energy: 0.3, valence: 0.2, danceability: 0.4, tempo: 80 },
      energetic: { energy: 0.9, valence: 0.6, danceability: 0.8, tempo: 140 },
      calm: { energy: 0.2, valence: 0.5, danceability: 0.3, tempo: 70 },
      workout: { energy: 0.9, valence: 0.7, danceability: 0.9, tempo: 130 },
      party: { energy: 0.8, valence: 0.7, danceability: 0.9, tempo: 125 },
      focus: { energy: 0.3, valence: 0.5, danceability: 0.2, tempo: 90 },
      romantic: { energy: 0.4, valence: 0.6, danceability: 0.5, tempo: 85 },
      sleep: { energy: 0.1, valence: 0.4, danceability: 0.1, tempo: 60 }
    };

    return featureMap[mood] || { energy: 0.5, valence: 0.5, danceability: 0.5, tempo: 100 };
  }
}

module.exports = new NLPProcessor();
