import mongoose, { isValid } from "mongoose";
import { User } from "../models/user.model";
import { Subscription } from "../models/subscription.model";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

export const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user._id;
  const user = User.findById(userId);

  if (!user) {
    throw new ApiError(404, "user not found");
  }

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(404, "invalid channel id");
  }

  if (userId.toString() === channelId) {
    throw new ApiError(400, "you cannot subscribe to ypur own channel");
  }

  const existingSubscription = await Subscription.findOne({
    subscriber: userId,
    channel: channelId,
  });

  if (existingSubscription) {
    await existingSubscription.deleteOne();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isSubscribed: false },
          "unsubscribed successfully"
        )
      );
  } else {
    await Subscription.create({
      subscriber: userId,
      channel: channelId,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, { isSubscribed: true }, "subsribed successfully")
      );
  }
});


export const getUserChannelSubscribers = asyncHandler(async(req,res) =>{
    const {channelId} = req.params;

    if(!mongoose.Types.ObjectId.isValid(channelId)){
        throw new ApiError(400, "Invalid channel id");
    }

    const subscribers = await Subscription.find({channel : channelId})
    .populate("subscriber",'username email avatar')
    .sort({createdAt : -1})

    return res
    .status(200)
    .json(
        new ApiResponse(200,{count : subscribers.length,subscribers},"Subscribers fetched successfully")
    )
})

export const getSubscribedChannels = asyncHandler(async(req,res) =>{
    const {subscribedId} = req.params

    if(!mongoose.Types.ObjectId.isValid(subscribedId)){
        throw new ApiError(400, "Invalid subscribed id");
    }

    const subscription = await Subscription.find({subscriber: subscribedId})
    .populate("channel","username avatar ")
    .sort({createdAt : -1})

    const channels = subscription.map((sub) => sub.channel)

    return res
    .status(200)
    .json(
        new ApiResponse(200,{
            count: channels.length,
            channels
        },
    "subscribed channels fetched successfully")
    )


})