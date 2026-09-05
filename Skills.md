# Project Engineering & Security Rules

## Purpose

These are mandatory rules for all code written for this project.

Any developer or AI coding agent working on this project MUST follow these rules unless explicitly instructed otherwise.

---

# 1. General Development Rules

### Rule 1 — Understand Before Implementing

Before implementing a non-trivial feature, identify:

* Inputs
* Outputs
* Authentication requirements
* Authorization requirements
* Database interactions
* External dependencies
* Failure cases
* Security risks

Do not blindly implement a feature from a short prompt.

---

### Rule 2 — Prefer Simple Solutions

Use the simplest architecture that correctly solves the problem.

Do not introduce:

* Microservices
* Kubernetes
* Redis
* Message queues
* Complex caching
* Multiple databases

unless there is a clear requirement or measurable benefit.

---

### Rule 3 — Do Not Over-Engineer the Hackathon Prototype

The primary objective is:

```text
Working
+
Correct
+
Secure
+
Explainable
```

Infrastructure complexity is secondary.

---

# 2. Security Rules

## Rule 4 — Never Trust Client Input

Every value received from:

* Request body
* Query parameters
* URL parameters
* Headers
* Cookies
* Uploaded files

must be considered untrusted.

Validate input on the backend.

Frontend validation is useful for UX but is NOT a security boundary.

---

## Rule 5 — Authentication Is Mandatory for Protected Resources

Protected APIs must verify the user's identity.

Never assume that the frontend has already authenticated the user.

---

## Rule 6 — Authorization Must Be Checked Server-Side

Authentication does not automatically grant access.

For every protected resource:

```text
Authenticated?
     ↓
Authorized?
     ↓
Owns resource?
     ↓
Allow
```

A user must never be able to access another user's:

* Resume
* Profile
* Analysis
* Files
* Projects
* Private data

simply by changing an ID in the request.

---

# 3. Secrets

## Rule 7 — Never Hardcode Secrets

Never commit:

* API keys
* Database passwords
* JWT secrets
* Access tokens
* Private credentials

into source code.

Use environment variables or an appropriate secret-management system.

Example:

```text
.env
OPENAI_API_KEY=...
DATABASE_URL=...
JWT_SECRET=...
```

`.env` must not be committed to Git.

Use `.env.example` for documentation:

```text
OPENAI_API_KEY=
DATABASE_URL=
JWT_SECRET=
```

---

# 4. File Upload Security

## Rule 8 — Validate File Size

Every upload endpoint must enforce a maximum file size.

Example:

```text
Maximum resume size = 5 MB
```

The limit must be enforced server-side.

Do not rely only on frontend restrictions.

---

## Rule 9 — Validate File Type

Do not trust only the filename extension.

Bad:

```text
filename.endsWith(".pdf")
```

Use appropriate server-side file validation.

For sensitive upload workflows, verify the actual file type/signature where practical.

Maintain an explicit allowlist:

```text
Allowed:
PDF
DOCX

Everything else:
Reject
```

---

## Rule 10 — Never Trust User-Provided Filenames

Do not directly use the original filename as the storage path.

Bad:

```text
/uploads/<user-provided-filename>
```

Prefer generated identifiers:

```text
/uploads/<generated-id>.pdf
```

---

## Rule 11 — Prevent Path Traversal

Never construct filesystem paths from untrusted user input without safe handling.

Reject or neutralize attempts such as:

```text
../../file
../
absolute paths
```

Prefer generated storage keys/IDs.

---

## Rule 12 — Protect Uploaded Files

Uploaded private files must not automatically become publicly accessible.

Access should go through authorization checks or appropriately protected object storage.

---

# 5. Database Rules

## Rule 13 — Validate Database Input

Do not directly pass arbitrary user objects into database operations.

Validate expected fields and types.

Only allow fields that the application expects.

---

## Rule 14 — Prevent Injection

Do not construct database queries by blindly concatenating user input.

Use:

* Parameterized queries
* Safe query builders
* ORM mechanisms
* Proper validation

where applicable.

---

## Rule 15 — Avoid Unnecessary Queries

Do not repeatedly query the database inside loops when the operation can reasonably be batched or optimized.

Do not optimize prematurely, but avoid obviously inefficient patterns.

---

# 6. API Rules

## Rule 16 — Use Correct HTTP Status Codes

Use meaningful status codes.

```text
200 → Success
201 → Created
400 → Bad request
401 → Authentication required/failed
403 → Forbidden
404 → Not found
409 → Conflict
429 → Rate limited
500 → Internal error
502/503 → External dependency unavailable
```

---

