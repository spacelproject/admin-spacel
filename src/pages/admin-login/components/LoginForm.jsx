import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const LoginForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  // Mock credentials for different admin roles
  const mockCredentials = [
    { email: 'admin@spacio.com', password: 'Admin123!', role: 'Super Administrator' },
    { email: 'moderator@spacio.com', password: 'Mod123!', role: 'Content Moderator' },
    { email: 'support@spacio.com', password: 'Support123!', role: 'Support Representative' }
  ];

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

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check credentials
    const validCredential = mockCredentials.find(
      cred => cred.email === formData.email && cred.password === formData.password
    );

    if (validCredential) {
      // Store user session
      localStorage.setItem('adminUser', JSON.stringify({
        email: validCredential.email,
        role: validCredential.role,
        loginTime: new Date().toISOString()
      }));

      if (formData.rememberMe) {
        localStorage.setItem('rememberAdmin', 'true');
      }

      // Reset attempts on successful login
      setLoginAttempts(0);
      
      // Redirect to dashboard
      navigate('/dashboard-overview');
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
          general: `Invalid email or password. ${3 - newAttempts} attempts remaining.` 
        });
      }
    }

    setIsLoading(false);
  };

  const handleForgotPassword = () => {
    // In a real app, this would navigate to password reset
    alert('Password reset functionality would be implemented here');
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
            Sign in to access the SPACIO admin dashboard
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

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <Checkbox
              label="Remember me"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleInputChange}
              disabled={isLoading || isLocked}
            />
            
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

        {/* Mock Credentials Info */}
        <div className="mt-8 p-4 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Demo Credentials:</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Super Admin: admin@spacio.com / Admin123!</p>
            <p>Moderator: moderator@spacio.com / Mod123!</p>
            <p>Support: support@spacio.com / Support123!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;