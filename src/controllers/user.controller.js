import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
export const registerUser = asyncHandler(async (req, res) => {
  //get user detsils from frontend
  //validation -not empty
  //check if user already exists: username,email
  //check for images,check for avatar
  //upload them to cloudinary, avatar
  //create user object - create entry in db
  //remove password and refresh token field from response
  //check for user creation
  //return res

  const { fullname, email, username, password } = req.body;
  console.log("email", email);

  // if(fullname === ""){
  //     throw new ApiError (400,"full name is required")
  // }

  if (
    [fullname, email, username, password].some((field) => field.trim() === "")  //empty string or not 
  ) {
    throw new ApiError(400, "all fields are required");
  }
  

  const existedUser = await User.findOne({   // user exist with this username or email or not
    $or: [{username},{email}]
  })

  if(existedUser){
    throw new ApiError(409,"User with email or username already existed")
  }

  //console.log(req.files);

  const avatarLocalPath = req.files?.avatar[0]?.path;
//   const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
    coverImageLocalPath = req.files.coverImage[0].path;

  }


  if(!avatarLocalPath){  // if avatar not find
    throw new ApiError(400,"Avatar file is required")
  }

 const avatar =  await uploadOnCloudinary(avatarLocalPath) 
 const coverImage = await uploadOnCloudinary(coverImageLocalPath)

 if(!avatar){ // if avatar not uploaded
    throw new ApiError(400,"Avatar file is required")
 }
 const user =  await User.create({ //object creation
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
 })


 const createdUser = await User.findById(user._id).select(  // removed password and refreshtoken
    "-password -refreshToken"
 )

 if(!createdUser){
    throw new ApiError(500, "Something went wrong while resgistring user")
 }

return res.status(201).json(
    new ApiResponse(200,createdUser,"user registerd successfully")
)
});
