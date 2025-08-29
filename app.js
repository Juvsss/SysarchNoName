// app.js - handles auth, UI and student/class management
const $ = (id) => document.getElementById(id);
const passwordValid = (p) =>
  /^(?=.{8,16}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).*$/.test(p);

let currentUser = null;

// Auth events for login & register pages
document.addEventListener('DOMContentLoaded', ()=>{
  // if on login page
  if ($('loginForm')) {
    DB.init();
    $('loginBtn').addEventListener('click', ()=> {
      const u = $('loginUser').value.trim(), p = $('loginPass').value;
      const user = DB.users().find(x=>x.username===u && x.password===p);
      if(!user) return alert('Invalid credentials');
      currentUser = user;
      // save to sessionStorage and redirect to dashboard (index.html)
      sessionStorage.setItem('suser', JSON.stringify(currentUser));
      window.location.href = 'index.html';
    });
  }
  // if on register page
  if ($('regForm')) {
    DB.init();
    $('regBtn').addEventListener('click', ()=> {
      const u=$('regUser').value.trim(), name=$('regName').value.trim(), role=$('regRole').value, email=$('regEmail').value.trim(), p=$('regPass').value, p2=$('regPass2').value;
      if(!u||!name||!email||!p) return alert('Fill all fields');
      if(p!==p2) return alert('Passwords do not match');
      if(!passwordValid(p)) return alert('Password does not meet requirements');
      const users = DB.users();
      if(users.some(x=>x.username===u)) return alert('Username exists');
      users.push({username:u,name,role,email,password:p});
      DB.saveUsers(users);
      alert('Registered! You can now login.');
      window.location.href = 'login.html';
    });
  }

  // if on dashboard page (index.html)
  if ($('dashboard')) {
    DB.init();
    // load session user
    const su = sessionStorage.getItem('suser');
    if (!su) { window.location.href = 'login.html'; return; }
    currentUser = JSON.parse(su);
    onLogin();
    // wire UI
    document.querySelectorAll('.tabBtn').forEach(btn=>{
      btn.addEventListener('click', ()=> {
        document.querySelectorAll('.tabBtn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab').forEach(t=>t.style.display='none');
        $(btn.dataset.tab).style.display = 'block';
        if(btn.dataset.tab === 'dbTab') DBUI.render();
      });
    });
    $('logoutBtn').addEventListener('click', ()=> {
      sessionStorage.removeItem('suser');
      window.location.href='login.html';
    });

    $('openAddStudent').addEventListener('click', openAddStudent);
    $('openCreateClass').addEventListener('click', openCreateClass);
    $('searchInput').addEventListener('input', (e)=> updateStudentsTable(e.target.value));
    $('filterClass').addEventListener('change', ()=> updateStudentsTable($('searchInput').value));
    $('clearFilter').addEventListener('click', ()=> { $('searchInput').value=''; $('filterClass').value=''; updateStudentsTable(); });

    $('exportJsonBtn').addEventListener('click', ()=> {
      const data = { users: DB.users(), students: DB.students(), classes: DB.classes() };
      const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='attendance-db.json'; a.click(); URL.revokeObjectURL(url);
    });
    $('exportCsvBtn').addEventListener('click', ()=> {
      const rows = [['ID','FirstName','LastName','ClassId']];
      DB.students().forEach(s=> rows.push([s.id, s.firstName, s.lastName, s.classId||'']));
      const csv = rows.map(r=> r.map(v=> '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
      const blob = new Blob([csv], {type:'text/csv'}); const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download='students.csv'; a.click(); URL.revokeObjectURL(url);
    });
    $('clearDBBtn').addEventListener('click', ()=> {
      if(!confirm('Clear entire database (users, students, classes)?')) return;
      localStorage.removeItem('users'); localStorage.removeItem('students'); localStorage.removeItem('classes');
      DB.init(); DBUI.render(); updateStudentsTable();
      alert('Database cleared and reset.');
    });
  }
});

// ---- Dashboard functions ----
function onLogin(){
  $('authArea') && ($('authArea').style.display='none');
  $('dashboard').style.display='block';
  $('logoutBtn').style.display='inline-block';
  $('loggedAs').textContent = `${currentUser.name} (${currentUser.username})`;
  $('userRoleTag').textContent = currentUser.role;
  updateStudentsTable();
  populateClassFilter();
  DBUI.render();
}

function updateStudentsTable(filter=''){
  const tbody = $('studentsTable').querySelector('tbody');
  tbody.innerHTML = '';
  let students = DB.students();
  const classFilter = $('filterClass').value;
  if(classFilter) students = students.filter(s=>s.classId===classFilter);
  if(filter){ const q=filter.toLowerCase(); students = students.filter(s=> s.id.toLowerCase().includes(q) || s.lastName.toLowerCase().includes(q) ); }
  if(!students.length){ tbody.innerHTML = `<tr><td colspan="5" class="muted small">No students</td></tr>`; return; }
  const classes = DB.classes();
  students.forEach(s=>{
    const cls = classes.find(c=>c.id===s.classId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.id}</td><td>${s.lastName}, ${s.firstName}</td><td>${cls?cls.name:''}</td><td>${cls?cls.teacher:''}</td>
      <td><div style="display:flex;gap:6px"><button data-id="${s.id}" class="btn secondary editBtn">Edit</button><button data-id="${s.id}" class="btn secondary delBtn">Delete</button></div></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.editBtn').forEach(b=> b.addEventListener('click', e=> openEditStudent(e.target.dataset.id) ));
  tbody.querySelectorAll('.delBtn').forEach(b=> b.addEventListener('click', e=> deleteStudent(e.target.dataset.id) ));
  // role-based
  if(currentUser.role!=='Admin' && currentUser.role!=='Teacher'){
    tbody.querySelectorAll('button').forEach(b=> b.style.display='none');
  }
}

function openAddStudent(){
  const classes = DB.classes();
  const clsOptions = classes.map(c=> `<option value="${c.id}">${c.name}</option>`).join('');
  showModal(`<h3>Add Student</h3>
    <div class="form-row"><label>ID</label><input id="stuId"></div>
    <div class="form-row"><label>First name</label><input id="stuFirst"></div>
    <div class="form-row"><label>Last name</label><input id="stuLast"></div>
    <div class="form-row"><label>Class</label><select id="stuClass"><option value="">(none)</option>${clsOptions}</select></div>
    <div style="display:flex;gap:8px"><button id="addStuBtn" class="btn primary">Add</button><button id="cancelStu" class="btn secondary">Cancel</button></div>`);
  $('cancelStu').addEventListener('click', closeModal);
  $('addStuBtn').addEventListener('click', ()=> {
    const id=$('stuId').value.trim(), fn=$('stuFirst').value.trim(), ln=$('stuLast').value.trim(), cls=$('stuClass').value;
    if(!id||!fn||!ln) return alert('Fill ID and names');
    const students = DB.students();
    if(students.some(s=>s.id===id)) return alert('Student ID exists');
    students.push({id, firstName:fn, lastName:ln, classId:cls});
    DB.saveStudents(students); closeModal(); updateStudentsTable($('searchInput').value);
  });
}

function openEditStudent(id){
  const students = DB.students(); const s = students.find(x=>x.id===id); if(!s) return alert('Not found');
  const classes = DB.classes(); const clsOptions = classes.map(c=> `<option value="${c.id}" ${c.id===s.classId? 'selected':''}>${c.name}</option>`).join('');
  showModal(`<h3>Edit ${s.id}</h3>
    <div class="form-row"><label>First name</label><input id="editFirst" value="${s.firstName}"></div>
    <div class="form-row"><label>Last name</label><input id="editLast" value="${s.lastName}"></div>
    <div class="form-row"><label>Class</label><select id="editClass"><option value="">(none)</option>${clsOptions}</select></div>
    <div style="display:flex;gap:8px"><button id="saveEdit" class="btn primary">Save</button><button id="cancelE" class="btn secondary">Cancel</button></div>`);
  $('cancelE').addEventListener('click', closeModal);
  $('saveEdit').addEventListener('click', ()=> {
    s.firstName = $('editFirst').value.trim(); s.lastName = $('editLast').value.trim(); s.classId = $('editClass').value;
    DB.saveStudents(students); closeModal(); updateStudentsTable($('searchInput').value);
  });
}

function deleteStudent(id){
  if(!confirm('Delete student '+id+'?')) return;
  const students = DB.students().filter(s=> s.id !== id);
  DB.saveStudents(students); updateStudentsTable($('searchInput').value);
}

function openCreateClass(){
  const users = DB.users();
  const teacherOptions = users.map(u=> `<option value="${u.username}">${u.name} (${u.role})</option>`).join('');
  showModal(`<h3>Create Class</h3>
    <div class="form-row"><label>Class name</label><input id="className"></div>
    <div class="form-row"><label>Teacher (assign)</label><select id="classTeacher"><option value="">(none)</option>${teacherOptions}</select></div>
    <div style="display:flex;gap:8px"><button id="createClassBtn" class="btn primary">Create</button><button id="cancelC" class="btn secondary">Cancel</button></div>`);
  $('cancelC').addEventListener('click', closeModal);
  $('createClassBtn').addEventListener('click', ()=> {
    const name=$('className').value.trim(), t=$('classTeacher').value;
    if(!name) return alert('Enter class name');
    const classes = DB.classes(); classes.push({id:'cls'+Date.now(), name, teacher:t}); DB.saveClasses(classes);
    closeModal(); populateClassFilter(); updateStudentsTable($('searchInput').value);
  });
}

function populateClassFilter(){
  const sel = $('filterClass'); sel.innerHTML = '<option value="">All classes</option>';
  DB.classes().forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; sel.appendChild(o); });
}


    // CSV import helper (simple parser handling quoted fields)
    function parseCSV(text){
      const rows = [];
      let cur = '';
      let row = [];
      let inQuotes = false;
      for(let i=0;i<text.length;i++){
        const ch = text[i];
        if(ch === '"'){
          if(inQuotes && text[i+1] === '"'){ cur += '"'; i++; }
          else inQuotes = !inQuotes;
          continue;
        }
        if(ch === ',' && !inQuotes){ row.push(cur); cur=''; continue; }
        if((ch === '\n' || ch === '\r') && !inQuotes){
          if(cur!=='' || row.length){ row.push(cur); rows.push(row); row=[]; cur=''; }
          // skip \r\n combination by continuing
          continue;
        }
        cur += ch;
      }
      if(cur !== '' || row.length){ row.push(cur); rows.push(row); }
      return rows;
    }

    // Import CSV workflow
    document.addEventListener('DOMContentLoaded', ()=>{
      const importBtn = document.getElementById('importCsvBtn');
      const importFile = document.getElementById('importCsvFile');
      if(importBtn && importFile){
        importBtn.addEventListener('click', ()=> importFile.click());
        importFile.addEventListener('change', (e)=>{
          const f = e.target.files[0];
          if(!f) return;
          const reader = new FileReader();
          reader.onload = (ev)=>{
            try{
              const txt = ev.target.result;
              const rows = parseCSV(txt).filter(r=>r.length>0);
              // assume header present; find header row (first non-empty)
              const header = rows[0].map(h=>h.trim().toLowerCase());
              const idIdx = header.indexOf('id'); const lastIdx = header.indexOf('lastname')!==-1?header.indexOf('lastname'):header.indexOf('last_name')!==-1?header.indexOf('last_name'):-1;
              const firstIdx = header.indexOf('firstname')!==-1?header.indexOf('firstname'):header.indexOf('first_name')!==-1?header.indexOf('first_name'):-1;
              const classIdx = header.indexOf('class')!==-1?header.indexOf('class'):header.indexOf('classid')!==-1?header.indexOf('classid'):-1;
              if(idIdx===-1 || lastIdx===-1 || firstIdx===-1){
                alert('CSV header must include at least: id, lastName, firstName (headers are case-insensitive). Example: id,lastName,firstName,class');
                return;
              }
              const students = DB.students();
              let added=0, skipped=0;
              for(let i=1;i<rows.length;i++){
                const r = rows[i];
                if(r.length===0) continue;
                const id = (r[idIdx]||'').trim();
                const last = (r[lastIdx]||'').trim();
                const first = (r[firstIdx]||'').trim();
                const cls = classIdx!==-1 ? (r[classIdx]||'').trim() : '';
                if(!id || !last || !first) { skipped++; continue; }
                if(students.some(s=>s.id===id)){ skipped++; continue; }
                students.push({id, firstName:first, lastName:last, classId:cls});
                added++;
              }
              DB.saveStudents(students);
              updateStudentsTable();
              DBUI.render();
              alert('Import finished. Added: '+added+' | Skipped: '+skipped);
              importFile.value='';
            }catch(err){
              alert('Failed to import CSV: '+err.message);
            }
          };
          reader.readAsText(f);
        });
      }
    });
    
// modal helpers
function showModal(html){ $('modalContent').innerHTML = html; $('modal').style.display = 'flex'; }
function closeModal(){ $('modal').style.display = 'none'; }
document.getElementById && document.addEventListener('click', (e)=> {
  if(e.target && e.target.id==='modal') closeModal();
});
