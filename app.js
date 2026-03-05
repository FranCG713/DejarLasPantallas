import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

if (window.location.protocol === 'file:') {
    alert("⚠️ ATENCIÓN: Firebase no funciona abriendo el archivo directamente. \n\nPor favor, usa el botón 'Go Live' de VS Code o sube los cambios a GitHub para que el botón de registro responda.");
}

const firebaseConfig = {
    projectId: "reentry-zero-screens",
    appId: "1:1016515885720:web:39f26f42accf2cb6146eed",
    storageBucket: "reentry-zero-screens.firebasestorage.app",
    apiKey: "AIzaSyDPQ0HHqRZTlJbPglH9EDYuX3o--7cFB20",
    authDomain: "reentry-zero-screens.firebaseapp.com",
    messagingSenderId: "1016515885720",
    projectNumber: "1016515885720",
    version: "2"
};

const f_app = initializeApp(firebaseConfig);
const auth = getAuth(f_app);
const db = getFirestore(f_app);

const app = {
    state: {
        tokens: 0,
        tickets: 0,
        energy: 80,
        level: 1,
        playerName: "Héroe",
        playerAvatar: null,
        missions: [
            { id: 1, text: "Leer un libro 20 min", reward: 5, icon: "📚", completed: false },
            { id: 2, text: "Hacer 10 saltos estelares", reward: 3, icon: "🏃", completed: false },
            { id: 3, text: "Ayudar en la base (casa)", reward: 10, icon: "🏠", completed: false },
            { id: 4, text: "Dibujar un alienígena", reward: 4, icon: "🎨", completed: false }
        ],
        editingMissionId: null,
        totalMissionsCompleted: 0
    },
    user: null,
    unsubscribe: null,

    init() {
        this.initAuth();
        this.initEnergyInfo();
        this.attachEventListeners();
        console.log("REENTRY: Protocolo iniciado 🚀");
    },

    attachEventListeners() {
        const primaryBtn = document.getElementById('auth-primary-btn');
        const toggleBtn = document.getElementById('auth-toggle');

        if (primaryBtn) primaryBtn.onclick = () => {
            if (this.authMode === 'login') this.login();
            else this.signup();
        };

        if (toggleBtn) toggleBtn.onclick = () => this.toggleAuthMode();
    },

    initAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.user = user;
                document.getElementById('auth-section').style.display = 'none';
                document.getElementById('app-content').style.display = 'block';
                this.loadState();
            } else {
                this.user = null;
                if (this.unsubscribe) this.unsubscribe();
                document.getElementById('auth-section').style.display = 'block';
                document.getElementById('app-content').style.display = 'none';
            }
        });
    },

    async loadState() {
        if (!this.user) return;

        // Listen for real-time updates
        if (this.unsubscribe) this.unsubscribe();

        this.unsubscribe = onSnapshot(doc(db, "users", this.user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const savedState = docSnap.data();
                // Merge missions to preserve new missions if structural changes occur
                this.state = { ...this.state, ...savedState };
                this.updateUI();
            } else {
                // First time user: save initial state
                this.saveState();
            }
        });
    },

    async saveState() {
        if (!this.user) return;
        try {
            await setDoc(doc(db, "users", this.user.uid), this.state);
        } catch (e) {
            console.error("Error al guardar en la nube:", e);
        }
    },

    completeMission(id) {
        const mission = this.state.missions.find(m => m.id === id);
        if (mission) {
            // Missions are now repeatable, no longer setting mission.completed = true;
            this.state.tokens += mission.reward;
            this.state.energy = Math.min(100, this.state.energy + 10);
            this.state.totalMissionsCompleted += 1;

            // Check for level up (1 level every 10 missions)
            const newLevel = Math.floor(this.state.totalMissionsCompleted / 10) + 1;
            if (newLevel > this.state.level) {
                this.state.level = newLevel;
                this.showNotification(`¡SUBIDA DE NIVEL! 🌟 Ahora eres Nivel ${this.state.level}`);
            } else {
                this.showNotification(`¡Logrado! +${mission.reward} Tokens 🚀`);
            }

            this.updateUI();
            this.saveState();
        }
    },

    showNotification(msg) {
        let el = document.getElementById('notification');
        if (!el) {
            el = document.createElement('div');
            el.id = 'notification';
            document.body.appendChild(el);
        }
        el.innerText = msg;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 3000);
    },

    buyTicket(cost) {
        if (this.state.tokens >= cost) {
            this.state.tokens -= cost;
            this.state.tickets += 1;
            this.state.energy = Math.max(0, this.state.energy - 10);
            this.showNotification("¡Ticket Canjeado! 🎫");
            this.updateUI();
            this.saveState();
        } else {
            alert("¡Necesitas más tokens de tierra! Sal afuera y explora. 🌍");
        }
    },

    useTicket() {
        if (this.state.tickets > 0) {
            this.state.tickets -= 1;
            this.showNotification("¡Ticket usado! ¡A divertirse! 🎮");
            this.updateUI();
            this.saveState();
        } else {
            alert("¡No tienes tickets! Completa misiones para ganar tokens.");
        }
    },

    addToken() {
        this.state.tokens += 1;
        this.showNotification("+1 Token de Tierra 💎");
        this.updateUI();
        this.saveState();
    },

    // Administrative Functions
    toggleAdmin() {
        const panel = document.getElementById('admin-panel');
        const isHidden = panel.style.display === 'none';

        if (isHidden) {
            panel.style.display = 'block';
            this.renderAdminMissions();
            panel.scrollIntoView({ behavior: 'smooth' });
        } else {
            panel.style.display = 'none';
            this.cancelEdit();
        }
    },

    addMission() {
        const text = document.getElementById('new-mission-text').value;
        const reward = parseInt(document.getElementById('new-mission-reward').value);
        const icon = document.getElementById('new-mission-icon').value || "✨";

        if (text && reward > 0) {
            if (this.state.editingMissionId) {
                // Update existing mission
                const mission = this.state.missions.find(m => m.id === this.state.editingMissionId);
                if (mission) {
                    mission.text = text;
                    mission.reward = reward;
                    mission.icon = icon;
                }
                this.state.editingMissionId = null;
                this.showNotification("Misión actualizada ✏️");
            } else {
                // Create new mission
                const newMission = {
                    id: Date.now(),
                    text: text,
                    reward: reward,
                    icon: icon,
                    completed: false
                };
                this.state.missions.push(newMission);
                this.showNotification("Misión añadida 🎮");
            }

            this.saveState();
            this.updateUI();
            this.renderAdminMissions();
            this.resetForm();
        }
    },

    editMission(id) {
        const mission = this.state.missions.find(m => m.id === id);
        if (mission) {
            this.state.editingMissionId = id;
            document.getElementById('new-mission-text').value = mission.text;
            document.getElementById('new-mission-reward').value = mission.reward;
            document.getElementById('new-mission-icon').value = mission.icon;

            document.getElementById('admin-form-title').innerText = "Editar Misión";
            document.getElementById('add-mission-btn').innerText = "Actualizar";
            document.getElementById('cancel-edit-btn').style.display = 'inline-block';

            document.getElementById('mission-form').scrollIntoView({ behavior: 'smooth' });
        }
    },

    cancelEdit() {
        this.state.editingMissionId = null;
        this.resetForm();
    },

    resetForm() {
        document.getElementById('new-mission-text').value = '';
        document.getElementById('new-mission-reward').value = '5';
        document.getElementById('new-mission-icon').value = '';
        document.getElementById('admin-form-title').innerText = "Nueva Misión";
        document.getElementById('add-mission-btn').innerText = "Añadir";
        document.getElementById('cancel-edit-btn').style.display = 'none';
    },

    deleteMission(id) {
        this.state.missions = this.state.missions.filter(m => m.id !== id);
        this.saveState();
        this.updateUI();
        this.renderAdminMissions();
        this.showNotification("Misión eliminada 🗑️");
    },

    resetTokens() {
        if (confirm("¿Estás seguro de que quieres poner los Tokens a 0?")) {
            this.state.tokens = 0;
            this.saveState();
            this.updateUI();
            this.showNotification("Tokens reseteados 💎");
        }
    },

    resetTickets() {
        if (confirm("¿Estás seguro de que quieres poner los Tickets a 0?")) {
            this.state.tickets = 0;
            this.saveState();
            this.updateUI();
            this.showNotification("Tickets reseteados 🎫");
        }
    },

    saveProfile() {
        const newName = document.getElementById('admin-player-name').value;
        const avatarFile = document.getElementById('admin-avatar-upload').files[0];

        if (newName) {
            this.state.playerName = newName;
        }

        if (avatarFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.state.playerAvatar = e.target.result;
                this.saveState();
                this.updateUI();
                this.showNotification("Perfil actualizado ✨");
            };
            reader.readAsDataURL(avatarFile);
        } else {
            this.saveState();
            this.updateUI();
            this.showNotification("Perfil actualizado ✨");
        }
    },

    renderAdminMissions() {
        const list = document.getElementById('admin-missions-list');
        list.innerHTML = '';
        this.state.missions.forEach(mission => {
            const item = document.createElement('div');
            item.className = 'admin-mission-item';
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                    <span>${mission.icon}</span>
                    <span style="font-weight: 500;">${mission.text}</span>
                    <span style="font-size: 0.8rem; color: var(--accent);">(${mission.reward}T)</span>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="edit-btn" onclick="app.editMission(${mission.id})">✏️</button>
                    <button class="delete-btn" onclick="app.deleteMission(${mission.id})">🗑️</button>
                </div>
            `;
            list.appendChild(item);
        });
    },

    updateUI() {
        document.getElementById('token-count').innerText = this.state.tokens;
        document.getElementById('ticket-count').innerText = this.state.tickets;
        document.getElementById('energy-text').innerText = `${this.state.energy}%`;
        document.getElementById('energy-bar').style.width = `${this.state.energy}%`;
        document.getElementById('player-name').innerText = this.state.playerName;
        document.getElementById('level-badge').innerText = `✨ Niv. ${this.state.level}`;

        // Level Progress Bar Logic
        const missionsInCurrentLevel = this.state.totalMissionsCompleted % 10;
        const progressPercent = missionsInCurrentLevel * 10;
        const levelProgressBar = document.getElementById('level-progress-bar');
        if (levelProgressBar) {
            levelProgressBar.style.width = `${progressPercent}%`;
        }

        if (this.state.playerAvatar) {
            document.getElementById('mascot-img').src = this.state.playerAvatar;
        }

        this.renderMissions();
    },

    initEnergyInfo() {
        const trigger = document.getElementById('energy-info-trigger');
        if (trigger) {
            trigger.onclick = () => {
                alert("⚡ ENERGÍA VITAL:\n\nEs tu combustible para explorar. \n\n• Sube +10% cada vez que completas una misión.\n• Baja -10% cuando canjeas un Ticket de Pantalla.\n\n¡Mantén tu energía alta para seguir siendo un gran explorador! 🚀");
            };
        }
    },

    async login() {
        console.log("REENTRY: Ejecutando app.login()...");
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const errorEl = document.getElementById('auth-error');

        if (!email || !password) {
            errorEl.innerText = "Introduce tus credenciales, explorador 🛰️";
            errorEl.style.display = 'block';
            return;
        }

        try {
            errorEl.style.display = 'none';
            await signInWithEmailAndPassword(auth, email, password);
        } catch (e) {
            console.error("Error Firebase Login:", e.code);
            if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                errorEl.innerText = "Credenciales incorrectas. ¿Has registrado ya tu cuenta? 🚀";
            } else if (e.code === 'auth/invalid-email') {
                errorEl.innerText = "El formato del email no es válido 📧";
            } else {
                errorEl.innerText = "Error al entrar: " + e.message;
            }
            errorEl.style.display = 'block';
        }
    },

    authMode: 'login',
    toggleAuthMode() {
        const btn = document.getElementById('auth-primary-btn');
        const toggleText = document.getElementById('auth-toggle');
        const title = document.querySelector('#auth-section h2');

        if (this.authMode === 'login') {
            this.authMode = 'signup';
            btn.innerText = "Crear Cuenta ✨";
            btn.onclick = () => this.signup();
            toggleText.innerText = "Ya tengo cuenta, entrar";
            title.innerText = "Nuevo Recluta";
        } else {
            this.authMode = 'login';
            btn.innerText = "Entrar 🚀";
            btn.onclick = () => this.login();
            toggleText.innerText = "¿No tienes cuenta? Regístrate aquí";
            title.innerText = "Protocolo de Acceso";
        }
    },

    async signup() {
        console.log("REENTRY: Intentando registro...");
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const errorEl = document.getElementById('auth-error');

        try {
            errorEl.style.display = 'none';
            await createUserWithEmailAndPassword(auth, email, password);
            this.showNotification("¡Bienvenido a la Base! 🌏");
        } catch (e) {
            console.error("Error Firebase Signup:", e.code, e.message);
            if (e.code === 'auth/email-already-in-use') {
                errorEl.innerText = "Este astronauta ya está registrado 👨‍🚀. Prueba a entrar.";
            } else if (e.code === 'auth/weak-password') {
                errorEl.innerText = "La contraseña debe tener al menos 6 caracteres 🛡️";
            } else if (e.code === 'auth/invalid-email') {
                errorEl.innerText = "El formato del email no es válido 📧";
            } else if (e.code === 'auth/operation-not-allowed') {
                errorEl.innerText = "Error crítico: El administrador no ha activado el registro por email en la consola.";
            } else {
                errorEl.innerText = "Error al registrar: " + e.message;
            }
            errorEl.style.display = 'block';
        }
    },

    async logout() {
        if (confirm("¿Quieres cerrar la sesión y volver a la atmósfera?")) {
            try {
                await signOut(auth);
            } catch (e) {
                console.error("Error al cerrar sesión:", e);
            }
        }
    },

    renderMissions() {
        const list = document.getElementById('missions-list');
        if (!list) return; // Guard for auth screen
        list.innerHTML = '';

        this.state.missions.forEach((mission, index) => {
            const card = document.createElement('div');
            card.className = `card card-animation mission-item`;
            card.setAttribute('draggable', true);
            card.setAttribute('data-index', index);
            card.style.display = 'flex';
            card.style.alignItems = 'center';
            card.style.justifyContent = 'space-between';
            card.style.padding = '15px';
            card.style.marginBottom = '10px';

            // Drag events
            card.ondragstart = (e) => {
                e.target.classList.add('dragging');
                e.dataTransfer.setData('text/plain', index);
            };
            card.ondragend = (e) => e.target.classList.remove('dragging');
            card.ondragover = (e) => e.preventDefault();
            card.ondrop = (e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = index;
                this.reorderMissions(fromIndex, toIndex);
            };

            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="font-size: 1.5rem;">${mission.icon}</span>
                    <div>
                        <p style="font-weight: 600;">${mission.text}</p>
                        <p style="font-size: 0.7rem; color: var(--accent);">+${mission.reward} Tokens</p>
                    </div>
                </div>
                <button class="button" onclick="app.completeMission(${mission.id})">Listo</button>
            `;
            list.appendChild(card);
        });
    },

    reorderMissions(from, to) {
        if (from === to) return;
        const missions = [...this.state.missions];
        const [movedItem] = missions.splice(from, 1);
        missions.splice(to, 0, movedItem);
        this.state.missions = missions;
        this.updateUI();
        this.saveState();
    }
};

window.app = app;
app.init();
