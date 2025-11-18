import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import OpenAIService from '../services/openaiService';

const BananaBrainModal = ({ isOpen, onClose, analysis, onAskQuestion, isLoading }) => {
  const { isDarkMode } = useTheme();
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isClosing, setIsClosing] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (analysis && conversation.length === 0) {
      setConversation([
        {
          role: 'assistant',
          content: analysis,
          timestamp: new Date()
        }
      ]);
    }
  }, [analysis]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Generate suggested questions only once after initial analysis
  useEffect(() => {
    const generateSuggestions = async () => {
      // Only generate suggestions once after the initial analysis
      // conversation.length === 1 means we just got the first assistant response
      if (conversation.length === 1 && !isAsking && !loadingSuggestions && suggestedQuestions.length === 0) {
        // Small delay to ensure conversation is stable
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setLoadingSuggestions(true);
        try {
          const suggestions = await OpenAIService.generateSuggestedQuestions(conversation);
          setSuggestedQuestions(suggestions);
        } catch (error) {
          console.error('Error generating suggestions:', error);
          // Use fallback suggestions on error
          setSuggestedQuestions([
            "What specific actions should I take first?",
            "How can I improve my conversion rate?",
            "What's the best way to optimize my ad spend?"
          ]);
        } finally {
          setLoadingSuggestions(false);
        }
      }
    };

    generateSuggestions();
  }, [conversation, isAsking, loadingSuggestions, suggestedQuestions.length]);

  const handleAskQuestion = async () => {
    if (!question.trim() || isAsking) return;

    const userMessage = {
      role: 'user',
      content: question.trim(),
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);
    setQuestion('');
    setIsAsking(true);

    try {
      const response = await onAskQuestion(question.trim(), conversation);
      
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }]);
    } catch (error) {
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your question. Please try again.',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuestion(suggestion);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  const exportAsText = () => {
    const text = conversation.map(msg => {
      const role = msg.role === 'user' ? 'You' : 'Banana Brain AI';
      const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '';
      return `[${timestamp}] ${role}:\n${msg.content}\n`;
    }).join('\n---\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banana-brain-analysis-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      conversation: conversation.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banana-brain-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsMarkdown = () => {
    const markdown = `# Banana Brain AI Analysis\n\n**Export Date:** ${new Date().toLocaleString()}\n\n---\n\n` +
      conversation.map(msg => {
        const role = msg.role === 'user' ? '👤 **You**' : '🍌 **Banana Brain AI**';
        const timestamp = msg.timestamp ? `*${new Date(msg.timestamp).toLocaleString()}*` : '';
        return `## ${role}\n${timestamp}\n\n${msg.content}\n`;
      }).join('\n---\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banana-brain-analysis-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setConversation([]);
      setSuggestedQuestions([]);
      setQuestion('');
      onClose();
    }, 200);
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  if (!isOpen && !isClosing) return null;

  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          @keyframes slideUp {
            from { 
              opacity: 0;
              transform: translateY(20px);
            }
            to { 
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slideDown {
            from { 
              opacity: 1;
              transform: translateY(0);
            }
            to { 
              opacity: 0;
              transform: translateY(20px);
            }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes subtleGlow {
            0%, 100% { 
              box-shadow: 0 0 15px rgba(251, 191, 36, 0.2);
            }
            50% { 
              box-shadow: 0 0 25px rgba(251, 191, 36, 0.3);
            }
          }
          .modal-backdrop {
            animation: ${isClosing ? 'fadeOut' : 'fadeIn'} 0.2s ease-out;
          }
          .modal-content {
            animation: ${isClosing ? 'slideDown' : 'slideUp'} 0.25s ease-out;
          }
          .gradient-text {
            background: linear-gradient(120deg, #fbbf24 0%, #f59e0b 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .message-fade-in {
            animation: slideUp 0.3s ease-out;
          }
          @keyframes bubbleFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-3px); }
          }
          .suggestion-bubble {
            animation: slideUp 0.3s ease-out;
          }
          .suggestion-bubble:hover {
            animation: bubbleFloat 0.6s ease-in-out;
          }
        `}
      </style>
      <div 
        className="modal-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '2rem'
        }}
        onClick={(e) => {
          if (showExportMenu) {
            setShowExportMenu(false);
          } else {
            handleClose();
          }
        }}
      >
        <div 
          className="modal-content"
          style={{
            background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '1.25rem',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(251, 191, 36, 0.3)',
            border: '1px solid rgba(251, 191, 36, 0.15)',
            overflow: 'hidden',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle gradient accent */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.5), transparent)',
            pointerEvents: 'none'
          }} />
          {/* Header */}
          <div style={{
            padding: '1.75rem 2rem',
            borderBottom: '1px solid rgba(251, 191, 36, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 1,
            background: 'rgba(15, 23, 42, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.25)'
              }}>
                🍌
              </div>
              <div>
                <h2 className="gradient-text" style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  margin: 0,
                  letterSpacing: '-0.02em'
                }}>
                  Banana Brain AI
                </h2>
                <p style={{
                  fontSize: '0.6875rem',
                  color: '#94a3b8',
                  margin: '0.125rem 0 0',
                  fontWeight: '500',
                  letterSpacing: '0.025em'
                }}>
                  Product Intelligence
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {/* Export Button */}
              {conversation.length > 0 && !isLoading && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    style={{
                      background: 'rgba(251, 191, 36, 0.08)',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      color: '#fbbf24',
                      cursor: 'pointer',
                      padding: '0.5rem 0.875rem',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      fontSize: '0.8125rem',
                      fontWeight: '500',
                      gap: '0.375rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(251, 191, 36, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.2)';
                    }}
                  >
                    <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export
                  </button>
                  
                  {/* Export Menu Dropdown */}
                  {showExportMenu && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 0.5rem)',
                      right: 0,
                      background: '#0f172a',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      borderRadius: '0.5rem',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                      padding: '0.375rem',
                      minWidth: '160px',
                      zIndex: 9999
                    }}>
                      <button
                        onClick={() => {
                          exportAsText();
                          setShowExportMenu(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          textAlign: 'left',
                          borderRadius: '0.5rem',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(251, 191, 36, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                        }}
                      >
                        📄 Text File (.txt)
                      </button>
                      <button
                        onClick={() => {
                          exportAsMarkdown();
                          setShowExportMenu(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          textAlign: 'left',
                          borderRadius: '0.5rem',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(251, 191, 36, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                        }}
                      >
                        📝 Markdown (.md)
                      </button>
                      <button
                        onClick={() => {
                          exportAsJSON();
                          setShowExportMenu(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          textAlign: 'left',
                          borderRadius: '0.5rem',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(251, 191, 36, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                        }}
                      >
                        🔧 JSON (.json)
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Close Button */}
              <button
                onClick={handleClose}
                style={{
                  background: 'rgba(148, 163, 184, 0.08)',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '1.125rem',
                  width: '2.25rem',
                  height: '2.25rem',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  fontWeight: '400'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(148, 163, 184, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.15)';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Conversation Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2rem',
            background: '#0f172a',
            position: 'relative',
            zIndex: 1
          }}>
            {isLoading ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem',
                gap: '1.25rem'
              }}>
                {/* Animated Banana Icon */}
                <div style={{
                  position: 'relative',
                  width: '3.5rem',
                  height: '3.5rem'
                }}>
                  <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    border: '2px solid transparent',
                    borderTop: '2px solid #fbbf24',
                    borderRight: '2px solid #fbbf24',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '1.5rem'
                  }}>
                    🍌
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ 
                    color: '#fbbf24', 
                    fontSize: '1rem',
                    fontWeight: '600',
                    margin: '0 0 0.375rem',
                    letterSpacing: '-0.02em'
                  }}>
                    Analyzing Your Metrics
                  </p>
                  <p style={{ 
                    color: '#64748b', 
                    fontSize: '0.8125rem',
                    margin: 0
                  }}>
                    AI is processing performance data...
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {conversation.map((message, index) => (
                  <div
                    key={index}
                    className="message-fade-in"
                    style={{
                      display: 'flex',
                      flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                      gap: '1rem',
                      alignItems: 'flex-start'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      background: message.role === 'user' 
                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                        : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '1rem',
                      boxShadow: message.role === 'user'
                        ? '0 2px 8px rgba(59, 130, 246, 0.2)'
                        : '0 2px 8px rgba(251, 191, 36, 0.2)'
                    }}>
                      {message.role === 'user' ? '👤' : '🍌'}
                    </div>

                    {/* Message Content */}
                    <div style={{
                      background: message.role === 'user' 
                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                        : 'rgba(30, 41, 59, 0.6)',
                      backdropFilter: 'blur(10px)',
                      color: '#fff',
                      padding: '1rem 1.25rem',
                      borderRadius: '0.75rem',
                      maxWidth: '75%',
                      boxShadow: message.role === 'user'
                        ? '0 2px 12px rgba(59, 130, 246, 0.15)'
                        : '0 2px 12px rgba(0, 0, 0, 0.2)',
                      border: message.role === 'user'
                        ? '1px solid rgba(255, 255, 255, 0.15)'
                        : '1px solid rgba(251, 191, 36, 0.15)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: '0.9rem',
                      lineHeight: '1.6',
                      letterSpacing: '-0.01em'
                    }}>
                      {message.content}
                    </div>
                  </div>
                ))}
                {isAsking && (
                  <div className="message-fade-in" style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      boxShadow: '0 2px 8px rgba(251, 191, 36, 0.2)'
                    }}>
                      🍌
                    </div>
                    <div style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      backdropFilter: 'blur(10px)',
                      padding: '1rem 1.25rem',
                      borderRadius: '0.75rem',
                      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(251, 191, 36, 0.15)'
                    }}>
                      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                        <div style={{
                          width: '0.625rem',
                          height: '0.625rem',
                          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                          borderRadius: '50%',
                          animation: 'bounce 1.4s infinite ease-in-out both',
                          animationDelay: '-0.32s'
                        }} />
                        <div style={{
                          width: '0.625rem',
                          height: '0.625rem',
                          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                          borderRadius: '50%',
                          animation: 'bounce 1.4s infinite ease-in-out both',
                          animationDelay: '-0.16s'
                        }} />
                        <div style={{
                          width: '0.625rem',
                          height: '0.625rem',
                          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                          borderRadius: '50%',
                          animation: 'bounce 1.4s infinite ease-in-out both'
                        }} />
                      </div>
                      <style>
                        {`
                          @keyframes bounce {
                            0%, 80%, 100% { 
                              transform: scale(0);
                              opacity: 0.3;
                            } 40% { 
                              transform: scale(1.0);
                              opacity: 1;
                            }
                          }
                        `}
                      </style>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Suggested Questions Area */}
          {!isLoading && suggestedQuestions.length > 0 && !isAsking && (
            <div style={{
              padding: '1rem 2rem',
              background: 'rgba(15, 23, 42, 0.5)',
              borderTop: '1px solid rgba(251, 191, 36, 0.08)',
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem'
              }}>
                <svg style={{ width: '0.875rem', height: '0.875rem', color: '#fbbf24' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span style={{
                  fontSize: '0.6875rem',
                  color: '#fbbf24',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Suggested Questions
                </span>
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                {suggestedQuestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="suggestion-bubble"
                    onClick={() => handleSuggestionClick(suggestion)}
                    style={{
                      background: 'rgba(251, 191, 36, 0.08)',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      color: '#fbbf24',
                      padding: '0.5rem 0.875rem',
                      borderRadius: '1rem',
                      fontSize: '0.8125rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      maxWidth: '100%',
                      textAlign: 'left',
                      lineHeight: '1.4',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(251, 191, 36, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(251, 191, 36, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.2)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    💡 {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          {!isLoading && (
            <div style={{
              padding: '1.5rem 2rem',
              borderTop: '1px solid rgba(251, 191, 36, 0.08)',
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-end'
              }}>
                <div style={{ 
                  flex: 1,
                  position: 'relative'
                }}>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a follow-up question..."
                    disabled={isAsking}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      background: 'rgba(30, 41, 59, 0.5)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(251, 191, 36, 0.15)',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '0.875rem',
                      resize: 'none',
                      minHeight: '2.75rem',
                      maxHeight: '7rem',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                      e.target.style.background = 'rgba(30, 41, 59, 0.7)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(251, 191, 36, 0.15)';
                      e.target.style.background = 'rgba(30, 41, 59, 0.5)';
                    }}
                    rows={1}
                  />
                </div>
                <button
                  onClick={handleAskQuestion}
                  disabled={!question.trim() || isAsking}
                  style={{
                    padding: '0.875rem 1.5rem',
                    background: question.trim() && !isAsking 
                      ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' 
                      : 'rgba(100, 116, 139, 0.25)',
                    color: question.trim() && !isAsking ? '#000' : '#64748b',
                    border: 'none',
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: question.trim() && !isAsking ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    boxShadow: question.trim() && !isAsking 
                      ? '0 2px 8px rgba(251, 191, 36, 0.3)' 
                      : 'none',
                    letterSpacing: '-0.01em'
                  }}
                  onMouseEnter={(e) => {
                    if (question.trim() && !isAsking) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(251, 191, 36, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    if (question.trim() && !isAsking) {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(251, 191, 36, 0.3)';
                    }
                  }}
                >
                  {isAsking ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '0.875rem',
                        height: '0.875rem',
                        border: '2px solid rgba(0, 0, 0, 0.2)',
                        borderTop: '2px solid #000',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite'
                      }} />
                      Sending
                    </span>
                  ) : (
                    '↑ Send'
                  )}
                </button>
              </div>
              <div style={{
                marginTop: '0.875rem',
                fontSize: '0.6875rem',
                color: '#64748b',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem'
              }}>
                <span style={{
                  width: '0.25rem',
                  height: '0.25rem',
                  background: '#fbbf24',
                  borderRadius: '50%',
                  animation: 'pulse 2s ease-in-out infinite'
                }} />
                Powered by Banana Brain AI
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BananaBrainModal;

