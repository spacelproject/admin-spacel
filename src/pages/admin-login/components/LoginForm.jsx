import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';

const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, resetPassword, loading } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  // Show success message from registration if present
  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, location.state.type || 'success');
      // Clear the state to prevent showing again on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location, showToast]);


  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLocked) {
      setErrors({ general: `Account locked. Please try again in ${lockoutTime} seconds.` });
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    // Use Supabase authentication
    const result = await signIn(formData.email, formData.password);

    if (result.success) {
      // Reset attempts on successful login
      setLoginAttempts(0);
      
      // Redirect based on role
      let redirectPath = '/dashboard-overview';
      if (result.role === 'support') {
        redirectPath = '/support-agent-tickets';
      } else {
        redirectPath = location.state?.from?.pathname || '/dashboard-overview';
      }
      
      // Small delay to ensure AuthContext state is updated
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 50);
    } else {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= 3) {
        setIsLocked(true);
        setLockoutTime(30);
        setErrors({ general: 'Too many failed attempts. Account locked for 30 seconds.' });
        
        // Start countdown
        const countdown = setInterval(() => {
          setLockoutTime(prev => {
            if (prev <= 1) {
              clearInterval(countdown);
              setIsLocked(false);
              setLoginAttempts(0);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setErrors({ 
          general: result.error?.message || `Invalid email or password. ${3 - newAttempts} attempts remaining.` 
        });
      }
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({ general: 'Please enter your email address first' });
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    const result = await resetPassword(formData.email);
    
    if (!result.success) {
      setErrors({ general: result.error?.message || 'Failed to send reset email' });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-card border border-border rounded-lg shadow-card p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Admin Portal
          </h1>
          <p className="text-muted-foreground">
            Sign in to access the SPACEL admin dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <Icon name="AlertCircle" size={16} className="text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{errors.general}</p>
            </div>
          )}

          {/* Email Field */}
          <Input
            label="Email Address"
            type="email"
            name="email"
            placeholder="Enter your admin email"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
            required
            disabled={isLoading || isLocked}
          />

          {/* Password Field */}
          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleInputChange}
            error={errors.password}
            required
            disabled={isLoading || isLocked}
          />

          {/* Forgot Password */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-primary hover:text-primary/80 transition-smooth"
              disabled={isLoading || isLocked}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="default"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={isLocked}
            iconName={isLoading ? undefined : "LogIn"}
            iconPosition="left"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        {/* Registration Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link 
              to="/admin-register" 
              className="text-primary hover:text-primary/80 font-medium transition-smooth"
            >
              Create admin account
            </Link>
          </p>
        </div>

        {/* Admin Access Note */}
        <div className="mt-8 p-4 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Admin Access Required:</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Only users with admin privileges can access this panel.</p>
            <p>Contact your system administrator if you need access.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;