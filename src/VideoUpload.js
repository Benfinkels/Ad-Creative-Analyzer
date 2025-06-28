import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VideoUpload = ({ onAnalysisComplete, onAnalysisStart }) => {
  const [file, setFile] = useState(null);
  const [marketingObjective, setMarketingObjective] = useState('Awareness');
  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    let interval;
    if (polling) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`/api/analysis-status/${jobId}`);
          if (response.data.status === 'complete') {
            setPolling(false);
            const resultResponse = await axios.get(`/api/analysis-result/${jobId}`);
            onAnalysisComplete(resultResponse.data);
          } else if (response.data.status === 'error') {
            setPolling(false);
            alert('Error analyzing video. Please try again.');
          }
        } catch (error) {
          setPolling(false);
          console.error('Error polling for analysis status:', error);
          alert('Error checking analysis status. Please try again.');
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [polling, jobId, onAnalysisComplete]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file to upload.');
      return;
    }

    setUploading(true);
    onAnalysisStart();

    const formData = new FormData();
    formData.append('video', file);
    formData.append('marketing_objective', marketingObjective);

    try {
      const response = await axios.post('/api/analyze-video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setJobId(response.data.jobId);
      setPolling(true);
    } catch (error) {
      console.error('Error analyzing video:', error);
      alert('Error analyzing video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="mb-3">
        <label htmlFor="videoFile" className="form-label">Upload Video Ad</label>
        <input className="form-control" type="file" id="videoFile" onChange={handleFileChange} accept="video/*" />
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
      <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || polling}>
        {uploading ? 'Uploading...' : polling ? 'Analyzing...' : 'Analyze Video'}
      </button>
    </div>
  );
};

export default VideoUpload;
