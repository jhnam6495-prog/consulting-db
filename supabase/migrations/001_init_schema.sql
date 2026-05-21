-- =============================================
-- 컨설팅 수행 실적 관리 DB 스키마
-- Supabase SQL Editor에서 순서대로 실행하세요
-- =============================================

-- 1. 팀 테이블
CREATE TABLE IF NOT EXISTS teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 사용자 테이블
CREATE TYPE user_role AS ENUM ('consultant', 'manager', 'admin');

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        user_role NOT NULL DEFAULT 'consultant',
  team_id     UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 고객사 테이블
CREATE TABLE IF NOT EXISTS clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  industry        TEXT,
  contact_name    TEXT,
  contact_email   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 프로젝트 테이블
CREATE TYPE project_status AS ENUM ('ongoing', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  start_date  DATE,
  end_date    DATE,
  status      project_status NOT NULL DEFAULT 'ongoing',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 실적 테이블 (핵심)
CREATE TYPE performance_status AS ENUM ('draft', 'pending', 'approved', 'rejected');
CREATE TYPE service_type AS ENUM ('전략컨설팅', 'IT컨설팅', '회계/세무', '법률', '인사/조직', '기타');

CREATE TABLE IF NOT EXISTS performances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_type  service_type NOT NULL DEFAULT '기타',
  revenue       NUMERIC(15, 0) NOT NULL DEFAULT 0,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  status        performance_status NOT NULL DEFAULT 'draft',
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER performances_updated_at
  BEFORE UPDATE ON performances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. 승인 이력 테이블
CREATE TYPE approval_action AS ENUM ('approved', 'rejected');

CREATE TABLE IF NOT EXISTS approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_id  UUID NOT NULL REFERENCES performances(id) ON DELETE CASCADE,
  approver_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action          approval_action NOT NULL,
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 샘플 데이터 (테스트용)
-- =============================================

INSERT INTO teams (name) VALUES
  ('전략컨설팅팀'),
  ('IT컨설팅팀'),
  ('회계세무팀');

INSERT INTO users (name, email, role, team_id) VALUES
  ('김팀장', 'manager@consulting.com', 'manager', (SELECT id FROM teams WHERE name = '전략컨설팅팀')),
  ('이컨설턴트', 'consultant1@consulting.com', 'consultant', (SELECT id FROM teams WHERE name = '전략컨설팅팀')),
  ('박컨설턴트', 'consultant2@consulting.com', 'consultant', (SELECT id FROM teams WHERE name = 'IT컨설팅팀'));

INSERT INTO clients (name, industry, contact_name, contact_email) VALUES
  ('삼성전자', '전자/반도체', '홍길동', 'contact@samsung.com'),
  ('현대자동차', '자동차', '김철수', 'contact@hyundai.com'),
  ('LG화학', '화학/소재', '이영희', 'contact@lgchem.com');

INSERT INTO projects (name, client_id, start_date, end_date, status) VALUES
  ('디지털 전환 전략 수립', (SELECT id FROM clients WHERE name = '삼성전자'), '2025-01-01', '2025-06-30', 'completed'),
  ('ERP 시스템 구축', (SELECT id FROM clients WHERE name = '현대자동차'), '2025-03-01', '2025-12-31', 'ongoing'),
  ('세무 리스크 진단', (SELECT id FROM clients WHERE name = 'LG화학'), '2025-04-01', '2025-07-31', 'ongoing');
