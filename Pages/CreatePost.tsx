import React, { useState } from 'react';
import { supabase } from '../src/supabaseClient';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Upload, X, Loader } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../src/lib/utils';
import { executeGhostProtocol } from '../Components/GhostProtocol';

export default function CreatePost() {
  const navigate = useNavigate();
  const [postType, setPostType] = useState('comparison');
  const [title, setTitle] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const { data, error } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (createdPost) => {
      // Execute Ghost Protocol if active
      await executeGhostProtocol(createdPost);
      navigate(createPageUrl('Feed'));
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    const maxImages = postType === 'single_review' ? 1 : 3;
    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} image${maxImages > 1 ? 's' : ''} allowed!`);
      return;
    }

    setUploading(true);
    const newImages: string[] = [];

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath);

        newImages.push(data.publicUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image');
      }
    }

    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);
    
    // Add default options for new images
    const newOptions = [...options];
    for (let i = options.length; i < updatedImages.length; i++) {
      newOptions.push(`Option ${String.fromCharCode(65 + i)}`);
    }
    setOptions(newOptions);
    
    setUploading(false);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (postType === 'comparison' && images.length < 2) {
      alert('Please add at least 2 images for comparison');
      return;
    }
    
    if (postType === 'single_review' && images.length < 1) {
      alert('Please add an image');
      return;
    }

    const postData: any = {
      type: postType,
      title: title || (postType === 'comparison' ? options.join(' or ') : 'Rate this'),
      images,
      comment_count: 0
    };

    if (postType === 'comparison') {
      postData.options = options;
      postData.votes = new Array(images.length).fill(0);
      postData.total_votes = 0;
    } else {
      postData.average_rating = 0;
      postData.rating_count = 0;
      postData.star_distribution = [0, 0, 0, 0, 0];
    }

    createPostMutation.mutate(postData);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to={createPageUrl('Feed')}
            className="p-3 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-4xl font-black transform -rotate-1">CREATE POST</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Post Type Selection */}
          <div>
            <label className="block text-xl font-black mb-3 transform -rotate-1">
              POST TYPE
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPostType('comparison');
                  setImages([]);
                  setOptions([]);
                }}
                className={`flex-1 p-4 border-4 border-black font-black text-lg transition-all ${
                  postType === 'comparison'
                    ? 'bg-[#FF006E] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                COMPARISON
                <div className="text-xs font-medium mt-1">2-3 images</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPostType('single_review');
                  setImages([]);
                  setOptions([]);
                }}
                className={`flex-1 p-4 border-4 border-black font-black text-lg transition-all ${
                  postType === 'single_review'
                    ? 'bg-[#FF006E] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                SINGLE REVIEW
                <div className="text-xs font-medium mt-1">1 image + stars</div>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xl font-black mb-2 transform -rotate-1">
              YOUR QUESTION (optional)
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What do you need opinions on?"
                maxLength={70}
                className="w-full p-4 border-4 border-black font-bold text-lg bg-white focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400 font-bold">
                {title.length}/70
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xl font-black mb-2 transform rotate-1">
              {postType === 'comparison' ? 'UPLOAD IMAGES (2-3)' : 'UPLOAD IMAGE (1)'}
            </label>
            <div className="space-y-4 mb-4">
              {images.map((img, index) => {
                const colors = ['#FF006E', '#0066FF', '#FFFF00'];
                const rotations = ['rotate-1', '-rotate-1', 'rotate-0'];
                
                return (
                  <div key={index} className="relative">
                    <div className="flex gap-4">
                      <div className="relative w-40 h-40 flex-shrink-0">
                        <img
                          src={img}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-full object-cover border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 p-2 bg-red-500 text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <X className="w-4 h-4" />
                          </button>
                          </div>

                          {postType === 'comparison' && (
                          <div className="flex-1">
                          <label 
                            className={`block text-lg font-black mb-2 text-white px-3 py-1 border-4 border-black inline-block transform ${rotations[index]}`}
                            style={{ backgroundColor: colors[index] }}
                          >
                            OPTION {String.fromCharCode(65 + index)}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={options[index] || ''}
                              onChange={(e) => updateOption(index, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + index)}`}
                              maxLength={15}
                              className="w-full p-4 border-4 border-black font-bold bg-white focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                            />
                            <div className="absolute bottom-2 right-2 text-xs text-gray-400 font-bold">
                              {(options[index] || '').length}/15
                            </div>
                          </div>
                          </div>
                          )}
                    </div>
                  </div>
                );
              })}
            </div>

            {images.length < 3 && (
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="w-full p-8 border-4 border-dashed border-black bg-white hover:bg-[#FFFF00] cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 font-bold">
                  {uploading ? (
                    <>
                      <Loader className="w-8 h-8 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8" />
                      <span>CLICK TO UPLOAD</span>
                    </>
                  )}
                </div>
              </label>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={createPostMutation.isPending || uploading}
            className="w-full p-6 bg-[#00FF00] border-4 border-black font-black text-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createPostMutation.isPending ? 'POSTING...' : 'POST IT!'}
          </button>
        </form>
      </div>
    </div>
  );
}