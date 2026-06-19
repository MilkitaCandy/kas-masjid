const backendUrlKas = '/api/kas';
const backendUrlExpenses = '/api/expenses';
let backendAvailable = false;

async function apiRequest(path, options = {}) {
    const fetchOptions = Object.assign({
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
    }, options);

    if (fetchOptions.body && typeof fetchOptions.body !== 'string') {
        fetchOptions.body = JSON.stringify(fetchOptions.body);
    }

    const response = await fetch(path, fetchOptions);
    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Request failed ${response.status}: ${errorText}`);
    }

    return response.json();
}

// Test localStorage (jalankan: testLocalStorage())
window.testLocalStorage = function() {
    console.group('💾 LocalStorage');
    const k = localStorage.getItem(storageKey) ? JSON.parse(localStorage.getItem(storageKey)) : {};
    const e = localStorage.getItem(storageKeyExpenses) ? JSON.parse(localStorage.getItem(storageKeyExpenses)) : [];
    console.log('Data Kas:', Object.keys(k).length > 0 ? k : 'KOSONG');
    console.log('Data Pengeluaran:', e.length > 0 ? e : 'KOSONG');
    console.groupEnd();
}

async function loadRemoteData() {
    try {
        const kasResp = await apiRequest(backendUrlKas);
        if (kasResp?.kas) {
            dbKas = kasResp.kas;
            backendAvailable = true;
        }

        const expResp = await apiRequest(backendUrlExpenses);
        if (expResp?.expenses) {
            dbExpenses = expResp.expenses.map(exp => ({
                id: exp._id || exp.id,
                date: exp.date,
                tahun: exp.tahun,
                bulan: exp.bulan,
                name: exp.name,
                note: exp.note,
                amount: exp.amount
            }));
            backendAvailable = true;
        }

        if (backendAvailable) {
            localStorage.setItem(storageKey, JSON.stringify(dbKas));
            localStorage.setItem(storageKeyExpenses, JSON.stringify(dbExpenses));
        }
    } catch (e) {
        console.warn('Load remote data failed', e);
        backendAvailable = false;
    }
}

async function saveKasRemoteEntry(key, data) {
    if (!backendAvailable) return;
    try {
        await apiRequest(backendUrlKas, {
            method: 'POST',
            body: { key, data }
        });
    } catch (e) {
        console.warn('saveKasRemoteEntry failed', e);
    }
}

async function deleteKasRemoteEntry(key) {
    if (!backendAvailable) return;
    try {
        await apiRequest(`${backendUrlKas}?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
    } catch (e) {
        console.warn('deleteKasRemoteEntry failed', e);
    }
}

async function saveExpenseRemote(expense) {
    if (!backendAvailable) return;
    try {
        await apiRequest(backendUrlExpenses, {
            method: 'POST',
            body: expense
        });
    } catch (e) {
        console.warn('saveExpenseRemote failed', e);
    }
}

