import { useState, useEffect } from 'react';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { subscribeToPendingEnrollments, approveEnrollment, rejectEnrollment, batchApproveEnrollments } from '../../lib/enrollmentService';
import { getCourse } from '../../lib/courseService';
import { getStudent } from '../../lib/studentService';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../lib/utils';
import LoadingSpinner from '../common/LoadingSpinner';

export default function EnrollmentRequests() {
  const { admin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [enrichedRequests, setEnrichedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [rejectModal, setRejectModal] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Subscribe to pending enrollments
  useEffect(() => {
    const unsubscribe = subscribeToPendingEnrollments((data) => {
      setRequests(data);
    });

    return () => unsubscribe();
  }, []);

  // Enrich requests with course and student data
  useEffect(() => {
    const enrichRequests = async () => {
      if (requests.length === 0) {
        setEnrichedRequests([]);
        setLoading(false);
        return;
      }

      try {
        const enriched = await Promise.all(
          requests.map(async (request) => {
            const [course, student] = await Promise.all([
              getCourse(request.courseId),
              getStudent(request.studentId),
            ]);
            return {
              ...request,
              course,
              student,
            };
          })
        );
        setEnrichedRequests(enriched);
      } catch (error) {
        console.error('Failed to enrich requests:', error);
      } finally {
        setLoading(false);
      }
    };

    enrichRequests();
  }, [requests]);

  const handleApprove = async (enrollmentId) => {
    setProcessing(prev => ({ ...prev, [enrollmentId]: true }));
    try {
      await approveEnrollment(enrollmentId, admin.uid);
    } catch (error) {
      console.error('Approve failed:', error);
      alert('승인에 실패했습니다.');
    } finally {
      setProcessing(prev => ({ ...prev, [enrollmentId]: false }));
    }
  };

  const handleReject = async (enrollmentId, reason) => {
    setProcessing(prev => ({ ...prev, [enrollmentId]: true }));
    try {
      await rejectEnrollment(enrollmentId, admin.uid, reason);
      setRejectModal(null);
    } catch (error) {
      console.error('Reject failed:', error);
      alert('반려에 실패했습니다.');
    } finally {
      setProcessing(prev => ({ ...prev, [enrollmentId]: false }));
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) {
      alert('선택된 항목이 없습니다.');
      return;
    }

    if (!confirm(`${selectedIds.length}건을 일괄 승인하시겠습니까?`)) {
      return;
    }

    try {
      await batchApproveEnrollments(selectedIds, admin.uid);
      setSelectedIds([]);
    } catch (error) {
      console.error('Batch approve failed:', error);
      alert('일괄 승인에 실패했습니다.');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === enrichedRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(enrichedRequests.map(r => r.id));
    }
  };

  if (loading) {
    return <LoadingSpinner message="신청 목록 로딩 중..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-6 h-6 text-yellow-600" />
          수강신청 관리
          {enrichedRequests.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-sm rounded-full">
              {enrichedRequests.length}건 대기
            </span>
          )}
        </h1>
        {selectedIds.length > 0 && (
          <button
            onClick={handleBatchApprove}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            <Check className="w-4 h-4" />
            {selectedIds.length}건 일괄 승인
          </button>
        )}
      </div>

      {enrichedRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">대기 중인 신청이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-500 text-sm">
              <tr>
                <th className="p-4 w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === enrichedRequests.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-[#00b6b2] focus:ring-[#00b6b2]"
                  />
                </th>
                <th className="text-left p-4 font-medium">학생</th>
                <th className="text-left p-4 font-medium">강좌</th>
                <th className="text-left p-4 font-medium">신청일시</th>
                <th className="text-right p-4 font-medium">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {enrichedRequests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50/50">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(request.id)}
                      onChange={() => toggleSelect(request.id)}
                      className="w-4 h-4 rounded border-slate-300 text-[#00b6b2] focus:ring-[#00b6b2]"
                    />
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-900">
                      {request.student?.name || request.studentId}
                    </div>
                    <div className="text-xs text-slate-500">
                      {request.student?.phone && `***-****-${request.student.phone}`}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-900">
                      {request.course?.title || request.courseId}
                    </div>
                    <div className="text-xs text-slate-500">
                      {request.course?.instructor} | {request.course?.room}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {formatDateTime(request.enrolledAt)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={processing[request.id]}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        승인
                      </button>
                      <button
                        onClick={() => setRejectModal(request)}
                        disabled={processing[request.id]}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        반려
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <RejectModal
          request={rejectModal}
          onClose={() => setRejectModal(null)}
          onConfirm={(reason) => handleReject(rejectModal.id, reason)}
          loading={processing[rejectModal.id]}
        />
      )}
    </div>
  );
}

function RejectModal({ request, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('반려 사유를 입력해주세요.');
      return;
    }
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">신청 반려</h2>
            <p className="text-sm text-slate-500">
              {request.student?.name}님의 "{request.course?.title}" 신청
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              반려 사유 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 h-32 resize-none"
              placeholder="학생에게 전달될 반려 사유를 입력하세요..."
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? '처리 중...' : '반려하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
