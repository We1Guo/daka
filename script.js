// 全局变量
let currentDate = new Date();
let attendanceData = JSON.parse(localStorage.getItem('attendanceData')) || {};
let settings = JSON.parse(localStorage.getItem('settings')) || {
    baseSalary: 5000,
    dailyWorkHours: 8,
    workDaysPerMonth: 22,
    overtimeRate: 1.5
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面
    updateTodayDate();
    renderCalendar();
    updateStats();
    loadSettings();
    
    // 绑定导航切换事件
    document.getElementById('calendarTab').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('calendarPage');
    });
    
    document.getElementById('statsTab').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('statsPage');
        updateStats();
    });
    
    document.getElementById('settingsTab').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('settingsPage');
    });
    
    // 绑定月份切换
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    // 绑定打卡按钮
    document.getElementById('checkIn').addEventListener('click', checkInOut);
    document.getElementById('saveOvertime').addEventListener('click', saveOvertime);
    
    // 绑定设置保存
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
});

// 显示指定页面
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    document.getElementById(pageId).classList.add('active');
    
    // 高亮相应的导航项
    if (pageId === 'calendarPage') {
        document.getElementById('calendarTab').classList.add('active');
    } else if (pageId === 'statsPage') {
        document.getElementById('statsTab').classList.add('active');
    } else if (pageId === 'settingsPage') {
        document.getElementById('settingsTab').classList.add('active');
    }
}

// 更新今日日期显示
function updateTodayDate() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('todayDate').textContent = today.toLocaleDateString('zh-CN', options);
}

// 渲染日历
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 更新月份标题
    const monthYearStr = new Date(year, month, 1).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
    document.getElementById('currentMonthYear').textContent = monthYearStr;
    
    // 获取当月第一天
    const firstDayOfMonth = new Date(year, month, 1);
    // 获取当月最后一天
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // 计算上月需要显示的天数
    const firstDayWeekday = firstDayOfMonth.getDay(); // 0 (周日) 到 6 (周六)
    
    // 计算总共需要的单元格数量
    const daysInMonth = lastDayOfMonth.getDate();
    const totalCells = Math.ceil((daysInMonth + firstDayWeekday) / 7) * 7;
    
    // 清空日历
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    // 填充日历单元格
    for (let i = 0; i < totalCells; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        const cellDate = new Date(year, month, i - firstDayWeekday + 1);
        const dateStr = formatDateString(cellDate);
        
        // 设置日期数字
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = cellDate.getDate();
        dayCell.appendChild(dayNumber);
        
        // 如果是其他月份的日期
        if (cellDate.getMonth() !== month) {
            dayCell.classList.add('other-month');
        }
        
        // 如果是周末
        if (cellDate.getDay() === 0 || cellDate.getDay() === 6) {
            dayCell.classList.add('weekend');
        }
        
        // 如果是今天
        if (cellDate.toDateString() === new Date().toDateString()) {
            dayCell.classList.add('today');
        }
        
        // 如果有考勤记录
        if (attendanceData[dateStr]) {
            if (attendanceData[dateStr].checkedIn) {
                dayCell.classList.add('checked-in');
                
                // 如果是补打卡
                if (attendanceData[dateStr].isMakeup) {
                    dayCell.classList.add('makeup');
                }
            }
            if (attendanceData[dateStr].overtime > 0) {
                dayCell.classList.add('has-overtime');
            }
        }
        
        // 添加点击事件
        dayCell.addEventListener('click', () => showDayDetails(cellDate));
        
        calendarDays.appendChild(dayCell);
    }
}

// 打卡功能
function checkInOut() {
    doCheckIn(new Date());
}

// 执行打卡（支持当天和补打卡）
function doCheckIn(date) {
    const now = new Date();
    const dateStr = formatDateString(date);
    const isToday = date.toDateString() === now.toDateString();
    
    if (!attendanceData[dateStr]) {
        attendanceData[dateStr] = {};
    }
    
    attendanceData[dateStr].checkedIn = true;
    attendanceData[dateStr].checkTime = now.toLocaleTimeString();
    
    // 如果不是今天，标记为补打卡
    if (!isToday) {
        attendanceData[dateStr].isMakeup = true;
    }
    
    localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
    renderCalendar();
    updateStats();
    
    const message = isToday ? '打卡成功！' : '补打卡成功！';
    alert(`${message}时间：${now.toLocaleTimeString()}`);
}

// 记录加班时间
function saveOvertime() {
    const overtimeHours = parseFloat(document.getElementById('overtimeHours').value);
    
    if (isNaN(overtimeHours) || overtimeHours < 0) {
        alert('请输入有效的加班时长！');
        return;
    }
    
    const today = new Date();
    const dateStr = formatDateString(today);
    
    if (!attendanceData[dateStr]) {
        attendanceData[dateStr] = {};
    }
    
    attendanceData[dateStr].overtime = overtimeHours;
    
    localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
    renderCalendar();
    updateStats();
    
    alert('加班时间记录成功！');
    document.getElementById('overtimeHours').value = '';
}

