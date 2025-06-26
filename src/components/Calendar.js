"use client"
import '../app/Calendar.css';
import { useEffect, useState, useCallback } from "react";

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const CLICK_THRESHOLD = 5;

const Calendar = ({
                    deductibles,
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
    mouseDownPos: null
  });
  const [selfDates, setSelfDates] = useState(new Set());

  // 현재 월의 선택된 날짜들만 필터링
  useEffect(() => {
    const filtered = new Set();
    const prefix = `${year}-${month.toString().padStart(2, '0')}-`;

    totalSelectedDates.forEach(dateStr => {
      if (dateStr.startsWith(prefix)) {
        filtered.add(dateStr);
      }
    });

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

  // 드래그 시작
  const handleMouseDown = useCallback((day, e) => {
    if (!day) return;

    const key = getDateKey(day);
    const isAlreadySelected = totalSelectedDates.has(key);

    setDragState({
      start: day,
      end: day,
      isDragging: true,
      isRemoving: isAlreadySelected,
      mouseDownPos: { x: e.clientX, y: e.clientY }
    });
  }, [getDateKey, totalSelectedDates]);

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
    const { start, end, mouseDownPos, isRemoving } = dragState;

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

    if (!hasMoved && start === end) {
      // 단순 클릭
      const key = getDateKey(start);
      setTotalDates(prev => {
        const newSet = new Set(prev);
        newSet.has(key) ? newSet.delete(key) : newSet.add(key);
        return newSet;
      });
    } else {
      // 드래그 범위 선택
      setTotalDates(prev => {
        const newSet = new Set(prev);
        for (let i = rangeStart; i <= rangeEnd; i++) {
          const key = getDateKey(i);
          isRemoving ? newSet.delete(key) : newSet.add(key);
        }
        return newSet;
      });
    }

    // 드래그 상태 초기화
    setDragState({
      start: null,
      end: null,
      isDragging: false,
      isRemoving: false,
      mouseDownPos: null
    });
  }, [dragState, getDateKey, setTotalDates]);

  // 드래그 취소
  const handleMouseLeave = useCallback(() => {
    setDragState(prev => ({ ...prev, isDragging: false }));
  }, []);

  // 셀 스타일 계산
  const getCellStyle = useCallback((date) => {
    if (!date) return {};

    const key = getDateKey(date);
    const isEight = deductibles?.eight.includes(key);
    const isOverEight = deductibles?.over.includes(key);

    if (isEight) return { backgroundColor: 'black', color: 'white' };
    if (isOverEight) return { backgroundColor: 'grey', color: 'white' };

    return {};
  }, [getDateKey, deductibles]);

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
    >
      <h2
        className="calendar-title"
        style={currentMonth === month ? { backgroundColor: 'yellow' } : null}
      >
        {year}년 {month}월 - 출역 {selfDates.size}회
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
          const isSelected = totalSelectedDates.has(key);
          const cellStyle = getCellStyle(date);

          return (
            <div
              key={idx}
              className={`calendar-cell ${getDayClassName(dayOfWeek)} ${isSelected ? 'selected' : ''}`}
              onMouseDown={(e) => handleMouseDown(date, e)}
              onMouseEnter={() => handleMouseEnter(date)}
              style={{
                userSelect: 'none',
                cursor: date ? 'pointer' : 'default',
                ...cellStyle
              }}
            >
              {date || ''}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;