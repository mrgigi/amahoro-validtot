import React, { useState } from 'react';
import { Check } from 'lucide-react';

type VoteInterfaceProps = {
  post: any;
  onVote: (index: number) => Promise<any> | void;
  hasVoted: boolean;
  userVote: number | null;
};

function VoteInterface({ post, onVote, hasVoted, userVote }: VoteInterfaceProps) {
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (index: number) => {
    const confirmed = window.confirm(
      "Are you sure? You can't change your vote after this."
    );
    if (!confirmed) {
      return;
    }
    setIsVoting(true);
    try {
      await onVote(index);
    } finally {
      setIsVoting(false);
    }
  };

  const colors = ['#FF006E', '#0066FF', '#FFFF00'];
  const textColors = ['text-white', 'text-white', 'text-black'];
  
  // Handle both old and new data formats
  const options = post.options || [];
  const votes = post.votes || [];

  if (hasVoted) {
    return (
      <div className="space-y-4">
        {options.map((option: string, index: number) => {
          const percent = post.total_votes > 0 
            ? Math.round((votes[index] / post.total_votes) * 100) 
            : 0;

          return (
            <div key={index} className="relative">
              <div 
                className="absolute inset-0 bg-black border-4 border-black opacity-20"
                style={{ width: `${percent}%` }} 
              />
              <button
                className={`relative w-full p-5 border-4 border-black font-black text-lg text-left shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
                  userVote === index ? textColors[index] : ''
                }`}
                style={userVote === index ? { backgroundColor: colors[index] } : { backgroundColor: 'white' }}
              >
                <div className="flex items-center justify-between">
                  <span className="break-words">{option}</span>
                  <span className="font-black text-2xl ml-2">{percent}%</span>
                </div>
                {userVote === index && (
                  <Check className="absolute top-3 right-3 w-6 h-6" />
                )}
              </button>
            </div>
          );
        })}

        <div className="text-center font-bold text-lg">
          {post.total_votes} vote{post.total_votes !== 1 ? 's' : ''}
        </div>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${options.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {options.map((option: string, index: number) => (
        <button
          key={index}
          onClick={() => handleVote(index)}
          disabled={isVoting}
          className={`p-5 border-4 border-black font-black text-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 break-words ${textColors[index]}`}
          style={{ backgroundColor: colors[index] }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default VoteInterface;
