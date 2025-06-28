const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
console.log('Using Gemini API Key:', process.env.GEMINI_API_KEY ? 'Loaded' : 'Not Loaded');
const systemPrompt = fs.readFileSync(path.join(__dirname, 'system-prompt.txt'), 'utf-8');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const analysisJobs = {};

app.use(express.static(path.join(__dirname, 'build')));

app.post('/api/analyze-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No video file uploaded.');
    }

    const jobId = uuidv4();
    analysisJobs[jobId] = { status: 'pending', result: null };

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
    });

    const { marketing_objective } = req.body;

    const videoPart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype,
      },
    };

    model.generateContent([
      `Marketing Objective: ${marketing_objective}`,
      videoPart,
    ]).then(async (result) => {
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonResponse = JSON.parse(text);
      analysisJobs[jobId] = { status: 'complete', result: jsonResponse };
    }).catch((error) => {
      console.error('Error during Gemini analysis:', error);
      analysisJobs[jobId] = { status: 'error', result: 'Failed to analyze video.' };
    });

    res.status(202).json({ jobId });
  } catch (error) {
    console.error('Error analyzing video:', error);
    res.status(500).send('Error analyzing video');
  }
});

app.get('/api/analysis-status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = analysisJobs[jobId];

  if (!job) {
    return res.status(404).json({ status: 'not_found' });
  }

  res.json({ status: job.status });
});

app.get('/api/analysis-result/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = analysisJobs[jobId];

  if (!job || job.status !== 'complete') {
    return res.status(404).send('Result not available.');
  }

  res.json(job.result);
});

app.get('/readiness_check', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
