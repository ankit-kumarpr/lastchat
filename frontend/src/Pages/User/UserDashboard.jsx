import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUsers, FaSearch, FaTimes, FaUserCircle, FaPlus, FaTimesCircle } from 'react-icons/fa';
import Base_url from '../config';
import logo from '../../images/Infun-logo.png'; 
// import robot from '.'
import './user.css';

const UserDashboard = () => {
    const token = sessionStorage.getItem('accessToken');
    const userId = sessionStorage.getItem('userId');
    const userName = sessionStorage.getItem('userName') || 'User';
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createRoomData, setCreateRoomData] = useState({
        name: '',
        roomId: ''
    });
    const [creatingRoom, setCreatingRoom] = useState(false);

    useEffect(() => {
        getRooms();
        // In a real app, you would fetch user profile from API
        // For now, we'll just use the first letter of the username
    }, []);

    const getRooms = async () => {
        try {
            setLoading(true);
            const url = `${Base_url}/rooms`;
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            };
            const response = await axios.get(url, { headers });
            console.log("response of api", response.data);
            setRooms(response.data.rooms || response.data || []);
        } catch (error) {
            console.log("Error fetching rooms:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = (roomId) => {
        console.log("Joining room with ID:", roomId);
        navigate(`/group-chat/${roomId}`);
    };

    const handleCreateRoom = async () => {
        if (!createRoomData.name.trim()) {
            alert('Please enter a room name');
            return;
        }

        try {
            setCreatingRoom(true);
            const url = `${Base_url}/rooms`;
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            };

            const requestBody = {
                name: createRoomData.name.trim(),
                roomId: createRoomData.roomId.trim() || undefined // Let backend generate if empty
            };

            const response = await axios.post(url, requestBody, { headers });
            console.log("Room created:", response.data);
            
            // Reset form and close modal
            setCreateRoomData({ name: '', roomId: '' });
            setShowCreateModal(false);
            
            // Refresh rooms list
            await getRooms();
            
            alert('Room created successfully!');
        } catch (error) {
            console.log("Error creating room:", error);
            alert(error.response?.data?.message || 'Error creating room');
        } finally {
            setCreatingRoom(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCreateRoomData({
            ...createRoomData,
            [name]: value
        });
    };

    const filteredRooms = rooms.filter(room =>
        room.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room._id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get first letter of username for avatar
    const getAvatarLetter = () => {
        return userName.charAt(0).toUpperCase();
    };

    return (
        <div className="user-dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-left">
                    <img src={logo} alt="Infun India Logo" className="header-logo" />
                </div>
                <div className="header-right">
                    <div className="user-avatar">
                        {userProfile ? (
                            <img src={userProfile} alt="User Profile" />
                        ) : (
                            <span className="avatar-letter">{getAvatarLetter()}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Welcome Message */}
            


            {/* Search */}
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Search rooms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <FaTimes 
                        className="clear-search" 
                        onClick={() => setSearchTerm('')} 
                    />
                )}
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="rooms-section">
                    <div className="rooms-header">
                        <h3>Available Rooms ({filteredRooms.length})</h3>
                        <button 
                            className="create-room-btn-small"
                            onClick={() => setShowCreateModal(true)}
                            title="Create Room"
                        >
                            <FaPlus />
                        </button>
                    </div>
                    {filteredRooms.length > 0 ? (
                        <div className="rooms-grid">
                            {filteredRooms.map((room) => (
                                <div 
                                    key={room._id} 
                                    className="room-tile"
                                    onClick={() => handleJoinRoom(room._id)}
                                >
                                    <div className="room-icon">
                                        <FaUsers size={24} />
                                    </div>
                                    <div className="room-info">
                                        <h4 className="room-name">{room.name}</h4>
                                        <p className="room-id">ID: {room.roomId?.substring(0, 8)}...</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-rooms">
                            <FaUsers size={40} />
                            <p>No rooms found</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Room Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="create-room-modal">
                        <div className="modal-header">
                            <h3>Create New Room</h3>
                            <button 
                                className="close-modal"
                                onClick={() => setShowCreateModal(false)}
                            >
                                <FaTimesCircle />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="form-group">
                                <label htmlFor="roomName">Room Name *</label>
                                <input
                                    type="text"
                                    id="roomName"
                                    name="name"
                                    placeholder="Enter room name..."
                                    value={createRoomData.name}
                                    onChange={handleInputChange}
                                    className="form-input"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="roomId">Room ID (Optional)</label>
                                <input
                                    type="text"
                                    id="roomId"
                                    name="roomId"
                                    placeholder="Enter custom room ID..."
                                    value={createRoomData.roomId}
                                    onChange={handleInputChange}
                                    className="form-input"
                                />
                                <small className="form-help">
                                    Leave empty to auto-generate
                                </small>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                className="cancel-btn"
                                onClick={() => setShowCreateModal(false)}
                                disabled={creatingRoom}
                            >
                                Cancel
                            </button>
                            <button 
                                className="create-btn"
                                onClick={handleCreateRoom}
                                disabled={creatingRoom || !createRoomData.name.trim()}
                            >
                                {creatingRoom ? (
                                    <>
                                        <div className="spinner-small"></div>
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <FaPlus />
                                        Create Room
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;