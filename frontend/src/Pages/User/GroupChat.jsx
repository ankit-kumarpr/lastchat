import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPaperPlane, FaImage, FaUser, FaUsers, FaChevronDown, FaChevronUp, FaSmile } from 'react-icons/fa';
import axios from 'axios';
import io from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import Base_url from '../config';
import './GroupChat.css';
import './OnetoOnechat.css';
import './OnetoOneliveChat.css';
// import '../../../'

function wrapEmojis(str) {
    // This regex finds emoji code points
    const emojiRegex = /([\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F980}-\u{1F9E0}\u{2600}-\u{26FF}\u{2300}-\u{23FF}])/gu;
    return str.replace(emojiRegex, '<span class="chat-emoji">$1</span>');
}

const GroupChat = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const token = sessionStorage.getItem('accessToken');
    const userId = sessionStorage.getItem('userId');
    const userRole = sessionStorage.getItem('userRole'); // Get user role
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const [showMembers, setShowMembers] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [error, setError] = useState(null);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showVideo, setShowVideo] = useState(userRole === 'admin' || userRole === 'superadmin'); // Show video only for admin/superadmin
    const [videoError, setVideoError] = useState(false);
    const messagesEndRef = useRef();
    const messagesContainerRef = useRef();
    const videoRef = useRef();

    useEffect(() => {
        if (!token || !userId || !groupId) {
            console.error('Missing required data:', { token: !!token, userId, groupId });
            navigate(-1);
            return;
        }

        const newSocket = io('https://lastchat-o1as.onrender.com', {
            transports: ['websocket', 'polling'],
            timeout: 20000,
        });
        setSocket(newSocket);

        const fetchData = async () => {
            try {
                setLoading(true);
                console.log('Fetching data for groupId:', groupId);
                
                try {
                    await axios.post(`${Base_url}/rooms/join/${groupId}`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    console.log('Successfully joined/already in room');
                } catch (joinError) {
                    console.log('Join room error (might already be in room):', joinError.response?.data?.message);
                }
                
                const [groupRes, messagesRes] = await Promise.all([
                    axios.get(`${Base_url}/rooms/getgroupdata/${groupId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${Base_url}/chats/${groupId}/messages`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                console.log('Group data:', groupRes.data);
                console.log('Group users/participants:', groupRes.data?.users);
                console.log('Messages data:', messagesRes.data);

                setGroup(groupRes.data);
                setMessages(messagesRes.data || []);
                setLoading(false);

                newSocket.emit('setUserId', userId);
                newSocket.emit('userOnline', userId);
                newSocket.emit('joinGroup', groupId);
            } catch (error) {
                console.error('Fetch error:', error);
                setError('Failed to load chat data. Please try again.');
                setLoading(false);
            }
        };

        fetchData();

        newSocket.on('receiveMessage', (message) => {
            console.log('📩 New message received:', message);
            setMessages((prevMessages) => [...prevMessages, message]);
        });

        newSocket.on('onlineUsers', (users) => {
            console.log('Online users updated:', users);
            setOnlineUsers(users || []);
        });

        newSocket.on('joinedGroup', (data) => {
            console.log('Successfully joined group:', data);
        });

        newSocket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        return () => {
            if (newSocket) {
                newSocket.emit('leaveGroup', groupId);
                newSocket.emit('userOffline', userId);
                newSocket.disconnect();
            }
        };
    }, [groupId, token, userId, navigate]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Only hide video after 5 seconds if user is admin/superadmin
        if (userRole === 'admin' || userRole === 'superadmin') {
            const videoTimer = setTimeout(() => {
                setShowVideo(false);
            }, 5000);

            return () => clearTimeout(videoTimer);
        }
    }, [userRole]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        if (!socket) {
            console.error('Socket not connected');
            return;
        }

        try {
            setSendingMessage(true);
            console.log('Sending message:', { groupId, userId, content: newMessage });

            socket.emit('sendMessage', {
                groupId,
                userId,
                content: newMessage
            });

            setNewMessage('');

        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSendingMessage(false);
        }
    };

    const handleEmojiClick = (emojiData) => {
        setNewMessage(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };

    const handleVideoEnd = () => {
        setShowVideo(false);
    };

    const handleVideoError = () => {
        console.error('Video failed to load');
        setVideoError(true);
        setShowVideo(false);
    };

    const handleVideoLoad = () => {
        console.log('Video loaded successfully');
        setVideoError(false);
    };

    const handleSkipVideo = () => {
        setShowVideo(false);
    };

    if (loading) {
        return (
            <div className="chat-loading">
                <div className="spinner"></div>
                <p>Loading chat...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="chat-error">
                <div className="error-content">
                    <h3>Oops! Something went wrong</h3>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} className="retry-button">
                        Try Again
                    </button>
                    <button onClick={() => navigate(-1)} className="back-button-error">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="onetoone-container">
            {/* Video Overlay - Multiple Video Sources for Compatibility */}
            {showVideo && (
                <div className="video-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'black',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {/* Try multiple video sources */}
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        onEnded={handleVideoEnd}
                        onError={handleVideoError}
                        onLoadedData={handleVideoLoad}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    >
                        {/* Try multiple paths */}
                        <source src="../../../videos/group-chat-intro.mp4" type="video/mp4" />
                        {/* <source src="./videos/group-chat-intro.mp4" type="video/mp4" />
                        <source src="videos/group-chat-intro.mp4" type="video/mp4" /> */}
                        {/* <source src="https://assets.codepen.io/3364143/7btrrd.mp4" type="video/mp4" /> */}
                        
                        {/* Fallback content if video doesn't load */}
                        <div style={{
                            color: 'white',
                            textAlign: 'center',
                            padding: '20px'
                        }}>
                            <h3>Welcome to Group Chat!</h3>
                            <p>Video not available</p>
                        </div>
                    </video>
                    
                    {/* Skip button */}
                    <button 
                        onClick={handleSkipVideo}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            border: '2px solid white',
                            padding: '10px 20px',
                            borderRadius: '25px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            zIndex: 10000,
                            transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.background = 'rgba(255,255,255,0.2)';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.background = 'rgba(0,0,0,0.7)';
                        }}
                    >
                        Skip ›
                    </button>

                    {/* Loading indicator */}
                    {!videoError && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: 'white',
                            fontSize: '16px',
                            zIndex: 10001
                        }}>
                            Loading video...
                        </div>
                    )}
                </div>
            )}

            {/* Rest of your chat component remains exactly the same */}
            {/* Chat Header */}
            <div className="onetoone-header">
                <button className="back-button" onClick={() => navigate(-1)}>
                    <FaArrowLeft size={20} />
                </button>
                <div className="user-avatar-container">
                    <div className="user-avatar" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                        <FaUsers />
                    </div>
                    <div className="status-dot online"></div>
                </div>
                <div className="header-info">
                    <h2>{group?.name}</h2>
                    <p className="room-id">ID: {group?.roomId || groupId}</p>
                </div>
                <button 
                    className="members-toggle"
                    onClick={() => setShowMembers(!showMembers)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '50%',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        gap: '4px'
                    }}
                >
                    <FaUsers size={18} />
                    {showMembers ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                </button>
            </div>

            {/* Members Panel */}
            {showMembers && (
                <div className="members-panel" style={{
                    background: '#f0f2f5',
                    borderBottom: '1px solid #e9ecef',
                    padding: '16px',
                    height: '120px',
                    overflowX: 'auto',
                    overflowY: 'hidden'
                }}>
                    <div className="members-header" style={{
                        marginBottom: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#075e54'
                        }}>Group Members</h3>
                        <span style={{
                            fontSize: '12px',
                            color: '#667781'
                        }}>
                            {Array.from(new Map((group?.participants || group?.users || []).map(m => [m._id, m])).values()).length} members
                        </span>
                    </div>
                    {(group?.participants || group?.users) && (group.participants || group.users).length > 0 ? (
                        <div className="members-slider" style={{
                            display: 'flex',
                            gap: '16px',
                            alignItems: 'flex-start',
                            height: '79px',
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            paddingBottom: '8px'
                        }}>
                            {/* Filter out duplicate users based on _id */}
                            {Array.from(new Map((group.participants || group.users || []).map(m => [m._id, m])).values()).map((member) => {
                                const isOnline = onlineUsers.some(onlineUser => onlineUser._id === member._id);
                                return (
                                    <div key={member._id} className="member-slide" style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        minWidth: '60px',
                                        padding: '4px',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s'
                                    }}>
                                        <div className="member-avatar" style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            marginBottom: '6px',
                                            position: 'relative',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                            overflow: 'hidden'
                                        }}>
                                            {member.avatar ? (
                                                <img 
                                                    src={member.avatar.startsWith('http') ? member.avatar : `https://lastchat-o1as.onrender.com${member.avatar}`}
                                                    alt={member.name}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.parentElement.innerHTML = member.name?.charAt(0).toUpperCase() || 'U';
                                                    }}
                                                />
                                            ) : (
                                                member.name?.charAt(0).toUpperCase() || 'U'
                                            )}
                                            {isOnline && (
                                                <div className="online-indicator" style={{
                                                    position: 'absolute',
                                                    bottom: '2px',
                                                    right: '2px',
                                                    width: '12px',
                                                    height: '12px',
                                                    background: '#25d366',
                                                    borderRadius: '50%',
                                                    border: '2px solid white',
                                                    zIndex: 1
                                                }}></div>
                                            )}
                                        </div>
                                        <span className="member-name" style={{
                                            fontSize: '11px',
                                            fontWeight: '500',
                                            color: '#111b21',
                                            textTransform: 'capitalize',
                                            textAlign: 'center',
                                            lineHeight: '1.2',
                                            maxWidth: '55px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>{member.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="no-members" style={{
                            textAlign: 'center',
                            padding: '20px',
                            color: '#667781'
                        }}>
                            <p style={{ margin: 0, fontSize: '14px' }}>No members found</p>
                        </div>
                    )}
                </div>
            )}

            {/* Messages Container */}
            <div className="messages-container" ref={messagesContainerRef} style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '16px',
                background: '#efeae2',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`
            }}>
                {messages.length === 0 ? (
                    <div className="no-messages" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#667781',
                        textAlign: 'center'
                    }}>
                        <FaUsers size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    <div className="messages-list">
                        {messages.map((message) => (
                            <div
                                key={message._id}
                                className={`message-item ${String(message.sender._id) === userId ? 'sent' : 'received'}`}
                                style={{
                                    display: 'flex',
                                    marginBottom: '8px',
                                    justifyContent: String(message.sender._id) === userId ? 'flex-end' : 'flex-start',
                                    alignItems: 'flex-end'
                                }}
                            >
                                {String(message.sender._id) !== userId && (
                                    <div className="sender-avatar" style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        marginRight: '8px',
                                        flexShrink: 0
                                    }}>
                                        {message.sender.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                
                                <div 
                                    className="message-bubble"
                                    style={{
                                        maxWidth: '70%',
                                        padding: '8px 12px',
                                        borderRadius: '7.5px',
                                        background: String(message.sender._id) === userId ? '#dcf8c6' : '#ffffff',
                                        boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                                        position: 'relative'
                                    }}
                                >
                                    {String(message.sender._id) !== userId && (
                                        <span className="sender-name" style={{ 
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: '#075e54',
                                            textTransform: 'capitalize',
                                            display: 'block',
                                            marginBottom: '2px'
                                        }}>
                                            {message.sender.name}
                                        </span>
                                    )}
                                    {message.message && (
                                        <p
                                            className="message-text"
                                            style={{
                                                margin: '0 0 4px 0',
                                                fontSize: '14px',
                                                lineHeight: '1.4',
                                                color: '#111b21',
                                                wordWrap: 'break-word'
                                            }}
                                            dangerouslySetInnerHTML={{ __html: wrapEmojis(message.message) }}
                                        />
                                    )}
                                    {message.file && (
                                        <div className="message-file" style={{ marginBottom: '4px' }}>
                                            {/\.(jpeg|jpg|gif|png|webp)$/i.test(message.file) ? (
                                                <img 
                                                    src={message.file} 
                                                    alt="Attachment" 
                                                    style={{
                                                        maxWidth: '200px',
                                                        maxHeight: '200px',
                                                        borderRadius: '8px'
                                                    }}
                                                />
                                            ) : (
                                                <a 
                                                    href={message.file} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    style={{ color: '#075e54' }}
                                                >
                                                    View File
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <span 
                                            className="message-time"
                                            style={{
                                                fontSize: '11px',
                                                color: '#667781',
                                                marginTop: '2px'
                                            }}
                                        >
                                            {new Date(message.createdAt).toLocaleTimeString([], { 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </span>
                                        {String(message.sender._id) === userId && (
                                            <span style={{
                                                fontSize: '10px',
                                                color: '#667781'
                                            }}>✓✓</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Box */}
            <form 
                className="message-input-container" 
                onSubmit={handleSendMessage}
                style={{
                    padding: '8px 16px',
                    background: '#f0f2f5',
                    borderTop: '1px solid #e9ecef'
                }}
            >
                {showEmojiPicker && (
                    <div className="emoji-picker-container" style={{
                        position: 'absolute',
                        bottom: '70px',
                        left: '16px',
                        right: '16px',
                        zIndex: 1000
                    }}>
                        <div 
                            className="emoji-picker-overlay" 
                            onClick={() => setShowEmojiPicker(false)}
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.3)',
                                zIndex: -1
                            }}
                        />
                        <div className="emoji-picker-wrapper">
                            <EmojiPicker
                                onEmojiClick={handleEmojiClick}
                                width="100%"
                                height={300}
                                theme="light"
                                searchDisabled={false}
                                skinTonesDisabled={true}
                                previewConfig={{
                                    showPreview: false
                                }}
                            />
                        </div>
                    </div>
                )}
                
                <div 
                    className="input-wrapper"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'white',
                        borderRadius: '24px',
                        padding: '4px 8px'
                    }}
                >
                    <button 
                        type="button" 
                        className="emoji-toggle"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#8696a0'
                        }}
                    >
                        <FaSmile size={20} />
                    </button>
                    
                    <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            padding: '8px 12px',
                            fontSize: '15px',
                            background: 'transparent'
                        }}
                    />
                    
                    <button 
                        type="button"
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#8696a0'
                        }}
                    >
                        <FaImage size={20} />
                    </button>
                    
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim() || sendingMessage}
                        style={{
                            background: newMessage.trim() ? '#075e54' : '#8696a0',
                            border: 'none',
                            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                            padding: '10px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {sendingMessage ? (
                            <div 
                                className="sending-spinner"
                                style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderRadius: '50%',
                                    borderTopColor: 'white',
                                    animation: 'spin 1s linear infinite'
                                }}
                            ></div>
                        ) : (
                            <FaPaperPlane size={16} />
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GroupChat;