"use client"
import '../app/Calendar.css';
import { useEffect, useState, useCallback } from "react";

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const CLICK_THRESHOLD = 5;

const Calendar = ({
                    deductibles,
                    secondDeductibles,
                    refundData = [],
                    secondRefundData = [],
                    stateDeductData = [],
                    title,
                    year,
                    month,
                    totalSelectedDates,
                    setTotalDates,
                    currentMonth,
                    shade = false
                  }) => {
  const [dragState, setDragState] = useState({
    start: null,
    end: null,
    isDragging: false,
    isRemoving: false,
    mouseDownPos: null,
    isRightClick: false
  });
  const [selfDates, setSelfDates] = useState([]);

  // 현재 월의 선택된 날짜들만 필터링
  useEffect(() => {
    const prefix = `${year}-${month.toString().padStart(2, '0')}-`;

    const filtered = totalSelectedDates.filter(({ companyId, workDate }) =>
      workDate.startsWith(prefix)
    );

    setSelfDates(filtered);
  }, [totalSelectedDates, year, month]);

  // 캘린더 매트릭스 생성
  const getCalendarMatrix = useCallback(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDate = new Date(year, month, 0).getDate();
    const startDay = firstDay.getDay();
    const dates = [];

    // 빈 칸 추가 (월 시작 전)
    for (let i = 0; i < startDay; i++) {
      dates.push(null);
    }

    // 실제 날짜 추가
    for (let i = 1; i <= lastDate; i++) {
      dates.push(i);
    }

    // 빈 칸 추가 (주 단위로 맞추기 위해)
    while (dates.length % 7 !== 0) {
      dates.push(null);
    }

    // 주 단위로 분할
    const weeks = [];
    for (let i = 0; i < dates.length; i += 7) {
      weeks.push(dates.slice(i, i + 7));
    }

    return weeks;
  }, [year, month]);

  // 날짜 키 생성
  const getDateKey = useCallback((day) => {
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }, [year, month]);

  // 날짜가 선택되어 있는지 확인
  const isDateSelected = useCallback((dateKey) => {
    return totalSelectedDates.some(({ companyId, workDate }) => workDate === dateKey);
  }, [totalSelectedDates]);

  // 선택된 날짜의 회사별 스타일
  const getSelectedStyle = useCallback((date) => {
    if (!date) return {};

    const key = getDateKey(date);
    const selectedItem = totalSelectedDates.find(({ workDate }) => workDate === key);

    if (selectedItem) {
      // companyId에 따른 다른 배경색 적용
      if (selectedItem.companyId === 2) {
        return {
          backgroundColor: '#dc3545', // 붉은색 배경
          color: 'white',
          fontWeight: 'bold'
        };
      }
    }

    return {};
  }, [getDateKey, totalSelectedDates]);

  // 드래그 시작
  const handleMouseDown = useCallback((day, e) => {
    if (!day) return;

    e.preventDefault(); // 우클릭 컨텍스트 메뉴 방지

    const key = getDateKey(day);
    const isAlreadySelected = isDateSelected(key);
    const isRightClick = e.button === 2; // 2는 우클릭

    setDragState({
      start: day,
      end: day,
      isDragging: true,
      isRemoving: isAlreadySelected,
      mouseDownPos: { x: e.clientX, y: e.clientY },
      isRightClick
    });
  }, [getDateKey, isDateSelected]);

  // 드래그 중
  const handleMouseEnter = useCallback((day) => {
    if (!day || !dragState.isDragging) return;

    setDragState(prev => ({
      ...prev,
      end: day
    }));
  }, [dragState.isDragging]);

  // 드래그 종료
  const handleMouseUp = useCallback((e) => {
    const { start, end, mouseDownPos, isRemoving, isRightClick } = dragState;

    if (!start || !end) {
      setDragState(prev => ({ ...prev, isDragging: false }));
      return;
    }

    // 클릭인지 드래그인지 판단
    const hasMoved = mouseDownPos && (
      Math.abs(e.clientX - mouseDownPos.x) > CLICK_THRESHOLD ||
      Math.abs(e.clientY - mouseDownPos.y) > CLICK_THRESHOLD
    );

    const rangeStart = Math.min(start, end);
    const rangeEnd = Math.max(start, end);
    const companyId = isRightClick ? 2 : 1; // 우클릭이면 companyId 2, 좌클릭이면 1

    if (!hasMoved && start === end) {
      // 단순 클릭
      const key = getDateKey(start);
      setTotalDates(prev => {
        const exists = prev.some(({ companyId, workDate }) => workDate === key);
        if (exists) {
          return prev.filter(({ companyId, workDate }) => workDate !== key);
        } else {
          return [...prev, { companyId, workDate: key }];
        }
      });
    } else {
      // 드래그 범위 선택
      setTotalDates(prev => {
        let newDates = [...prev];

        for (let i = rangeStart; i <= rangeEnd; i++) {
          const key = getDateKey(i);
          const existsIndex = newDates.findIndex(({ companyId, workDate }) => workDate === key);

          if (isRemoving) {
            if (existsIndex !== -1) {
              newDates.splice(existsIndex, 1);
            }
          } else {
            if (existsIndex === -1) {
              newDates.push({ companyId, workDate: key });
            }
          }
        }

        return newDates;
      });
    }

    // 드래그 상태 초기화
    setDragState({
      start: null,
      end: null,
      isDragging: false,
      isRemoving: false,
      mouseDownPos: null,
      isRightClick: false
    });
  }, [dragState, getDateKey, setTotalDates]);

  // 우클릭 컨텍스트 메뉴 방지
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  // 드래그 취소
  const handleMouseLeave = useCallback(() => {
    setDragState(prev => ({ ...prev, isDragging: false }));
  }, []);

  // 셀 스타일 계산 (기존 공제/환급 스타일 우선 적용)
  const getCellStyle = useCallback((date) => {
    if (!date) return {};

    const key = getDateKey(date);
    const isEight = deductibles?.eight.includes(key);
    const isSecondEight = secondDeductibles?.eight.includes(key);
    const isOverEight = deductibles?.over.includes(key);
    const isSecondOverEight = secondDeductibles?.over.includes(key);

    // 공제/환급 스타일이 있으면 우선 적용
    if (isEight) return {
      backgroundColor: 'black',
      color: 'white',
      fontWeight: 'bold',
      boxShadow: title === '국민' ? '' : 'inset 0 0 0 6px #4a90e2'
    };
    if (isOverEight) return {
      backgroundColor: 'grey',
      color: 'white',
      fontWeight: 'bold',
      boxShadow: title === '국민' ? '' : 'inset 0 0 0 6px #4a90e2'
    };
    if (isSecondEight) return {
      backgroundColor: 'black',
      color: 'white',
      fontWeight: 'bold',
      boxShadow: title === '국민' ? '' : 'inset 0 0 0 6px #dc3545'
    };
    if (isSecondOverEight) return {
      backgroundColor: 'grey',
      color: 'white',
      fontWeight: 'bold',
      boxShadow: title === '국민' ? '' : 'inset 0 0 0 6px #dc3545'
    };


    // 그렇지 않으면 회사별 선택 스타일 적용
    return getSelectedStyle(date);
  }, [getDateKey, deductibles, secondDeductibles, getSelectedStyle, title]);

  // 요일별 클래스명 생성
  const getDayClassName = useCallback((dayIndex) => {
    if (dayIndex === 0) return 'sunday';
    if (dayIndex === 6) return 'saturday';
    return 'normal';
  }, []);

  const calendarMatrix = getCalendarMatrix();

  return (
    <div
      className={`calendar-container ${shade ? 'calendar-shade' : ''}`}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
    >
      <h2
        className="calendar-title"
        style={currentMonth === month ? { backgroundColor: 'yellow' } : null}
      >
        {year}년 {month}월 - 출역 {selfDates.length}회
      </h2>

      {/* 요일 헤더 */}
      <div className="calendar-grid calendar-header">
        {DAYS_OF_WEEK.map((day, idx) => (
          <div
            key={idx}
            className={`calendar-day ${getDayClassName(idx)}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 캘린더 본체 */}
      <div className="calendar-grid">
        {calendarMatrix.flat().map((date, idx) => {
          const dayOfWeek = idx % 7;
          const key = date ? getDateKey(date) : '';
          const isSelected = isDateSelected(key);
          const isRefund = refundData.includes(key);
          const isSecondRefund = secondRefundData.includes(key);
          const isStateDeduct = stateDeductData.includes(key);
          const cellStyle = getCellStyle(date);

          // companyId 2인 경우는 selected 클래스를 적용하지 않음 (붉은색 배경 우선)
          const selectedItem = date ? totalSelectedDates.find(({ workDate }) => workDate === key) : null;
          const shouldApplySelectedClass = isSelected && (!selectedItem || selectedItem.companyId !== 2);

          return (
            <div
              key={idx}
              className={`calendar-cell ${getDayClassName(dayOfWeek)} ${shouldApplySelectedClass ? 'selected' : ''}`}
              onMouseDown={(e) => handleMouseDown(date, e)}
              onMouseEnter={() => handleMouseEnter(date)}
              onContextMenu={handleContextMenu}
              style={{
                userSelect: 'none',
                cursor: date ? 'pointer' : 'default',
                position: 'relative',
                ...cellStyle
              }}
            >
              {date || ''}
              {(isRefund || isSecondRefund) && (
                <div className="refund-indicator"></div>
              )}
              {isStateDeduct && (
                <div className="deduct-indicator"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;