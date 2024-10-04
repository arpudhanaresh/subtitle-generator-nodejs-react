const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());

mongoose.connect(process.env.MONGO_URI);

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

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

ffmpeg.setFfmpegPath(ffmpegPath);

app.post('/upload', upload.single('video'), async (req, res) => {
  const startTime = Date.now();
  console.log('Upload started.');

  const videoFilePath = path.join(__dirname, req.file.path);
  const audioFilePath = path.join(__dirname, `uploads/${Date.now()}-audio.mp3`);
  const originalFilename = path.parse(req.file.originalname).name;

  try {
    if (!fs.existsSync(videoFilePath)) {
      return res.status(400).json({ error: 'File does not exist' });
    }

    console.log(`Original file size: ${formatFileSize(fs.statSync(videoFilePath).size)}`);

    // Step 1: Extract audio from video
    const extractionStart = Date.now();
    await new Promise((resolve, reject) => {
      ffmpeg(videoFilePath)
        .output(audioFilePath)
        .audioCodec('libmp3lame')
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    console.log(`Audio extraction completed in ${Date.now() - extractionStart} ms.`);
    console.log(`Extracted audio file size: ${formatFileSize(fs.statSync(audioFilePath).size)}`);

    // Step 2: Calculate SHA-256 hash
    const hashStart = Date.now();
    const fileBuffer = fs.readFileSync(audioFilePath);
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    console.log(`SHA-256 hash computed in ${Date.now() - hashStart} ms.`);

    let subtitleRecord = await Subtitle.findOne({ sha256 });

    if (subtitleRecord) {
      console.log(`Subtitles found in database in ${Date.now() - startTime} ms.`);
      return res.json({
        message: 'Subtitles fetched from database.',
        sha256: subtitleRecord.sha256,
        filename: subtitleRecord.originalFilename,
        format: subtitleRecord.format,
        subtitleSize: subtitleRecord.subtitles.length,  // Return the number of sentences
      });
    }

    // Step 3: Request subtitles from Deepgram
    const deepgramStart = Date.now();
    const deepgramRes = await axios.post(
      'https://api.deepgram.com/v1/listen',
      fs.createReadStream(audioFilePath),
      {
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/mp3',
          Accept: 'application/json',
        },
        params: {
          model: 'nova-2',
          smart_format: true,
        },
        responseType: 'json',
      }
    );
    console.log(`Deepgram API request completed in ${Date.now() - deepgramStart} ms.`);

    const words = deepgramRes?.data?.results?.channels?.[0]?.alternatives?.[0]?.words;

    if (!words || words.length === 0) {
      return res.status(500).json({ error: 'Unable to fetch subtitles from Deepgram API' });
    }

    // Step 4: Process the words into sentences
    const processingStart = Date.now();
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

    if (!currentSentence.end) {
      currentSentence.end = words[words.length - 1].end;
      sentences.push(currentSentence);
    }
    console.log(`Subtitles processing completed in ${Date.now() - processingStart} ms.`);

    // Step 5: Save subtitles to database
    const dbSaveStart = Date.now();
    subtitleRecord = new Subtitle({ sha256, subtitles: sentences, format: 'json', originalFilename });
    await subtitleRecord.save();
    console.log(`Subtitles saved to database in ${Date.now() - dbSaveStart} ms.`);

    res.json({
      message: 'Subtitles fetched from Deepgram API and saved to database.',
      sha256,
      filename: originalFilename,
      format: 'json',
      subtitleSize: sentences.length,  // Return the number of sentences
    });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'An error occurred during the upload process.' });
  } finally {
    // Cleanup the uploaded and extracted files
    if (fs.existsSync(videoFilePath)) {
      fs.unlinkSync(videoFilePath);
    }
    if (fs.existsSync(audioFilePath)) {
      fs.unlinkSync(audioFilePath);
    }
    console.log(`Total upload process completed in ${Date.now() - startTime} ms.`);
  }
});

// New route to fetch all recent subtitles
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

// Route to fetch subtitles by sha256 and download them as .srt
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

function formatFileSize(sizeInBytes) {
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  let size = sizeInBytes;
  let unitIndex = 0;

  while (size > 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
