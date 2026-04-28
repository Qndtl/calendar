# 신규 건강보험 환급 로직 (v2) 설명

대상 함수: `calculateHealthInsuranceRefund` — `src/logic/health/new.js`

---

## 변수 의미

함수의 `targetMonth`는 **"3개월 전 월"** 을 가리킵니다. 코드의 오프셋과 플로우차트 명칭이 다르므로 주의합니다.

| 코드 변수 | 오프셋 | 플로우차트 명칭 | 의미 |
| --- | --- | --- | --- |
| `twoMonthsAgo` | targetMonth - 2 | sorted5 | 현재 기준 5개월 전 출역 목록 |
| `oneMonthAgo` | targetMonth - 1 | sorted4 | 현재 기준 4개월 전 출역 목록 |
| `currentMonth` | targetMonth + 0 | sorted3 | 현재 기준 3개월 전 출역 목록 (= 환급 심사 대상 월) |
| `oneMonthAfter` | targetMonth + 1 | sorted2 | 현재 기준 2개월 전 출역 목록 |

---

## 핵심 개념 3가지

### ① 합산 (totalDays)

sorted4가 있으면 → `sorted4.length + sorted3.length`

sorted4가 없으면 → `sorted3.length + sorted2.length`

"이 근로자가 연속적으로 얼마나 일했나"를 보는 값입니다.

### ② 기간 (period)

단순히 "몇 일 일했냐"가 아니라, **첫 출역일 기준 30일짜리 창(window) 안에 몇 일 일했냐**를 봅니다.

**4개월전 기간 (period4)**
- 범위: `sorted4[0]` ~ `sorted4[0] + (해당월 일수 - 1)일`
- 단, 첫 출역이 초일(1일)이면 해당월 말일까지로 고정

**3개월전 기간 (period3)**
- 범위: `sorted3[0]` ~ `sorted3[0] + (해당월 일수 - 1)일`

### ③ allDates

`sorted4 + sorted3 + sorted2`를 합친 전체 날짜 목록입니다. "기간 종료일 이후 출역 여부" 판단에 사용됩니다.

---

## 단계별 흐름 설명

### Step 1 — 합산 8일 미만 → 무조건 환급

합산이 8일도 안 되면 공제 자체가 부당하므로 공제된 날짜 전부 환급합니다.

### Step 2-4 — 두 기간 모두 8일 미만 → 환급

합산은 8일 이상이더라도, period4와 period3 **둘 다** 8일 미만이면 환급합니다. 합산은 채웠지만 어떤 한 기간 내에도 연속성이 없는 경우입니다.

### Step 5a — sorted4 있음 + 4개월전 기간 >= 8

4개월전 기간 내 출역이 8일 이상이더라도 공제 정당 여부를 추가로 확인합니다. 아래 3가지 중 하나라도 해당되면 **공제 정당**입니다.

**① 기간 종료일 당일 또는 이후 출역**
`allDates.some(d => d >= period4End)` — "그 이후에도 계속 일했다"는 증거가 있으면 공제 정당.

**② 특수일 완성 (1/30·31 + sorted3 말일 출역)**
sorted4 첫 출역이 1/30 또는 1/31이면 period4End가 3월로 넘어가므로, sorted3(3개월전) 말일 출역이 있으면 정당 조건으로 인정.

**③ sorted5(5개월전) 출역 있음 — 연속근로 인정**
`twoMonthsAgo.length > 0` — 5개월전에도 출역 기록이 있으면 4개월전-3개월전 연속근로가 성립한 것으로 보아 공제 정당.
예) 2월 출역 + 3월 출역 → 4월 공제는 연속근로이므로 정당.

※ 구 로직의 `afterPeriod4 > 0`(엄격히 이후)과 `firstAndLastWorked`(당일 포함)가 `some(d >= period4End)` 하나로 통합됨

**결과**

- 정당하지 않으면 → **환급**
- 정당하면 → **금액 비교** (징수 or 환급)
- 단, sorted5(5개월전)가 있고 sorted3 < 8이면 → **비대상**

**징수 조건**: sorted5 없음 + 공제 내역 없음 → 징수. sorted5 있고 sorted3 < 8이면 비대상.

### Step 5b — sorted4 있음 + 4개월전 기간 < 8

sorted4 > 0이면 sorted5 유무, 초일 여부와 무관하게 **공제 정당**으로 판단합니다. sorted4가 없으면(= 0) sorted5가 있어도 공제 정당 근거가 없으므로 Step 5c로 넘어갑니다.

- sorted3 < 8 → **환급** (3개월전 자체 출역이 부족)
- sorted3 >= 8 → **금액 비교**

**징수 조건**: sorted3 >= 8 + 공제 내역 없음 → 징수.

### Step 5c — sorted4 없음 + 3개월전 기간 >= 8

sorted4 = 0일 때만 도달합니다. Step 3-4를 통과했다는 것은 period3Count >= 8이 보장된 상태입니다.

**공제 정당 조건**: 아래 두 조건 중 하나를 충족해야 합니다.

**조건A (면제 조건)** — 3개월전 달 초일 출역 + 말일 출역  
`isFirstDayOfMonth(sorted3[0]) && isLastDayOfMonth(sorted3[last])` — 달 전체를 근무한 형태로 공제 정당. 특수일(1/30·31) 케이스도 이 조건으로 흡수됩니다.

**조건B** — period3End **당일** 출역  
`allDates.includes(period3End)` — 기간 종료일 바로 그 날 출역이 있어야 함. period3End 이후 출역만으로는 공제 정당 불인정.

**결과**

- conditionA 또는 conditionB 충족 → **공제 정당** → 금액 비교
- 미충족 → **환급**

**징수 조건**: sorted3 >= 8 + 공제 내역 없음 → 징수. (sorted4 = 0인 경우라 sorted3 자체가 기준)

---

## 한 줄 요약

합산이나 기간 기준으로 8일을 못 채우면 환급, 채웠으면 초일+말일 출역 또는 기간 종료일 당일 출역으로 공제 정당성을 판단하고, 정당하면 금액 비교, 부당하면 환급
