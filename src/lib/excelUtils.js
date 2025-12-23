import * as XLSX from 'xlsx';
import { DAYS } from '../constants';
import { formatSchedules } from './utils';

/**
 * 데이터를 엑셀 파일로 내보내기
 * @param {Array} data - 내보낼 데이터 배열
 * @param {Array} columns - 컬럼 정의 [{key: 'name', header: '이름'}, ...]
 * @param {string} filename - 파일명 (확장자 제외)
 * @param {string} sheetName - 시트명
 */
export const exportToExcel = (data, columns, filename, sheetName = 'Sheet1') => {
  // 헤더와 데이터 준비
  const headers = columns.map(col => col.header);
  const rows = data.map(item => 
    columns.map(col => {
      const value = item[col.key];
      // 날짜 처리
      if (value && typeof value === 'object' && value.toDate) {
        return value.toDate().toLocaleString('ko-KR');
      }
      if (value instanceof Date) {
        return value.toLocaleString('ko-KR');
      }
      return value ?? '';
    })
  );

  // 워크시트 생성
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // 컬럼 너비 자동 조정
  const colWidths = columns.map((col, idx) => {
    const headerLen = col.header.length;
    const maxDataLen = Math.max(...rows.map(row => String(row[idx] || '').length));
    return { wch: Math.max(headerLen, maxDataLen, 10) + 2 };
  });
  ws['!cols'] = colWidths;

  // 워크북 생성 및 저장
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
};

/**
 * 강좌 데이터를 엑셀로 내보내기 (다중 시간대 지원)
 * @param {Array} courses - 강좌 배열
 * @param {string} filename - 파일명
 */
export const exportCoursesToExcel = (courses, filename) => {
  const columns = [
    { key: 'title', header: '강좌명' },
    { key: 'instructor', header: '강사' },
    { key: 'category', header: '카테고리' },
    { key: 'schedule', header: '시간표' },
    { key: 'room', header: '강의실' },
    { key: 'capacity', header: '정원' },
    { key: 'enrolled', header: '신청수' },
  ];
  
  const data = courses.map(c => ({
    ...c,
    schedule: c.schedules ? formatSchedules(c.schedules) : `${c.day} ${c.startPeriod}~${c.endPeriod}교시`
  }));
  
  exportToExcel(data, columns, filename);
};

/**
 * 엑셀 파일 파싱
 * @param {File} file - 엑셀 파일
 * @returns {Promise<Array>} 파싱된 데이터 배열
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 첫 번째 시트 가져오기
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // JSON으로 변환 (첫 행을 헤더로 사용)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          raw: false,
          defval: '' 
        });
        
        resolve(jsonData);
      } catch (error) {
        reject(new Error('엑셀 파일 파싱에 실패했습니다.'));
      }
    };
    
    reader.onerror = () => reject(new Error('파일을 읽는데 실패했습니다.'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 샘플 양식 다운로드
 * @param {Array} columns - 컬럼 정의 [{key: 'name', header: '이름', example: '홍길동'}, ...]
 * @param {string} filename - 파일명
 */
export const downloadTemplate = (columns, filename) => {
  const headers = columns.map(col => col.header);
  const exampleRow = columns.map(col => col.example || '');
  
  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  
  // 컬럼 너비 설정
  ws['!cols'] = columns.map(col => ({ wch: Math.max(col.header.length, 15) + 2 }));
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '양식');
  
  XLSX.writeFile(wb, `${filename}_양식.xlsx`);
};

/**
 * 강좌 등록용 양식 다운로드 (다중 시간대 지원)
 */
