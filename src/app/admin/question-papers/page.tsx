'use client';

import { useState, useEffect } from 'react';

type QuestionPaperRequest = {
  id: string;
  subject: string;
  examName: string;
  status: string;
  fileUrl: string | null;
  notes: string | null;
  feedback: string | null;
  createdAt: string;
  teacher: {
    user: {
      email: string;
    };
  };
};

export default function AdminQuestionPapersPage() {
  const [requests, setRequests] = useState<QuestionPaperRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/question-papers?role=admin', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching question papers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/question-papers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          feedback: feedbackMap[id] || null 
        }),
      });
      
      if (res.ok) {
        alert(`Request marked as ${status}`);
        fetchRequests();
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      alert('An error occurred');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Question Paper Approvals</h1>
        <p className="text-gray-500 dark:text-gray-400">Review and approve exam papers submitted by teachers.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No question papers require approval at this time.</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {requests.map((request) => (
              <div key={request.id} className="p-6 flex flex-col lg:flex-row justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {request.subject} <span className="text-gray-400 font-normal mx-2">|</span> {request.examName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Submitted by: <span className="font-semibold text-gray-800 dark:text-gray-200">{request.teacher.user.email}</span> on {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                      request.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                      request.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                      'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>

                  {request.notes && (
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                      <p className="text-sm text-gray-800 dark:text-gray-300"><span className="font-semibold">Teacher Notes:</span> {request.notes}</p>
                    </div>
                  )}

                  {request.fileUrl && (
                    <div>
                      <a 
                        href={request.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        View Question Paper Document
                      </a>
                    </div>
                  )}
                </div>

                <div className="lg:w-80 space-y-4 bg-gray-50 dark:bg-gray-750 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wider">Admin Actions</h4>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Provide Feedback (Optional)</label>
                    <textarea
                      placeholder="Add reason for rejection or approval notes..."
                      rows={2}
                      value={feedbackMap[request.id] || ''}
                      onChange={(e) => setFeedbackMap({ ...feedbackMap, [request.id]: e.target.value })}
                      className="w-full text-sm px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(request.id, 'APPROVED')}
                      disabled={request.status === 'APPROVED'}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-1.5 px-3 rounded-md text-sm font-medium transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(request.id, 'REJECTED')}
                      disabled={request.status === 'REJECTED'}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-1.5 px-3 rounded-md text-sm font-medium transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                  
                  {request.status !== 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(request.id, 'PENDING')}
                      className="w-full text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                    >
                      Reset to Pending
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
