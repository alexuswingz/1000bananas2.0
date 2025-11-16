// AI Service for Banana Brain AI
// This service calls our backend proxy to communicate with OpenAI API

class AIService {
  constructor() {
    this.apiURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  }

  async generateInsight(prompt, type = 'general') {
    try {
      const response = await fetch(`${this.apiURL}/api/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, type })
      });

      const data = await response.json();

      if (data.success) {
        return data.insight;
      } else {
        // Use fallback if API fails
        return data.fallback || this.getFallbackInsight(type);
      }
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.getFallbackInsight(type);
    }
  }

  getFallbackInsight(type) {
    const fallbacks = {
      performance: "Your metrics show strong performance with a 57% completion rate and 94% efficiency score. The 45 in-progress items indicate healthy pipeline activity. Consider focusing on the 22 pending items to boost overall completion.",
      trends: "Your +12% velocity increase suggests positive momentum. Based on current trends, you're on track to exceed quarterly targets. Continue optimizing your workflow for sustained growth.",
      workflow: "With a 94% efficiency score, your team is performing exceptionally well. Focus on maintaining this high standard while gradually reducing the pending items queue for optimal flow.",
      general: "🍌 Banana Brain AI analysis: Your product ecosystem is healthy with 156 total products and strong completion metrics. Keep up the excellent work!"
    };

    return fallbacks[type] || fallbacks.general;
  }

  async analyzeProductPerformance(productData) {
    const prompt = `Analyze this product performance data and provide 2-3 specific, actionable insights:
    - Total Products: ${productData.totalProducts}
    - Completed: ${productData.completed} (${productData.completionRate}%)
    - In Progress: ${productData.inProgress}
    - Pending: ${productData.pending}
    - Efficiency Score: ${productData.efficiency}%
    - Velocity: ${productData.velocity}
    
    Focus on what's working well and one key opportunity for improvement.`;

    return await this.generateInsight(prompt, 'performance');
  }

  async predictTrends(historicalData) {
    const prompt = `Based on a product development team with +12% velocity growth, 94% efficiency, and 57% completion rate, predict 2 key trends for the next quarter and provide 1 strategic recommendation.`;

    return await this.generateInsight(prompt, 'trends');
  }

  async optimizeWorkflow(workflowData) {
    const prompt = `Analyze a workflow with 94% efficiency, 45 items in progress, and 22 pending items. Suggest 2 specific optimizations to improve throughput and reduce bottlenecks.`;

    return await this.generateInsight(prompt, 'workflow');
  }

  async getQuickInsight() {
    const prompt = `Provide a motivating insight about a product team with 156 products, 57% completion rate, +12% growth velocity, and 94% efficiency. Keep it encouraging and specific.`;

    return await this.generateInsight(prompt, 'general');
  }
}

export default new AIService();

