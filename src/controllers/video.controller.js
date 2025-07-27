import mongoose from "mongoose";
import { Types } from "mongoose";
import { Video } from "../models/video.model";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;

    // console.log(req.query.userId)

    // Validate userId
    if (!userId) {
        throw new ApiError(400, "userIds is required");
    }

    // Check if the user exists
    const existedUser = await User.findById(userId);
    if (!existedUser) {
        throw new ApiError(404, "User not found");
    }

    // Convert page and limit to numbers
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // Build the aggregation pipeline
    const user = await User.aggregate([
        // Match the user by userId
        {
            $match: {
                _id: Types.ObjectId(userId),
            },
        },
        // Lookup videos owned by the user
        {
            $lookup: {
                from: "videos", // Collection name in MongoDB
                localField: "_id", // Field in the User collection
                foreignField: "owner", // Field in the Video collection
                as: "videos", // Alias for the joined data
            },
        },
        // Unwind the videos array to process each video individually
        {
            $unwind: "$videos",
        },
        // Apply filtering based on the query (search by title)
        {
            $match: {
                ...(query && { "videos.title": { $regex: query, $options: "i" } }), // Case-insensitive search
            },
        },
        // Sort the videos based on the sortBy and sortType parameters
        {
            $sort: {
                [`videos.${sortBy}`]: sortType === "asc" ? 1 : -1, // Ascending or descending order
            },
        },
        // Skip documents for pagination
        {
            $skip: (pageNumber - 1) * limitNumber,
        },
        // Limit the number of documents returned
        {
            $limit: limitNumber,
        },
        // Regroup the videos into an array after processing
        {
            $group: {
                _id: "$_id",
                videos: { $push: "$videos" },
            },
        },
    ]);

    // Handle cases where no videos are found
    if (!user.length) {
        throw new ApiError(404, "No videos found");
    }

    // Extract the videos array from the aggregation result
     const videos = user[0].videos;

    // Send the response with pagination details
    return res.status(200).json(
        new ApiResponse(200, {
            currentPage: pageNumber,
            totalVideos: videos.length,
            videos,
        }, "Videos fetched successfully")
    );
});

export const publishVideo = asyncHandler(async(req,res)=>{
    const {title, description} = req.body

    if([title,description].some((field) => field?.trim()=== "")){
        throw new ApiError(400, "Title and description is required")
    }

    if(!req.files?.videoFile || !req.files?.thumbnail){
        throw new ApiError(400, "video file and thumbnail is required")
    }

    let videoFileUrl;

    if(req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length>0){
        videoFileUrl = req.files.videoFile[0].path;
    }
    if(!videoFileUrl){
        throw new ApiError(400,"video file is required")
    }

    let thumbnailUrl;
    if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length>0){
        thumbnailUrl = req.files.thumbnail[0].path;
    }

    if(!thumbnailUrl){
        throw new ApiError(400,"thumbnail is required")
    }

    const videoFileUploadResult = await uploadOnCloudinary(videoFileUrl)

    const thumbnailUploadResult = await uploadOnCloudinary(thumbnailUrl)

    if(!videoFileUploadResult || !thumbnailUploadResult){
        throw new ApiError(400, "failed to upload video or thumbnail")
    }

    console.log(videoFileUploadResult)

    const video = await Video.create({
        title: title,
        description: description,
        videoFile: videoFileUploadResult.url,
        thumbnail: thumbnailUploadResult.url,
        owner: req.user._id,
        isPublished: true,
        duration:videoFileUploadResult.duration,
        views: 0
    })

    return res
    .status(200)
    .json(new ApiResponse(200, video, "video published successfully"))
})