// db.js - storage helpers and DB UI
const DB = {
  init() {
    if (!localStorage.getItem('users')) {
      const users = [{ username: 'admin', name: 'Administrator', role: 'Admin', email: 'admin@example.com', password: 'Admin@123!' }];
      localStorage.setItem('users', JSON.stringify(users));
    }
    if (!localStorage.getItem('students')) localStorage.setItem('students', JSON.stringify([]));
    if (!localStorage.getItem('classes')) localStorage.setItem('classes', JSON.stringify([]));
  },
  users(){ return JSON.parse(localStorage.getItem('users') || '[]'); },
  saveUsers(u){ localStorage.setItem('users', JSON.stringify(u)); },
  students(){ return JSON.parse(localStorage.getItem('students') || '[]'); },
  saveStudents(s){ localStorage.setItem('students', JSON.stringify(s)); },
  classes(){ return JSON.parse(localStorage.getItem('classes') || '[]'); },
  saveClasses(c){ localStorage.setItem('classes', JSON.stringify(c)); }
};

const DBUI = {
  render(){ 
    const div = document.getElementById('dbContent');
    if(!div) return;
    const users = DB.users(), students = DB.students(), classes = DB.classes();
    div.innerHTML = '';
    const upre = document.createElement('pre'); upre.textContent = JSON.stringify(users.map(u=>({username:u.username,role:u.role,email:u.email})), null, 2);
    const spre = document.createElement('pre'); spre.textContent = JSON.stringify(students.map(s=>({id:s.id,firstName:s.firstName,lastName:s.lastName,classId:s.classId})), null, 2);
    const cpre = document.createElement('pre'); cpre.textContent = JSON.stringify(classes, null, 2);
    const uh = document.createElement('h4'); uh.textContent = 'Users';
    const sh = document.createElement('h4'); sh.textContent = 'Students';
    const ch = document.createElement('h4'); ch.textContent = 'Classes';
    div.appendChild(uh); div.appendChild(upre); div.appendChild(sh); div.appendChild(spre); div.appendChild(ch); div.appendChild(cpre);
  }
};

// auto init on load
DB.init();