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

const GroupChat = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const token = sessionStorage.getItem('accessToken');
    const userId = sessionStorage.getItem('userId');
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
    const messagesEndRef = useRef();
    const messagesContainerRef = useRef();

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
                
                // First, try to join the room to ensure user is a participant
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

                // Set user ID for socket and join group
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

        // Socket event listeners
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
                        <FaUsers />
                    </div>
                    <div className="status-dot online"></div>
                </div>
                <div className="header-info">
                    <h2>{group?.name}</h2>
                    <p>{group?.users?.length || 0} members</p>
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
                    padding: '8px 16px',
                    height: '80px',
                    overflowX: 'auto',
                    overflowY: 'hidden'
                }}>
                    <div className="members-header" style={{
                        marginBottom: '8px'
                    }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#075e54'
                        }}>All Members ({group?.users?.length || 0})</h3>
                    </div>
                    {/* Show all group members in horizontal slider */}
                    {group?.users && group.users.length > 0 ? (
                        <div className="members-slider" style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            height: '50px',
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            paddingBottom: '4px'
                        }}>
                            {group.users.map((member) => {
                                const isOnline = onlineUsers.some(onlineUser => onlineUser._id === member._id);
                                return (
                                    <div key={member._id} className="member-slide" style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        minWidth: '50px',
                                        padding: '4px',
                                        background: 'white',
                                        borderRadius: '8px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s'
                                    }}>
                                        <div className="member-avatar-small" style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            marginBottom: '2px',
                                            position: 'relative'
                                        }}>
                                            {member.name?.charAt(0).toUpperCase()}
                                            {isOnline && (
                                                <div className="online-indicator-small" style={{
                                                    position: 'absolute',
                                                    bottom: '-1px',
                                                    right: '-1px',
                                                    width: '8px',
                                                    height: '8px',
                                                    background: '#25d366',
                                                    borderRadius: '50%',
                                                    border: '1px solid white'
                                                }}></div>
                                            )}
                                        </div>
                                        <span className="member-name-small" style={{
                                            fontSize: '9px',
                                            fontWeight: '500',
                                            color: '#111b21',
                                            textTransform: 'capitalize',
                                            textAlign: 'center',
                                            lineHeight: '1',
                                            maxWidth: '45px',
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
                            padding: '10px',
                            color: '#667781'
                        }}>
                            <p style={{ margin: 0, fontSize: '12px' }}>No members found</p>
                        </div>
                    )}
                </div>
            )}

            {/* Messages */}
            <div className="messages-container" ref={messagesContainerRef} style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '16px',
                background: '#000',
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
                                    justifyContent: String(message.sender._id) === userId ? 'flex-end' : 'flex-start'
                                }}
                            >
                                {/* Show sender avatar for received messages in group chat */}
                                {String(message.sender._id) !== userId && (
                                    <div className="sender-avatar" style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        marginRight: '8px',
                                        alignSelf: 'flex-end'
                                    }}>
                                        {message.sender.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                
                                <div 
                                    className="message-bubble"
                                    style={{
                                        maxWidth: '70%',
                                        padding: '8px 12px',
                                        borderRadius: '18px',
                                        background: String(message.sender._id) === userId ? '#dcf8c6' : '#ffffff',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                        position: 'relative'
                                    }}
                                >
                                    {/* Show sender name for received messages in group chat */}
                                    {String(message.sender._id) !== userId && (
                                        <span className="sender-name" style={{ 
                                            fontSize: '12px',
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

export default GroupChat;