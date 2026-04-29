// 신규 국민연금 공제 로직
import { getMonthKey, isFirstDayOfMonth, isLastDayOfMonth } from '../utils';

const applyDeduction = (siteCount, billingDates, eightSet, overSet) => {
  if (siteCount === 8) {
    eightSet.add(billingDates[7]);
  } else if (siteCount > 8) {
    eightSet.add(billingDates[7]);
    billingDates.slice(8).forEach(d => overSet.add(d));
  }
  // < 8: 비대상
};

export const calculatePensionDeduction = (groupedDates, workYear, workMonth, wage) => {
  console.log('%c[신규] 국민연금 공제 대상 체크', 'color: #00aaff');

  const allPrevMonth = groupedDates[getMonthKey(workYear, workMonth, -1)] || [];
  const allCurrentMonth = groupedDates[getMonthKey(workYear, workMonth, 0)] || [];

  const sortByDate = (a, b) => a.workDate.localeCompare(b.workDate);
  const billingCurrentDates = [...allCurrentMonth].sort(sortByDate).map(i => i.workDate);

  const companyIds = [...new Set([
    ...allPrevMonth.map(item => item.companyId),
    ...allCurrentMonth.map(item => item.companyId),
  ])];

  const eightSet = new Set();
  const overSet = new Set();
  let needsBillingCheck = false;

  for (const companyId of companyIds) {
    const sitePrevMonth = allPrevMonth.filter(item => item.companyId === companyId);
    const siteCurrentMonth = [...allCurrentMonth.filter(item => item.companyId === companyId)].sort(sortByDate);

    if (sitePrevMonth.length >= 1) {
      console.log(`현장${companyId} 전월 출역 있음 → STEP 3`);
      applyDeduction(siteCurrentMonth.length, billingCurrentDates, eightSet, overSet);
    } else {
      const workedOnFirst = isFirstDayOfMonth(siteCurrentMonth[0]?.workDate, workYear, parseInt(workMonth));
      if (workedOnFirst) {
        console.log(`현장${companyId} 전월 출역 없음 + 당월 초일 출역 → STEP 3`);
        applyDeduction(siteCurrentMonth.length, billingCurrentDates, eightSet, overSet);
      } else {
        console.log(`현장${companyId} 전월 출역 없음 + 당월 초일 미출역 → 청구업체 체크`);
        needsBillingCheck = true;
      }
    }
  }

  if (needsBillingCheck) {
    if (allPrevMonth.length >= 1) {
      console.log('청구업체 전월 출역 있음 → STEP 6');
      applyDeduction(billingCurrentDates.length, billingCurrentDates, eightSet, overSet);
    } else {
      const billingWorkedOnFirst = isFirstDayOfMonth(billingCurrentDates[0], workYear, parseInt(workMonth));
      if (billingWorkedOnFirst) {
        console.log('청구업체 당월 초일 출역 → STEP 6');
        applyDeduction(billingCurrentDates.length, billingCurrentDates, eightSet, overSet);
      } else {
        console.log('청구업체 당월 초일 미출역 → 공제 비대상');
      }
    }
  }

  return {
    eight: [...eightSet],
    over: [...overSet],
  };
};

const PENSION_THRESHOLD = 2200000;

