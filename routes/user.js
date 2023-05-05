const express = require("express");
const router = express.Router();
const User = require("../models/User");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const fileUpload = require("express-fileupload");
const convertToBase64 = require("../utils/convertToBase64");
const cloudinary = require("cloudinary").v2;

router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    const existUser = await User.findOne({ mail: req.body.mail });
    const username = req.body.username;
    if (existUser) {
      return res.json({ message: "This mail is already link to an account" });
    } else if (!username) {
      return res.json({ message: "Please fill the username case" });
    }
    // else if (!req.files) {
    //   return res.json({ message: "Please fill an avatar image" });
    // }
    let newUser = new User({
      account: { username: req.body.username },
      email: req.body.email,
      password: req.body.password,
      newsletter: req.body.newsletter,
    });

    const urlPicture = await cloudinary.uploader.upload(
      convertToBase64(req.files.avatar),
      {
        folder: `/Vinted/user/${newUser._id}`,
      }
    );

    newUser.account.avatar = urlPicture;

    const token = uid2(16);
    newUser.token = token;
    const salt = uid2(16);
    newUser.salt = salt;
    const hash = SHA256(req.body.password + salt).toString(encBase64);
    newUser.hash = hash;
    await newUser.save();
    const result = await User.findOne({ mail: req.body.mail }).select(
      `-email -newsletter -hash -salt -__v`
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    // console.log(req.body.email);
    if (!req.body.email || !req.body.password) {
      return res.json({ message: "Please fill cases" });
    }

    const currentUser = await User.findOne({ email: req.body.email });
    if (!currentUser) {
      return res.json({
        message: "This mail is not already link to an account",
      });
    }
    const hash = SHA256(req.body.password + currentUser.salt).toString(
      encBase64
    );
    console.log(hash);
    console.log(currentUser.hash);
    if (hash !== currentUser.hash) {
      res.json({
        message: "Wrong password",
      });
    } else if (hash === currentUser.hash) {
      const result = await User.findOne({ email: req.body.email }).select(
        `-email -newsletter -hash -salt -__v`
      );
      res.json(result);
    }
    res.json("fin");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
