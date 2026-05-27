-- 일정 관리 테이블
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),

  title TEXT NOT NULL,
  description TEXT,

  -- 날짜/시간
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN DEFAULT true,

  -- 분류
  type TEXT DEFAULT 'meeting' CHECK (type IN (
    'meeting',   -- 회의/미팅
    'call',      -- 통화/화상
    'visit',     -- 고객사 방문
    'deadline',  -- 마감
    'other'      -- 기타
  )),

  location TEXT,

  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'completed', 'cancelled'
  )),

  -- 연관 레코드 (선택)
  related_audit_id       UUID REFERENCES audits(id) ON DELETE SET NULL,
  related_performance_id UUID REFERENCES performance(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_schedules_start_date ON schedules(start_date);
CREATE INDEX idx_schedules_user_id    ON schedules(user_id);
