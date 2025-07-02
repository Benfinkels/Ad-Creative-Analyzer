export const mockAnalysis = {
  "evaluation_summary": {
    "overall_score": "Good",
    "abcd_scores": {
      "attract": 8,
      "brand": 7,
      "connect": 6,
      "direct": 9
    },
    "executive_summary": "This is a mock executive summary. The ad is good, but could be better.",
    "top_strength": "The ad has a strong call to action.",
    "top_opportunity": "The branding could be introduced earlier."
  },
  "marketing_objective": "CONVERSION",
  "abcd_analysis": {
    "attract": {
      "summary": "The ad attracts attention with a catchy song.",
      "findings": [
        {
          "creative_code": "ATTRACT_HOOK",
          "is_present": true,
          "justification": "The ad starts with a catchy jingle.",
          "timestamp": "0:01"
        }
      ]
    },
    "brand": {
      "summary": "The brand is introduced in the middle of the ad.",
      "findings": [
        {
          "creative_code": "BRAND_INTEGRATION",
          "is_present": true,
          "justification": "The brand logo appears at 0:15.",
          "timestamp": "0:15"
        }
      ]
    },
    "connect": {
      "summary": "The ad connects with the audience through humor.",
      "findings": [
        {
          "creative_code": "CONNECT_EMOTION",
          "is_present": true,
          "justification": "The ad uses humor to connect with the audience.",
          "timestamp": "0:10"
        }
      ]
    },
    "direct": {
      "summary": "The ad has a clear call to action.",
      "findings": [
        {
          "creative_code": "DIRECT_CTA",
          "is_present": true,
          "justification": "The ad has a clear call to action at the end.",
          "timestamp": "0:25"
        }
      ]
    }
  },
  "strategic_recommendations": [
    {
      "recommendation": "Introduce the brand logo in the first 5 seconds.",
      "rationale": "This will help to increase brand recall.",
      "predicted_impact": "A 10% increase in brand recall."
    },
    {
      "recommendation": "Add a text overlay with the call to action.",
      "rationale": "This will make the call to action more prominent.",
      "predicted_impact": "A 5% increase in click-through rate."
    }
  ]
};
