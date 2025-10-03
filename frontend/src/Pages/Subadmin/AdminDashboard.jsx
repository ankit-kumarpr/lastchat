import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserPlus,
  FaUsers,
  FaUserCog,
  FaChartLine,
  FaCog,
  FaSignOutAlt,
  FaExclamationTriangle,
} from "react-icons/fa";
import logo from '../../images/Infun-logo.png';
import "../Admin/admin.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const userName = sessionStorage.getItem('userName') || 'Admin';
  
  // Get first letter of username for avatar
  const getAvatarLetter = () => {
    return userName.charAt(0).toUpperCase();
  };

  const tiles = [
    // {
    //   title: 'Add Admin',
    //   icon: <FaUserPlus className="tile-icon" />,
    //   gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    //   action: () => navigate('/register-admin')
    // },
    {
      title: "View Groups",
      icon: <FaUsers className="tile-icon" />,
      gradient: "linear-gradient(135deg, #a6c1ee 0%, #fbc2eb 100%)",
      action: () => navigate("/create-group"),
    },
    {
      title: "Profile",
      icon: <FaUserCog className="tile-icon" />,
      gradient: "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)",
      action: () => navigate("/profile"),
    },
    {
      title: "View Users",
      icon: <FaChartLine className="tile-icon" />,
      gradient: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
      action: () => navigate("/add-users"),
    },
    {
      title: "Complaints",
      icon: <FaExclamationTriangle className="tile-icon" />,
      gradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
      action: () => navigate("/complaints"),
    },
    // {
    //   title: 'Settings',
    //   icon: <FaCog className="tile-icon" />,
    //   gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    //   action: () => navigate('/settings')
    // },
    // {
    //   title: 'Logout',
    //   icon: <FaSignOutAlt className="tile-icon" />,
    //   gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    //   action: () => {
    //     sessionStorage.clear();
    //     navigate('/');
    //   }
    // }
  ];

  return (
    <div className="super-admin-dashboard">
      {/* Header with Logo */}
      <div className="dashboard-header">
        <div className="header-left">
          <img src={logo} alt="Infun India Logo" className="header-logo" />
        </div>
        <div className="header-right">
          <div className="user-avatar">
            <span className="avatar-letter">{getAvatarLetter()}</span>
          </div>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="welcome-section">
        <h1>Admin Portal</h1>
        <p>Manage your administration with ease</p>
      </div>

      <div className="dashboard-tiles">
        {tiles.map((tile, index) => (
          <div
            key={index}
            className="dashboard-tile"
            onClick={tile.action}
            style={{ background: tile.gradient }}
          >
            <div className="tile-content">
              {tile.icon}
              <h3>{tile.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
