const express = require("express");
const fileUpload = require("express-fileupload");
const router = express.Router();
const User = require("../models/User");
const Offer = require("../models/Offer");
const isAuthenticated = require("../middlewares/isAuthenticated");
const cloudinary = require("cloudinary").v2;
const convertToBase64 = require("../utils/convertToBase64");

const stripe = require("stripe")(process.env.STRIPE_API_SECRET);

const app = express();
app.use(express.json());

router.get("/offers", async (req, res) => {
  try {
    // console.log(req.body);
    // console.log(req.query);
    // console.log(Object.keys(req.query).length);
    if (Object.keys(req.query).length === 0) {
      const offersPage = await Offer.find().populate("owner", "account");
      // console.log("test1");
      // console.log(req.body);
      return res.json(offersPage);
    }

    let page = 0;
    if (typeof Number(req.query.page) === "number") {
      page = (req.query.page - 1) * 3;
      // console.log("test2");
    }
    let prixMax = 100000;
    if (Number(req.query.priceMax) < 100000 && Number(req.query.priceMax) > 0) {
      prixMax = Number(req.query.priceMax);
      // console.log("test3");
    }
    let prixMin = 0;
    if (Number(req.query.priceMin) > 0 && Number(req.query.priceMin) < 100000) {
      prixMin = Number(req.query.priceMin);
      // console.log("test4");
    }
    let numberSort = 1;
    //console.log(prixMin, prixMax);
    if (req.query.sort === "price-desc") {
      numberSort = -1;
      // console.log("test5");
    }

    //
    //console.log(prixMax);
    const offersPage = await Offer.find({
      product_name: new RegExp(req.query.name, "i"),

      product_price: { $lte: prixMax, $gte: prixMin },
    })
      .sort({ product_price: numberSort })
      // .limit(30)
      // .skip(page)
      .populate("owner", "account");
    // console.log(offersPage);
    // console.log("test6");
    if (offersPage.length === 0) {
      res.json({ message: "Nothing with this name" });
    } else {
      // console.log("test7");
      // console.log(offersPage);
      res.json(offersPage);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      //const token = req.headers.authorization.replace("Bearer ", "");
      // console.log("req.body " + req.body);
      const accountUser = await User.findOne(req.user).select("account");
      //console.log(accountUser);
      // console.log(req.files.picture);
      // console.log("req.body 2" + req.body);
      if (
        req.body.title.length > 50 ||
        req.body.description.length > 500 ||
        req.body.price > 100000
      ) {
        return res.json({ message: "Wrong parameters" });
      }
      // console.log("req.body " + req.body);
      const newOffer = await new Offer({
        product_name: req.body.title,
        product_description: req.body.description,
        product_price: req.body.price,
        product_details: [
          { product_brand: req.body.brand },
          { product_size: req.body.size },
          { product_condition: req.body.condition },
          { product_color: req.body.color },
          { product_city: req.body.city },
        ],
        owner: accountUser,
      });
      // console.log(req);
      const picture = await cloudinary.uploader.upload(
        convertToBase64(req.files.picture),
        {
          folder: `/Vinted/offers/${newOffer._id}`,
        }
      );
      // console.log("url " + newOffer);
      const urlPicture = picture.secure_url;

      (newOffer.product_image = urlPicture), res.json(newOffer);
      await newOffer.save();
      console.log(newOffer._id);
      return newOffer._id;
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get("/offer/:_id", async (req, res) => {
  try {
    // console.log(req.params._id);
    const offer = await Offer.findById(req.params).populate("owner", "account");

    res.json(offer);
  } catch (error) {
    res.json({ message: error.message });
  }
});

router.post("/offer/:id/payment/", async (req, res) => {
  try {
    console.log("body  " + req.body);
    const stripeToken = req.body.stripeToken;

    const response = await stripe.charges.create({
      amount: req.body.price,
      currency: "eur",
      description: req.body.title,
      source: stripeToken,
    });
    res.json(response);
    // console.log(response.status);
  } catch (error) {
    res.json({ message: error.message });
  }
});

module.exports = router;
