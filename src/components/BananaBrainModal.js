import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const BananaBrainModal = ({ isOpen, onClose, analysis, onAskQuestion, isLoading }) => {
  const { isDarkMode } = useTheme();
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isClosing, setIsClosing] = useState(false);
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
              transform: translateY(30px) scale(0.95);
            }
            to { 
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes slideDown {
            from { 
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            to { 
              opacity: 0;
              transform: translateY(30px) scale(0.95);
            }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.3), 0 0 40px rgba(251, 191, 36, 0.1); }
            50% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.5), 0 0 60px rgba(251, 191, 36, 0.2); }
          }
          .modal-backdrop {
            animation: ${isClosing ? 'fadeOut' : 'fadeIn'} 0.2s ease-out;
          }
          .modal-content {
            animation: ${isClosing ? 'slideDown' : 'slideUp'} 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .gradient-text {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .message-fade-in {
            animation: slideUp 0.3s ease-out;
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
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(15, 23, 42, 0.9) 100%)',
          backdropFilter: 'blur(8px)',
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
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '1.5rem',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            overflow: 'hidden',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative gradient overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '200px',
            background: 'radial-gradient(ellipse at top, rgba(251, 191, 36, 0.15) 0%, transparent 60%)',
            pointerEvents: 'none'
          }} />
          {/* Header */}
          <div style={{
            padding: '2rem 2rem 1.5rem',
            borderBottom: '1px solid rgba(251, 191, 36, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '3.5rem',
                height: '3.5rem',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: '0 10px 30px rgba(251, 191, 36, 0.3)',
                animation: 'glow 3s ease-in-out infinite'
              }}>
                🍌
              </div>
              <div>
                <h2 className="gradient-text" style={{
                  fontSize: '1.75rem',
                  fontWeight: '800',
                  margin: 0,
                  letterSpacing: '-0.025em'
                }}>
                  Banana Brain AI
                </h2>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  margin: '0.25rem 0 0',
                  fontWeight: '500',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}>
                  Advanced Product Intelligence
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
                      background: 'rgba(251, 191, 36, 0.1)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      color: '#fbbf24',
                      cursor: 'pointer',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(251, 191, 36, 0.2)';
                      e.target.style.borderColor = 'rgba(251, 191, 36, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(251, 191, 36, 0.1)';
                      e.target.style.borderColor = 'rgba(251, 191, 36, 0.3)';
                    }}
                  >
                    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      borderRadius: '0.75rem',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                      padding: '0.5rem',
                      minWidth: '180px',
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
                  background: 'rgba(148, 163, 184, 0.1)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  fontWeight: '300'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                  e.target.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                  e.target.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(148, 163, 184, 0.1)';
                  e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                  e.target.style.color = '#94a3b8';
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
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)',
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
                gap: '1.5rem'
              }}>
                {/* Animated Brain Icon */}
                <div style={{
                  position: 'relative',
                  width: '4rem',
                  height: '4rem'
                }}>
                  <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    border: '3px solid transparent',
                    borderTop: '3px solid #fbbf24',
                    borderRight: '3px solid #fbbf24',
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
                    🧠
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ 
                    color: '#fbbf24', 
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    margin: '0 0 0.5rem',
                    letterSpacing: '-0.025em'
                  }}>
                    Analyzing Your Metrics
                  </p>
                  <p style={{ 
                    color: '#64748b', 
                    fontSize: '0.875rem',
                    margin: 0
                  }}>
                    AI is processing performance data...
                  </p>
                </div>
                <style>
                  {`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}
                </style>
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
                      width: '2.5rem',
                      height: '2.5rem',
                      background: message.role === 'user' 
                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                        : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                      borderRadius: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '1.125rem',
                      boxShadow: message.role === 'user'
                        ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                        : '0 4px 12px rgba(251, 191, 36, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      {message.role === 'user' ? '👤' : '🍌'}
                    </div>

                    {/* Message Content */}
                    <div style={{
                      background: message.role === 'user' 
                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                        : 'rgba(30, 41, 59, 0.8)',
                      backdropFilter: 'blur(10px)',
                      color: '#fff',
                      padding: '1.25rem',
                      borderRadius: '1rem',
                      maxWidth: '75%',
                      boxShadow: message.role === 'user'
                        ? '0 4px 20px rgba(59, 130, 246, 0.2)'
                        : '0 4px 20px rgba(0, 0, 0, 0.3)',
                      border: message.role === 'user'
                        ? '1px solid rgba(255, 255, 255, 0.2)'
                        : '1px solid rgba(251, 191, 36, 0.2)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: '0.9375rem',
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
                      width: '2.5rem',
                      height: '2.5rem',
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                      borderRadius: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.125rem',
                      boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      🍌
                    </div>
                    <div style={{
                      background: 'rgba(30, 41, 59, 0.8)',
                      backdropFilter: 'blur(10px)',
                      padding: '1.25rem 1.5rem',
                      borderRadius: '1rem',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(251, 191, 36, 0.2)'
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

          {/* Input Area */}
          {!isLoading && (
            <div style={{
              padding: '1.5rem 2rem 2rem',
              borderTop: '1px solid rgba(251, 191, 36, 0.2)',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{
                display: 'flex',
                gap: '1rem',
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
                      padding: '1rem 1.25rem',
                      background: 'rgba(30, 41, 59, 0.6)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      borderRadius: '1rem',
                      color: '#fff',
                      fontSize: '0.9375rem',
                      resize: 'none',
                      minHeight: '3rem',
                      maxHeight: '8rem',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(251, 191, 36, 0.6)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(251, 191, 36, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(251, 191, 36, 0.3)';
                      e.target.style.boxShadow = 'none';
                    }}
                    rows={1}
                  />
                </div>
                <button
                  onClick={handleAskQuestion}
                  disabled={!question.trim() || isAsking}
                  style={{
                    padding: '1rem 2rem',
                    background: question.trim() && !isAsking 
                      ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' 
                      : 'rgba(100, 116, 139, 0.3)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '1rem',
                    fontSize: '0.9375rem',
                    fontWeight: '700',
                    cursor: question.trim() && !isAsking ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    boxShadow: question.trim() && !isAsking 
                      ? '0 4px 16px rgba(251, 191, 36, 0.4)' 
                      : 'none',
                    letterSpacing: '-0.025em'
                  }}
                  onMouseEnter={(e) => {
                    if (question.trim() && !isAsking) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(251, 191, 36, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    if (question.trim() && !isAsking) {
                      e.target.style.boxShadow = '0 4px 16px rgba(251, 191, 36, 0.4)';
                    }
                  }}
                >
                  {isAsking ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '1rem',
                        height: '1rem',
                        border: '2px solid rgba(0, 0, 0, 0.3)',
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
                marginTop: '1rem',
                fontSize: '0.75rem',
                color: '#475569',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                <span style={{
                  width: '0.375rem',
                  height: '0.375rem',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
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

