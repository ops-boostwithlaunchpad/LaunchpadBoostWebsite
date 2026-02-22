/*
    Launchpad Boost - Core Logic
    Database: Supabase
*/

// =============================================
// DB — all calls go through serverless function
// =============================================

function db(payload) {
    return fetch('/.netlify/functions/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(function(res) { return res.json(); });
}

function generatePassword() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    var password = '';
    for (var i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// =============================================
// MOBILE MENU
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
});

function initMobileMenu() {
    var toggle = document.querySelector('.mobile-menu-toggle');
    var navLinks = document.querySelector('.nav-links');
    if (!toggle || !navLinks) return;
    toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        toggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
            toggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
    document.addEventListener('click', function(e) {
        if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
            toggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// =============================================
// CLIENT LOGIN (subscribe.html)
// =============================================

function clientLogin(e) {
    e.preventDefault();
    var nameInput = document.getElementById('clientNameInput');
    var passInput = document.getElementById('clientPasswordInput');
    var errorEl = document.getElementById('loginError');
    var btn = e.target.querySelector('button[type="submit"]');

    if (!nameInput || !passInput) return;

    var enteredName = nameInput.value.trim().toLowerCase();
    var enteredPass = passInput.value.trim();

    if (btn) { btn.disabled = true; btn.textContent = 'Checking...'; }

    db({ action: 'verifyClient', name: enteredName, password: enteredPass })
    .then(function(data) {
        if (data.success) {
            sessionStorage.setItem('lb_client_session', JSON.stringify({
                authenticated: true,
                clientId: data.client.id,
                businessName: data.client.businessName
            }));
            if (errorEl) errorEl.classList.remove('visible');
            window.location.href = 'onboarding.html';
        } else {
            if (errorEl) errorEl.classList.add('visible');
            passInput.value = '';
            passInput.focus();
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph-bold ph-sign-in" style="margin-right:0.5rem;"></i>Access My Dashboard'; }
        }
    })
    .catch(function(err) {
        console.error(err);
        alert('Connection error. Please try again.');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph-bold ph-sign-in" style="margin-right:0.5rem;"></i>Access My Dashboard'; }
    });
}

// =============================================
// ADMIN LOGIN
// =============================================

function adminLogin(e) {
    e.preventDefault();
    var pass = document.getElementById('adminPass').value;
    var btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Checking...'; }

    fetch('/.netlify/functions/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) {
            sessionStorage.setItem('adminAuth', 'true');
            document.getElementById('loginOverlay').style.display = 'none';
            loadDashboard();
        } else {
            alert('Wrong password!');
            if (btn) { btn.disabled = false; btn.textContent = 'Login'; }
        }
    })
    .catch(function() {
        alert('Connection error. Please try again.');
        if (btn) { btn.disabled = false; btn.textContent = 'Login'; }
    });
}

function adminLogout() {
    sessionStorage.removeItem('adminAuth');
    location.reload();
}

function switchAdminView(viewName) {
    document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.remove('active'); });
    document.getElementById('nav-' + viewName).classList.add('active');
    document.querySelectorAll('.admin-view').forEach(function(el) { el.classList.remove('active'); });
    document.getElementById('view-' + viewName).classList.add('active');
    if (viewName === 'submissions') { loadSubmissions(); loadEmailSignups(); }
}

// =============================================
// LOAD SUBMISSIONS
// =============================================

