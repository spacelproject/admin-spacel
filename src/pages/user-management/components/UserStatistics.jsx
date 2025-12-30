import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';
import { formatCurrencyDisplay } from '../../../utils/currency';

const UserStatistics = ({ users }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    newUsersLastMonth: 0,
    growthRate: 0,
    averageBookingsPerUser: 0,
    averageSpentPerUser: 0,
    topUsers: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (users && users.length > 0) {
      calculateStats();
    }
  }, [users]);

  const calculateStats = () => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    
    const newUsersThisMonth = users.filter(u => {
      const joinedDate = new Date(u.joinedDate);
      return joinedDate >= thisMonthStart;
    }).length;

    const newUsersLastMonth = users.filter(u => {
      const joinedDate = new Date(u.joinedDate);
      return joinedDate >= lastMonthStart && joinedDate < thisMonthStart;
    }).length;

    const growthRate = lastMonthUsers > 0 
      ? ((newUsersThisMonth - newUsersLastMonth) / lastMonthUsers) * 100 
      : 0;

    const totalBookings = users.reduce((sum, u) => sum + (u.totalBookings || 0), 0);
    const averageBookingsPerUser = totalUsers > 0 ? totalBookings / totalUsers : 0;

    const totalSpent = users.reduce((sum, u) => {
      if (u.role === 'partner') {
        return sum + (u.totalEarnings || 0);
      }
      return sum + (u.totalSpent || 0);
    }, 0);
    const averageSpentPerUser = totalUsers > 0 ? totalSpent / totalUsers : 0;

    // Top users by bookings
    const topUsers = [...users]
      .sort((a, b) => (b.totalBookings || 0) - (a.totalBookings || 0))
      .slice(0, 5);

    setStats({
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      growthRate: Math.round(growthRate * 10) / 10,
      averageBookingsPerUser: Math.round(averageBookingsPerUser * 10) / 10,
      averageSpentPerUser,
      topUsers
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="Loader2" className="animate-spin text-primary" size={24} />
        <span className="ml-2 text-muted-foreground">Calculating statistics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
            </div>
            <Icon name="Users" size={24} className="text-primary" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Users</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeUsers}</p>
            </div>
            <Icon name="CheckCircle" size={24} className="text-success" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">New This Month</p>
              <p className="text-2xl font-bold text-foreground">{stats.newUsersThisMonth}</p>
              <p className="text-xs text-muted-foreground">
                {stats.growthRate > 0 ? '+' : ''}{stats.growthRate}% vs last month
              </p>
            </div>
            <Icon name="TrendingUp" size={24} className="text-accent" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Bookings/User</p>
              <p className="text-2xl font-bold text-foreground">{stats.averageBookingsPerUser}</p>
            </div>
            <Icon name="Calendar" size={24} className="text-secondary" />
          </div>
        </div>
      </div>

      {/* Top Users */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Top Users by Bookings</h3>
        <div className="space-y-3">
          {stats.topUsers.map((user, index) => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user.totalBookings} bookings</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrencyDisplay(user.role === 'partner' ? user.totalEarnings || 0 : user.totalSpent || 0)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserStatistics;

