import { useState, useMemo } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import { formatSchedule } from '../../lib/utils';
import { WeeklySchedule } from './WeeklySchedule';
import ConfirmationModal from './ConfirmationModal';

/**
 * 강좌 수에 따른 추가 금액 계산
 * 3개 이하: 0원
 * 4~6개: 10만원
 * 7~9개: 20만원
 * 10개 이상: 30만원
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

export default function CartSidebar({ cart, enrolledCourses = [], onRemove, onSubmit, studentName, loading }) {
  const [showModal, setShowModal] = useState(false);
  
  const extraFee = useMemo(() => calculateExtraFee(cart.length), [cart.length]);

  const handleSubmitClick = () => {
    setShowModal(true);
  };

  const handleConfirm = async () => {
    await onSubmit();
    setShowModal(false);
  };

  return (
    <>
      <div className="h-fit sticky top-24 space-y-6">
        {/* Cart List */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center justify-between">
            신청 내역
            <span className="bg-[#00b6b2]/10 text-[#00b6b2] text-xs px-2 py-1 rounded-full">
              {cart.length}개
            </span>
          </h2>

          {cart.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-sm text-slate-500">신청한 강좌가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {cart.map((course) => (
                <div 
                  key={course.id} 
                  className="group flex items-start justify-between p-3 bg-slate-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{course.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatSchedule(course.day, course.startPeriod, course.endPeriod)}
                    </p>
                  </div>
                  <button 
                    onClick={() => onRemove(course.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">총 강좌 수</span>
              <span className="font-medium text-slate-900">{cart.length} 과목</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">추가 금액</span>
              <span className={`font-bold ${extraFee > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                {extraFee > 0 ? `+${formatCurrency(extraFee)}` : '없음'}
              </span>
            </div>
            {extraFee > 0 && (
              <div className="flex items-start gap-2 mt-2 p-2 bg-orange-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-700">
                  4과목 이상 신청 시 추가 금액이 발생합니다.
                </p>
              </div>
            )}
          </div>

          <button 
            onClick={handleSubmitClick}
            disabled={cart.length === 0 || loading}
            className="w-full mt-6 bg-[#00b6b2] hover:bg-[#009da0] text-white py-3 rounded-xl font-semibold shadow-lg shadow-[#00b6b2]/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '처리 중...' : '신청 제출하기'}
          </button>
        </div>

        {/* Real-time Schedule Preview */}
        <WeeklySchedule 
          enrolledCourses={enrolledCourses} 
          cartCourses={cart} 
        />
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
        cart={cart}
        studentName={studentName}
        loading={loading}
      />
    </>
  );
}
