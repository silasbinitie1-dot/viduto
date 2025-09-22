
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User } from "@/api/entities";
import { Footer } from "../components/Footer";
import { AuthModal } from "../components/AuthModal";
import { MobileMenu } from "../components/MobileMenu";
import Logo from "@/components/Logo";
import ReactMarkdown from "react-markdown";
import { getBlogPosts } from "@/api/functions";
import { Loader2 } from "lucide-react";

export default function BlogPost() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const u = await User.me();
        setUser(u);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const { data } = await getBlogPosts({});
        setPosts(data?.posts || []);
      } catch (error) {
        // Fallback to local data if backend call fails
        console.error("Failed to fetch blog posts from backend, falling back to local data:", error);
        const { postsData } = await import("../components/blog/postsData");
        setPosts(postsData);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get("slug");

  const post = useMemo(() => (posts || []).find((p) => p.slug === slug), [slug, posts]);

  const handleAuthRequired = () => {
    if (!user) setShowAuthModal(true);
    else navigate("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="fixed top-0 inset-x-0 z-50">
          <div className="max-w-5xl mx-2 md:mx-auto p-2 px-4 mt-2 bg-white/70 backdrop-blur-md rounded-xl flex items-center justify-between shadow-sm">
            <Link to="/home" className="flex items-center gap-2">
              <Logo size={20} className="w-6 h-6 md:w-8 md:h-8" />
              <span className="text-2xl font-light text-gray-900 tracking-tight hover:text-gray-700 transition-colors">
                Viduto
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link to="/features" className="text-gray-700 hover:text-black transition-colors font-normal">Features</Link>
              <a href="https://discord.gg/MdBr54xe" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-black transition-colors font-normal">Community</a>
              <Link to="/pricing" className="text-gray-700 hover:text-black transition-colors font-normal">Pricing</Link>
              <Link to="/blog" className="text-gray-700 hover:text-black transition-colors font-normal">Blog</Link>
            </nav>
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <Button asChild className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button onClick={handleAuthRequired} className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                  Get Started
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 md:hidden">
              {user ? (
                <Button asChild className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button onClick={handleAuthRequired} className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                  Get Started</Button>
              )}
              <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} user={user} handleAuthRequired={handleAuthRequired} />
            </div>
          </div>
        </header>

        <main className="pt-40 pb-20 max-w-3xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-base">Loading article...</span>
          </div>
        </main>

        <Footer />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="fixed top-0 inset-x-0 z-50">
          <div className="max-w-5xl mx-2 md:mx-auto p-2 px-4 mt-2 bg-white/70 backdrop-blur-md rounded-xl flex items-center justify-between shadow-sm">
            <Link to="/home" className="flex items-center gap-2">
              <Logo size={20} className="w-6 h-6 md:w-8 md:h-8" />
              <span className="text-2xl font-light text-gray-900 tracking-tight hover:text-gray-700 transition-colors">
                Viduto
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link to="/features" className="text-gray-700 hover:text-black transition-colors font-normal">Features</Link>
              <a href="https://discord.gg/MdBr54xe" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-black transition-colors font-normal">Community</a>
              <Link to="/pricing" className="text-gray-700 hover:text-black transition-colors font-normal">Pricing</Link>
              <Link to="/blog" className="text-gray-700 hover:text-black transition-colors font-normal">Blog</Link>
            </nav>
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <Button asChild className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button onClick={handleAuthRequired} className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                  Get Started
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 md:hidden">
              {user ? (
                <Button asChild className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button onClick={handleAuthRequired} className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                  Get Started</Button>
              )}
              <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} user={user} handleAuthRequired={handleAuthRequired} />
            </div>
          </div>
        </header>

        <main className="pt-40 pb-20 max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-light text-gray-900">Post not found</h1>
          <p className="text-gray-600 mt-2">The article you're looking for doesn't exist.</p>
          <div className="mt-6">
            <Link to="/blog" className="text-orange-600 hover:underline">Back to Blog</Link>
          </div>
        </main>

        <Footer />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="max-w-5xl mx-2 md:mx-auto p-2 px-4 mt-2 bg-white/70 backdrop-blur-md rounded-xl flex items-center justify-between shadow-sm">
          <Link to="/home" className="flex items-center gap-2">
            <Logo size={20} className="w-6 h-6 md:w-8 md:h-8" />
            <span className="text-2xl font-light text-gray-900 tracking-tight hover:text-gray-700 transition-colors">
              Viduto
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-4">
            <Link to="/features" className="text-gray-700 hover:text-black transition-colors font-normal">Features</Link>
            <a href="https://discord.gg/MdBr54xe" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-black transition-colors font-normal">Community</a>
            <Link to="/pricing" className="text-gray-700 hover:text-black transition-colors font-normal">Pricing</Link>
            <Link to="/blog" className="text-gray-700 hover:text-black transition-colors font-normal">Blog</Link>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Button asChild className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button onClick={handleAuthRequired} className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                Get Started
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {user ? (
              <Button asChild className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button onClick={handleAuthRequired} className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                Get Started
              </Button>
            )}
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} user={user} handleAuthRequired={handleAuthRequired} />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 bg-gradient-to-br from-blue-100 via-purple-100 to-orange-100 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-light text-gray-900 leading-tight tracking-tight max-w-4xl mx-auto break-words">
            {post?.title}
          </h1>
          {post?.meta_description && (
            <p className="mt-4 text-lg md:text-xl text-gray-700 max-w-3xl mx-auto font-light">
              {post.meta_description}
            </p>
          )}
        </div>
      </section>

      {/* Article Content */}
      <section className="pt-14 pb-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          {post?.cover_image_url && (
            <div className="rounded-2xl overflow-hidden border border-gray-200 mb-10">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="w-full h-auto object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?q=80&w=1600&auto=format&fit=crop';
                }}
              />
            </div>
          )}

          {post?.content && (
            <div className="text-[19px] md:text-[21px] leading-8 md:leading-[34px] text-gray-800">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mt-12 mb-5">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-10 mb-4">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-6 md:mb-7">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 space-y-2 my-5">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 space-y-2 my-5">{children}</ol>
                  ),
                  li: ({ children }) => <li className="leading-7">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-orange-300 pl-4 italic text-gray-700 my-6">
                      {children}
                    </blockquote>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">{children}</strong>
                  ),
                  a: ({ children, ...props }) => (
                    <a {...props} className="text-orange-600 underline hover:text-orange-700" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                  code: ({ inline, children }) =>
                    inline ? (
                      <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">{children}</code>
                    ) : (
                      <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto my-6">
                        <code>{children}</code>
                      </pre>
                    ),
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </section>

      {/* Gradient CTA */}
      <section className="bg-gradient-to-br from-blue-500 to-purple-500 py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-light text-black mb-6 leading-tight">
            Ready to turn your ideas into videos?
          </h2>
          <p className="text-lg text-black/80 max-w-2xl mx-auto mb-8 font-light">
            Join thousands of businesses creating viral videos with Viduto in minutes.
          </p>
          <Button asChild size="lg" className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-full font-normal hover:bg-gray-800 transform hover:scale-105 transition-all duration-200 shadow-lg">
            <Link to="/home">Start for free</Link>
          </Button>
        </div>
      </section>

      <Footer />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
