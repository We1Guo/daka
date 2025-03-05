// 全局变量
let currentDate = new Date();
let currentDetailDate = null; // 当前正在查看详情的日期
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
    initStatsSelectors();
    updateStats();
    loadSettings();
    
    // 初始化模态框
    const dayDetailModal = new bootstrap.Modal(document.getElementById('dayDetailModal'));
    
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
    document.getElementById('recordOvertime').addEventListener('click', () => saveOvertime(true));
    document.getElementById('recordLeave').addEventListener('click', () => saveOvertime(false));
    
    // 绑定设置保存
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    
    // 绑定统计报表选择器
    document.getElementById('generateStats').addEventListener('click', generateCustomStats);
    
    // 绑定模态框按钮事件
    document.getElementById('modalCheckIn').addEventListener('click', () => {
        if (currentDetailDate) {
            doCheckIn(currentDetailDate);
            dayDetailModal.hide();
        }
    });
    
    document.getElementById('modalRecordOvertime').addEventListener('click', () => {
        if (currentDetailDate) {
            const hours = parseFloat(document.getElementById('modalOvertimeHours').value);
            if (isNaN(hours)) {
                alert('请输入有效的小时数！');
                return;
            }
            recordPastOvertime(currentDetailDate, true, hours);
            dayDetailModal.hide();
        }
    });
    
    document.getElementById('modalRecordLeave').addEventListener('click', () => {
        if (currentDetailDate) {
            const hours = parseFloat(document.getElementById('modalLeaveHours').value);
            if (isNaN(hours)) {
                alert('请输入有效的小时数！');
                return;
            }
            recordPastOvertime(currentDetailDate, false, hours);
            dayDetailModal.hide();
        }
    });
    
    // 绑定删除打卡按钮
    document.getElementById('modalDeleteAttendance').addEventListener('click', () => {
        if (currentDetailDate) {
            const dateStr = formatDateString(currentDetailDate);
            deleteAttendance(dateStr);
            dayDetailModal.hide();
        }
    });
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
                // 如果是补打卡
                if (attendanceData[dateStr].isMakeup) {
                    dayCell.classList.add('makeup');
                } else {
                    dayCell.classList.add('checked-in');
                }
            }
            
            // 区分加班和请假
            if (attendanceData[dateStr].overtime) {
                const overtime = parseFloat(attendanceData[dateStr].overtime);
                if (overtime > 0) {
                    dayCell.classList.add('has-overtime');
                } else if (overtime < 0) {
                    dayCell.classList.add('has-leave');
                }
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

// 记录加班/请假时间
function saveOvertime(isOvertime) {
    const hoursInput = document.getElementById('overtimeHours');
    let hours = parseFloat(hoursInput.value);
    
    if (isNaN(hours) || hours <= 0) {
        alert('请输入大于0的有效时长！');
        return;
    }
    
    // 如果是请假，将时间变为负值
    if (isOvertime === false) {
        hours = -hours;
    }
    
    const today = new Date();
    const dateStr = formatDateString(today);
    
    if (!attendanceData[dateStr]) {
        attendanceData[dateStr] = {};
    }
    
    attendanceData[dateStr].overtime = hours;
    
    localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
    renderCalendar();
    updateStats();
    
    const message = hours >= 0 ? 
        `加班时间记录成功: ${hours}小时` : 
        `请假时间记录成功: ${Math.abs(hours)}小时`;
        
    alert(message);
    hoursInput.value = '';
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

// 日期详情和补打卡功能 - 使用模态框
function showDayDetails(date) {
    const dateStr = formatDateString(date);
    const dayData = attendanceData[dateStr] || {};
    const today = new Date();
    
    // 如果是未来日期，不允许打卡
    if (date > today) {
        alert('不能为未来日期打卡！');
        return;
    }
    
    // 保存当前查看的日期
    currentDetailDate = date;
    
    // 清空输入框
    document.getElementById('modalOvertimeHours').value = '';
    document.getElementById('modalLeaveHours').value = '';
    
    // 更新模态框标题
    document.getElementById('modalTitle').textContent = date.toLocaleDateString('zh-CN') + ' 详情';
    
    // 准备详情内容
    let detailsHTML = '';
    
    if (dayData.checkedIn) {
        detailsHTML += `<p><strong>打卡状态:</strong> ${dayData.isMakeup ? '已补打卡' : '已打卡'}</p>`;
        detailsHTML += `<p><strong>打卡时间:</strong> ${dayData.checkTime || '未记录'}</p>`;
        
        if (dayData.overtime) {
            const overtime = parseFloat(dayData.overtime);
            if (overtime > 0) {
                detailsHTML += `<p><strong>加班时长:</strong> <span class="overtime-positive">${overtime} 小时</span></p>`;
            } else if (overtime < 0) {
                detailsHTML += `<p><strong>请假时长:</strong> <span class="overtime-negative">${Math.abs(overtime)} 小时</span></p>`;
            }
        }
    } else {
        detailsHTML += `<p><strong>打卡状态:</strong> 未打卡</p>`;
    }
    
    document.getElementById('dayDetails').innerHTML = detailsHTML;
    
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('dayDetailModal'));
    modal.show();
}

// 为过去日期记录加班/请假 - 带预设时长
function recordPastOvertime(date, isOvertime, hours = null) {
    const dateStr = formatDateString(date);
    
    // 如果没有传入小时数，则需要询问
    if (hours === null) {
        const promptText = isOvertime ? 
            `请输入 ${date.toLocaleDateString('zh-CN')} 的加班时长(小时):` : 
            `请输入 ${date.toLocaleDateString('zh-CN')} 的请假时长(小时):`;
        
        const hoursInput = prompt(promptText, '');
        if (hoursInput === null) return; // 用户取消了输入
        
        hours = parseFloat(hoursInput);
        if (isNaN(hours) || hours <= 0) {
            alert('请输入大于0的有效时长！');
            return;
        }
    }
    
    // 如果是输入0，则清除加班/请假记录
    if (hours === 0) {
        if (attendanceData[dateStr] && attendanceData[dateStr].overtime !== undefined) {
            delete attendanceData[dateStr].overtime;
            localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
            renderCalendar();
            updateStats();
            alert('加班/请假记录已清除！');
            return;
        }
    }
    
    // 如果是请假，将时间变为负值
    if (!isOvertime) {
        hours = -hours;
    }
    
    // 如果日期不存在考勤记录，创建一个
    if (!attendanceData[dateStr]) {
        attendanceData[dateStr] = {
            checkedIn: true,
            checkTime: '补录',
            isMakeup: true
        };
    }
    
    attendanceData[dateStr].overtime = hours;
    
    localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
    renderCalendar();
    updateStats();
    
    const message = hours > 0 ? 
        `${date.toLocaleDateString('zh-CN')} 加班记录成功: ${hours}小时` : 
        `${date.toLocaleDateString('zh-CN')} 请假记录成功: ${Math.abs(hours)}小时`;
        
    alert(message);
}

// 初始化统计选择器
function initStatsSelectors() {
    const yearSelect = document.getElementById('statsYear');
    const currentYear = new Date().getFullYear();
    
    // 清空现有选项
    yearSelect.innerHTML = '';
    
    // 添加当前年份和过去5年
    for (let i = 0; i <= 5; i++) {
        const year = currentYear - i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '年';
        yearSelect.appendChild(option);
    }
    
    // 默认选择当前年月
    yearSelect.value = currentYear;
    document.getElementById('statsMonth').value = new Date().getMonth();
}

// 生成自定义统计报表
function generateCustomStats() {
    const year = parseInt(document.getElementById('statsYear').value);
    const monthVal = document.getElementById('statsMonth').value;
    
    if (monthVal === 'all') {
        // 全年统计
        updateYearlyStats(year);
    } else {
        // 月度统计
        const month = parseInt(monthVal);
        updateMonthlyStats(year, month);
    }
}

// 更新统计
function updateStats() {
    // 默认显示当前月份的统计
    const today = new Date();
    updateMonthlyStats(today.getFullYear(), today.getMonth());
}

// 更新月度统计
function updateMonthlyStats(year, month) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    updateStatsForPeriod(startDate, endDate, `${year}年${month + 1}月`);
}

