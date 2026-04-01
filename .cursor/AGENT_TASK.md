# Task: Fix Vercel Deployment Failure

The goal is to fix the Vercel deployment for the `goldengoosetees-studio` project. The application consistently fails during runtime with a `500 FUNCTION_INVOCATION_FAILED` error on all API routes.

## Problem Analysis

The root cause is a module resolution failure within the Vercel serverless function environment. The TypeScript API routes in the `/api` directory fail to locate their shared library dependencies from the `/api/_lib` directory, resulting in an `[ERR_MODULE_NOT_FOUND]` error at runtime.

## Failed Attempts (Do Not Repeat)

The following standard solutions have been attempted and have all failed. The Vercel build environment for this specific project does not seem to respect them:

1.  **Relative Path Imports with `.js` extension**: e.g., `import { ... } from '../_lib/printful.js'`
2.  **TypeScript Path Aliases**: Using `'@/api/_lib/*'` defined in `tsconfig.json`.
3.  **Node.js Subpath Imports**: Using `'#api/*'` defined in the `imports` field of `package.json`.

Do not try to fix this by re-configuring paths. The next step is a brute-force solution.

## The Plan: Code Consolidation

The only remaining solution is to make every serverless function file self-contained by inlining all its dependencies. This eliminates the module resolution problem entirely.

### Your Step-by-Step Instructions:

1.  **Iterate through every `.ts` file** inside the `C:\Users\brand\goldengoosetees-studio-1\api` directory (and its subdirectories).
2.  For each file, **identify all `import` statements** that reference a path starting with `../_lib/`, `../../_lib/`, or similar (anything pointing to the `api/_lib` directory).
3.  For each identified import:
    a. **Read the full content** of the source file (e.g., read the code from `api/_lib/auth.ts`).
    b. **Paste the entire content** of that library file at the top of the target API file.
    c. **Remove the original `import` statement**.
4.  **Repeat this process** until the API file has no more imports pointing to the `_lib` directory.
5.  Once **ALL** TypeScript files in the `/api` directory have had their dependencies inlined, **delete the entire `api/_lib` directory**.
6.  Commit all changes to git with the message: `fix(api): consolidate all serverless function code to eliminate module resolution failures`.
7.  Deploy the project to production by running `vercel --prod --yes` in the terminal.
8.  Verify the live site (`https://www.goldengoosetees.com/`) is working by testing the catalog and AI design generation features.

This is a large, repetitive task, but it is the confirmed path forward. Do not deviate from this plan.
