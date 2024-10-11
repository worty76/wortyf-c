import React, { createContext, useContext, useEffect, useState } from "react";
import auth from "../helpers/Auth";
import axios from "axios";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState("");
  const [chats, setChats] = useState();
  const [notification, setNotification] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messageNotification, setMessageNotification] = useState([]);

  useEffect(() => {
    if (isLoggedIn || auth.isAuthenticated()) {
      const fetchChats = async () => {
        const config = {
          headers: {
            Authorization: `Bearer ${JSON.parse(auth.isAuthenticated().token)}`,
          },
        };
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API}/api/notification`,
            config
          );
          setChats(response.data.chats);
          setNotification(response.data.notifications);
        } catch (error) {
          console.log(error);
        }
      };

      fetchChats();
    }
    console.log("Chat's states are ready");
  }, [isLoggedIn]);

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,
        chats,
        setChats,
        notification,
        setNotification,
        setIsLoggedIn,
        messageNotification,
        setMessageNotification,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;
