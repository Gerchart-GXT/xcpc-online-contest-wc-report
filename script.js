// 全局变量
let teams = [];
let currentToilet = [];
let history = [];
let timers = {};
let toiletFormat = '{university} {teamName} {memberName} 上厕所';
let returnFormat = '{university} {teamName} {memberName} 已返回';
let parseFormatTemplate = '{university} {teamName} {member1} {member2} {member3}';
let memberInfoTemplate = '{university} {teamName} {memberName}';

// 初始化
document.addEventListener('DOMContentLoaded', function () {
    if (!localStorage.getItem('hasSeenAnnouncement')) {
        setTimeout(showAnnouncement, 500);
    }
    loadFromStorage();
    renderTeams();
    renderCurrentToilet();
    renderHistory();
    setupModalEvents();

    // 定时更新正在上厕所的时间
    setInterval(updateTimers, 1000);
});

// 从localStorage加载数据
function loadFromStorage() {
    const savedUniversity = localStorage.getItem('universityName');
    if (savedUniversity) {
        document.getElementById('universityName').value = savedUniversity;
    }

    const savedTeams = localStorage.getItem('teams');
    if (savedTeams) {
        teams = JSON.parse(savedTeams);
        document.getElementById('teamInput').value = teams.map(team =>
            `${team.chineseName}\t${team.englishName}\t${team.members.join('\t')}`
        ).join('\n');
    }

    const savedHistory = localStorage.getItem('history');
    if (savedHistory) {
        history = JSON.parse(savedHistory);
    }

    const savedToiletFormat = localStorage.getItem('toiletFormat');
    if (savedToiletFormat) {
        toiletFormat = savedToiletFormat;
        document.getElementById('toiletFormat').value = toiletFormat;
    } else {
        document.getElementById('toiletFormat').value = toiletFormat;
    }

    const savedReturnFormat = localStorage.getItem('returnFormat');
    if (savedReturnFormat) {
        returnFormat = savedReturnFormat;
        document.getElementById('returnFormat').value = returnFormat;
    } else {
        document.getElementById('returnFormat').value = returnFormat;
    }

    const savedParseFormat = localStorage.getItem('parseFormatTemplate');
    if (savedParseFormat) {
        parseFormatTemplate = savedParseFormat;
        document.getElementById('parseFormat').value = parseFormatTemplate;
    } else {
        document.getElementById('parseFormat').value = parseFormatTemplate;
    }

    const savedMemberInfoFormat = localStorage.getItem('memberInfoTemplate');
    if (savedMemberInfoFormat) {
        memberInfoTemplate = savedMemberInfoFormat;
        document.getElementById('memberInfoFormat').value = memberInfoTemplate;
    } else {
        document.getElementById('memberInfoFormat').value = memberInfoTemplate;
    }

    // 加载正在上厕所的成员状态
    const savedCurrentToilet = localStorage.getItem('currentToilet');
    if (savedCurrentToilet) {
        currentToilet = JSON.parse(savedCurrentToilet);
        // 重新初始化计时器
        currentToilet.forEach(person => {
            const timerKey = `${person.teamIndex}-${person.memberIndex}`;
            timers[timerKey] = new Date(person.startTime);
        });
    }
}

// 保存到localStorage
function saveToStorage() {
    localStorage.setItem('universityName', document.getElementById('universityName').value);
    localStorage.setItem('teams', JSON.stringify(teams));
    localStorage.setItem('history', JSON.stringify(history));
    localStorage.setItem('toiletFormat', toiletFormat);
    localStorage.setItem('returnFormat', returnFormat);
    localStorage.setItem('parseFormatTemplate', parseFormatTemplate);
    localStorage.setItem('memberInfoTemplate', memberInfoTemplate);
    localStorage.setItem('currentToilet', JSON.stringify(currentToilet));
}

// 解析队伍信息
function parseTeams() {
    const input = document.getElementById('teamInput').value.trim();
    if (!input) {
        alert('请输入队伍信息');
        return;
    }

    const university = document.getElementById('universityName').value.trim();

    teams = [];
    const lines = input.split('\n');

    // 解析格式模板，提取变量位置
    const formatParts = parseFormatTemplate.split(/\s+/);
    const variableMap = {};

    formatParts.forEach((part, index) => {
        if (part.includes('{') && part.includes('}')) {
            const variable = part.replace(/[{}]/g, '');
            variableMap[variable] = index;
        }
    });

    lines.forEach((line, index) => {
        const parts = line.trim().split(/\s+/);

        // 计算期望的最小字段数量（排除university字段，因为它来自输入框）
        const expectedFields = Object.keys(variableMap).filter(key => key !== 'university').length;

        if (parts.length >= expectedFields) {
            const teamData = {
                chineseName: '',
                englishName: '',
                members: ['', '', ''],
                hasEnglish: false
            };

            // 根据格式模板提取数据
            if (variableMap.university !== undefined) {
                // university字段从输入框获取，不从数据行解析
                // 但需要调整其他字段的索引
                Object.keys(variableMap).forEach(key => {
                    if (key !== 'university' && variableMap[key] > variableMap.university) {
                        variableMap[key]--;
                    }
                });
                delete variableMap.university; // 移除university变量，因为不需要从数据中解析
            }

            if (variableMap.teamName !== undefined) {
                teamData.chineseName = parts[variableMap.teamName] || '';
            }

            if (variableMap.englishName !== undefined && parts[variableMap.englishName]) {
                teamData.englishName = parts[variableMap.englishName] || '';
                teamData.hasEnglish = true;
            }

            if (variableMap.member1 !== undefined) {
                teamData.members[0] = parts[variableMap.member1] || '';
            }

            if (variableMap.member2 !== undefined) {
                teamData.members[1] = parts[variableMap.member2] || '';
            }

            if (variableMap.member3 !== undefined) {
                teamData.members[2] = parts[variableMap.member3] || '';
            }

            // 检查必要字段是否存在
            if (teamData.chineseName && teamData.members[0] && teamData.members[1] && teamData.members[2]) {
                teams.push(teamData);
            }
        }
    });

    if (teams.length === 0) {
        alert('没有解析到有效的队伍信息，请检查格式是否正确');
        return;
    }

    saveToStorage();
    renderTeams();
}

// 渲染队伍表格
function renderTeams() {
    const container = document.getElementById('teamsTable');
    container.innerHTML = '';

    teams.forEach((team, teamIndex) => {
        const table = document.createElement('table');
        table.className = team.hasEnglish ? 'team-table with-english' : 'team-table without-english';

        // 表头
        const thead = document.createElement('thead');
        if (team.hasEnglish) {
            thead.innerHTML = `
                <tr>
                    <th>中文队名</th>
                    <th>英文队名</th>
                    <th>队员1</th>
                    <th>队员2</th>
                    <th>队员3</th>
                    <th>操作</th>
                </tr>
            `;
        } else {
            thead.innerHTML = `
                <tr>
                    <th>队名</th>
                    <th>队员1</th>
                    <th>队员2</th>
                    <th>队员3</th>
                    <th>操作</th>
                </tr>
            `;
        }
        table.appendChild(thead);

        // 表体
        const tbody = document.createElement('tbody');
        const row = document.createElement('tr');

        if (team.hasEnglish) {
            row.innerHTML = `
                <td>${team.chineseName}</td>
                <td>${team.englishName}</td>
                <td class="member-cell" onclick="showMemberInfo(${teamIndex}, 0)">${team.members[0]}</td>
                <td class="member-cell" onclick="showMemberInfo(${teamIndex}, 1)">${team.members[1]}</td>
                <td class="member-cell" onclick="showMemberInfo(${teamIndex}, 2)">${team.members[2]}</td>
                <td><button class="delete-team-btn" onclick="deleteTeam(${teamIndex})">删除队伍</button></td>
            `;
        } else {
            row.innerHTML = `
                <td>${team.chineseName}</td>
                <td class="member-cell" onclick="showMemberInfo(${teamIndex}, 0)">${team.members[0]}</td>
                <td class="member-cell" onclick="showMemberInfo(${teamIndex}, 1)">${team.members[1]}</td>
                <td class="member-cell" onclick="showMemberInfo(${teamIndex}, 2)">${team.members[2]}</td>
                <td><button class="delete-team-btn" onclick="deleteTeam(${teamIndex})">删除队伍</button></td>
            `;
        }

        tbody.appendChild(row);
        table.appendChild(tbody);

        container.appendChild(table);
    });

    // 更新正在上厕所成员的显示状态
    updateToiletStatus();
}

