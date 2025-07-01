import React, { useEffect, useState } from 'react';
import { handleAuthClick, initGoogleApi } from './gapi';
import './Report.css';
import { v4 as uuidv4 } from 'uuid';
import html2pdf from 'html2pdf.js';


const createStyledPresentation = async (analysis) => {
  try {
    const slides = window.gapi.client.slides;
    const presentation = await slides.presentations.create({
      title: 'Ad Analysis Report',
    });
    const presentationId = presentation.result.presentationId;

    const COLORS = {
      white: { rgbColor: { red: 1, green: 1, blue: 1 } },
      black_g800: { rgbColor: { red: 60 / 255, green: 64 / 255, blue: 67 / 255 } },
      grey_g700: { rgbColor: { red: 95 / 255, green: 99 / 255, blue: 104 / 255 } },
      light_grey_g100: { rgbColor: { red: 241 / 255, green: 243 / 255, blue: 244 / 255 } },
      blue_g500: { rgbColor: { red: 66 / 255, green: 133 / 255, blue: 244 / 255 } },
      green_g500: { rgbColor: { red: 52 / 255, green: 168 / 255, blue: 82 / 255 } },
      yellow_g500: { rgbColor: { red: 251 / 255, green: 188 / 255, blue: 4 / 255 } },
      red_g500: { rgbColor: { red: 234 / 255, green: 67 / 255, blue: 53 / 255 } },
    };

    const FONT_STYLES = {
      title: { fontFamily: 'Google Sans', fontSize: 24, bold: true, color: COLORS.black_g800 },
      slideTitle: { fontFamily: 'Google Sans', fontSize: 18, bold: true, color: COLORS.black_g800 },
      body: { fontFamily: 'Roboto', fontSize: 10, color: COLORS.grey_g700 },
      highlight: { fontFamily: 'Google Sans', fontSize: 14, bold: true, color: COLORS.black_g800 },
      footnote: { fontFamily: 'Roboto', fontSize: 8, color: COLORS.grey_g700 },
    };

    

    const createImage = (url, pageId, width, height, x, y) => ({
      createImage: {
        url,
        elementProperties: {
          pageObjectId: pageId,
          size: {
            width: { magnitude: width, unit: 'PT' },
            height: { magnitude: height, unit: 'PT' },
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: x,
            translateY: y,
            unit: 'PT',
          },
        },
      },
    });

    const styleText = (objectId, style) => {
      const requests = [];
      const textStyle = {};
      const fields = [];

      if (style.fontFamily) {
        textStyle.fontFamily = style.fontFamily;
        fields.push('fontFamily');
      }
      if (style.fontSize) {
        textStyle.fontSize = { magnitude: style.fontSize, unit: 'PT' };
        fields.push('fontSize');
      }
      if (style.bold) {
        textStyle.bold = style.bold;
        fields.push('bold');
      }
      if (style.color) {
        textStyle.foregroundColor = { opaqueColor: style.color };
        fields.push('foregroundColor');
      }

      requests.push({
        updateTextStyle: {
          objectId,
          style: textStyle,
          fields: fields.join(','),
        },
      });
      return requests;
    };

    let pres = await slides.presentations.get({ presentationId });
    let slide = pres.result.slides[0];
    let titleElement = slide.pageElements.find(e => e.shape?.placeholder?.type === 'TITLE' || e.shape?.placeholder?.type === 'CENTERED_TITLE');
    let titleId = titleElement.objectId;
        const logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png';


    await slides.presentations.batchUpdate({
      presentationId,
      requests: [
        { insertText: { objectId: titleId, text: 'Ad Analysis Report' } },
        ...styleText(titleId, FONT_STYLES.title),
        createImage(logoUrl, slide.objectId, 100, 100, 450, 20),
      ],
    });

    const addContentSlide = async (title, bodyContent) => {
      const slideId = uuidv4();
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

      const requests = [
        { insertText: { objectId: titleId, text: title } },
        ...styleText(titleId, FONT_STYLES.slideTitle),
        { insertText: { objectId: bodyId, text: '' } }, // Clear default text
        createImage(logoUrl, slide.objectId, 50, 50, 500, 10),
      ];

      let currentOffset = 0;
      for (const item of bodyContent) {
        const text = item.text + '\n';
        requests.push({
          insertText: {
            objectId: bodyId,
            insertionIndex: currentOffset,
            text,
          },
        });
        requests.push({
          updateTextStyle: {
            objectId: bodyId,
            style: {
              fontFamily: item.style.fontFamily || 'Roboto',
              fontSize: { magnitude: item.style.fontSize || 10, unit: 'PT' },
              foregroundColor: { opaqueColor: item.style.color || COLORS.grey_g700 },
              bold: item.style.bold || false,
            },
            textRange: {
              type: 'FIXED_RANGE',
              startIndex: currentOffset,
              endIndex: currentOffset + text.length,
            },
            fields: 'fontFamily,fontSize,foregroundColor,bold',
          },
        });
        currentOffset += text.length;
      }

      await slides.presentations.batchUpdate({ presentationId, requests });
    };

    // --- Evaluation Summary Slide ---
    const scoreColor = {
      'Excellent': COLORS.green_g500,
      'Good': COLORS.blue_g500,
      'Fair': COLORS.yellow_g500,
      'Poor': COLORS.red_g500,
    }[analysis.evaluation_summary.overall_score];

    const summaryBody = [
      { text: 'Overall Score: ', style: { ...FONT_STYLES.highlight, bold: true } },
      { text: analysis.evaluation_summary.overall_score, style: { ...FONT_STYLES.highlight, color: scoreColor, bold: true } },
      { text: `\nExecutive Summary: ${analysis.evaluation_summary.executive_summary}`, style: FONT_STYLES.body },
      { text: `\nTop Strength: ${analysis.evaluation_summary.top_strength}`, style: FONT_STYLES.body },
      { text: `\nTop Opportunity: ${analysis.evaluation_summary.top_opportunity}`, style: FONT_STYLES.body },
    ];
    await addContentSlide('Evaluation Summary', summaryBody);

    // --- Asset Requirements Slide ---
    const assetReqsBody = analysis.asset_requirements_check.flatMap(req => [
      { text: `${req.requirement}: `, style: { ...FONT_STYLES.body, bold: true } },
      { text: `${req.status} - ${req.comment}`, style: { ...FONT_STYLES.body, color: req.status === 'Recommended' ? COLORS.green_g500 : COLORS.yellow_g500 } },
    ]);
    await addContentSlide('Asset Requirements Check', assetReqsBody);

    // --- ABCD Analysis Slides ---
    for (const [pillar, data] of Object.entries(analysis.abcd_analysis)) {
      const findingsBody = [
        { text: `Summary: ${data.summary}\n`, style: { ...FONT_STYLES.body, bold: true } },
        ...data.findings.flatMap(finding => [
          { text: `${finding.creative_code} `, style: FONT_STYLES.highlight },
          { text: `(${finding.timestamp})\n`, style: FONT_STYLES.footnote },
          { text: `${finding.justification}\n`, style: FONT_STYLES.body },
        ]),
      ];
      await addContentSlide(`ABCD Analysis: ${pillar.toUpperCase()}`, findingsBody);
    }

    // --- Strategic Recommendations Slide ---
    const recommendationsBody = analysis.strategic_recommendations.flatMap(rec => [
        { text: `${rec.recommendation}\n`, style: { ...FONT_STYLES.body, bold: true } },
        { text: `${rec.rationale}\n`, style: FONT_STYLES.body },
    ]);
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
      const presentation = await createStyledPresentation(analysis);
      window.open(`https://docs.google.com/presentation/d/${presentation.presentationId}/edit`, '_blank');
    } catch (error) {
      console.error('Error exporting to Google Slides:', error);
      alert('Error exporting to Google Slides. Please check the console for more details and ensure your Google Cloud project is configured correctly.');
    }
  };

  if (gapiError) {
    return <button className="btn-export" disabled>{gapiError}</button>;
  }

  if (!isGapiReady) {
    return <button className="btn-export" disabled>Loading Export...</button>;
  }

  return (
    <button className="btn-export" onClick={handleExport}>
      Export to Google Slides
    </button>
  );
};

