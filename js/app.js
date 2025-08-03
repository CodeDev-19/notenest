/**
 * NoteNest Application Logic (Firebase + Anonymous Auth + UID for Security)
 * FIXED VERSION
 */

// ----------------- IMPORTS -----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

// ----------------- FIREBASE CONFIG -----------------
const firebaseConfig = {
    apiKey: "AIzaSyBp00hui6yIFGk5psmk1QD3s3RFETwn4Fo",
    authDomain: "notenest-3-8-25.firebaseapp.com",
    projectId: "notenest-3-8-25",
    storageBucket: "notenest-3-8-25.appspot.com",
    messagingSenderId: "972347100136",
    appId: "1:972347100136:web:5f83aeb402b941fd6cb25d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ----------------- STATE -----------------
let currentUser = null;
let activeGroupId = 'all';
let activeSort = 'newest';
let openModal = null;

// ----------------- DOM SELECTORS -----------------
const DOMElements = {
    body: document.body,
    guestMenu: document.getElementById('guest-menu'),
    userMenu: document.getElementById('user-menu'),
    userDisplay: document.getElementById('user-display'),
    logoutBtn: document.getElementById('logout-btn'),
    authModal: document.getElementById('auth-modal'),
    uploadModal: document.getElementById('upload-modal'),
    loginForm: document.getElementById('login-form'),
    signupForm: document.getElementById('signup-form'),
    authError: document.getElementById('auth-error'),
    uploadForm: document.getElementById('upload-form'),
    uploadSubjectSelect: document.getElementById('note-subject'),
    themeToggle: document.getElementById('theme-toggle'),
    notesFeed: document.getElementById('notes-feed'),
    feedTitle: document.getElementById('feed-title'),
    groupsList: document.getElementById('groups-list'),
    filterBar: document.getElementById('filter-bar'),
};

const SUBJECTS = [
    { id: 'all', name: 'All Notes' },
    { id: 'phy', name: 'Physics' },
    { id: 'kan', name: 'Kannada' },
    { id: 'hin', name: 'Hindi' },
    { id: 'san', name: 'Sanskrit' },
    { id: 'math', name: 'Math' },
    { id: 'chem', name: 'Chemistry' },
    { id: 'cs', name: 'CS' },
    { id: 'eng', name: 'English' }
];
let notesCache = [];

// ----------------- UI HELPERS -----------------
const showModal = (m) => { if (openModal) hideModal(); m.classList.remove('hidden'); DOMElements.body.classList.add('modal-open'); openModal = m; };
const hideModal = () => { if (!openModal) return; openModal.classList.add('hidden'); DOMElements.body.classList.remove('modal-open'); openModal = null; };
const updateUIForAuthState = () => {
    if (currentUser && !currentUser.isAnonymous) {
        DOMElements.guestMenu.classList.add('hidden');
        DOMElements.userMenu.classList.remove('hidden');
        DOMElements.userDisplay.textContent = currentUser.username || "User";
    } else {
        DOMElements.guestMenu.classList.remove('hidden');
        DOMElements.userMenu.classList.add('hidden');
    }
};
const initializeTheme = () => {
    const isLight = localStorage.getItem('theme') === 'light';
    document.documentElement.classList.toggle('light', isLight);
    DOMElements.themeToggle.innerHTML = isLight ? "🌙" : "☀️";
};
const toggleTheme = () => {
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    DOMElements.themeToggle.innerHTML = isLight ? "🌙" : "☀️";
};

// ----------------- FIREBASE FUNCTIONS -----------------
const generateEmailFromUsername = (username) => `${username}@notenest.local`;

// FIXED: Removed manual currentUser update. onAuthStateChanged handles it.
async function signupUser(username, password) {
    const email = generateEmailFromUsername(username);
    await createUserWithEmailAndPassword(auth, email, password);
}

// FIXED: Removed manual currentUser update. onAuthStateChanged handles it.
async function loginUser(username, password) {
    const email = generateEmailFromUsername(username);
    await signInWithEmailAndPassword(auth, email, password);
}

async function ensureSignedIn() {
    if (!auth.currentUser) {
        await signInAnonymously(auth).catch(console.error);
    }
}

async function uploadNoteToFirebase(title, subject, file) {
    await ensureSignedIn();
    const user = auth.currentUser;
    if (!user) { throw new Error("You must be logged in to upload."); }

    const fileRef = ref(storage, `notes/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);

    await addDoc(collection(db, "notes"), {
        title,
        subject,
        author: currentUser?.username || "Guest",
        fileUrl: downloadURL,
        createdAt: serverTimestamp(),
        downloads: 0,
        likes: 0,
        uid: user.uid
    });
}

async function fetchNotes() {
    notesCache = [];
    const querySnapshot = await getDocs(collection(db, "notes"));
    querySnapshot.forEach(docSnap => {
        notesCache.push({ id: docSnap.id, ...docSnap.data() });
    });
    displayNotes();
}

async function likeNote(noteId) {
    await updateDoc(doc(db, "notes", noteId), { likes: increment(1) });
    fetchNotes();
}

// ----------------- RENDERING -----------------
function displayNotes() {
    let notesToDisplay = notesCache;
    if (activeGroupId !== 'all') {
        const activeSubject = SUBJECTS.find(s => s.id === activeGroupId).name;
        notesToDisplay = notesCache.filter(note => note.subject === activeSubject);
    }
    if (activeSort === 'newest') notesToDisplay.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
    else if (activeSort === 'trending') notesToDisplay.sort((a, b) => b.likes - a.likes);
    else if (activeSort === 'downloads') notesToDisplay.sort((a, b) => b.downloads - a.downloads);

    DOMElements.notesFeed.innerHTML = notesToDisplay.length === 0
        ? '<p>No notes found. Be the first to upload!</p>'
        : notesToDisplay.map(note => `<div class="note-card" data-note-id="${note.id}">
            <div class="note-subject">${note.subject}</div>
            <h3>${note.title}</h3>
            <div class="note-meta"><span>By: ${note.author}</span></div>
            <div class="note-stats">
                <button class="like-btn" data-action="like">❤️ ${note.likes}</button>
                <span>${note.downloads} 📥</span>
            </div>
            <a href="${note.fileUrl}" target="_blank" class="note-download" download>Download Note</a>
        </div>`).join('');
}

function renderGroups() {
    DOMElements.groupsList.innerHTML = '';
    SUBJECTS.forEach(group => {
        const li = document.createElement('li');
        li.className = 'group-item' + (group.id === activeGroupId ? ' active' : '');
        li.textContent = group.name;
        li.dataset.groupId = group.id;
        DOMElements.groupsList.appendChild(li);
    });
}

function populateUploadSubjects() {
    DOMElements.uploadSubjectSelect.innerHTML = '<option value="" disabled selected>Select a subject</option>';
    SUBJECTS.forEach(subject => {
        if (subject.id !== 'all') {
            const option = document.createElement('option');
            option.value = subject.name;
            option.textContent = subject.name;
            DOMElements.uploadSubjectSelect.appendChild(option);
        }
    });
}

// ----------------- EVENT HANDLERS -----------------
DOMElements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    DOMElements.authError.textContent = '';
    const username = e.target.querySelector('#login-username').value;
    const password = e.target.querySelector('#login-password').value;
    try {
        await loginUser(username, password);
        hideModal();
    } catch (error) {
        console.error("Login failed:", error);
        DOMElements.authError.textContent = 'Login failed. Please check username and password.';
    }
});

DOMElements.signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    DOMElements.authError.textContent = '';
    const username = e.target.querySelector('#signup-username').value;
    const password = e.target.querySelector('#signup-password').value;
    try {
        await signupUser(username, password);
        hideModal();
    } catch (error) {
        console.error("Signup failed:", error);
        DOMElements.authError.textContent = 'Signup failed. The username may already be in use.';
    }
});

DOMElements.logoutBtn.addEventListener('click', async () => {
    await signOut(auth); // FIXED: onAuthStateChanged will handle UI updates
});

DOMElements.uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = e.target['note-title'].value;
    const subject = e.target['note-subject'].value;
    const file = e.target['note-file'].files[0];
    await uploadNoteToFirebase(title, subject, file);
    hideModal();
    e.target.reset();
    fetchNotes();
});

DOMElements.filterBar.addEventListener('click', (e) => {
    if (e.target.matches('.filter-btn')) {
        activeSort = e.target.dataset.sort;
        DOMElements.filterBar.querySelector('.active').classList.remove('active');
        e.target.classList.add('active');
        displayNotes();
    }
});

DOMElements.groupsList.addEventListener('click', (e) => {
    if (e.target.matches('.group-item')) {
        activeGroupId = e.target.dataset.groupId;
        DOMElements.feedTitle.textContent = SUBJECTS.find(g => g.id === activeGroupId).name;
        renderGroups();
        displayNotes();
    }
});

DOMElements.notesFeed.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="like"]')) {
        likeNote(e.target.closest('.note-card').dataset.noteId);
    }
});

// ----------------- INIT -----------------
document.getElementById('login-signup-btn').addEventListener('click', () => {
    DOMElements.authError.textContent = ''; // Clear old errors
    showModal(DOMElements.authModal);
});
document.getElementById('upload-note-btn').addEventListener('click', () => showModal(DOMElements.uploadModal));
document.getElementById('auth-modal').addEventListener('click', (e) => { if (e.target.dataset.action === 'close-modal' || e.target === DOMElements.authModal) { hideModal(); } });
document.getElementById('upload-modal').addEventListener('click', (e) => { if (e.target.dataset.action === 'close-modal' || e.target === DOMElements.uploadModal) { hideModal(); } });
DOMElements.themeToggle.addEventListener('click', toggleTheme);

// FIXED: Added event listener for switching between login/signup forms
DOMElements.authModal.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (action === 'show-signup' || action === 'show-login') {
        e.preventDefault();
        DOMElements.loginForm.classList.toggle('hidden', action === 'show-signup');
        DOMElements.signupForm.classList.toggle('hidden', action === 'show-login');
        DOMElements.authError.textContent = '';
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    await ensureSignedIn(); // Ensures an anonymous user is signed in if no one is

    // FIXED: This is the corrected auth state listener. It's the single source of truth.
    onAuthStateChanged(auth, (user) => {
        if (user && !user.isAnonymous) {
            // User is signed in with email/password
            const username = user.email.split('@')[0];
            currentUser = { username: username, isAnonymous: false, uid: user.uid };
        } else if (user && user.isAnonymous) {
            // User is signed in anonymously
            currentUser = { username: "Guest", isAnonymous: true, uid: user.uid };
        } else {
            // User is signed out
            currentUser = null;
        }
        updateUIForAuthState();
    });

    renderGroups();
    populateUploadSubjects();
    fetchNotes();
});