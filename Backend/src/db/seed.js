import crypto from "node:crypto";
import "dotenv/config";
import mongoose from "mongoose";
import { Employee } from "../features/employees/employee.model.js";
import { User } from "../features/users/user.model.js";
import { TimeoffType } from "../features/timeoff/timeoffType.model.js";
import { hashPassword } from "../features/users/user.service.js";

const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@peoplepay360.local").toLowerCase().trim();
const adminPassword = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url");

const employees = [
    {
        name: "Aarav Mehta",
        email: "aarav.mehta@peoplepay360.local",
        phone: "+91 90000 10001",
        department: "Engineering",
        jobPosition: "Senior Software Engineer",
        employeeType: "full_time",
        status: "active",
        joinDate: new Date("2024-01-15"),
    },
    {
        name: "Maya Johnson",
        email: "maya.johnson@peoplepay360.local",
        phone: "+1 555 010 1002",
        department: "People Operations",
        jobPosition: "HR Specialist",
        employeeType: "full_time",
        status: "active",
        joinDate: new Date("2023-08-07"),
    },
    {
        name: "Daniel Kim",
        email: "daniel.kim@peoplepay360.local",
        phone: "+1 555 010 1003",
        department: "Finance",
        jobPosition: "Payroll Analyst",
        employeeType: "full_time",
        status: "active",
        joinDate: new Date("2024-05-20"),
    },
];

const timeoffTypes = [
    { name: "Annual Leave", unit: "days", requiresAllocation: true, requiresApproval: true, status: "active" },
    { name: "Sick Leave", unit: "days", requiresAllocation: true, requiresApproval: true, status: "active" },
    { name: "Unpaid Leave", unit: "days", requiresAllocation: false, requiresApproval: true, status: "active" },
];

const seed = async () => {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");

    await mongoose.connect(process.env.MONGODB_URI);

    let admin = await User.findOne({ email: adminEmail });
    const adminWasCreated = !admin;
    if (!admin) {
        admin = await User.create({
            email: adminEmail,
            role: "admin",
            isActive: true,
            employee: null,
            passwordHash: await hashPassword(adminPassword),
        });
    } else {
        admin.role = "admin";
        admin.isActive = true;
        admin.employee = null;
        await admin.save();
    }

    for (const employeeData of employees) {
        await Employee.findOneAndUpdate(
            { email: employeeData.email },
            { $set: employeeData },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
        );
    }

    await Promise.all(timeoffTypes.map((type) => TimeoffType.updateOne(
        { name: type.name },
        { $setOnInsert: type },
        { upsert: true, runValidators: true, setDefaultsOnInsert: true },
    )));

    console.log(`Seeded admin: ${admin.email}`);
    if (!adminWasCreated) {
        console.log("Admin already existed; its password was not changed.");
    } else if (process.env.SEED_ADMIN_PASSWORD) {
        console.log("Admin password: the value supplied in SEED_ADMIN_PASSWORD");
    } else {
        console.log(`Generated admin password (share now; it is not stored in plaintext): ${adminPassword}`);
    }
    console.log(`Seeded employees: ${employees.length}`);
    console.log(`Seeded time off types: ${timeoffTypes.length}`);
};

try {
    await seed();
} finally {
    await mongoose.disconnect();
}
