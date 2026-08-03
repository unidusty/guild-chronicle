# Guild Operation Economy System Guide

**버전**: 0020-E  
**상태**: 구현 완료 (기반 구조)

---

## 개요

길드 운영 경제 시스템은 단순한 골드 증감이 아니라
직원 급여, 세금, 부채, 시설 수익이 실제 재정 흐름에 반영되는 구조다.

모든 경제 활동은 `FinanceTransaction`에 기록되며,
재정 건강 상태는 selector로 계산된다.

---

## 핵심 원칙

- 시설은 실제 이용이 있을 때만 수익이 발생한다.
- 자동 고정 수익을 지급하지 않는다.
- 모든 경제 활동은 재정 장부에 남는다.
- 자금 부족 시 즉각 파산 없이 미납 상태로 기록한다.

---

## 직원 급여 (Payroll)

### 주기
- 7일마다 지급 (`PAYROLL_INTERVAL_DAYS = 7`)

### 지급 대상
- `state.staff`에 있는 직원 중 `isActive = true`
- 해당 직원의 `requiredFacilityId` 시설이 `status === "active"`인 경우

### 초기 직원 (3명)
| 이름 | 역할 | 시설 | 급여/주기 |
|------|------|------|-----------|
| 베라 화이트홀로우 | 접수 직원 | facility-reception | 25G |
| 그런트 아이언키 | 창고 관리자 | facility-storage | 20G |
| 미아 콜드웰 | 운영 보조 | facility-guild-hall | 15G |

**초기 합계**: 60G / 7일

### 처리 흐름
1. `lastPayrollDay` 확인 → 7일 경과 여부 판단
2. 활성 직원 합계 계산
3. `min(gold, total)` 지급
4. `staff_salary` FinanceTransaction 생성
5. 미지급분 → `state.unpaidSalary` 누적
6. `lastPayrollDay` 갱신

### 중복 방지
- `sourceType: "payroll"`, `sourceId: todayAbsDay`

---

## 세금 (Tax)

### 주기
- 30일마다 (`TAX_INTERVAL_DAYS = 30`)

### 세액 계산
```
세금 = 50 + (모험가 수 × 5) + (활성 시설 수 × 10)
```

**초기 예시**: 50 + (12 × 5) + (3 × 10) = 50 + 60 + 30 = 140G / 30일

### 처리 흐름
1. `lastTaxDay` 확인 → 30일 경과 여부 판단
2. 세액 계산
3. `guild_tax` FinanceTransaction 생성
4. 미납분 → `state.unpaidTax` 누적
5. `lastTaxDay` 갱신

### 중복 방지
- `sourceType: "tax"`, `sourceId: todayAbsDay`

---

## 대출 및 상환 (Loans)

### 구조 (`GuildLoan`)
| 필드 | 설명 |
|------|------|
| `id` | 대출 ID |
| `creditorName` | 채권자 이름 |
| `principal` | 원래 원금 |
| `remainingPrincipal` | 남은 원금 |
| `interestRate` | 이자율 (소수, 예: 0.05 = 5%) |
| `issuedAt` | 대출 날짜 |
| `nextPaymentDate` | 다음 상환일 |
| `paymentIntervalDays` | 상환 주기 |
| `installmentAmount` | 회당 원금 상환액 |
| `status` | `active` / `paid` / `overdue` |
| `overdueAmount` | 누적 연체 금액 |

### 상환 흐름
1. `nextPaymentDate` ≤ 오늘 확인
2. 이자: `ceil(remainingPrincipal × interestRate)`
3. 원금: `min(installmentAmount, remainingPrincipal)`
4. 가능 금액 계산 후 분리 기록
   - `loan_interest_payment`
   - `loan_principal_payment`
5. 잔여 원금 갱신
6. 완납 시 `status: "paid"`
7. 연체 시 `status: "overdue"`, `overdueAmount` 누적

### 중복 방지
- `sourceId: "${loanId}:${paymentDay}:interest"` / `:principal`

### 대출 실행 (`takeLoan`)
- `loan_received` FinanceTransaction 생성
- `state.loans`에 추가

---

## 시설 운영 상태 (FacilityOperationState)

