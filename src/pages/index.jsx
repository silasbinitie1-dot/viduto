import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Home from './home';
import Features from './features';
import Pricing from './pricing';
import Blog from './blog';
import BlogPost from './BlogPost';
import Dashboard from './dashboard';
import Terms from './terms';
import Privacy from './privacy';
import Enterprise from './enterprise';

export default function Pages() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={
        <Layout currentPageName="home">
          <Home />
        </Layout>
      } />
      <Route path="/features" element={
        <Layout currentPageName="features">
          <Features />
        </Layout>
      } />
      <Route path="/pricing" element={
        <Layout currentPageName="pricing">
          <Pricing />
        </Layout>
      } />
      <Route path="/blog" element={
        <Layout currentPageName="blog">
          <Blog />
        </Layout>
      } />
      <Route path="/blogpost" element={
        <Layout currentPageName="blogpost">
          <BlogPost />
        </Layout>
      } />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/terms" element={
        <Layout currentPageName="terms">
          <Terms />
        </Layout>
      } />
      <Route path="/privacy" element={
        <Layout currentPageName="privacy">
          <Privacy />
        </Layout>
      } />
      <Route path="/enterprise" element={
        <Layout currentPageName="enterprise">
          <Enterprise />
        </Layout>
      } />
    </Routes>
  );
}