// 更新厕所状态显示
function updateToiletStatus() {
    currentToilet.forEach(person => {
        const memberCells = document.querySelectorAll('.member-cell');
        memberCells.forEach(cell => {
            if (cell.textContent === person.memberName &&
                teams[person.teamIndex] && teams[person.teamIndex].chineseName === person.teamName) {
                cell.classList.add('in-toilet');
            }
        });
    });
}

// 显示成员信息
function showMemberInfo(teamIndex, memberIndex) {
    const team = teams[teamIndex];
    const memberName = team.members[memberIndex];

    // 检查是否已在上厕所
    const isInToilet = currentToilet.some(p =>
        p.teamIndex === teamIndex && p.memberIndex === memberIndex
    );

    // 构建成员信息HTML
    const memberInfoHtml = `
        <div class="member-info">
            <h4>成员详细信息</h4>
            <div style="background: white; padding: 10px; border-radius: 4px; border: 1px solid #ddd; font-family: monospace; white-space: pre-line; margin: 10px 0;">
${generateMemberInfo(team, memberName, memberIndex + 1)}
            </div>
            <p><strong>当前状态：</strong>${isInToilet ? '🚽 正在上厕所' : '💺 在座位上'}</p>
            <button class="copy-member-btn" onclick="copyMemberInfo(${teamIndex}, ${memberIndex})">复制成员信息</button>
        </div>
    `;

    const modal = document.getElementById('modal');
    const modalText = document.getElementById('modalText');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    modalText.innerHTML = memberInfoHtml;
    modal.style.display = 'block';

    // 清除之前的事件监听器
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;

    if (isInToilet) {
        confirmBtn.textContent = '成员正在上厕所';
        confirmBtn.disabled = true;
        confirmBtn.style.backgroundColor = '#95a5a6';
        confirmBtn.style.cursor = 'not-allowed';
        // 确保没有点击事件
        confirmBtn.onclick = null;
    } else {
        confirmBtn.textContent = '上厕所';
        confirmBtn.disabled = false;
        confirmBtn.style.backgroundColor = '#3498db';
        confirmBtn.style.cursor = 'pointer';

        // 设置点击事件
        confirmBtn.onclick = () => {
            modal.style.display = 'none';
            goToToilet(teamIndex, memberIndex);
        };
    }

    cancelBtn.textContent = '关闭';
    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };
}
// 恢复原来的goToToilet函数，但移除确认对话框部分
function goToToilet(teamIndex, memberIndex) {
    const team = teams[teamIndex];
    const memberName = team.members[memberIndex];
    const university = document.getElementById('universityName').value;

    if (!university) {
        alert('请先输入大学名称');
        return;
    }

    const startTime = new Date();
    const toiletInfo = {
        teamIndex,
        memberIndex,
        teamName: team.chineseName,
        memberName,
        startTime: startTime.toISOString()
    };

    currentToilet.push(toiletInfo);

    const message = generateMessage(toiletFormat, university, team.chineseName, memberName);
    showInfoModal(message, () => {
        saveToStorage(); // 立即保存状态
        renderTeams();
        renderCurrentToilet();
    });
}

// 生成成员信息文本
function generateMemberInfo(team, memberName, memberIndex) {
    const university = document.getElementById('universityName').value.trim();

    return memberInfoTemplate
        .replace(/{university}/g, university)
        .replace(/{teamName}/g, team.chineseName)
        .replace(/{englishName}/g, team.englishName || '')
        .replace(/{memberName}/g, memberName)
        .replace(/{memberIndex}/g, memberIndex);
}

