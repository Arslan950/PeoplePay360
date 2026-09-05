/**
 * Dummy data seeder for PeoplePay360.
 *
 * Drop this in Backend/src/db/seedDummyData.js and run with:
 *   node src/db/seedDummyData.js
 *
 * Seeds (in dependency order):
 *   1. WorkingSchedule  - a couple of shift patterns
 *   2. Employee         - ~10 employees across departments, with manager links
 *   3. User             - login accounts for a subset of employees (mixed roles)
 *   4. TimeoffType       - reuses the same types as seed.js
 *   5. Allocation        - annual/sick leave balances per employee
 *   6. Request           - a mix of pending/approved/refused timeoff requests
 *   7. SalaryStructure/SalaryRule - one "Regular Salary" structure Payroll can
 *      actually use (Basic -> HRA -> Gross -> Tax -> Net)
 *   8. Contract          - one RUNNING contract per active employee, linked
 *      to that Salary Structure (an inactive employee gets an EXPIRED one)
 *   9. Attendance        - check-in/out records for the last 5 working days
 *
 * All inserts are idempotent (upsert on a natural unique key), so this is
 * safe to re-run.
 *
 * FIX (see chat): this file previously created Contracts with `contractNumber`
 * / `wagePerMonth` fields and no `status`. The live Contract schema uses
 * `code` (required, unique) / `wageMonthly`, and `status` defaults to
 * "draft" if not set explicitly. That mismatch made this script crash on
 * Contract.create() (missing required `code`) and, even if patched to not
 * crash, would have left every contract as "draft" — meaning Payroll would
 * never find a "running" contract for anyone, and the Payrun wizard's
 * eligible-employee list would always be empty. Both are fixed below.
 */

import "dotenv/config";
import mongoose from "mongoose";

import { Employee } from "../features/employees/employee.model.js";
import { User } from "../features/users/user.model.js";
import { WorkingSchedule } from "../features/schedules/schedule.model.js";
import { Contract } from "../features/contracts/contract.model.js";
import { nextContractNumber } from "../features/contracts/contract.service.js";
import { Attendance } from "../features/attendance/attendance.model.js";
import { TimeoffType } from "../features/timeoff/timeoffType.model.js";
import { Allocation } from "../features/timeoff/allocation.model.js";
import { Request as TimeoffRequest } from "../features/timeoff/request.model.js";
import { SalaryStructure } from "../features/payroll/salaryStructure.model.js";
import { SalaryRule } from "../features/payroll/salaryRule.model.js";
import { hashPassword } from "../features/users/user.service.js";

const DEFAULT_PASSWORD = process.env.SEED_DUMMY_PASSWORD || "Password@123";

// ---------- 1. Working schedules ----------
const schedules = [
    {
        name: "Standard 9-6",
        weeklyHours: 40,
        timezone: "Asia/Kolkata",
        calendarType: "fixed",
        status: "active",
        weeklyPattern: ["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => ({
            day, isWorkingDay: true, startTime: "09:00", endTime: "18:00", breakMinutes: 60,
        })).concat([
            { day: "Sat", isWorkingDay: false, startTime: null, endTime: null, breakMinutes: 0 },
            { day: "Sun", isWorkingDay: false, startTime: null, endTime: null, breakMinutes: 0 },
        ]),
    },
    {
        name: "Flexible Hours",
        weeklyHours: 40,
        timezone: "Asia/Kolkata",
        calendarType: "flexible",
        status: "active",
        weeklyPattern: [],
    },
];