// 删除打卡记录
function deleteAttendance(dateStr) {
    if (confirm('确定要删除这条打卡记录吗？')) {
        delete attendanceData[dateStr];
        localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
        renderCalendar();
        updateStats();
        alert('记录已删除');
    }
}

// 日期详情和补打卡功能
function showDayDetails(date) {
    const dateStr = formatDateString(date);
    const dayData = attendanceData[dateStr] || {};
    const today = new Date();
    
    // 如果是未来日期，不允许打卡
    if (date > today) {
        alert('不能为未来日期打卡！');
        return;
    }
    
    // 如果日期已有打卡记录，显示详情
    if (dayData.checkedIn) {
        let message = `日期: ${date.toLocaleDateString('zh-CN')}\n`;
        message += `打卡时间: ${dayData.checkTime || '未记录'}\n`;
        message += `加班时长: ${dayData.overtime || 0} 小时\n`;
        if (dayData.isMakeup) {
            message += `(补打卡记录)`;
        }
        
        // 询问是否需要重新打卡
        if (confirm(message + '\n\n需要重新打卡吗？')) {
            doCheckIn(date);
        }
    } 
    // 如果没有打卡记录，直接询问是否打卡
    else {
        if (confirm(`是否要为 ${date.toLocaleDateString('zh-CN')} 打卡？`)) {
            doCheckIn(date);
        }
    }
}

// 更新统计数据
function updateStats() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    let workDays = 0;
    let totalOvertimeHours = 0;
    let totalSalary = 0;
    
    // 清空考勤记录表
    const recordsContainer = document.getElementById('attendanceRecords');
    recordsContainer.innerHTML = '';
    
    // 遍历当月所有日期
    for (let day = 1; day <= 31; day++) {
        const date = new Date(year, month, day);
        
        // 如果日期已经超出当月，则停止循环
        if (date.getMonth() !== month) break;
        
        const dateStr = formatDateString(date);
        
        if (attendanceData[dateStr] && attendanceData[dateStr].checkedIn) {
            workDays++;
            
            if (attendanceData[dateStr].overtime) {
                totalOvertimeHours += parseFloat(attendanceData[dateStr].overtime);
            }
            
            // 添加到考勤记录表
            const row = document.createElement('tr');
            
            const dateCell = document.createElement('td');
            dateCell.textContent = date.toLocaleDateString('zh-CN');
            if (attendanceData[dateStr].isMakeup) {
                dateCell.innerHTML += ' <span class="badge bg-warning">补</span>';
            }
            row.appendChild(dateCell);
            
            const checkTimeCell = document.createElement('td');
            checkTimeCell.textContent = attendanceData[dateStr].checkTime || '-';
            row.appendChild(checkTimeCell);
            
            const overtimeCell = document.createElement('td');
            overtimeCell.textContent = attendanceData[dateStr].overtime || '0';
            row.appendChild(overtimeCell);
            
            // 添加操作列
            const actionCell = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-danger';
            deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
            deleteBtn.addEventListener('click', () => deleteAttendance(dateStr));
            actionCell.appendChild(deleteBtn);
            row.appendChild(actionCell);
            
            recordsContainer.appendChild(row);
        }
    }
    
    // 计算预计工资
    const dailyRate = settings.baseSalary / settings.workDaysPerMonth;
    totalSalary = workDays * dailyRate;
    
    // 加班工资
    const hourlyRate = settings.baseSalary / (settings.workDaysPerMonth * settings.dailyWorkHours);
    const overtimePay = totalOvertimeHours * hourlyRate * settings.overtimeRate;
    totalSalary += overtimePay;
    
    // 更新统计显示
    document.getElementById('workDays').textContent = workDays;
    document.getElementById('overtimeHoursTotal').textContent = totalOvertimeHours.toFixed(1);
    document.getElementById('estimatedSalary').textContent = '¥' + totalSalary.toFixed(2);
}

// 加载设置
function loadSettings() {
    document.getElementById('baseSalary').value = settings.baseSalary;
    document.getElementById('dailyWorkHours').value = settings.dailyWorkHours;
    document.getElementById('workDaysPerMonth').value = settings.workDaysPerMonth;
    document.getElementById('overtimeRate').value = settings.overtimeRate;
}

// 保存设置
function saveSettings() {
    settings.baseSalary = parseFloat(document.getElementById('baseSalary').value);
    settings.dailyWorkHours = parseFloat(document.getElementById('dailyWorkHours').value);
    settings.workDaysPerMonth = parseInt(document.getElementById('workDaysPerMonth').value);
    settings.overtimeRate = parseFloat(document.getElementById('overtimeRate').value);
    
    localStorage.setItem('settings', JSON.stringify(settings));
    updateStats();
    
    alert('设置已保存！');
}

// 格式化日期为 YYYY-MM-DD 字符串
function formatDateString(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}