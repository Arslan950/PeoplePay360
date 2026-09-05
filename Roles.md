1.Employee (the basic/default role)

Can do:

View their own employee details (their profile info)
View their own attendance records
View their own leave balances
Create attendance entries (e.g., logging their check-in/check-out, if the system requires manual entry)
Submit Time Off Requests (ask for leave)

Cannot do:

No payroll access at all — can't see payslips, salary structures, or anything payroll-related
No HR administration access — can't view or edit other employees' records, contracts, attendance, or leave
Can't approve their own or anyone else's leave requests

This is the most restricted role — think of it as "self-service only." An employee logs in mainly to check their own data and request time off.

2.HR Manager

Can do:

Full CRUD (Create, Read, Update, Delete) access to: Employees, Attendance, Contracts, Working Schedules, and Time Off modules — for all employees, not just themselves
Approve or refuse Time Off Requests submitted by employees

Cannot do:

No access to payroll features at all — explicitly stated. They can't see Payruns, Payslips, or Salary Structures/Rules

So this role owns the entire "people operations" side — hiring data, contracts, schedules, attendance corrections, leave approvals — but is deliberately walled off from salary/payroll data. This is a common real-world separation: HR manages people, but payroll is handled by a different, more restricted team.

3.HR Payroll User

Can do:

Everything an HR Manager can do (all of the above)
Plus: Create, Read, and Update access to Payruns and Payslips (so they can run payroll, generate payslips, process them)
Read-only access to Salary Structures and Salary Rules (they can see how salary is calculated, but can't change the formulas)

Cannot do:

Cannot Delete Payruns/Payslips (only Create/Read/Update — deletion isn't listed as a permission)
Cannot modify Salary Structures or Salary Rules — they can only view them, not edit the calculation logic

This role can run payroll month to month but can't redesign how payroll math works. That's intentional — it stops a regular payroll operator from accidentally (or maliciously) changing salary formulas.

4.HR Payroll Manager

Can do:

Everything an HR Payroll User can do
Plus: full CRUD access to Payruns, Payslips, Salary Structures, AND Salary Rules
Full control over all HR and payroll-related records and configurations

Cannot do:

The PDF doesn't explicitly restrict this role from anything within HR/Payroll — it's the top authority within that domain
However, it's not the same as Admin — nothing here suggests they manage user accounts/roles or non-HR modules

This is the "senior payroll authority" — they can redesign salary rules, delete bad payruns, fully own the calculation engine, not just operate it.

5.Admin

Can do:

Full access to all modules and models across the entire platform (HR, Payroll, everything)
User management: creating users, assigning roles, updating permissions
Complete system administration

Cannot do:

Nothing is restricted — this is the top-level "superuser" role