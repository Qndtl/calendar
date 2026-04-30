# 국민연금 신규 환급 테스트 케이스 (new.js)

## 기준 정보

**기준일**: workMonth = 4월 (2026년)

### 변수 매핑
| 변수 | 월 | 날짜 범위 |
|------|---|---------|
| `allFourMonthsAgo` | 4개월 전 | 2026년 3월 |
| `allThreeMonthsAgo` | **3개월 전 (대상월)** | **2026년 4월** |
| `allTwoMonthsAfter` | 2개월 전 | 2026년 5월 |

> workMonth 기준: `getMonthKey(workYear, targetMonth, 0)` = "2026-04"  
> 모든 케이스의 wage = **370,000원** (6일×370,000 = 2,220,000 ≥ 2,200,000으로 급여 임계값 테스트 가능)

### 임계값 정의
- `siteMeetsThreshold` = 현장 4월 출역수 >= 8 **OR** 현장 4월 출역수 × 370,000 >= 2,200,000
- `billingMeetsThreshold` = 청구업체 4월 총 출역수 >= 8 **OR** 총 출역수 × 370,000 >= 2,200,000

---

## 케이스 1: [1] hasSiteFour + threshold 충족 → reconcileDeduction → 환급

### 입력
```
[4개월전 - 3월] companyId=1: 2일
  - 2026-03-10, 2026-03-20

[3개월전 - 4월] companyId=1: 5일
  - 2026-04-05, 2026-04-10, 2026-04-15, 2026-04-20, 2026-04-25

공제 내역: eight=[2026-04-20], over=[]
```

### 로직 흐름
1. companyId=1 처리
2. `hasSiteFour` = 3월 현장1 출역 2일 > 0 → **true** → [1] 분기
3. `siteMeetsThreshold` = 5 < 8, 5 × 370,000 = 1,850,000 < 2,200,000 → **false**
4. `billingMeetsThreshold` = 청구업체 4월 합계 5일, 5 × 370,000 < 2,200,000 → **false**
5. 임계값 미달 → `addSiteRefund([04-05, 04-10, 04-15, 04-20, 04-25])`
6. 공제 내역 있음 (eight=[2026-04-20]) → refunds에 현장 날짜 추가
7. **결과: 환급 (2026-04-05, 04-10, 04-15, 04-20, 04-25)**

---

## 케이스 2: [1] hasSiteFour + siteMeetsThreshold 충족 → reconcileDeduction → 정산

### 입력
```
[4개월전 - 3월] companyId=1: 1일
  - 2026-03-15

[3개월전 - 4월] companyId=1: 8일
  - 2026-04-01, 2026-04-02, 2026-04-03, 2026-04-04
  - 2026-04-05, 2026-04-06, 2026-04-07, 2026-04-08

공제 내역: eight=[2026-04-08], over=[]
```

### 로직 흐름
1. `hasSiteFour` = 3월 현장1 1일 → **true** → [1] 분기
2. `siteMeetsThreshold` = 8 >= 8 → **true**
3. reconcileDeduction() 호출
   - `billingCurrentCount` = 8 >= 8 → `expectedDeductDates` = billingDates[7~] = [04-08]
   - 실제 공제 dates: [04-08]
   - refunds = [04-08] 중 expected에 없는 것 = **없음**
   - deducts = expected 중 실제에 없는 것 = **없음**
4. **결과: 비대상 (정산 균형)**

---

## 케이스 3: [1] hasSiteFour + billingMeetsThreshold로 충족 → reconcileDeduction → 징수

> 현장 임계값은 미달이지만 **청구업체 임계값이 충족**되는 케이스.  
> companyId=1(현장1)만 보면 3일이지만, companyId=2(현장2)까지 합하면 9일.

### 입력
```
[4개월전 - 3월]
  companyId=1: 1일 - 2026-03-10
  companyId=2: 1일 - 2026-03-15

[3개월전 - 4월]
  companyId=1: 3일 - 2026-04-01, 2026-04-02, 2026-04-03
  companyId=2: 6일 - 2026-04-04, 2026-04-05, 2026-04-06, 2026-04-07, 2026-04-08, 2026-04-09

공제 내역: eight=[2026-04-08], over=[2026-04-09]
```