// 复制成员信息
function copyMemberInfo(teamIndex, memberIndex) {
    const team = teams[teamIndex];
    const memberName = team.members[memberIndex];
    const memberInfo = generateMemberInfo(team, memberName, memberIndex + 1);

    navigator.clipboard.writeText(memberInfo).then(() => {
        // 临时改变按钮文本
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '已复制';
        btn.style.backgroundColor = '#27ae60';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = '#17a2b8';
        }, 1000);
    }).catch(err => {
        console.error('复制失败:', err);
        // alert('复制失败，请手动复制');
    });
}

// 结束上厕所
// 结束上厕所
function endToilet(index) {
    const person = currentToilet[index];
    const university = document.getElementById('universityName').value;

    showModal(`确认 ${person.memberName} 已返回吗？`, () => {
        const endTime = new Date();

        // 添加到历史记录
        const historyRecord = {
            teamName: person.teamName,
            memberName: person.memberName,
            startTime: person.startTime,
            endTime: endTime.toISOString(),
            duration: calculateDuration(new Date(person.startTime), endTime)
        };

        history.unshift(historyRecord);

        // 从当前上厕所列表中移除
        currentToilet.splice(index, 1);

        // 清除计时器
        delete timers[`${person.teamIndex}-${person.memberIndex}`];

        const message = generateMessage(returnFormat, university, person.teamName, person.memberName);
        showInfoModal(message, () => {
            saveToStorage(); // 立即保存状态
            renderTeams();
            renderCurrentToilet();
            renderHistory();
        });
    }, '确认返回', '取消'); // 添加自定义按钮文本
}

// 渲染正在上厕所的成员
function renderCurrentToilet() {
    const section = document.getElementById('currentToiletSection');
    const tbody = document.getElementById('currentToiletBody');

    if (currentToilet.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    tbody.innerHTML = '';

    currentToilet.forEach((person, index) => {
        const row = document.createElement('tr');
        const startTime = new Date(person.startTime);

        row.innerHTML = `
            <td>${person.teamName}</td>
            <td>${person.memberName}</td>
            <td>${formatTime(startTime)}</td>
            <td class="timer" id="timer-${person.teamIndex}-${person.memberIndex}">00:00</td>
            <td><button class="end-toilet" onclick="endToilet(${index})">结束上厕所</button></td>
        `;

        tbody.appendChild(row);

        // 启动计时器
        const timerKey = `${person.teamIndex}-${person.memberIndex}`;
        timers[timerKey] = startTime;
    });
}

// 更新计时器
function updateTimers() {
    Object.keys(timers).forEach(key => {
        const startTime = timers[key];
        const now = new Date();
        const duration = Math.floor((now - startTime) / 1000);

        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        const timerElement = document.getElementById(`timer-${key}`);
        if (timerElement) {
            timerElement.textContent = timeString;
        }
    });
}

// 渲染历史记录
function renderHistory() {
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';

    const filteredHistory = getFilteredHistory();

    filteredHistory.forEach(record => {
        const row = document.createElement('tr');
        const startTime = new Date(record.startTime);
        const endTime = new Date(record.endTime);

        row.innerHTML = `
            <td>${record.teamName}</td>
            <td>${record.memberName}</td>
            <td>${formatTime(startTime)}</td>
            <td>${formatTime(endTime)}</td>
            <td>${record.duration}</td>
        `;

        tbody.appendChild(row);
    });
}

// 获取过滤后的历史记录
function getFilteredHistory() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (!searchTerm) return history;

    return history.filter(record =>
        record.teamName.toLowerCase().includes(searchTerm) ||
        record.memberName.toLowerCase().includes(searchTerm)
    );
}

// 搜索历史记录
function searchHistory() {
    renderHistory();
}

