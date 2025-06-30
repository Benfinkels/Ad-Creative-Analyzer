import React, { useState } from 'react';
import VideoUpload from './VideoUpload';
import Report from './Report';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import './Report.css';

function App() {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalysisStart = () => {
    setAnalysis(null);
    setIsLoading(true);
  };

  const handleAnalysisComplete = (analysisData) => {
    setAnalysis(analysisData);
    setIsLoading(false);
  };

  return (
    <div className="container mt-5">
      <div className="text-center mb-4">
        <h1>YouTube Ad ABCD Analyzer</h1>
        <p className="lead">Upload your video ad to get an expert analysis based on Google's creative framework.</p>
      </div>
      <VideoUpload
        onAnalysisComplete={handleAnalysisComplete}
        onAnalysisStart={handleAnalysisStart}
      />
      {isLoading && (
        <div className="text-center mt-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Analyzing your ad... this may take a minute.</p>
        </div>
      )}
      {analysis && <Report analysis={analysis} />}
    </div>
  );
}

export default App;
