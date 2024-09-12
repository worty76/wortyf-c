const Post = require("../models/post");
const User = require("../models/user");
const Topic = require("../models/topic");
const Comment = require("../models/comment");
const Like = require("../models/like");
const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Read
const readPost = async (req, res) => {
  try {
    // the 2nd argument is removing fields that you don't want to fetch
    const posts = await Post.find({});

    if (posts)
      return res
        .status(200)
        .send({ message: "Successfully get posts", data: posts });

    return res.status(400).send({ message: "Failed to get posts" });
  } catch (error) {
    res.status(500).send({ message: "Interval error", error: error });
  }
};

const readSpecificPost = async (req, res) => {
  try {
    const post = await Post.findById({ _id: req.params.id });

    const author = await User.findById({ _id: post.author._id });

    const comments = await Comment.find({
      post_id: req.params.id,
      comment_father: undefined,
    });

    if (post)
      return res.status(200).send({
        message: "Successfully get post",
        post: post,
        author: author,
        comments: comments,
      });

    return res.status(400).send({ message: "Failed to get post" });
  } catch (error) {
    res.status(500).send({ message: "Interval error", error: error });
  }
};

const createPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user)
      return res.status(400).send({ message: "Could not find the user!" });

    // Ensure upload directory exists
    fs.access("./uploads", (error) => {
      if (error) {
        fs.mkdirSync("./uploads");
      }
    });

    let form = new formidable.IncomingForm();
    form.keepExtensions = true;

    const uploadFolder = path.join(__dirname, "public", "files");
    form.multiples = true;
    form.maxFileSize = 50 * 1024 * 1024; // 5MB
    form.uploadDir = uploadFolder;

    const body = await doSomethingWithNodeRequest(req);

    let imagesArray = [];

    if (body.images) {
      const images = Array.isArray(body.images) ? body.images : [body.images]; // Ensure it's an array
      for (let image of images) {
        const timestamp = Date.now();
        const ref = `${timestamp}-${image.newFilename}.webp`;

        const buffer = fs.readFileSync(image._writeStream.path);

        await sharp(buffer)
          .webp({ quality: 20 })
          .toFile("./uploads/" + ref);

        imagesArray.push(ref);
      }
    }

    let topicArray = [];
    if (body.topic) {
      const topics = body.topic.split(",");
      for (const topicName of topics) {
        let topic = await Topic.findOne({ name: topicName.trim() });
        if (topic) {
          topicArray.push(topic);
        } else {
          const newTopic = new Topic({
            name: topicName.trim(),
            color: req.body.topicColors?.[topicName] || "#FFFFFF", // Optional color assignment
          });
          await newTopic.save();
          topicArray.push(newTopic);
        }
      }
    }

    const post = new Post({
      title: body.title,
      description: body.description || null,
      content: body.content,
      author: {
        _id: user._id,
        username: user.username,
        avatar_url: user.avatar_url,
      },
      topic: topicArray,
      images: imagesArray, // Associate images with the post
      createdAt: new Date().toLocaleString(),
    });

    // Save post to MongoDB
    await post.save();

    // Respond with success message and post data
    res
      .status(200)
      .json({ message: "Successfully created a post", data: post });
  } catch (error) {
    res.status(500).send({ message: "Internal error", error: error.message });
  }
};

function doSomethingWithNodeRequest(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: true });
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }
      // console.log("Parsed Fields: ", fields);
      // console.log("Parsed Files: ", files);
      resolve({ ...fields, ...files });
    });
  });
}

// Update
const updatePost = async (req, res) => {
  try {
    const newPost = {
      title: req.body.title,
      description: req.body.description,
      content: req.body.content,
    };

    const updatedPost = await Post.findOneAndUpdate(
      { _id: req.params.id },
      newPost
    );
    if (updatedPost)
      return res
        .status(200)
        .send({ message: "Successfully updated a post!", data: updatedPost });
  } catch (error) {
    res.status(500).send({ message: "Could not find any post!", error: error });
  }
};

// Delete
const deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id });
    if (!post)
      return res.status(400).json({ message: "This post doesn't exist!" });

    await Post.findByIdAndDelete({ _id: req.params.id });

    await Comment.deleteMany({ post_id: req.params.id });
    res.status(200).json({ message: "Successfully deleted a post" });
  } catch (error) {
    res.status(500).json({ message: "Interval error", error: error });
  }
};

// Search
// data example: will be a string, there will be [tags] to search tags, and title to search the most relevant title
// const searchPost = async (req, res) => {
//   try {
//     const searchQuery = req.query.text;
//     console.log(searchQuery);

//     let searchCondition = {};

//     const tagPattern = /\[([^\]]*)\]/g;

//     let tags = [];
//     let match;

//     while ((match = tagPattern.exec(searchQuery)) !== null) {
//       if (match[1].trim()) {
//         tags.push(match[1].trim());
//       }
//     }

//     const cleanSearchQuery = searchQuery.replace(tagPattern, "").trim();

//     let topics = [];
//     if (tags.length > 0) {
//       topics = await Topic.find({
//         name: { $in: tags },
//       }).distinct("_id", {});

//       searchCondition.topic = { $in: topics };
//     }

//     if (cleanSearchQuery) {
//       searchCondition.title = { $regex: cleanSearchQuery, $options: "i" };
//     }
//     const posts = await Post.find(searchCondition);

//     if (posts.length > 0) {
//       return res
//         .status(200)
//         .send({ message: "Successfully found posts", data: posts });
//     } else {
//       return res.status(200).send({ message: "No posts found", data: posts });
//     }

//     return res.status(404).send({ message: "Error" });
//   } catch (error) {
//     console.error(error);
//     res
//       .status(500)
//       .send({ message: "Internal server error", error: error.message });
//   }
// };

const searchPost = async (req, res) => {
  try {
    const searchQuery = req.query.text;

    let searchCondition = {};

    const tagPattern = /\[([^\]]*)\]/g;
    let tags = [];
    let match;

    if (searchQuery.includes("[")) {
      if (!searchQuery.includes("]")) {
        const cleanSearchQuery = searchQuery.replace("[", "").trim();
        searchCondition.title = { $regex: cleanSearchQuery, $options: "i" };
      } else {
        while ((match = tagPattern.exec(searchQuery)) !== null) {
          if (match[1].trim()) {
            tags.push(match[1].trim());
          }
        }

        const cleanSearchQuery = searchQuery.replace(tagPattern, "").trim();

        let topics = [];
        if (tags.length > 0) {
          topics = await Topic.find({
            name: { $in: tags },
          }).distinct("_id", {});

          searchCondition.topic = { $in: topics };
        }

        if (cleanSearchQuery) {
          searchCondition.title = { $regex: cleanSearchQuery, $options: "i" };
        }
      }
    } else {
      const cleanSearchQuery = searchQuery.trim();
      searchCondition.title = { $regex: cleanSearchQuery, $options: "i" };
    }

    const posts = await Post.find(searchCondition);

    if (posts.length > 0) {
      return res
        .status(200)
        .send({ message: "Successfully found posts", data: posts });
    } else {
      return res.status(200).send({ message: "No posts found", data: posts });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send({ message: "Internal server error", error: error.message });
  }
};

const postController = {
  readPost,
  createPost,
  updatePost,
  deletePost,
  readSpecificPost,
  searchPost,
};

module.exports = postController;