const Score = ({ score }) => {
  const scoreColor = {
    'Excellent': '#34a853',
    'Good': '#4285f4',
    'Fair': '#fbbc04',
    'Poor': '#ea4335',
  }[score];

  return (
    <span style={{
      color: scoreColor,
      fontWeight: 'bold',
      fontSize: '1.2em'
    }}>
      {score}
    </span>
  );
};

const AssetRequirement = ({ requirement }) => {
  const statusStyle = {
    color: requirement.status === 'Recommended' ? 'var(--green-g500)' : 'var(--yellow-g500)',
    fontWeight: 'bold',
  };

  return (
    <li className="list-group-item d-flex justify-content-between align-items-center">
      <div>
        <strong>{requirement.requirement}:</strong> {requirement.comment}
      </div>
      <span style={statusStyle}>{requirement.status}</span>
    </li>
  );
};

const Finding = ({ finding }) => {
  return (
    <div className="card mb-3">
      <div className="card-body">
        <h5 className="card-title highlight">{finding.creative_code}</h5>
        <p className="card-text">{finding.justification}</p>
        <p className="card-text">
          <small className="text-muted">
            {finding.is_present ? 'Present' : 'Not Present'}
            {finding.timestamp && ` (${finding.timestamp})`}
          </small>
        </p>
      </div>
    </div>
  );
};