function loadSubmissions() {
    var container = document.getElementById('submissionsContainer');
    if (!container) return;
    container.innerHTML = '<p class="text-muted" style="text-align:center;padding:2rem;">Loading...</p>';

    db({ action: 'getSubmissions' })
    .then(function(rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align:center;padding:2rem;">No submissions yet.</p>';
            return;
        }

        var html = '';
        rows.forEach(function(s) {
            var date = s.created_at ? new Date(s.created_at).toLocaleDateString() : '-';
            var gbpBadge = s.gbp_option === 'create'
                ? '<span style="background:#FEF9C3;color:#854D0E;padding:2px 8px;border-radius:20px;font-size:0.75rem;font-weight:600;">Create GBP</span>'
                : '<span style="background:#DCFCE7;color:#166534;padding:2px 8px;border-radius:20px;font-size:0.75rem;font-weight:600;">Has GBP</span>';

            html += '<div class="card" style="margin-bottom:1rem;padding:1.5rem;">';
            html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.25rem;">';
            html += '<div><h3 style="font-size:1.1rem;margin-bottom:0.25rem;">' + (s.business_name || 'Unnamed') + '</h3>';
            html += '<span class="text-muted" style="font-size:0.85rem;">' + date + '</span></div>';
            html += '<div style="display:flex;gap:0.5rem;align-items:center;">' + gbpBadge + '</div>';
            html += '</div>';

            // Keywords section - prominent display
            if (s.keywords || s.custom_keywords) {
                html += '<div style="margin-bottom:1.25rem;">';
                html += '<div style="font-size:0.75rem;color:#94A3B8;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.5rem;">Target Keywords</div>';
                html += '<div style="display:flex;flex-wrap:wrap;gap:0.4rem;">';
                var allKeywords = ((s.keywords || '') + (s.custom_keywords ? ',' + s.custom_keywords : '')).split(',');
                allKeywords.forEach(function(kw) {
                    kw = kw.trim();
                    if (kw) html += '<span style="background:#EDE9FE;color:#7C3AED;padding:3px 10px;border-radius:20px;font-size:0.8rem;font-weight:500;">' + kw + '</span>';
                });
                html += '</div></div>';
            }

            // Keyword search report checkbox
            var checked = s.keyword_search_report ? 'checked' : '';
            html += '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:0.85rem 1rem;margin-bottom:1.25rem;display:flex;align-items:center;justify-content:space-between;">';
            html += '<label style="display:flex;align-items:center;gap:0.6rem;cursor:pointer;font-size:0.875rem;font-weight:500;">';
            html += '<input type="checkbox" ' + checked + ' onchange="toggleKeywordReport(' + s.id + ', this.checked)" style="width:16px;height:16px;cursor:pointer;">';
            html += 'Base optimization on keyword search report</label>';
            html += s.keyword_search_report ? '<span style="background:#DCFCE7;color:#166534;padding:2px 8px;border-radius:20px;font-size:0.75rem;font-weight:600;">Active</span>' : '';
            html += '</div>';

            html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;font-size:0.875rem;">';

            function row(label, val) {
                if (!val) return '';
                return '<div><div style="font-size:0.75rem;color:#94A3B8;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.2rem;">' + label + '</div><div style="color:#1E293B;font-weight:500;">' + val + '</div></div>';
            }

            html += row('Category', s.category);
            html += row('Phone', s.phone);
            html += row('Email', s.email);
            html += row('Website', s.website);
            html += row('Address', (s.address ? s.address + ', ' : '') + (s.city || '') + (s.state ? ', ' + s.state : '') + (s.zip ? ' ' + s.zip : ''));
            html += row('Hours (Mon-Fri)', s.weekday_open && s.weekday_close ? s.weekday_open + ' – ' + s.weekday_close : '');
            html += row('Hours (Sat)', s.saturday_open && s.saturday_close ? s.saturday_open + ' – ' + s.saturday_close : '');
            html += row('Description', s.description);

            html += '</div>';
            html += '</div>';
        });

        container.innerHTML = html;
    })
    .catch(function(err) {
        console.error(err);
        container.innerHTML = '<p style="text-align:center;padding:2rem;color:#DC2626;">Error loading submissions.</p>';
    });
}

// =============================================
// TOGGLE KEYWORD SEARCH REPORT
// =============================================

function toggleKeywordReport(id, value) {
    db({ action: 'updateSubmission', id: id, data: { keyword_search_report: value } })
    .then(function() { loadSubmissions(); })
    .catch(function() { alert('Error saving. Please try again.'); });
}

// =============================================
// ADD CLIENT MODAL
// =============================================

function closeAddModal() {
    document.getElementById('addModal').style.display = 'none';
    document.getElementById('addFormView').style.display = 'block';
    document.getElementById('addSuccessView').style.display = 'none';
}

function copyRevealedPassword() {
    var pwd = document.getElementById('revealPassword').textContent;
    navigator.clipboard.writeText(pwd).then(function() {
        alert('Password copied!');
    });
}

function manualAddSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var btn = form.querySelector('button[type="submit"]');
    var clientPassword = generatePassword();

    var newClient = {
        business_name: form.businessName.value.trim(),
        category: form.category.value.trim(),
        email: form.email.value.trim(),
        city: form.city.value.trim(),
        password: clientPassword
    };

    if (btn) { btn.disabled = true; btn.textContent = 'Adding...'; }

    db({ action: 'addClient', data: newClient })
    .then(function(data) {
        if (!data.success) throw new Error('Failed to add client');
    })
    .then(function() {
        document.getElementById('revealClientName').textContent = newClient.business_name;
        document.getElementById('revealPassword').textContent = clientPassword;
        document.getElementById('addFormView').style.display = 'none';
        document.getElementById('addSuccessView').style.display = 'block';
        form.reset();
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph-bold ph-plus" style="margin-right:0.5rem;"></i> Add Client & Generate Password'; }
        loadDashboard();
    })
    .catch(function(err) {
        console.error(err);
        alert('Error adding client. Check your Supabase setup.');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph-bold ph-plus" style="margin-right:0.5rem;"></i> Add Client & Generate Password'; }
    });
}

// =============================================
// DELETE CLIENT
// =============================================

