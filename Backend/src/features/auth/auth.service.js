import jwt from "jsonwebtoken";

const createAccessToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "1d" });

export { createAccessToken };
