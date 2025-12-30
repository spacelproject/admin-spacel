import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

const RegisterForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, loading } = useAuth();
  const [formData, setFormData] = useState({
    inviteToken: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin', // Default to admin
    agreeToTerms: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);

  // Validate invite token
  const validateInviteToken = async (token) => {
    if (!token) return;
    
    setValidatingToken(true);
    try {
      const { data, error } = await supabase
        .from('invite_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setErrors({ 
          inviteToken: 'Invalid or expired invite token. Please request a new invitation.' 
        });
        setTokenInfo(null);
      } else {
        setTokenInfo(data);
        setFormData(prev => ({ 
          ...prev, 
          email: data.email || prev.email,
          role: data.role || prev.role
        }));
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.inviteToken;
          return newErrors;
        });
      }
    } catch (err) {
      setErrors({ 
        inviteToken: 'Error validating invite token. Please try again.' 
      });
      setTokenInfo(null);
    } finally {
      setValidatingToken(false);
    }
  };

  // Get invite token from URL if present
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setFormData(prev => ({ ...prev, inviteToken: token }));
      validateInviteToken(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.inviteToken.trim()) {
      newErrors.inviteToken = 'Invite token is required';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (tokenInfo && tokenInfo.email && formData.email !== tokenInfo.email) {
      newErrors.email = `This invite token is for ${tokenInfo.email}. Please use the correct email address.`;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
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

    // Validate invite token when token field changes
    if (name === 'inviteToken' && value) {
      validateInviteToken(value);
    }
  };

  const handleRoleChange = (value) => {
    setFormData(prev => ({ ...prev, role: value }));
    if (errors.role) {
      setErrors(prev => ({ ...prev, role: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    // Use Supabase authentication with invite token and role
    const result = await signUp(
      formData.email, 
      formData.password,
      {
        firstName: formData.firstName,
        lastName: formData.lastName,
        inviteToken: formData.inviteToken,
        role: formData.role
      }
    );

    if (result.success) {
      // Redirect to login page with success message
      navigate('/admin-login', { 
        state: { 
          message: 'Registration successful! Your account has been verified. You can now proceed to login.',
          type: 'success'
        } 
      });
    } else {
      setErrors({ 
        general: result.error?.message || 'Registration failed. Please try again.' 
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-card border border-border rounded-lg shadow-card p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Create Admin Account
          </h1>
          <p className="text-muted-foreground">
            Register for access to the SPACEL admin dashboard
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

          {/* Invite Token Field */}
          <Input
            label="Invite Token"
            type="text"
            name="inviteToken"
            placeholder="Enter your invite token"
            value={formData.inviteToken}
            onChange={handleInputChange}
            error={errors.inviteToken}
            description={validatingToken ? "Validating token..." : tokenInfo ? `Token valid for ${tokenInfo.email}` : "You need an invite token to register"}
            required
            disabled={isLoading || validatingToken}
          />

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Role <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                disabled={isLoading || validatingToken}
                className={`
                  p-4 border-2 rounded-lg transition-smooth
                  ${formData.role === 'admin' 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border hover:border-muted-foreground'
                  }
                  ${isLoading || validatingToken ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Icon name="Shield" size={24} />
                  <span className="font-medium">Admin</span>
                  <span className="text-xs text-muted-foreground">Full access</span>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => handleRoleChange('support')}
                disabled={isLoading || validatingToken}
                className={`
                  p-4 border-2 rounded-lg transition-smooth
                  ${formData.role === 'support' 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border hover:border-muted-foreground'
                  }
                  ${isLoading || validatingToken ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Icon name="Headphones" size={24} />
                  <span className="font-medium">Support</span>
                  <span className="text-xs text-muted-foreground">Support tickets</span>
                </div>
              </button>
            </div>
            {errors.role && (
              <p className="text-sm text-destructive mt-1">{errors.role}</p>
            )}
          </div>

          {/* First Name and Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              type="text"
              name="firstName"
              placeholder="First name"
              value={formData.firstName}
              onChange={handleInputChange}
              error={errors.firstName}
              required
              disabled={isLoading}
            />

            <Input
              label="Last Name"
              type="text"
              name="lastName"
              placeholder="Last name"
              value={formData.lastName}
              onChange={handleInputChange}
              error={errors.lastName}
              required
              disabled={isLoading}
            />
          </div>

          {/* Email Field */}
          <Input
            label="Email Address"
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
            required
            disabled={isLoading}
          />

          {/* Password Field */}
          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="Create a password"
            value={formData.password}
            onChange={handleInputChange}
            error={errors.password}
            required
            disabled={isLoading}
          />

          {/* Confirm Password Field */}
          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            error={errors.confirmPassword}
            required
            disabled={isLoading}
          />

          {/* Terms Agreement */}
          <div>
            <Checkbox
              label={
                <span>
                  I agree to the{' '}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              }
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            {errors.agreeToTerms && (
              <p className="text-sm text-destructive mt-1">{errors.agreeToTerms}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="default"
            size="lg"
            fullWidth
            loading={isLoading}
            iconName={isLoading ? undefined : "UserPlus"}
            iconPosition="left"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link 
              to="/admin-login" 
              className="text-primary hover:text-primary/80 font-medium transition-smooth"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Admin Access Note */}
        <div className="mt-8 p-4 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Note:</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Registration is by invite only. You need a valid invite token to create an account.</p>
            <p>Your account will be automatically verified upon registration.</p>
            <p>You can proceed to login immediately after registration.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;

