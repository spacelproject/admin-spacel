import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const TestPage = () => {
  const { signIn, user, isAdmin, signOut } = useAuth();
  const [email, setEmail] = useState('admin@spacel.com');
  const [password, setPassword] = useState('Admin123!');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const result = await signIn(email, password);
    if (result.success) {
      console.log('✅ Login successful!');
    } else {
      console.error('❌ Login failed:', result.error);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    console.log('✅ Logged out');
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Authentication Test</h1>
        
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <div className="space-y-2">
            <p><strong>User:</strong> {user ? user.email : 'Not logged in'}</p>
            <p><strong>Is Admin:</strong> {isAdmin ? '✅ Yes' : '❌ No'}</p>
            <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
            <p><strong>Role:</strong> {user?.role || 'N/A'}</p>
          </div>
        </div>

        {!isAdmin ? (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Admin Login</h2>
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@spacel.com"
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
              <Button
                onClick={handleLogin}
                loading={loading}
                fullWidth
              >
                {loading ? 'Signing In...' : 'Sign In as Admin'}
              </Button>
            </div>
            
            <div className="mt-6 p-4 bg-muted/50 rounded-md">
              <h3 className="font-semibold mb-2">Test Credentials:</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Email:</strong> admin@spacel.com</p>
                <p><strong>Password:</strong> Admin123!</p>
                <p className="text-muted-foreground">Or try: testingspacel@hotmail.com</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Admin Actions</h2>
            <div className="space-y-4">
              <Button
                onClick={handleLogout}
                variant="outline"
                fullWidth
              >
                Sign Out
              </Button>
              <Button
                onClick={() => window.location.href = '/space-management'}
                fullWidth
              >
                Go to Space Management
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestPage;