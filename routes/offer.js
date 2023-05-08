const express = require("express");
const fileUpload = require("express-fileupload");
const router = express.Router();
const User = require("../models/User");
const Offer = require("../models/Offer");
const isAuthenticated = require("../middlewares/isAuthenticated");
const cloudinary = require("cloudinary").v2;
const convertToBase64 = require("../utils/convertToBase64");

const app = express();
app.use(express.json());

router.get("/offers", async (req, res) => {
  try {
    //console.log(Object.keys(req.query).length);
    if (Object.keys(req.query).length === 0) {
      const offersPage = await Offer.find();
      return res.json(offersPage);
    }

    let page = 0;
    if (typeof Number(req.query.page) === "number") {
      page = (req.query.page - 1) * 3;
    }
    let prixMax = 100000;
    if (Number(req.query.priceMax) < 100000 && Number(req.query.priceMax) > 0) {
      prixMax = Number(req.query.priceMax);
    }
    let prixMin = 0;
    if (Number(req.query.priceMin) > 0 && Number(req.query.priceMin) < 100000) {
      prixMin = Number(req.query.priceMin);
    }
    let numberSort = 1;
    //console.log(prixMin, prixMax);
    if (req.query.sort === "price-desc") {
      numberSort = -1;
    }

    //
    //console.log(prixMax);
    const offersPage = await Offer.find({
      product_name: new RegExp(req.query.name, "i"),

      product_price: { $lte: prixMax, $gte: prixMin },
    })
      .sort({ product_price: numberSort })
      .limit(3)
      .skip(page)
      .populate("owner", "account");
    // console.log(offersPage.length);
    if (offersPage.length === 0) {
      res.json({ message: "Nothing with this name" });
    } else {
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
      console.log(req.user);
      const accountUser = await User.findOne(req.user).select("account");
      //console.log(accountUser);
      // console.log(req.files.picture);
      if (
        req.body.title.length > 50 ||
        req.body.description.length > 500 ||
        req.body.price > 100000
      ) {
        return res.json({ message: "Wrong parameters" });
      }

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
      const picture = await cloudinary.uploader.upload(
        convertToBase64(req.files.picture),
        {
          folder: `/Vinted/offers/${newOffer._id}`,
        }
      );
      const urlPicture = picture.secure_url;

      (newOffer.product_image = urlPicture), res.json(newOffer);
      await newOffer.save();
      console.log(newOffer);
      return;
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get("/offer/:_id", async (req, res) => {
  try {
    console.log(req.params._id);
    const offer = await Offer.findById(req.params).populate("owner", "account");

    res.json(offer);
  } catch (error) {
    res.json({ message: error.message });
  }
});

module.exports = router;
