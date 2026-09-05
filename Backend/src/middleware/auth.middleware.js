import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { User } from "../features/auth/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded._id).select("-password -refreshToken");
        
        if (!user) {
            throw new ApiError(401, "User not found or invalid token");
        }
        
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, "Invalid or expired access token");
    }
});

// RBAC Middleware
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.roles) {
            throw new ApiError(401, "User role not found");
        }
        if (!allowedRoles.includes(req.user.roles)) {
            throw new ApiError(403, `Role '${req.user.roles}' is not allowed to access this resource`);
        }
        next();
    };
};