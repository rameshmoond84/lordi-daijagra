-- =========================================================================
-- Gram Panchayat Lordi Daijagra - Database Schema (Supabase / PostgreSQL)
-- =========================================================================

CREATE TABLE IF NOT EXISTS voters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no INTEGER,
  epic_no TEXT,
  name_hi TEXT NOT NULL,
  name_en TEXT,
  relation_type TEXT,
  relative_name TEXT,
  relative_en TEXT,
  house_no TEXT,
  age INTEGER,
  gender TEXT,
  status TEXT DEFAULT 'सक्रिय',
  district TEXT DEFAULT 'जोधपुर',
  assembly_constituency TEXT DEFAULT '130 - लूणी',
  panchayat_samiti TEXT DEFAULT 'केरू',
  gram_panchayat TEXT DEFAULT 'लोरड़ी देजगरा',
  ward_no INTEGER,
  booth_name TEXT DEFAULT 'रा.उ.मा.वि. लोरड़ी देजगरा',
  booth_no TEXT DEFAULT '1',
  mobile_no TEXT,
  alternate_mobile TEXT,
  caste TEXT,
  caste_en TEXT,
  mohalla TEXT,
  mohalla_en TEXT,
  family_id TEXT,
  is_head_of_family BOOLEAN DEFAULT false,
  is_key_decision_maker BOOLEAN DEFAULT false,
  is_outstation BOOLEAN DEFAULT false,
  outstation_city TEXT,
  political_leaning TEXT DEFAULT 'swing', -- 'supporter', 'swing', 'opposition'
  candidate_preference TEXT DEFAULT 'तय नहीं',
  occupation TEXT,
  local_issue TEXT,
  has_voted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_voters_ward ON voters(ward_no);
CREATE INDEX IF NOT EXISTS idx_voters_serial ON voters(serial_no);
CREATE INDEX IF NOT EXISTS idx_voters_house ON voters(house_no);
CREATE INDEX IF NOT EXISTS idx_voters_leaning ON voters(political_leaning);
CREATE INDEX IF NOT EXISTS idx_voters_caste ON voters(caste);
CREATE INDEX IF NOT EXISTS idx_voters_mohalla ON voters(mohalla);
CREATE INDEX IF NOT EXISTS idx_voters_key_maker ON voters(is_key_decision_maker);
CREATE INDEX IF NOT EXISTS idx_voters_name_en ON voters(name_en);
