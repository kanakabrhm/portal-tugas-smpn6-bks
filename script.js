// 1. CONFIGURATION FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCpDgF2mC9n6aT3RUWANXNj0-hh7Ud_eLw",
    authDomain: "portal-tugas-ff747.firebaseapp.com",
    projectId: "portal-tugas-ff747",
    storageBucket: "portal-tugas-ff747.firebasestorage.app",
    messagingSenderId: "879700967156",
    appId: "1:879700967156:web:23d7a51fbb82eeef42e8a1"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 2. INDEXEDDB UNTUK PENYIMPANAN FILE UKURAN BESAR (>100MB)
let localDb;
const dbRequest = indexedDB.open("SMP6_FilesDB", 1);
dbRequest.onupgradeneeded = function(e) {
    localDb = e.target.result;
    if(!localDb.objectStoreNames.contains("files")) {
        localDb.createObjectStore("files", { keyPath: "id" });
    }
};
dbRequest.onsuccess = function(e) { localDb = e.target.result; };
dbRequest.onerror = function(e) { console.error("Database error", e); };

function saveFileToDB(id, fileObj) {
    return new Promise((resolve, reject) => {
        const tx = localDb.transaction("files", "readwrite");
        const store = tx.objectStore("files");
        store.put({ id: id, file: fileObj });
        tx.oncomplete = () => resolve();
        tx.onerror = (err) => reject(err);
    });
}

function getFileFromDB(id) {
    return new Promise((resolve, reject) => {
        const tx = localDb.transaction("files", "readonly");
        const store = tx.objectStore("files");
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result ? req.result.file : null);
        req.onerror = (err) => reject(err);
    });
}

function deleteFileFromDB(id) {
    const tx = localDb.transaction("files", "readwrite");
    tx.objectStore("files").delete(id);
}

// 3. LOGIKA DAN VARIABEL UTAMA
let tasks = [];
let submissions = [];
let currentUser = null;

const targetKelasList = [
    "Semua Kelas 7", "Semua Kelas 8", "Semua Kelas 9",
    "7A", "7B", "7C", "7D", "7E", "7F", "7G", "7H", "7I",
    "8A", "8B", "8C", "8D", "8E", "8F", "8G", "8H", "8I", "8J", "8K",
    "9A", "9B", "9C", "9D", "9E", "9F", "9G"
];

function initKelasOptions() {
    const selectReg = document.getElementById('regKelas');
    if (selectReg) {
        selectReg.innerHTML = '';
        targetKelasList.slice(3).forEach(k => {
            selectReg.innerHTML += `<option value="${k}">${k}</option>`;
        });
    }

    const selectTarget = document.getElementById('taskTargetKelas');
    if (selectTarget) {
        selectTarget.innerHTML = '';
        targetKelasList.forEach(k => {
            selectTarget.innerHTML += `<option value="${k}">${k}</option>`;
        });
    }
}