### 상태 (`FacilityOperationStatus`)
- `open` — 정상 운영
- `closed` — 임시 폐쇄
- `suspended` — 운영 중단
- `understaffed` — 인력 부족

### 운영 정책 (`FacilityPolicyId`)
향후 수익 시설에 적용될 정책:

| 시설 | 정책 옵션 |
|------|-----------|
| 여관 | inn_budget / inn_standard / inn_premium |
| 펍 | pub_quiet / pub_standard / pub_lively |
| 식당 | restaurant_frugal / restaurant_standard / restaurant_fine |

---

## 시설 이용 기록 (FacilityUsageRecord)

### 구조
| 필드 | 설명 |
|------|------|
| `id` | 중복 방지용 ID (`usage-{facilityId}-{absDay}`) |
| `facilityId` | 시설 ID |
| `date` | 이용 날짜 |
| `usageType` | `lodging` / `meal` / `pub_visit` |
| `quantity` | 이용 인원 |
| `unitRevenue` | 인당 수익 |
| `grossRevenue` | 총 수익 |
| `operatingCost` | 운영비 |
| `netRevenue` | 순수익 |

### 대상 시설 (향후 추가 예정)
| 시설 ID | 이용 유형 | 방문 확률 | 최대 인원 | 단가 | 운영비율 |
|---------|----------|-----------|-----------|------|---------|
| facility-inn | lodging | 70% | 5명 | 30G | 30% |
| facility-pub | pub_visit | 60% | 10명 | 12G | 35% |
| facility-restaurant | meal | 80% | 8명 | 15G | 40% |

현재 게임에 위 시설이 없으므로 이 로직은 실행되지 않는다.

---

## 재정 건강 상태 (GuildFinancialHealth)

### 등급

| 등급 | 조건 |
|------|------|
| `stable` | 연체 없음, 미납 없음, 잔액 충분 |
| `caution` | 미납 있음 또는 부채 > 잔액 × 2 |
| `deficit` | 잔액 < 7일 운영비 또는 미납 > 14일 운영비 |
| `critical` | 대출 연체 중 또는 잔액 음수 |

### 계산 위치
- `src/game/simulation/economy.ts` — `getFinancialHealth(state)`
- 원본 데이터에 저장하지 않고 selector로 도출

---

## DayEnd 처리 순서

```
3.5. applyDailyOperatingCost    기본 운영비 + 시설 유지비
3.6. processPayroll             직원 급여 (7일 주기)
3.6. processTax                 길드 세금 (30일 주기)
3.6. processLoanRepayments      대출 원금·이자 상환
3.6. processFacilityUsage       수익 시설 이용 판정
4.   advanceDay                 날짜 증가
```

---

## FinanceTransaction 유형 추가 목록

### 지출
| 타입 | 설명 |
|------|------|
| `staff_salary` | 직원 급여 |
| `guild_tax` | 길드 세금 |
| `facility_operating_cost` | 시설 운영비 |
| `loan_principal_payment` | 대출 원금 상환 |
| `loan_interest_payment` | 대출 이자 |

### 수입
| 타입 | 설명 |
|------|------|
| `loan_received` | 대출 실행 |
| `lodging_revenue` | 여관 수익 |
| `meal_revenue` | 식당 수익 |
| `pub_revenue` | 펍 수익 |

---

## 파일 위치

| 역할 | 경로 |
|------|------|
| 타입 정의 | `src/types/game.ts` |
| 경제 시뮬레이션 | `src/game/simulation/economy.ts` |
| DayEnd 연동 | `src/game/simulation/dayEnd.ts` |
| 초기 데이터 | `src/data/gameState.ts` |
| 레이블 | `src/game/constants/labels.ts` |
| UI | `src/features/finance/FinanceTab.tsx` |
| 스타일 | `src/styles/global.css` |

---

## 향후 예정

- 정식 직원 고용 시스템
- 직원 능력치 및 만족도
- 직원 퇴사, 파업
- 복잡한 세금 정책 (누진세, 국가별)
- 다중 금융기관
- 채권자 이벤트
- 시설 방문자 시뮬레이션 (도시 인구, 관광객)
- 시설 운영 정책 UI
- 명성·소문·만족도 연계
- 파산 및 게임오버
