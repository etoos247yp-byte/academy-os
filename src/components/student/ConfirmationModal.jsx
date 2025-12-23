import { X, AlertTriangle, FileText, Coins } from 'lucide-react';
import { formatSchedule } from '../../lib/utils';

/**
 * 강좌 수에 따른 추가 금액 계산
 */
const calculateExtraFee = (courseCount) => {
  if (courseCount <= 3) return 0;
  if (courseCount <= 6) return 100000;
  if (courseCount <= 9) return 200000;
  return 300000;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
};

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  cart, 
  studentName, 
  loading 
}) {
  if (!isOpen) return null;

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const extraFee = calculateExtraFee(cart.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00b6b2] rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">수강 신청서</h2>
                <p className="text-slate-400 text-sm">Enrollment Application</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Student Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs text-slate-500">학생명</span>
              <p className="font-semibold text-slate-900">{studentName}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">신청일</span>
              <p className="font-semibold text-slate-900">{today}</p>
            </div>
          </div>

          {/* Course List */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              신청 강좌 목록 ({cart.length}개)
            </h3>
            <div className="space-y-3">
              {cart.map((course, index) => (
                <div 
                  key={course.id}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-bold text-[#00b6b2] w-6">{index + 1}.</span>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{course.title}</p>
                      <p className="text-sm text-slate-500 mt-1">
                        {formatSchedule(course.day, course.startPeriod, course.endPeriod)}
                      </p>
                      <div className="flex gap-3 mt-1 text-xs text-slate-400">
                        <span>{course.room}</span>
                        <span>|</span>
                        <span>{course.instructor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extra Fee Notice */}
          {extraFee > 0 && (
            <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
              <div className="flex gap-3">
                <Coins className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-semibold mb-1">추가 금액 안내</p>
                  <p className="text-orange-700">
                    {cart.length}개 강좌 신청으로 <span className="font-bold text-orange-600">{formatCurrency(extraFee)}</span>의 추가 금액이 발생합니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning Notice */}
          <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">신청 후 관리자 승인이 필요합니다.</p>
                <p className="text-amber-700">
                  승인 전까지 '신청 대기' 상태로 표시됩니다.<br/>
                  승인이 완료되면 '수강 확정' 상태로 변경됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-white transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-[#00b6b2] text-white font-bold hover:bg-[#009da0] transition-colors shadow-lg shadow-[#00b6b2]/30 disabled:opacity-50"
          >
            {loading ? '처리 중...' : '신청서 제출하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
