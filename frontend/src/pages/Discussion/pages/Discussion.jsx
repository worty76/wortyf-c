import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Typography,
  Carousel,
  Textarea,
  Button,
  IconButton,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
  Input,
  Chip,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Avatar,
} from "@material-tailwind/react";
import axios from "axios";
import {
  createComment,
  createLike,
  createNotification,
  deleteLike,
  deletePost,
  reportPost,
  updatePost,
} from "../api/DiscussionApi";
import { VariantType, useSnackbar } from "notistack";
import SingleComment from "../components/SingleComment";
import auth from "../../../helpers/Auth";
import { Markup } from "interweave";
import { ChatState } from "../../../context/ChatProvider";
import { useSocket } from "../../../context/SocketProvider";
import { HeartIcon, FlagIcon } from "@heroicons/react/24/solid";
import moment from "moment";
import { approve } from "../../Moderator/api/moderatorApi";

export const Discussion = () => {
  const { socket } = useSocket();
  const params = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [post, setPost] = useState({});
  const [user, setUser] = useState({});
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState(0);
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const timeoutRef = useRef(null);
  const [message, setMessage] = useState("");
  const {
    messageNotification,
    setMessageNotification,
    setSelectedChat,
    chats,
    setChats,
    setNotification,
    notification,
  } = ChatState();

  const debouncedOnCreateLike = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onCreateLike();
    }, 300);
  };

  const debouncedOnDeleteLike = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onDeleteLike();
    }, 300);
  };

  const handleOpenReportDialog = () => {
    setOpenReportDialog(true);
  };

  const handleCloseReportDialog = () => {
    setOpenReportDialog(false);
  };

  const [openEditing, setOpenEditing] = useState(false);

  const [valuesEditing, setValuesEditing] = useState({
    name: "",
    price: "",
    content: "",
  });

  const [text, setText] = useState("");

  const handleOpenEditing = () => {
    setOpenEditing(!openEditing);
  };

  const getPost = async (signal) => {
    try {
      console.log("IM CALLING");
      await axios
        .get(`${process.env.REACT_APP_API}/api/post/${params.id}`, {
          cancelToken: signal,
        })
        .then((response) => {
          const data = response.data;
          setPost(data.post);
          setUser(data.author);
          setLikes(data.post.likes);
          const sortComments = []
            .concat(data.comments)
            .sort((a, b) => (a.correctAns > b.correctAns ? false : true));
          setComments(sortComments);
          setValuesEditing({
            name: data.post.name,
            price: data.post.price,
            content: data.post.content,
          });
        })
        .catch(function (thrown) {
          if (axios.isCancel(thrown)) {
            console.log("Request canceled", thrown.message);
          }
        });
    } catch (error) {
      console.error(error);
    }
  };

  const onSaveEditing = () => {
    let post = new FormData();
    valuesEditing.name && post.append("name", valuesEditing.name);
    valuesEditing.price && post.append("price", valuesEditing.price);
    valuesEditing.content && post.append("content", valuesEditing.content);

    updatePost(
      { id: params.id },
      {
        t: JSON.parse(auth.isAuthenticated().token),
      },
      post
    ).then((data) => {
      if (data.stack) {
        console.log(data);
      } else {
        navigate(0);
        handleVariant("success");
      }
    });
  };

  const report = () => {
    let report = new FormData();
    message && report.append("message", message);

    reportPost(
      { id: params.id },
      {
        t: JSON.parse(auth.isAuthenticated().token),
      },
      report
    ).then((data) => {
      if (data.stack) {
        console.log(data);
      } else {
        handleVariant("success");
        setOpenReportDialog(false);
        setMessage("");
      }
    });
  };

  useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    getPost(source.token);

    return () => {
      source.cancel("Operation canceled by the user.");
    };
    // eslint-disable-next-line
  }, [params.id]);

  const checkLiked = (likesProp) => {
    console.log(likesProp);
    return (
      likesProp
        .map((e) => e.user_id)
        .indexOf(auth.isAuthenticated().user._id) !== -1
    );
  };

  const handleChangeEditing = (name) => (event) => {
    setValuesEditing({ ...valuesEditing, [name]: event.target.value });
  };

  const handleVariant = (variant: VariantType) => {
    enqueueSnackbar("Successfully did an action", { variant });
  };

  const updateComments = (comments) => {
    setComments(comments);
  };

  const onCreateLike = () => {
    let like = new FormData();
    createLike(
      { id: params.id },
      {
        t: JSON.parse(auth.isAuthenticated().token),
      },
      like
    ).then((data) => {
      if (data.stack) {
        console.log(data);
      } else {
        console.log(JSON.parse(data));
        setLikes(JSON.parse(data));
      }
    });
  };

  const onDeleteLike = () => {
    deleteLike(
      { id: params.id },
      {
        t: JSON.parse(auth.isAuthenticated().token),
      }
    ).then((data) => {
      if (data.stack) {
        console.log(data);
      } else {
        console.log(JSON.parse(data));
        setLikes(JSON.parse(data));
      }
    });
  };

  const onCreateComment = () => {
    let comment = new FormData();
    text && comment.append("text", text);

    createComment(
      { id: params.id },
      {
        t: JSON.parse(auth.isAuthenticated().token),
      },
      comment
    ).then((data) => {
      if (data.stack) {
        console.log(data);
      } else {
        const comment = JSON.parse(data);
        setComments([comment, ...comments]);
        setText("");
        handleVariant("success");

        if (auth.isAuthenticated().user._id !== post.author._id) {
          createNotification(
            {
              t: JSON.parse(auth.isAuthenticated().token),
            },
            {
              recipientId: post.author._id,
              postId: post._id,
              redirectUrl: `/post/${post._id}`,
              type: "comment",
            }
          ).then((data) => {
            if (data.stack) {
              console.log(data);
            }
            console.log(data);
            const notification = JSON.parse(data);

            socket.emit("notification", notification);
          });
        }
      }
    });
  };

  const onDeletePost = () => {
    let deletePostEmit = new FormData();
    deletePost(
      { id: params.id },
      { t: JSON.parse(auth.isAuthenticated().token) },
      deletePostEmit
    ).then((data) => {
      if (data.stack) {
        console.log(data);
      } else {
        handleVariant("success");
        navigate("/home");
      }
    });
  };

  const accessChat = async (userId, postId) => {
    console.log(userId);

    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${JSON.parse(auth.isAuthenticated().token)}`,
        },
      };
      const { data } = await axios.post(
        `${process.env.REACT_APP_API}/api/chat`,
        { userId, postId },
        config
      );

      if (!chats.find((c) => c._id === data._id)) {
        setChats([data, ...chats]);
      }
      setSelectedChat(data);
      navigate(`/chat/${data._id}`);
    } catch (error) {}
  };

  const handleApprovePost = (post) => {
    let approvePost = new FormData();

    approve(
      { postId: post._id },
      { t: JSON.parse(auth.isAuthenticated().token) },
      approvePost
    ).then((data) => {
      if (data.stack) {
      } else {
        handleVariant("success");
        navigate(`/moderator/approve`);
      }
    });

    if (auth.isAuthenticated().user._id !== post.author._id) {
      createNotification(
        {
          t: JSON.parse(auth.isAuthenticated().token),
        },
        {
          recipientId: post.author._id,
          postId: post._id,
          redirectUrl: `/post/${post._id}`,
          type: "approvedPost",
        }
      ).then((data) => {
        if (data.stack) {
          console.log(data);
        }
        console.log(data);
        const notification = JSON.parse(data);

        socket.emit("notification", notification);
      });
    }
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

  console.log(post);
  return (
    <section className="p-8">
      <div className="mx-auto max-w-screen-md space-y-2 xs:space-y-1 sm:space-y-2 md:space-y-3">
        <div className="flex items-center p-2 justify-between">
          <div className="flex items-center gap-4">
            <img
              src={post && post.author && post.author.avatar_url}
              alt="avatar"
              className="inline-block object-cover object-center rounded-full w-12 h-12"
            />
            <div>
              <Typography
                className="text-slate-800 font-semibold cursor-pointer"
                onClick={() => navigate(`/profile/${post.author._id}`)}
              >
                {post && post.author && post.author.username}
              </Typography>
              <Typography className="text-slate-600 text-sm">
                {post && moment(new Date(post.createdAt)).fromNow()}
              </Typography>
            </div>
            {!post.approved && <Chip color="amber" value="Is In Approval" />}
          </div>
          <div className="flex flex-row items-center gap-2">
            {post &&
              auth.isAuthenticated() &&
              auth.isAuthenticated().user._id !== user._id &&
              !post.sold &&
              post.approved && (
                <Button
                  id="chat"
                  variant="text"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => accessChat(post.author._id, post._id)}
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
                      d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                    />
                  </svg>
                  Chat
                </Button>
              )}
            {auth.isAuthenticated() &&
              auth.isAuthenticated().user.role === "moderator" &&
              !post.approved && (
                <IconButton
                  variant="text"
                  color="green"
                  onClick={() => handleApprovePost(post)}
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
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                </IconButton>
              )}
            {post && post.sold && (
              <div className="flex flex-row gap-2">
                <Chip color="green" value="SOLD" />
                <Chip
                  icon={
                    <Avatar
                      size="xs"
                      variant="circular"
                      className="h-full w-full -translate-x-0.5"
                      alt={post.buyer.name}
                      src={post.buyer.avatar_url}
                    />
                  }
                  value={
                    <Typography
                      variant="small"
                      color="white"
                      className="font-medium capitalize leading-none"
                    >
                      {post.buyer.username}
                    </Typography>
                  }
                  className="rounded-full py-1.5"
                />
              </div>
            )}
            {auth.isAuthenticated() &&
              auth.isAuthenticated().user._id === user._id &&
              (openEditing ? (
                <IconButton
                  id="save-edit"
                  variant="text"
                  color="green"
                  onClick={onSaveEditing}
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
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                </IconButton>
              ) : (
                <Menu>
                  <MenuHandler id="edit">
                    <IconButton variant="text">
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
                          d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
                        />
                      </svg>
                    </IconButton>
                  </MenuHandler>
                  <MenuList>
                    <MenuItem onClick={handleOpenEditing}>Edit</MenuItem>
                    <MenuItem onClick={onDeletePost}>Delete</MenuItem>
                  </MenuList>
                </Menu>
              ))}
          </div>
        </div>

        <div className="mt-4">
          <Carousel
            className="rounded-xl items-center"
            prevArrow={({ handlePrev }) => (
              <IconButton
                variant="text"
                color="white"
                size="lg"
                onClick={handlePrev}
                className="!absolute top-2/4 left-4 -translate-y-2/4"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  />
                </svg>
              </IconButton>
            )}
            nextArrow={({ handleNext }) => (
              <IconButton
                variant="text"
                color="white"
                size="lg"
                onClick={handleNext}
                className="!absolute top-2/4 !right-4 -translate-y-2/4"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </IconButton>
            )}
          >
            {post &&
              post.images &&
              post.images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt="Post"
                  className="shadow-lg w-full object-cover h-full"
                />
              ))}
          </Carousel>
        </div>

        <div className="my-4">
          <Typography variant="small" className="font-medium text-blue-500">
            {post &&
              post.topic &&
              post.topic.map((e, index) => <span key={index}>#{e.name} </span>)}
          </Typography>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            {auth.isAuthenticated() &&
            (likes !== null) &
              (likes !== undefined) &
              (Object.keys(likes).length > 0) ? (
              checkLiked(likes) ? (
                <IconButton
                  id="unlike"
                  variant="text"
                  onClick={debouncedOnDeleteLike}
                  className="hover:bg-[#feeceb]"
                >
                  <HeartIcon
                    strokeWidth={2}
                    className="h-6 w-6 my-4 text-[#f44336] cursor-pointer"
                  />
                </IconButton>
              ) : (
                <IconButton
                  id="like"
                  variant="text"
                  onClick={debouncedOnCreateLike}
                >
                  <HeartIcon
                    strokeWidth={2}
                    className="h-6 w-6 my-4 text-gray-500 cursor-pointer"
                  />
                </IconButton>
              )
            ) : (
              ""
            )}
            {auth.isAuthenticated() && Object.keys(likes).length === 0 ? (
              <IconButton
                id="like"
                variant="text"
                onClick={debouncedOnCreateLike}
              >
                <HeartIcon
                  strokeWidth={2}
                  className="h-6 w-6 my-4 text-gray-500 cursor-pointer"
                />
              </IconButton>
            ) : (
              ""
            )}
            {!auth.isAuthenticated() ? (
              <IconButton
                id="like"
                variant="text"
                onClick={() => navigate("/sign-in")}
              >
                <HeartIcon
                  strokeWidth={2}
                  className="h-6 w-6 my-4 text-gray-500 cursor-pointer"
                />
              </IconButton>
            ) : (
              ""
            )}
            {Object.keys(likes).length +
              `${Object.keys(likes).length > 1 ? " likes" : " like"}`}
          </div>

          <div className="flex items-center gap-2 text-gray-700">
            <IconButton variant="text" onClick={handleOpenReportDialog}>
              <FlagIcon
                strokeWidth={2}
                className="h-6 w-6 my-4 text-gray-500 cursor-pointer"
              />
            </IconButton>
            Report
          </div>
          {openReportDialog && (
            <Dialog open={openReportDialog} handler={handleCloseReportDialog}>
              <DialogHeader>Report This Topic</DialogHeader>
              <DialogBody>
                <p className="text-gray-700">
                  Please describe why you want to report this topic:
                </p>
                <Input
                  autoFocus
                  label="Reason"
                  onChange={(e) => setMessage(e.target.value)}
                  type="text"
                  fullWidth
                />
              </DialogBody>
              <DialogFooter>
                <Button
                  color="red"
                  variant="text"
                  onClick={handleCloseReportDialog}
                  className="mr-2"
                >
                  Cancel
                </Button>
                <Button color="green" onClick={report}>
                  Submit Report
                </Button>
              </DialogFooter>
            </Dialog>
          )}
        </div>

        {openEditing ? (
          <Input
            id="edit-post-name"
            label="Change your post name"
            value={valuesEditing.name}
            onChange={handleChangeEditing("name")}
          />
        ) : (
          <>
            <Typography
              variant="h2"
              className="my-4 xs:my-1 sm:my-2 md:my-2 font-black text-4xl leading-snug text-blue-gray-900"
            >
              {post && post.name}
            </Typography>
            <Typography className="font-bold text-red-500">
              {post &&
                post.price &&
                post.price.toLocaleString("it-IT", {
                  style: "currency",
                  currency: "VND",
                })}
            </Typography>
          </>
        )}

        {openEditing ? (
          <Textarea
            id="edit-post-content"
            value={valuesEditing.content}
            onChange={handleChangeEditing("content")}
            rows={8}
          />
        ) : (
          <Typography className="font-normal text-gray-700">
            {post && <Markup content={post.content} />}
          </Typography>
        )}

        <div className="pt-5 pb-5">
          <Typography className="font-normal font-black">
            {Object.keys(comments).length} comments
          </Typography>
          {console.log(comments)}
          {comments &&
            comments.map((comment, index) => (
              <SingleComment
                authorId={user._id}
                postId={post._id}
                comment={comment}
                updateComments={updateComments}
                key={index}
              />
            ))}
        </div>
        <div className="relative w-full mt-6">
          <Typography variant="h6">Post your comment</Typography>
          <Textarea
            id="comment"
            rows={4}
            label="Message"
            className="mb-2"
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-between items-center">
            <div></div>
            <div>
              <Button
                id="post-comment"
                size="sm"
                className="rounded-md"
                onClick={() => {
                  if (auth.isAuthenticated()) {
                    onCreateComment();
                  } else {
                    navigate("/sign-in");
                  }
                }}
              >
                Post Comment
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
