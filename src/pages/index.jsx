import React from 'react';
import { Navigate } from 'react-router-dom';

export default function Pages() {
  return <Navigate to="/home" replace />;
}