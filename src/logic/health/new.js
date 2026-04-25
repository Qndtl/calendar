// 신규 건강보험 공제 로직
import { formatFromDate, getMonthKey, isFirstDayOfMonth, isLastDayOfMonth } from "@/logic/utils";

export const calculateHealthInsuranceDeduction = (groupedDates, workYear, workMonth, companyId) => {
  console.log(`%c[신규] 건강보험 건설사${companyId} 공제 대상 체크`, 'color: #00aaff');

  const oneMonthAgo = groupedDates[getMonthKey(workYear, workMonth, -1)] || [];
  const currentMonth = groupedDates[getMonthKey(workYear, workMonth, 0)] || [];

  const sortedCurrent = [...currentMonth].sort();

  // STEP 1: 전월 출역 확인
  if (oneMonthAgo.length < 1) {
    // STEP 2: 당월 초일 출역 여부
    const workedOnFirst = isFirstDayOfMonth(sortedCurrent[0], workYear, parseInt(workMonth));
    if (!workedOnFirst) {
      console.log('전월 출역 없음 + 당월 초일 미출역 → 공제 비대상');
      return { eight: [], over: [] };
    }
    console.log('전월 출역 없음 + 당월 초일 출역 → STEP 3');
  } else {
    console.log('전월 출역 있음 → STEP 3');
  }

  // STEP 3: 당월 출역 횟수 판정
  if (sortedCurrent.length === 8) {
    console.log('당월 출역 = 8 → 8일분 공제');
    return { eight: [sortedCurrent[7]], over: [] };
  } else if (sortedCurrent.length > 8) {
    console.log('당월 출역 > 8 → 1일분 공제');
    return { eight: [sortedCurrent[7]], over: sortedCurrent.slice(8) };
  } else {
    console.log('당월 출역 < 8 → 공제 비대상');
    return { eight: [], over: [] };
  }
};

