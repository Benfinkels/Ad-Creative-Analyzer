import React, { useEffect, useState } from 'react';
import { handleAuthClick, initGoogleApi } from './gapi';

const createPresentation = async (analysis) => {
  try {
    const slides = window.gapi.client.slides;
    const presentation = await slides.presentations.create({
      title: 'Ad Analysis Report',
    });
    const presentationId = presentation.result.presentationId;

    // --- Set Title on First Slide ---
    let pres = await slides.presentations.get({ presentationId });
    let slide = pres.result.slides[0];
    let titleElement = slide.pageElements.find(e => e.shape?.placeholder?.type === 'TITLE' || e.shape?.placeholder?.type === 'CENTERED_TITLE');
    let titleId = titleElement.objectId;
    await slides.presentations.batchUpdate({
      presentationId,
      requests: [{ insertText: { objectId: titleId, text: 'Ad Analysis Report' } }],
    });

    // --- Helper to create a new slide and add content ---
    const addContentSlide = async (title, body) => {
      const slideId = `${title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
      await slides.presentations.batchUpdate({
        presentationId,
        requests: [{ createSlide: { objectId: slideId, slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' } } }],
      });
      pres = await slides.presentations.get({ presentationId });
      slide = pres.result.slides.find(s => s.objectId === slideId);
      titleElement = slide.pageElements.find(e => e.shape?.placeholder?.type === 'TITLE' || e.shape?.placeholder?.type === 'CENTERED_TITLE');
      const bodyElement = slide.pageElements.find(e => e.shape?.placeholder?.type === 'BODY');
      titleId = titleElement.objectId;
      const bodyId = bodyElement.objectId;
      await slides.presentations.batchUpdate({
        presentationId,
        requests: [
          { insertText: { objectId: titleId, text: title } },
          { insertText: { objectId: bodyId, text: body } },
        ],
      });
    };

    // --- Create Slides for Each Section ---
    await addContentSlide(
      `Evaluation Summary: ${analysis.evaluation_summary.overall_score}`,
      `Executive Summary: ${analysis.evaluation_summary.executive_summary}\n\nTop Strength: ${analysis.evaluation_summary.top_strength}\n\nTop Opportunity: ${analysis.evaluation_summary.top_opportunity}`
    );

    const assetReqsBody = analysis.asset_requirements_check.map(req => `${req.requirement}: ${req.status} - ${req.comment}`).join('\n');
    await addContentSlide('Asset Requirements Check', assetReqsBody);

    for (const [pillar, data] of Object.entries(analysis.abcd_analysis)) {
      const findingsBody = data.findings.map(finding => `${finding.creative_code} (${finding.timestamp}): ${finding.justification}`).join('\n\n');
      await addContentSlide(`ABCD Analysis: ${pillar.toUpperCase()}`, `Summary: ${data.summary}\n\n${findingsBody}`);
    }

    const recommendationsBody = analysis.strategic_recommendations.map(rec => `${rec.recommendation}: ${rec.rationale}`).join('\n\n');
    await addContentSlide('Strategic Recommendations', recommendationsBody);

    return presentation.result;
  } catch (error) {
    console.error('Error creating presentation:', error);
    throw error;
  }
};

const GoogleSlidesExport = ({ analysis }) => {
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [gapiError, setGapiError] = useState(null);

  useEffect(() => {
    initGoogleApi()
      .then(() => {
        setIsGapiReady(true);
      })
      .catch(error => {
        console.error("Failed to initialize Google API:", error);
        setGapiError("Failed to load Google Slides API. Please check your browser console and Google Cloud project configuration.");
        setIsGapiReady(false);
      });
  }, []);

  const handleExport = async () => {
    try {
      await handleAuthClick();
      const presentation = await createPresentation(analysis);
      window.open(`https://docs.google.com/presentation/d/${presentation.presentationId}/edit`, '_blank');
    } catch (error) {
      console.error('Error exporting to Google Slides:', error);
      alert('Error exporting to Google Slides. Please check the console for more details and ensure your Google Cloud project is configured correctly.');
    }
  };

  if (gapiError) {
    return <button className="btn btn-danger" disabled>{gapiError}</button>;
  }

  if (!isGapiReady) {
    return <button className="btn btn-secondary" disabled>Loading Export...</button>;
  }

  return (
    <button className="btn btn-secondary" onClick={handleExport}>
      Export to Google Slides
    </button>
  );
};

