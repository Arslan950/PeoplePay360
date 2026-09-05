import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const generateTempPassword = () => crypto.randomBytes(12).toString("base64url");
const hashPassword = (password) => bcrypt.hash(password, 12);
const comparePassword = (password, passwordHash) => bcrypt.compare(password, passwordHash);

export { generateTempPassword, hashPassword, comparePassword };
