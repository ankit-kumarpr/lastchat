import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaPaperPlane, FaUser, FaSmile } from 'react-icons/fa';
import axios from 'axios';
import io from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import Base_url from '../config';
import './OnetoOnechat.css';
import './OnetoOneliveChat.css';

const OnetoOneliveChat = () => {
    const { userId: receiverId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const token = sessionStorage.getItem('accessToken');
    const currentUserId = sessionStorage.getItem('userId');
    
    // Get receiver data from navigation state
    const receiverData = location.state?.receiverData;
    
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const [error, setError] = useState(null);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isReceiverOnline, setIsReceiverOnline] = useState(false);
    const [receiverInfo, setReceiverInfo] = useState(receiverData || null);
    const [globalOnlineUsers, setGlobalOnlineUsers] = useState([]);
    const messagesEndRef = useRef();
    const messagesContainerRef = useRef();

    useEffect(() => {
        if (!token || !currentUserId || !receiverId) {
            console.error('Missing required data:', { token: !!token, currentUserId, receiverId });
            navigate(-1);
            return;
        }

        // Initialize socket connection
        const newSocket = io('https://lastchat-o1as.onrender.com', {
            transports: ['websocket', 'polling'],
            timeout: 20000,
        });
        setSocket(newSocket);

        // Set user ID and mark user as online globally
        newSocket.emit('setUserId', currentUserId);
        newSocket.emit('userOnline', currentUserId);
        newSocket.emit('joinOnetoOneChat', { 
            user1: currentUserId, 
            user2: receiverId 
        });

        // Fetch messages and receiver info
        fetchData();

        // Socket event listeners
        newSocket.on('receiveOnetoOneMessage', (message) => {
            console.log('📩 New one-to-one message received:', message);
            setMessages((prevMessages) => [...prevMessages, message]);
        });

        // Listen for global online users updates
        newSocket.on('onlineUsersUpdate', (onlineUsersList) => {
            console.log('Global online users updated:', onlineUsersList);
            setGlobalOnlineUsers(onlineUsersList || []);
            // Check if receiver is online
            const isOnline = onlineUsersList.includes(receiverId);
            setIsReceiverOnline(isOnline);
        });

        newSocket.on('userOnlineStatus', ({ userId, isOnline }) => {
            if (userId === receiverId) {
                setIsReceiverOnline(isOnline);
            }
        });

        newSocket.on('joinedOnetoOneChat', (data) => {
            console.log('Successfully joined one-to-one chat:', data);
        });

        newSocket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        return () => {
            if (newSocket) {
                newSocket.emit('leaveOnetoOneChat', { 
                    user1: currentUserId, 
                    user2: receiverId 
                });
                newSocket.emit('userOffline', currentUserId);
                newSocket.disconnect();
            }
        };
    }, [receiverId, token, currentUserId, navigate]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchData = async () => {
        try {
            setLoading(true);
            console.log('Fetching one-to-one messages for receiverId:', receiverId);
            
            const messagesRes = await axios.get(`${Base_url}/chats/onetoone/${receiverId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Messages data:', messagesRes.data);
            setMessages(messagesRes.data.messages || []);

            // If we don't have receiver data from navigation, fetch it
            if (!receiverInfo) {
                try {
                    const userRes = await axios.get(`${Base_url}/users/all`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const receiver = userRes.data.users?.find(user => user._id === receiverId);
                    if (receiver) {
                        setReceiverInfo(receiver);
                    }
                } catch (userError) {
                    console.error('Error fetching receiver info:', userError);
                }
            }

            setLoading(false);
        } catch (error) {
            console.error('Fetch error:', error);
            setError('Failed to load chat data. Please try again.');
            setLoading(false);
        }
    };

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

            console.log('Sending one-to-one message:', { 
                sender: currentUserId, 
                receiver: receiverId, 
                content: newMessage 
            });

            socket.emit('sendOnetoOneMessage', {
                sender: currentUserId,
                receiver: receiverId,
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
            {/* Chat Header */}
            <div className="onetoone-header">
                <button className="back-button" onClick={() => navigate(-1)}>
                    <FaArrowLeft size={20} />
                </button>
                <div className="user-avatar-container">
                    <div className="user-avatar" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                        {receiverInfo?.avatar ? (
                            <img src={receiverInfo.avatar} alt={receiverInfo.name} />
                        ) : (
                            receiverInfo?.name?.charAt(0).toUpperCase() || <FaUser />
                        )}
                    </div>
                    <div className={`status-dot ${isReceiverOnline ? 'online' : 'offline'}`}></div>
                </div>
                <div className="header-info">
                    <h2>{receiverInfo?.name || 'User'}</h2>
                    <p>{isReceiverOnline ? 'Online' : 'Last seen recently'}</p>
                </div>
            </div>

            {/* Messages */}
            <div className="messages-container" ref={messagesContainerRef} style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '16px',
                background: '#e5ddd5',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03' fill-rule='evenodd'%3E%3Cpath d='m0 40l40-40h-40v40zm40 0v-40h-40l40 40z'/%3E%3C/g%3E%3C/svg%3E")`
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
                        <FaUser size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    <div className="messages-list">
                        {messages.map((message) => (
                            <div
                                key={message._id}
                                className={`message-item ${String(message.sender._id) === currentUserId ? 'sent' : 'received'}`}
                                style={{
                                    display: 'flex',
                                    marginBottom: '8px',
                                    justifyContent: String(message.sender._id) === currentUserId ? 'flex-end' : 'flex-start'
                                }}
                            >
                                <div 
                                    className="message-bubble"
                                    style={{
                                        maxWidth: '70%',
                                        padding: '8px 12px',
                                        borderRadius: '18px',
                                        background: String(message.sender._id) === currentUserId ? '#dcf8c6' : '#ffffff',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                        position: 'relative'
                                    }}
                                >
                                    {message.message && (
                                        <p className="message-text" style={{
                                            margin: '0 0 4px 0',
                                            fontSize: '14px',
                                            lineHeight: '1.4',
                                            color: '#111b21',
                                            wordWrap: 'break-word'
                                        }}>
                                            {message.message}
                                        </p>
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
                                    <span 
                                        className="message-time"
                                        style={{
                                            fontSize: '11px',
                                            color: '#667781',
                                            float: 'right',
                                            marginTop: '2px'
                                        }}
                                    >
                                        {new Date(message.createdAt).toLocaleTimeString([], { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        })}
                                    </span>
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
                {/* Emoji Picker */}
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
                        padding: '4px'
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
                        <FaSmile className="emoji-icon" />
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
                            fontSize: '14px',
                            background: 'transparent'
                        }}
                    />
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim() || sendingMessage}
                        style={{
                            background: newMessage.trim() ? '#075e54' : '#8696a0',
                            border: 'none',
                            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                            padding: '8px',
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
                            <FaPaperPlane className="send-icon" />
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default OnetoOneliveChat;