import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

export function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    console.log('Form submitted!', e);
    e.preventDefault();
    e.stopPropagation();
    
    // Validate form
    if (!formData.email || !formData.password) {
      console.error('Form validation failed - missing email or password');
      const errorMsg = 'Please fill in all fields';
      toast.error(errorMsg);
      alert(errorMsg); // Fallback if toast doesn't work
      setLoading(false);
      return;
    }
    
    console.log('Starting login process...');
    console.log('Form data:', { email: formData.email, password: '***' });
    setLoading(true);

    try {
      console.log('Attempting login with:', formData.email);
      console.log('API base URL:', window.location.origin + '/api');
      
      const response = await authAPI.login(formData);
      console.log('Login response:', response);
      console.log('Response data:', response.data);
      
      const { access_token, user } = response.data;
      
      // Verify response data
      if (!access_token || !user) {
        console.error('Invalid response - missing access_token or user');
        throw new Error('Invalid response from server');
      }
      
      console.log('Setting auth with user:', user.id, 'token:', access_token.substring(0, 20) + '...');
      
      // Set auth state - this updates both Zustand store and localStorage
      setAuth(user, access_token);
      
      // Verify it was set
      const verifyToken = localStorage.getItem('pos_token');
      const verifyUser = localStorage.getItem('pos_user');
      console.log('Auth set - token exists:', !!verifyToken, 'user exists:', !!verifyUser);
      
      toast.success('Login successful!');
      
      // Small delay to ensure state is set, then navigate
      setTimeout(() => {
        console.log('Navigating to dashboard...');
        navigate('/dashboard', { replace: true });
      }, 200);
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      let errorMsg = error.response?.data?.detail || error.message || 'Login failed';
      
      // Handle blocked requests
      if (error.message?.includes('blocked') || error.code === 'ERR_BLOCKED_BY_CLIENT' || error.isBlocked) {
        errorMsg = 'Request was blocked by browser. This might be a CORS issue. Check browser console for details.';
        console.error('BLOCKED REQUEST - Possible causes:');
        console.error('1. CORS misconfiguration');
        console.error('2. Browser security policy');
        console.error('3. Ad blocker or extension');
        console.error('4. Mixed content (HTTP/HTTPS)');
      }
      
      toast.error(errorMsg);
      
      // Fallback alert for debugging
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        alert('Request timeout - server is not responding. Check if backend is running on port 8000.');
      } else if (error.message?.includes('blocked') || error.isBlocked) {
        alert(`Request blocked: ${errorMsg}\n\nCheck:\n1. Backend is running\n2. CORS is configured\n3. Browser console for details`);
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
        alert('Network error - cannot reach server. Check your connection and ensure backend is running.');
      } else {
        alert(`Login failed: ${errorMsg}`);
      }
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="bottom-center" />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4">
        <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center text-2xl font-bold text-white mb-4">
            NG
          </div>
          <CardTitle className="text-2xl">NG POS</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700" 
              disabled={loading}
              onClick={(e) => {
                console.log('Button clicked!', e);
                // Form submission will handle this, but log for debugging
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <p className="text-sm text-center text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-emerald-600 hover:underline">
                Register
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
    </>
  );
}