## Rule 17 — Never Expose Internal Errors

Do not return:

* Stack traces
* Database errors
* API keys
* Internal paths
* Internal infrastructure details

to the client.

Instead:

```text
Client:
"Unable to process your request. Please try again."

Server log:
Detailed technical error
```

---

## Rule 18 — Every External API Call Must Handle Failure

External APIs can:

* Timeout
* Return 4xx
* Return 5xx
* Rate-limit requests
* Become unavailable
* Return malformed/unexpected responses

Code must handle these conditions.

Never assume an AI API call always succeeds.

---

# 7. AI API Rules

## Rule 19 — Use Timeouts

External AI requests must not be allowed to hang indefinitely.

Define a reasonable timeout.

---

## Rule 20 — Retry Carefully

Retries may be used for transient failures such as:

```text
Timeout
Temporary network error
5xx
```

Use exponential backoff where appropriate.

Do not blindly retry:

```text
Invalid request
Invalid API key
Invalid input
```

because retries will not fix those problems.

---

## Rule 21 — Fallback Providers Must Be Intentional

A fallback AI API may be used when appropriate.

Example:

```text
Primary AI
    ↓
Temporary failure?
    ↓
Fallback AI
```

Do not automatically send every failure to the fallback provider.

Invalid requests should be fixed rather than duplicated against another provider.

---

## Rule 22 — Cache AI Responses Carefully

Caching can reduce:

* API cost
* Latency
* Rate-limit pressure

But cached responses must correspond to the request.

Cache keys should account for relevant input and configuration, such as:

```text
Input
+
Model
+
Prompt/version
+
Relevant configuration
```

Never return a previous user's response.

Never return an unrelated "similar" response merely because it appears applicable.

---

# 8. Rate Limiting

## Rule 23 — Protect Expensive Endpoints

Rate-limit endpoints that can be abused, especially:

* Login
* Registration
* File uploads
* AI analysis
* Password reset
* Expensive processing

Example:

```text
User/IP
   ↓
Request counter
   ↓
Limit exceeded
   ↓
HTTP 429
```

The exact limits should depend on the application.

---

# 9. Logging Rules

## Rule 24 — Logs Must Be Useful

Logs should help answer:

```text
What happened?
When?
Where?
For which request?
Did it succeed?
Why did it fail?
```

Useful fields include:

```text
timestamp
requestId
userId (safe internal identifier)
endpoint
HTTP method
statusCode
duration
error category
external service status
```

---

## Rule 25 — Never Log Sensitive Data

NEVER log:

```text
Passwords
API keys
JWTs/access tokens
Database credentials
Full resumes
Resume text
Sensitive request bodies
Payment information
Private documents
```

Bad:

```javascript
console.log(resumeText);
```

Good:

```text
Resume processing started
requestId: abc123
fileType: pdf
fileSize: 1.2MB
```

---

## Rule 26 — Do Not Use Logs as a Data Store

Logs are for debugging and operational visibility.

Do not rely on logs to permanently store application data.

---

# 10. Error Handling Rules

## Rule 27 — Every Important Operation Needs a Failure Path

Consider:

```text
Database failure
AI failure
Network failure
Invalid input
Unauthorized access
Missing resource
File failure
Timeout
Rate limit
```

The application should fail gracefully.

---

## Rule 28 — Do Not Swallow Errors

Bad:

```javascript
try {
   ...
} catch (error) {
}
```

An error should either:

* Be handled appropriately
* Be logged safely
* Be propagated to an appropriate error handler

Do not silently ignore failures.

---

# 11. Frontend Rules

## Rule 29 — Never Assume API Success

Every important API call should have:

```text
Loading
Success
Error
```

and, where appropriate:

```text
Empty
Retry
```

---

## Rule 30 — Frontend Is Not a Security Boundary

Never rely on:

```text
Hidden buttons
Disabled UI
Frontend role checks
Frontend validation
```

to protect resources.

The backend must enforce security.

---

# 12. CORS

## Rule 31 — Restrict CORS

Do not use unrestricted CORS in production without a specific reason.

Prefer:

```text
Allowed origin:
Your frontend application
```

rather than:

```text
*
```

when credentials or sensitive APIs are involved.

---

# 13. HTTPS

## Rule 32 — Use HTTPS in Production

Sensitive communication must use encrypted transport.

This protects:

* Credentials
* Authentication information
* Resume uploads
* Personal information
* API communication

---

# 14. Node.js Rules

## Rule 33 — Do Not Block the Event Loop

Avoid expensive synchronous operations in request handlers.

Be careful with:

```text
CPU-heavy processing
Large synchronous file operations
Expensive synchronous loops
```

