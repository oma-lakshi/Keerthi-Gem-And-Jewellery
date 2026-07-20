/* ============================================================
   SUPABASE CONNECTION — edit these two lines, nothing else
   ============================================================
   Get both values from your Supabase project:
   Dashboard -> Project Settings -> API

   SUPABASE_URL        -> Settings -> Data API -> "Project URL"
   SUPABASE_ANON_KEY    -> Settings -> API Keys -> "Publishable key"
                            (starts with sb_publishable_...), or on the
                            "Legacy API Keys" tab, the "anon" "public"
                            key (starts with eyJ...) — either works fine.

   It's normal and safe for the anon key to be visible in this public
   file / in the browser — it does not grant write access by itself.
   What actually protects your data is the Row Level Security policies
   you set up in supabase/schema.sql, which only let a signed-in admin
   write, and let anyone read/submit only what the site is meant to
   show/collect. Never put the "service_role" key anywhere in this
   front-end code — that one bypasses RLS entirely and must stay
   server-side only.
   ============================================================ */

const SUPABASE_URL = "https://znkfvlmfupajlmbsrzsv.supabase.co";   // TODO: replace
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpua2Z2bG1mdXBhamxtYnNyenN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjY1NjAsImV4cCI6MjEwMDEwMjU2MH0.b1_3d3VSiwSYeXS4OF05FHxKJzKHamdDugrGMOyrmfA";                // TODO: replace
