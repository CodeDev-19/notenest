/**
 * NoteNest Application Logic (v4 - Polished UX)
 */

// --- MOCK DATA ---
const MOCK_NOTES = [
    { id: 'n1', title: 'Calculus Cheat Sheet', subject: 'Math', author: 'jane', fileUrl: '#', createdAt: new Date('2023-10-26T10:00:00Z'), downloads: 105, likes: 25 },
    { id: 'n2', title: 'Organic Chemistry Reactions', subject: 'Chemistry', author: 'john', fileUrl: '#', createdAt: new Date('2023-10-25T14:30:00Z'), downloads: 152, likes: 45 },
    { id: 'n3', title: 'Intro to Shakespeare', subject: 'English', author: 'emily', fileUrl: '#', createdAt: new Date('2023-10-24T11:00:00Z'), downloads: 88, likes: 15 },
    { id: 'n4', title: 'Laws of Motion', subject: 'Physics', author: 'jane', fileUrl: '#', createdAt: new Date('2023-10-27T18:00:00Z'), downloads: 210, likes: 50 },
    { id: 'n5', title: 'Data Structures in Python', subject: 'CS', author: 'alex', fileUrl: '#', createdAt: new Date('2023-10-28T09:00:00Z'), downloads: 35, likes: 80 },
];
const SUBJECTS = [{ id: 'all', name: 'All Notes' }, { id: 'phy', name: 'Physics' }, { id: 'kan', name: 'Kannada' }, { id: 'hin', name: 'Hindi' }, { id: 'san', name: 'Sanskrit' }, { id: 'math', name: 'Math' }, { id: 'chem', name: 'Chemistry' }, { id: 'cs', name: 'CS' }, { id: 'eng', name: 'English' }];

// --- APPLICATION STATE ---
let currentUser = null; // { username: 'testuser' }
let activeGroupId = 'all';
let activeSort = 'newest';
let openModal = null; // Keep track of the currently open modal

// --- DOM ELEMENT SELECTORS ---
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
    uploadForm: document.getElementById('upload-form'),
    uploadSubjectSelect: document.getElementById('note-subject'),
    themeToggle: document.getElementById('theme-toggle'),
    notesFeed: document.getElementById('notes-feed'),
    feedTitle: document.getElementById('feed-title'),
    groupsList: document.getElementById('groups-list'),
    filterBar: document.getElementById('filter-bar'),
};
const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>`;
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>`;

// --- MODAL & UI MANAGEMENT ---
const showModal = (modalElement) => {
    if (openModal) hideModal(); // Close any existing modal first
    modalElement.classList.remove('hidden');
    DOMElements.body.classList.add('modal-open');
    openModal = modalElement;
};
const hideModal = () => {
    if (!openModal) return;
    openModal.classList.add('hidden');
    DOMElements.body.classList.remove('modal-open');
    openModal = null;
};
const updateUIForAuthState = () => {
    if (currentUser) {
        DOMElements.guestMenu.classList.add('hidden');
        DOMElements.userMenu.classList.remove('hidden');
        DOMElements.userDisplay.textContent = currentUser.username;
    } else {
        DOMElements.guestMenu.classList.remove('hidden');
        DOMElements.userMenu.classList.add('hidden');
    }
};
const initializeTheme = () => {
    const isLight = localStorage.getItem('theme') === 'light';
    document.documentElement.classList.toggle('light', isLight);
    DOMElements.themeToggle.innerHTML = isLight ? moonIcon : sunIcon;
};
const toggleTheme = () => {
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    DOMElements.themeToggle.innerHTML = isLight ? moonIcon : sunIcon;
};

// --- DYNAMIC CONTENT RENDERING ---
const displayNotes = () => {
    let notesToDisplay = MOCK_NOTES;
    if (activeGroupId !== 'all') {
        const activeSubject = SUBJECTS.find(s => s.id === activeGroupId).name;
        notesToDisplay = MOCK_NOTES.filter(note => note.subject === activeSubject);
    }
    if (activeSort === 'newest') notesToDisplay.sort((a, b) => b.createdAt - a.createdAt);
    else if (activeSort === 'trending') notesToDisplay.sort((a, b) => b.likes - a.likes);
    else if (activeSort === 'downloads') notesToDisplay.sort((a, b) => b.downloads - a.downloads);
    
    DOMElements.notesFeed.innerHTML = '';
    if (notesToDisplay.length === 0) {
        DOMElements.notesFeed.innerHTML = '<p>No notes found. Be the first to upload!</p>';
        return;
    }
    notesToDisplay.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.dataset.noteId = note.id; // Add note ID for event handling
        card.innerHTML = `
            <div class="note-subject">${note.subject.toUpperCase()}</div>
            <h3>${note.title}</h3>
            <div class="note-meta"><span>By: ${note.author}</span></div>
            <div class="note-stats">
                <button class="like-btn" data-action="like" aria-label="Like this note">
                    <svg fill="currentColor" width="18" height="18" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
                    <span>${note.likes}</span>
                </button>
                <span>${note.downloads} 📥</span>
            </div>
            <a href="${note.fileUrl}" target="_blank" class="note-download" download>Download Note</a>
        `;
        DOMElements.notesFeed.appendChild(card);
    });
};

