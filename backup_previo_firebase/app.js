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
        parentalPin: "1234",
        editingMissionId: null,
        totalMissionsCompleted: 0
    },

    init() {
        this.loadState();
        this.renderMissions();
        this.updateUI();
        console.log("REENTRY: Protocolo iniciado 🚀");
    },

    loadState() {
        const saved = localStorage.getItem('disconnect_mission_state');
        if (saved) {
            const savedState = JSON.parse(saved);
            this.state = { ...this.state, ...savedState };
        }
    },

    saveState() {
        localStorage.setItem('disconnect_mission_state', JSON.stringify(this.state));
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

    // Administrative Functions
    toggleAdmin() {
        const panel = document.getElementById('admin-panel');
        const isHidden = panel.style.display === 'none';

        if (isHidden) {
            const pin = prompt("Introduce el PIN parental (por defecto 1234):");
            if (pin !== this.state.parentalPin) {
                alert("PIN incorrecto. Acceso denegado.");
                return;
            }
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
            this.showNotification("Tokens reseteados 🪙");
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

        if (this.state.playerAvatar) {
            document.getElementById('mascot-img').src = this.state.playerAvatar;
        }

        this.renderMissions();
    },

    renderMissions() {
        const list = document.getElementById('missions-list');
        list.innerHTML = '';

        this.state.missions.forEach(mission => {
            const card = document.createElement('div');
            card.className = `card card-animation`;
            card.style.display = 'flex';
            card.style.alignItems = 'center';
            card.style.justifyContent = 'space-between';
            card.style.padding = '15px';
            card.style.marginBottom = '10px';

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
    }
};

window.onload = () => app.init();