### 로직 흐름
1. `billingMeetsThreshold` = 청구업체 총 9일 >= 8 → **true** (루프 전 계산)
2. companyId=1 처리:
   - `hasSiteFour` = 3월 현장1 1일 → **true** → [1] 분기
   - `siteMeetsThreshold` = 3 < 8, 3×370,000 < 2,200,000 → **false**
   - `billingMeetsThreshold` = **true** → reconcileDeduction()
   - expectedDeductDates: billingCurrentCount=9 >= 8 → billingDates[7~] = [04-08, 04-09]
   - 실제 공제: [04-08, 04-09]
   - refunds = [], deducts = []
3. companyId=2 처리:
   - `hasSiteFour` → true → billingMeetsThreshold=true → reconcileDeduction() (동일 결과)
4. **결과: 비대상 (정산 균형)**

---

## 케이스 4: [2] billingHasFour + billingMeetsThreshold 충족 → reconcileDeduction → 징수

> 현장 4개월전 없음, 청구업체 4개월전 있음.

### 입력
```
[4개월전 - 3월]
  companyId=2: 1일 - 2026-03-20  ← 현장1은 없음

[3개월전 - 4월]
  companyId=1: 8일
  - 2026-04-01, 2026-04-02, 2026-04-03, 2026-04-04
  - 2026-04-05, 2026-04-06, 2026-04-07, 2026-04-08

공제 내역: eight=[], over=[]  ← 공제 누락
```

### 로직 흐름
1. companyId=1 처리 (루프):
   - `hasSiteFour` = 현장1의 3월 출역 = 0 → **false**
   - `billingHasFour` = 청구업체 3월 총 1일 > 0 → **true** → [2] 분기
   - `billingMeetsThreshold` = 청구업체 4월 합계 8일 >= 8 → **true**
   - reconcileDeduction()
   - expectedDeductDates: billingCurrentCount=8 >= 8 → billingDates[7] = [04-08]
   - 실제 공제: [] (없음)
   - deducts = [04-08]
2. **결과: 징수 (2026-04-08)**

---

## 케이스 5: [2] billingHasFour + 임계값 미달 → addSiteRefund → 환급

### 입력
```
[4개월전 - 3월]
  companyId=2: 1일 - 2026-03-10

[3개월전 - 4월]
  companyId=1: 4일
  - 2026-04-05, 2026-04-10, 2026-04-15, 2026-04-20

공제 내역: eight=[2026-04-20], over=[]
```

### 로직 흐름
1. companyId=1 처리:
   - `hasSiteFour` = **false** (현장1 3월 없음)
   - `billingHasFour` = **true** (현장2 3월 1일)
   - `billingMeetsThreshold` = 4일, 4×370,000 = 1,480,000 < 2,200,000 → **false**
   - `addSiteRefund([04-05, 04-10, 04-15, 04-20])`
   - 공제 내역 있음 → refunds에 추가
2. **결과: 환급 (2026-04-05, 04-10, 04-15, 04-20)**

---

## 케이스 6: [3] siteWorkedFirst AND siteWorkedLast → reconcileDeduction

> 현장 4개월전 없음, 청구업체 4개월전 없음, 현장이 4월 초일+말일 모두 출역.

### 입력
```
[4개월전 - 3월] 없음

[3개월전 - 4월] companyId=1: 8일
  - 2026-04-01, 2026-04-05, 2026-04-10, 2026-04-15
  - 2026-04-20, 2026-04-25, 2026-04-28, 2026-04-30

공제 내역: eight=[2026-04-15], over=[2026-04-20, 2026-04-25, 2026-04-28, 2026-04-30]
```

### 로직 흐름
1. companyId=1 처리:
   - `hasSiteFour`, `billingHasFour` = **false** (3월 모두 없음)
   - `siteWorkedFirst` = 04-01 = 초일 ✓
   - `siteWorkedLast` = 04-30 = 말일 ✓
   - → [3] 분기
   - `siteMeetsThreshold` = 8 >= 8 → **true** → reconcileDeduction()
   - billingCurrentCount=8 → expectedDeductDates = billingDates[7] = [04-30]
   - 실제 공제: eight=[04-15], over=[04-20, 04-25, 04-28, 04-30]
   - refunds = 실제공제 중 expected에 없는 것 = [04-15, 04-20, 04-25, 04-28]
   - deducts = expected 중 실제에 없는 것 = []
2. **결과: 환급 (2026-04-15, 04-20, 04-25, 04-28) + 비징수**

---

## 케이스 7: [4] 초일 출역 + 말일 미출역 + 현장 2개월전 출역 있음 + siteMeetsThreshold (급여 임계값) → reconcileDeduction