// 添加新的辅助函数来重建输入文本
function rebuildTeamInput() {
    // 获取原始的队伍输入内容，如果存在的话
    const currentInput = document.getElementById('teamInput').value.trim();

    // 如果当前输入不为空，尝试从中提取格式
    if (currentInput && teams.length > 0) {
        const lines = currentInput.split('\n');
        if (lines.length === teams.length) {
            // 使用原始格式重建
            return teams.map((team, index) => {
                const originalLine = lines[index] || '';
                const parts = originalLine.trim().split(/\s+/);

                // 如果原始行的字段数量合适，尝试保持原格式
                if (parts.length >= 4) {
                    // 根据当前的解析格式重建
                    const formatParts = parseFormatTemplate.split(/\s+/);
                    const result = [];

                    formatParts.forEach(part => {
                        if (part.includes('{') && part.includes('}')) {
                            const variable = part.replace(/[{}]/g, '');
                            switch (variable) {
                                case 'university':
                                    // 跳过university字段
                                    break;
                                case 'teamName':
                                    result.push(team.chineseName);
                                    break;
                                case 'englishName':
                                    result.push(team.englishName || '');
                                    break;
                                case 'member1':
                                    result.push(team.members[0]);
                                    break;
                                case 'member2':
                                    result.push(team.members[1]);
                                    break;
                                case 'member3':
                                    result.push(team.members[2]);
                                    break;
                            }
                        }
                    });

                    return result.join(' ');
                }
            }).join('\n');
        }
    }

    // 如果无法从原始输入重建，使用默认格式
    return teams.map(team => {
        if (team.hasEnglish && team.englishName) {
            return `${team.chineseName} ${team.englishName} ${team.members.join(' ')}`;
        } else {
            return `${team.chineseName} ${team.members.join(' ')}`;
        }
    }).join('\n');
}

// 删除队伍
function deleteTeam(teamIndex) {
    showModal(`确认删除队伍 "${teams[teamIndex].chineseName}" 吗？`, () => {
        // 检查该队伍是否有人在上厕所
        const hasToiletMember = currentToilet.some(person => person.teamIndex === teamIndex);
        if (hasToiletMember) {
            alert('该队伍有成员正在上厕所，无法删除');
            return;
        }

        teams.splice(teamIndex, 1);

        // 更新currentToilet中的teamIndex
        currentToilet.forEach(person => {
            if (person.teamIndex > teamIndex) {
                person.teamIndex--;
            }
        });

        saveToStorage();
        renderTeams();

        // 更新输入框内容
        document.getElementById('teamInput').value = rebuildTeamInput();
    }, '确认删除', '取消'); // 添加自定义按钮文本
}

// 清空所有队伍
function clearAllTeams() {
    if (currentToilet.length > 0) {
        alert('有成员正在上厕所，无法清空');
        return;
    }

    showModal('确认清空所有队伍信息吗？', () => {
        teams = [];
        document.getElementById('teamInput').value = '';
        saveToStorage();
        renderTeams();
    }, '确认清空', '取消'); // 添加自定义按钮文本
}

