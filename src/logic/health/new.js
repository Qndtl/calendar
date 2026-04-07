// 신규 건강보험 공제 로직
import { getMonthKey, isFirstDayOfMonth } from "@/logic/utils";

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

// 신규 건강보험 환급 로직 (구현 예정)
export const calculateHealthInsuranceRefund = (groupedDates, workYear, targetMonth, deductibles, companyId) => {
  console.log(`%c[신규] 건강보험 건설사${companyId} 환급 대상 체크`, 'color: #00aaff');
  return [];
};
