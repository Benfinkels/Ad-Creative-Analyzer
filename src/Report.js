import React from 'react';

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
      <div className="card-header">
        <h2>Analysis Report</h2>
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
