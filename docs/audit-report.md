# GoldenGooseTees - Design System Overhaul Audit Report
## Overview
This document outlines the findings and planned fixes for Phase 1 of the multi-placement overhaul for GoldenGooseTees.

### Issues to Fix
- [ ] Migrate `Mockup` API to V2 pattern (the current `mockup-generator/create-task` logic is V1 endpoint pattern, must use V2 endpoint `/v2/mockup-tasks`)
- [ ] Currently, the frontend is directly communicating with Printful APIs through server endpoints, however `api/_lib/printful.ts` acts as the API implementation which needs refactoring to explicitly use `/v2/` printful URLs and handle limits.
- [ ] Printful `PRINTFUL_API_KEY` exists in .env logic, needs checking to make sure it doesn't get bundled by Vite.
- [ ] Replace `designs` and `orders` tables schema JSON structures in Supabase with `selected_placements (TEXT[])`, `canvas_data (JSONB)`, `placement_file_ids (JSONB)`, `placement_file_urls (JSONB)`, `mockup_task_ids (JSONB)`, `mockup_results (JSONB)`, `mockup_status (TEXT)` to support multi-placement logic natively in DB.
- [ ] Implement async mockup logic in frontend.
- [ ] Ensure stripe webhook properly handles `checkout.session.completed` raw body logic `bodyParser: false`.