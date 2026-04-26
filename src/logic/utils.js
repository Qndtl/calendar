export const formatFromDate = (date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDate = (year, month, day = null) => {
  const monthStr = month.toString().padStart(2, '0');
  return day ? `${year}-${monthStr}-${day.toString().padStart(2, '0')}` : `${year}-${monthStr}`;
};

export const getMonthKey = (workYear, workMonth, monthOffset) => {
  const targetMonth = parseInt(workMonth) + monthOffset;

  if (targetMonth <= 0) {
    return formatDate(workYear - 1, 12 + targetMonth);
  } else if (targetMonth > 12) {
    return formatDate(workYear + 1, targetMonth - 12);
  }

  return formatDate(workYear, targetMonth);
};

export const isFirstDayOfMonth = (dateStr, workYear, month) => {
  return dateStr === `${formatDate(workYear, month)}-01`;
};

export const isLastDayOfMonth = (dateStr, workYear, month) => {
  const lastDayOfMonth = new Date(workYear, month, 0).getDate();
  return dateStr.endsWith(`-${lastDayOfMonth}`);
};

// 건강보험 특수일: 1월 30일 또는 31일 시작 → 기간이 다음 달로 넘어가는 엣지 케이스
export const isJanSpecialDate = (dateStr) =>
  dateStr?.endsWith('-01-30') || dateStr?.endsWith('-01-31');