async function deleteExpenseRemote(id) {
    if (!backendAvailable) return;
    try {
        await apiRequest(`${backendUrlExpenses}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
        console.warn('deleteExpenseRemote failed', e);
    }
}

const listBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const storageKey = 'sistemRekapKasSeweru';
const storageKeyExpenses = 'sistemRekapKasSeweruExpenses';

let dbKas = {};
let dbExpenses = [];
let editKey = null;
let editExpenseId = null;

const selectTahun = document.getElementById('tahun');
const selectBulan = document.getElementById('bulan');
const tableBody = document.getElementById('table-body');
const notification = document.getElementById('notification');
const lastUpdate = document.getElementById('last-update');
const adminModeLabel = document.getElementById('admin-mode-label');
const adminLoginButton = document.getElementById('admin-login-button');
const form = document.getElementById('kas-form');
const submitButton = document.getElementById('submit-button');
const resetButton = document.getElementById('reset-button');
const inputPemasukan = document.getElementById('pemasukan');
const formSection = document.querySelector('.form-section');
const showKasButton = document.getElementById('show-kas-button');
const showPengeluaranButton = document.getElementById('show-pengeluaran-button');
const kasContent = document.getElementById('kas-content');
const pengeluaranContent = document.getElementById('pengeluaran-content');
const expenseFormSection = document.getElementById('expense-form-section');
const expenseForm = document.getElementById('expense-form');
const expenseDate = document.getElementById('expense-date');
const expenseTahun = document.getElementById('expense-tahun');
const expenseBulan = document.getElementById('expense-bulan');
const expenseName = document.getElementById('expense-name');
const expenseNote = document.getElementById('expense-note');
const expenseAmount = document.getElementById('expense-amount');
const expenseSubmitButton = document.getElementById('expense-submit-button');
const expenseResetButton = document.getElementById('expense-reset-button');
const expenseSearch = document.getElementById('expense-search');
const expenseFilterTahun = document.getElementById('expense-filter-tahun');
const expenseFilterBulan = document.getElementById('expense-filter-bulan');
const expenseTableBody = document.getElementById('expense-table-body');
const expenseMonthTransactions = document.getElementById('expense-month-transactions');
const expenseMonthTotal = document.getElementById('expense-month-total');
const expenseTotalAll = document.getElementById('expense-total-all');
const monthlySummaryList = document.getElementById('monthly-summary-list');

const currentYear = new Date().getFullYear();
const tahunOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

function initYearOptions() {
    const options = tahunOptions.map(tahun => `<option value="${tahun}">${tahun}</option>`).join('');
    selectTahun.innerHTML = options; selectTahun.value = currentYear;
    expenseTahun.innerHTML = options; expenseTahun.value = currentYear;
    expenseFilterTahun.innerHTML = ['Semua Tahun', ...tahunOptions].map(value => `<option value="${value}">${value}</option>`).join('');
    expenseFilterTahun.value = 'Semua Tahun';
}

function initMonthOptions() {
    expenseBulan.innerHTML = listBulan.map(bulan => `<option value="${bulan}">${bulan}</option>`).join('');
    expenseBulan.value = listBulan[new Date().getMonth()];
    expenseFilterBulan.innerHTML = ['Semua Bulan', ...listBulan].map(bulan => `<option value="${bulan}">${bulan}</option>`).join('');
    expenseFilterBulan.value = 'Semua Bulan';
}

function setExpenseDateDefaults() {
    const today = new Date();
    expenseDate.value = today.toISOString().slice(0, 10);
    expenseTahun.value = today.getFullYear();
    expenseBulan.value = listBulan[today.getMonth()];
}

function showNotification(message, type = 'success') {
    notification.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> ${message}`;
    notification.className = `notification show ${type}`;
    clearTimeout(notification.hideTimeout);
    notification.hideTimeout = setTimeout(() => { notification.className = 'notification'; }, 3200);
}

function formatDateTime(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function updateLastUpdate() {
    lastUpdate.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> Update terakhir: ${formatDateTime(new Date())}`;
}

function setActiveMenu(menu) {
    if (menu === 'kas') {
        showKasButton.classList.add('active');
        showPengeluaranButton.classList.remove('active');
        kasContent.style.display = 'grid';
        pengeluaranContent.style.display = 'none';
    } else {
        showKasButton.classList.remove('active');
        showPengeluaranButton.classList.add('active');
        kasContent.style.display = 'none';
        pengeluaranContent.style.display = 'grid';
    }
}

function showAdminMode(value) {
    adminModeLabel.textContent = value ? 'Admin' : 'Viewer';
    adminLoginButton.innerHTML = value ? '<i class="fa-solid fa-user-xmark"></i> Keluar Admin' : '<i class="fa-solid fa-user-lock"></i> Masuk Admin';
    formSection.style.display = value ? 'block' : 'none';
    expenseFormSection.style.display = value ? 'block' : 'none';
    resetButton.style.display = value ? 'inline-flex' : 'none';
    expenseResetButton.style.display = value ? 'inline-flex' : 'none';
    
    // Memberitahu CSS bahwa mode admin sedang aktif (untuk menampilkan kolom Aksi)
    if (value) {
        document.body.classList.add('is-admin');
    } else {
        document.body.classList.remove('is-admin');
    }
}

function formatRupiah(value) {
    const number = Number(value);
    if (Number.isNaN(number)) return 'Rp0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number);
}

function getExpenseTotalByMonth(tahun, bulan) {
    return dbExpenses.filter(expense => expense.tahun === tahun && expense.bulan === bulan).reduce((sum, expense) => sum + expense.amount, 0);
}

function getFilteredExpenses() {
    const searchText = expenseSearch.value.trim().toLowerCase();
    const filterTahun = expenseFilterTahun.value;
    const filterBulan = expenseFilterBulan.value;

    return dbExpenses.filter(expense => {
        const matchesSearch = [expense.name, expense.note, formatRupiah(expense.amount)].some(text => text.toLowerCase().includes(searchText));
        const matchesYear = filterTahun === 'Semua Tahun' || expense.tahun === filterTahun;
        const matchesMonth = filterBulan === 'Semua Bulan' || expense.bulan === filterBulan;
        return matchesSearch && matchesYear && matchesMonth;
    });
}

function getAllMonthlySummaries() {
    const summaries = {};
    dbExpenses.forEach(expense => {
        const key = `${expense.tahun}-${expense.bulan}`;
        if (!summaries[key]) { summaries[key] = { tahun: expense.tahun, bulan: expense.bulan, count: 0, total: 0 }; }
        summaries[key].count += 1;
        summaries[key].total += expense.amount;
    });
    return Object.values(summaries).sort((a, b) => {
        if (a.tahun !== b.tahun) return b.tahun - a.tahun;
        return listBulan.indexOf(b.bulan) - listBulan.indexOf(a.bulan);
    });
}

function updateKasTotals() {
    let changed = false;
    Object.keys(dbKas).forEach(key => {
        const [tahun, bulan] = key.split('-');
        const expenseTotal = getExpenseTotalByMonth(tahun, bulan);
        const manualPengeluaran = dbKas[key].manualPengeluaran || 0;
        const newPengeluaran = manualPengeluaran + expenseTotal;

        if (dbKas[key].pengeluaran !== newPengeluaran) {
            dbKas[key].pengeluaran = newPengeluaran;
            dbKas[key].manualPengeluaran = manualPengeluaran;
            changed = true;
        }
    });
    if (changed) saveKasLocal();
}

function renderTable() {
    updateKasTotals();
    const tahunDipilih = selectTahun.value;
    tableBody.innerHTML = '';

    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    let saldoSebelumnya = 0;
    let adaData = false;

    listBulan.forEach(bulan => {
        const key = `${tahunDipilih}-${bulan}`;
        const data = dbKas[key] || { pemasukan: 0, pengeluaran: 0, manualPengeluaran: 0 };
        const pemasukan = data.pemasukan || 0;
        const expenseTotal = getExpenseTotalByMonth(tahunDipilih, bulan);

        let pengeluaran = 0;
        if (dbKas[key] && typeof dbKas[key].pengeluaran === 'number') {
            pengeluaran = dbKas[key].pengeluaran;
        } else {
            pengeluaran = (data.manualPengeluaran || data.pengeluaran || 0) + expenseTotal;
        }

        saldoSebelumnya += pemasukan - pengeluaran;

        if (pemasukan > 0 || pengeluaran > 0) {
            totalPemasukan += pemasukan;
            totalPengeluaran += pengeluaran;
            adaData = true;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Bulan"><strong>${bulan} ${tahunDipilih}</strong></td>
            <td data-label="Pemasukan" class="${pemasukan > 0 ? 'text-pemasukan' : 'text-empty'}">${pemasukan > 0 ? formatRupiah(pemasukan) : '-'}</td>
            <td data-label="Pengeluaran" class="${pengeluaran > 0 ? 'text-pengeluaran' : 'text-empty'}">${pengeluaran > 0 ? formatRupiah(pengeluaran) : '-'}</td>
            <td data-label="Sisa Kas" class="text-saldo">${formatRupiah(saldoSebelumnya)}</td>
            <td data-label="Aksi" class="col-aksi">
                <div class="action-group">
                    <button type="button" class="btn-action edit" onclick="editKas('${key}')"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button type="button" class="btn-action delete" onclick="deleteKas('${key}')"><i class="fa-solid fa-trash"></i> Hapus</button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if (!adaData) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="5" class="text-empty" style="padding: 32px 10px; text-align: center;">Belum ada data kas untuk tahun ${tahunDipilih}. Tambahkan data bulan terlebih dahulu.</td>
        `;
        tableBody.appendChild(emptyRow);
    }

    document.getElementById('total-pemasukan').innerText = formatRupiah(totalPemasukan);
    document.getElementById('total-pengeluaran').innerText = formatRupiah(totalPengeluaran);
    document.getElementById('sisa-kas').innerText = formatRupiah(saldoSebelumnya);
    updateLastUpdate();
}

function renderExpenseTable() {
    const filterYear = expenseFilterTahun.value;
    const filterMonth = expenseFilterBulan.value;
    const filteredExpenses = getFilteredExpenses();
    expenseTableBody.innerHTML = '';

    if (filteredExpenses.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="5" class="text-empty" style="padding: 32px 10px; text-align: center;">Tidak ada pengeluaran yang sesuai filter.</td>
        `;
        expenseTableBody.appendChild(emptyRow);
    } else {
        filteredExpenses.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Tanggal">${formatExpenseDate(expense.date)}</td>
                <td data-label="Nama Kegiatan"><strong>${expense.name}</strong></td>
                <td data-label="Keterangan">${expense.note}</td>
                <td data-label="Nominal" class="text-pengeluaran">${formatRupiah(expense.amount)}</td>
                <td data-label="Aksi" class="col-aksi">
                    <div class="action-group">
                        <button type="button" class="btn-action edit" onclick="editExpense('${expense.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button type="button" class="btn-action delete" onclick="deleteExpense('${expense.id}')"><i class="fa-solid fa-trash"></i> Hapus</button>
                    </div>
                </td>
            `;
            expenseTableBody.appendChild(row);
        });
    }

    const summary = getExpenseSummary(filterYear, filterMonth);
    document.getElementById('expense-month-transactions').innerText = summary.count;
    document.getElementById('expense-month-total').innerText = formatRupiah(summary.total);
    renderMonthlySummaryList();
}

