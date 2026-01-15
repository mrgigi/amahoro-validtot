import React, { useState } from 'react';
import { Star } from 'lucide-react';

type StarRatingProps = {
  postId: string;
  currentRating: number;
  onVote: (rating: number) => void;
  hasVoted: boolean;
  userRating: number;
};

function StarRating({ postId, currentRating, onVote, hasVoted, userRating }: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleClick = (rating: number) => {
    if (!hasVoted) {
      onVote(rating);
    }
  };

  return (
    <div className="space-y-4">
      {/* Star Display */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = hasVoted 
            ? star <= userRating 
            : star <= (hoveredRating || 0);
          
          return (
            <button
              key={star}
              onClick={() => handleClick(star)}
              onMouseEnter={() => !hasVoted && setHoveredRating(star)}
              onMouseLeave={() => !hasVoted && setHoveredRating(0)}
              disabled={hasVoted}
              className={`transition-all ${hasVoted ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
            >
              <Star
                className={`w-12 h-12 ${
                  isActive
                    ? 'fill-[#FFFF00] stroke-black stroke-[3px]'
                    : 'fill-white stroke-black stroke-[3px]'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Rating Info */}
      <div className="text-center">
        <div className="text-3xl font-black">
          {currentRating > 0 ? currentRating.toFixed(1) : '0.0'}
        </div>
        <div className="text-sm font-bold text-gray-600">
          {hasVoted ? 'You rated this' : 'Rate this post'}
        </div>
      </div>
    </div>
  );
}

export default StarRating;
