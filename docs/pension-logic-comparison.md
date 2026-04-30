# 국민연금 공제/환급 로직 비교: 기존 vs 신규

## 용어 정리

| 코드 변수 | 의미 | 오프셋 |
|---|---|---|
| `allFourMonthsAgo` (환급) / `allPrevMonth` (공제) | 4개월 전 | -1 |
| `allThreeMonthsAgo` (환급) / `allCurrentMonth` (공제) | **3개월 전 (대상월)** | 0 |
| `allTwoMonthsAfter` (환급) | 2개월 전 | +1 |

---

## 1. 공제 로직

### 기존 공제 플로우 (existing.js)

```
calculatePensionDeduction
│
├─ 당월(3개월전) 출역 없음 → 비공제
│
└─ 당월(3개월전) 출역 있음
    ├─ 당월 >= 8 → 당월[7] 공제, 초과분 추가 공제
    └─ 당월 < 8  → 비공제
```

**특징**:
- 전월 연속성 미체크, 당월 단독 판단
- 급여 임계값 로직 주석처리됨 (`targetIndex = null` 고정)
- 청구업체·현장 구분 없음, 당월 전체 날짜 기준
- 코드 길이: ~20줄

---

### 신규 공제 플로우 (new.js)

```
calculatePensionDeduction
│  [현장(companyId)별 반복]
│
├─ 현장 4개월전 출역 있음
│   └─ applyDeduction(현장 당월 수, 청구업체 당월 날짜)
│
└─ 현장 4개월전 출역 없음
    ├─ 현장 당월 초일 출역 O → applyDeduction(현장 당월 수, 청구업체 당월 날짜)
    └─ 현장 당월 초일 미출역 → 청구업체 체크 필요 표시
│
│  [루프 완료 후 청구업체 체크 (needsBillingCheck = true인 경우)]
│
├─ 청구업체 4개월전 출역 있음 → applyDeduction(청구업체 당월 수, 청구업체 당월 날짜)
└─ 청구업체 4개월전 없음
    ├─ 청구업체 당월 초일 출역 O → applyDeduction(청구업체 당월 수, 청구업체 당월 날짜)
    └─ 청구업체 당월 초일 미출역 → 비공제

[applyDeduction(count, billingDates)]
├─ count = 8  → billingDates[7] 공제
├─ count > 8  → billingDates[7] 공제 + billingDates[8~] 추가 공제
└─ count < 8  → 비공제
```

**특징**:
- 현장별 루프, 전월 연속성 또는 초일 출역 체크
- 청구업체 폴백: 현장이 조건 미충족이면 청구업체 전체 기준으로 판단
- **공제 마킹 날짜는 항상 청구업체(전 현장 합산) 당월 날짜** 기준
- 현장 당월 출역 수로 8일 여부 판단하지만 날짜는 청구업체 날짜 사용
- 코드 길이: ~55줄

---

### 공제 구조 비교 요약

| 항목 | 기존 | 신규 |
|---|---|---|
| 1차 분기 기준 | 당월 출역 유무 | 전월 연속성 / 초일 출역 |
| 현장별 처리 | ❌ 없음 (전체 합산) | ✅ companyId 별 루프 |
| 청구업체 폴백 | ❌ 없음 | ✅ 있음 |
| 급여 임계값 | ❌ 주석처리 | ❌ 없음 |
| 공제 날짜 기준 | 당월 전체 날짜 | 청구업체 당월 날짜 |
| 분기 수 | 2개 | ~6개 |
| 코드 길이 | ~20줄 | ~55줄 |

---

## 2. 환급 로직

### 기존 환급 플로우 (existing.js)

```
calculateStatePensionRefund
│  [companyId별 반복 → handleStatePensionRefundAndDeduct 위임]
│
├─ A. 현장 4개월전 출역 있음 (oneMonthAgoHistories > 0)
│   ├─ 3개월전 >= 8일 → 비대상
│   ├─ 3개월전 < 8일 + isOverWage(220만↑) → 징수
│   └─ 3개월전 < 8일 + 220만 미만 → 환급
│
└─ B. 현장 4개월전 출역 없음
    ├─ B-1. 3개월전 >= 8일
    │   ├─ 3개월전 초일 출역 O
    │   │   ├─ 현장 2개월전 출역 O → 비대상
    │   │   ├─ 청구업체 2개월전 출역 O → 비대상
    │   │   └─ 2개월전 모두 없음 → 환급
    │   └─ 3개월전 초일 미출역
    │       ├─ 2개월전 >= 8일 → 비대상
    │       ├─ 2개월전 isOverWage(220만↑) → 징수
    │       └─ 2개월전 220만 미만 → 환급
    │
    └─ B-2. 3개월전 < 8일
        ├─ isOverWage(220만↑)
        │   ├─ 3개월전 초일 출역 O
        │   │   ├─ 현장 2개월전 출역 O → 비대상
        │   │   ├─ 청구업체 2개월전 출역 O → 비대상
        │   │   └─ 2개월전 모두 없음 → 환급
        │   └─ 3개월전 초일 미출역
        │       ├─ 2개월전 >= 8일 → 비대상
        │       ├─ 2개월전 isOverWage(220만↑) → 징수
        │       └─ 2개월전 220만 미만 → 환급
        └─ 220만 미만 → 환급
```

**특징**:
- 1차 분기: 현장 4개월전 출역 유무
- 비대상 = 아무 처리 없음 (공제를 정당하다고 보고 유지)
- 징수: 실제 대비 누락분 징수 (isOverWage 기반)
- 기존 임계값: 8일 OR 220만원 (일수, 급여 각각 독립적 조건)
- B-1과 B-2에서 초일 출역 처리 구조 중복
- 분기 경로: ~13개

