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

    // STEP 1: 현장 전월 출역 확인
    if (sitePrevMonth.length >= 1) {
      console.log(`현장${companyId} 전월 출역 있음 → STEP 3`);
      applyDeduction(siteCurrentMonth.length, billingCurrentDates, eightSet, overSet);
    } else {
      // STEP 2: 현장 당월 초일 출역 여부
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

  // STEP 4-6: 청구업체 체크 (현장 탈락 시)
  if (needsBillingCheck) {
    if (allPrevMonth.length >= 1) {
      console.log('청구업체 전월 출역 있음 → STEP 6');
      applyDeduction(billingCurrentDates.length, billingCurrentDates, eightSet, overSet);
    } else {
      // STEP 5: 청구업체 당월 초일 출역 여부
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

// 신규 국민연금 환급 로직
export const calculateStatePensionRefund = (groupedDates, workYear, targetMonth, wage, deductibles) => {
  console.log('%c[신규] 국민연금 환급 대상 체크 시작', 'color: #00aaff');

  const PENSION_THRESHOLD = 2200000;

  const sortByDate = (a, b) => a.workDate.localeCompare(b.workDate);

  const allFourMonthsAgo = (groupedDates[getMonthKey(workYear, targetMonth, -1)] || []).sort(sortByDate);
  const allThreeMonthsAgo = (groupedDates[getMonthKey(workYear, targetMonth, 0)] || []).sort(sortByDate);

  const allDeductDates = [...(deductibles.eight || []), ...(deductibles.over || [])];
  const billingHasDeduction = allDeductDates.length > 0;

  // 청구업체(전체) 기준
  const billingCurrentDates = allThreeMonthsAgo.map(i => i.workDate);
  const billingCurrentCount = billingCurrentDates.length;
  const billingCurrentWage = billingCurrentCount * wage;

  // 3개월 전월 키에서 년/월 추출 (isFirstDayOfMonth, isLastDayOfMonth에 사용)
  const threeMonthsAgoKey = getMonthKey(workYear, targetMonth, 0);
  const [tmYear, tmMonth] = threeMonthsAgoKey.split('-').map(Number);

  // 청구업체 3개월 전 초일/말일 출역 여부
  const billingWorkedOnFirst = billingCurrentDates.length > 0 &&
    isFirstDayOfMonth(billingCurrentDates[0], tmYear, tmMonth);
  const billingWorkedOnLast = billingCurrentDates.length > 0 &&
    isLastDayOfMonth(billingCurrentDates[billingCurrentDates.length - 1], tmYear, tmMonth);

  const refunds = [];
  const deducts = [];

  // STEP 11: 금액 비교 → 환급 or 징수 (별도 금액 계산 계층에서 처리)
  const handleStep11 = () => {
    console.log('%c[신규] STEP 11: 금액 비교 후 징수 or 환급', 'color: #FFA500');
  };

  // STEP 8-9: 청구업체 합산 출역/노임 확인
  const handleStep8 = () => {
    if (billingCurrentCount >= 8) {
      console.log('[신규] STEP 8: 청구업체 합산 출역 >= 8 → STEP 11');
      handleStep11();
      return;
    }
    console.log('[신규] STEP 8: 청구업체 합산 출역 < 8 → STEP 9');

    if (billingCurrentWage >= PENSION_THRESHOLD) {
      console.log('[신규] STEP 9: 청구업체 합산 노임 >= 220 → STEP 11');
      handleStep11();
      return;
    }
    console.log('[신규] STEP 9: 청구업체 합산 노임 < 220 → 공제 비대상 → 환급');
    if (billingHasDeduction) {
      refunds.push(...allDeductDates);
    }
  };

  // STEP 6-7: 청구업체 초일/말일 출역 확인
  const handleStep6 = () => {
    if (!billingWorkedOnFirst) {
      console.log('[신규] STEP 6: 청구업체 3개월 전 초일 미출역 → 공제 비대상 → 환급');
      if (billingHasDeduction) {
        refunds.push(...allDeductDates);
      }
      return;
    }
    console.log('[신규] STEP 6: 청구업체 3개월 전 초일 출역 → STEP 7');

    if (!billingWorkedOnLast) {
      console.log('[신규] STEP 7: 청구업체 3개월 전 말일 미출역 → 공제 비대상 → 환급');
      if (billingHasDeduction) {
        refunds.push(...allDeductDates);
      }
      return;
    }
    console.log('[신규] STEP 7: 청구업체 3개월 전 말일 출역 → STEP 8');
    handleStep8();
  };

  const companyIds = [...new Set(allThreeMonthsAgo.map(i => i.companyId))];

  if (companyIds.length === 0) {
    return { refunds: [], deducts: [] };
  }

  for (const companyId of companyIds) {
    const siteFourMonthsAgo = allFourMonthsAgo.filter(i => i.companyId === companyId);
    const siteCurrentMonth = allThreeMonthsAgo.filter(i => i.companyId === companyId);
    const siteCurrentWorkDates = siteCurrentMonth.map(i => i.workDate);
    const siteCurrentCount = siteCurrentMonth.length;
    const siteCurrentWage = siteCurrentCount * wage;

    // STEP 1: 현장 4개월 전 출역 >= 1 → 이전 flow와 동일
    if (siteFourMonthsAgo.length >= 1) {
      console.log(`[신규] STEP 1: 현장${companyId} 4개월 전 출역 있음 → 이전 flow와 동일`);
      if (siteCurrentCount >= 8) {
        console.log(`[신규] 이전 flow: 3개월 전 8일 이상 → STEP 11`);
        handleStep11();
      } else if (siteCurrentWage >= PENSION_THRESHOLD) {
        console.log(`[신규] 이전 flow: 3개월 전 노임 220 이상 → 징수`);
        const undeductedDates = siteCurrentWorkDates.filter(d => !allDeductDates.includes(d));
        deducts.push(...undeductedDates);
      } else {
        console.log(`[신규] 이전 flow: 3개월 전 출역/노임 미충족 → 환급`);
        if (billingHasDeduction) {
          refunds.push(...allDeductDates);
        }
      }
      continue;
    }

    console.log(`[신규] STEP 1: 현장${companyId} 4개월 전 출역 없음 → STEP 2`);

    // STEP 2: 현장 3개월 전 초일 출역 여부
    const siteWorkedOnFirst = siteCurrentWorkDates.length > 0 &&
      isFirstDayOfMonth(siteCurrentWorkDates[0], tmYear, tmMonth);

    if (!siteWorkedOnFirst) {
      console.log(`[신규] STEP 2: 현장${companyId} 3개월 전 초일 미출역 → STEP 6`);
      handleStep6();
      continue;
    }
    console.log(`[신규] STEP 2: 현장${companyId} 3개월 전 초일 출역 → STEP 3`);

    // STEP 3: 현장 3개월 전 말일 출역 여부
    const siteWorkedOnLast = siteCurrentWorkDates.length > 0 &&
      isLastDayOfMonth(siteCurrentWorkDates[siteCurrentWorkDates.length - 1], tmYear, tmMonth);

    if (!siteWorkedOnLast) {
      console.log(`[신규] STEP 3: 현장${companyId} 3개월 전 말일 미출역 → STEP 6`);
      handleStep6();
      continue;
    }
    console.log(`[신규] STEP 3: 현장${companyId} 3개월 전 말일 출역 → STEP 4`);

    // STEP 4: 현장 3개월 전 출역 수 >= 8
    if (siteCurrentCount >= 8) {
      console.log(`[신규] STEP 4: 현장${companyId} 출역 >= 8 → STEP 11`);
      handleStep11();
      continue;
    }
    console.log(`[신규] STEP 4: 현장${companyId} 출역 < 8 → STEP 5`);

    // STEP 5: 현장 3개월 전 노임 >= 220
    if (siteCurrentWage >= PENSION_THRESHOLD) {
      console.log(`[신규] STEP 5: 현장${companyId} 노임 >= 220 → STEP 11`);
      handleStep11();
      continue;
    }
    console.log(`[신규] STEP 5: 현장${companyId} 노임 < 220 → STEP 10`);

    // STEP 10: 청구업체 3개월 전 공제 값 = 1 (공제 이력 존재) 여부
    if (billingHasDeduction) {
      console.log(`[신규] STEP 10: 청구업체 공제 값 = 1 → 공제 비대상 → 환급`);
      refunds.push(...allDeductDates);
    } else {
      console.log(`[신규] STEP 10: 청구업체 공제 값 = 0 → STEP 8`);
      handleStep8();
    }
  }

  return {
    refunds: [...new Set(refunds)],
    deducts: [...new Set(deducts)],
  };
};