function togglePasswordVisibility(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

function validatePasswordRules() {
    const password = document.getElementById('regPassword').value;
    const ruleLength = document.getElementById('ruleLength');
    const ruleUpper = document.getElementById('ruleUpper');
    const ruleNumber = document.getElementById('ruleNumber');

    const isLengthValid = password.length >= 6;
    const isUpperValid = /[A-Z]/.test(password);
    const isNumberValid = /[0-9]/.test(password);

    updateRuleUI(ruleLength, isLengthValid, "Minimal 6 Karakter");
    updateRuleUI(ruleUpper, isUpperValid, "Minimal 1 Huruf Besar (A-Z)");
    updateRuleUI(ruleNumber, isNumberValid, "Minimal 1 Angka (0-9)");

    return isLengthValid && isUpperValid && isNumberValid;
}

function updateRuleUI(element, isValid, text) {
    if (isValid) {
        element.className = "rule-item valid";
        element.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${text}`;
    } else {
        element.className = "rule-item invalid";
        element.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${text}`;
    }
}

function showAlert(elementId, message, isSuccess) {
    const alertBox = document.getElementById(elementId);
    if(!alertBox) return;
    alertBox.classList.remove('hidden', 'success', 'error');
    
    if (isSuccess) {
        alertBox.classList.add('success');
        alertBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${message}</span>`;
    } else {
        alertBox.classList.add('error');
        alertBox.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>${message}</span>`;
    }
}

function hideAlert(elementId) {
    const alertBox = document.getElementById(elementId);
    if(alertBox) alertBox.classList.add('hidden');
}

function switchAuthMode(mode) {
    hideAlert('popAlert');
    if(mode === 'login') {
        document.getElementById('tabLogin').classList.add('active');
        document.getElementById('tabRegister').classList.remove('active');
        document.getElementById('formLogin').classList.remove('hidden');
        document.getElementById('formRegister').classList.add('hidden');
    } else {
        document.getElementById('tabRegister').classList.add('active');
        document.getElementById('tabLogin').classList.remove('active');
        document.getElementById('formRegister').classList.remove('hidden');
        document.getElementById('formLogin').classList.add('hidden');
    }
}

function toggleRegFields() {
    const role = document.getElementById('regRole').value;
    if(role === 'guru') {
        document.getElementById('fieldKelas').classList.add('hidden');
        document.getElementById('fieldMapel').classList.remove('hidden');
    } else {
        document.getElementById('fieldKelas').classList.remove('hidden');
        document.getElementById('fieldMapel').classList.add('hidden');
    }
}

// 4. PENDAFTARAN (FIREBASE AUTH & FIRESTORE)
async function handleRegister(e) {
    e.preventDefault();
    hideAlert('popAlert');

    if(!validatePasswordRules()) {
        showAlert('popAlert', 'Password belum memenuhi ketentuan!', false);
        return;
    }

    const name = document.getElementById('regName').value.trim();
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const virtualEmail = `${cleanName}_${role}@smpn6bekasi.sch.id`;

    try {
        showAlert('popAlert', 'Memproses pendaftaran...', true);
        const userCredential = await auth.createUserWithEmailAndPassword(virtualEmail, password);
        const uid = userCredential.user.uid;

        let userData = {
            uid: uid,
            name: name,
            role: role,
            email: virtualEmail
        };

        if(role === 'guru') {
            const selectMapel = document.getElementById('regMapelSelect');
            const checkedMapel = Array.from(selectMapel.selectedOptions).map(opt => opt.value);

            if(checkedMapel.length === 0) {
                showAlert('popAlert', 'Pilih minimal 1 Mata Pelajaran!', false);
                return;
            }
            const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + checkedMapel[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
            userData.code = code;
            userData.mapel = checkedMapel;
        } else {
            const kelas = document.getElementById('regKelas').value;
            userData.kelas = kelas;
        }

        await db.collection("users").doc(uid).set(userData);
        showAlert('popAlert', 'Pendaftaran Berhasil!', true);
        
        loginUser(userData);
    } catch (error) {
        if(error.code === 'auth/email-already-in-use') {
            showAlert('popAlert', 'Nama tersebut sudah terdaftar!', false);
        } else {
            showAlert('popAlert', 'Gagal Daftar: ' + error.message, false);
        }
    }
}

// 5. LOGIN (FIREBASE AUTH & FIRESTORE)
async function handleLogin(e) {
    e.preventDefault();
    hideAlert('popAlert');
    const name = document.getElementById('loginName').value.trim();
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;

    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const virtualEmail = `${cleanName}_${role}@smpn6bekasi.sch.id`;

    try {
        showAlert('popAlert', 'Memeriksa akun...', true);
        const userCredential = await auth.signInWithEmailAndPassword(virtualEmail, password);
        const doc = await db.collection("users").doc(userCredential.user.uid).get();

        if (doc.exists) {
            const user = doc.data();
            showAlert('popAlert', 'Berhasil masuk ke portal...', true);
            setTimeout(() => { loginUser(user); }, 800);
        } else {
            showAlert('popAlert', 'Data pengguna tidak ditemukan!', false);
        }
    } catch (error) {
        showAlert('popAlert', 'Nama, Password, atau Role salah!', false);
    }
}

function loginUser(user) {
    currentUser = user;
    hideAlert('popAlert');
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('userNav').classList.remove('hidden');
    document.getElementById('navUserName').innerText = user.name;
    document.getElementById('navUserRole').innerText = user.role === 'guru' ? 'GURU' : 'MURID (' + user.kelas + ')';

    if(user.role === 'guru') {
        document.getElementById('guruDashboard').classList.remove('hidden');
        document.getElementById('muridDashboard').classList.add('hidden');
        loadGuruDashboard();
    } else {
        document.getElementById('muridDashboard').classList.remove('hidden');
        document.getElementById('guruDashboard').classList.add('hidden');
        loadMuridDashboard();
    }
}

function openLogoutModal() { document.getElementById('logoutConfirmModal').classList.remove('hidden'); }
function closeLogoutModal() { document.getElementById('logoutConfirmModal').classList.add('hidden'); }

async function confirmLogout() {
    closeLogoutModal();
    await auth.signOut();
    currentUser = null;
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('userNav').classList.add('hidden');
    document.getElementById('guruDashboard').classList.add('hidden');
    document.getElementById('muridDashboard').classList.add('hidden');
}

// 6. SYNC DATA FIRESTORE (TUGAS & SUBMISSION)
function listenCloudData() {
    db.collection("tasks").onSnapshot((snapshot) => {
        tasks = snapshot.docs.map(doc => doc.data());
        if (currentUser) {
            if(currentUser.role === 'guru') loadGuruDashboard();
            else loadMuridDashboard();
        }
    });

    db.collection("submissions").onSnapshot((snapshot) => {
        submissions = snapshot.docs.map(doc => doc.data());
        if (currentUser) {
            if(currentUser.role === 'guru') renderGuruSubmissions();
            else renderMuridHistory();
        }
    });
}

function loadGuruDashboard() {
    document.getElementById('displayTeacherCode').innerText = currentUser.code;
    document.getElementById('displayTeacherSubjects').innerText = currentUser.mapel.join(', ');

    const taskMapelSelect = document.getElementById('taskMapelSelect');
    taskMapelSelect.innerHTML = '';
    currentUser.mapel.forEach(m => {
        taskMapelSelect.innerHTML += `<option value="${m}">${m}</option>`;
    });

    renderGuruSubmissions();
}

async function handleCreateTask(e) {
    e.preventDefault();
    hideAlert('guruTaskAlert');

    const mapel = document.getElementById('taskMapelSelect').value;
    const targetSelect = document.getElementById('taskTargetKelas');
    const targetKelasListSelected = Array.from(targetSelect.selectedOptions).map(opt => opt.value);

    if(targetKelasListSelected.length === 0) {
        showAlert('guruTaskAlert', 'Pilih minimal 1 Target Kelas!', false);
        return;
    }

    const title = document.getElementById('taskTitle').value;
    const desc = document.getElementById('taskDesc').value;
    const fileInput = document.getElementById('taskFile');

    const taskId = Date.now();
    let hasFile = false;
    let fileName = null;

    if(fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 200 * 1024 * 1024) {
            showAlert('guruTaskAlert', 'Ukuran file terlalu besar! Maksimal 200MB.', false);
            return;
        }
        showAlert('guruTaskAlert', 'Sedang memproses file...', true);
        await saveFileToDB("task_" + taskId, file);
        hasFile = true;
        fileName = file.name;
    }

    const newTask = {
        id: taskId,
        teacherName: currentUser.name,
        teacherCode: currentUser.code,
        mapel,
        targetKelas: targetKelasListSelected,
        title,
        desc,
        hasFile,
        fileName
    };

    await db.collection("tasks").doc(taskId.toString()).set(newTask);
    showAlert('guruTaskAlert', 'Tugas berhasil dikirim ke kelas: ' + targetKelasListSelected.join(', '), true);
    e.target.reset();
}

function renderGuruSubmissions() {
    const table = document.getElementById('guruSubmissionsTable');
    table.innerHTML = '';
    const teacherSubs = submissions.filter(s => s.teacherCode === currentUser.code);

    if(teacherSubs.length === 0) {
        table.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">Belum ada tugas masuk dari siswa.</td></tr>';
        return;
    }

    teacherSubs.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.studentName}</strong><br><small>${s.studentKelas}</small></td>
            <td>${s.mapel}</td>
            <td>${s.title}</td>
            <td><button class="file-link" onclick="downloadFileFromDB('sub_${s.id}', '${s.fileName}')"><i class="fa-solid fa-file-arrow-down"></i> ${s.fileName}</button></td>
            <td>${s.grade !== null ? `<strong style="color:var(--success); font-size:1rem;">${s.grade}</strong>` : '<span class="badge-status badge-pending">Belum Dinilai</span>'}</td>
            <td>
                <button class="btn btn-accent" style="padding:4px 8px; font-size:0.75rem;" onclick="openGradeModal(${s.id})"><i class="fa-solid fa-star"></i> Nilai</button>
                <button class="btn btn-danger" style="padding:4px 8px; font-size:0.75rem;" onclick="deleteSubmission(${s.id})"><i class="fa-solid fa-trash"></i> Hapus</button>
            </td>
        `;
        table.appendChild(tr);
    });
}

async function downloadFileFromDB(key, fileName) {
    const file = await getFileFromDB(key);
    if (file) {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    } else {
        alert("File tidak ditemukan atau telah dihapus.");
    }
}

async function deleteSubmission(id) {
    if(confirm('Hapus berkas ini dari sistem?')) {
        await db.collection("submissions").doc(id.toString()).delete();
        deleteFileFromDB('sub_' + id);
    }
}

function openGradeModal(id) {
    const sub = submissions.find(s => s.id === id);
    if(sub) {
        document.getElementById('gradeSubId').value = sub.id;
        document.getElementById('gradeInput').value = sub.grade || '';
        document.getElementById('feedbackInput').value = sub.feedback || '';
        document.getElementById('gradeModal').classList.remove('hidden');
    }
}

function closeGradeModal() { document.getElementById('gradeModal').classList.add('hidden'); }

async function saveGrade(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('gradeSubId').value);
    const grade = parseInt(document.getElementById('gradeInput').value);
    const feedback = document.getElementById('feedbackInput').value;

    await db.collection("submissions").doc(id.toString()).update({
        grade: grade,
        feedback: feedback
    });
    closeGradeModal();
}

function loadMuridDashboard() {
    document.getElementById('displayMuridKelas').innerText = currentUser.kelas;
    renderMuridTasks();
    renderMuridHistory();
}

function renderMuridTasks() {
    const list = document.getElementById('muridTaskList');
    list.innerHTML = '';

    const muridAngkatan = currentUser.kelas.charAt(0);
    const relevantTasks = tasks.filter(t => {
        const targets = Array.isArray(t.targetKelas) ? t.targetKelas : [t.targetKelas];
        return targets.some(target => 
            target === currentUser.kelas || 
            target.toLowerCase().includes('semua kelas ' + muridAngkatan) ||
            target === 'Semua Kelas'
        );
    });

    if(relevantTasks.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; font-size:0.9rem;">Belum ada tugas khusus untuk kelas Anda.</p>';
        return;
    }

    relevantTasks.forEach(t => {
        const targetsText = Array.isArray(t.targetKelas) ? t.targetKelas.join(', ') : t.targetKelas;
        const card = document.createElement('div');
        card.className = 'task-card';
        card.innerHTML = `
            <div>
                <span class="tag">${t.mapel} | Target: ${targetsText}</span>
                <h4>${t.title}</h4>
                <p style="font-size:0.8rem; color:#64748b; font-weight:700;">Guru: ${t.teacherName}</p>
                <p>${t.desc}</p>
                ${t.hasFile ? `<button class="file-link" onclick="downloadFileFromDB('task_${t.id}', '${t.fileName}')"><i class="fa-solid fa-file-pdf"></i> Unduh Soal Guru</button>` : ''}
            </div>
        `;
        list.appendChild(card);
    });
}

async function verifyTeacherCode() {
    const code = document.getElementById('subTeacherCode').value.trim().toUpperCase();
    const status = document.getElementById('teacherCodeStatus');
    const select = document.getElementById('subMapel');
    
    if(!code) return;

    const querySnapshot = await db.collection("users").where("role", "==", "guru").where("code", "==", code).get();
    if(!querySnapshot.empty) {
        const teacher = querySnapshot.docs[0].data();
        status.style.color = 'var(--success)';
        status.innerText = `Guru: ${teacher.name}`;
        select.innerHTML = '';
        teacher.mapel.forEach(m => {
            select.innerHTML += `<option value="${m}">${m}</option>`;
        });
    } else {
        status.style.color = 'var(--danger)';
        status.innerText = 'Kode Guru tidak ditemukan!';
        select.innerHTML = '<option value="">-- Masukkan Kode Guru Dulu --</option>';
    }
}

async function promptSubmitAssignment(e) {
    e.preventDefault();
    hideAlert('muridSubAlert');

    const code = document.getElementById('subTeacherCode').value.trim().toUpperCase();
    const mapel = document.getElementById('subMapel').value;
    const title = document.getElementById('subTitle').value;
    const fileInput = document.getElementById('subFile');

    const querySnapshot = await db.collection("users").where("role", "==", "guru").where("code", "==", code).get();
    if(querySnapshot.empty) {
        showAlert('muridSubAlert', 'Kode Guru tidak ditemukan/salah!', false);
        return;
    }

    const teacher = querySnapshot.docs[0].data();

    if(!mapel) {
        showAlert('muridSubAlert', 'Pilih mata pelajaran terlebih dahulu!', false);
        return;
    }

    if(fileInput.files.length === 0) {
        showAlert('muridSubAlert', 'Silakan pilih file tugas Anda terlebih dahulu!', false);
        return;
    }

    const file = fileInput.files[0];
    if (file.size > 200 * 1024 * 1024) {
        showAlert('muridSubAlert', 'Ukuran file terlalu besar! Maksimal 200MB.', false);
        return;
    }

    const confirmText = `Apakah Anda yakin ingin mengirimkan tugas <strong>"${title}"</strong> (${mapel}) kepada <strong>${teacher.name}</strong>?`;
    document.getElementById('submitConfirmText').innerHTML = confirmText;
    document.getElementById('submitConfirmModal').classList.remove('hidden');
}

function closeSubmitConfirmModal() { document.getElementById('submitConfirmModal').classList.add('hidden'); }

async function confirmAndExecuteSubmit() {
    closeSubmitConfirmModal();

    const code = document.getElementById('subTeacherCode').value.trim().toUpperCase();
    const mapel = document.getElementById('subMapel').value;
    const title = document.getElementById('subTitle').value;
    const fileInput = document.getElementById('subFile');
    
    const querySnapshot = await db.collection("users").where("role", "==", "guru").where("code", "==", code).get();
    const teacher = querySnapshot.docs[0].data();
    const file = fileInput.files[0];

    showAlert('muridSubAlert', 'Sedang mengunggah berkas...', true);

    const subId = Date.now();
    await saveFileToDB("sub_" + subId, file);

    const newSub = {
        id: subId,
        studentName: currentUser.name,
        studentKelas: currentUser.kelas,
        teacherCode: teacher.code,
        teacherName: teacher.name,
        mapel,
        title,
        fileName: file.name,
        grade: null,
        feedback: ''
    };

    await db.collection("submissions").doc(subId.toString()).set(newSub);
    
    showAlert('muridSubAlert', 'File tugas berhasil dikirimkan ke ' + teacher.name + '!', true);
    document.getElementById('formSubmitAssignment').reset();
    document.getElementById('teacherCodeStatus').innerText = '';
}

function renderMuridHistory() {
    const table = document.getElementById('muridHistoryTable');
    table.innerHTML = '';
    const mySubs = submissions.filter(s => s.studentName === currentUser.name);

    if(mySubs.length === 0) {
        table.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">Belum ada tugas yang dikumpulkan.</td></tr>';
        return;
    }

    mySubs.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.teacherName}</strong></td>
            <td>${s.mapel}</td>
            <td>${s.title}</td>
            <td>${s.grade !== null ? `<strong style="color:var(--success); font-size:1.1rem;">${s.grade}</strong>` : '<span class="badge-status badge-pending">Belum Dinilai</span>'}</td>
            <td>${s.feedback || '<em style="color:#94a3b8;">Belum ada tanggapan</em>'}</td>
        `;
        table.appendChild(tr);
    });
}

// 7. INISIALISASI
document.addEventListener('DOMContentLoaded', () => {
    initKelasOptions();
    listenCloudData();

    // Deteksi sesi pengguna yang sedang aktif di Firebase secara otomatis
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists) {
                loginUser(doc.data());
            }
        }
    });
});
