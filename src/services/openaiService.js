const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

class OpenAIService {
  /**
   * Analyze product metrics using OpenAI
   */
  static async analyzeMetrics(productData, metricsData, tab = 'sales') {
    try {
      const prompt = this.buildAnalysisPrompt(productData, metricsData, tab);
      
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are Banana Brain AI, an expert Amazon product analyst specializing in PPC optimization, organic rank improvement, and sales growth strategies. Provide actionable, data-driven recommendations in a clear, numbered format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to analyze metrics');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error analyzing metrics:', error);
      throw error;
    }
  }

  /**
   * Send a follow-up question
   */
  static async askFollowUp(conversationHistory, question) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are Banana Brain AI, an expert Amazon product analyst. Continue the conversation and provide helpful, actionable advice.'
        },
        ...conversationHistory,
        {
          role: 'user',
          content: question
        }
      ];

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: messages,
          temperature: 0.7,
          max_tokens: 600
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get response');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error in follow-up question:', error);
      throw error;
    }
  }

  /**
   * Build the analysis prompt based on metrics
   */
  static buildAnalysisPrompt(productData, metricsData, tab) {
    const product = metricsData?.product || {};
    const current = metricsData?.current_period || {};
    const changes = metricsData?.changes || {};

    if (tab === 'sales') {
      return `Analyze this Amazon product's sales performance and provide 3 key actionable recommendations:

Product: ${product.name || productData?.product || 'Unknown Product'}
ASIN: ${product.asin || productData?.child_asin || 'N/A'}
Brand: ${product.brand || productData?.brand || 'N/A'}

Current Period Metrics:
- Units Sold: ${current.units_sold?.toLocaleString() || 0} (${changes.units_sold >= 0 ? '+' : ''}${changes.units_sold?.toFixed(1) || 0}%)
- Sales: $${current.sales?.toLocaleString() || 0} (${changes.sales >= 0 ? '+' : ''}${changes.sales?.toFixed(1) || 0}%)
- Sessions: ${current.sessions?.toLocaleString() || 0} (${changes.sessions >= 0 ? '+' : ''}${changes.sessions?.toFixed(1) || 0}%)
- Conversion Rate: ${current.conversion_rate?.toFixed(2) || 0}% (${changes.conversion_rate >= 0 ? '+' : ''}${changes.conversion_rate?.toFixed(1) || 0}%)
- TACOS: ${current.tacos?.toFixed(2) || 0}% (${changes.tacos >= 0 ? '+' : ''}${changes.tacos?.toFixed(1) || 0}%)
- Price: $${current.price?.toFixed(2) || 0} (${changes.price >= 0 ? '+' : ''}${changes.price?.toFixed(1) || 0}%)
- Profit Margin: ${current.profit_margin?.toFixed(1) || 0}%
- Organic Sales: ${current.organic_sales_pct?.toFixed(1) || 0}%

Focus on the most critical issues affecting sales growth and profitability. Provide specific, actionable steps.`;
    } else {
      return `Analyze this Amazon product's advertising performance and provide 3 key actionable recommendations:

Product: ${product.name || productData?.product || 'Unknown Product'}
ASIN: ${product.asin || productData?.child_asin || 'N/A'}
Brand: ${product.brand || productData?.brand || 'N/A'}

Current Period Metrics:
- Ad Spend: $${current.ad_spend?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || 0}
- Ad Sales: $${current.ad_sales?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || 0}
- ACOS: ${((current.ad_spend / current.ad_sales * 100) || 0).toFixed(2)}%
- TACOS: ${current.tacos?.toFixed(2) || 0}% (${changes.tacos >= 0 ? '+' : ''}${changes.tacos?.toFixed(1) || 0}%)
- Ad Clicks: ${current.ad_clicks?.toLocaleString() || 0}
- Ad Impressions: ${current.ad_impressions?.toLocaleString() || 0}
- Sessions: ${current.sessions?.toLocaleString() || 0} (${changes.sessions >= 0 ? '+' : ''}${changes.sessions?.toFixed(1) || 0}%)
- Conversion Rate: ${current.conversion_rate?.toFixed(2) || 0}% (${changes.conversion_rate >= 0 ? '+' : ''}${changes.conversion_rate?.toFixed(1) || 0}%)
- Total Sales: $${current.sales?.toLocaleString() || 0}
- Organic Sales: ${current.organic_sales_pct?.toFixed(1) || 0}%

Focus on PPC efficiency, ACOS/TACOS optimization, and strategies to improve ROI. Provide specific, actionable steps.`;
    }
  }
}

export default OpenAIService;

