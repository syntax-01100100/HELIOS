/*
# Create Buddy Link tables (single-tenant, no auth)

1. New Tables
- `crew_profiles`: stores crew member profiles for the Buddy Link feature.
  - `id` (uuid, primary key)
  - `callsign` (text, the crew member's callsign/name)
  - `role` (text, e.g. Commander, Engineer, Medical)
  - `status` (text, e.g. NOMINAL, CAUTION, ALERT)
  - `hr` (integer, heart rate for display)
  - `spo2` (integer, blood oxygen for display)
  - `created_at` (timestamp)
- `buddy_links`: stores buddy connections between two crew members.
  - `id` (uuid, primary key)
  - `from_id` (uuid, references crew_profiles)
  - `to_id` (uuid, references crew_profiles)
  - `status` (text, PENDING or CONNECTED)
  - `created_at` (timestamp)
- `buddy_alerts`: stores alerts sent between connected buddies.
  - `id` (uuid, primary key)
  - `sender_id` (uuid, references crew_profiles)
  - `recipient_id` (uuid, references crew_profiles)
  - `message` (text, the alert message)
  - `level` (text, CAUTION or CRITICAL)
  - `acknowledged` (boolean, whether the recipient acknowledged it)
  - `created_at` (timestamp)

2. Security
- Enable RLS on all three tables.
- Grant CRUD to anon + authenticated (single-tenant concept demo, no sign-in).
- All data is intentionally shared/public so USING(true) is appropriate.

3. Important Notes
- This is a concept prototype, not a real crew management system.
- No authentication is used; the anon-key client can read and write all data.
- Realtime is enabled on all three tables for live updates.
*/

CREATE TABLE IF NOT EXISTS crew_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  callsign text NOT NULL,
  role text NOT NULL DEFAULT 'Crew',
  status text NOT NULL DEFAULT 'NOMINAL',
  hr integer NOT NULL DEFAULT 72,
  spo2 integer NOT NULL DEFAULT 98,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crew_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON crew_profiles TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_crew" ON crew_profiles;
CREATE POLICY "anon_select_crew" ON crew_profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_crew" ON crew_profiles;
CREATE POLICY "anon_insert_crew" ON crew_profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_crew" ON crew_profiles;
CREATE POLICY "anon_update_crew" ON crew_profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_crew" ON crew_profiles;
CREATE POLICY "anon_delete_crew" ON crew_profiles FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS buddy_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL REFERENCES crew_profiles(id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES crew_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE buddy_links ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON buddy_links TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_links" ON buddy_links;
CREATE POLICY "anon_select_links" ON buddy_links FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_links" ON buddy_links;
CREATE POLICY "anon_insert_links" ON buddy_links FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_links" ON buddy_links;
CREATE POLICY "anon_update_links" ON buddy_links FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_links" ON buddy_links;
CREATE POLICY "anon_delete_links" ON buddy_links FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS buddy_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES crew_profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES crew_profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  level text NOT NULL DEFAULT 'CAUTION',
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE buddy_alerts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON buddy_alerts TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_alerts" ON buddy_alerts;
CREATE POLICY "anon_select_alerts" ON buddy_alerts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_alerts" ON buddy_alerts;
CREATE POLICY "anon_insert_alerts" ON buddy_alerts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_alerts" ON buddy_alerts;
CREATE POLICY "anon_update_alerts" ON buddy_alerts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_alerts" ON buddy_alerts;
CREATE POLICY "anon_delete_alerts" ON buddy_alerts FOR DELETE
  TO anon, authenticated USING (true);

ALTER TABLE crew_profiles REPLICA IDENTITY FULL;
ALTER TABLE buddy_links REPLICA IDENTITY FULL;
ALTER TABLE buddy_alerts REPLICA IDENTITY FULL;
