// init.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://gvljotkckbyohhoiggtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bGpvdGtja2J5b2hob2lnZ3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNTk2MjcsImV4cCI6MjA2MzgzNTYyN30.3XxVnogLpMcnPRefmkjGWpfD7EiQiP5kVPelBBIOvio'
);