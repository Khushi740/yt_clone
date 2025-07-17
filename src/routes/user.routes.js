import express from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/register", upload.fields([
     {
        name: "avatar",  //injecting middleware
        maxCount: 1
     },
     {
        name: "coverImage",
        maxCount: 1
     }
]), registerUser);// 👈 Defines POST /register


router.route("/login").post(loginUser)

//secured routes                

router.route("/logout").post(verifyJWT, logoutUser)

router.route("/refresh-token").post(refreshAccessToken)

export default router;
