# Guild Operation Economy Database

**버전**: 0020-E

---

## 초기 직원 데이터

| ID | 이름 | 역할 | 필요 시설 | 급여/7일 |
|----|------|------|-----------|---------|
| staff-reception-1 | 베라 화이트홀로우 | receptionist | facility-reception | 25G |
| staff-storage-1 | 그런트 아이언키 | warehouse_manager | facility-storage | 20G |
| staff-guildhall-1 | 미아 콜드웰 | operations_staff | facility-guild-hall | 15G |

**합계**: 60G / 7일

---

## 세금 기준 (초기)

시작 날짜 기준 (317년 늦여름 12일):
- 기본세: 50G
- 모험가 12명: 60G
- 활성 시설 3개: 30G
- **합계**: 140G / 30일

---

## 재정 건강 기준

| 등급 | 판단 조건 |
|------|-----------|
| stable | 대출 연체 없음 + gold ≥ 7일치 운영비 + 전체 미납 < 7일치 |
| caution | 미납 > 0 또는 총 부채 > 현재 골드 × 2 |
| deficit | gold < 7일치 운영비 OR 전체 미납 > 14일치 운영비 |
| critical | 대출 연체 OR gold < 0 |

---

## 수익 시설 기본값 (미구현, 향후 적용)

| 시설 | 이용 유형 | 방문 확률 | 최대 인원 | 단가 | 운영비율 |
|------|----------|-----------|-----------|------|---------|
| facility-inn | lodging | 70% | 5명 | 30G | 30% |
| facility-pub | pub_visit | 60% | 10명 | 12G | 35% |
| facility-restaurant | meal | 80% | 8명 | 15G | 40% |

---

## 운영 정책 정의 (향후 구현)

### 여관 정책

| 정책 ID | 이름 | 단가 보정 | 운영비율 | 방문 확률 |
|---------|------|-----------|---------|----------|
| inn_budget | 저가 운영 | ×0.7 | 20% | 85% |
| inn_standard | 일반 운영 | ×1.0 | 30% | 70% |
| inn_premium | 고급 운영 | ×1.5 | 45% | 50% |

### 펍 정책

| 정책 ID | 이름 | 단가 보정 | 운영비율 | 방문 확률 |
|---------|------|-----------|---------|----------|
| pub_quiet | 조용한 운영 | ×0.8 | 25% | 50% |
| pub_standard | 일반 운영 | ×1.0 | 35% | 60% |
| pub_lively | 활기찬 운영 | ×1.2 | 50% | 75% |

### 식당 정책

| 정책 ID | 이름 | 단가 보정 | 운영비율 | 방문 확률 |
|---------|------|-----------|---------|----------|
| restaurant_frugal | 검소한 식사 | ×0.7 | 30% | 90% |
| restaurant_standard | 일반 식사 | ×1.0 | 40% | 80% |
| restaurant_fine | 고급 식사 | ×1.6 | 55% | 55% |

---

## StaffRoleId 정의

| ID | 설명 |
|----|------|
| receptionist | 접수 업무 담당 |
| warehouse_manager | 창고 관리 담당 |
| operations_staff | 일반 운영 보조 |