// ---------- 2. Employees ----------
// managerEmail lets us wire up the `manager` self-reference after insert.
const employees = [
    { name: "Vikram Rao", email: "vikram.rao@peoplepay360.local", phone: "+91 90000 20001", department: "Engineering", jobPosition: "Engineering Manager", employeeType: "full_time", status: "active", joinDate: new Date("2022-03-01"), managerEmail: null, scheduleName: "Standard 9-6" },
    { name: "Priya Sharma", email: "priya.sharma@peoplepay360.local", phone: "+91 90000 20002", department: "Engineering", jobPosition: "Backend Developer", employeeType: "full_time", status: "active", joinDate: new Date("2023-02-10"), managerEmail: "vikram.rao@peoplepay360.local", scheduleName: "Standard 9-6" },
    { name: "Rohit Verma", email: "rohit.verma@peoplepay360.local", phone: "+91 90000 20003", department: "Engineering", jobPosition: "Frontend Developer", employeeType: "full_time", status: "active", joinDate: new Date("2023-06-19"), managerEmail: "vikram.rao@peoplepay360.local", scheduleName: "Flexible Hours" },
    { name: "Simran Kaur", email: "simran.kaur@peoplepay360.local", phone: "+91 90000 20004", department: "Human Resources", jobPosition: "HR Manager", employeeType: "full_time", status: "active", joinDate: new Date("2021-11-05"), managerEmail: null, scheduleName: "Standard 9-6" },
    { name: "Neha Gupta", email: "neha.gupta@peoplepay360.local", phone: "+91 90000 20005", department: "Human Resources", jobPosition: "HR Executive", employeeType: "full_time", status: "active", joinDate: new Date("2024-01-22"), managerEmail: "simran.kaur@peoplepay360.local", scheduleName: "Standard 9-6" },
    { name: "Arjun Nair", email: "arjun.nair@peoplepay360.local", phone: "+91 90000 20006", department: "Finance", jobPosition: "Payroll Manager", employeeType: "full_time", status: "active", joinDate: new Date("2020-07-14"), managerEmail: null, scheduleName: "Standard 9-6" },
    { name: "Ananya Iyer", email: "ananya.iyer@peoplepay360.local", phone: "+91 90000 20007", department: "Finance", jobPosition: "Payroll Executive", employeeType: "full_time", status: "active", joinDate: new Date("2023-09-01"), managerEmail: "arjun.nair@peoplepay360.local", scheduleName: "Standard 9-6" },
    { name: "Karan Malhotra", email: "karan.malhotra@peoplepay360.local", phone: "+91 90000 20008", department: "Sales", jobPosition: "Sales Executive", employeeType: "full_time", status: "active", joinDate: new Date("2024-04-12"), managerEmail: null, scheduleName: "Flexible Hours" },
    { name: "Divya Menon", email: "divya.menon@peoplepay360.local", phone: "+91 90000 20009", department: "Design", jobPosition: "Product Designer", employeeType: "contract", status: "active", joinDate: new Date("2024-08-01"), managerEmail: "vikram.rao@peoplepay360.local", scheduleName: "Flexible Hours" },
    { name: "Suresh Pillai", email: "suresh.pillai@peoplepay360.local", phone: "+91 90000 20010", department: "Engineering", jobPosition: "QA Engineer", employeeType: "full_time", status: "inactive", joinDate: new Date("2022-10-03"), managerEmail: "vikram.rao@peoplepay360.local", scheduleName: "Standard 9-6" },
];

// ---------- 3. Users ----------
// Only some employees get login accounts, with a mix of roles.
const userAccounts = [
    { email: "vikram.rao@peoplepay360.local", role: "hr_manager" },
    { email: "priya.sharma@peoplepay360.local", role: "employee" },
    { email: "rohit.verma@peoplepay360.local", role: "employee" },
    { email: "simran.kaur@peoplepay360.local", role: "hr_manager" },
    { email: "neha.gupta@peoplepay360.local", role: "employee" },
    { email: "arjun.nair@peoplepay360.local", role: "hr_payroll_manager" },
    { email: "ananya.iyer@peoplepay360.local", role: "hr_payroll_user" },
    // Karan, Divya, Suresh intentionally left without login accounts,
    // to exercise the "employee record with no user" case.
];

const timeoffTypes = [
    { name: "Annual Leave", unit: "days", requiresAllocation: true, requiresApproval: true, status: "active" },
    { name: "Sick Leave", unit: "days", requiresAllocation: true, requiresApproval: true, status: "active" },
    { name: "Unpaid Leave", unit: "days", requiresAllocation: false, requiresApproval: true, status: "active" },
];

// ---------- 7. Salary Structure & Rules ----------
// One structure: Basic Salary = 100% of contract wage, HRA = 20% of Basic,
// Gross = Basic + HRA, Tax = 10% of Gross, Net = Gross - Tax.
// Sequence matters: each rule can only reference a code computed *before* it.
const salaryRuleDefs = [
    { name: "Basic Salary", code: "BASIC", category: "basic", sequence: 10, computationType: "percentage", percentageBase: "contract_wage", percentageValue: 100 },
    { name: "House Rent Allowance", code: "HRA", category: "allowance", sequence: 20, computationType: "percentage", percentageBase: "basic_salary", percentageValue: 20 },
    { name: "Gross Salary", code: "GROSS", category: "gross", sequence: 30, computationType: "formula", formulaExpression: "BASIC + HRA" },
    { name: "Income Tax", code: "TAX", category: "deduction", sequence: 40, computationType: "percentage", percentageBase: "gross_salary", percentageValue: 10 },
    { name: "Net Salary", code: "NET", category: "net", sequence: 50, computationType: "formula", formulaExpression: "GROSS - TAX" },
];

