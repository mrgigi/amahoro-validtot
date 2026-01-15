import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const REPORT_REASONS = [
  'Harassment or Bullying',
  'Hate Speech',
  'Violence/Threats',
  'Self-Harm/Suicide',
  'Nudity or Sexual Content',
  'Spam or Scams',
  'Intellectual Property Infringement',
  'Impersonation',
  'Privacy Violation',
  'Graphic Content/Gore',
  'Illegal Activity',
  'Other'
];

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => Promise<void> | void;
  itemType: string;
};

function ReportModal({ isOpen, onClose, onSubmit, itemType }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;

    setIsSubmitting(true);
    await onSubmit(selectedReason, details);
    setIsSubmitting(false);
    setSelectedReason('');
    setDetails('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-lg bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h2 className="text-2xl font-black">REPORT {itemType.toUpperCase()}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-red-500 text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-lg font-black mb-3">SELECT A REASON</label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`block p-3 border-4 border-black cursor-pointer transition-all ${
                      selectedReason === reason
                        ? 'bg-[#FF006E] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="hidden"
                    />
                    <span className="font-bold">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-lg font-black mb-2">ADDITIONAL DETAILS (optional)</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide more context..."
                maxLength={500}
                className="w-full p-3 border-4 border-black font-medium bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] resize-none"
                rows={4}
              />
              <div className="text-xs text-gray-400 font-bold mt-1">
                {details.length}/500
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 p-4 bg-white border-4 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={!selectedReason || isSubmitting}
                className="flex-1 p-4 bg-[#FF006E] text-white border-4 border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'SUBMITTING...' : 'SUBMIT REPORT'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;
