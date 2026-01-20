import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Phone, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { Call } from '@/types';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';

interface CallVolumeChartProps {
  calls: Call[];
  dateRange?: { from: Date | undefined; to: Date | undefined };
}

const STATUS_COLORS: Record<string, string> = {
  new: 'hsl(var(--primary))',
  contacted: 'hsl(var(--chart-2))',
  not_answered: 'hsl(var(--chart-3))',
  callback: 'hsl(var(--chart-4))',
  converted: 'hsl(var(--chart-5))',
};

export default function CallVolumeChart({ calls, dateRange }: CallVolumeChartProps) {
  // Daily call volume for the last 14 days or date range
  const dailyData = useMemo(() => {
    const endDate = dateRange?.to || new Date();
    const startDate = dateRange?.from || subDays(endDate, 13);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayCalls = calls.filter(c => 
        startOfDay(c.callDate).getTime() === dayStart.getTime()
      );
      
      return {
        date: format(day, 'MMM d'),
        calls: dayCalls.length,
        converted: dayCalls.filter(c => c.status === 'converted').length,
      };
    });
  }, [calls, dateRange]);

  // Status distribution
  const statusData = useMemo(() => {
    const statusCounts: Record<string, number> = {
      new: 0,
      contacted: 0,
      not_answered: 0,
      callback: 0,
      converted: 0,
    };

    calls.forEach(call => {
      if (statusCounts[call.status] !== undefined) {
        statusCounts[call.status]++;
      }
    });

    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: count,
        color: STATUS_COLORS[status],
      }));
  }, [calls]);

  // Conversion rate
  const conversionRate = useMemo(() => {
    if (calls.length === 0) return 0;
    const converted = calls.filter(c => c.status === 'converted').length;
    return Math.round((converted / calls.length) * 100);
  }, [calls]);

  const totalCalls = calls.length;
  const convertedCalls = calls.filter(c => c.status === 'converted').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Total Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCalls}</p>
            <p className="text-xs text-muted-foreground">
              {dateRange?.from ? 'In selected period' : 'All time'}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Converted to Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{convertedCalls}</p>
            <p className="text-xs text-muted-foreground">From calls</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Calls to leads</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Volume Trend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Call Volume Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="calls" name="Total Calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="converted" name="Converted" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No call data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Call Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No call data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
