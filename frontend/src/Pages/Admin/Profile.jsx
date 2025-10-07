import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaUser, FaSignOutAlt, FaArrowLeft, FaCamera, FaEdit, FaUsers, FaUserPlus, FaUserCheck, FaComments, FaDoorOpen, FaHeart, FaExclamationTriangle, FaTimes } from "react-icons/fa";
import "./profile.css";
import Base_url from "../config";

const Profile = () => {
  const navigate = useNavigate();
  const accessToken = sessionStorage.getItem("accessToken");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    phone: "",
    gender: "",
    dob: ""
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({
    reason: ""
  });
  const [reportImage, setReportImage] = useState(null);
  const [reportPreview, setReportPreview] = useState(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    getYourProfile();
  }, []);

  useEffect(() => {
    // Reset image loaded state when avatar changes
    if (profile?.avatar) {
      setImageLoaded(false);
    }
  }, [profile?.avatar]);

  const getYourProfile = async () => {
    try {
      setLoading(true);
      const url = `${Base_url}/users/me`;
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      const response = await axios.get(url, { headers });
      console.log("response of api", response.data);
      console.log("User avatar:", response.data.user?.avatar);
      console.log("User gender:", response.data.user?.gender);
      setProfile(response.data.user);
      // Reset image loaded state for new avatar
      setTimeout(() => {
        setImageLoaded(false);
      }, 100);
      setEditData({
        name: response.data.user.name || "",
        phone: response.data.user.phone || "",
        gender: response.data.user.gender || "",
        dob: response.data.user.dob ? new Date(response.data.user.dob).toISOString().split('T')[0] : ""
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Call logout API
      const url = `${Base_url}/auth/logout`;
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };
      
      await axios.post(url, {}, { headers });
      console.log("Logout successful");
    } catch (error) {
      console.error("Logout API error:", error);
      // Continue with logout even if API fails
    } finally {
      // Clear session and redirect
      sessionStorage.clear();
      navigate("/");
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData({
      ...editData,
      [name]: value
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        e.target.value = '';
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size too large. Please select an image smaller than 5MB');
        e.target.value = '';
        return;
      }
      
      setSelectedFile(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Automatically upload the photo
      await handlePhotoUpload(file);
    }
  };

  const handlePhotoUpload = async (file) => {
    try {
      setUploadingPhoto(true);
      const url = `${Base_url}/users/me`;
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('avatar', file);

      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      console.log('Uploading photo automatically...');
      const response = await axios.put(url, formData, { headers });
      console.log('Photo upload response:', response.data);
      
      // Update profile state with new data
      const updatedUser = response.data.user;
      console.log('Updated user data:', updatedUser);
      console.log('New avatar path:', updatedUser.avatar);
      
      setProfile(updatedUser);
      setSelectedFile(null);
      setPreviewUrl(null);
      
      // Force image reload with cache bust
      setTimeout(() => {
        setImageLoaded(false);
        setProfile(prev => ({ ...prev, avatar: `${updatedUser.avatar}?refresh=${Date.now()}` }));
        setTimeout(() => {
          setImageLoaded(true);
        }, 200);
      }, 100);
      
      alert("Profile photo updated successfully!");
    } catch (error) {
      console.error('Photo upload error:', error);
      
      if (error.response?.status === 413) {
        alert("File size too large. Please select a smaller image (max 5MB).");
      } else if (error.response?.status === 400) {
        alert(error.response?.data?.message || "Invalid image file");
      } else if (error.response?.status === 401) {
        alert("Session expired. Please login again.");
        sessionStorage.clear();
        navigate("/");
      } else {
        alert(error.response?.data?.message || "Error uploading photo. Please try again.");
      }
      
      // Reset file selection on error
      setSelectedFile(null);
      setPreviewUrl(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCameraClick = () => {
    document.getElementById('avatar-input').click();
  };

  const handleSaveProfile = async () => {
    try {
      const url = `${Base_url}/users/me`;
      
      // Create FormData for file upload
      const formData = new FormData();
      
      // Only append non-empty values
      if (editData.name && editData.name.trim()) {
        formData.append('name', editData.name.trim());
      }
      if (editData.phone && editData.phone.trim()) {
        formData.append('phone', editData.phone.trim());
      }
      if (editData.gender && editData.gender.trim()) {
        formData.append('gender', editData.gender.trim());
      }
      if (editData.dob && editData.dob.trim()) {
        formData.append('dob', editData.dob.trim());
      }
      
      // Add avatar file if selected
      if (selectedFile) {
        formData.append('avatar', selectedFile);
        console.log('Avatar file selected:', selectedFile.name, 'Size:', selectedFile.size);
      }

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        // Don't set Content-Type for FormData, let browser set it with boundary
      };

      console.log('Sending profile update request...');
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }
      
      const response = await axios.put(url, formData, { headers });
      console.log('Profile update response:', response.data);
      console.log('Updated user gender:', response.data.user?.gender);
      
      // Update profile state with new data
      setProfile(response.data.user);
      
      // Update editData with new values
      setEditData({
        name: response.data.user.name || "",
        phone: response.data.user.phone || "",
        gender: response.data.user.gender || "",
        dob: response.data.user.dob ? new Date(response.data.user.dob).toISOString().split('T')[0] : ""
      });
      
      setIsEditing(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      
      // Update session storage if name changed
      if (response.data.user.name) {
        sessionStorage.setItem('userName', response.data.user.name);
      }
      
      alert("Profile updated successfully!");
    } catch (error) {
      console.error('Profile update error:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.status === 413) {
        alert("File size too large. Please select a smaller image (max 5MB).");
      } else if (error.response?.status === 400) {
        alert(error.response?.data?.message || "Invalid data provided");
      } else if (error.response?.status === 401) {
        alert("Session expired. Please login again.");
        sessionStorage.clear();
        navigate("/");
      } else {
        alert(error.response?.data?.message || "Error updating profile. Please try again.");
      }
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  const handleReportClick = () => {
    setShowReportModal(true);
  };

  const handleReportInputChange = (e) => {
    const { name, value } = e.target;
    setReportData({
      ...reportData,
      [name]: value
    });
  };

  const handleReportImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        e.target.value = '';
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size too large. Please select an image smaller than 5MB');
        e.target.value = '';
        return;
      }
      
      setReportImage(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setReportPreview(url);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportData.reason.trim()) {
      alert('Please enter a reason for your complaint');
      return;
    }

    try {
      setSubmittingReport(true);
      const url = `${Base_url}/complaints`;
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('reason', reportData.reason.trim());
      
      // Add image if selected
      if (reportImage) {
        formData.append('evidence', reportImage);
      }

      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      console.log('Submitting complaint...');
      const response = await axios.post(url, formData, { headers });
      console.log('Complaint response:', response.data);
      
      // Reset form and close modal
      setReportData({ reason: "" });
      setReportImage(null);
      setReportPreview(null);
      setShowReportModal(false);
      
      alert("Complaint submitted successfully! We will review it soon.");
    } catch (error) {
      console.error('Complaint submission error:', error);
      
      if (error.response?.status === 413) {
        alert("File size too large. Please select a smaller image (max 5MB).");
      } else if (error.response?.status === 400) {
        alert(error.response?.data?.message || "Invalid data provided");
      } else if (error.response?.status === 401) {
        alert("Session expired. Please login again.");
        sessionStorage.clear();
        navigate("/");
      } else {
        alert(error.response?.data?.message || "Error submitting complaint. Please try again.");
      }
    } finally {
      setSubmittingReport(false);
    }
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setReportData({ reason: "" });
    setReportImage(null);
    setReportPreview(null);
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Header with Back Button */}
      <div className="profile-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft size={20} />
        </button>
        <h1>My Profile</h1>
        <div style={{ width: '36px' }}></div>
      </div>

      {/* Profile Header Section */}
      <div className="profile-header-section">
        <div className="profile-avatar-container">
          <div className="profile-avatar-large" style={{ position: 'relative' }}>
            {uploadingPhoto && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  borderTopColor: 'white',
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
            )}
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Profile Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '50%'
                }}
              />
            ) : profile?.avatar ? (
              <img 
                src={profile.avatar.startsWith('http') ? profile.avatar : `https://lastchat-o1as.onrender.com${profile.avatar}?t=${Date.now()}`} 
                alt="Profile" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '50%',
                  display: 'block'
                }}
                onError={(e) => {
                  console.log('Avatar image failed to load:', profile.avatar);
                  e.target.style.display = 'none';
                  setImageLoaded(false);
                }}
                onLoad={(e) => {
                  console.log('Avatar image loaded successfully:', profile.avatar);
                  setImageLoaded(true);
                }}
              />
            ) : null}
            <span 
              className="avatar-initials" 
              style={{ 
                display: (profile?.avatar && imageLoaded && !previewUrl) ? 'none' : 'flex',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                fontWeight: 'bold',
                color: 'white',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                zIndex: 1
              }}
            >
              {getInitials(profile?.name)}
            </span>
          </div>
          <button 
            className="camera-button" 
            onClick={handleCameraClick}
            disabled={uploadingPhoto}
            style={{
              opacity: uploadingPhoto ? 0.6 : 1,
              cursor: uploadingPhoto ? 'not-allowed' : 'pointer'
            }}
          >
            {uploadingPhoto ? (
              <div className="upload-spinner" style={{
                width: '14px',
                height: '14px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '50%',
                borderTopColor: 'white',
                animation: 'spin 1s linear infinite'
              }}></div>
            ) : (
              <FaCamera size={14} />
            )}
          </button>
          <input
            id="avatar-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploadingPhoto}
            style={{ display: 'none' }}
          />
        </div>

        <div className="profile-name-id">
          <h2 className="profile-display-name">{profile?.name || "User"}</h2>
          <p className="profile-id">ID: {profile?.customerId || 'N/A'}</p>
        </div>

        

        <div className="profile-actions">
          <button className="chat-button">
            <FaComments /> Chat
          </button>
          <button className="report-button" onClick={handleReportClick}>
            <FaExclamationTriangle /> Report
          </button>
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* Profile Info Section */}
      <div className="profile-info-section">
        <div className="section-header">
          <h3>Profile Information</h3>
          <button className="edit-button" onClick={handleEditToggle}>
            <FaEdit /> {isEditing ? "Cancel" : "Edit"}
          </button>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Name</span>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={editData.name}
                onChange={handleInputChange}
                className="edit-input"
              />
            ) : (
              <span className="info-value">{profile?.name || "Not set"}</span>
            )}
          </div>

          <div className="info-item">
            <span className="info-label">Phone</span>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={editData.phone}
                onChange={handleInputChange}
                className="edit-input"
              />
            ) : (
              <span className="info-value">{profile?.phone || "Not set"}</span>
            )}
          </div>

          <div className="info-item">
            <span className="info-label">Gender</span>
            {isEditing ? (
              <select
                name="gender"
                value={editData.gender}
                onChange={handleInputChange}
                className="edit-input"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            ) : (
              <span className="info-value">{profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : "Not set"}</span>
            )}
          </div>

          <div className="info-item">
            <span className="info-label">Date of Birth</span>
            {isEditing ? (
              <input
                type="date"
                name="dob"
                value={editData.dob}
                onChange={handleInputChange}
                className="edit-input"
              />
            ) : (
              <span className="info-value">
                {profile?.dob ? new Date(profile.dob).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit', 
                  year: 'numeric'
                }) : "Not set"}
              </span>
            )}
          </div>

          <div className="info-item">
            <span className="info-label">Email</span>
            <span className="info-value">{profile?.email || "Not set"}</span>
          </div>
        </div>

        {isEditing && (
          <button className="save-button" onClick={handleSaveProfile}>
            Save Changes
          </button>
        )}
      </div>

      {/* Rooms Section */}
      {/* <div className="profile-rooms-section">
        <div className="section-header">
          <h3>Rooms</h3>
        </div>
        
        <div className="rooms-stats">
          <div className="room-stat">
            <FaDoorOpen className="room-stat-icon" />
            <div className="room-stat-content">
              <span className="room-stat-number">14</span>
              <span className="room-stat-label">Joined Rooms</span>
            </div>
          </div>
          
          <div className="room-stat">
            <FaHeart className="room-stat-icon" />
            <div className="room-stat-content">
              <span className="room-stat-number">206</span>
              <span className="room-stat-label">Followed Rooms</span>
            </div>
          </div>
        </div>
      </div> */}

      {/* Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={closeReportModal}>
          <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submit Complaint</h3>
              <button className="close-modal" onClick={closeReportModal}>
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="reason">Reason for Complaint *</label>
                <textarea
                  id="reason"
                  name="reason"
                  value={reportData.reason}
                  onChange={handleReportInputChange}
                  placeholder="Please describe your complaint in detail..."
                  rows="4"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="evidence">Evidence (Optional)</label>
                <input
                  id="evidence"
                  type="file"
                  accept="image/*"
                  onChange={handleReportImageChange}
                  className="file-input"
                />
                {reportPreview && (
                  <div className="image-preview">
                    <img src={reportPreview} alt="Evidence Preview" />
                    <button 
                      type="button" 
                      onClick={() => {
                        setReportImage(null);
                        setReportPreview(null);
                      }}
                      className="remove-image"
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="cancel-btn" onClick={closeReportModal}>
                Cancel
              </button>
              <button 
                className="submit-btn" 
                onClick={handleSubmitReport}
                disabled={submittingReport || !reportData.reason.trim()}
              >
                {submittingReport ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;