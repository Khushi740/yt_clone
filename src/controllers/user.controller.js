import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshTokens = async(userId) =>{
    try{
        const user = await User.findById(userId)
        const accessToken =  user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()


        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}
    }catch(error){
        throw new ApiError(500, "Something went wrong while genrating refresh and access token")
    }
}
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


export const loginUser = asyncHandler(async (req,res) =>{
     // get user username,email and password req body ->data
     // username or email 
     // find the user
     // password check
     // access and refreshtoken 
     // send cookies 

     const {email, username, password} = req.body
     if(!username || !email){
        throw new ApiError(400, "username or email is req")
     }

     const user = await User.findOne({
        $or: [{username},{email}]
     })

     if(!user){
        throw new ApiError(404, "user does not exist")
     }

     const isPasswordValid = await user.isPasswordCorrect(password)

     if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
     }


    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = User.findById(user._id). 
    select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure : true
    }

    return res.
    status(200)
    .cookie("accessToken", accessToken,options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in Successfully"
        )
    )

})


export const logoutUser = asyncHandler(async(req, res )=>{
   await  User.findByIdAndUpdate(
        req.user._id,
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken",options)
    .json(new ApiError(200,{},"user logged out"))
})
