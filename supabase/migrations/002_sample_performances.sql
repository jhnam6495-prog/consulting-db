-- 샘플 실적 데이터 (차트/대시보드 확인용)
-- Supabase SQL Editor에서 실행

INSERT INTO performances (user_id, client_id, service_type, revenue, start_date, end_date, status)
SELECT
  (SELECT id FROM users WHERE role = 'consultant' LIMIT 1),
  (SELECT id FROM clients WHERE name = '삼성전자'),
  '전략컨설팅', 120000000, '2025-01-05', '2025-03-31', 'approved';

INSERT INTO performances (user_id, client_id, service_type, revenue, start_date, end_date, status)
SELECT
  (SELECT id FROM users WHERE name = '박컨설턴트'),
  (SELECT id FROM clients WHERE name = '현대자동차'),
  'IT컨설팅', 85000000, '2025-02-01', '2025-04-30', 'approved';

INSERT INTO performances (user_id, client_id, service_type, revenue, start_date, end_date, status)
SELECT
  (SELECT id FROM users WHERE role = 'consultant' LIMIT 1),
  (SELECT id FROM clients WHERE name = 'LG화학'),
  '회계/세무', 45000000, '2025-03-01', '2025-05-31', 'approved';

INSERT INTO performances (user_id, client_id, service_type, revenue, start_date, end_date, status)
SELECT
  (SELECT id FROM users WHERE name = '박컨설턴트'),
  (SELECT id FROM clients WHERE name = '삼성전자'),
  '전략컨설팅', 200000000, '2025-04-01', '2025-06-30', 'approved';

INSERT INTO performances (user_id, client_id, service_type, revenue, start_date, end_date, status)
SELECT
  (SELECT id FROM users WHERE role = 'consultant' LIMIT 1),
  (SELECT id FROM clients WHERE name = '현대자동차'),
  '인사/조직', 60000000, '2025-05-01', '2025-07-31', 'pending';

INSERT INTO performances (user_id, client_id, service_type, revenue, start_date, end_date, status)
SELECT
  (SELECT id FROM users WHERE name = '박컨설턴트'),
  (SELECT id FROM clients WHERE name = 'LG화학'),
  'IT컨설팅', 95000000, '2025-05-15', '2025-08-31', 'pending';

INSERT INTO performances (user_id, client_id, service_type, revenue, start_date, end_date, status)
SELECT
  (SELECT id FROM users WHERE role = 'consultant' LIMIT 1),
  (SELECT id FROM clients WHERE name = '삼성전자'),
  '법률', 30000000, '2025-06-01', '2025-07-31', 'draft';
