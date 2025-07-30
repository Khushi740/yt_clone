import mongoose from "mongoose";
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