import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Avatar, Divider, Text as PaperText, ActivityIndicator as PaperActivityIndicator } from 'react-native-paper';

const { width } = Dimensions.get('window');

const FILTERS = [
  { label: 'All Time', value: 'all' },
  { label: 'Past Week', value: 'week' },
  { label: 'Past Month', value: 'month' },
];

const AttendanceScreen = () => {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'week' | 'month'>('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Function to fetch attendance history
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      console.log('Attendance screen: Fetching records for role:', user.role);
      
      // First get all users to build a complete employee list
      const usersData = await AsyncStorage.getItem('users');
      const users = usersData ? JSON.parse(usersData) : [];
      setAllUsers(users);
      
      // Extract all employees for admins to view
      const employees = users.filter((u: any) => u.role === 'employee');
      console.log(`Found ${employees.length} employees in the system`);
      
      // Check for attendance data in the daily records format
      const keys = await AsyncStorage.getAllKeys();
      const attendanceKeys = keys.filter(key => key.startsWith('attendance_'));
      console.log(`Found ${attendanceKeys.length} attendance records keys`);
      
      // Process the attendance records
      const attendanceData = await AsyncStorage.multiGet(attendanceKeys);
      let history: any[] = [];
      
      attendanceData.forEach(([key, value]) => {
        if (value) {
          try {
            const record = JSON.parse(value);
            // Add extra debug info to identify record details
            console.log(`Record: ${key}, email: ${record.email}, name: ${record.name || 'missing'}`);
            
            // For admins, ensure each record has complete employee data
            if (user.role === 'admin' && (!record.name || !record.department)) {
              const employeeData = employees.find(e => e.email === record.email);
              if (employeeData) {
                record.name = record.name || employeeData.name;
                record.department = record.department || employeeData.department;
              }
            }
            
            history.push(record);
          } catch (e) {
            console.error('Error parsing record:', key, e);
          }
        }
      });
      
      // For admins, if we don't have enough records, add demo/empty records for each employee
      if (user.role === 'admin' && history.length === 0 && employees.length > 0) {
        console.log('No attendance records found, creating placeholder entries for admin view');
        
        // Create a placeholder record for each employee to show in the admin view
        history = employees.map(emp => ({
          email: emp.email,
          name: emp.name,
          department: emp.department,
          date: new Date().toISOString().split('T')[0],
          checkInTime: new Date().toISOString(),
          status: 'No attendance recorded',
        }));
      }
      
      // Sort by check-in time, most recent first
      history.sort((a, b) => {
        const dateA = new Date(a.checkInTime || a.date || 0);
        const dateB = new Date(b.checkInTime || b.date || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Extract unique departments for filtering
      const uniqueDepts: string[] = Array.from(
        new Set(users.map((u: any) => u.department).filter(Boolean))
      ) as string[];
      
      // Make sure 'All' isn't duplicated - remove it if it exists in departments
      const filteredDepts = uniqueDepts.filter(dept => dept !== 'All');
      
      // Add 'All' at the beginning
      setDepartments(['All', ...filteredDepts]);
      
      // Filter by user if not admin
      if (user.role !== 'admin') {
        history = history.filter((rec: any) => rec.email === user.email);
        console.log(`Filtered to ${history.length} records for employee: ${user.email}`);
      } else {
        console.log(`Admin view showing all ${history.length} attendance records`);
        
        // For debugging, log each record in admin view
        if (history.length > 0) {
          console.log('Sample of records in admin view:');
          history.slice(0, 3).forEach((rec, idx) => {
            console.log(`Record ${idx}: ${rec.email}, ${rec.name}, ${rec.department}`);
          });
        }
      }
      
      setAttendanceHistory(history);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Attendance screen focused - refreshing data');
      fetchHistory();
    }, [fetchHistory])
  );

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory();
  }, [fetchHistory]);

  // Filter history by department (admin only) and time period
  const filteredHistory = React.useMemo(() => {
    let history = [...attendanceHistory];
    
    // Filter by department if admin
    if (user?.role === 'admin' && selectedDept !== 'All') {
      history = history.filter((rec: any) => rec.department === selectedDept);
    }
    
    // Apply time filter
    if (filter !== 'all') {
      const now = new Date();
      return history.filter(item => {
        const dateObj = new Date(item.checkInTime || item.date || 0);
        if (filter === 'week') {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return dateObj >= weekAgo && dateObj <= now;
        } else if (filter === 'month') {
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          return dateObj >= monthAgo && dateObj <= now;
        }
        return true;
      });
    }
    
    return history;
  }, [attendanceHistory, filter, user, selectedDept]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = filteredHistory.length;
    const checkIns = filteredHistory.filter(item => item.checkInTime && !item.checkOutTime).length;
    const checkOuts = filteredHistory.filter(item => item.checkOutTime).length;
    
    // Calculate average hours if applicable
    let avgHours = 0;
    const recordsWithHours = filteredHistory.filter(item => item.totalHours);
    if (recordsWithHours.length > 0) {
      avgHours = recordsWithHours.reduce((sum, item) => sum + (item.totalHours || 0), 0) / recordsWithHours.length;
    }
    
    return { 
      total, 
      checkIns, 
      checkOuts,
      avgHours: avgHours.toFixed(1),
    };
  }, [filteredHistory]);

  const renderAttendanceItem = ({ item }: any) => {
    // Format dates and times
    const checkInDate = new Date(item.checkInTime || item.date || 0);
    const formattedDate = checkInDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    const checkInTime = checkInDate.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    let checkOutTime = "";
    if (item.checkOutTime) {
      const checkOutDate = new Date(item.checkOutTime);
      checkOutTime = checkOutDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    const isCompleted = !!item.checkOutTime;
    
    return (
      <View style={[styles.attendanceItem, { backgroundColor: theme.card, shadowColor: theme.shadowColor }]}>
        <View style={[styles.dateContainer, { backgroundColor: theme.primary }]}>
          <Text style={[styles.dateText, { color: '#fff' }]}>{formattedDate}</Text>
        </View>
        
        <View style={styles.attendanceDetails}>
          <View style={styles.timeRow}>
            <View style={styles.timeContainer}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="log-in-outline" size={18} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>Check In</Text>
                <Text style={[styles.timeValue, { color: theme.text }]}>{checkInTime}</Text>
              </View>
            </View>
            
            {item.checkOutTime && (
              <View style={styles.timeContainer}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)' }]}>
                  <Ionicons name="log-out-outline" size={18} color={isCompleted ? theme.error : theme.textSecondary} />
                </View>
                <View>
                  <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>Check Out</Text>
                  <Text style={[styles.timeValue, { color: theme.text }]}>{checkOutTime}</Text>
                </View>
              </View>
            )}
          </View>
          
          {item.totalHours !== undefined && (
            <View style={[styles.hoursContainer, { borderTopColor: theme.border }]}>
              <Text style={[styles.hoursLabel, { color: theme.textSecondary }]}>Hours</Text>
              <Text style={[styles.hoursValue, { color: theme.success }]}>{item.totalHours}</Text>
            </View>
          )}
          
          {/* Always show employee info in admin view */}
          {user?.role === 'admin' && (
            <View style={[styles.employeeInfo, { borderTopColor: theme.border }]}>
              <Ionicons name="person-outline" size={16} color={theme.textSecondary} style={styles.employeeIcon} />
              <Text style={[styles.employeeName, { color: theme.text }]}>{item.name || 'Unknown'}</Text>
              <Text style={[styles.employeeDept, { color: theme.textSecondary }]}>{item.department || 'No Department'}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderFilterChips = () => (
    <View style={styles.filterChips}>
      {FILTERS.map(f => (
        <TouchableOpacity
          key={f.value}
          style={[
            styles.filterChip,
            { backgroundColor: theme.card, shadowColor: theme.shadowColor },
            filter === f.value && [styles.activeFilterChip, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setFilter(f.value as any)}
          activeOpacity={0.7}
        >
          <Text 
            style={[
              styles.filterChipText,
              { color: theme.text },
              filter === f.value && [styles.activeFilterChipText, { color: '#fff' }]
            ]}
          >
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={{ paddingTop: 70, paddingBottom: 36, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: 8 }}
      >
        <Avatar.Icon size={64} icon="calendar-month" color="#fff" style={{ backgroundColor: theme.primary, marginBottom: 10 }} />
        <PaperText variant="headlineMedium" style={{ color: '#fff', fontWeight: 'bold', marginBottom: 2 }}>Attendance Records</PaperText>
        <PaperText variant="titleSmall" style={{ color: '#fff', opacity: 0.8, marginBottom: 2 }}>{user?.role === 'admin' ? 'All Employees' : user?.name}</PaperText>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 18 }}>
        {/* Stats Card */}
        <Card style={{ borderRadius: 18, padding: 18, backgroundColor: theme.card, elevation: 4, marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Avatar.Icon size={36} icon="calendar-check" color="#fff" style={{ backgroundColor: theme.primary, marginBottom: 4 }} />
              <PaperText variant="headlineSmall" style={{ color: theme.primary, fontWeight: 'bold' }}>{stats.total}</PaperText>
              <PaperText variant="labelSmall" style={{ color: theme.textSecondary }}>Total Records</PaperText>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Avatar.Icon size={36} icon="clock-outline" color="#fff" style={{ backgroundColor: theme.success, marginBottom: 4 }} />
              <PaperText variant="headlineSmall" style={{ color: theme.success, fontWeight: 'bold' }}>{stats.avgHours}</PaperText>
              <PaperText variant="labelSmall" style={{ color: theme.textSecondary }}>Avg Hours</PaperText>
            </View>
          </View>
        </Card>
        {/* Filter Chips Card */}
        <Card style={{ borderRadius: 18, padding: 12, backgroundColor: theme.card, elevation: 2, marginBottom: 18 }}>
          {user?.role === 'admin' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              {departments.map((dept, index) => (
                <TouchableOpacity
                  key={`dept-${index}`}
                  style={{
                    backgroundColor: selectedDept === dept ? theme.primary : theme.background,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    marginRight: 8,
                    borderWidth: selectedDept === dept ? 0 : 1,
                    borderColor: theme.primary,
                  }}
                  onPress={() => setSelectedDept(dept)}
                  activeOpacity={0.8}
                >
                  <PaperText style={{ color: selectedDept === dept ? '#fff' : theme.primary, fontWeight: 'bold' }}>{dept}</PaperText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.value}
                style={{
                  flex: 1,
                  backgroundColor: filter === f.value ? theme.primary : theme.background,
                  borderRadius: 12,
                  paddingVertical: 10,
                  marginHorizontal: 4,
                  alignItems: 'center',
                  borderWidth: filter === f.value ? 0 : 1,
                  borderColor: theme.primary,
                }}
                onPress={() => setFilter(f.value as any)}
                activeOpacity={0.8}
              >
                <PaperText style={{ color: filter === f.value ? '#fff' : theme.primary, fontWeight: 'bold' }}>{f.label}</PaperText>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
        {/* Attendance List */}
        <Card style={{ borderRadius: 18, padding: 0, backgroundColor: theme.card, elevation: 4, marginBottom: 18 }}>
          <Card.Title
            title="Attendance History"
            titleStyle={{ color: theme.text, fontWeight: 'bold', fontSize: 18 }}
            left={props => <Avatar.Icon {...props} icon="clipboard-list-outline" color={theme.primary} style={{ backgroundColor: theme.background }} />}
          />
          <Divider style={{ marginBottom: 8 }} />
          {loading ? (
            <PaperActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 32 }} />
          ) : filteredHistory.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Avatar.Icon size={48} icon="calendar" color={theme.textSecondary} style={{ backgroundColor: theme.background, marginBottom: 8 }} />
              <PaperText variant="titleMedium" style={{ color: theme.text, marginBottom: 4 }}>No Records Found</PaperText>
              <PaperText variant="bodySmall" style={{ color: theme.textSecondary }}>
                {filter !== 'all'
                  ? 'Try changing your filter settings'
                  : user?.role === 'admin' && selectedDept !== 'All'
                    ? 'No records for this department'
                    : 'Check-ins will appear here'}
              </PaperText>
            </View>
          ) : (
            filteredHistory.map((item, idx) => (
              <View key={idx}>
                <Card style={{ marginHorizontal: 12, marginVertical: 8, borderRadius: 14, backgroundColor: theme.background, elevation: 2 }}>
                  <Card.Content>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Avatar.Icon size={32} icon="calendar-check" color="#fff" style={{ backgroundColor: theme.primary, marginRight: 10 }} />
                      <PaperText style={{ fontWeight: 'bold', color: theme.text, fontSize: 16 }}>{new Date(item.checkInTime || item.date || 0).toLocaleDateString()}</PaperText>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Avatar.Icon size={24} icon="login" color={theme.primary} style={{ backgroundColor: theme.background, marginRight: 6 }} />
                        <PaperText style={{ color: theme.textSecondary, fontWeight: 'bold' }}>Check In:</PaperText>
                        <PaperText style={{ color: theme.text, marginLeft: 4 }}>{new Date(item.checkInTime || item.date || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</PaperText>
                      </View>
                      {item.checkOutTime && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Avatar.Icon size={24} icon="logout" color={theme.success} style={{ backgroundColor: theme.background, marginRight: 6 }} />
                          <PaperText style={{ color: theme.textSecondary, fontWeight: 'bold' }}>Check Out:</PaperText>
                          <PaperText style={{ color: theme.text, marginLeft: 4 }}>{new Date(item.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</PaperText>
                        </View>
                      )}
                    </View>
                    {item.totalHours !== undefined && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Avatar.Icon size={20} icon="clock-outline" color={theme.success} style={{ backgroundColor: theme.background, marginRight: 6 }} />
                        <PaperText style={{ color: theme.textSecondary, fontWeight: 'bold' }}>Hours:</PaperText>
                        <PaperText style={{ color: theme.success, marginLeft: 4 }}>{item.totalHours}</PaperText>
                      </View>
                    )}
                    {user?.role === 'admin' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                        <Avatar.Icon size={20} icon="account" color={theme.primary} style={{ backgroundColor: theme.background, marginRight: 6 }} />
                        <PaperText style={{ color: theme.text, fontWeight: 'bold' }}>{item.name || 'Unknown'}</PaperText>
                        <PaperText style={{ color: theme.textSecondary, marginLeft: 8 }}>{item.department || 'No Department'}</PaperText>
                      </View>
                    )}
                  </Card.Content>
                </Card>
                {idx !== filteredHistory.length - 1 && <Divider style={{ marginVertical: 2, marginHorizontal: 24 }} />}
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 16,
    marginBottom: 8,
  },
  deptFilterWrapper: {
    marginTop: 16,
    marginBottom: 8,
  },
  deptFilterScroll: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  deptChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeDeptChip: {
    // Will use background color from theme
  },
  deptChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeDeptChipText: {
    fontWeight: '600',
  },
  statsContainer: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 14,
    marginTop: 2,
  },
  filterContainer: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  filterChips: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  activeFilterChip: {
    // Will use background color from theme
  },
  filterChipText: {
    fontWeight: '500',
    fontSize: 14,
  },
  activeFilterChipText: {
    // Will use color from theme
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  listHeader: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  flatlistContent: {
    paddingBottom: 40,
  },
  attendanceItem: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dateText: {
    fontWeight: '600',
    fontSize: 14,
  },
  attendanceDetails: {
    padding: 16,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timeLabel: {
    fontSize: 13,
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  hoursContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hoursLabel: {
    fontSize: 14,
  },
  hoursValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  employeeIcon: {
    marginRight: 8,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '500',
  },
  employeeDept: {
    fontSize: 14,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default AttendanceScreen; 