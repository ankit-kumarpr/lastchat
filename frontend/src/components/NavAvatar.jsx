import React, { useState, useEffect } from "react";
import { Avatar, Menu, MenuItem, IconButton, Typography } from "@mui/material";
import { Logout, Person } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function NavAvatar() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [userName, setUserName] = useState(""); // Store user name
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user data (from localStorage, session, or API)
    const user = sessionStorage.getItem("name") || { name: "User" };
    const firstChar = userName.charAt(0).toUpperCase();

    setUserName(firstChar);
  }, []);

  // Open menu
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Close menu
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

const Logoutuser=()=>{
  navigate('/');
}

  // Logout function
  // const Logoutuser = async () => {
  //   try {
  //     const url = "http://localhost:5000/hr/admin/logout";
  //     const headers = {
  //       "Content-Type": "application/json",
  //       Accept: "application/json",
  //     };

  //     const response = await axios.post(url, { headers });
  //     console.log("logout", response);

  //     // Clear user data
  //     // sessionStorage.removeItem("name");
  //     sessionStorage.removeItem("accessToken");
  //     sessionStorage.removeItem("userRole");

  //     handleMenuClose();
  //     navigate("/");
  //   } catch (error) {
  //     console.log(error);
  //   }
  // };

  return (
    <div>
      {/* Avatar Button to Open Menu */}
      <IconButton onClick={handleMenuOpen} style={{ padding: "20px" }}>
        <Avatar>{userName}</Avatar>
      </IconButton>

      {/* MUI Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        keepMounted
      >
        {/* Profile Option */}
        <MenuItem onClick={handleMenuClose}>
          <Person sx={{ marginRight: 1 }} />
          <Typography>My Profile</Typography>
        </MenuItem>

        {/* Logout Option */}
        <MenuItem onClick={Logoutuser}>
          <Logout sx={{ marginRight: 1, color: "red" }} />
          <Typography color="error">Sign Out</Typography>
        </MenuItem>
      </Menu>
    </div>
  );
}

export default NavAvatar;
