import { User } from "./user.model.js";
import { ApiResponse } from "../../utils/api-response.js";
import { ApiError } from "../../utils/api-error.js";
import { asyncHandler } from "../../utils/async-handler.js";

const generateAccessAndRefreshTokens = async (userId) => {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
};

const signIn = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    let user;

    // 1. Intercept hardcoded Admin credentials from .env
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        user = await User.findOne({ email: process.env.ADMIN_EMAIL });
        
        // Auto-seed the admin into the DB on first login so verifyJWT works
        if (!user) {
            user = await User.create({
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD, // Will be hashed by pre-save hook
                roles: "admin"
            });
        }
    } else {
        // 2. Standard database fallback (if you add other admin accounts later)
        user = await User.findOne({ email });

        if (!user) {
            throw new ApiError(401, "Invalid credentials");
        }

        if (user.roles !== "admin") {
            throw new ApiError(403, "Access denied. Admin credentials required.");
        }

        const isPasswordValid = await user.isPasswordCorrect(password);
        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid credentials");
        }
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken -resetPasswordToken -resetPasswordExpires"
    );

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 })
        .cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 10 * 24 * 60 * 60 * 1000 })
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "Admin signed in successfully"
            )
        );
});

export { signIn };