function getExpenseSummary(filterYear, filterMonth) {
    return dbExpenses.reduce((summary, expense) => {
        const matchesYear = filterYear === 'Semua Tahun' || expense.tahun === filterYear;
        const matchesMonth = filterMonth === 'Semua Bulan' || expense.bulan === filterMonth;
        if (matchesYear && matchesMonth) {
            summary.count += 1;
            summary.total += expense.amount;
        }
        return summary;
    }, { count: 0, total: 0 });
}

function renderMonthlySummaryList() {
    monthlySummaryList.innerHTML = '';
    const summaries = getAllMonthlySummaries();
    if (summaries.length === 0) {
        monthlySummaryList.innerHTML = '<li class="summary-item"><strong>Tidak ada ringkasan bulanan karena belum ada pengeluaran.</strong></li>';
        return;
    }
    summaries.forEach(summary => {
        const listItem = document.createElement('li');
        listItem.className = 'summary-item';
        listItem.innerHTML = `
            <span>Ringkasan ${summary.bulan} ${summary.tahun}</span>
            <strong>${summary.count} Transaksi • <span class="text-pengeluaran">${formatRupiah(summary.total)}</span></strong>
        `;
        monthlySummaryList.appendChild(listItem);
    });
}

function formatExpenseDate(value) {
    const date = new Date(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function clearExpenseForm() {
    setExpenseDateDefaults();
    expenseName.value = '';
    expenseNote.value = '';
    expenseAmount.value = '';
    editExpenseId = null;
    expenseSubmitButton.innerHTML = '<i class="fa-solid fa-plus"></i> Tambah Pengeluaran';
}

function validateInput(tahun, bulan, pemasukan) {
    if (!tahun || !bulan) { showNotification('Tahun dan bulan harus dipilih.', 'error'); return false; }
    if (pemasukan < 0) { showNotification('Nilai pemasukan tidak boleh negatif.', 'error'); return false; }
    return true;
}

function saveKasLocal() {
    try {
        localStorage.setItem(storageKey, JSON.stringify(dbKas));
        console.log('✓ Data kas tersimpan ke localStorage:', dbKas);
        if (backendAvailable) {
            Object.keys(dbKas).forEach(key => { try { saveKasRemoteEntry(key, dbKas[key]); } catch (e) { console.warn(e); } });
        }
    } catch (e) {
        console.error('✗ Gagal menyimpan data kas:', e);
        showNotification('Gagal menyimpan data. Cek console untuk detail.', 'error');
    }
}

function saveExpensesLocal() {
    try {
        localStorage.setItem(storageKeyExpenses, JSON.stringify(dbExpenses));
        console.log('✓ Data pengeluaran tersimpan ke localStorage:', dbExpenses);
        if (backendAvailable) {
            dbExpenses.forEach(exp => { try { saveExpenseRemote(exp); } catch (e) { console.warn(e); } });
        }
    } catch (e) {
        console.error('✗ Gagal menyimpan data pengeluaran:', e);
        showNotification('Gagal menyimpan data. Cek console untuk detail.', 'error');
    }
}

window.editExpense = function(id) {
    const expense = dbExpenses.find(item => item.id === id);
    if (!expense) return;
    if (!adminLoginButton.textContent.includes('Keluar')) {
        showNotification('Masuk sebagai admin terlebih dahulu untuk mengedit pengeluaran.', 'error'); return;
    }
    expenseDate.value = expense.date;
    expenseTahun.value = expense.tahun;
    expenseBulan.value = expense.bulan;
    expenseName.value = expense.name;
    expenseNote.value = expense.note;
    expenseAmount.value = expense.amount;
    editExpenseId = expense.id;
    expenseSubmitButton.innerHTML = '<i class="fa-solid fa-pen"></i> Perbarui Pengeluaran';
    setActiveMenu('pengeluaran');
    document.getElementById('expense-form-section').scrollIntoView({ behavior: 'smooth' });
};

window.deleteExpense = function(id) {
    if (!adminLoginButton.textContent.includes('Keluar')) {
        showNotification('Masuk sebagai admin terlebih dahulu untuk menghapus pengeluaran.', 'error'); return;
    }
    if (!confirm('Yakin ingin menghapus pengeluaran ini?')) return;
    dbExpenses = dbExpenses.filter(expense => expense.id !== id);
    saveExpensesLocal();
    if (backendAvailable) { try { deleteExpenseRemote(id); } catch (e) { console.warn(e); } }
    renderExpenseTable(); renderTable();
    showNotification('Pengeluaran berhasil dihapus.', 'success');
};

window.editKas = function(key) {
    if (!adminLoginButton.textContent.includes('Keluar')) {
        showNotification('Masuk sebagai admin terlebih dahulu untuk mengedit data kas.', 'error'); return;
    }
    const data = dbKas[key] || { pemasukan: 0, pengeluaran: 0, manualPengeluaran: 0 };
    const parts = key.split('-');
    const tahun = parts[0];
    const bulan = parts.slice(1).join('-');
    selectTahun.value = tahun;
    selectBulan.value = bulan;
    inputPemasukan.value = data.pemasukan || 0;
    editKey = key;
    submitButton.innerHTML = '<i class="fa-solid fa-pen"></i> Perbarui Data';
    setActiveMenu('kas');
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
};

window.deleteKas = function(key) {
    if (!adminLoginButton.textContent.includes('Keluar')) {
        showNotification('Masuk sebagai admin terlebih dahulu untuk menghapus data kas.', 'error'); return;
    }
    const parts = key.split('-');
    const tahun = parts[0];
    const bulan = parts.slice(1).join('-');

    const relatedExpenses = dbExpenses.filter(e => e.tahun === tahun && e.bulan === bulan);
    if (relatedExpenses.length > 0) {
        const total = relatedExpenses.reduce((s, e) => s + e.amount, 0);
        const ok = confirm(`Terdapat ${relatedExpenses.length} pengeluaran (total ${formatRupiah(total)}) untuk ${bulan} ${tahun}. Hapus data kas dan semua pengeluaran terkait?`);
        if (!ok) return;
        const relatedIds = relatedExpenses.map(e => e.id);
        dbExpenses = dbExpenses.filter(e => !(e.tahun === tahun && e.bulan === bulan));
        saveExpensesLocal();
        if (backendAvailable) { relatedIds.forEach(id => { try { deleteExpenseRemote(id); } catch (e) { console.warn(e); } }); }
    } else {
        if (!confirm('Yakin ingin menghapus data kas untuk ' + key + ' ?')) return;
    }

    delete dbKas[key];
    saveKasLocal();
    if (backendAvailable) { try { deleteKasRemoteEntry(key); } catch (e) { console.warn(e); } }
};

expenseForm.addEventListener('submit', function(event) {
    event.preventDefault();
    if (!adminLoginButton.textContent.includes('Keluar')) {
        showNotification('Masuk sebagai admin terlebih dahulu untuk menambah pengeluaran.', 'error'); return;
    }

    const date = expenseDate.value;
    const tahun = expenseTahun.value;
    const bulan = expenseBulan.value;
    const name = expenseName.value.trim();
    const note = expenseNote.value.trim();
    const amount = Number(expenseAmount.value);

    if (!date || !tahun || !bulan || !name || !note || amount <= 0) {
        showNotification('Lengkapi semua data pengeluaran dengan benar.', 'error'); return;
    }

    if (editExpenseId) {
        const expenseIndex = dbExpenses.findIndex(item => item.id === editExpenseId);
        if (expenseIndex !== -1) {
            dbExpenses[expenseIndex] = { id: editExpenseId, date, tahun, bulan, name, note, amount };
            showNotification('Pengeluaran berhasil diperbarui.', 'success');
        }
    } else {
        dbExpenses.push({ id: `exp-${Date.now()}`, date, tahun, bulan, name, note, amount });
        showNotification('Pengeluaran berhasil ditambahkan.', 'success');
    }

    saveExpensesLocal(); clearExpenseForm(); renderExpenseTable(); renderTable();
});

expenseResetButton.addEventListener('click', clearExpenseForm);
expenseSearch.addEventListener('input', renderExpenseTable);
expenseFilterTahun.addEventListener('change', renderExpenseTable);
expenseFilterBulan.addEventListener('change', renderExpenseTable);

showKasButton.addEventListener('click', () => setActiveMenu('kas'));
showPengeluaranButton.addEventListener('click', () => setActiveMenu('pengeluaran'));
selectTahun.addEventListener('change', renderTable);

adminLoginButton.addEventListener('click', function() {
    // Kata sandi default saat ini: admin2026
    const adminPassword = 'admin2026';
    if (adminLoginButton.textContent.includes('Keluar')) {
        showAdminMode(false);
        showNotification('Anda telah keluar dari mode admin.', 'success');
        return;
    }
    const password = prompt('Masukkan kata sandi admin:');
    if (password === adminPassword) {
        showAdminMode(true);
        showNotification('Mode admin aktif. Sekarang Anda bisa mengelola data.', 'success');
    } else {
        showNotification('Kata sandi admin salah.', 'error');
    }
});

form.addEventListener('submit', function(event) {
    event.preventDefault();
    if (!adminLoginButton.textContent.includes('Keluar')) {
        showNotification('Masuk sebagai admin terlebih dahulu untuk mengubah data.', 'error'); return;
    }
    const tahun = selectTahun.value;
    const bulan = selectBulan.value;
    const pemasukan = Number(inputPemasukan.value);

    if (!validateInput(tahun, bulan, pemasukan)) return;

    const newKey = `${tahun}-${bulan}`;
    if (editKey && editKey !== newKey && dbKas[newKey]) {
        showNotification(`Data untuk ${bulan} ${tahun} sudah ada. Gunakan bulan lain atau batalkan edit.`, 'error'); return;
    }

    if (editKey && editKey !== newKey) delete dbKas[editKey];

    const existingData = dbKas[newKey];
    dbKas[newKey] = { pemasukan, pengeluaran: existingData?.pengeluaran || 0, manualPengeluaran: existingData?.manualPengeluaran || 0 };
    
    saveKasLocal(); renderTable();
    const message = editKey ? `Data ${bulan} ${tahun} berhasil diperbarui.` : `Data ${bulan} ${tahun} berhasil disimpan.`;
    editKey = null;
    submitButton.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Data';
    showNotification(message, 'success');
    inputPemasukan.value = '';
});

resetButton.addEventListener('click', function() {
    if (!adminLoginButton.textContent.includes('Keluar')) {
        showNotification('Masuk sebagai admin terlebih dahulu untuk mengatur reset.', 'error'); return;
    }
    if (confirm('Apakah Anda yakin ingin menghapus seluruh data kas?')) {
        dbKas = {}; saveKasLocal(); renderTable();
        showNotification('Seluruh data kas berhasil direset.', 'success');
    }
});

// Proses inisialisasi awal saat halaman dimuat
console.log('🔄 Memulai inisialisasi aplikasi...');
loadRemoteData().then(() => {
    if (Object.keys(dbKas).length === 0) {
        dbKas = JSON.parse(localStorage.getItem(storageKey) || '{}');
        console.log('📂 Data kas dimuat dari localStorage:', dbKas);
    }
    if (!dbExpenses || dbExpenses.length === 0) {
        dbExpenses = JSON.parse(localStorage.getItem(storageKeyExpenses) || '[]');
        console.log('📂 Data pengeluaran dimuat dari localStorage:', dbExpenses);
    }
    initYearOptions(); initMonthOptions(); setExpenseDateDefaults();
    showAdminMode(false); setActiveMenu('kas'); renderTable(); renderExpenseTable();
    console.log('✅ Inisialisasi selesai');
}).catch(() => {
    console.log('⚠️ Load remote data gagal, fallback ke localStorage');
    dbKas = JSON.parse(localStorage.getItem(storageKey) || '{}');
    dbExpenses = JSON.parse(localStorage.getItem(storageKeyExpenses) || '[]');
    console.log('📂 Data kas:', dbKas);
    console.log('📂 Data pengeluaran:', dbExpenses);
    initYearOptions(); initMonthOptions(); setExpenseDateDefaults();
    showAdminMode(false); setActiveMenu('kas'); renderTable(); renderExpenseTable();
    console.log('✅ Inisialisasi fallback selesai');
});