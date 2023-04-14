const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  //console.log(req.headers);
  const token = req.headers.authorization.replace("Bearer ", "");
  //console.log(token);
  const user = await User.findOne({ token: token });
  //console.log(user);
  if (!user) {
    return res.status(401).json({ message: "You are not authorize" });
  } else {
    //res.status(202).json("Welcome back " + user.account.username);
    req.user = user;
  }
  next();
};
module.exports = isAuthenticated;
