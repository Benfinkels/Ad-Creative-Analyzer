const functions = require('@google-cloud/functions-framework');
const YTDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const os = require('os');
const fs = require('fs');

const ytdlpBinaryPath = path.join(os.tmpdir(), 'yt-dlp');

functions.http('downloadVideo', async (req, res) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    res.status(400).send('No video URL provided.');
    return;
  }

  if (!fs.existsSync(ytdlpBinaryPath)) {
    await YTDlpWrap.downloadFromGithub(ytdlpBinaryPath);
  }

  const ytDlpWrap = new YTDlpWrap(ytdlpBinaryPath);
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `${Date.now()}.mp4`);

  try {
    await ytDlpWrap.execPromise([
      videoUrl,
      '-o',
      tempFilePath,
      '-f',
      'best[ext=mp4]',
      '--no-check-certificate',
      '--user-agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
    ]);

    const videoBuffer = fs.readFileSync(tempFilePath);
    res.status(200).send(videoBuffer);
  } catch (error) {
    console.error('Error downloading video:', error);
    res.status(500).send('Error downloading video.');
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
});