// 导出CSV
function exportCSV() {
    if (history.length === 0) {
        alert('没有历史记录可导出');
        return;
    }

    const headers = ['队伍名称', '成员姓名', '开始时间', '结束时间', '耗时'];
    const csvContent = [
        headers.join(','),
        ...history.map(record => [
            `"${record.teamName}"`,
            `"${record.memberName}"`,
            `"${formatTime(new Date(record.startTime))}"`,
            `"${formatTime(new Date(record.endTime))}"`,
            `"${record.duration}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `上厕所记录_${formatDate(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 工具函数
function formatTime(date) {
    return date.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatDate(date) {
    return date.toLocaleDateString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '-');
}

function calculateDuration(startTime, endTime) {
    const duration = Math.floor((endTime - startTime) / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// 模态框相关
function showModal(message, onConfirm, confirmText = '确认', cancelText = '取消') {
    const modal = document.getElementById('modal');
    const modalText = document.getElementById('modalText');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    modalText.textContent = message;
    modal.style.display = 'block';

    // 设置按钮文本
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    // 重置按钮样式
    confirmBtn.disabled = false;
    confirmBtn.style.backgroundColor = '#3498db';

    confirmBtn.onclick = () => {
        modal.style.display = 'none';
        if (onConfirm) onConfirm();
    };

    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };
}

function showInfoModal(message, onClose) {
    const modal = document.getElementById('infoModal');
    const infoText = document.getElementById('infoText');
    const copyBtn = document.getElementById('copyBtn');
    const closeBtn = document.getElementById('closeBtn');

    infoText.textContent = message;
    modal.style.display = 'block';

    copyBtn.onclick = () => {
        navigator.clipboard.writeText(message).then(() => {
            copyBtn.textContent = '已复制';
            setTimeout(() => {
                copyBtn.textContent = '复制';
            }, 1000);
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制');
        });
    };

    closeBtn.onclick = () => {
        modal.style.display = 'none';
        if (onClose) onClose();
    };
}

function setupModalEvents() {
    // 点击模态框外部关闭
    window.onclick = (event) => {
        const modal = document.getElementById('modal');
        const infoModal = document.getElementById('infoModal');
        const announcementModal = document.getElementById('announcementModal');

        if (event.target === modal) {
            modal.style.display = 'none';
            // 清理按钮事件
            const confirmBtn = document.getElementById('confirmBtn');
            const cancelBtn = document.getElementById('cancelBtn');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
        }
        if (event.target === infoModal) {
            infoModal.style.display = 'none';
        }
        if (event.target === announcementModal) {
            announcementModal.style.display = 'none';
            localStorage.setItem('hasSeenAnnouncement', 'true');
        }
    };

    // 关闭按钮事件
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.onclick = () => {
            const modal = closeBtn.closest('.modal');
            modal.style.display = 'none';

            // 如果是主模态框，清理按钮事件
            if (modal.id === 'modal') {
                const confirmBtn = document.getElementById('confirmBtn');
                const cancelBtn = document.getElementById('cancelBtn');
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
            }

            if (modal.id === 'announcementModal') {
                localStorage.setItem('hasSeenAnnouncement', 'true');
            }
        };
    });

    // ESC键关闭模态框
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const modal = document.getElementById('modal');
            const infoModal = document.getElementById('infoModal');
            const announcementModal = document.getElementById('announcementModal');

            if (modal.style.display === 'block') {
                modal.style.display = 'none';
                // 清理按钮事件
                const confirmBtn = document.getElementById('confirmBtn');
                const cancelBtn = document.getElementById('cancelBtn');
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
            }

            infoModal.style.display = 'none';
            announcementModal.style.display = 'none';
        }
    });

    // 大学名称保存
    document.getElementById('universityName').addEventListener('input', saveToStorage);

    // 搜索框回车事件
    document.getElementById('searchInput').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            searchHistory();
        }
    });

    // 格式输入框事件监听
    document.getElementById('toiletFormat').addEventListener('input', (e) => {
        toiletFormat = e.target.value || '{university} {teamName} {memberName} 上厕所';
        saveToStorage();
    });

    document.getElementById('returnFormat').addEventListener('input', (e) => {
        returnFormat = e.target.value || '{university} {teamName} {memberName} 已返回';
        saveToStorage();
    });

    document.getElementById('parseFormat').addEventListener('input', (e) => {
        parseFormatTemplate = e.target.value || '{university} {teamName} {englishName} {member1} {member2} {member3}';
        saveToStorage();
    });

    document.getElementById('memberInfoFormat').addEventListener('input', (e) => {
        memberInfoTemplate = e.target.value || '{university} {teamName} {memberName}';
        saveToStorage();
    });
}

// 生成自定义格式消息
function generateMessage(format, university, teamName, memberName) {
    return format
        .replace(/{university}/g, university)
        .replace(/{teamName}/g, teamName)
        .replace(/{memberName}/g, memberName);
}

// 清空历史记录
function clearHistory() {
    showModal('确认清空所有历史记录吗？此操作不可恢复！', () => {
        history = [];
        saveToStorage();
        renderHistory();
    }, '确认清空', '取消'); // 添加自定义按钮文本
}

// 显示公告
function showAnnouncement() {
    const modal = document.getElementById('announcementModal');
    const startBtn = document.getElementById('startUsingBtn');

    modal.style.display = 'block';

    startBtn.onclick = () => {
        modal.style.display = 'none';
        localStorage.setItem('hasSeenAnnouncement', 'true');
    };
}