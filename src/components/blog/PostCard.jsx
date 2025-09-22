
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock } from "lucide-react";

export default function PostCard({ post }) {
  const fallback = 'https://images.unsplash.com/photo-1517022812141-23620dba5c23?q=80&w=1600&auto=format&fit=crop';
  return (
    <Link
      to={createPageUrl(`BlogPost?slug=${encodeURIComponent(post.slug)}`)}
      className="group block bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-300"
    >
      {post.cover_image_url && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.onerror = null; // Prevents infinite loop if fallback also fails
              e.currentTarget.src = fallback;
            }}
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span>{new Date(post.published_at).toLocaleDateString()}</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {post.reading_time}
          </span>
        </div>
        <h3 className="text-lg font-normal text-gray-900 mb-2 line-clamp-2">{post.title}</h3>
        <p className="text-gray-600 text-sm font-light line-clamp-3">{post.excerpt}</p>
        {/* Removed tag chips per request */}
      </div>
    </Link>
  );
}
