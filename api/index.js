const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());

mongoose.connect(process.env.MONGO_URI);

const SubtitleSchema = new mongoose.Schema({
  sha256: String,
  subtitles: [
    {
      start: Number,
      end: Number,
      text: String,
    },
  ],
  format: String, // 'json' for JSON format
  originalFilename: String, // Store the original filename
});

const Subtitle = mongoose.model('Subtitle', SubtitleSchema);

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.post('/upload', upload.single('video'), async (req, res) => {
  const filePath = path.join(__dirname, req.file.path);
  const originalFilename = path.parse(req.file.originalname).name; // Get the original filename without extension

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'File does not exist' });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    let subtitleRecord = await Subtitle.findOne({ sha256 });

    if (subtitleRecord) {
      return res.json({ 
        message: 'Subtitles fetched from database.', 
        sha256: subtitleRecord.sha256,
        filename: subtitleRecord.originalFilename, // Include the original filename
        format: subtitleRecord.format,
      });
    }

    // Request subtitles from Deepgram in JSON format
    const deepgramRes = await axios.post(
      'https://api.deepgram.com/v1/listen',
      fs.createReadStream(filePath),
      {
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/mp4', // Adjust based on your file type
          Accept: 'application/json',   // Request JSON format
        },
        params: {
          model: 'nova-2',
          smart_format: true,
        },
        responseType: 'json', // Ensure the response is treated as JSON
      }
    );

    // Log the full API response for debugging
    console.log('Deepgram API Response:', JSON.stringify(deepgramRes.data, null, 2));

    const words = deepgramRes?.data?.results?.channels?.[0]?.alternatives?.[0]?.words;

    if (!words || words.length === 0) {
      return res.status(500).json({ error: 'Unable to fetch subtitles from Deepgram API' });
    }

    let sentences = [];
    let currentSentence = { start: words[0].start, text: '' };

    words.forEach((word, index) => {
      currentSentence.text += word.punctuated_word || word.word;
      
      if (word.punctuated_word && (word.punctuated_word.endsWith('.') || word.punctuated_word.endsWith(','))) {
        currentSentence.end = word.end;
        sentences.push(currentSentence);
        if (index < words.length - 1) {
          currentSentence = { start: words[index + 1].start, text: '' };
        }
      } else {
        currentSentence.text += ' ';
      }
    });

    // Handle any remaining sentence that may not end with a period or comma
    if (!currentSentence.end) {
      currentSentence.end = words[words.length - 1].end;
      sentences.push(currentSentence);
    }

    subtitleRecord = new Subtitle({ sha256, subtitles: sentences, format: 'json', originalFilename });
    await subtitleRecord.save();

    res.json({ 
      message: 'Subtitles fetched from Deepgram API and saved to database.', 
      sha256,
      filename: originalFilename, // Include the original filename
      format: 'json',
    });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'An error occurred during the upload process.' });
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath); // Cleanup the uploaded file
    }
  }
});

app.get('/subtitles/:sha256', async (req, res) => {
  const { sha256 } = req.params;

  try {
    const subtitleRecord = await Subtitle.findOne({ sha256 });

    if (!subtitleRecord) {
      return res.status(404).json({ error: 'Subtitles not found.' });
    }

    const srtSubtitles = subtitleRecord.subtitles.map((subtitle, index) => {
      const start = formatTimestamp(subtitle.start);
      const end = formatTimestamp(subtitle.end);
      return `${index + 1}\n${start} --> ${end}\n${subtitle.text}\n`;
    }).join('\n');

    res.setHeader('Content-Disposition', `attachment; filename="${subtitleRecord.originalFilename}.srt"`);
    res.setHeader('Content-Type', 'text/plain');

    res.send(srtSubtitles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while fetching subtitles.' });
  }
});

function formatTimestamp(seconds) {
  const date = new Date(seconds * 1000);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const secondsFormatted = String(date.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

  return `${hours}:${minutes}:${secondsFormatted},${milliseconds}`;
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