// 신규 국민연금 환급 로직
export const calculateStatePensionRefund = (groupedDates, workYear, targetMonth, wage, deductibles) => {
  console.log('%c[신규] 국민연금 환급 대상 체크 시작', 'color: #00aaff');

  const sortByDate = (a, b) => a.workDate.localeCompare(b.workDate);

  const allFourMonthsAgo = [...(groupedDates[getMonthKey(workYear, targetMonth, -1)] || [])].sort(sortByDate);
  const allThreeMonthsAgo = [...(groupedDates[getMonthKey(workYear, targetMonth, 0)] || [])].sort(sortByDate);

  const allDeductDates = [...(deductibles.eight || []), ...(deductibles.over || [])];
  const hasDeduction = allDeductDates.length > 0;

  const billingCurrentDates = allThreeMonthsAgo.map(i => i.workDate);
  const billingCurrentCount = billingCurrentDates.length;
  const billingCurrentWage = billingCurrentCount * wage;

  const threeMonthsAgoKey = getMonthKey(workYear, targetMonth, 0);
  const [tmYear, tmMonth] = threeMonthsAgoKey.split('-').map(Number);

  // 청구업체 초일+말일, 4개월전 — 반복문 밖에서 한 번만 계산
  const billingWorkedOnFirst = billingCurrentDates.length > 0 &&
    isFirstDayOfMonth(billingCurrentDates[0], tmYear, tmMonth);
  const billingWorkedOnLast = billingCurrentDates.length > 0 &&
    isLastDayOfMonth(billingCurrentDates[billingCurrentDates.length - 1], tmYear, tmMonth);
  const billingHasFour = allFourMonthsAgo.length > 0;
  const billingMeetsThreshold = billingCurrentCount >= 8 || billingCurrentWage >= PENSION_THRESHOLD;

  const refunds = [];
  const deducts = [];

  // 실제 공제 vs 정당 공제 비교 → 초과분 환급 / 부족분 징수
  const reconcileDeduction = () => {
    const expectedDeductDates = billingCurrentCount >= 8
      ? billingCurrentDates.slice(7)
      : billingCurrentDates;
    refunds.push(...allDeductDates.filter(d => !expectedDeductDates.includes(d)));
    deducts.push(...expectedDeductDates.filter(d => !allDeductDates.includes(d)));
  };

  // 공제 이력이 있으면 현장 출역일 환급 표시
  const addSiteRefund = (siteWorkDates) => {
    if (hasDeduction) refunds.push(...siteWorkDates);
  };

  const companyIds = [...new Set(allThreeMonthsAgo.map(i => i.companyId))];
  if (companyIds.length === 0) return { refunds: [], deducts: [] };

  for (const companyId of companyIds) {
    const siteFourMonthsAgo = allFourMonthsAgo.filter(i => i.companyId === companyId);
    const siteCurrentMonth = allThreeMonthsAgo.filter(i => i.companyId === companyId);
    const siteCurrentWorkDates = siteCurrentMonth.map(i => i.workDate);
    const siteCurrentCount = siteCurrentMonth.length;
    const siteCurrentWage = siteCurrentCount * wage;

    const hasSiteFour = siteFourMonthsAgo.length > 0;
    const siteWorkedFirst = siteCurrentWorkDates.length > 0 &&
      isFirstDayOfMonth(siteCurrentWorkDates[0], tmYear, tmMonth);
    const siteWorkedLast = siteCurrentWorkDates.length > 0 &&
      isLastDayOfMonth(siteCurrentWorkDates[siteCurrentWorkDates.length - 1], tmYear, tmMonth);
    const siteMeetsThreshold = siteCurrentCount >= 8 || siteCurrentWage >= PENSION_THRESHOLD;

    if (hasSiteFour) {
      // [1] 현장 4개월전 출역 O → 현장 임계값 → 청구업체 임계값
      console.log(`[신규] 현장${companyId}: 현장 4개월전 출역 있음`);
      if (siteMeetsThreshold) {
        console.log(`[신규] 현장${companyId}: 현장 임계값 충족 → 공제 정산`);
        reconcileDeduction();
      } else if (billingMeetsThreshold) {
        console.log(`[신규] 현장${companyId}: 현장 임계값 미달, 청구업체 임계값 충족 → 공제 정산`);
        reconcileDeduction();
      } else {
        console.log(`[신규] 현장${companyId}: 임계값 미달 → 환급`);
        addSiteRefund(siteCurrentWorkDates);
      }
    } else if (billingHasFour) {
      // [2] 현장 4개월전 X, 청구업체 4개월전 O → 청구업체 임계값만
      console.log(`[신규] 현장${companyId}: 현장 4개월전 없음, 청구업체 4개월전 있음`);
      if (billingMeetsThreshold) {
        console.log(`[신규] 현장${companyId}: 청구업체 임계값 충족 → 공제 정산`);
        reconcileDeduction();
      } else {
        console.log(`[신규] 현장${companyId}: 청구업체 임계값 미달 → 환급`);
        addSiteRefund(siteCurrentWorkDates);
      }
    } else if (siteWorkedFirst && siteWorkedLast) {
      // [3] 4개월전 없음, 현장 초일+말일 O → [1]과 동일 (현장 임계값 → 청구업체 임계값)
      console.log(`[신규] 현장${companyId}: 현장 초일+말일 출역`);
      if (siteMeetsThreshold) {
        console.log(`[신규] 현장${companyId}: 현장 임계값 충족 → 공제 정산`);
        reconcileDeduction();
      } else if (billingMeetsThreshold) {
        console.log(`[신규] 현장${companyId}: 현장 임계값 미달, 청구업체 임계값 충족 → 공제 정산`);
        reconcileDeduction();
      } else {
        console.log(`[신규] 현장${companyId}: 임계값 미달 → 환급`);
        addSiteRefund(siteCurrentWorkDates);
      }
    } else if (billingWorkedOnFirst && billingWorkedOnLast) {
      // [4] 4개월전 없음, 현장 초일/말일 X, 청구업체 초일+말일 O → [2]와 동일 (청구업체 임계값만)
      console.log(`[신규] 현장${companyId}: 청구업체 초일+말일 출역`);
      if (billingMeetsThreshold) {
        console.log(`[신규] 현장${companyId}: 청구업체 임계값 충족 → 공제 정산`);
        reconcileDeduction();
      } else {
        console.log(`[신규] 현장${companyId}: 청구업체 임계값 미달 → 환급`);
        addSiteRefund(siteCurrentWorkDates);
      }
    } else {
      // [5] 모든 연속근로 조건 미충족 → 환급
      console.log(`[신규] 현장${companyId}: 연속근로 조건 미충족 → 환급`);
      addSiteRefund(siteCurrentWorkDates);
    }
  }

  return {
    refunds: [...new Set(refunds)],
    deducts: [...new Set(deducts)],
  };
};
