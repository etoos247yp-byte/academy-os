import * as XLSX from 'xlsx';

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
