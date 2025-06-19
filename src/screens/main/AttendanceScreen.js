"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_native_1 = require("react-native");
var AuthContext_1 = require("../../contexts/AuthContext");
var ThemeContext_1 = require("../../contexts/ThemeContext");
var async_storage_1 = require("@react-native-async-storage/async-storage");
var vector_icons_1 = require("@expo/vector-icons");
var expo_linear_gradient_1 = require("expo-linear-gradient");
var native_1 = require("@react-navigation/native");
var width = react_native_1.Dimensions.get('window').width;
var FILTERS = [
    { label: 'All Time', value: 'all' },
    { label: 'Past Week', value: 'week' },
    { label: 'Past Month', value: 'month' },
];
var AttendanceScreen = function () {
    var user = (0, AuthContext_1.useAuth)().user;
    var _a = (0, ThemeContext_1.useTheme)(), theme = _a.theme, isDark = _a.isDark;
    var _b = (0, react_1.useState)([]), attendanceHistory = _b[0], setAttendanceHistory = _b[1];
    var _c = (0, react_1.useState)('all'), filter = _c[0], setFilter = _c[1];
    var _d = (0, react_1.useState)([]), departments = _d[0], setDepartments = _d[1];
    var _e = (0, react_1.useState)('All'), selectedDept = _e[0], setSelectedDept = _e[1];
    var _f = (0, react_1.useState)([]), allUsers = _f[0], setAllUsers = _f[1];
    var _g = (0, react_1.useState)(true), loading = _g[0], setLoading = _g[1];
    var _h = (0, react_1.useState)(false), refreshing = _h[0], setRefreshing = _h[1];
    // Function to fetch attendance history
    var fetchHistory = (0, react_1.useCallback)(function () { return __awaiter(void 0, void 0, void 0, function () {
        var usersData, users, employees_1, keys, attendanceKeys, attendanceData, history_1, uniqueDepts, filteredDepts, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!user)
                        return [2 /*return*/];
                    setLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, 6, 7]);
                    console.log('Attendance screen: Fetching records for role:', user.role);
                    return [4 /*yield*/, async_storage_1.default.getItem('users')];
                case 2:
                    usersData = _a.sent();
                    users = usersData ? JSON.parse(usersData) : [];
                    setAllUsers(users);
                    employees_1 = users.filter(function (u) { return u.role === 'employee'; });
                    console.log("Found ".concat(employees_1.length, " employees in the system"));
                    return [4 /*yield*/, async_storage_1.default.getAllKeys()];
                case 3:
                    keys = _a.sent();
                    attendanceKeys = keys.filter(function (key) { return key.startsWith('attendance_'); });
                    console.log("Found ".concat(attendanceKeys.length, " attendance records keys"));
                    return [4 /*yield*/, async_storage_1.default.multiGet(attendanceKeys)];
                case 4:
                    attendanceData = _a.sent();
                    history_1 = [];
                    attendanceData.forEach(function (_a) {
                        var key = _a[0], value = _a[1];
                        if (value) {
                            try {
                                var record_1 = JSON.parse(value);
                                // Add extra debug info to identify record details
                                console.log("Record: ".concat(key, ", email: ").concat(record_1.email, ", name: ").concat(record_1.name || 'missing'));
                                // For admins, ensure each record has complete employee data
                                if (user.role === 'admin' && (!record_1.name || !record_1.department)) {
                                    var employeeData = employees_1.find(function (e) { return e.email === record_1.email; });
                                    if (employeeData) {
                                        record_1.name = record_1.name || employeeData.name;
                                        record_1.department = record_1.department || employeeData.department;
                                    }
                                }
                                history_1.push(record_1);
                            }
                            catch (e) {
                                console.error('Error parsing record:', key, e);
                            }
                        }
                    });
                    // For admins, if we don't have enough records, add demo/empty records for each employee
                    if (user.role === 'admin' && history_1.length === 0 && employees_1.length > 0) {
                        console.log('No attendance records found, creating placeholder entries for admin view');
                        // Create a placeholder record for each employee to show in the admin view
                        history_1 = employees_1.map(function (emp) { return ({
                            email: emp.email,
                            name: emp.name,
                            department: emp.department,
                            date: new Date().toISOString().split('T')[0],
                            checkInTime: new Date().toISOString(),
                            status: 'No attendance recorded',
                        }); });
                    }
                    // Sort by check-in time, most recent first
                    history_1.sort(function (a, b) {
                        var dateA = new Date(a.checkInTime || a.date || 0);
                        var dateB = new Date(b.checkInTime || b.date || 0);
                        return dateB.getTime() - dateA.getTime();
                    });
                    uniqueDepts = Array.from(new Set(users.map(function (u) { return u.department; }).filter(Boolean)));
                    filteredDepts = uniqueDepts.filter(function (dept) { return dept !== 'All'; });
                    // Add 'All' at the beginning
                    setDepartments(__spreadArray(['All'], filteredDepts, true));
                    // Filter by user if not admin
                    if (user.role !== 'admin') {
                        history_1 = history_1.filter(function (rec) { return rec.email === user.email; });
                        console.log("Filtered to ".concat(history_1.length, " records for employee: ").concat(user.email));
                    }
                    else {
                        console.log("Admin view showing all ".concat(history_1.length, " attendance records"));
                        // For debugging, log each record in admin view
                        if (history_1.length > 0) {
                            console.log('Sample of records in admin view:');
                            history_1.slice(0, 3).forEach(function (rec, idx) {
                                console.log("Record ".concat(idx, ": ").concat(rec.email, ", ").concat(rec.name, ", ").concat(rec.department));
                            });
                        }
                    }
                    setAttendanceHistory(history_1);
                    return [3 /*break*/, 7];
                case 5:
                    error_1 = _a.sent();
                    console.error('Error fetching attendance data:', error_1);
                    return [3 /*break*/, 7];
                case 6:
                    setLoading(false);
                    setRefreshing(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); }, [user]);
    // Initial load
    (0, react_1.useEffect)(function () {
        fetchHistory();
    }, [fetchHistory]);
    // Refresh when screen comes into focus
    (0, native_1.useFocusEffect)((0, react_1.useCallback)(function () {
        console.log('Attendance screen focused - refreshing data');
        fetchHistory();
    }, [fetchHistory]));
    // Handle pull-to-refresh
    var onRefresh = (0, react_1.useCallback)(function () {
        setRefreshing(true);
        fetchHistory();
    }, [fetchHistory]);
    // Filter history by department (admin only) and time period
    var filteredHistory = react_1.default.useMemo(function () {
        var history = __spreadArray([], attendanceHistory, true);
        // Filter by department if admin
        if ((user === null || user === void 0 ? void 0 : user.role) === 'admin' && selectedDept !== 'All') {
            history = history.filter(function (rec) { return rec.department === selectedDept; });
        }
        // Apply time filter
        if (filter !== 'all') {
            var now_1 = new Date();
            return history.filter(function (item) {
                var dateObj = new Date(item.checkInTime || item.date || 0);
                if (filter === 'week') {
                    var weekAgo = new Date(now_1);
                    weekAgo.setDate(now_1.getDate() - 7);
                    return dateObj >= weekAgo && dateObj <= now_1;
                }
                else if (filter === 'month') {
                    var monthAgo = new Date(now_1);
                    monthAgo.setMonth(now_1.getMonth() - 1);
                    return dateObj >= monthAgo && dateObj <= now_1;
                }
                return true;
            });
        }
        return history;
    }, [attendanceHistory, filter, user, selectedDept]);
    // Calculate statistics
    var stats = react_1.default.useMemo(function () {
        var total = filteredHistory.length;
        var checkIns = filteredHistory.filter(function (item) { return item.checkInTime && !item.checkOutTime; }).length;
        var checkOuts = filteredHistory.filter(function (item) { return item.checkOutTime; }).length;
        // Calculate average hours if applicable
        var avgHours = 0;
        var recordsWithHours = filteredHistory.filter(function (item) { return item.totalHours; });
        if (recordsWithHours.length > 0) {
            avgHours = recordsWithHours.reduce(function (sum, item) { return sum + (item.totalHours || 0); }, 0) / recordsWithHours.length;
        }
        return {
            total: total,
            checkIns: checkIns,
            checkOuts: checkOuts,
            avgHours: avgHours.toFixed(1),
        };
    }, [filteredHistory]);
    var renderAttendanceItem = function (_a) {
        var item = _a.item;
        // Format dates and times
        var checkInDate = new Date(item.checkInTime || item.date || 0);
        var formattedDate = checkInDate.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        var checkInTime = checkInDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        var checkOutTime = "";
        if (item.checkOutTime) {
            var checkOutDate = new Date(item.checkOutTime);
            checkOutTime = checkOutDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        var isCompleted = !!item.checkOutTime;
        return (<react_native_1.View style={[styles.attendanceItem, { backgroundColor: theme.card, shadowColor: theme.shadowColor }]}>
        <react_native_1.View style={[styles.dateContainer, { backgroundColor: theme.primary }]}>
          <react_native_1.Text style={[styles.dateText, { color: '#fff' }]}>{formattedDate}</react_native_1.Text>
        </react_native_1.View>
        
        <react_native_1.View style={styles.attendanceDetails}>
          <react_native_1.View style={styles.timeRow}>
            <react_native_1.View style={styles.timeContainer}>
              <react_native_1.View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' }]}>
                <vector_icons_1.Ionicons name="log-in-outline" size={18} color={theme.primary}/>
              </react_native_1.View>
              <react_native_1.View>
                <react_native_1.Text style={[styles.timeLabel, { color: theme.textSecondary }]}>Check In</react_native_1.Text>
                <react_native_1.Text style={[styles.timeValue, { color: theme.text }]}>{checkInTime}</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>
            
            {item.checkOutTime && (<react_native_1.View style={styles.timeContainer}>
                <react_native_1.View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)' }]}>
                  <vector_icons_1.Ionicons name="log-out-outline" size={18} color={isCompleted ? theme.error : theme.textSecondary}/>
                </react_native_1.View>
                <react_native_1.View>
                  <react_native_1.Text style={[styles.timeLabel, { color: theme.textSecondary }]}>Check Out</react_native_1.Text>
                  <react_native_1.Text style={[styles.timeValue, { color: theme.text }]}>{checkOutTime}</react_native_1.Text>
                </react_native_1.View>
              </react_native_1.View>)}
          </react_native_1.View>
          
          {item.totalHours !== undefined && (<react_native_1.View style={[styles.hoursContainer, { borderTopColor: theme.border }]}>
              <react_native_1.Text style={[styles.hoursLabel, { color: theme.textSecondary }]}>Hours</react_native_1.Text>
              <react_native_1.Text style={[styles.hoursValue, { color: theme.success }]}>{item.totalHours}</react_native_1.Text>
            </react_native_1.View>)}
          
          {/* Always show employee info in admin view */}
          {(user === null || user === void 0 ? void 0 : user.role) === 'admin' && (<react_native_1.View style={[styles.employeeInfo, { borderTopColor: theme.border }]}>
              <vector_icons_1.Ionicons name="person-outline" size={16} color={theme.textSecondary} style={styles.employeeIcon}/>
              <react_native_1.Text style={[styles.employeeName, { color: theme.text }]}>{item.name || 'Unknown'}</react_native_1.Text>
              <react_native_1.Text style={[styles.employeeDept, { color: theme.textSecondary }]}>{item.department || 'No Department'}</react_native_1.Text>
            </react_native_1.View>)}
        </react_native_1.View>
      </react_native_1.View>);
    };
    var renderFilterChips = function () { return (<react_native_1.View style={styles.filterChips}>
      {FILTERS.map(function (f) { return (<react_native_1.TouchableOpacity key={f.value} style={[
                styles.filterChip,
                { backgroundColor: theme.card, shadowColor: theme.shadowColor },
                filter === f.value && [styles.activeFilterChip, { backgroundColor: theme.primary }]
            ]} onPress={function () { return setFilter(f.value); }} activeOpacity={0.7}>
          <react_native_1.Text style={[
                styles.filterChipText,
                { color: theme.text },
                filter === f.value && [styles.activeFilterChipText, { color: '#fff' }]
            ]}>
            {f.label}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>); })}
    </react_native_1.View>); };
    return (<react_native_1.View style={[styles.container, { backgroundColor: theme.background }]}>
      <expo_linear_gradient_1.LinearGradient colors={isDark ? ['#1E40AF', '#1E3A8A'] : ['#3B82F6', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <react_native_1.Text style={styles.title}>Attendance Records</react_native_1.Text>
        {(user === null || user === void 0 ? void 0 : user.role) === 'admin' ? (<react_native_1.Text style={styles.subtitle}>All Employees</react_native_1.Text>) : (<react_native_1.Text style={styles.subtitle}>{user === null || user === void 0 ? void 0 : user.name}</react_native_1.Text>)}
      </expo_linear_gradient_1.LinearGradient>

      {/* Department Filter - only for admin */}
      {(user === null || user === void 0 ? void 0 : user.role) === 'admin' && (<react_native_1.View style={styles.deptFilterWrapper}>
          <react_native_1.Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Department:</react_native_1.Text>
          <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deptFilterScroll}>
            {departments.map(function (dept, index) { return (<react_native_1.TouchableOpacity key={"dept-".concat(index)} style={[
                    styles.deptChip,
                    { backgroundColor: theme.card, shadowColor: theme.shadowColor },
                    selectedDept === dept && [styles.activeDeptChip, { backgroundColor: theme.primary }]
                ]} onPress={function () { return setSelectedDept(dept); }} activeOpacity={0.7}>
                <react_native_1.Text style={[
                    styles.deptChipText,
                    { color: theme.text },
                    selectedDept === dept && [styles.activeDeptChipText, { color: '#fff' }]
                ]}>
                  {dept}
                </react_native_1.Text>
              </react_native_1.TouchableOpacity>); })}
          </react_native_1.ScrollView>
        </react_native_1.View>)}

      {/* Stats Cards */}
      <react_native_1.View style={styles.statsContainer}>
        <react_native_1.View style={styles.statsRow}>
          <react_native_1.View style={[styles.statCard, { backgroundColor: theme.card, shadowColor: theme.shadowColor }]}>
            <expo_linear_gradient_1.LinearGradient colors={isDark ?
            ['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.05)'] :
            ['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']} style={styles.statCardGradient}>
              <vector_icons_1.MaterialCommunityIcons name="calendar-check" size={20} color={theme.primary}/>
              <react_native_1.Text style={[styles.statValue, { color: theme.primary }]}>{stats.total}</react_native_1.Text>
              <react_native_1.Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Records</react_native_1.Text>
            </expo_linear_gradient_1.LinearGradient>
          </react_native_1.View>
          
          <react_native_1.View style={[styles.statCard, { backgroundColor: theme.card, shadowColor: theme.shadowColor }]}>
            <expo_linear_gradient_1.LinearGradient colors={isDark ?
            ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)'] :
            ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']} style={styles.statCardGradient}>
              <vector_icons_1.MaterialCommunityIcons name="clock-outline" size={20} color={theme.success}/>
              <react_native_1.Text style={[styles.statValue, { color: theme.success }]}>{stats.avgHours}</react_native_1.Text>
              <react_native_1.Text style={[styles.statLabel, { color: theme.textSecondary }]}>Avg Hours</react_native_1.Text>
            </expo_linear_gradient_1.LinearGradient>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.View>

      {/* Filter Chips */}
      <react_native_1.View style={styles.filterContainer}>
        {renderFilterChips()}
      </react_native_1.View>

      {/* Attendance List */}
      <react_native_1.View style={styles.content}>
        <react_native_1.View style={styles.listHeader}>
          <react_native_1.Text style={[styles.sectionTitle, { color: theme.text }]}>Attendance History</react_native_1.Text>
        </react_native_1.View>
        
        {loading ? (<react_native_1.ActivityIndicator size="large" color={theme.primary}/>) : filteredHistory.length === 0 ? (<react_native_1.View style={styles.emptyContainer}>
            <vector_icons_1.Ionicons name="calendar" size={48} color={theme.textSecondary}/>
            <react_native_1.Text style={[styles.emptyText, { color: theme.text }]}>No Records Found</react_native_1.Text>
            <react_native_1.Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              {filter !== 'all'
                ? 'Try changing your filter settings'
                : (user === null || user === void 0 ? void 0 : user.role) === 'admin' && selectedDept !== 'All'
                    ? 'No records for this department'
                    : 'Check-ins will appear here'}
            </react_native_1.Text>
          </react_native_1.View>) : (<react_native_1.FlatList data={filteredHistory} renderItem={renderAttendanceItem} keyExtractor={function (item, index) { return "attendance-".concat(index); }} contentContainerStyle={[styles.flatlistContent, { paddingHorizontal: 16 }]} showsVerticalScrollIndicator={false} refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} progressBackgroundColor={theme.card}/>}/>)}
      </react_native_1.View>
    </react_native_1.View>);
};
var styles = react_native_1.StyleSheet.create({
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
exports.default = AttendanceScreen;
