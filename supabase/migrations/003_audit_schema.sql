-- 심사 실적 테이블
CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  client_id UUID REFERENCES clients(id),

  -- 심사 유형 (향후 추가 가능하도록 TEXT + CHECK 사용)
  audit_type TEXT NOT NULL CHECK (audit_type IN (
    'ISO9001/14001/45001',  -- 통합심사
    'ISO9001',              -- 개별
    'ISO14001',             -- 개별
    'ISO45001',             -- 개별
    'ISO37001/37301',       -- 통합심사
    'ISO37001',             -- 개별
    'ISO37301',             -- 개별
    'ISO27001',
    '가족친화형기업',
    '기타'
  )),

  audit_name TEXT NOT NULL,        -- 심사명 (예: "2025년 ISO 9001 갱신심사")
  audit_body TEXT,                 -- 심사 기관 (예: KR인증원, BSI 등)
  audit_stage TEXT CHECK (audit_stage IN ('1단계', '2단계', '사후', '갱신', '특별', '해당없음')),

  scheduled_date DATE NOT NULL,    -- 심사 예정일
  completed_date DATE,             -- 실제 완료일

  result TEXT CHECK (result IN ('pass', 'conditional_pass', 'fail', 'pending')),
  findings_count INTEGER DEFAULT 0,         -- 부적합 건수
  observations_count INTEGER DEFAULT 0,     -- 관찰사항 건수

  revenue NUMERIC DEFAULT 0,       -- 관련 매출
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),

  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
