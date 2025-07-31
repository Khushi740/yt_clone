import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";


export const createTweet = asyncHandler(async(req,res) =>{
    const {content} = req.body

    if(!content?.trim()){
        throw new ApiError(400, "Content is required")
    }


    const tweet =  await Tweet.create({
        content: content,
        owner: req.user._id
    })

    return res.status(201)
    .json(new ApiResponse(201, tweet, "tweet created successfully"))
})


export const getUserTweets = asyncHandler(async(req,res) =>{
    const {userId} = req.params;
    
    if(!userId?.trim()){
        throw new ApiError(400, "user id is required")
    }

    if(!isValidObjectId(userId)){
        throw new ApiError(400,"invalid user")
    }

    const user = await User.aggregate([
        {
            $match : {
                _id: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from: "tweets",
                localField: "_id",
                foreignField: "owner",
                as: "tweets"
            }
        },
        {
            $unwind: "$tweets",
        },{
            $project:{
                _id: 1,
                fullname:1,
                avatar: 1,
                tweet: {
                    _id: "$tweets._id",
                    content: "$tweets.content",
                    createdAt: "$tweets.createdAt",
                    updatedAt: "$tweets.updatedAt",
                    owner:"$tweets.owner"
                }

            }
        }
    ])

    if(!user?.length){
        throw new ApiError(404,"User not found")
    }

    return res.status(200)
    .json(new ApiResponse(200,user,"user tweets fetched successfully"))
})


export const updateTweet = asyncHandler(async(req,res) =>{
    const {tweetId} = req.params;

    const {content} = req.body;

    if(!tweetId.trim()){
        throw new ApiError(400, "tweet id is required")
    }

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "invalid tweet id")
    }

    if(!content?.trim()){
        throw new ApiError(400,"content is required")
    }

    const tweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            content: content,
        },{
            new: true
        }
    )

    if(!tweet){
        throw new ApiError(404,"Tweet not found")
    }

    return res.status(200)
    .json(new ApiResponse(200,tweet,"tweet updated successfully"))
})


export const deleteTweet = asyncHandler(async(req,res) =>{
    const {tweetId} = req.params;

    if(!tweetId.trim()){
        throw new ApiError(400,"Tweet id is required")
    }

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid tweet id")
    }

    const tweet = await Tweet.findByIdAndDelete(tweetId)

    if(!tweet){
        throw new ApiError(400, "tweet not found")
    }

    return res.status(200)
    .json(new ApiResponse(200,tweet,"tweet deleted successfully"))
})