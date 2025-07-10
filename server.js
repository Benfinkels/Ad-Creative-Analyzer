const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const YTDlpWrap = require('yt-dlp-wrap').default;
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3003;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
console.log('Using Gemini API Key:', process.env.GEMINI_API_KEY ? 'Loaded' : 'Not Loaded');
const systemPrompt = fs.readFileSync(path.join(__dirname, 'system-prompt.txt'), 'utf-8');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Define the path for the yt-dlp binary
const ytdlpBinaryPath = path.join(__dirname, 'yt-dlp');
let ytDlpWrap;

app.use(express.static(path.join(__dirname, 'build')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const { Storage } = require('@google-cloud/storage');
const storageClient = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || 'ad-analyzer-uploads';

// ... other app.use() statements

//  ADD THIS ENTIRE ENDPOINT
app.post('/api/generate-upload-url', async (req, res) => {
  const { fileName, fileType } = req.body;

  if (!fileName || !fileType) {
    return res.status(400).send('Missing fileName or fileType in the request body.');
  }

  const options = {
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType: fileType,
  };

  try {
    // Get a v4 signed URL for uploading a file
    const [url] = await storageClient
      .bucket(bucketName)
      .file(fileName)
      .getSignedUrl(options);

    res.json({ url, fileName });
  } catch (error) {
    console.error('Failed to generate signed URL:', error);
    res.status(500).send('Could not create upload URL.');
  }
});

app.post('/api/analyze-url', async (req, res) => {
    const { videoUrl, marketing_objective } = req.body;

    if (!videoUrl) {
        return res.status(400).send('No video URL provided.');
    }

    if (!ytDlpWrap) {
        return res.status(500).send('yt-dlp is not initialized.');
    }

    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${Date.now()}.mp4`);

    try {
        console.log(`Downloading video from ${videoUrl} to ${tempFilePath}`);
        await ytDlpWrap.execPromise([
            videoUrl,
            '-o', tempFilePath,
            '-f', 'best[ext=mp4]', // Download the best quality MP4
        ]);
        console.log('Video downloaded successfully.');

        const videoBuffer = fs.readFileSync(tempFilePath);
        const videoMimeType = 'video/mp4';

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-pro-latest',
            systemInstruction: systemPrompt,
        });

        const videoPart = {
            inlineData: {
                data: videoBuffer.toString('base64'),
                mimeType: videoMimeType,
            },
        };

        let result;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                result = await model.generateContent([
                    `Marketing Objective: ${marketing_objective}`,
                    videoPart,
                ]);
                break; 
            } catch (error) {
                attempts++;
                console.error(`Attempt ${attempts} failed:`, error);
                if (attempts >= maxAttempts) {
                    throw error; 
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
        }

        const response = await result.response;
        const rawText = response.text();
        console.log("---- RAW GEMINI RESPONSE ----");
        console.log(rawText);
        console.log("---- END RAW GEMINI RESPONSE ----");
        let text = rawText;

        const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
        const match = text.match(jsonRegex);

        if (match && match[1]) {
            text = match[1].trim();
        } else {
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
                res.status(500).send('Error parsing analysis data after repair.');
            }
        }
    } catch (error) {
        console.error('Error processing video from URL:', error);
        res.status(500).send('Error processing video from URL');
    } finally {
        // Clean up the downloaded file
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log(`Deleted temporary file: ${tempFilePath}`);
        }
    }
});


app.get('/api/analyze-video', async (req, res) => {
  try {
    const { gcsPath, marketing_objective } = req.query;
    if (!gcsPath) {
      return res.status(400).send('No GCS path provided.');
    }

    const [file] = await storageClient.bucket(bucketName).file(gcsPath).download();
    const [metadata] = await storageClient.bucket(bucketName).file(gcsPath).getMetadata();

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro-latest',
      systemInstruction: systemPrompt,
    });

    const videoPart = {
      inlineData: {
        data: file.toString('base64'),
        mimeType: metadata.contentType,
      },
    };

    let result;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        result = await model.generateContent([
          `Marketing Objective: ${marketing_objective}`,
          videoPart,
        ]);
        break; // Success, exit loop
      } catch (error) {
        attempts++;
        console.error(`Attempt ${attempts} failed:`, error);
        if (attempts >= maxAttempts) {
          throw error; // Rethrow error after final attempt
        }
        // Optional: wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

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
      if (!jsonResponse.evaluation_summary) {
        throw new Error("Invalid analysis format: evaluation_summary missing.");
      }
      res.json(jsonResponse);
    } catch (e) {
      console.error('Initial parse failed or response invalid. Attempting to repair JSON.', e);
      console.error('Raw Gemini response:', text);

      let repairResult;
      try {
        const repairModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        repairResult = await repairModel.generateContent([
          "The following text is a broken JSON response from an API. Please correct any syntax errors and return only the valid JSON object. Do not add any extra text or explanations.",
          text
        ]);
        const repairedText = (await repairResult.response).text();
        const jsonResponse = JSON.parse(repairedText);
        console.log('Successfully repaired and parsed JSON.');
        res.json(jsonResponse);
      } catch (repairError) {
        console.error('Failed to repair and parse Gemini response:', repairError);
        if (repairResult) {
          console.error('Repaired text was:', (await repairResult.response).text());
        }
        res.status(500).send({ error: 'Error parsing analysis data after repair.' });
      }
    }
  } catch (error) {
    console.error('Error in /api/analyze-video:', error);
    res.status(500).send('An unexpected error occurred during video analysis.');
  }
});

app.get('/readiness_check', (req, res) => {
  res.status(200).send('OK');
});

(async () => {
    try {
        if (!fs.existsSync(ytdlpBinaryPath)) {
            console.log('Downloading yt-dlp binary...');
            await YTDlpWrap.downloadFromGithub(ytdlpBinaryPath);
            console.log('yt-dlp binary downloaded successfully.');
        } else {
            console.log('yt-dlp binary already exists.');
        }
        
        // Ensure the binary is executable
        // fs.chmodSync(ytdlpBinaryPath, '755');
        
        // Initialize the wrapper with the correct path
        ytDlpWrap = new YTDlpWrap(ytdlpBinaryPath);
        
        app.listen(port, () => {
            console.log(`Server listening on port ${port}`);
        });
    } catch (error) {
        console.error('Error during server startup:', error);
        process.exit(1);
    }
})();