// 更新年度统计
function updateYearlyStats(year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    updateStatsForPeriod(startDate, endDate, `${year}年全年`);
}

// 更新指定时间段的统计
function updateStatsForPeriod(startDate, endDate, periodLabel) {
    // 计算工作日
    let workDays = 0;
    let totalOvertimeHours = 0;
    let totalLeaveHours = 0;
    
    // 创建考勤记录数组
    const records = [];
    
    // 这里使用实际考勤数据进行统计
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDateString(d);
        const dayData = attendanceData[dateStr];
        
        // 如果有考勤记录，进行统计
        if (dayData && dayData.checkedIn) {
            workDays++;
            
            // 如果有加班或请假
            if (dayData.overtime) {
                const hours = parseFloat(dayData.overtime);
                if (hours > 0) {
                    totalOvertimeHours += hours;
                } else if (hours < 0) {
                    totalLeaveHours += Math.abs(hours);
                }
            }
            
            // 添加到记录数组
            records.push({
                date: dateStr,
                checkTime: dayData.checkTime || '-',
                overtime: dayData.overtime || 0,
                isMakeup: dayData.isMakeup || false
            });
        }
    }
    
    // 计算预计工资
    const salary = calculateSalary(workDays, totalOvertimeHours, totalLeaveHours);
    
    // 更新统计卡片
    document.getElementById('workDays').textContent = workDays;
    document.getElementById('overtimeHoursTotal').textContent = `+${totalOvertimeHours.toFixed(1)}/-${totalLeaveHours.toFixed(1)}`;
    document.getElementById('estimatedSalary').textContent = `¥${salary.toFixed(2)}`;
    
    // 按日期排序记录
    records.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 渲染考勤记录表
    renderAttendanceRecords(records);
}

