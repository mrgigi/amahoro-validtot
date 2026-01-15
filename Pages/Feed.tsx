import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../src/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import PostCard from '../Components/PostCard';
import SearchFilters from '../Components/SearchFilters';
import { Plus, Loader, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../src/lib/utils';

export default function Feed() {
  const containerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [showSearch, setShowSearch] = useState(false);

  const { data: allPosts = [], isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }
      return data || [];
    }
  });

  // Handle deep linking to specific post
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('postId');
    
    if (postId && containerRef.current) {
      setTimeout(() => {
        const postElement = document.getElementById(`post-${postId}`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [allPosts]);

  // Filter out hidden posts
  const posts = allPosts.filter(post => !post.is_hidden);

  // Filter and sort posts
  const filteredPosts = posts
    .filter((post) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const titleMatch = post.title?.toLowerCase().includes(query);
      const optionsMatch = post.options?.some((opt) => opt.toLowerCase().includes(query));
      return titleMatch || optionsMatch;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') {
        return (b.total_votes || 0) - (a.total_votes || 0);
      }
      return 0; // Keep original order for 'recent'
    });

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0 });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F5F5F5]">
        <div className="text-center">
          <Loader className="w-16 h-16 animate-spin mx-auto mb-4" />
          <div className="text-2xl font-black">Loading...</div>
        </div>
      </div>
    );
  }

  const hasNoPosts = posts.length === 0;
  const noResults = !hasNoPosts && filteredPosts.length === 0;

  if (hasNoPosts) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F5F5F5] p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl font-black mb-4 transform -rotate-2">ValidToT</div>
          <div className="text-xl font-bold mb-8">No posts yet! Be the first to create one.</div>
          <Link
            to={createPageUrl('CreatePost')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#FF006E] text-white border-4 border-black font-black text-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
          >
            <Plus className="w-6 h-6" />
            CREATE POST
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[#F5F5F5]">
      {/* Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between p-2 bg-[#F5F5F5]">
        <Link 
          to={createPageUrl('Feed')}
          className="cursor-pointer"
        >
          <div className="text-xl font-black bg-[#FFFF00] px-3 py-1.5 border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transform -rotate-2 hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
            ValidToT
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2.5 bg-[#0066FF] text-white border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            <Search className="w-5 h-5" />
          </button>

          <Link
            to={createPageUrl('CreatePost')}
            className="p-2.5 bg-[#00FF00] border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Feed Container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Search Filters - toggleable */}
        {showSearch && (
          <div className="sticky top-14 z-10 max-w-2xl mx-auto px-4 pt-2">
            <SearchFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />
          </div>
        )}

        {noResults ? (
          <div className="h-screen flex items-center justify-center px-4">
            <div className="text-center max-w-md">
              <div className="text-4xl font-black mb-4">No Results</div>
              <p className="text-lg font-bold">Try a different search term</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-4 pt-16">
            {filteredPosts.map((post) => (
              <div key={post.id} id={`post-${post.id}`}>
                <PostCard post={post} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}