const renderGroups = () => {
    DOMElements.groupsList.innerHTML = '';
    SUBJECTS.forEach(group => {
        const li = document.createElement('li');
        li.className = 'group-item';
        li.textContent = group.name;
        li.dataset.groupId = group.id;
        if (group.id === activeGroupId) li.classList.add('active');
        DOMElements.groupsList.appendChild(li);
    });
};

const populateUploadSubjects = () => {
    DOMElements.uploadSubjectSelect.innerHTML = '<option value="" disabled selected>Select a subject</option>';
    SUBJECTS.forEach(subject => {
        if (subject.id !== 'all') {
            const option = document.createElement('option');
            option.value = subject.name;
            option.textContent = subject.name;
            DOMElements.uploadSubjectSelect.appendChild(option);
        }
    });
};

// --- EVENT HANDLERS ---
const handleAuth = (e, type) => {
    e.preventDefault();
    const form = type === 'login' ? DOMElements.loginForm : DOMElements.signupForm;
    const username = form.querySelector('input[type="text"]').value;
    // TODO Firebase: Authenticate/create user
    currentUser = { username: username };
    updateUIForAuthState();
    hideModal();
    form.reset();
};

const handleLogout = () => { currentUser = null; updateUIForAuthState(); };

const handleGroupSwitch = (e) => {
    if (e.target.matches('.group-item')) {
        activeGroupId = e.target.dataset.groupId;
        const selectedGroup = SUBJECTS.find(g => g.id === activeGroupId);
        DOMElements.feedTitle.textContent = selectedGroup.name;
        renderGroups();
        displayNotes();
    }
};

const handleSortChange = (e) => {
    if (e.target.matches('.filter-btn')) {
        activeSort = e.target.dataset.sort;
        DOMElements.filterBar.querySelector('.active').classList.remove('active');
        e.target.classList.add('active');
        displayNotes();
    }
};

const handleLike = (e) => {
    if (!currentUser) {
        showModal(DOMElements.authModal);
        return;
    }
    const noteCard = e.target.closest('.note-card');
    if (!noteCard) return;
    const noteId = noteCard.dataset.noteId;
    const note = MOCK_NOTES.find(n => n.id === noteId);
    if (note) {
        note.likes++; // In a real app, you'd check if user already liked it
        // TODO Firebase: Update likes count in Firestore
        displayNotes(); // Re-render to show updated like count
    }
};

const handleNoteUpload = (e) => {
    e.preventDefault();
    const newNote = { id: 'n' + Date.now(), title: DOMElements.uploadForm.elements['note-title'].value, subject: DOMElements.uploadForm.elements['note-subject'].value, fileUrl: '#', author: currentUser.username, createdAt: new Date(), downloads: 0, likes: 0 };
    MOCK_NOTES.push(newNote);
    displayNotes();
    hideModal();
    DOMElements.uploadForm.reset();
};

// --- INITIALIZATION ---
const setupEventListeners = () => {
    // Auth & Header
    document.getElementById('login-signup-btn').addEventListener('click', () => showModal(DOMElements.authModal));
    document.getElementById('upload-note-btn').addEventListener('click', () => showModal(DOMElements.uploadModal));
    DOMElements.logoutBtn.addEventListener('click', handleLogout);
    
    // Forms
    DOMElements.loginForm.addEventListener('submit', (e) => handleAuth(e, 'login'));
    DOMElements.signupForm.addEventListener('submit', (e) => handleAuth(e, 'signup'));
    DOMElements.uploadForm.addEventListener('submit', handleNoteUpload);

    // Modal Switching & Closing
    DOMElements.authModal.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'show-signup') { e.preventDefault(); DOMElements.loginForm.classList.add('hidden'); DOMElements.signupForm.classList.remove('hidden'); }
        else if (e.target.dataset.action === 'show-login') { e.preventDefault(); DOMElements.signupForm.classList.add('hidden'); DOMElements.loginForm.classList.remove('hidden'); }
        else if (e.target.dataset.action === 'close-modal' || e.target === DOMElements.authModal) { hideModal(); }
    });
    DOMElements.uploadModal.addEventListener('click', (e) => { if (e.target.dataset.action === 'close-modal' || e.target === DOMElements.uploadModal) { hideModal(); } });
    
    // App Content
    DOMElements.themeToggle.addEventListener('click', toggleTheme);
    DOMElements.groupsList.addEventListener('click', handleGroupSwitch);
    DOMElements.filterBar.addEventListener('click', handleSortChange);
    DOMElements.notesFeed.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="like"]')) {
            handleLike(e);
        }
    });
};

const initializeApp = () => {
    console.log("NoteNest App Initialized (v4)");
    initializeTheme();
    setupEventListeners();
    updateUIForAuthState();
    renderGroups();
    populateUploadSubjects();
    displayNotes();
};

document.addEventListener('DOMContentLoaded', initializeApp);