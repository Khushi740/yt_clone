import { Router } from "express";
import {
    getSubscribedChannels,
    toggleSubscription,
    getUserChannelSubscribers
} from "../controllers/subcription.controller";
import { verifyJWT } from "../middlewares/auth.middleware";

const router = Router();
router.use(verifyJWT);

router.route("/c/:channelId")
.get(getSubscribedChannels)
.post(toggleSubscription)

router.route("/u/:subscriberId").get(getUserChannelSubscribers)

export default router