> **[4] 분기 조건**: `siteWorkedFirst && !siteWorkedLast && allTwoMonthsAfter.some(companyId)`  
> 초일 출역이 있어야 [4] 진입. 초일 미출역이면 공제 비대상이므로 이 분기를 건너뜀.  
> 또한 `siteMeetsThreshold = count >= 8 || count * wage >= 2,200,000` (급여 임계값 포함).

### 입력
```
[4개월전 - 3월] 없음 (hasSiteFour=false, billingHasFour=false)

[3개월전 - 4월] companyId=1: 6일
  - 2026-04-01, 2026-04-05, 2026-04-10, 2026-04-15, 2026-04-20, 2026-04-25
  ← 초일(04-01) 출역 O, 말일(04-30) 미출역

[2개월전 - 5월] companyId=1: 1일
  - 2026-05-03  ← 현장1 2개월전 있음

공제 내역: eight=[2026-04-20], over=[]
```

### 로직 흐름
1. companyId=1 처리:
   - `hasSiteFour`, `billingHasFour` = **false**
   - `siteWorkedFirst` = 04-01, 초일 ✓ → **true**
   - `siteWorkedLast` = 04-25, 말일 아님 → **false**
   - `siteWorkedFirst && !siteWorkedLast` = **true**
   - `allTwoMonthsAfter.some(i => i.companyId === 1)` = 2026-05-03 있음 → **true**
   - → [4] 분기
   - `siteMeetsThreshold` = 6 < 8, 6 × 370,000 = 2,220,000 >= 2,200,000 → **true** (급여 임계값 충족)
   - reconcileDeduction()
   - billingCurrentCount=6 < 8 → expectedDeductDates = billingDates 전체 = [04-01, 04-05, 04-10, 04-15, 04-20, 04-25]
   - 실제 공제: [04-20]
   - refunds = [04-20] 중 expected에 없는 것 = **없음** (04-20은 expected에 포함)
   - deducts = expected 중 실제에 없는 것 = [04-01, 04-05, 04-10, 04-15, 04-25]
2. **결과: 징수 (04-01, 04-05, 04-10, 04-15, 04-25)**

> **비교 케이스 (초일 미출역)**: 04-02~04-07, 04-09, 04-25 + 5월 출역 → siteWorkedFirst=false → [4] 미진입 → else → addSiteRefund → 공제 없으면 **비대상**

---

## 케이스 8: [4] 초일 출역 + 말일 미출역 + 현장 2개월전 출역 있음 + threshold 미달 → addSiteRefund → 환급

### 입력
```
[4개월전 - 3월] 없음

[3개월전 - 4월] companyId=1: 4일
  - 2026-04-01, 2026-04-10, 2026-04-15, 2026-04-20
  ← 초일 출역 O, 말일 미출역

[2개월전 - 5월] companyId=1: 1일
  - 2026-05-03

공제 내역: eight=[2026-04-15], over=[]
```

### 로직 흐름
1. `hasSiteFour`, `billingHasFour` = false
2. `siteWorkedFirst` = 04-01 ✓, `siteWorkedLast` = 04-20 ≠ 04-30 → false → [3] 미진입
3. `siteWorkedFirst && !siteWorkedLast` = true, `allTwoMonthsAfter.some(companyId=1)` = true → [4] 분기
4. `siteMeetsThreshold` = 4 < 8, 4×370,000 = 1,480,000 < 2,200,000 → **false**
5. `addSiteRefund([04-01, 04-10, 04-15, 04-20])`
6. 공제 내역 있음 → refunds 추가
7. **결과: 환급 (2026-04-01, 04-10, 04-15, 04-20)**

---

## 케이스 9: [5] billingWorkedOnFirst AND billingWorkedOnLast → reconcileDeduction

> 청구업체 기준 4월 초일+말일 모두 출역. 현장별로는 초일+말일이 서로 다른 companyId에 있는 경우.

### 입력
```
[4개월전 - 3월] 없음

[3개월전 - 4월]
  companyId=1: 3일 - 2026-04-01, 2026-04-10, 2026-04-15  ← 초일 출역, 말일 미출역
  companyId=2: 3일 - 2026-04-20, 2026-04-25, 2026-04-30  ← 초일 미출역, 말일 출역

[2개월전 - 5월] 없음

공제 내역: eight=[], over=[]
```

