import React, { useState, forwardRef, useEffect } from "react";
import {
  Navbar as MTNavbar,
  Collapse,
  Button,
  IconButton,
  Typography,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
  Avatar,
} from "@material-tailwind/react";
import {
  RectangleStackIcon,
  UserCircleIcon,
  HomeIcon,
  XMarkIcon,
  Bars3Icon,
  PowerIcon,
} from "@heroicons/react/24/solid";
import { useNavigate, Link } from "react-router-dom";
import auth from "../helpers/Auth";
import { ChatState } from "../context/ChatProvider";
import moment from "moment";
import axios from "axios";
import { useSocket } from "../context/SocketProvider";

const NAV_MENU = [
  {
    name: "Home",
    url: "/home",
  },
];

const NavItem = forwardRef(({ children, onClick, href, className }, ref) => (
  <Typography
    variant="paragraph"
    color="gray"
    className={`flex items-center gap-2 font-medium text-gray-900 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis ${className}`}
    onClick={onClick}
    ref={ref}
  >
    {children}
  </Typography>
));

const profileMenuItems = [
  {
    label: "My Profile",
    icon: UserCircleIcon,
  },
  {
    label: "Sign Out",
    icon: PowerIcon,
  },
];

const ProfileMenu = ({ isMenuOpen, setIsMenuOpen, closeMenu, user }) => {
  const navigate = useNavigate();

  return (
    <Menu
      id="user-profile"
      open={isMenuOpen}
      handler={setIsMenuOpen}
      placement="bottom-end"
    >
      <MenuHandler id="user-profile">
        <Button
          variant="text"
          color="blue-gray"
          className="flex items-center rounded-full py-0 pr-0 pl-0 lg:ml-auto"
        >
          <Avatar
            variant="circular"
            size="sm"
            alt="tania andrew"
            className="border border-gray-900 p-0.5"
            src={user && user.avatar_url}
          />
        </Button>
      </MenuHandler>
      <MenuList className="p-1">
        {profileMenuItems.map(({ label, icon }, key) => {
          const isLastItem = key === profileMenuItems.length - 1;
          return (
            <MenuItem
              key={label}
              onClick={() => {
                if (label === "My Profile") {
                  navigate(`/profile/${user._id}`);
                }
                if (label === "Sign Out") {
                  auth.clearJwt(() => {
                    navigate(`sign-in`);
                  });
                  navigate(0);
                }
                closeMenu();
              }}
              className={`flex items-center gap-2 rounded ${
                isLastItem
                  ? "hover:bg-red-500/10 focus:bg-red-500/10 active:bg-red-500/10"
                  : ""
              }`}
            >
              {React.createElement(icon, {
                className: `h-4 w-4 ${isLastItem ? "text-red-500" : ""}`,
                strokeWidth: 2,
              })}
              <Typography
                as="span"
                variant="small"
                className="font-normal"
                color={isLastItem ? "red" : "inherit"}
              >
                {label}
              </Typography>
            </MenuItem>
          );
        })}
      </MenuList>
    </Menu>
  );
};