// 渲染考勤记录表
function renderAttendanceRecords(records) {
    const tbody = document.getElementById('attendanceRecords');
    tbody.innerHTML = '';
    
    if (records.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.textContent = '暂无考勤记录';
        td.className = 'text-center text-muted';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }
    
    records.forEach(record => {
        const tr = document.createElement('tr');
        
        // 日期列
        const dateTd = document.createElement('td');
        const date = new Date(record.date);
        dateTd.textContent = date.toLocaleDateString('zh-CN');
        if (record.isMakeup) {
            const makeupBadge = document.createElement('span');
            makeupBadge.className = 'badge bg-warning ms-1';
            makeupBadge.textContent = '补';
            dateTd.appendChild(makeupBadge);
        }
        tr.appendChild(dateTd);
        
        // 打卡时间列
        const timeTd = document.createElement('td');
        timeTd.textContent = record.checkTime;
        tr.appendChild(timeTd);
        
        // 加班/请假时长列
        const overtimeTd = document.createElement('td');
        const hours = parseFloat(record.overtime);
        if (hours > 0) {
            overtimeTd.textContent = `+${hours.toFixed(1)}h`;
            overtimeTd.className = 'overtime-positive';
        } else if (hours < 0) {
            overtimeTd.textContent = `-${Math.abs(hours).toFixed(1)}h`;
            overtimeTd.className = 'overtime-negative';
        } else {
            overtimeTd.textContent = '-';
        }
        tr.appendChild(overtimeTd);
        
        // 操作列
        const actionTd = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
        deleteBtn.addEventListener('click', () => deleteAttendance(record.date));
        actionTd.appendChild(deleteBtn);
        tr.appendChild(actionTd);
        
        tbody.appendChild(tr);
    });
}

// 计算薪资
function calculateSalary(workDays, overtimeHours, leaveHours) {
    const dailySalary = settings.baseSalary / settings.workDaysPerMonth;
    const hourlyWage = dailySalary / settings.dailyWorkHours;
    
    // 基本工资（根据实际出勤天数）
    const basePay = dailySalary * workDays;
    
    // 加班费
    const overtimePay = hourlyWage * settings.overtimeRate * overtimeHours;
    
    // 请假扣款
    const leavePay = hourlyWage * leaveHours;
    
    // 总工资 = 基本工资 + 加班费 - 请假扣款
    return basePay + overtimePay - leavePay;
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
    alert('设置已保存');
}

// 格式化日期字符串 YYYY-MM-DD
function formatDateString(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}