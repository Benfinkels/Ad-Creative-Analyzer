import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const VideoUpload = ({ onAnalysisComplete, onAnalysisStart }) => {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [marketingObjective, setMarketingObjective] = useState('Awareness');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'url'
  const progressInterval = useRef(null);

  useEffect(() => {
    if (uploading) {
      progressInterval.current = setInterval(() => {
        setProgress((prevProgress) => {
          if (prevProgress >= 90) {
            clearInterval(progressInterval.current);
            return 90;
          }
          return prevProgress + 10;
        });
      }, 1000);
    } else {
      clearInterval(progressInterval.current);
      setProgress(0);
    }

    return () => clearInterval(progressInterval.current);
  }, [uploading]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUrlChange = (e) => {
    setVideoUrl(e.target.value);
  };

  const handleAnalyze = async () => {
    if (activeTab === 'upload') {
      if (!file) {
        alert('Please select a file to upload.');
        return;
      }

      setUploading(true);
      setError(null);
      onAnalysisStart();

      try {
        // 1. Get signed URL from our server
        const { data: { url, fileName } } = await axios.post('/api/generate-upload-url', {
          fileName: file.name,
          fileType: file.type,
        });

        // 2. Upload file directly to GCS
        await axios.put(url, file, {
          headers: {
            'Content-Type': file.type,
          },
        });

        // 3. Call our server to start analysis from GCS
        const response = await axios.get(`/api/analyze-video?gcsPath=${fileName}&marketing_objective=${marketingObjective}`);
        onAnalysisComplete(response.data);

      } catch (error) {
        console.error('Error analyzing video:', error);
        setError('An error occurred during the analysis. Please try again.');
      } finally {
        setUploading(false);
      }
    } else {
      if (!videoUrl) {
        alert('Please enter a video URL.');
        return;
      }

      setUploading(true);
      setError(null);
      onAnalysisStart();

      try {
        const response = await axios.post('/api/analyze-url', {
          videoUrl,
          marketing_objective: marketingObjective,
        });
        onAnalysisComplete(response.data);
      } catch (error) {
        console.error('Error analyzing video:', error);
        setError('An error occurred during the analysis. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="card p-4">
      <ul className="nav nav-tabs">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
            Upload Video
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'url' ? 'active' : ''}`} onClick={() => setActiveTab('url')}>
            Analyze from URL <span className="badge bg-primary">Beta</span>
          </button>
        </li>
      </ul>

      <div className="tab-content p-3 border border-top-0">
        {activeTab === 'upload' && (
          <div className="mb-3">
            <label htmlFor="videoFile" className="form-label">Upload Video Ad</label>
            <input className="form-control" type="file" id="videoFile" onChange={handleFileChange} accept="video/*" />
          </div>
        )}
        {activeTab === 'url' && (
          <div className="mb-3">
            <label htmlFor="videoUrl" className="form-label">Video URL</label>
            <input
              type="text"
              className="form-control"
              id="videoUrl"
              value={videoUrl}
              onChange={handleUrlChange}
              placeholder="e.g., https://www.youtube.com/watch?v=..."
            />
          </div>
        )}
      </div>

      <div className="mb-3">
        <label htmlFor="marketingObjective" className="form-label">Select Marketing Objective</label>
        <select
          className="form-select"
          id="marketingObjective"
          value={marketingObjective}
          onChange={(e) => setMarketingObjective(e.target.value)}
        >
          <option value="Awareness">Awareness</option>
          <option value="Consideration">Consideration</option>
          <option value="Action">Action</option>
        </select>
      </div>
      {uploading ? (
        <div className="progress">
          <div
            className="progress-bar"
            role="progressbar"
            style={{ width: `${progress}%` }}
            aria-valuenow={progress}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            {progress}%
          </div>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={handleAnalyze} disabled={uploading}>
          Analyze
        </button>
      )}
    </div>
  );
};

export default VideoUpload;