export const Appbar = () => {
  const { socket } = useSocket();
  const user = auth.isAuthenticated().user;
  const [open, setOpen] = useState(false);
  const [openPagesMenu, setOpenPagesMenu] = useState(false);
  const [openMenuNotification, setOpenMenuNotification] = useState(false);
  const [openMenuMessage, setOpenMenuMessage] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [openPagesMenuMobile, setOpenPagesMenuMobile] = useState(false);
  const {
    setSelectedChat,
    messageNotification,
    setMessageNotification,
    // setIsLoggedIn,
    setNotification,
    notification,
  } = ChatState();
  const navigate = useNavigate();
  const closeMenu = () => setIsMenuOpen(false);
  const closeNotification = () => setOpenMenuNotification(false);
  const closeMessage = () => setOpenMenuMessage(false);

  const pages = {
    user: [
      { name: "Guardians", URL: "guardians" },
      { name: "Chat", URL: "chat" },
    ],
    admin: [
      { name: "Guardians", URL: "guardians" },
      { name: "Chat", URL: "chat" },
      { name: "Manage", URL: "admin/manage" },
    ],
    moderator: [
      { name: "Guardians", URL: "guardians" },
      { name: "Chat", URL: "chat" },
      { name: "In approval", URL: "moderator/approve" },
      { name: "Reports", URL: "moderator/report" },
      { name: "Tags", URL: "tags" },
    ],
  };

  const getPagesForRole = () => {
    if (user && user.role === "admin") return pages.admin;
    if (user && user.role === "moderator") return pages.moderator;
    return pages.user;
  };

  const notificationLength = (notification) => {
    return notification.filter((noti) => noti.isRead === false).length;
  };

  const handleOpen = () => setOpen((cur) => !cur);
  const handleOpenNotification = () => setOpenMenuNotification((cur) => !cur);
  const handleOpenMessage = () => setOpenMenuMessage((cur) => !cur);

  const read = async (notification) => {
    let config = {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + JSON.parse(auth.isAuthenticated().token),
      },
    };
    await axios
      .put(
        `${process.env.REACT_APP_API}/api/notification/read`,
        {
          notificationId: notification._id,
        },
        config
      )
      .then((data) => {
        console.log(data);
        closeNotification();
        setNotification((prevNotifications) =>
          prevNotifications.map((n) =>
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
      });
  };

  useEffect(() => {
    if (socket) {
      socket.on("message received", (newMessageReceived) => {
        if (!messageNotification.includes(newMessageReceived)) {
          console.log(newMessageReceived);
          setMessageNotification([newMessageReceived, ...messageNotification]);
        }
      });

      socket.on("notification", (noti) => {
        console.log(noti);
        setNotification([noti, ...notification]);
      });

      return () => {
        socket.off("message received");
        socket.off("notification");
      };
    }
  });

  return (
    <MTNavbar
      shadow={false}
      fullWidth
      className="border-0 sticky top-0 z-50 bg-white/80 backdrop-blur-md backdrop-saturate-200"
    >
      <div className="relative container mx-auto flex items-center justify-between">
        <div className="flex-1">
          <Typography
            component={Link}
            onClick={() => navigate("/")}
            color="blue-gray"
            className="text-xl font-bold cursor-pointer hover:text-primary transition-colors"
          >
            WortyF
          </Typography>
        </div>

        <ul className="flex-1 hidden items-center gap-6 lg:flex w-full justify-center">
          {NAV_MENU.map(({ name, url }) => (
            <NavItem
              key={name}
              onClick={() => navigate(url)}
              className="hover:text-primary transition-all duration-300 px-3 py-1 rounded-full hover:bg-gray-100"
            >
              {name}
            </NavItem>
          ))}
          {getPagesForRole().map(({ name, URL }) => (
            <NavItem
              key={name}
              onClick={() => navigate(`/${URL}`)}
              className="hover:text-primary transition-all duration-300 px-3 py-1 rounded-full hover:bg-gray-100"
            >
              {name}
            </NavItem>
          ))}
        </ul>

        <div className="flex-1 hidden items-center gap-4 lg:flex justify-end">
          {!user && (
            <>
              <Button
                variant="text"
                onClick={() => navigate(`/sign-in`)}
                className="hover:bg-gray-100 transition-all duration-300"
              >
                Sign In
              </Button>

              <Button
                className="bg-primary hover:bg-primary/90 transition-all duration-300 shadow-md hover:shadow-lg"
                onClick={() => navigate(`/sign-up`)}
              >
                Sign Up
              </Button>
            </>
          )}

          {user && (
            <div className="flex flex-row gap-4 items-center">
              {/* MESSAGE */}
              <div class="relative inline-block">
                <IconButton
                  variant="text"
                  data-popover-target="notifications-menu"
                  class="rounded-full hover:bg-gray-100 transition-all duration-300"
                  type="button"
                  onClick={handleOpenMessage}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                    />
                  </svg>
                </IconButton>
                {messageNotification && messageNotification.length > 0 && (
                  <span class="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs text-white shadow-md">
                    {messageNotification.length}
                  </span>
                )}
                <ul
                  role="menu"
                  data-popover="notifications-menu"
                  data-popover-placement="bottom"
                  onMouseLeave={closeMessage}
                  className={`${
                    openMenuMessage
                      ? "scale-100 opacity-100"
                      : "scale-95 opacity-0 pointer-events-none"
                  } absolute left-1/2 transform -translate-x-1/2 mt-2 z-10 w-[300px] overflow-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg shadow-sm focus:outline-none transition-all duration-200 ease-in-out origin-top`}
                >
                  {messageNotification &&
                    messageNotification.map((message) => (
                      <li
                        onClick={() => {
                          closeMessage();
                          setSelectedChat(message.chat);
                          setMessageNotification(
                            messageNotification.filter(
                              (n) => n.chat._id !== message.chat._id
                            )
                          );
                          navigate(`/chat/${message.chat._id}`);
                        }}
                        role="menuitem"
                        class="cursor-pointer text-slate-800 flex w-full text-sm items-center rounded-md p-3 transition-all hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-100"
                      >
                        <img
                          alt="tania andrew"
                          src={message.sender.avatar_url}
                          class="relative inline-block h-10 w-10 rounded-full object-cover object-center"
                        />
                        <div class="flex flex-col gap-1 ml-4">
                          <p class="text-slate-800 font-medium text-black truncate max-w-[200px]">
                            {message.chat.isGroupChat
                              ? `${message.sender.username} sent a message to ${message.chat.chatName}`
                              : `${message.sender.username} sent you a message`}
                          </p>
                          <p class="text-slate-500 text-sm flex items-center text-black">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              class="w-4 h-4 mr-1 text-slate-400"
                            >
                              <path
                                fill-rule="evenodd"
                                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
                                clip-rule="evenodd"
                              />
                            </svg>
                            {moment(new Date(message.createdAt)).fromNow()}
                          </p>
                        </div>
                      </li>
                    ))}
                  {messageNotification && messageNotification.length === 0 && (
                    <li
                      role="menuitem"
                      class="cursor-pointer text-slate-800 flex w-full text-sm items-center rounded-md p-3 transition-all hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-100"
                    >
                      <div class="flex flex-col gap-1 w-full">
                        <p class="text-slate-800 font-medium text-black text-center">
                          There's no new messages
                        </p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>

              {/* NOTIFICATION */}
              <div class="relative inline-block">
                <IconButton
                  variant="text"
                  data-popover-target="notifications-menu"
                  class="rounded-full hover:bg-gray-100 transition-all duration-300"
                  type="button"
                  onClick={handleOpenNotification}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                    />
                  </svg>
                </IconButton>
                {notification && notificationLength(notification) > 0 && (
                  <span class="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs text-white shadow-md">
                    {notification && notificationLength(notification)}
                  </span>
                )}

                <ul
                  role="menu"
                  data-popover="notifications-menu"
                  data-popover-placement="bottom"
                  onMouseLeave={closeNotification}
                  className={`${
                    openMenuNotification
                      ? "scale-100 opacity-100"
                      : "scale-95 opacity-0 pointer-events-none"
                  } absolute left-1/2 transform -translate-x-1/2 mt-2 z-10 w-[300px] overflow-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg shadow-sm focus:outline-none transition-all duration-200 ease-in-out origin-top gap-1 flex flex-col`}
                >
                  {notification &&
                    notification.map((noti) => (
                      <li
                        role="menuitem"
                        onClick={() => {
                          read(noti);
                          navigate(
                            noti?.postId?.name
                              ? noti.redirectUrl
                              : "404NotFound"
                          );
                        }}
                        className={`${
                          noti.isRead ? "bg-gray-300" : ""
                        } cursor-pointer text-slate-800 flex w-full text-sm items-center rounded-md p-3 transition-all hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-100`}
                      >
                        <img
                          alt="users avatar"
                          src={noti.senderId.avatar_url}
                          class="relative inline-block h-10 w-10 rounded-full object-cover object-center"
                        />
                        <div class="flex flex-col gap-1 ml-4">
                          <p class="text-slate-800 font-medium text-black truncate max-w-[200px]">
                            {noti.type === "comment" &&
                              `${noti.senderId.username} commented at your post`}
                            {noti.type === "approvedPost" &&
                              `${noti.senderId.username} approved your post`}
                          </p>
                          <p class="text-slate-500 text-sm flex items-center text-black">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              class="w-4 h-4 mr-1 text-slate-400"
                            >
                              <path
                                fill-rule="evenodd"
                                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
                                clip-rule="evenodd"
                              />
                            </svg>
                            {moment(new Date(noti.createdAt)).fromNow()}
                          </p>
                        </div>
                      </li>
                    ))}
                  {notification &&
                    notification.length === 0 &&
                    notificationLength(notification) === 0 && (
                      <li
                        role="menuitem"
                        class="cursor-pointer text-slate-800 flex w-full text-sm items-center rounded-md p-3 transition-all hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-100"
                      >
                        <div class="flex flex-col gap-1 w-full">
                          <p class="text-slate-800 font-medium text-black text-center">
                            There's no new notifications
                          </p>
                        </div>
                      </li>
                    )}
                </ul>
              </div>
              <ProfileMenu
                isMenuOpen={isMenuOpen}
                setIsMenuOpen={setIsMenuOpen}
                closeMenu={closeMenu}
                user={user}
              />
            </div>
          )}
        </div>

        <IconButton
          variant="text"
          color="gray"
          onClick={handleOpen}
          className="ml-auto inline-block lg:hidden hover:bg-gray-100 transition-all duration-300 rounded-full"
        >
          {open ? (
            <XMarkIcon strokeWidth={2} className="h-6 w-6" />
          ) : (
            <Bars3Icon strokeWidth={2} className="h-6 w-6" />
          )}
        </IconButton>
      </div>

      <Collapse open={open}>
        <div className="container mx-auto mt-3 border-t border-gray-200 px-2 pt-4">
          <ul className="flex flex-col gap-4">
            {NAV_MENU.map(({ name, url }) => (
              <NavItem key={name} onClick={() => navigate(url)}>
                {name}
              </NavItem>
            ))}
            {getPagesForRole().map(({ name, URL }) => (
              <NavItem key={name} onClick={() => navigate(`/${URL}`)}>
                {name}
              </NavItem>
            ))}
          </ul>
          <div className="mt-6 mb-4 flex items-center gap-2">
            <Button variant="text" onClick={() => navigate(`/sign-in`)}>
              Sign In
            </Button>
            <Button color="gray" onClick={() => navigate(`/sign-up`)}>
              Sign Up
            </Button>
          </div>
        </div>
      </Collapse>
    </MTNavbar>
  );
};
