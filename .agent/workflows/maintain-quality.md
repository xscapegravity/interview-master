---
description: Practice for maintaining code quality after changes
---

After making significant changes to the application code, follow these steps to ensure no regressions:

1. **Run Frontend Tests**:

   ```powershell
   npm test
   ```

   This runs Vitest for all frontend hooks and components.

2. **Run Server Integration Tests**:

   ```powershell
   npm run test:server
   ```

   This verifies the Gemini API connectivity and feedback generation logic.

3. **Check Build**:

   ```powershell
   npm run build
   ```

   Ensures TypeScript types are correct and the bundle can be generated.

4. **Verify Live State**:
   Check the terminal outputs for the running dev servers (`npm run dev` in both root and server) to ensure no runtime errors are occurring.
