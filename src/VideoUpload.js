import React, { useState } from 'react';
import axios from 'axios';

const VideoUpload = ({ onAnalysisComplete, onAnalysisStart }) => {
  const [file, setFile] = useState(null);
  const [marketingObjective, setMarketingObjective] = useState('Awareness');
  const [uploading, setUploading] = useState(false);

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
      onAnalysisComplete(response.data);
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
      <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
        {uploading ? (
          <>
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            <span className="ms-2">Analyzing...</span>
          </>
        ) : 'Analyze Video'}
      </button>
    </div>
  );
};

export default VideoUpload;