---

### 신규 환급 플로우 (new.js)

```
calculateStatePensionRefund
│  [companyId별 반복, billingMeetsThreshold는 루프 외부에서 공유]
│
├─ [1] hasSiteFour (현장 4개월전 출역 있음)
│   ├─ siteMeetsThreshold OR billingMeetsThreshold → reconcileDeduction()
│   └─ 미달 → addSiteRefund()
│
├─ [2] billingHasFour (청구업체 4개월전 있음, 현장 4개월전 없음)
│   ├─ billingMeetsThreshold → reconcileDeduction()
│   └─ 미달 → addSiteRefund()
│
├─ [3] siteWorkedFirst AND siteWorkedLast (현장 초일+말일 연속)
│   ├─ siteMeetsThreshold OR billingMeetsThreshold → reconcileDeduction()
│   └─ 미달 → addSiteRefund()
│
├─ [4] NOT siteWorkedLast AND 현장 2개월전 출역 있음
│   ├─ siteMeetsThreshold → reconcileDeduction()
│   └─ 미달 → addSiteRefund()
│
├─ [5] billingWorkedOnFirst AND billingWorkedOnLast (청구업체 초일+말일 연속)
│   ├─ billingMeetsThreshold → reconcileDeduction()
│   └─ 미달 → addSiteRefund()
│
├─ [6] billingWorkedOnFirst AND 청구업체 2개월전 출역 있음
│   ├─ billingCurrentCount >= 8 → reconcileDeduction()
│   └─ 미달 → addSiteRefund()
│
└─ [7] else → addSiteRefund()

[reconcileDeduction]
  expectedDeductDates = billingCurrentCount >= 8 ? billingDates[7~] : billingDates 전체
  refunds += 실제공제 중 expected에 없는 날짜 (초과 환급)
  deducts += expected 중 실제공제에 없는 날짜 (누락 징수)

[addSiteRefund(siteWorkDates)]
  공제 내역 있으면 → refunds에 siteWorkDates 추가
  공제 내역 없으면 → 비대상
```

**특징**:
- 1차 분기: 현장 4개월전 → 청구업체 4개월전 → 현장 초일+말일 → 현장 말일미출역+2개월전 → 청구업체 초일+말일 → 청구업체 초일+2개월전 → else
- `billingMeetsThreshold` (청구업체 임계값)를 루프 외부에서 한 번 계산, 현장별로 공유
- reconcileDeduction: 정산 (초과분 환급 + 누락분 징수) — 기존의 비대상과 달리 세밀 비교
- [3]·[1] 동일 처리 구조: 현장 초일+말일 = 4개월 연속근로와 동일 연속성 근거
- [4] 특이점: siteMeetsThreshold만 체크 (billingMeetsThreshold 무관)
- [6] 특이점: billingCurrentCount >= 8만 체크 (급여 임계값 미적용)
- 분기 경로: 7개 (reconcile 내부 정산까지 포함하면 더 많음)

---

### 환급 구조 비교 요약

| 항목 | 기존 | 신규 |
|---|---|---|
| 1차 분기 기준 | 현장 4개월전 출역 유무 | hasSiteFour (현장 4개월전) |
| 2차 분기 기준 | 3개월전 일수 / 급여 | 임계값 (일수 OR 급여 통합) |
| 청구업체 임계값 공유 | ❌ 현장별 독립 처리 | ✅ billingMeetsThreshold 공유 |
| 비대상 처리 | 아무 처리 없음 | addSiteRefund에서 공제 없으면 비대상 |
| 정산 방식 | 징수=isOverWage 기반 누락 추가 | reconcileDeduction = 기대공제 vs 실제공제 비교 |
| 초일+말일 연속성 | ❌ 없음 (초일만 체크) | ✅ [3][5] 분기로 처리 |
| 말일 미출역+2개월전 | ❌ 없음 | ✅ [4] 분기 |
| 청구업체 초일+2개월전 | ❌ 없음 | ✅ [6] 분기 |
| 중복 코드 | B-1과 B-2 초일 처리 구조 반복 | 없음 |
| 분기 경로 수 | ~13개 | 7개 |

---

## 3. 임계값(threshold) 개념 변화

### 기존

- **일수**: `workCount >= 8` (독립 체크)
- **급여**: `wageSum >= 2,200,000` (독립 체크)
- 두 조건을 별도 변수(`isOverEight`, `isOverWage`)로 분기마다 따로 사용

### 신규

- **통합**: `count >= 8 || count * wage >= 2,200,000` → `siteMeetsThreshold` / `billingMeetsThreshold`
- 단일 불리언으로 통합, 분기마다 재계산 없음

---

## 4. reconcileDeduction vs 기존 비대상/징수

| 결과 유형 | 기존 | 신규 |
|---|---|---|
| 공제 정당 + 실제공제 일치 | 비대상 (아무 처리 없음) | reconcile → deducts=[], refunds=[] |
| 공제 정당 + 실제공제 초과 | 환급 처리 없음 ❌ | reconcile → refunds에 초과 날짜 |
| 공제 정당 + 실제공제 누락 | isOverWage이면 징수 | reconcile → deducts에 누락 날짜 |
| 공제 부당 + 공제 내역 있음 | 환급 | addSiteRefund → refunds에 현장 날짜 |
| 공제 부당 + 공제 내역 없음 | 비대상 | addSiteRefund → 비대상 |