const PDFExport = ({ analysis }) => {
  const handleExport = () => {
    const element = document.getElementById('report-body');
    const opt = {
      margin: 0.5,
      filename: 'ad-analysis-report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <button className="btn-export ms-2" onClick={handleExport}>
      Download PDF
    </button>
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
    <div className="report-container mt-5">
      <div className="report-header d-flex justify-content-between align-items-center p-3 mb-4 bg-light border-bottom no-print">
        <h2>Analysis Report</h2>
        <div>
          <GoogleSlidesExport analysis={analysis} />
          <PDFExport analysis={analysis} />
        </div>
      </div>
      <div id="report-body" className="report-body container">
        {evaluation_summary && (
          <div className="mb-4 card page-break-inside-avoid">
            <div className="card-header"><h3>Evaluation Summary</h3></div>
            <div className="card-body">
              <p><strong>Overall Score:</strong> <Score score={evaluation_summary.overall_score} /></p>
              <p><strong>Executive Summary:</strong> {evaluation_summary.executive_summary}</p>
              <div className="row">
                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-body">
                      <h5 className="card-title">Top Strength</h5>
                      <p className="card-text">{evaluation_summary.top_strength}</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-body">
                      <h5 className="card-title">Top Opportunity</h5>
                      <p className="card-text">{evaluation_summary.top_opportunity}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {marketing_objective && (
          <div className="mb-4 alert alert-info page-break-inside-avoid">
            <h4>Marketing Objective: <span className="fw-normal">{marketing_objective}</span></h4>
          </div>
        )}

        {asset_requirements_check && (
          <div className="mb-4 card page-break-inside-avoid">
            <div className="card-header"><h3>Asset Requirements Check</h3></div>
            <ul className="list-group list-group-flush">
              {asset_requirements_check.map((req, index) => (
                <AssetRequirement key={index} requirement={req} />
              ))}
            </ul>
          </div>
        )}

        {abcd_analysis && (
          <div className="mb-4 page-break-before">
            <h3>ABCD Analysis</h3>
            {Object.entries(abcd_analysis).map(([pillar, data]) => (
              <div key={pillar} className="card mb-3 page-break-inside-avoid">
                <div className="card-header text-capitalize"><h5>{pillar}</h5></div>
                <div className="card-body">
                  <p className="fst-italic">{data.summary}</p>
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
          <div className="card page-break-before page-break-inside-avoid">
            <div className="card-header"><h3>Strategic Recommendations</h3></div>
            <ul className="list-group list-group-flush">
              {strategic_recommendations.map((rec, index) => (
                <li key={index} className="list-group-item">
                  <p className="fw-bold mb-1">{rec.recommendation}</p>
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
