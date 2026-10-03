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
};

export default function TeacherQuestionPapersPage() {
  const [requests, setRequests] = useState<QuestionPaperRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [subject, setSubject] = useState('');
  const [examName, setExamName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/question-papers?role=teacher', { cache: 'no-store' });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let finalFileUrl = '';
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalFileUrl = uploadData.fileUrl;
        } else {
          alert('Failed to upload file');
          setIsSubmitting(false);
          return;
        }
      }

      const res = await fetch('/api/question-papers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject, examName, fileUrl: finalFileUrl, notes }),
      });
      
      if (res.ok) {
        // Reset form
        setSubject('');
        setExamName('');
        setFile(null);
        setNotes('');
        // Refresh list
        fetchRequests();
        alert('Question paper submitted successfully for approval!');
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('An error occurred while submitting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Question Paper Submissions</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Submit Form */}
        <div className="col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-100 dark:border-gray-700 h-fit">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Submit New Paper</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g. Mathematics"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exam Name</label>
              <input
                type="text"
                required
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g. Mid-Term 2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Document (Any Format)</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Any message for the admin..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </form>
        </div>

        {/* List of Submissions */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">My Submissions</h2>
          
          {loading ? (
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          ) : requests.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">You haven't submitted any question papers yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border dark:border-gray-700 rounded-lg p-4 flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{request.subject} - {request.examName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Submitted on {new Date(request.createdAt).toLocaleDateString()}</p>
                    
                    {request.notes && (
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">My Notes:</span> {request.notes}</p>
                    )}
                    
                    {request.feedback && (
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Admin Feedback:</span> {request.feedback}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end justify-between gap-2">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      request.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      request.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {request.status}
                    </span>
                    
                    {request.fileUrl && (
                      <a 
                        href={request.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                      >
                        View Document
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