export const downloadCourseTemplate = () => {
  const headers = ['강좌명', '강사', '카테고리', '난이도', '시간표', '강의실', '정원', '설명'];
  const examples = [
    ['고등 수학 심화', '김선생', '수학', '고급', '화 1~2, 수 3~4', '301호', '20', '고등학교 수학 심화 과정'],
    ['영어 독해', '박선생', '영어', '중급', '월 5~6', '302호', '25', '수능 영어 독해 강의'],
    ['국어 논술', '이선생', '국어', '고급', '월 1~2, 금 1~2', '303호', '15', '논술 집중 강의'],
  ];
  
  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  
  // 컬럼 너비 설정
  ws['!cols'] = [
    { wch: 20 }, // 강좌명
    { wch: 10 }, // 강사
    { wch: 12 }, // 카테고리
    { wch: 8 },  // 난이도
    { wch: 20 }, // 시간표
    { wch: 10 }, // 강의실
    { wch: 6 },  // 정원
    { wch: 30 }, // 설명
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '강좌등록 양식');
  
  // 안내사항 시트 추가
  const infoData = [
    ['강좌 등록 양식 안내'],
    [''],
    ['카테고리 옵션:', '국어, 수학, 영어, 과탐, 사탐, 수리논술, 인문논술'],
    ['난이도 옵션:', '초급, 중급, 고급, 실전'],
    [''],
    ['시간표 형식:'],
    ['- 단일 시간대:', '화 1~2'],
    ['- 다중 시간대:', '화 1~2, 수 3~4'],
    ['- 같은 날 여러 시간:', '월 1~2, 월 5~6'],
    [''],
    ['요일:', '월, 화, 수, 목, 금, 토, 일'],
    ['교시:', '1~12'],
  ];
  
  const infoWs = XLSX.utils.aoa_to_sheet(infoData);
  infoWs['!cols'] = [{ wch: 20 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, infoWs, '안내');
  
  XLSX.writeFile(wb, '강좌등록_양식.xlsx');
};

/**
 * 엑셀 행에서 스케줄 정보 파싱 (다중 시간대 지원)
 * Supports formats:
 * - "화 1~2, 수 3~4" (시간표 column)
 * - Legacy: 요일 + 시작교시 + 종료교시 columns
 */
export const parseSchedulesFromExcel = (row) => {
  const schedules = [];
  
  // Try new format first (시간표 column)
  const scheduleStr = row['시간표'] || row['schedule'] || '';
  if (scheduleStr) {
    // Parse "화 1~2, 수 3~4" or "화 1-2 / 수 3-4" format
    const parts = scheduleStr.split(/[,\/]+/).map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      // Match patterns like "화 1~2" or "화 1-2" or "화1~2"
      const match = part.match(/([월화수목금토일])\s*(\d+)\s*[~\-]\s*(\d+)/);
      if (match) {
        schedules.push({
          day: match[1],
          startPeriod: parseInt(match[2]),
          endPeriod: parseInt(match[3]),
        });
      } else {
        // Try single period format "화 1"
        const singleMatch = part.match(/([월화수목금토일])\s*(\d+)/);
        if (singleMatch) {
          schedules.push({
            day: singleMatch[1],
            startPeriod: parseInt(singleMatch[2]),
            endPeriod: parseInt(singleMatch[2]),
          });
        }
      }
    }
  }
  
  // Fallback to legacy format if no schedules found
  if (schedules.length === 0) {
    const dayStr = String(row['요일'] || row['day'] || '').trim();
    const startPeriod = parseInt(row['시작교시'] || row['startPeriod'] || 1);
    const endPeriod = parseInt(row['종료교시'] || row['endPeriod'] || 2);
    
    if (dayStr) {
      // Handle "월/수" or "월,수" format - same periods for each day
      const days = dayStr.split(/[\/,]+/).map(d => d.trim()).filter(Boolean);
      for (const day of days) {
        if (DAYS.includes(day)) {
          schedules.push({
            day,
            startPeriod: startPeriod || 1,
            endPeriod: endPeriod || 2,
          });
        }
      }
    }
  }
  
  return schedules;
};

/**
 * 출석부 양식으로 내보내기 (번호, 반, 이름)
 * @param {Array} students - 학생 데이터 배열 [{name: '홍길동', class: ''}, ...]
 * @param {string} courseName - 강좌명
 */