### 로직 흐름
1. `billingMeetsThreshold` = 청구업체 합계 6일, 6×370,000 = 2,220,000 >= 2,200,000 → **true**
2. companyId=1 처리:
   - `hasSiteFour`, `billingHasFour` = false
   - `siteWorkedFirst` = 04-01 ✓, `siteWorkedLast` = 04-15 ≠ 04-30 → false → [3] 미진입
   - `!siteWorkedLast` = true, 5월 현장1 없음 → [4] 미진입
   - `billingWorkedOnFirst` = billingDates[0] = 04-01 ✓
   - `billingWorkedOnLast` = billingDates[-1] = 04-30 ✓ → [5] 분기
   - `billingMeetsThreshold` = **true** → reconcileDeduction()
   - billingCurrentCount=6 < 8 → expectedDeductDates = billingDates 전체
   - 실제 공제 = []
   - deducts = [04-01, 04-10, 04-15, 04-20, 04-25, 04-30]
3. companyId=2도 동일하게 [5] → reconcileDeduction → 같은 deducts (Set으로 중복 제거됨)
4. **결과: 징수 (04-01, 04-10, 04-15, 04-20, 04-25, 04-30)**

---

## 케이스 10: [6] billingWorkedOnFirst + 청구업체 2개월전 있음 + billingCurrentCount >= 8 → reconcileDeduction

### 입력
```
[4개월전 - 3월] 없음

[3개월전 - 4월] companyId=1: 8일
  - 2026-04-01, 2026-04-05, 2026-04-10, 2026-04-15
  - 2026-04-18, 2026-04-20, 2026-04-22, 2026-04-25
  ← 초일(04-01) 출역, 말일(04-30) 미출역

[2개월전 - 5월] companyId=2: 1일
  - 2026-05-10  ← 청구업체 2개월전 있음 (현장1 아님)

공제 내역: eight=[2026-04-15], over=[2026-04-18, 2026-04-20, 2026-04-22, 2026-04-25]
```

### 로직 흐름
1. companyId=1 처리:
   - `hasSiteFour`, `billingHasFour` = false
   - `siteWorkedFirst` = 04-01 ✓, `siteWorkedLast` = 04-25 ≠ 04-30 → false → [3] 미진입
   - `!siteWorkedLast` = true, `allTwoMonthsAfter.some(i => i.companyId === 1)` = 5월 현장1 없음 → [4] 미진입
   - `billingWorkedOnFirst` = billingDates[0] = 04-01 ✓
   - `billingWorkedOnLast` = billingDates[-1] = 04-25 ≠ 04-30 → false → [5] 미진입
   - `allTwoMonthsAfter.length` = 1 > 0 ✓ → [6] 분기
   - `billingCurrentCount` = 8 >= 8 → **true** → reconcileDeduction()
   - expectedDeductDates = billingDates[7] = [04-25]
   - 실제 공제: [04-15, 04-18, 04-20, 04-22, 04-25]
   - refunds = [04-15, 04-18, 04-20, 04-22] (expected에 없는 것)
   - deducts = [] (04-25는 실제 공제에 있음)
2. **결과: 환급 (2026-04-15, 04-18, 04-20, 04-22)**

---

## 케이스 11: [6] billingWorkedOnFirst + 청구업체 2개월전 있음 + billingCurrentCount < 8 → addSiteRefund → 환급

> [6] 분기에서 급여 임계값이 적용되지 않는 특이 케이스.  
> 일수 8일 미만이면 급여와 무관하게 addSiteRefund 처리.

### 입력
```
[4개월전 - 3월] 없음

[3개월전 - 4월] companyId=1: 6일
  - 2026-04-01, 2026-04-05, 2026-04-10, 2026-04-15, 2026-04-20, 2026-04-25
  ← 초일 출역, 말일 미출역, 6×370,000 = 2,220,000 (급여 임계값 충족)

[2개월전 - 5월] companyId=2: 1일
  - 2026-05-10

공제 내역: eight=[2026-04-20], over=[]
```

### 로직 흐름
1. companyId=1:
   - [6] 분기 진입 (billingWorkedOnFirst=true, allTwoMonthsAfter.length=1)
   - `billingCurrentCount` = 6 < 8 → **false** → addSiteRefund()
   - 공제 내역 있음 → refunds 추가
2. **결과: 환급 (2026-04-01, 04-05, 04-10, 04-15, 04-20, 04-25)**

> **[6] 특이점**: 급여 임계값(2,220,000) 충족해도 일수 < 8이면 reconcile 안 함  
> [4] 분기와 달리 [6]은 `billingCurrentCount >= 8`만 체크

