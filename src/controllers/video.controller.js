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


export const getVideoById = asyncHandler(async(req,res)=>{
    const {videoId} = req.params;

    if(!videoId?.trim()){
        throw new ApiError(400, "videoId is reuired")
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "video not found")
    }

    return res.status(200)
    .json(new ApiResponse(200,video,"video fetched successfully"))
})


export const updateVideo = asyncHandler(async(req,res)=>{
    const {videoId} = req.params;
    const {title,description} = req.body;
    const thumbnailLocalpath = req.file?.path;
    const userId = req.user._id

    if(!title && !description && !thumbnailLocalpath){
        throw new ApiError(400,"Atleast one field is required")
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "video witth this id  is not found")
    }

    if(video.owner.toString() !== userId.toString()){
        throw new ApiError(403, "unauthorized to update this video")
    }

    const updateFields = {};

    if(title) updateFields.title = title;
    if(description) updateFields.description = description;
    if(thumbnailLocalpath){
        const Thumbnail = await uploadOnCloudinary(thumbnailLocalpath);
        if(!Thumbnail){
            throw new ApiError(500, "error while uploading new thumbnail")
        }

        updateFields.thumbnail = Thumbnail
    }

     const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateFields },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
})


export const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId || videoId.trim() === "") {
        throw new ApiError(400, "videoId is required");
    }

    const video = await Video.findByIdAndDelete(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video deleted successfully"));
});


export const togglePublishStatus = asyncHandler(async(req,res)=>{
    const {videoId} = req.params;

    const userId = req.user._id;

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "video not found")
    }

    if(video.owner.toString() !== userId.toString() ){
        throw new ApiError(403, "Unauthorized to update publish status")
    }

    video.isPublished = !video.isPublished;

    await video.save({validateBeforeSave: false})

    return res.status(200)
    .json(new ApiResponse(200,video,
        `Video ${video.isPublished ? "published" : "unpublished"}`
    ))

})
