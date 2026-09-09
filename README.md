# CogExperiments — FINAL CLEAN v4

Fresh rebuild for a new site.

## Architecture
Participant side:
- Open a specific experiment link
- Enter participant code
- Read instructions
- Complete experiment
- Responses are saved centrally when Supabase is connected

Admin side:
- Login only
- No public registration
- Admin accounts are created manually in Supabase and explicitly added to `admin_users`
- Create/edit/publish experiments
- View results
- Export Excel

## Universal Experiment Builder
There is no hardcoded Circles / Vertical Lines / Auditory selector.
Admins can freely define:
- blocks
- block names
- trial counts
- exposure duration
- ISI
- breaks
- response keys
- stopping rules
- uploaded image/audio/video stimuli

## Excel
- Participants: one row per participant, per-block 1/2/3 counts, percentages, sequence, missing
- Trial_Data: one trial per row
- Experiment_Settings: readable experiment settings

## Production setup
1. Create a new Supabase project.
2. Run `supabase/schema.sql`.
3. Create admin users manually in Supabase Authentication.
4. Add their UUIDs to `public.admin_users`.
5. Put Supabase Project URL + publishable key in `assets/config.js`.
6. Set `DEMO_MODE: false`.
7. Deploy the folder contents to a new GitHub repository / GitHub Pages site.