---

## 케이스 12: [7] else → addSiteRefund → 환급

> 모든 연속성 조건 미충족. 공제 내역 있으면 환급.

### 입력
```
[4개월전 - 3월] 없음

[3개월전 - 4월] companyId=1: 5일
  - 2026-04-05, 2026-04-10, 2026-04-15, 2026-04-20, 2026-04-25
  ← 초일(04-01) 미출역, 말일(04-30) 미출역

[2개월전 - 5월] 없음

공제 내역: eight=[2026-04-20], over=[]
```

### 로직 흐름
1. `hasSiteFour` = false, `billingHasFour` = false
2. `siteWorkedFirst` = 04-05 초일 아님 → false → [3] 미진입
3. `!siteWorkedLast` = true, 5월 현장1 없음 → [4] 미진입
4. `billingWorkedOnFirst` = 04-05 초일 아님 → false → [5][6] 미진입
5. else → `addSiteRefund([04-05, 04-10, 04-15, 04-20, 04-25])`
6. 공제 내역 있음 → refunds 추가
7. **결과: 환급 (2026-04-05, 04-10, 04-15, 04-20, 04-25)**

---

## 케이스 13: [7] else + 공제 없음 → 비대상

### 입력
```
[4개월전 - 3월] 없음

[3개월전 - 4월] companyId=1: 4일
  - 2026-04-08, 2026-04-12, 2026-04-16, 2026-04-22

[2개월전 - 5월] 없음

공제 내역: eight=[], over=[]
```

### 로직 흐름
1. 모든 연속성 조건 false → else → `addSiteRefund([04-08, 04-12, 04-16, 04-22])`
2. `hasDeduction` = false → 비대상 (refunds에 추가 안 함)
3. **결과: 비대상**

---

## 결과 요약

| 케이스 | 4개월전 | 4월 출역 | 2개월전 | 진입 분기 | 임계값 | 공제내역 | 결과 |
|-------|--------|--------|--------|---------|------|--------|-----|
| 1 | 현장O | 5일 | - | [1] hasSiteFour | 미달 | O | **환급** |
| 2 | 현장O | 8일 | - | [1] hasSiteFour | 충족(일수) | O | **비대상** |
| 3 | 현장X 청구O | 3+6일 | - | [1]+billingMeetsThreshold | 충족(일수) | O | **비대상** |
| 4 | 청구O 현장X | 8일 | - | [2] billingHasFour | 충족(일수) | X | **징수** |
| 5 | 청구O 현장X | 4일 | - | [2] billingHasFour | 미달 | O | **환급** |
| 6 | 없음 | 8일(초+말) | - | [3] 초일+말일 | 충족(일수) | O | **환급(정산)** |
| **7** | **없음** | **6일** | **현장O** | **[4] 말일미출역+2개월전** | **충족(급여 2,220,000)** | **O** | **징수** (버그수정) |
| 8 | 없음 | 4일 | 현장O | [4] 말일미출역+2개월전 | 미달 | O | **환급** |
| 9 | 없음 | 3+3일(초+말) | - | [5] 청구업체 초+말 | 충족(급여) | X | **징수** |
| 10 | 없음 | 8일(초O말X) | 청구O | [6] 청구업체초일+2개월전 | count>=8 | O | **환급(정산)** |
| **11** | **없음** | **6일(초O말X)** | **청구O** | **[6] 청구업체초일+2개월전** | **count<8 (급여무관)** | **O** | **환급** |
| 12 | 없음 | 5일(초X말X) | 없음 | [7] else | - | O | **환급** |
| 13 | 없음 | 4일(초X말X) | 없음 | [7] else | - | X | **비대상** |

> **케이스 7 (버그 수정)**: [4] 분기에서 `siteMeetsThreshold` = `count >= 8 || wage >= 2,200,000`  
>   수정 전: `siteCurrentCount >= 8`만 체크 → 6 < 8 → addSiteRefund → **환급 (오류)**  
>   수정 후: 급여 임계값도 포함 → 6×370,000=2,220,000 충족 → reconcileDeduction → **징수 (정상)**
>
> **케이스 11 특이점**: [6] 분기는 `billingCurrentCount >= 8`만 체크 (급여 임계값 미적용)  
>   동일 조건에서 [4] 분기는 급여 임계값 적용 → 두 분기 간 의도적 비대칭
