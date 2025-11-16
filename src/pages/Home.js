import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import aiService from '../services/aiService';

const Home = () => {
  const { isDarkMode } = useTheme();
  const [aiInsight, setAiInsight] = useState('Analyzing your product ecosystem...');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [metrics, setMetrics] = useState({
    totalProducts: 156,
    completed: 89,
    inProgress: 45,
    pending: 22,
    completionRate: 57,
    velocity: '+12%',
    efficiency: 94
  });

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  useEffect(() => {
    // Load initial AI insight
    loadAIInsight();
  }, []);

  const loadAIInsight = async () => {
    setIsLoadingInsight(true);
    try {
      const insight = await aiService.analyzeProductPerformance(metrics);
      setAiInsight(insight);
    } catch (error) {
      setAiInsight('🍌 Banana Brain AI is warming up... Stay tuned for intelligent insights!');
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const regenerateInsight = () => {
    loadAIInsight();
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg} p-8`} style={{ overflow: 'auto' }}>
        {/* Animated Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDarkMode 
          ? 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 195, 113, 0.15) 0%, transparent 50%)'
          : 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 195, 113, 0.08) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto' }}>
        {/* Hero Section - Banana Brain AI */}
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.5rem 3rem',
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(120, 119, 198, 0.25) 0%, rgba(255, 195, 113, 0.25) 100%)'
              : 'linear-gradient(135deg, rgba(120, 119, 198, 0.15) 0%, rgba(255, 195, 113, 0.15) 100%)',
            borderRadius: '2rem',
            border: `2px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(120, 119, 198, 0.3)'}`,
            backdropFilter: 'blur(10px)',
            boxShadow: isDarkMode
              ? '0 8px 32px rgba(0, 0, 0, 0.3)'
              : '0 8px 32px rgba(120, 119, 198, 0.15)',
            animation: 'float 3s ease-in-out infinite'
          }}>
            <div style={{
              fontSize: '3rem',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              🍌
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #7877C6 0%, #FFC371 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0.25rem',
                letterSpacing: '-0.02em'
              }}>
                Banana Brain AI
              </h1>
              <p className={`text-sm ${themeClasses.textSecondary}`} style={{ fontWeight: '500' }}>
                Your Intelligent Product Analytics Assistant
              </p>
            </div>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 12px #10B981',
              animation: 'blink 2s ease-in-out infinite'
            }} />
          </div>
        </div>

        {/* AI Insight Card */}
        <div 
          className={`${themeClasses.cardBg} border ${themeClasses.border}`}
          style={{
            padding: '2rem',
            borderRadius: '1.5rem',
            marginBottom: '2rem',
            boxShadow: isDarkMode
              ? '0 10px 40px rgba(0, 0, 0, 0.3)'
              : '0 10px 40px rgba(0, 0, 0, 0.08)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Animated gradient border effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #7877C6 0%, #FFC371 50%, #7877C6 100%)',
            backgroundSize: '200% 100%',
            animation: 'gradientShift 3s ease infinite'
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #7877C6 0%, #FFC371 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                🧠
              </div>
              <div>
                <h2 className={`text-xl font-bold ${themeClasses.text}`}>AI Insights</h2>
                <p className={`text-xs ${themeClasses.textSecondary}`}>Powered by GPT-4</p>
              </div>
            </div>
            <button
              onClick={regenerateInsight}
              disabled={isLoadingInsight}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                color: isDarkMode ? '#fff' : '#000',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: isLoadingInsight ? 'not-allowed' : 'pointer',
                opacity: isLoadingInsight ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isLoadingInsight) {
                  e.target.style.background = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
              }}
            >
              {isLoadingInsight ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Thinking...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate
                </span>
              )}
            </button>
          </div>

          <div style={{
            padding: '1.5rem',
            background: isDarkMode ? 'rgba(120, 119, 198, 0.15)' : 'rgba(120, 119, 198, 0.08)',
            borderRadius: '1rem',
            borderLeft: `4px solid ${isDarkMode ? '#7877C6' : '#5855a8'}`,
            border: isDarkMode ? 'none' : '1px solid rgba(120, 119, 198, 0.2)'
          }}>
            <p className={`${themeClasses.text} leading-relaxed`} style={{ fontSize: '1.125rem', fontWeight: '500', lineHeight: '1.8' }}>
              {aiInsight}
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {/* Total Products */}
          <div
            className={`${themeClasses.cardBg} border ${themeClasses.border}`}
            style={{
              padding: '1.5rem',
              borderRadius: '1rem',
              boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '6rem',
              opacity: 0.1
            }}>
              📦
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p className={`text-sm font-semibold ${themeClasses.textSecondary} mb-2`}>TOTAL PRODUCTS</p>
              <p className={`text-4xl font-bold ${themeClasses.text} mb-1`}>{metrics.totalProducts}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#10B981', fontSize: '0.875rem', fontWeight: '600' }}>{metrics.velocity}</span>
                <span className={`text-xs ${themeClasses.textSecondary}`}>vs last month</span>
              </div>
            </div>
          </div>

          {/* Completed */}
          <div
            className={`${themeClasses.cardBg} border ${themeClasses.border}`}
            style={{
              padding: '1.5rem',
              borderRadius: '1rem',
              boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '6rem',
              opacity: 0.1
            }}>
              ✅
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p className={`text-sm font-semibold ${themeClasses.textSecondary} mb-2`}>COMPLETED</p>
              <p className={`text-4xl font-bold ${themeClasses.text} mb-1`}>{metrics.completed}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(metrics.completed / metrics.totalProducts) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                    transition: 'width 1s ease'
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* In Progress */}
          <div
            className={`${themeClasses.cardBg} border ${themeClasses.border}`}
            style={{
              padding: '1.5rem',
              borderRadius: '1rem',
              boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '6rem',
              opacity: 0.1
            }}>
              ⚡
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p className={`text-sm font-semibold ${themeClasses.textSecondary} mb-2`}>IN PROGRESS</p>
              <p className={`text-4xl font-bold ${themeClasses.text} mb-1`}>{metrics.inProgress}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(metrics.inProgress / metrics.totalProducts) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)',
                    transition: 'width 1s ease'
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Efficiency Score */}
          <div
            className={`${themeClasses.cardBg} border ${themeClasses.border}`}
            style={{
              padding: '1.5rem',
              borderRadius: '1rem',
              boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '6rem',
              opacity: 0.1
            }}>
              🎯
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p className={`text-sm font-semibold ${themeClasses.textSecondary} mb-2`}>EFFICIENCY SCORE</p>
              <p className={`text-4xl font-bold ${themeClasses.text} mb-1`}>{metrics.efficiency}%</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#10B981', fontSize: '0.875rem', fontWeight: '600' }}>Excellent</span>
                <span className={`text-xs ${themeClasses.textSecondary}`}>AI Optimized</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className={`${themeClasses.cardBg} border ${themeClasses.border}`}
          style={{
            padding: '2rem',
            borderRadius: '1.5rem',
            boxShadow: isDarkMode ? '0 10px 40px rgba(0, 0, 0, 0.3)' : '0 10px 40px rgba(0, 0, 0, 0.08)'
          }}
        >
          <h3 className={`text-lg font-bold ${themeClasses.text} mb-4`}>🚀 AI-Powered Quick Actions</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <button
              style={{
                padding: '1rem',
                borderRadius: '0.75rem',
                border: `1px solid ${isDarkMode ? 'rgba(120, 119, 198, 0.3)' : 'rgba(120, 119, 198, 0.2)'}`,
                background: isDarkMode ? 'rgba(120, 119, 198, 0.1)' : 'rgba(120, 119, 198, 0.05)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(120, 119, 198, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</div>
              <div className={`font-semibold ${themeClasses.text}`} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Analyze Bottlenecks</div>
              <div className={themeClasses.textSecondary} style={{ fontSize: '0.75rem' }}>Find workflow delays</div>
            </button>

            <button
              style={{
                padding: '1rem',
                borderRadius: '0.75rem',
                border: `1px solid ${isDarkMode ? 'rgba(255, 195, 113, 0.3)' : 'rgba(255, 195, 113, 0.2)'}`,
                background: isDarkMode ? 'rgba(255, 195, 113, 0.1)' : 'rgba(255, 195, 113, 0.05)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(255, 195, 113, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📊</div>
              <div className={`font-semibold ${themeClasses.text}`} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Predict Trends</div>
              <div className={themeClasses.textSecondary} style={{ fontSize: '0.75rem' }}>AI forecasting</div>
            </button>

            <button
              style={{
                padding: '1rem',
                borderRadius: '0.75rem',
                border: `1px solid ${isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
                background: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
              <div className={`font-semibold ${themeClasses.text}`} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Optimize Workflow</div>
              <div className={themeClasses.textSecondary} style={{ fontSize: '0.75rem' }}>Boost efficiency</div>
            </button>

            <button
              style={{
                padding: '1rem',
                borderRadius: '0.75rem',
                border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
                background: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💡</div>
              <div className={`font-semibold ${themeClasses.text}`} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Smart Recommendations</div>
              <div className={themeClasses.textSecondary} style={{ fontSize: '0.75rem' }}>Actionable insights</div>
            </button>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Home;