// 신규 건강보험 환급 로직 (백업)
export const calculateHealthInsuranceRefund_bk = (groupedDates, workYear, targetMonth, deductibles, companyId) => {
  console.log(`%c[신규] 건강보험 건설사${companyId} 환급 대상 체크 시작`, 'color: #00aaff');

  const oneMonthAgo = groupedDates[getMonthKey(workYear, targetMonth, -1)] || [];
  const currentMonth = groupedDates[getMonthKey(workYear, targetMonth, 0)] || [];
  const oneMonthAfter = groupedDates[getMonthKey(workYear, targetMonth, 1)] || [];

  const sortedCurrent = [...currentMonth].sort();
  const sortedOneMonthAfter = [...oneMonthAfter].sort();

  const healthDeductibles = [...deductibles['eight'], ...deductibles['over']].filter(Boolean);
  let refunds = [];

  // STEP 1: 4개월 전월 출역 수 >= 1 → 이전 flow와 동일 (daysInMonth 기준)
  if (oneMonthAgo.length >= 1) {
    console.log('[신규] STEP 1: 4개월 전월 출역 있음 → 이전 flow와 동일');

    const twoMonthsAgo = groupedDates[getMonthKey(workYear, targetMonth, -2)] || [];
    const twoMonthsAfter = groupedDates[getMonthKey(workYear, targetMonth, 2)] || [];
    const sortedOneMonthAgo = [...oneMonthAgo].sort();

    const mergedWithPrev = [...sortedOneMonthAgo, ...sortedCurrent].sort();
    const firstDateOfOneMonthAgo = new Date(sortedOneMonthAgo[0]);
    const daysInOneMonthAgo = new Date(firstDateOfOneMonthAgo.getFullYear(), firstDateOfOneMonthAgo.getMonth() + 1, 0).getDate();
    const lastFromFirstDate = new Date(firstDateOfOneMonthAgo.getTime() + (daysInOneMonthAgo - 1) * 24 * 60 * 60 * 1000);
    const lastFromFirstDateStr = formatFromDate(lastFromFirstDate);

    // 5개월 전월 출역 있음
    if (twoMonthsAgo.length > 0) {
      if (sortedCurrent.length >= 8) {
        console.log('[신규] STEP 1: 5개월 전 출역 있음, 3개월 전 >= 8 → 금액 비교');
        return refunds;
      }
      const intersect = sortedCurrent.filter(d => healthDeductibles.includes(d));
      if (intersect.length > 0) refunds.push(...sortedCurrent);
      return refunds;
    }

    // 4개월 전 초일 출역 확인
    const oneMonthAgoKey = getMonthKey(workYear, targetMonth, -1);
    const [omaYear, omaMonth] = oneMonthAgoKey.split('-').map(Number);
    if (isFirstDayOfMonth(sortedOneMonthAgo[0], omaYear, omaMonth)) {
      if (sortedCurrent.length >= 8) {
        console.log('[신규] STEP 1: 4개월 전 초일 출역, 3개월 전 >= 8 → 금액 비교');
        return refunds;
      }
      const intersect = sortedCurrent.filter(d => healthDeductibles.includes(d));
      if (intersect.length > 0) refunds.push(...sortedCurrent);
      return refunds;
    }

    // 4개월 전 첫 출역 = 1/30 or 31
    const isSpecialOneMonthAgo = sortedOneMonthAgo[0].endsWith('-01-30') || sortedOneMonthAgo[0].endsWith('-01-31');
    if (isSpecialOneMonthAgo) {
      if (mergedWithPrev.length < 8) {
        const intersect = sortedCurrent.filter(d => healthDeductibles.includes(d));
        if (intersect.length > 0) refunds.push(...sortedCurrent);
        return refunds;
      }
      const lastDayWorked = sortedCurrent.length > 0 &&
        isLastDayOfMonth(sortedCurrent[sortedCurrent.length - 1], workYear, parseInt(targetMonth));
      if (lastDayWorked) {
        console.log('[신규] STEP 1: 1/30 or 31 특수 케이스 말일 출역 → 금액 비교');
        return refunds;
      }
      if (sortedOneMonthAfter.length > 0) {
        console.log('[신규] STEP 1: 1/30 or 31 특수 케이스 2개월 전 출역 있음 → 금액 비교');
        return refunds;
      }
      const intersect = sortedCurrent.filter(d => healthDeductibles.includes(d));
      if (intersect.length > 0) refunds.push(...sortedCurrent);
      return refunds;
    }

    // 4개월 전 출역 >= 8 → 금액 비교
    if (oneMonthAgo.length >= 8) {
      console.log('[신규] STEP 1: 4개월 전 출역 >= 8 → 금액 비교');
      return refunds;
    }

    // 4개월 전 출역 < 8: [첫 출역 ~ 첫 출역+N일] 범위 체크 (daysInMonth 기준)
    const filteredInRange = mergedWithPrev.filter(item => new Date(item) <= lastFromFirstDate);

    if (filteredInRange.length >= 8) {
      if (mergedWithPrev.includes(lastFromFirstDateStr)) {
        console.log('[신규] STEP 1: 4개월 전 첫 출역+N일 출역 → 금액 비교');
        return refunds;
      }
      const filteredAfter = mergedWithPrev.filter(item => new Date(item) > lastFromFirstDate);
      if (filteredAfter.length === 0) {
        const intersect = sortedCurrent.filter(d => healthDeductibles.includes(d));
        if (intersect.length > 0) refunds.push(...sortedCurrent);
        return refunds;
      }
      console.log('[신규] STEP 1: 4개월 전 첫 출역+N+1일 이후 출역 있음 → 금액 비교');
      return refunds;
    }

    if (sortedCurrent.length >= 8) {
      console.log('[신규] STEP 1: 4개월 전~+N일 < 8, 3개월 전 >= 8 → 금액 비교');
      return refunds;
    }
    const intersect = sortedCurrent.filter(d => healthDeductibles.includes(d));
    if (intersect.length > 0) refunds.push(...sortedCurrent);
    return refunds;
  }

  console.log('[신규] STEP 1: 4개월 전월 출역 없음 → STEP 2');

  // STEP 2: 3개월 전월 초일 출역 확인
  const workedOnFirst = sortedCurrent.length > 0 && isFirstDayOfMonth(sortedCurrent[0], workYear, parseInt(targetMonth));

  if (workedOnFirst) {
    console.log('[신규] STEP 2: 3개월 전월 초일 출역 → STEP 3');

    // STEP 3: 3개월 전월 말일 출역 확인
    const workedOnLast = sortedCurrent.length > 0 &&
      isLastDayOfMonth(sortedCurrent[sortedCurrent.length - 1], workYear, parseInt(targetMonth));

    if (!workedOnLast) {
      console.log('[신규] STEP 3: 3개월 전월 말일 미출역 → 공제 비대상 → 3개월 전월 공제 금액 환급');
      const intersect = sortedCurrent.filter(d => healthDeductibles.includes(d));
      if (intersect.length > 0) {
        refunds.push(...sortedCurrent);
      }
      return refunds;
    }

    console.log('[신규] STEP 3: 3개월 전월 말일 출역 → STEP 5');

    // STEP 5: [3개월 전월 1일 ~ 말일] 출역 수 >= 8?
    if (sortedCurrent.length < 8) {
      console.log('[신규] STEP 5: 3개월 전월 출역 < 8 → 공제 비대상 → 3개월 전월 공제 금액 환급');
      const intersect = sortedCurrent.filter(d => healthDeductibles.includes(d));
      if (intersect.length > 0) {
        refunds.push(...sortedCurrent);
      }
      return refunds;
    }

    console.log('[신규] STEP 5: 3개월 전월 출역 >= 8 → STEP 7');

    // STEP 7: 3개월 전월 공제 금액 & 환급 공제 금액 비교
    console.log('%c[신규] STEP 7: 금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;

  } else {
    console.log('[신규] STEP 2: 3개월 전월 초일 미출역 → STEP 4');

    const firstWork = sortedCurrent[0];

    // STEP 4: 3개월 전월 첫 출역 = 1/30 or 31?
    const isSpecial = firstWork?.endsWith('-01-30') || firstWork?.endsWith('-01-31');

    if (isSpecial) {
      console.log('[신규] STEP 4: 3개월 전월 첫 출역 = 1/30 or 31');

      // 2월 말일 출역 확인 (oneMonthAfter = 2월)
      const oneMonthAfterKey = getMonthKey(workYear, targetMonth, 1);
      const [oneMonthAfterYear, oneMonthAfterMonth] = oneMonthAfterKey.split('-').map(Number);
      const workedOnLastOfFeb = sortedOneMonthAfter.length > 0 &&
        isLastDayOfMonth(sortedOneMonthAfter[sortedOneMonthAfter.length - 1], oneMonthAfterYear, oneMonthAfterMonth);

      if (!workedOnLastOfFeb) {
        console.log('[신규] STEP 4: 2월 말일 미출역 → 공제 비대상 → 3개월 전월 공제 금액 환급');
        const intersect = sortedCurrent.filter(d => healthDeductibles.includes(d));
        if (intersect.length > 0) {
          refunds.push(...sortedCurrent);
        }
        return refunds;
      }

      // 2월 말일 출역: [1/30 or 31 ~ 2월 말일] 출역 수 확인
      const merged = [...sortedCurrent, ...sortedOneMonthAfter].sort();
      if (merged.length >= 8) {
        console.log('[신규] STEP 4: [1/30 or 31 ~ 2월 말일] 출역 >= 8 → 3개월 전월 공제 금액 환급');
      } else {
        console.log('[신규] STEP 4: [1/30 or 31 ~ 2월 말일] 출역 < 8 → 공제 비대상 → 3개월 전월 공제 금액 환급');
      }
      const intersect = sortedCurrent.filter(d => healthDeductibles.includes(d));
      if (intersect.length > 0) {
        refunds.push(...sortedCurrent);
      }
      return refunds;

    } else {
      console.log('[신규] STEP 4: 3개월 전월 첫 출역 != 1/30 or 31 → STEP 6');

      if (!firstWork) {
        console.log('[신규] 3개월 전월 출역 없음 → 환급 비대상');
        return refunds;
      }

      // STEP 6: 3개월 전 첫 출역+30일 출역 기록 확인
      // +30일은 고정값이 아닌 첫 출역일이 속한 달의 마지막 날 수만큼 더함
      // ex) 3월 25일 → 3월 31일이 마지막 → +31일 = 4월 25일
      const firstDate = new Date(firstWork);
      const daysInFirstMonth = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0).getDate();
      const thirtyDaysAfter = new Date(firstDate.getTime() + (daysInFirstMonth - 1) * 24 * 60 * 60 * 1000);
      const thirtyDaysAfterStr = formatFromDate(thirtyDaysAfter);

      const allDates = [...sortedCurrent, ...sortedOneMonthAfter].sort();
      const workedOnThirtyDays = allDates.includes(thirtyDaysAfterStr);

      if (!workedOnThirtyDays) {
        console.log('[신규] STEP 6: 3개월 전 첫 출역+30일 미출역 → 공제 비대상 → 3개월 전월 공제 금액 환급');
        const intersect = sortedCurrent.filter(d => healthDeductibles.includes(d));
        if (intersect.length > 0) {
          refunds.push(...sortedCurrent);
        }
        return refunds;
      }

      console.log('[신규] STEP 6: 3개월 전 첫 출역+30일 출역 → STEP 8');

      // STEP 8: [3개월 전 첫 출역 ~ 3개월 전 첫 출역+30일] 출역 수 >= 8?
      const filtered = allDates.filter(item => {
        const date = new Date(item);
        return date >= firstDate && date <= thirtyDaysAfter;
      });

      if (filtered.length >= 8) {
        console.log('[신규] STEP 8: [첫 출역 ~ +30일] 출역 >= 8 → 공제 대상 유지 (환급 없음)');
        return refunds;
      }

      console.log('[신규] STEP 8: [첫 출역 ~ +30일] 출역 < 8 → 공제 비대상 → 3개월 전월 공제 금액 환급');
      const intersect = sortedCurrent.filter(d => healthDeductibles.includes(d));
      if (intersect.length > 0) {
        refunds.push(...sortedCurrent);
      }
      return refunds;
    }
  }
};