export const exportAttendanceSheet = (students, courseName) => {
  const headers = ['번호', '반', '이름'];
  const rows = students.map((student, idx) => [
    idx + 1,
    student.class || '-',
    student.name
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // 컬럼 너비 설정
  ws['!cols'] = [
    { wch: 6 },  // 번호
    { wch: 10 }, // 반
    { wch: 15 }, // 이름
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '출석부');
  
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = courseName.replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(wb, `출석부_${safeName}_${dateStr}.xlsx`);
};

/**
 * 출석 데이터 내보내기 (특정 날짜)
 * @param {Array} data - 출석 데이터 배열 [{번호, 반, 이름, 날짜, 상태, 비고}, ...]
 * @param {string} courseName - 강좌명
 * @param {string} date - 날짜 (YYYY-MM-DD)
 */
export const exportAttendanceData = (data, courseName, date) => {
  const headers = ['번호', '반', '이름', '날짜', '상태', '비고'];
  const rows = data.map(item => [
    item.번호,
    item.반,
    item.이름,
    item.날짜,
    item.상태,
    item.비고 || ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // 컬럼 너비 설정
  ws['!cols'] = [
    { wch: 6 },  // 번호
    { wch: 10 }, // 반
    { wch: 15 }, // 이름
    { wch: 12 }, // 날짜
    { wch: 8 },  // 상태
    { wch: 30 }, // 비고
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '출석체크');
  
  const safeName = courseName.replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(wb, `출석_${safeName}_${date}.xlsx`);
};

/**
 * 전체 출석 기록 내보내기 (날짜별 컬럼)
 * @param {Array} students - 학생 목록 [{studentId, name, class}, ...]
 * @param {Array} dates - 날짜 목록 ['2024-01-01', '2024-01-02', ...]
 * @param {Object} attendanceMap - 출석 맵 { 'studentId_date': 'present' | 'absent' | ... }
 * @param {string} courseName - 강좌명
 */
export const exportFullAttendanceSheet = (students, dates, attendanceMap, courseName) => {
  const statusLabels = {
    present: '○',
    absent: '×',
    late: '△',
    excused: '◎',
  };

  // 헤더: 번호, 반, 이름, 날짜1, 날짜2, ...
  const headers = ['번호', '반', '이름', ...dates.map(d => {
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }), '출석률'];

  const rows = students.map((student, idx) => {
    let presentCount = 0;
    const dateStatuses = dates.map(date => {
      const key = `${student.studentId}_${date}`;
      const status = attendanceMap[key];
      if (status === 'present' || status === 'late' || status === 'excused') {
        presentCount++;
      }
      return statusLabels[status] || '-';
    });
    
    const rate = dates.length > 0 ? Math.round((presentCount / dates.length) * 100) : 0;
    
    return [
      idx + 1,
      student.class || '-',
      student.name,
      ...dateStatuses,
      `${rate}%`
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // 컬럼 너비 설정
  const colWidths = [
    { wch: 6 },  // 번호
    { wch: 10 }, // 반
    { wch: 15 }, // 이름
    ...dates.map(() => ({ wch: 6 })), // 날짜 컬럼들
    { wch: 8 },  // 출석률
  ];
  ws['!cols'] = colWidths;

  // 범례 시트 추가
  const legendData = [
    ['기호', '의미'],
    ['○', '출석'],
    ['×', '결석'],
    ['△', '지각'],
    ['◎', '사유'],
    ['-', '미체크'],
  ];
  const legendWs = XLSX.utils.aoa_to_sheet(legendData);
  legendWs['!cols'] = [{ wch: 8 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '출석현황');
  XLSX.utils.book_append_sheet(wb, legendWs, '범례');
  
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = courseName.replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(wb, `출석현황_${safeName}_${dateStr}.xlsx`);
};
