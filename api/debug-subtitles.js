const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});

// Subtitle Schema
const SubtitleSchema = new mongoose.Schema({
  sha256: String,
  subtitles: [
    {
      start: Number,
      end: Number,
      text: String,
    },
  ],
  format: String,
  originalFilename: String,
});

const Subtitle = mongoose.model('Subtitle', SubtitleSchema);

// Route to fetch all recent subtitles
app.get('/subtitles/recent', async (req, res) => {
  try {
    console.log('Fetching recent subtitles...');
    
    // Fetch the most recent subtitles (you can adjust the limit as needed)
    const recentSubtitles = await Subtitle.find().sort({ _id: -1 }).limit(10);
    
    console.log('Recent subtitles fetched:', recentSubtitles); // Log what was fetched

    if (!recentSubtitles || recentSubtitles.length === 0) {
      console.log('No recent subtitles found.');
      return res.status(404).json({ message: 'No recent subtitles found.' });
    }

    // Send the subtitles back to the client
    res.json(recentSubtitles);
  } catch (err) {
    console.error('Error fetching recent subtitles:', err);
    res.status(500).json({ error: 'An error occurred while fetching recent subtitles.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