const Score = ({ score }) => {
  let badgeClass = 'bg-secondary';
  if (score === 'Excellent') badgeClass = 'bg-success';
  if (score === 'Good') badgeClass = 'bg-primary';
  if (score === 'Fair') badgeClass = 'bg-warning text-dark';
  if (score === 'Poor') badgeClass = 'bg-danger';

  return <span className={`badge ${badgeClass}`}>{score}</span>;
};

const AssetRequirement = ({ requirement }) => {
  const statusClass = requirement.status === 'Recommended' ? 'text-success' : 'text-warning';
  const icon = requirement.status === 'Recommended' ? '✓' : '✗';

  return (
    <li className="list-group-item d-flex justify-content-between align-items-center">
      <div>
        <strong>{requirement.requirement}:</strong> {requirement.comment}
      </div>
      <span className={`${statusClass} fs-5`}>{icon} {requirement.status}</span>
    </li>
  );
};

const Finding = ({ finding }) => {
  const relevanceClass = `relevance-${finding.relevance_to_objective?.toLowerCase()}`;
  return (
    <div className="mb-3">
      <div className="fw-bold">{finding.creative_code}</div>
      <div>
        <span className={`badge ${finding.is_present ? 'bg-success' : 'bg-secondary'}`}>
          {finding.is_present ? 'Present' : 'Not Present'}
        </span>
        {finding.timestamp && <span className="ms-2 text-muted">({finding.timestamp})</span>}
      </div>
      <p className="mb-1 mt-1">{finding.justification}</p>
      <div className="d-flex align-items-center">
        <span className="me-2">Relevance to Objective:</span>
        <span className={`badge ${relevanceClass}`}>{finding.relevance_to_objective}</span>
      </div>
    </div>
  );
};

const Report = ({ analysis }) => {
  if (!analysis) {
    return null;
  }

  const {
    evaluation_summary,
    marketing_objective,
    asset_requirements_check,
    abcd_analysis,
    strategic_recommendations,
  } = analysis;

  return (
    <div className="mt-5 card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2>Analysis Report</h2>
        <GoogleSlidesExport analysis={analysis} />
      </div>
      <div className="card-body">
        {evaluation_summary && (
          <div className="mb-4">
            <h3>Evaluation Summary</h3>
            <p><strong>Overall Score:</strong> <Score score={evaluation_summary.overall_score} /></p>
            <p><strong>Executive Summary:</strong> {evaluation_summary.executive_summary}</p>
            <div className="row">
              <div className="col-md-6">
                <div className="card bg-light">
                  <div className="card-body">
                    <h5 className="card-title">Top Strength</h5>
                    <p className="card-text">{evaluation_summary.top_strength}</p>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card bg-light">
                  <div className="card-body">
                    <h5 className="card-title">Top Opportunity</h5>
                    <p className="card-text">{evaluation_summary.top_opportunity}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {marketing_objective && (
          <div className="mb-4">
            <h4>Marketing Objective: <span className="fw-normal">{marketing_objective}</span></h4>
          </div>
        )}

        {asset_requirements_check && (
          <div className="mb-4">
            <h3>Asset Requirements Check</h3>
            <ul className="list-group">
              {asset_requirements_check.map((req, index) => (
                <AssetRequirement key={index} requirement={req} />
              ))}
            </ul>
          </div>
        )}

        {abcd_analysis && (
          <div className="mb-4">
            <h3>ABCD Analysis</h3>
            {Object.entries(abcd_analysis).map(([pillar, data]) => (
              <div key={pillar} className="card mb-3">
                <div className="card-header text-capitalize">{pillar}</div>
                <div className="card-body">
                  <p><em>{data.summary}</em></p>
                  {data.findings?.length > 0 ? (
                    data.findings.map((finding, index) => (
                      <Finding key={index} finding={finding} />
                    ))
                  ) : (
                    <p>No specific findings for this pillar.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {strategic_recommendations && (
          <div>
            <h3>Strategic Recommendations</h3>
            <ul className="list-group">
              {strategic_recommendations.map((rec, index) => (
                <li key={index} className="list-group-item">
                  <p className="fw-bold">{rec.recommendation}</p>
                  <p className="mb-0">{rec.rationale}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Report;