// 신규 건강보험 환급 로직 (v2 - 간소화)
export const calculateHealthInsuranceRefund = (groupedDates, workYear, targetMonth, deductibles, companyId) => {
  console.log(`%c[신규v2] 건강보험 건설사${companyId} 환급 대상 체크 시작`, 'color: #00aaff');

  const twoMonthsAgo = groupedDates[getMonthKey(workYear, targetMonth, -2)] || []; // 5개월 전
  const oneMonthAgo = groupedDates[getMonthKey(workYear, targetMonth, -1)] || [];
  const currentMonth = groupedDates[getMonthKey(workYear, targetMonth, 0)] || [];
  const oneMonthAfter = groupedDates[getMonthKey(workYear, targetMonth, 1)] || [];

  const sorted5 = [...twoMonthsAgo].sort();  // 5개월 전
  const sorted4 = [...oneMonthAgo].sort();   // 4개월 전
  const sorted3 = [...currentMonth].sort();  // 3개월 전
  const sorted2 = [...oneMonthAfter].sort(); // 2개월 전

  const healthDeductibles = [...deductibles['eight'], ...deductibles['over']].filter(Boolean);
  const refunds = [];
  const deducts = [];

  // 3개월전 첫 출역이 1/30 or 1/31 특수일인지 확인
  const is3MonthSpecial = sorted3.length > 0 &&
    (sorted3[0].endsWith('-01-30') || sorted3[0].endsWith('-01-31'));

  // Step 1 합산: 4개월전 없으면 3개월전+2개월전 합산 (window가 sorted2까지 걸칠 수 있음), 있으면 4개월전+3개월전 합산
  const totalDays = sorted4.length === 0
    ? sorted3.length + sorted2.length
    : sorted4.length + sorted3.length;

  // ─── Step 1: 합산 출역 8일 미만 → 공제된 것 환급 ───
  if (totalDays < 8) {
    console.log(`[신규v2] Step 1: 합산 출역 ${totalDays}일 < 8 → 공제된 것 환급`);
    const intersect = sorted3.filter(d => healthDeductibles.includes(d));
    if (intersect.length > 0) refunds.push(...sorted3);
    return { refunds, deducts };
  }

  console.log(`[신규v2] Step 2: 3+4개월전 전체 출역 ${totalDays}일 >= 8 → 기간 체크`);

  // ─── 기간 계산 ───
  const allDates = [...sorted4, ...sorted3, ...sorted2].sort();

  // 4개월 전 기간: 첫출역 ~ +30일 (초일이면 당월 말일까지)
  let period4Start = null;
  let period4End = null;
  let period4Count = 0;

  if (sorted4.length > 0) {
    period4Start = sorted4[0];
    const firstDate4 = new Date(sorted4[0]);
    const key4 = getMonthKey(workYear, targetMonth, -1);
    const [y4, m4] = key4.split('-').map(Number);

    if (isFirstDayOfMonth(sorted4[0], y4, m4)) {
      // 초일 출역 → 당월 말일
      const lastDay = new Date(y4, m4, 0).getDate();
      period4End = `${key4}-${String(lastDay).padStart(2, '0')}`;
    } else {
      const daysInMonth = new Date(firstDate4.getFullYear(), firstDate4.getMonth() + 1, 0).getDate();
      period4End = formatFromDate(new Date(firstDate4.getTime() + (daysInMonth - 1) * 24 * 60 * 60 * 1000));
    }

    period4Count = allDates.filter(d => d >= period4Start && d <= period4End).length;
  }

  // 3개월 전 기간 (from-start): 첫출역 ~ 첫출역 + (해당월 마지막일 - 1)
  let period3Start = null;
  let period3End = null;
  let period3Count = 0;

  if (sorted3.length > 0) {
    period3Start = sorted3[0];
    const firstDate3 = new Date(sorted3[0]);
    const daysInMonth3 = new Date(firstDate3.getFullYear(), firstDate3.getMonth() + 1, 0).getDate();
    period3End = formatFromDate(new Date(firstDate3.getTime() + (daysInMonth3 - 1) * 24 * 60 * 60 * 1000));
    period3Count = allDates.filter(d => d >= period3Start && d <= period3End).length;
  }

  console.log(`[신규v2] 4개월전 기간: ${period4Start} ~ ${period4End} (${period4Count}일)`);
  console.log(`[신규v2] 3개월전 기간(from-start): ${period3Start} ~ ${period3End} (${period3Count}일)`);

  // ─── Step 3-4: 모든 기간 8일 미만 → 환급 (3개월전 내역만) ───
  if (period4Count < 8 && period3Count < 8) {
    console.log('[신규v2] Step 4: 두 기간 모두 8일 미만 → 환급 (3개월전 내역)');
    const intersect = sorted3.filter(d => healthDeductibles.includes(d));
    if (intersect.length > 0) refunds.push(...sorted3);
    return { refunds, deducts };
  }

  // ─── Step 5: 하나라도 8일 이상 ───
  console.log('[신규v2] Step 5: 기간 중 하나 이상 8일 이상');

  // ─── Step 5a: 4개월전 기간 >= 8 ───
  if (period4Count >= 8) {
    console.log(`[신규v2] Step 5a: 4개월전 기간 ${period4Count}일 >= 8`);

    // 4개월전 단독 8일 이상 → 이미 요건 충족 (Branch E)
    const sorted4Enough = sorted4.length >= 8;

    // 기간 후 ~ 2개월전 말일 출역 체크
    const afterPeriod4 = allDates.filter(d => d > period4End);
    // 기간 첫날 AND 마지막날 출역 체크
    const firstAndLastWorked = allDates.includes(period4Start) && allDates.includes(period4End);

    // 4개월전 1/30, 1/31 특수일: period4End가 3월로 넘어가므로 3개월전 말일 출역 체크 (Branch D)
    const is4MonthSpecial = sorted4.length > 0 &&
      (sorted4[0].endsWith('-01-30') || sorted4[0].endsWith('-01-31'));
    const key3 = getMonthKey(workYear, targetMonth, 0);
    const [y3, m3] = key3.split('-').map(Number);
    const sorted3LastDay = `${key3}-${String(new Date(y3, m3, 0).getDate()).padStart(2, '0')}`;
    const sorted3LastDayWorked = is4MonthSpecial && sorted3.includes(sorted3LastDay);

    if (afterPeriod4.length > 0 || firstAndLastWorked || sorted4Enough || sorted3LastDayWorked) {
      console.log('[신규v2] Step 5a: 공제 정당');
      console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
      if (healthDeductibles.length === 0) {
        deducts.push(...sorted3);
      }
      return { refunds, deducts };
    }

    // 공제 부당 → 환급
    console.log('[신규v2] Step 5a: 기간 후 출역 없음 & 기타 조건 미충족 → 환급');
    const intersect = sorted3.filter(d => healthDeductibles.includes(d));
    if (intersect.length > 0) refunds.push(...sorted3);
    return { refunds, deducts };
  }

  // ─── Step 5b: 4개월전 기간 < 8 ───
  console.log(`[신규v2] Step 5b: 4개월전 기간 ${period4Count}일 < 8`);

  // 5개월전 있음 → 이전 크로스월이 이미 성립 → 공제 정당
  if (sorted5.length > 0) {
    console.log('[신규v2] Step 5b: 5개월전 출역 있음 → 공제 정당');
    if (sorted3.length >= 8) {
      console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
      if (healthDeductibles.length === 0) deducts.push(...sorted3);
      return { refunds, deducts };
    }
    console.log('[신규v2] Step 5b: 5개월전 있으나 3개월전 < 8 → 환급');
    const intersect = sorted3.filter(d => healthDeductibles.includes(d));
    if (intersect.length > 0) refunds.push(...sorted3);
    return { refunds, deducts };
  }

  // 4개월전 초일 출역 → 연속 고용 신호 → 공제 정당
  const key4 = getMonthKey(workYear, targetMonth, -1);
  const [y4init, m4init] = key4.split('-').map(Number);
  if (sorted4.length > 0 && isFirstDayOfMonth(sorted4[0], y4init, m4init)) {
    console.log('[신규v2] Step 5b: 4개월전 초일 출역 → 공제 정당');
    if (sorted3.length >= 8) {
      console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
      if (healthDeductibles.length === 0) deducts.push(...sorted3);
      return { refunds, deducts };
    }
    console.log('[신규v2] Step 5b: 4개월전 초일 출역이나 3개월전 < 8 → 환급');
    const intersect = sorted3.filter(d => healthDeductibles.includes(d));
    if (intersect.length > 0) refunds.push(...sorted3);
    return { refunds, deducts };
  }

  // 4개월전 있고 3개월전 단독 8일 이상 → 이미 요건 충족 (Branch F)
  if (sorted4.length > 0 && sorted3.length >= 8) {
    console.log('[신규v2] Step 5b: 4개월전 있음 + 3개월전 단독 >= 8 → 공제 정당');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    if (healthDeductibles.length === 0) deducts.push(...sorted3);
    return { refunds, deducts };
  }

  // 4개월전 있고 3개월전 < 8 → Branch F sub: period3 window에 sorted2 포함돼도 요건 불충족 → 환급
  if (sorted4.length > 0 && sorted3.length < 8) {
    console.log('[신규v2] Step 5b: 4개월전 있음 + 3개월전 단독 < 8 → 환급');
    const intersect = sorted3.filter(d => healthDeductibles.includes(d));
    if (intersect.length > 0) refunds.push(...sorted3);
    return { refunds, deducts };
  }

  console.log(`[신규v2] Step 5b: 3개월전 기간 체크 (period3Count=${period3Count})`);

  // ─── Step 5c: 3개월전 기간 >= 8 ───
  if (period3Count >= 8) {
    console.log(`[신규v2] Step 5c: 3개월전 기간 ${period3Count}일 >= 8`);

    // 기간 종료일 이후 출역 여부 체크
    // 특수일(1/30, 1/31)로 period3End가 3월을 넘어가는 경우, sorted2 말일 출역도 공제 정당으로 인정
    const key2 = getMonthKey(workYear, targetMonth, 1);
    const [y2, m2] = key2.split('-').map(Number);
    const sorted2LastDay = sorted2.length > 0 ? `${key2}-${String(new Date(y2, m2, 0).getDate()).padStart(2, '0')}` : null;
    const sorted2LastWorked = sorted2LastDay && sorted2.includes(sorted2LastDay);
    const afterPeriod3 = allDates.some(d => d >= period3End) || (is3MonthSpecial && sorted2LastWorked);

    if (afterPeriod3) {
      console.log('[신규v2] Step 5c: 공제 정당');
      console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
      if (healthDeductibles.length === 0) {
        deducts.push(...sorted3);
      }
      return { refunds, deducts };
    }

    // 공제 부당 → 환급
    console.log('[신규v2] Step 5c: 기간 종료일 이후 출역 없음 → 환급');
    const intersect = sorted3.filter(d => healthDeductibles.includes(d));
    if (intersect.length > 0) refunds.push(...sorted3);
    return { refunds, deducts };
  }

  // ─── Step 5d: 3개월전 기간 < 8 → 무조건 환급 ───
  console.log(`[신규v2] Step 5d: 3개월전 기간 ${period3Count}일 < 8 → 환급`);
  const intersect = sorted3.filter(d => healthDeductibles.includes(d));
  if (intersect.length > 0) refunds.push(...sorted3);
  return { refunds, deducts };
};