const workingDaysBack = (n) => {
    const days = [];
    const d = new Date();
    while (days.length < n) {
        d.setDate(d.getDate() - 1);
        const day = d.getDay();
        if (day !== 0 && day !== 6) days.push(new Date(d));
    }
    return days;
};

const seed = async () => {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
    await mongoose.connect(process.env.MONGODB_URI);

    // 1. Schedules
    const scheduleIdByName = {};
    for (const s of schedules) {
        const doc = await WorkingSchedule.findOneAndUpdate(
            { name: s.name },
            { $set: s },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
        );
        scheduleIdByName[s.name] = doc._id;
    }

    // 2. Employees (first pass: upsert without manager, so ids exist to link)
    const employeeIdByEmail = {};
    for (const e of employees) {
        const doc = await Employee.findOneAndUpdate(
            { email: e.email },
            {
                $set: {
                    name: e.name,
                    phone: e.phone,
                    department: e.department,
                    jobPosition: e.jobPosition,
                    employeeType: e.employeeType,
                    status: e.status,
                    joinDate: e.joinDate,
                    workingSchedule: scheduleIdByName[e.scheduleName] || null,
                },
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
        );
        employeeIdByEmail[e.email] = doc._id;
    }

    // second pass: wire up manager references
    for (const e of employees) {
        if (e.managerEmail) {
            await Employee.updateOne(
                { _id: employeeIdByEmail[e.email] },
                { $set: { manager: employeeIdByEmail[e.managerEmail] } },
            );
        }
    }

    // 3. Users, linked back to their employee record
    const createdCredentials = [];
    for (const u of userAccounts) {
        const employeeId = employeeIdByEmail[u.email];
        let user = await User.findOne({ email: u.email });
        if (!user) {
            user = await User.create({
                email: u.email,
                role: u.role,
                isActive: true,
                employee: employeeId,
                passwordHash: await hashPassword(DEFAULT_PASSWORD),
            });
            createdCredentials.push(u.email);
        } else {
            user.role = u.role;
            user.employee = employeeId;
            await user.save();
        }
        await Employee.updateOne({ _id: employeeId }, { $set: { user: user._id } });
    }

    // 4. Timeoff types
    const timeoffTypeIdByName = {};
    for (const t of timeoffTypes) {
        const doc = await TimeoffType.findOneAndUpdate(
            { name: t.name },
            { $setOnInsert: t },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
        );
        timeoffTypeIdByName[t.name] = doc._id;
    }

    // 5. Allocations - give every active employee an annual + sick leave balance
    const activeEmployees = employees.filter((e) => e.status === "active");
    for (const e of activeEmployees) {
        const employeeId = employeeIdByEmail[e.email];
        await Allocation.findOneAndUpdate(
            { employee: employeeId, timeoffType: timeoffTypeIdByName["Annual Leave"] },
            { $setOnInsert: { totalDays: 18, takenDays: 2, status: "approved" } },
            { upsert: true, setDefaultsOnInsert: true },
        );
        await Allocation.findOneAndUpdate(
            { employee: employeeId, timeoffType: timeoffTypeIdByName["Sick Leave"] },
            { $setOnInsert: { totalDays: 10, takenDays: 0, status: "approved" } },
            { upsert: true, setDefaultsOnInsert: true },
        );
    }

    // 6. A handful of timeoff requests in different states
    const sampleRequests = [
        { email: "priya.sharma@peoplepay360.local", type: "Annual Leave", start: -20, end: -18, status: "approved", reason: "Family trip" },
        { email: "rohit.verma@peoplepay360.local", type: "Sick Leave", start: -3, end: -3, status: "approved", reason: "Fever" },
        { email: "neha.gupta@peoplepay360.local", type: "Annual Leave", start: 5, end: 7, status: "pending", reason: "Wedding" },
        { email: "ananya.iyer@peoplepay360.local", type: "Unpaid Leave", start: 10, end: 10, status: "refused", reason: "Personal", refusalReason: "Payroll close week" },
    ];
    const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
    for (const r of sampleRequests) {
        const employeeId = employeeIdByEmail[r.email];
        const typeId = timeoffTypeIdByName[r.type];
        const startDate = addDays(r.start);
        const endDate = addDays(r.end);
        const exists = await TimeoffRequest.findOne({ employee: employeeId, timeoffType: typeId, startDate });
        if (!exists) {
            await TimeoffRequest.create({
                employee: employeeId,
                timeoffType: typeId,
                startDate,
                endDate,
                duration: Math.round((endDate - startDate) / 86400000) + 1,
                status: r.status,
                reason: r.reason,
                refusalReason: r.refusalReason || null,
            });
        }
    }

    // 7. Salary Structure + Rules - "Regular Salary"
    const structure = await SalaryStructure.findOneAndUpdate(
        { name: "Regular Salary" },
        { $setOnInsert: { description: "Standard structure: Basic, HRA, Gross, Tax, Net", isActive: true } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    for (const rule of salaryRuleDefs) {
        await SalaryRule.findOneAndUpdate(
            { code: rule.code, salaryStructure: structure._id },
            { $set: { ...rule, salaryStructure: structure._id, isActive: true } },
            { upsert: true, runValidators: true, setDefaultsOnInsert: true },
        );
    }

    // 8. One contract per employee, linked to the Regular Salary structure.
    // Active employees get a RUNNING contract (this is what Payroll's
    // eligible-employee query actually filters on); the one inactive
    // employee gets an EXPIRED contract instead, on purpose, to exercise
    // that path too.
    const wageByPosition = {
        "Engineering Manager": 180000, "Backend Developer": 110000, "Frontend Developer": 105000,
        "HR Manager": 130000, "HR Executive": 65000, "Payroll Manager": 140000, "Payroll Executive": 70000,
        "Sales Executive": 60000, "Product Designer": 95000, "QA Engineer": 85000,
    };
    for (const e of employees) {
        const employeeId = employeeIdByEmail[e.email];
        const exists = await Contract.findOne({ employee: employeeId });
        if (!exists) {
            const isActive = e.status === "active";
            await Contract.create({
                code: await nextContractNumber(e.joinDate.getFullYear()),
                employee: employeeId,
                department: e.department,
                jobPosition: e.jobPosition,
                startDate: e.joinDate,
                endDate: isActive ? null : new Date(),
                wageMonthly: wageByPosition[e.jobPosition] || 50000,
                workingSchedule: scheduleIdByName[e.scheduleName] || null,
                salaryStructure: structure._id,
                status: isActive ? "running" : "expired",
                notes: "Seeded dummy contract",
            });
        }
    }

    // 9. Attendance for the last 5 working days, active employees only
    const days = workingDaysBack(5);
    for (const e of activeEmployees) {
        const employeeId = employeeIdByEmail[e.email];
        for (const day of days) {
            const checkIn = new Date(day);
            checkIn.setHours(9, Math.floor(Math.random() * 20), 0, 0);
            const checkOut = new Date(checkIn);
            checkOut.setHours(18, Math.floor(Math.random() * 30), 0, 0);
            const dateStr = `${checkIn.getFullYear()}-${String(checkIn.getMonth() + 1).padStart(2, "0")}-${String(checkIn.getDate()).padStart(2, "0")}`;
            await Attendance.findOneAndUpdate(
                { employee: employeeId, date: dateStr },
                {
                    $setOnInsert: {
                        checkIn,
                        checkOut,
                        durationMinutes: Math.round((checkOut - checkIn) / 60000),
                        source: "seed",
                    },
                },
                { upsert: true, setDefaultsOnInsert: true },
            );
        }
    }

    console.log(`Seeded ${schedules.length} working schedules`);
    console.log(`Seeded ${employees.length} employees`);
    console.log(`Seeded ${userAccounts.length} user accounts (role mix: ${[...new Set(userAccounts.map((u) => u.role))].join(", ")})`);
    if (createdCredentials.length) {
        console.log(`New logins created with password "${DEFAULT_PASSWORD}" for: ${createdCredentials.join(", ")}`);
    }
    console.log(`Seeded ${timeoffTypes.length} timeoff types, allocations for ${activeEmployees.length} employees, ${sampleRequests.length} sample requests`);
    console.log(`Seeded 1 salary structure ("Regular Salary") with ${salaryRuleDefs.length} rules`);
    console.log(`Seeded ${employees.length} contracts (${activeEmployees.length} running, ${employees.length - activeEmployees.length} expired)`);
    console.log(`Seeded attendance for ${activeEmployees.length} employees x ${days.length} days`);
};

try {
    await seed();
} finally {
    await mongoose.disconnect();
}
