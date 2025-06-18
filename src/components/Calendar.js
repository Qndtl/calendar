"use client"
import '../app/Calendar.css';
import {useEffect, useMemo, useState} from "react"; // 별도 CSS 파일 불러오기

const days = ['일', '월', '화', '수', '목', '금', '토'];

const Calendar = ({ deductibles, year, month, totalSelectedDates, setTotalDates, currentMonth, shade = false }) => {
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const clickThreshold = 5;
  const [selfDates, setSelfDates] = useState(new Set)

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

  const getCalendarMatrix = () => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDate = new Date(year, month, 0).getDate();
    const startDay = firstDay.getDay();
    const dates = [];

    for (let i = 0; i < startDay; i++) dates.push(null);
    for (let i = 1; i <= lastDate; i++) dates.push(i);
    while (dates.length % 7 !== 0) dates.push(null);

    const weeks = [];
    for (let i = 0; i < dates.length; i += 7) {
      weeks.push(dates.slice(i, i + 7));
    }
    return weeks;
  };

  const calendar = getCalendarMatrix();
  const getKey = (day) =>
    `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  const handleMouseDown = (day, e) => {
    if (!day) return;
    const key = getKey(day);
    const alreadySelected = totalSelectedDates.has(key);

    setMouseDownPos({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
    setIsRemoving(alreadySelected);
    setDragStart(day);
    setDragEnd(day);
  };

  const handleMouseEnter = (day) => {
    if (!day || !isDragging) return;
    setDragEnd(day);
  };

  const handleMouseUp = (e) => {
    if (!dragStart || !dragEnd) {
      setIsDragging(false);
      return;
    }

    const moved =
      mouseDownPos &&
      (Math.abs(e.clientX - mouseDownPos.x) > clickThreshold ||
        Math.abs(e.clientY - mouseDownPos.y) > clickThreshold);

    const start = Math.min(dragStart, dragEnd);
    const end = Math.max(dragStart, dragEnd);

    if (!moved && dragStart === dragEnd) {
      const key = getKey(dragStart);
      setTotalDates(prev => {
        const newSet = new Set(prev);
        newSet.has(key) ? newSet.delete(key) : newSet.add(key);
        return newSet;
      });
    } else {
      setTotalDates(prev => {
        const newSet = new Set(prev);
        for (let i = start; i <= end; i++) {
          const key = getKey(i);
          isRemoving ? newSet.delete(key) : newSet.add(key);
        }
        return newSet;
      });
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setMouseDownPos(null);
  };

  return (
    <div
      className={`calendar-container ${shade ? 'calendar-shade' : ''}`}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsDragging(false)}
    >
      <h2 className="calendar-title" style={currentMonth === month ? {backgroundColor: 'yellow'} : null}>{year}년 {month}월</h2>
      <div className="calendar-grid calendar-header">
        {days.map((day, idx) => (
          <div
            key={idx}
            className={`calendar-day ${idx === 0 ? 'sunday' : idx === 6 ? 'saturday' : ''}`}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {calendar.flat().map((date, idx) => {
          const dayOfWeek = idx % 7;
          const className =
            dayOfWeek === 0
              ? 'sunday'
              : dayOfWeek === 6
                ? 'saturday'
                : 'normal';

          const key = date ? getKey(date) : '';
          const isSelected = totalSelectedDates.has(key);
          const isEight = deductibles?.eight.includes(key);
          const isOverEight = deductibles?.over.includes(key);
          return (
            <div
              key={idx}
              className={`calendar-cell ${className} ${isSelected ? 'selected' : ''}`}
              onMouseDown={(e) => handleMouseDown(date, e)}
              onMouseEnter={() => handleMouseEnter(date)}
              style={{ userSelect: 'none', backgroundColor: isEight ? 'black' : isOverEight ? 'grey' : null }}
            >
              {date || ''}
            </div>
          );
        })}
      </div>
      <div style={{marginTop: '10px'}}>{month}월 출역 수: {selfDates.size}</div>
    </div>
  );
};

export default Calendar;