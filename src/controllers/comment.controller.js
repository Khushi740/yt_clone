import mongoose from "mongoose";
import { Types } from "mongoose";
import { Comment } from "../models/comment.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";


export const getVideoComments = asyncHandler(async(req,res) =>{
    const {videoId} =req.params;
    const {page =1, limit= 10} =req.query;

    console.log(videoId)

    if(!videoId?.trim()){
        throw new ApiError(400,"video id is required")
    }

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "video is required")
    }

    const comment = await Comment.aggregatePaginate(
        Comment.aggregate([
        {
            $match:{
                video: Types.ObjectId(videoId)
            }
        }
    ]),
    {
        page: parseInt(page),
        limit: parseInt(limit)
    }
)

    console.log(comment);

    if(!comment || comment.docs.length === 0){
        throw new ApiError
        (404,"comment not found")
    }


    return res.status(200)
    .json(new ApiResponse(200,comment,"comment fetched successfully"))

    
})