For CPU-intensive workloads, consider:

```text
Worker Threads
Separate process/service
Background jobs
```

when actually necessary.

---

# 15. Multi-User Rules

## Rule 34 — Assume Multiple Users

Code must not accidentally share one user's:

* Data
* Files
* Cache entries
* AI responses
* Sessions

between users.

Every user-specific resource must have appropriate ownership/access control.

---

## Rule 35 — Avoid Server-Local State for Scalable Components

Do not depend on process-local memory for state that must survive:

```text
Restart
Multiple instances
Load balancing
```

Use appropriate shared storage when necessary.

---

# 16. Health Checks

## Rule 36 — Provide a Basic Health Endpoint

Where practical, provide:

```http
GET /health
```

Example response:

```json
{
  "status": "ok"
}
```

For a more advanced deployment, health checks may also verify critical dependencies.

---

# 17. Monitoring Rules

## Rule 37 — Know What Should Be Monitored

Production monitoring should eventually track:

```text
Request count
Request latency
Error rate
CPU
Memory
Database latency
AI API latency
AI API failures
Rate-limit events
```

Prometheus + Grafana may be introduced when the project actually needs operational monitoring.

For a hackathon prototype, do not delay core development just to build a complex monitoring stack.

---

# 18. Docker Rules

## Rule 38 — Docker Should Solve a Real Problem

Use Docker when it provides value such as:

* Reproducible environment
* Easier deployment
* Consistent dependencies
* Deployment portability

Do not add Docker merely to make the architecture look more professional.

---

# 19. Kubernetes Rules

## Rule 39 — Kubernetes Is Not a Default Requirement

Do not introduce Kubernetes into a small project unless there is a real need for:

* Multiple replicas
* Automated orchestration
* Automated scaling
* Rolling deployments
* Container health management
* Complex multi-service infrastructure

For a hackathon prototype:

```text
Node.js
+
Database
+
External AI API
```

is usually preferable to:

```text
Kubernetes
+
Multiple microservices
+
Complex infrastructure
```

unless specifically required.

---

# 20. Dependency Rules

## Rule 40 — Minimize Dependencies

Before installing a package, ask:

```text
Do we actually need it?
Can the existing stack solve this?
Is the package maintained?
Does it introduce unnecessary security risk?
```

Do not install packages simply because an AI coding assistant suggested them.

---

# 21. AI-Generated Code Rules

## Rule 41 — AI Code Must Be Reviewed

AI-generated code is not automatically trusted.

Before accepting generated code, verify:

```text
What does it do?
Why is it needed?
Is it secure?
What happens on failure?
Does it handle multiple users?
Does it leak data?
Does it introduce unnecessary dependencies?
Can I explain it?
```

---

## Rule 42 — No Blind Copy-Paste

Never accept code solely because:

> "The AI generated it."

The developer is responsible for understanding and validating the implementation.

---

# 22. Change Rules

## Rule 43 — Do Not Break Existing Functionality

Before changing shared code:

1. Understand its current purpose.
2. Identify dependencies.
3. Make the smallest reasonable change.
4. Test affected functionality.

---

## Rule 44 — Do Not Rewrite Working Code Without Reason

Avoid unnecessary rewrites during feature development.

Prefer incremental changes.

---

# 23. Architecture Decision Rule

For every significant technology choice, the developer should be able to answer:

```text
Why this technology?
What problem does it solve?
What alternatives were considered?
What is the trade-off?
What happens if it fails?
```

Example:

> "We use Redis here because the operation is expensive and frequently repeated. It reduces latency and external API calls. The trade-off is additional infrastructure and cache invalidation."

---

# 24. Pre-Commit Security Checklist

Before considering a feature complete:

```text
[ ] Input validated on backend
[ ] Authentication checked where required
[ ] Authorization checked
[ ] Resource ownership checked
[ ] Secrets not hardcoded
[ ] File type validated
[ ] File size limited
[ ] File paths protected
[ ] Database queries safe
[ ] External APIs have failure handling
[ ] Timeouts configured where appropriate
[ ] Rate limiting considered
[ ] Sensitive information not logged
[ ] Errors do not expose internals
[ ] Frontend handles API errors
[ ] Multiple-user behavior considered
```

---

# 25. Final Engineering Principle

Every implementation should follow:

```text
Understand
   ↓
Design
   ↓
Validate
   ↓
Implement
   ↓
Handle Failure
   ↓
Secure
   ↓
Test
   ↓
Explain
```

The objective is not to build the most complicated system.

The objective is to build the **simplest system that is correct, secure, reliable, and explainable.**