function deleteProfile(id) {
    if (!confirm('Delete this client? They will no longer be able to log in.')) return;
    db({ action: 'deleteClient', id: id })
    .then(function() { loadDashboard(); })
    .catch(function(err) {
        console.error(err);
        alert('Error deleting client.');
    });
}

// =============================================
// TOGGLE KEYWORD SEARCH REPORT
// =============================================

function toggleKeywordReport(id, checked) {
    fetch('/.netlify/functions/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateKeywordReport', id: id, value: checked })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (!data.success) alert('Failed to save. Please try again.');
    })
    .catch(function() { alert('Connection error.'); });
}

// =============================================
// LOAD EMAIL SIGNUPS
// =============================================

function loadEmailSignups() {
    var container = document.getElementById('emailSignupsContainer');
    if (!container) return;

    db({ action: 'getEmails' })
    .then(function(rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
            container.innerHTML = '<p class="text-muted" style="font-size:0.875rem;">No signups yet.</p>';
            return;
        }
        var html = '<div style="display:flex;flex-direction:column;gap:0.5rem;">';
        rows.forEach(function(r) {
            var date = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0.75rem;background:#F8FAFC;border-radius:6px;font-size:0.875rem;">';
            html += '<span style="font-weight:500;">' + r.email + '</span>';
            html += '<span class="text-muted" style="font-size:0.8rem;">' + date + '</span>';
            html += '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    })
    .catch(function() {
        container.innerHTML = '<p style="color:#DC2626;font-size:0.875rem;">Error loading signups.</p>';
    });
}

// =============================================
// LOAD DASHBOARD
// =============================================

function loadDashboard() {
    var tableBody = document.getElementById('businessTableBody');
    var emptyState = document.getElementById('emptyState');
    var activeCount = document.getElementById('activeCount');
    var keywordCount = document.getElementById('keywordCount');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6" style="padding:2rem;text-align:center;color:#94A3B8;">Loading...</td></tr>';
    tableBody.parentNode.parentNode.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    db({ action: 'getClients' })
    .then(function(clients) {
        if (!Array.isArray(clients) || clients.length === 0) {
            tableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            if (activeCount) activeCount.innerText = '0';
            if (keywordCount) keywordCount.innerText = '0';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (activeCount) activeCount.innerText = clients.length;
        if (keywordCount) keywordCount.innerText = clients.length * 4;

        tableBody.innerHTML = '';
        clients.forEach(function(c) {
            var tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #F1F5F9';
            var td1 = '<td style="padding:0.85rem 0.75rem"><div style="font-weight:600">' + (c.business_name || 'Unnamed') + '</div><div style="font-size:0.8rem;color:#94A3B8">' + (c.email || '') + '</div></td>';
            var td2 = '<td style="padding:0.85rem 0.75rem">' + (c.category || 'N/A') + '</td>';
            var td3 = '<td style="padding:0.85rem 0.75rem">' + (c.city || '-') + '</td>';
            var td4 = '<td style="padding:0.85rem 0.75rem"><code style="background:#F1F5F9;padding:3px 8px;border-radius:4px;font-size:0.8rem;letter-spacing:0.5px;color:#1E293B">' + (c.password || '-') + '</code></td>';
            var td5 = '<td style="padding:0.85rem 0.75rem"><span style="background:#DCFCE7;color:#166534;padding:2px 10px;border-radius:20px;font-size:0.8rem;font-weight:600">Active</span></td>';
            var td6 = '<td style="padding:0.85rem 0.75rem"><button onclick="deleteProfile(' + c.id + ')" style="background:#FEF2F2;color:#DC2626;border:1px solid #FECACA;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:0.8rem;font-weight:600">Delete</button></td>';
            tr.innerHTML = td1 + td2 + td3 + td4 + td5 + td6;
            tableBody.appendChild(tr);
        });
    })
    .catch(function(err) {
        console.error(err);
        tableBody.innerHTML = '<tr><td colspan="6" style="padding:2rem;text-align:center;color:#DC2626;">Error loading clients.</td></tr>';
    });
}

// =============================================
// DEMO VIDEO MODAL
// =============================================

function openDemoModal() {
    var modal = document.getElementById('demoModal');
    var video = document.getElementById('demoVideo');
    if (modal && video) { modal.classList.add('active'); video.play(); }
}

function closeDemoModal() {
    var modal = document.getElementById('demoModal');
    var video = document.getElementById('demoVideo');
    if (modal && video) { modal.classList.remove('active'); video.pause(); video.currentTime = 0; }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeDemoModal();
});

document.addEventListener('DOMContentLoaded', function() {
    var demoModal = document.getElementById('demoModal');
    if (demoModal) {
        demoModal.addEventListener('click', function(e) {
            if (e.target.id === 'demoModal') closeDemoModal();
        });
    }
});
