import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput,
  Switch,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { clearAllEmployeeRecords, clearAttendanceRecords, getStorageSummary } from '../../utils/storageUtils';
import { useNavigation } from '@react-navigation/native';

const AdminDashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoModalVisible, setGeoModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [geoForm, setGeoForm] = useState({ name: '', latitude: '', longitude: '', radius: '' });
  const [savingGeo, setSavingGeo] = useState(false);
  const [storageSummary, setStorageSummary] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const usersData = await AsyncStorage.getItem('users');
      const users = usersData ? JSON.parse(usersData) : [];
      const attendanceData = await AsyncStorage.getItem('attendanceHistory');
      const attendance = attendanceData ? JSON.parse(attendanceData) : [];
      // Get unique departments
      const depts = Array.from(new Set(users.map((u: any) => u.department).filter(Boolean)));
      setDepartments(['All', ...depts]);
      setEmployees(users.filter((u: any) => u.role === 'employee'));
      setAttendance(attendance);
      
      // Get storage summary
      try {
        const summary = await getStorageSummary();
        setStorageSummary(summary);
      } catch (error) {
        console.error('Error getting storage summary:', error);
      }
      
      setLoading(false);
    };
    fetchData();
  }, []);

  // Filter employees by department
  const filteredEmployees = selectedDept === 'All'
    ? employees
    : employees.filter(e => e.department === selectedDept);

  // Get today's date string
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get today's attendance for an employee
  const getTodayAttendance = (empId: string) => {
    return attendance.find(
      (rec: any) =>
        rec.userId === empId &&
        rec.type === 'check-in' &&
        new Date(rec.timestamp).setHours(0, 0, 0, 0) === today.getTime()
    );
  };

  // Cancel today's attendance for an employee
  const cancelAttendance = async (empId: string) => {
    const newAttendance = attendance.filter(
      (rec: any) =>
        !(rec.userId === empId && rec.type === 'check-in' && new Date(rec.timestamp).setHours(0, 0, 0, 0) === today.getTime())
    );
    await AsyncStorage.setItem('attendanceHistory', JSON.stringify(newAttendance));
    setAttendance(newAttendance);
    Alert.alert('Attendance Cancelled', 'Attendance for this employee has been cancelled for today.');
  };

  // Open modal and reset form
  const openGeoModal = (employee: any) => {
    setSelectedEmployee(employee);
    if (employee.assignedLocation) {
      setGeoForm({
        name: employee.assignedLocation.name || '',
        latitude: String(employee.assignedLocation.latitude || ''),
        longitude: String(employee.assignedLocation.longitude || ''),
        radius: String(employee.assignedLocation.radius || ''),
      });
    } else {
      setGeoForm({ name: '', latitude: '', longitude: '', radius: '' });
    }
    setGeoModalVisible(true);
  };

  // Save geofence assignment
  const saveGeofence = async () => {
    if (!selectedEmployee) return;
    setSavingGeo(true);
    try {
      const usersData = await AsyncStorage.getItem('users');
      let users = usersData ? JSON.parse(usersData) : [];
      users = users.map((u: any) =>
        u.id === selectedEmployee.id
          ? {
              ...u,
              assignedLocation: {
                name: geoForm.name,
                latitude: parseFloat(geoForm.latitude),
                longitude: parseFloat(geoForm.longitude),
                radius: parseFloat(geoForm.radius),
              },
            }
          : u
      );
      await AsyncStorage.setItem('users', JSON.stringify(users));
      setEmployees(users.filter((u: any) => u.role === 'employee'));
      setGeoModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to save geofence');
    }
    setSavingGeo(false);
  };

  // Clear all employee records
  const handleClearAllEmployeeRecords = async () => {
    Alert.alert(
      'Clear All Employee Records',
      'This will permanently delete all employee accounts, attendance records, and location data. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllEmployeeRecords();
              // Refresh data after clearing
              const fetchData = async () => {
                const usersData = await AsyncStorage.getItem('users');
                const users = usersData ? JSON.parse(usersData) : [];
                const attendanceData = await AsyncStorage.getItem('attendanceHistory');
                const attendance = attendanceData ? JSON.parse(attendanceData) : [];
                const depts = Array.from(new Set(users.map((u: any) => u.department).filter(Boolean)));
                setDepartments(['All', ...depts]);
                setEmployees(users.filter((u: any) => u.role === 'employee'));
                setAttendance(attendance);
                
                const summary = await getStorageSummary();
                setStorageSummary(summary);
              };
              fetchData();
            } catch (error) {
              console.error('Error clearing employee records:', error);
            }
          }
        }
      ]
    );
  };

  // Clear only attendance records
  const handleClearAttendanceRecords = async () => {
    Alert.alert(
      'Clear Attendance Records',
      'This will permanently delete all attendance records and location data, but keep employee accounts. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Attendance',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAttendanceRecords();
              // Refresh data after clearing
              const attendanceData = await AsyncStorage.getItem('attendanceHistory');
              const attendance = attendanceData ? JSON.parse(attendanceData) : [];
              setAttendance(attendance);
              
              const summary = await getStorageSummary();
              setStorageSummary(summary);
            } catch (error) {
              console.error('Error clearing attendance records:', error);
            }
          }
        }
      ]
    );
  };

  const renderDeptSlicer = () => (
    <View style={[styles.slicerContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}> 
      {departments.map(dept => (
        <TouchableOpacity
          key={dept}
          style={[styles.slicerButton, selectedDept === dept && { backgroundColor: theme.primary }]}
          onPress={() => setSelectedDept(dept)}
        >
          <Text style={[styles.slicerText, selectedDept === dept && { color: theme.card, fontWeight: '700' }]}>{dept}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEmployee = ({ item }: any) => {
    const att = getTodayAttendance(item.id);
    return (
      <View style={[styles.empCard, { backgroundColor: theme.card, shadowColor: theme.border }]}> 
        <View style={styles.empRow}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}> 
            <Text style={styles.avatarText}>{item.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.empName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.empEmail, { color: theme.textSecondary }]}>{item.email}</Text>
          </View>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: att ? theme.statusCheckedIn : theme.statusCheckedOut }]}> 
              <Ionicons
                name={att ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={theme.card}
              />
              <Text style={styles.statusBadgeText}>{att ? 'Checked In' : 'Not Checked In'}</Text>
            </View>
          </View>
        </View>
        <View style={styles.actionRow}>
          <Text style={[styles.empDept, { color: theme.textSecondary }]}>{item.department}</Text>
          {att && (
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: theme.error }]}
              onPress={() => cancelAttendance(item.id)}
            >
              <Ionicons name="close-circle-outline" size={18} color={theme.card} />
              <Text style={styles.cancelBtnText}>Cancel Attendance</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}> 
        <Text style={{ color: theme.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <View style={[styles.header, { backgroundColor: theme.primary }]}> 
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>{user?.name}</Text>
      </View>
      {/* Storage Summary */}
      {storageSummary && (
        <View style={[styles.storageSummary, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.storageTitle, { color: theme.text }]}>Storage Summary</Text>
          <View style={styles.storageStats}>
            <View style={styles.storageStat}>
              <Text style={[styles.storageStatLabel, { color: theme.textSecondary }]}>Total Users</Text>
              <Text style={[styles.storageStatValue, { color: theme.text }]}>{storageSummary.totalUsers}</Text>
            </View>
            <View style={styles.storageStat}>
              <Text style={[styles.storageStatLabel, { color: theme.textSecondary }]}>Employees</Text>
              <Text style={[styles.storageStatValue, { color: theme.text }]}>{storageSummary.employeeCount}</Text>
            </View>
            <View style={styles.storageStat}>
              <Text style={[styles.storageStatLabel, { color: theme.textSecondary }]}>Attendance Records</Text>
              <Text style={[styles.storageStatValue, { color: theme.text }]}>{storageSummary.attendanceRecords}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#2563eb' }]}
          onPress={() => navigation.navigate('ManageAdminRequests')}
          activeOpacity={0.8}
        >
          <Ionicons name="account-check-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>Admin Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          onPress={() => setGeoModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="map-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>Manage Geofences</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.error }]}
          onPress={handleClearAttendanceRecords}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>Clear Attendance</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#dc2626' }]}
          onPress={handleClearAllEmployeeRecords}
          activeOpacity={0.8}
        >
          <Ionicons name="warning-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>Clear All Employees</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.stickySlicer}>{renderDeptSlicer()}</View>
      <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 18, marginTop: 10 }]}>Employees</Text>
      <FlatList
        data={filteredEmployees}
        renderItem={renderEmployee}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 40 }}>No employees found.</Text>}
        showsVerticalScrollIndicator={false}
      />
      {/* Geofence Management Modal */}
      <Modal
        visible={geoModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setGeoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}> 
            <Text style={[styles.modalTitle, { color: theme.text }]}>Manage Geofences</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {employees.map(emp => (
                <View key={emp.id} style={styles.geoEmpRow}>
                  <Text style={[styles.geoEmpName, { color: theme.text }]}>{emp.name}</Text>
                  <Text style={[styles.geoEmpDept, { color: theme.textSecondary }]}>{emp.department}</Text>
                  <Text style={[styles.geoEmpLoc, { color: theme.textSecondary }]}>Assigned: {emp.assignedLocation ? emp.assignedLocation.name : 'None'}</Text>
                  <TouchableOpacity
                    style={styles.geoAssignBtn}
                    onPress={() => openGeoModal(emp)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="location-outline" size={18} color={theme.primary} />
                    <Text style={[styles.geoAssignBtnText, { color: theme.primary }]}>Assign/Update</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            {/* If an employee is selected, show the form */}
            {selectedEmployee && (
              <View style={styles.geoFormSection}>
                <Text style={[styles.geoFormTitle, { color: theme.text }]}>Assign Geofence to {selectedEmployee.name}</Text>
                <TextInput
                  style={styles.geoInput}
                  placeholder="Location Name"
                  value={geoForm.name}
                  onChangeText={v => setGeoForm(f => ({ ...f, name: v }))}
                  placeholderTextColor={theme.textSecondary}
                />
                <TextInput
                  style={styles.geoInput}
                  placeholder="Latitude"
                  value={geoForm.latitude}
                  onChangeText={v => setGeoForm(f => ({ ...f, latitude: v }))}
                  keyboardType="numeric"
                  placeholderTextColor={theme.textSecondary}
                />
                <TextInput
                  style={styles.geoInput}
                  placeholder="Longitude"
                  value={geoForm.longitude}
                  onChangeText={v => setGeoForm(f => ({ ...f, longitude: v }))}
                  keyboardType="numeric"
                  placeholderTextColor={theme.textSecondary}
                />
                <TextInput
                  style={styles.geoInput}
                  placeholder="Radius (meters)"
                  value={geoForm.radius}
                  onChangeText={v => setGeoForm(f => ({ ...f, radius: v }))}
                  keyboardType="numeric"
                  placeholderTextColor={theme.textSecondary}
                />
                <TouchableOpacity
                  style={[styles.geoSaveBtn, { backgroundColor: theme.primary, opacity: savingGeo ? 0.7 : 1 }]}
                  onPress={saveGeofence}
                  disabled={savingGeo}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{savingGeo ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.geoCancelBtn}
                  onPress={() => setSelectedEmployee(null)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: theme.error, fontWeight: '600', fontSize: 15 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: theme.primary }]}
              onPress={() => { setGeoModalVisible(false); setSelectedEmployee(null); }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 16, color: '#fff', opacity: 0.8, marginTop: 5 },
  stickySlicer: {
    zIndex: 10,
    backgroundColor: 'transparent',
    paddingTop: 6,
    paddingBottom: 2,
    borderBottomWidth: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 10,
  },
  slicerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  slicerButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  slicerText: {
    color: '#2563eb',
    fontWeight: '500',
    fontSize: 16,
  },
  listContainer: { padding: 15, paddingBottom: 40 },
  empCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: '#fff',
  },
  empRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  empName: { fontSize: 17, fontWeight: 'bold' },
  empEmail: { fontSize: 14, marginTop: 2 },
  statusBadgeRow: { alignItems: 'flex-end' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
    minWidth: 110,
    justifyContent: 'center',
  },
  statusBadgeText: { color: '#fff', fontWeight: '600', marginLeft: 6, fontSize: 13 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  empDept: { fontSize: 13 },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginLeft: 8,
    backgroundColor: '#ef4444',
    minWidth: 120,
    justifyContent: 'center',
  },
  cancelBtnText: { color: '#fff', fontWeight: '600', marginLeft: 6, fontSize: 13 },
  manageGeoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    backgroundColor: '#e0e7ff',
    marginBottom: 6,
  },
  manageGeoBtnText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '92%',
    borderRadius: 18,
    padding: 18,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  geoEmpRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 10,
    marginBottom: 2,
  },
  geoEmpName: {
    fontSize: 16,
    fontWeight: '600',
  },
  geoEmpDept: {
    fontSize: 13,
    marginBottom: 2,
  },
  geoEmpLoc: {
    fontSize: 13,
    marginBottom: 4,
  },
  geoAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#f1f5ff',
  },
  geoAssignBtnText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  geoFormSection: {
    width: '100%',
    marginTop: 18,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  geoFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  geoInput: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 10,
    color: '#222',
  },
  geoSaveBtn: {
    width: '100%',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  geoCancelBtn: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  closeModalBtn: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  // New styles for storage management
  storageSummary: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  storageStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  storageStat: {
    alignItems: 'center',
  },
  storageStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  storageStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AdminDashboardScreen; 