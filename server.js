const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
console.log('Using Gemini API Key:', process.env.GEMINI_API_KEY ? 'Loaded' : 'Not Loaded');
const systemPrompt = fs.readFileSync(path.join(__dirname, 'system-prompt.txt'), 'utf-8');

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(express.static(path.join(__dirname, 'build')));

app.post('/api/analyze-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No video file uploaded.');
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      systemInstruction: systemPrompt,
    });

    const { marketing_objective } = req.body;

    const videoPart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype,
      },
    };

    const result = await model.generateContent([
      `Marketing Objective: ${marketing_objective}`,
      videoPart,
    ]);

    const response = await result.response;
    const rawText = response.text();
    console.log("---- RAW GEMINI RESPONSE ----");
    console.log(rawText);
    console.log("---- END RAW GEMINI RESPONSE ----");
    let text = rawText;

    // Clean the response to ensure it's valid JSON
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonRegex);

    if (match && match[1]) {
      text = match[1].trim();
    } else {
      // Fallback for cases where the markers are missing but it's still mostly JSON
      const firstBracket = text.indexOf('{');
      const lastBracket = text.lastIndexOf('}');
      if (firstBracket !== -1 && lastBracket !== -1) {
        text = text.substring(firstBracket, lastBracket + 1);
      }
    }

    try {
      const jsonResponse = JSON.parse(text);
      res.json(jsonResponse);
    } catch (e) {
      console.error('Initial parse failed. Attempting to repair JSON.', e);
      console.error('Raw Gemini response:', text);

      try {
        const repairModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const repairResult = await repairModel.generateContent([
          "The following text is a broken JSON response from an API. Please correct any syntax errors and return only the valid JSON object. Do not add any extra text or explanations.",
          text
        ]);
        const repairedText = (await repairResult.response).text();
        const jsonResponse = JSON.parse(repairedText);
        console.log('Successfully repaired and parsed JSON.');
        res.json(jsonResponse);
      } catch (repairError) {
        console.error('Failed to repair and parse Gemini response:', repairError);
        console.error('Repaired text was:', (await repairResult.response).text());
        res.status(500).send('Error parsing analysis data after repair.');
      }
    }
  } catch (error) {
    console.error('Error analyzing video:', error);
    res.status(500).send('Error analyzing video');
  }
});

app.get('/readiness_check', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
